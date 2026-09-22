import { extractNumerals } from "@/lib/agent/llm/verify";
import { getCorpus } from "@/lib/agent/retrieval/corpus";
import type { ContextBundle, EntryKind } from "@/lib/agent/retrieval/types";

/** How each kind of entry reads to a reader who has not seen the index. */
const KIND_LABEL: Record<EntryKind, string> = {
  case: "kasus riset",
  event: "peristiwa terekam",
  metric: "ukuran dan rumusnya",
  endpoint: "endpoint sumber data",
  "causal-node": "mekanisme pada peta sebab akibat",
  threshold: "ambang keputusan",
  chrome: "panel dan label di layar",
  view: "halaman",
};

/**
 * What the assistant can be asked, counted off its own index.
 *
 * A reader asking "what can you answer" gets the index rather than a
 * description of it, so the answer cannot claim a capability the corpus does
 * not carry and cannot go stale when a new kind of entry is registered.
 */
export async function buildCopilotBundle(): Promise<ContextBundle> {
  const corpus = getCorpus();
  const byKind = new Map<EntryKind, number>();
  for (const entry of corpus.entries) byKind.set(entry.kind, (byKind.get(entry.kind) ?? 0) + 1);

  const body = [
    `Asisten menjawab dari rekaman yang sudah ada di aplikasi ini, bukan dari pasar live, dan tidak memberi saran transaksi.`,
    `Yang dapat dicari: ${[...byKind.entries()].map(([kind, count]) => `${count} ${KIND_LABEL[kind]}`).join(", ")}.`,
    `Setiap angka pada jawaban harus sudah ada pada bahan yang diambil; draf yang menyebut angka lain ditolak dan tidak ditampilkan.`,
    `Pertanyaan yang tidak menyentuh satu pun entri dijawab dengan daftar kemampuan, bukan dengan tebakan.`,
  ].join("\n");

  return {
    id: "view:copilot",
    scope: "registry",
    kind: "view",
    title: "Asisten riset",
    body,
    figures: extractNumerals(body),
    citations: [],
    symbols: [],
  };
}
