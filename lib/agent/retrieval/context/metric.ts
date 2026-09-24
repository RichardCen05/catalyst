import { METRIC_FORMULA } from "@/lib/agent/explain";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/**
 * What a figure measures and how it is computed — never what it currently is.
 *
 * `figures` holds the formula's own constants and nothing else. The current
 * value never enters this bundle, so a draft that quotes one is still rejected:
 * the real value is already on screen beside this explanation, and an invented
 * one next to it is worse than no sentence at all. The constants are a
 * different matter. They are part of the answer to "how is this computed"
 * ("filing = 95", "minimum 40"), and an empty allowlist rejected every faithful
 * draft that restated them, so a reader asking how a figure is made got the
 * raw material instead of a sentence.
 */
export async function buildMetricBundle(label: string): Promise<ContextBundle> {
  const formula = METRIC_FORMULA[label];
  const body = formula
    ? `Ukuran "${label}" dihitung sebagai: ${formula}.`
    : `Ukuran "${label}" dibaca langsung dari rekaman, tanpa perhitungan turunan.`;
  return {
    id: `metric:${label}`,
    kind: "metric",
    title: label,
    body,
    figures: formula ? extractNumerals(formula) : [],
    citations: [],
    symbols: [],
  };
}
