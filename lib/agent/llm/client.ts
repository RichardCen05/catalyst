import { GoogleGenAI } from "@google/genai";

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

export async function generateStructured<T>(params: StructuredCallParams): Promise<T> {
  const client = getGenAiClient();
  const response = await client.models.generateContent({
    model: params.model,
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: params.schema,
      maxOutputTokens: params.maxOutputTokens ?? 1024,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned no text");
  return JSON.parse(text) as T;
}
