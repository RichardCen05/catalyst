import { generateStructured } from "@/lib/agent/llm/client";
import { strongModel } from "@/lib/agent/llm/models";
import type { BusinessImpactDimension } from "@/lib/types";

const DIMENSIONS: BusinessImpactDimension[] = ["volume", "pricing", "margin", "cash-flow", "balance-sheet", "valuation"];

export interface MandatePlan {
  focus: BusinessImpactDimension;
  rationale: string;
  hypothesisTree: Array<{ id: string; claim: string; test: string; state: "primary" | "supporting" | "challenge" }>;
  observables: Array<{ dimension: BusinessImpactDimension; metric: string; expectedChange: string; window: string }>;
}

export interface MandateInput {
  symbol: string;
  mandate: string;
}

const MANDATE_SCHEMA = {
  type: "object",
  properties: {
    focus: { type: "string", enum: DIMENSIONS },
    rationale: { type: "string" },
    hypothesisTree: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          claim: { type: "string" },
          test: { type: "string" },
          state: { type: "string", enum: ["primary", "supporting", "challenge"] },
        },
        required: ["id", "claim", "test", "state"],
      },
    },
    observables: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dimension: { type: "string", enum: DIMENSIONS },
          metric: { type: "string" },
          expectedChange: { type: "string" },
          window: { type: "string" },
        },
        required: ["dimension", "metric", "expectedChange", "window"],
      },
    },
  },
  required: ["focus", "rationale", "hypothesisTree", "observables"],
};

const SYSTEM_INSTRUCTION = `Kamu planner riset investasi. Baca mandate bebas dari pengguna dan pilih SATU fokus dampak bisnis dari enam pilihan: volume, pricing, margin, cash-flow, balance-sheet, valuation. Tulis 1-3 hipotesis (primary/supporting/challenge) dan 1-2 observable yang bisa diuji dari data pasar. Jangan menulis angka apa pun — itu tugas kalkulator, bukan kamu.`;

export async function parseMandateWithLlm(
  input: MandateInput,
  call: typeof generateStructured = generateStructured,
): Promise<MandatePlan> {
  const result = await call<MandatePlan>({
    model: strongModel(),
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: `Ticker: ${input.symbol}\nMandate: ${input.mandate}`,
    schema: MANDATE_SCHEMA,
  });
  if (!DIMENSIONS.includes(result.focus)) throw new Error(`Model returned an invalid focus: ${result.focus}`);
  if (!result.hypothesisTree.length) throw new Error("Model returned an empty hypothesisTree");
  return result;
}
