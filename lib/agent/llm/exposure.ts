import { generateStructured } from "@/lib/agent/llm/client";
import type { ImpactDirection } from "@/lib/types";

const DIRECTIONS: ImpactDirection[] = ["Supported", "Adverse", "Mixed", "Unrelated", "Unverified"];
const RELEVANCE_BANDS = ["high", "medium", "low"] as const;
export type RelevanceBand = (typeof RELEVANCE_BANDS)[number];

export const RELEVANCE_BAND_SCORE: Record<RelevanceBand, number> = { high: 90, medium: 65, low: 40 };

export interface ExposureAssessment {
  path: string;
  direction: ImpactDirection;
  relevanceBand: RelevanceBand;
  rationale: string;
}

export interface ExposureInput {
  symbol: string;
  eventTitle: string;
  eventSummary: string;
  eventTags: string[];
  segments: Array<{ segment: string; share: number }>;
}

const EXPOSURE_SCHEMA = {
  type: "object",
  properties: {
    path: { type: "string" },
    direction: { type: "string", enum: DIRECTIONS },
    relevanceBand: { type: "string", enum: RELEVANCE_BANDS },
    rationale: { type: "string" },
  },
  required: ["path", "direction", "relevanceBand", "rationale"],
};

const SYSTEM_INSTRUCTION = `Kamu penulis exposure path untuk investor. Diberi satu peristiwa dan segmen pendapatan emiten, tulis SATU kalimat jalur sebab-akibat spesifik (bukan template generik), pilih arah dampak (Supported/Adverse/Mixed/Unrelated/Unverified), dan nilai relevansi sebagai pita ordinal (high/medium/low) — JANGAN mengeluarkan angka apa pun, termasuk skor relevansi numerik.`;

export async function assessExposureWithLlm(
  input: ExposureInput,
  call: typeof generateStructured = generateStructured,
): Promise<ExposureAssessment> {
  const result = await call<ExposureAssessment>({
    model: process.env.GEMINI_MODEL_FLASH || process.env.GEMINI_MODEL || "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [
      `Emiten: ${input.symbol}`,
      `Judul peristiwa: ${input.eventTitle}`,
      `Ringkasan: ${input.eventSummary}`,
      `Tag Sectors: ${input.eventTags.join(", ") || "tidak ada"}`,
      `Segmen pendapatan (dari get-segments): ${input.segments.map((s) => `${s.segment} (${(s.share * 100).toFixed(0)}%)`).join(", ") || "tidak tersedia"}`,
    ].join("\n"),
    schema: EXPOSURE_SCHEMA,
  });
  if (!DIRECTIONS.includes(result.direction)) throw new Error(`Model returned an invalid direction: ${result.direction}`);
  if (!RELEVANCE_BANDS.includes(result.relevanceBand)) throw new Error(`Model returned an invalid relevanceBand: ${result.relevanceBand}`);
  return result;
}
