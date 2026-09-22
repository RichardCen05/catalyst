import { DEFAULT_THRESHOLDS, PILLAR_LABELS, THRESHOLD_PROVENANCE } from "@/lib/agent/thresholds";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/**
 * How the app decides, and how sure it is allowed to sound.
 *
 * The page's point is the provenance column: most decision cut-offs are
 * chosen numbers rather than measured ones. Counting them here rather than
 * stating a total keeps the sentence true after the table changes.
 */
export async function buildMethodBundle(): Promise<ContextBundle> {
  const keys = Object.keys(DEFAULT_THRESHOLDS) as Array<keyof typeof DEFAULT_THRESHOLDS>;
  const byProvenance = (status: "derived" | "convention" | "guess") =>
    keys.filter((key) => THRESHOLD_PROVENANCE[key] === status);

  const body = [
    `Metode membaca dua lapis: lapisan 1 konfirmasi pasar (${Object.values(PILLAR_LABELS).join(", ")}), lapisan 2 dampak ke bisnis.`,
    `Pilar yang dinilai: ${Object.entries(PILLAR_LABELS).map(([key, label]) => `${label} (${key})`).join(", ")}.`,
    `Tabel ambang memuat ${keys.length} nilai: ${byProvenance("guess").length} dipilih manusia dan belum diukur terhadap pasar Indonesia, ${byProvenance("convention").length} penjaga kualitas data, ${byProvenance("derived").length} turunan matematis.`,
    `Ambang yang dipilih manusia: ${byProvenance("guess").map((key) => `${key} = ${DEFAULT_THRESHOLDS[key]}`).join(", ")}.`,
    `Batasnya: semua angka berasal dari rekaman bertanggal, bukan pasar live, dan tidak satu pun jadi saran transaksi.`,
  ].join("\n");

  return {
    id: "view:method",
    kind: "view",
    title: "Metode dan batas",
    body,
    figures: extractNumerals(body),
    // The thresholds are the app's own choices, not a recording, so there is
    // nothing to cite. Saying so with an empty list is honest; borrowing a
    // market citation to look sourced would not be.
    citations: [],
    symbols: [],
  };
}
