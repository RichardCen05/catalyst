import type { MarketEvent } from "@/lib/types";

/**
 * Mechanism names shared by the causal map and the retrieval corpus.
 *
 * This lived inside `engine.ts` until the corpus needed the same names for
 * its `causal-node` entries. Importing them from the engine would pull the
 * whole agent behind the index build — a load-time cycle (`engine` →
 * `retrieval/bundle` → `retrieval/corpus` → `engine`). A leaf module keeps
 * both readers on the same words with no cycle. `engine.ts` re-exports the
 * function so existing importers keep working.
 */
const CATEGORY_MECHANISM_LABEL: Record<MarketEvent["category"], string> = {
  company: "Kinerja emiten ke valuasi",
  commodity: "Harga komoditas ke margin",
  rates: "Suku bunga ke margin bunga",
  currency: "Kurs ke biaya dan pendapatan",
  policy: "Aturan ke biaya operasi",
  weather: "Cuaca ke volume operasi",
  flows: "Arus dana ke likuiditas",
  sentiment: "Liputan ke perhatian ritel",
};

/** Title for a mechanism card, in falling order of specificity: the label the
 *  model wrote, the middle leg of an arrow-shaped exposure path, then the
 *  category default. An LLM path is a sentence and carries no arrow, which is
 *  why every card used to read "Jalur eksposur". */
export function mechanismLabelFor(
  llmLabel: string | undefined,
  path: string,
  category: MarketEvent["category"],
): string {
  const clip = (value: string) => value.length <= 60 ? value : `${value.slice(0, 60).replace(/\s+\S*$/, "")}…`;
  const fromLlm = llmLabel?.trim().replace(/[.;]+$/, "");
  if (fromLlm) return clip(fromLlm);
  const fromPath = path.split(/→|->/)[1]?.trim();
  if (fromPath) return clip(fromPath);
  return CATEGORY_MECHANISM_LABEL[category] ?? "Jalur eksposur";
}
