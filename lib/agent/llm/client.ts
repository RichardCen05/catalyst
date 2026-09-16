import { GoogleGenAI } from "@google/genai";
import { isRateLimitError, LlmBudgetError, noteLlmRateLimited, reserveLlmCall } from "@/lib/agent/llm/budget";

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

export interface StructuredCallParams {
  model: string;
  systemInstruction: string;
  contents: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

/**
 * Every model call in the app goes through here, which is why the daily
 * ceiling is enforced here and not at each of the three call sites. The
 * reservation happens before the request leaves: a call that fails still
 * spent quota.
 */
export async function generateStructured<T>(params: StructuredCallParams): Promise<T> {
  await reserveLlmCall();
  const client = getGenAiClient();
  let response;
  try {
    response = await client.models.generateContent({
      model: params.model,
      contents: params.contents,
      config: {
        systemInstruction: params.systemInstruction,
        responseMimeType: "application/json",
        responseJsonSchema: params.schema,
        maxOutputTokens: params.maxOutputTokens ?? 1024,
      },
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
  const text = response.text;
  if (!text) throw new Error("Gemini returned no text");
  return JSON.parse(text) as T;
}
