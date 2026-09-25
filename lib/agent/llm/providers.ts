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
 * renders nothing rather than something unverified. A gateway that drops
 * `json_schema` but honours `json_object` can still hold it when the schema
 * travels in the system instruction instead — see LLM_SCHEMA_MODE below.
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

/**
 * The same question must not get two different sentences.
 *
 * Every draft here is written from material that was already retrieved and is
 * verified against it afterwards, so sampling buys nothing but variance — and
 * variance is what makes an answer impossible to check against the one a
 * reader saw yesterday. Zero is the closest these APIs offer to "read the
 * material back"; it is not a guarantee of identical bytes, because the
 * vendors do not offer one.
 */
const ANSWER_TEMPERATURE = 0;

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
        temperature: ANSWER_TEMPERATURE,
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

/**
 * Whether the model should think before answering, when the gateway exposes
 * that as a request field.
 *
 * Unset sends nothing, which is what every vendor that has no such field
 * needs: an unknown key is a 400 on the strict ones. It is opt-in for that
 * reason, not because thinking is usually wrong.
 *
 * It is worth turning off on the free reasoning models. Measured on one
 * exposure call: thinking on costs 543-966 completion tokens and 6.6-18.2s,
 * thinking off costs 87-102 and 1.3-2.5s for an answer of the same quality —
 * and this app asks for a single short JSON object, not a proof. The long
 * form also leaves far more room for the run-away generation that ends in
 * `finish_reason=length`, which costs the reader the model's sentence
 * entirely.
 */
function reasoningField(): Record<string, unknown> | undefined {
  const raw = process.env.LLM_REASONING?.trim().toLowerCase();
  if (!raw) return undefined;
  const off = raw === "off" || raw === "false" || raw === "none";
  if (!off && raw !== "low" && raw !== "medium" && raw !== "high") {
    throw new Error(`LLM_REASONING="${raw}" is not one of: off, low, medium, high`);
  }
  const shape = process.env.LLM_REASONING_FIELD?.trim().toLowerCase() || "reasoning";
  if (shape === "reasoning") return { reasoning: off ? { enabled: false } : { effort: raw } };
  // DeepSeek-style gateways read `thinking` and ignore `reasoning` without a
  // word: measured on one, `reasoning: {enabled: false}` still spent 170-970
  // reasoning tokens a call, `thinking: {type: "disabled"}` spent none. The
  // field has no effort scale, so any effort means "on".
  if (shape === "thinking") return { thinking: { type: off ? "disabled" : "enabled" } };
  throw new Error(`LLM_REASONING_FIELD="${shape}" is not one of: reasoning, thinking`);
}

/**
 * How the answer's JSON schema reaches the model.
 *
 * `strict` (the default) sends it as `response_format: json_schema`, which the
 * vendor enforces. Some gateways accept that field and drop it, so the model
 * answers in prose and every answer falls to the deterministic path while the
 * key is healthy. `prompt` puts the schema in the system instruction and asks
 * for `json_object` — enforced as JSON, not as this schema, which is why the
 * guards in verify.ts still read every field before anything ships.
 */
function schemaMode(): "strict" | "prompt" {
  const raw = process.env.LLM_SCHEMA_MODE?.trim().toLowerCase() || "strict";
  if (raw === "strict" || raw === "prompt") return raw;
  throw new Error(`LLM_SCHEMA_MODE="${raw}" is not one of: strict, prompt`);
}

function withSchema(request: LlmRequest): { system: string; responseFormat: Record<string, unknown> } {
  if (schemaMode() === "strict") {
    return {
      system: request.systemInstruction,
      responseFormat: { type: "json_schema", json_schema: { name: "answer", strict: true, schema: request.schema } },
    };
  }
  return {
    system: `${request.systemInstruction}\n\nReturn only one JSON object that satisfies this JSON Schema, with no other text:\n${JSON.stringify(request.schema)}`,
    responseFormat: { type: "json_object" },
  };
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
    const reasoning = reasoningField();
    const { system, responseFormat } = withSchema(request);

    const response = await fetch(`${baseUrl}/chat/completions`, {
      method: "POST",
      headers: {
        Authorization: `Bearer ${apiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: request.model,
        max_tokens: request.maxOutputTokens,
        temperature: ANSWER_TEMPERATURE,
        ...reasoning,
        messages: [
          { role: "system", content: system },
          { role: "user", content: request.contents },
        ],
        response_format: responseFormat,
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
      // Naming the ceiling matters: the usual cause is not a prompt too large
      // for it but a model that did not stop, and the two want opposite
      // fixes. See LLM_REASONING above.
      throw new Error(`Response truncated at the output ceiling (finish_reason=length, model=${request.model}, max_tokens=${request.maxOutputTokens})`);
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
