import { METRIC_FORMULA } from "@/lib/agent/explain";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/**
 * What a figure measures and how it is computed — never what it currently is.
 *
 * `figures` stays empty on purpose, which makes the verifier reject any draft
 * that quotes a number here. The same rule `metric-gloss.ts` enforces, for the
 * same reason: the real value is already on screen beside this explanation,
 * and an invented one next to it is worse than no sentence at all.
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
    figures: [],
    citations: [],
    symbols: [],
  };
}
