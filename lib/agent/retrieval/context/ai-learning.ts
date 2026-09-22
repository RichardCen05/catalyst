import { LAYERS } from "@/lib/learning-layers";
import { LEARNING_FILTERS } from "@/lib/learning";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/**
 * How the app learns, and which half of it moves without the reader.
 *
 * The distinction is the page's whole point: two layers are taught by the
 * reader and one is taught by the recording, and layer 3 measures without
 * correcting. Read from the same list the page renders, so an answer cannot
 * describe a layer the page no longer shows.
 *
 * What the page shows *for this reader* — their feedback, their notes, their
 * closed cases — is held in the browser and never reaches a request, so this
 * says what each layer is rather than claiming a count it cannot see.
 */
export async function buildAiLearningBundle(): Promise<ContextBundle> {
  const taughtByReader = LAYERS.filter((layer) => layer.teacher === "Anda");
  const taughtByMarket = LAYERS.filter((layer) => layer.teacher === "Pasar");

  const body = [
    `Halaman AI Learning menerangkan ${LAYERS.length} lapis cara Catalyst belajar, lalu menampilkan apa yang sudah tersimpan.`,
    ...LAYERS.map((layer) => [
      `Lapis ${layer.index} — ${layer.name} (guru: ${layer.teacher}). Pertanyaannya: ${layer.question}`,
      `Yang berubah: ${layer.changes} Yang tidak berubah: ${layer.keeps}`,
      layer.caveat ? `Catatan: ${layer.caveat.badge} — ${layer.caveat.detail}` : "",
    ].filter(Boolean).join(" ")),
    `Lapis yang diajar pembaca: ${taughtByReader.map((layer) => layer.name).join(", ")}. Lapis yang diajar rekaman pasar: ${taughtByMarket.map((layer) => layer.name).join(", ")}.`,
    `Halaman ini memuat kotak "Ajari Catalyst": pembaca memilih satu saham, menulis apa yang ingin diajarkan, dan boleh melampirkan satu tautan referensi. Ajaran itu tersimpan sebagai hipotesis terbuka pada saham tersebut.`,
    `Riwayatnya ditampilkan sebagai garis waktu per hari, dan dapat disaring menurut jenis (${LEARNING_FILTERS.join(", ")}) maupun menurut kode saham.`,
    `Isi memori milik pembaca tersimpan di peramban, jadi tidak ikut terbaca di sini.`,
  ].join("\n");

  return {
    id: "view:ai-learning",
    kind: "view",
    title: "AI Learning",
    body,
    figures: extractNumerals(body),
    citations: [],
    symbols: [],
  };
}
