import type { InvestorResearchPlaybook } from "@/lib/types";

/**
 * Satu tabel default untuk semua ambang penilaian riset.
 * Satu resolver (resolveThresholds), tidak ada default tersebar di call site.
 *
 * volumeZFloor default 2.5 — bukan 3 seperti draf plan — karena nilai live
 * di lib/agent/metrics.ts:58 adalah Elevated >= 2.5 / Extreme >= 5.
 * signal-history memakai 3/2 yang tidak konsisten; keduanya kini di-thread
 * lewat resolver ini (C5).
 *
 * ASAL SETIAP ANGKA — lihat THRESHOLD_PROVENANCE di bawah. Ringkasnya: semua
 * entri di tabel ini berstatus `guess`. Tidak satu pun pernah diukur terhadap
 * pasar Indonesia; nilainya dipilih supaya konsisten dengan nilai live yang
 * sudah ada di kode. Itu bukan pembelaan, itu catatan konsistensi — dan
 * itulah sebabnya tabel ini adalah permukaan belajar Lapis 3
 * (docs/KONSEP-BELAJAR-AI.md).
 *
 * Ambang momentum (`momentum*Floor`) dan `foreignContradictionShare` dulu
 * hardcode di lib/agent/metrics.ts. Keduanya memberi label ke setiap kasus
 * tanpa pernah muncul di ruleTrace, sehingga panel audit menyebut lebih
 * sedikit penentu daripada yang sebenarnya bekerja. Diangkat ke sini supaya
 * dapat ditelusuri, digeser pengguna, dan — nanti — dinilai.
 */
export const DEFAULT_THRESHOLDS = {
  relevanceFloor: 85,
  /** Ambang relevansi awal untuk peta sebab akibat: di bawah ini sisi graf
   *  disembunyikan. Dulu literal `useState(60)` di dua halaman sekaligus. */
  chainRelevanceFloor: 60,
  concentrationFloor: 0.42,
  volumeZFloor: 2.5,
  volumeExtremeFloor: 5,
  contagionDropFloor: 0.04,
  contagionCorrelationFloor: 0.5,
  distributionValueFloor: 1e11,
  /** |residual| di bawah ini = "Mengikuti pasar". */
  momentumAlignedFloor: 0.012,
  /** |selisih sektor| di bawah ini = "Dipengaruhi sektor". */
  momentumSectorFloor: 0.015,
  /** |residual| di atas ini = "Khusus emiten" — gerak yang tidak dijelaskan pasar. */
  momentumIdiosyncraticFloor: 0.03,
  /** Porsi nilai beli broker asing sebelum arus asing negatif dianggap konflik sumber. */
  foreignContradictionShare: 0.55,
  /** Skor minimum sebelum sebuah handler boleh menjawab. Di bawah ini Copilot
   *  menampilkan menu kemampuannya, bukan jawaban. */
  handlerScoreFloor: 0.35,
  /** Skor minimum satu entri rekaman agar ikut diambil sama sekali. Lebih
   *  rendah daripada handlerScoreFloor: entri dikumpulkan dulu, gabungannya
   *  yang dinilai. */
  retrievalScoreFloor: 0.18,
  /** Entri yang dimuat untuk pertanyaan non-agregat. */
  retrievalTopK: 6,
  /** Batas teks bukti yang masuk prompt, dalam karakter. Nilai inilah yang
   *  menentukan biaya token masuk per pertanyaan. */
  retrievalContextCharCap: 6000,
  /** Giliran percakapan terakhir yang dikirim ke model. */
  copilotHistoryTurns: 6,
  /** Batas entri memo analisis per instance, supaya Map tingkat modul pada
   *  instance Cloud Run berumur panjang tidak tumbuh tanpa henti. */
  retrievalMemoMaxEntries: 64,
} as const;

/**
 * Asal-usul tiap ambang, dicatat supaya tidak ada yang mengira angka tebakan
 * adalah angka terukur.
 *
 *   derived    — turunan matematis, tidak ada yang bisa dipelajari
 *                (mis. 0.6745 di metrics.ts: konstanta MAD→sigma, Φ⁻¹(0.75))
 *   convention — penjaga kualitas data, bukan ambang keputusan
 *   guess      — nilai awal yang dipilih manusia; kandidat Lapis 3
 */
/**
 * Nama pilar dalam bahasa pembaca.
 *
 * Dulu tabel lokal di dalam `insightTraces` (lib/agent/engine.ts), tidak
 * terlihat dari mana pun. Indeks korpus membutuhkan nama yang sama supaya
 * "berapa ambang konsentrasi" menemukan `concentrationFloor` — kunci ambang
 * ditulis dalam bahasa Inggris, pertanyaan pembaca tidak.
 */
export const PILLAR_LABELS: Record<string, string> = {
  concentration: "Konsentrasi",
  volume: "Volume",
  momentum: "Momentum",
  catalyst: "Katalis",
};

export const THRESHOLD_PROVENANCE: Record<keyof typeof DEFAULT_THRESHOLDS, "derived" | "convention" | "guess"> = {
  relevanceFloor: "guess",
  chainRelevanceFloor: "guess",
  concentrationFloor: "guess",
  volumeZFloor: "guess",
  volumeExtremeFloor: "guess",
  contagionDropFloor: "guess",
  contagionCorrelationFloor: "guess",
  distributionValueFloor: "guess",
  momentumAlignedFloor: "guess",
  momentumSectorFloor: "guess",
  momentumIdiosyncraticFloor: "guess",
  foreignContradictionShare: "guess",
  // Dua ambang di bawah memutuskan apakah pembaca menerima jawaban sama
  // sekali, jadi keduanya keputusan — bukan penjaga kapasitas.
  handlerScoreFloor: "guess",
  retrievalScoreFloor: "guess",
  // Sisanya menjaga ukuran, bukan menilai bukti: berapa entri dimuat, berapa
  // karakter masuk prompt, berapa giliran diingat, berapa entri disimpan.
  retrievalTopK: "convention",
  retrievalContextCharCap: "convention",
  copilotHistoryTurns: "convention",
  retrievalMemoMaxEntries: "convention",
};

/**
 * Jendela pemeriksaan dan bobot relevansi hasil — dulu diketik ulang di lima
 * call site lib/agent/engine.ts ("1-10 sesi", "1-3 bulan", "0-3 sesi", 100,
 * 85). Satu nilai diubah di satu tempat, empat tempat lain tetap memakai yang
 * lama, dan tidak ada tes yang gagal. Angkanya hidup sekali di sini; label
 * dirakit oleh formatter di bawah supaya teks dan nilai tidak bisa berbeda.
 *
 * Status provenance seluruh tabel ini: `guess` — belum pernah diukur.
 */
export const OBSERVATION_WINDOWS = {
  /** Jendela baku untuk indikator operasional, dalam sesi bursa. */
  defaultSessions: [1, 10],
  /** Dampak valuasi butuh jendela lebih panjang, dalam bulan. */
  valuationMonths: [1, 3],
  /** Perkiraan jeda per jenis peristiwa, dalam sesi bursa. */
  eventLagSessions: {
    company: [0, 3],
    weather: [0, 5],
    rates: [5, 20],
    sentiment: [1, 5],
  } as Record<string, [number, number]>,
} as const;

/** Bobot relevansi hasil uji pada rantai sebab akibat. */
export const OUTCOME_RELEVANCE = {
  primaryTest: 100,
  supporting: 85,
} as const;

export const sessionWindowLabel = (range: readonly [number, number] | number[]): string => `${range[0]}-${range[1]} sesi`;
export const monthWindowLabel = (range: readonly [number, number] | number[]): string => `${range[0]}-${range[1]} bulan`;
/** Jendela baku dalam kalimat panjang ("1–10 hari bursa"). */
export const sessionWindowSentence = (range: readonly [number, number] | number[]): string => `${range[0]}\u2013${range[1]} hari bursa`;

export type ResolvedThresholds = {
  [K in keyof typeof DEFAULT_THRESHOLDS]: number;
};

type PlaybookLike = Pick<InvestorResearchPlaybook, "relevanceFloor" | "thresholds">;

function num(value: unknown, fallback: number): number {
  return typeof value === "number" && Number.isFinite(value) ? value : fallback;
}

/** Kembalikan objek thresholds yang terisi penuh; aman untuk partial/absent (C7). */
export function resolveThresholds(playbook?: PlaybookLike | null): ResolvedThresholds {
  const t = playbook?.thresholds ?? {};
  return {
    relevanceFloor: num(playbook?.relevanceFloor, DEFAULT_THRESHOLDS.relevanceFloor),
    chainRelevanceFloor: num(t.chainRelevanceFloor, DEFAULT_THRESHOLDS.chainRelevanceFloor),
    concentrationFloor: num(t.concentrationFloor, DEFAULT_THRESHOLDS.concentrationFloor),
    volumeZFloor: num(t.volumeZFloor, DEFAULT_THRESHOLDS.volumeZFloor),
    volumeExtremeFloor: num(t.volumeExtremeFloor, DEFAULT_THRESHOLDS.volumeExtremeFloor),
    contagionDropFloor: num(t.contagionDropFloor, DEFAULT_THRESHOLDS.contagionDropFloor),
    contagionCorrelationFloor: num(t.contagionCorrelationFloor, DEFAULT_THRESHOLDS.contagionCorrelationFloor),
    distributionValueFloor: num(t.distributionValueFloor, DEFAULT_THRESHOLDS.distributionValueFloor),
    momentumAlignedFloor: num(t.momentumAlignedFloor, DEFAULT_THRESHOLDS.momentumAlignedFloor),
    momentumSectorFloor: num(t.momentumSectorFloor, DEFAULT_THRESHOLDS.momentumSectorFloor),
    momentumIdiosyncraticFloor: num(t.momentumIdiosyncraticFloor, DEFAULT_THRESHOLDS.momentumIdiosyncraticFloor),
    foreignContradictionShare: num(t.foreignContradictionShare, DEFAULT_THRESHOLDS.foreignContradictionShare),
    // Nilai lapisan retrieval selalu jatuh ke default: playbook pembaca tidak
    // memuatnya, dan memang tidak seharusnya. Ambang konsentrasi adalah
    // pendapat tentang pasar; berapa karakter yang masuk prompt bukan.
    // Keduanya tetap lewat sini supaya satu objek ini benar-benar berisi
    // setiap ambang yang dibaca mesin, seperti yang dijanjikan namanya.
    handlerScoreFloor: DEFAULT_THRESHOLDS.handlerScoreFloor,
    retrievalScoreFloor: DEFAULT_THRESHOLDS.retrievalScoreFloor,
    retrievalTopK: DEFAULT_THRESHOLDS.retrievalTopK,
    retrievalContextCharCap: DEFAULT_THRESHOLDS.retrievalContextCharCap,
    copilotHistoryTurns: DEFAULT_THRESHOLDS.copilotHistoryTurns,
    retrievalMemoMaxEntries: DEFAULT_THRESHOLDS.retrievalMemoMaxEntries,
  };
}

/** Materiality floor dari playbook user; nama dipertahankan agar call site tidak pecah. */
export const relevanceFloorFor = (playbook?: Pick<InvestorResearchPlaybook, "relevanceFloor"> | null): number =>
  resolveThresholds(playbook).relevanceFloor;
