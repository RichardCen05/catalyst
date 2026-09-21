import { DEFAULT_THRESHOLDS, THRESHOLD_PROVENANCE } from "@/lib/agent/thresholds";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/** How each provenance status reads to someone who has never seen the table. */
const PROVENANCE_SENTENCE: Record<"derived" | "convention" | "guess", string> = {
  derived: "Nilai ini turunan matematis, bukan pilihan; tidak ada yang bisa dipelajari darinya.",
  convention: "Nilai ini penjaga kualitas data, bukan ambang keputusan.",
  guess: "Nilai ini dipilih manusia dan belum pernah diukur terhadap pasar Indonesia.",
};

/**
 * One threshold, its value, and where the value came from.
 *
 * The provenance is the point. Every decision entry in that table is a chosen
 * number rather than a measured one, and a reader asking what the cut-off is
 * deserves both halves of that answer — otherwise the app sounds more certain
 * than its own source file says it is.
 */
export async function buildThresholdBundle(key: keyof typeof DEFAULT_THRESHOLDS): Promise<ContextBundle> {
  const value = DEFAULT_THRESHOLDS[key];
  const provenance = THRESHOLD_PROVENANCE[key];
  const body = [
    `Ambang ${key} bernilai ${value}.`,
    `Status asal nilai: ${provenance}.`,
    PROVENANCE_SENTENCE[provenance],
  ].join(" ");
  return {
    id: `threshold:${key}`,
    kind: "threshold",
    title: `Ambang ${key}`,
    body,
    figures: extractNumerals(body, String(value)),
    citations: [],
    symbols: [],
  };
}
