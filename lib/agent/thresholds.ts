import type { InvestorResearchPlaybook } from "@/lib/types";

/**
 * Satu tabel default untuk semua ambang penilaian riset.
 * Satu resolver (resolveThresholds), tidak ada default tersebar di call site.
 *
 * volumeZFloor default 2.5 — bukan 3 seperti draf plan — karena nilai live
 * di lib/agent/metrics.ts:58 adalah Elevated >= 2.5 / Extreme >= 5.
 * signal-history memakai 3/2 yang tidak konsisten; keduanya kini di-thread
 * lewat resolver ini (C5).
 */
export const DEFAULT_THRESHOLDS = {
  relevanceFloor: 85,
  concentrationFloor: 0.42,
  volumeZFloor: 2.5,
  volumeExtremeFloor: 5,
  contagionDropFloor: 0.04,
  contagionCorrelationFloor: 0.5,
  distributionValueFloor: 1e11,
} as const;

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
  };
}

/** Materiality floor dari playbook user; nama dipertahankan agar call site tidak pecah. */
export const relevanceFloorFor = (playbook?: Pick<InvestorResearchPlaybook, "relevanceFloor"> | null): number =>
  resolveThresholds(playbook).relevanceFloor;
