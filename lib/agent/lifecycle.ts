/**
 * The stages a case actually goes through, defined once.
 *
 * The engine emitted five stages (Pertanyaan → Tentukan fokus → Pilih sumber →
 * Uji bukti → Tentukan tindakan) and the case page drew them. The method page
 * separately described "Enam tahap pemeriksaan" with six hand-written names
 * that matched none of them, so the page documenting how Catalyst works
 * described a process Catalyst does not run. Both now read this list.
 *
 * `detail` is the reader-facing sentence; `label` is the chip on the case
 * page. A stage added here appears in both places or in neither.
 */
export const RESEARCH_LIFECYCLE = [
  {
    key: "mandate",
    label: "Pertanyaan",
    detail: "Batasi emiten dan tuliskan apa yang ingin dibuktikan.",
  },
  {
    key: "decompose",
    label: "Tentukan fokus",
    detail: "Pilih hasil bisnis yang harus berubah bila perubahannya nyata.",
  },
  {
    key: "source-plan",
    label: "Pilih sumber",
    detail: "Tentukan rekaman mana yang dapat menguji fokus itu.",
  },
  {
    key: "evidence",
    label: "Uji bukti",
    detail: "Hitung metrik dari rekaman, lalu periksa konflik dan kelengkapan sumbernya.",
  },
  {
    key: "review",
    label: "Tentukan tindakan",
    detail: "Ringkas bukti, batas data, dan tindakan riset berikutnya.",
  },
] as const;

export type ResearchLifecycleKey = (typeof RESEARCH_LIFECYCLE)[number]["key"];
