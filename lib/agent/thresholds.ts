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
export const THRESHOLD_PROVENANCE: Record<keyof typeof DEFAULT_THRESHOLDS, "derived" | "convention" | "guess"> = {
  relevanceFloor: "guess",
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
};

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
  };
}

/** Materiality floor dari playbook user; nama dipertahankan agar call site tidak pecah. */
export const relevanceFloorFor = (playbook?: Pick<InvestorResearchPlaybook, "relevanceFloor"> | null): number =>
  resolveThresholds(playbook).relevanceFloor;
