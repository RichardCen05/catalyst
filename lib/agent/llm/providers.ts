/**
 * The model layer speaks to one provider at a time, chosen by `LLM_PROVIDER`.
 *
 * Every provider answers the same question: given a system instruction, a
 * prompt, and a JSON schema the answer must satisfy, return the raw JSON text.
 * Parsing, verification, budget, and the deterministic fallback all sit above
 * this line and do not change when the provider does. That is the point: a
 * quota wall at one vendor is an env change, not a rewrite.
 *
 * Two providers cover the field:
 *
 *   gemini             @google/genai — Developer API key, or Vertex via ADC.
 *   openai-compatible  any /v1/chat/completions endpoint that honours
 *                      response_format json_schema. OpenRouter, OpenAI, Groq,
 *                      Together, vLLM, and Anthropic's OpenAI-compatible
 *                      endpoint all answer this shape.
 *
 * A provider that cannot hold the JSON schema contract is not usable here. The
 * guards downstream reject free prose, so a model that ignores the schema
 * renders nothing rather than something unverified.
 */
import { GoogleGenAI } from "@google/genai";

export interface LlmRequest {
  model: string;
  systemInstruction: string;
  contents: string;
  schema: Record<string, unknown>;
  maxOutputTokens: number;
}

export interface LlmProvider {
  /** Value of LLM_PROVIDER that selects this provider. */
  readonly id: string;
  /** The raw JSON text of the answer. Throws on refusal or truncation. */
  generate(request: LlmRequest): Promise<string>;
}

export function getGenAiClient(): GoogleGenAI {
  if (process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true") {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    if (!project || !location) {
      throw new Error("GOOGLE_GENAI_USE_ENTERPRISE=true requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION");
    }
    return new GoogleGenAI({ vertexai: true, project, location });
  }
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set (and GOOGLE_GENAI_USE_ENTERPRISE is not true)");
  return new GoogleGenAI({ apiKey });
}

const geminiProvider: LlmProvider = {
  id: "gemini",
  async generate(request) {
    const client = getGenAiClient();
    const response = await client.models.generateContent({
      model: request.model,
      contents: request.contents,
      config: {
        systemInstruction: request.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: request.schema,
        maxOutputTokens: request.maxOutputTokens,
      },
    });
    if (response.candidates?.[0]?.finishReason === "MAX_TOKENS") {
      throw new Error(`Gemini response truncated at the output ceiling (finishReason=MAX_TOKENS, model=${request.model})`);
    }
    const text = response.text;
    if (!text) throw new Error("Gemini returned no text");
    return text;
  },
};

/**
 * An HTTP status carried on the error, so `isRateLimitError` in budget.ts
 * recognises a 429 from a non-Google provider the same way it recognises one
 * from Gemini, and the day's gate closes once instead of per call site.
 */
export class LlmHttpError extends Error {
  readonly name = "LlmHttpError";
  constructor(readonly status: number, message: string) {
    super(message);
  }
}

interface ChatCompletion {
  choices?: { message?: { content?: string | null }; finish_reason?: string }[];
  error?: { message?: string; code?: number };
}

const openAiCompatibleProvider: LlmProvider = {
  id: "openai-compatible",
  async generate(request) {
    const baseUrl = (process.env.LLM_BASE_URL || "").replace(/\/$/, "");
    if (!baseUrl) throw new Error("LLM_PROVIDER=openai-compatible requires LLM_BASE_URL");
    const apiKey = process.env.LLM_API_KEY;
    if (!apiKey) throw new Error("LLM_PROVIDER=openai-compatible requires LLM_API_KEY");

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxOutputTokens,
        messages: [
          { role: "system", content: request.systemInstruction },
          { role: "user", content: request.contents },
        ],
        response_format: {
          type: "json_schema",
          json_schema: { name: "answer", strict: true, schema: request.schema },
        },
      }),
    });

    const body = (await response.json().catch(() => ({}))) as ChatCompletion;
    // Some gateways answer 200 with an error object in the body; the routing
    // refusals and upstream 429s both arrive that way on OpenRouter.
    const status = response.ok ? (body.error?.code ?? 0) : response.status;
    if (status) {
      throw new LlmHttpError(status, `${request.model} refused with ${status}: ${body.error?.message ?? response.statusText}`);
    }
    const choice = body.choices?.[0];
    if (choice?.finish_reason === "length") {
      throw new Error(`Response truncated at the output ceiling (finish_reason=length, model=${request.model})`);
    }
    const text = choice?.message?.content;
    if (!text) throw new Error(`${request.model} returned no text`);
    return text;
  },
};

const PROVIDERS: Record<string, LlmProvider> = {
  [geminiProvider.id]: geminiProvider,
  [openAiCompatibleProvider.id]: openAiCompatibleProvider,
};

export const DEFAULT_PROVIDER_ID = geminiProvider.id;

/** The provider named by LLM_PROVIDER, or Gemini when it is unset. */
export function getLlmProvider(): LlmProvider {
  const id = process.env.LLM_PROVIDER?.trim() || DEFAULT_PROVIDER_ID;
  const provider = PROVIDERS[id];
  if (!provider) {
    throw new Error(`Unknown LLM_PROVIDER "${id}" (known: ${Object.keys(PROVIDERS).sort().join(", ")})`);
  }
  return provider;
}
