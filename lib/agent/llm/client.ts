import { isRateLimitError, LlmBudgetError, noteLlmRateLimited, reserveLlmCall } from "@/lib/agent/llm/budget";
import { getLlmProvider } from "@/lib/agent/llm/providers";

export { getGenAiClient } from "@/lib/agent/llm/providers";

export interface StructuredCallParams {
  model: string;
  systemInstruction: string;
  contents: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

/**
 * Reasoning tokens are drawn from the same allowance as the answer, and the
 * model spends a variable number of them on an identical prompt: a chat
 * rewrite that measured 394 thought tokens on one call measured 674 on the
 * next. With the old 1024 ceiling the JSON was sometimes cut mid-string, and
 * `JSON.parse` failed with "Unterminated string in JSON", so a working key
 * still produced the deterministic answer. The ceiling now leaves room for
 * both, and a truncated response is named instead of surfacing as a parse
 * error.
 */
const DEFAULT_MAX_OUTPUT_TOKENS = 4096;

/**
 * Providers that honour a JSON schema still differ on the wrapper: Gemini
 * returns bare JSON, while several OpenAI-compatible models fence it. The
 * fence is stripped rather than parsed, because rejecting a well-formed answer
 * over its packaging would drop the panel to the deterministic path for a
 * reason the reader cannot see. Anything past the fence is still the model's
 * own JSON, and the guards above verify it unchanged.
 */
function unwrapJson(text: string): string {
  const trimmed = text.trim();
  const fenced = /^```(?:json)?\s*\n([\s\S]*?)\n?```$/.exec(trimmed);
  return fenced ? fenced[1].trim() : trimmed;
}

/**
 * Every model call in the app goes through here, which is why the daily
 * ceiling is enforced here and not at each of the call sites. The reservation
 * happens before the request leaves: a call that fails still spent quota.
 *
 * Which vendor actually answers is `LLM_PROVIDER`'s business, not this
 * function's — see providers.ts.
 */
export async function generateStructured<T>(params: StructuredCallParams): Promise<T> {
  await reserveLlmCall();
  const provider = getLlmProvider();
  let text: string;
  try {
    text = await provider.generate({
      model: params.model,
      systemInstruction: params.systemInstruction,
      contents: params.contents,
      schema: params.schema,
      maxOutputTokens: params.maxOutputTokens ?? DEFAULT_MAX_OUTPUT_TOKENS,
    });
  } catch (error) {
    // A 429 closes the gate for the rest of the day instead of letting every
    // later request re-learn the same rejection.
    if (isRateLimitError(error)) {
      await noteLlmRateLimited();
      throw new LlmBudgetError("rate-limit", error instanceof Error ? error.message : String(error));
    }
    throw error;
  }
  return JSON.parse(unwrapJson(text)) as T;
}
