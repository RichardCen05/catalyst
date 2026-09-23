import type { MarketEvent } from "@/lib/types";
import { bandForRelevance, RELEVANCE_BAND_SCORE, type RelevanceBand } from "@/lib/agent/thresholds";
import {
  heuristicWindowFor,
  type PredictionClaim,
  type PredictionOutcome,
  type PredictionVerdict,
} from "@/lib/agent/prediction";

/**
 * Lapis 3, tahap agregasi: dari vonis per klaim menjadi angka yang berarti.
 *
 * Satu klaim tidak mengajarkan apa pun — bisa kebetulan. Belajar butuh
 * pengulangan, jadi vonis dikelompokkan per jenis berita, lalu barulah
 * hit-rate dan sebaran jedanya dihitung.
 *
 * MIN_SAMPLE ada supaya angka dari sedikit kejadian tidak menyamar jadi
 * pengetahuan: 2 tepat dari 3 bukan "akurasi 67%", itu derau. Di bawah ambang
 * ini bucket tetap ditampilkan, tapi statusnya "belum cukup bukti" dan
 * hit-rate-nya tidak boleh dipakai untuk mengubah apa pun.
 */
export const MIN_SAMPLE = 20;

export type CalibrationDimension = "eventCategory" | "sourceType" | "relevanceBand" | "metric" | "selection";

export interface CalibrationBucket {
  dimension: CalibrationDimension;
  key: string;
  label: string;
  /** Klaim yang sudah tervonis (pending dan void tidak dihitung). */
  n: number;
  hits: number;
  /** hit + late + early: kondisinya terjadi, terlepas dari ketepatan waktunya. */
  occurred: number;
  hitRate: number | null;
  occurrenceRate: number | null;
  verdicts: Record<PredictionVerdict, number>;
  /** Sebaran sesi saat kondisi terpenuhi, dari klaim yang memang terpenuhi. */
  lag: { median: number; p75: number } | null;
  sufficient: boolean;
}

export interface LagSuggestion {
  category: MarketEvent["category"];
  current: [number, number];
  suggested: [number, number];
  n: number;
  reason: string;
}

export interface CalibrationSummary {
  claims: number;
  graded: number;
  pending: number;
  void: number;
  hitRate: number | null;
  sufficientBuckets: number;
}

export interface CalibrationReport {
  summary: CalibrationSummary;
  buckets: CalibrationBucket[];
  lagSuggestions: LagSuggestion[];
}

const EMPTY_VERDICTS: Record<PredictionVerdict, number> = {
  hit: 0, early: 0, late: 0, miss: 0, pending: 0, void: 0,
};

/** Band relevansi mengikuti RELEVANCE_BAND_SCORE di lib/agent/thresholds.ts. */
export function relevanceBand(relevance: number): RelevanceBand {
  return bandForRelevance(relevance);
}

const DIMENSION_LABELS: Record<CalibrationDimension, string> = {
  eventCategory: "Kategori berita",
  sourceType: "Jenis sumber",
  relevanceBand: "Skor pengaruh",
  metric: "Yang diprediksi",
  selection: "Lolos seleksi pemicu",
};

const KEY_LABELS: Record<string, string> = {
  company: "Perusahaan",
  commodity: "Komoditas",
  rates: "Suku bunga",
  currency: "Nilai tukar",
  policy: "Kebijakan",
  weather: "Cuaca",
  flows: "Arus dana",
  sentiment: "Sentimen",
  sectors: "Berita Sectors",
  filing: "Keterbukaan emiten",
  macro: "Makro",
  high: `Tinggi (${RELEVANCE_BAND_SCORE.high}+)`,
  medium: `Sedang (${RELEVANCE_BAND_SCORE.medium}-${RELEVANCE_BAND_SCORE.high - 1})`,
  low: `Rendah (<${RELEVANCE_BAND_SCORE.medium})`,
  volumeRobustZ: "Volume tidak wajar",
  marketAdjustedMove: "Gerak di luar pasar",
  primary: "Pemicu utama",
  shadow: "Kalah seleksi",
};

function quantile(sorted: number[], fraction: number): number {
  if (!sorted.length) return 0;
  const position = (sorted.length - 1) * fraction;
  const lower = Math.floor(position);
  const upper = Math.ceil(position);
  if (lower === upper) return sorted[lower];
  return sorted[lower] + (sorted[upper] - sorted[lower]) * (position - lower);
}

function bucketKeys(claim: PredictionClaim): Array<[CalibrationDimension, string]> {
  return [
    ["eventCategory", claim.eventCategory],
    ["sourceType", claim.eventSourceType],
    ["relevanceBand", relevanceBand(claim.relevanceAtIssue)],
    ["metric", claim.metric],
    ["selection", claim.shadow ? "shadow" : "primary"],
  ];
}

export function buildCalibration(
  claims: PredictionClaim[],
  outcomes: PredictionOutcome[],
): CalibrationReport {
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.claimId, outcome]));
  const groups = new Map<string, { dimension: CalibrationDimension; key: string; verdicts: Record<PredictionVerdict, number>; lags: number[] }>();

  let graded = 0;
  let pending = 0;
  let voided = 0;
  let totalHits = 0;

  for (const claim of claims) {
    const outcome = outcomeById.get(claim.id);
    if (!outcome) continue;
    if (outcome.verdict === "pending") pending += 1;
    else if (outcome.verdict === "void") voided += 1;
    else {
      graded += 1;
      if (outcome.verdict === "hit") totalHits += 1;
    }
    for (const [dimension, key] of bucketKeys(claim)) {
      const id = `${dimension}:${key}`;
      const group = groups.get(id) ?? { dimension, key, verdicts: { ...EMPTY_VERDICTS }, lags: [] };
      group.verdicts[outcome.verdict] += 1;
      if (outcome.observedAtSession !== null) group.lags.push(outcome.observedAtSession);
      groups.set(id, group);
    }
  }

  const buckets: CalibrationBucket[] = [...groups.values()].map((group) => {
    const n = group.verdicts.hit + group.verdicts.early + group.verdicts.late + group.verdicts.miss;
    const occurred = group.verdicts.hit + group.verdicts.early + group.verdicts.late;
    const sortedLags = [...group.lags].sort((a, b) => a - b);
    return {
      dimension: group.dimension,
      key: group.key,
      label: KEY_LABELS[group.key] ?? group.key,
      n,
      hits: group.verdicts.hit,
      occurred,
      hitRate: n ? group.verdicts.hit / n : null,
      occurrenceRate: n ? occurred / n : null,
      verdicts: group.verdicts,
      lag: sortedLags.length ? { median: quantile(sortedLags, 0.5), p75: quantile(sortedLags, 0.75) } : null,
      sufficient: n >= MIN_SAMPLE,
    };
  }).sort((a, b) => a.dimension.localeCompare(b.dimension) || b.n - a.n);

  return {
    summary: {
      claims: claims.length,
      graded,
      pending,
      void: voided,
      hitRate: graded ? totalHits / graded : null,
      sufficientBuckets: buckets.filter((bucket) => bucket.sufficient).length,
    },
    buckets,
    lagSuggestions: suggestLagWindows(claims, outcomes),
  };
}

/**
 * Usulan jendela jeda per kategori berita.
 *
 * Hanya dihitung dari klaim yang kondisinya memang terpenuhi (hit/early/late)
 * — sesi terjadinya itulah pengukurannya. `miss` tidak punya angka jeda, jadi
 * tidak boleh ikut. p75 dipakai, bukan median: jendela dimaksudkan menampung
 * sebagian besar kejadian, bukan separuhnya.
 *
 * Usulan tidak pernah diterapkan otomatis. Ia muncul sebagai usulan dengan
 * buktinya, dan pengguna yang memutuskan — data historis sesedikit ini terlalu
 * mudah untuk di-overfit.
 */
export function suggestLagWindows(
  claims: PredictionClaim[],
  outcomes: PredictionOutcome[],
): LagSuggestion[] {
  const outcomeById = new Map(outcomes.map((outcome) => [outcome.claimId, outcome]));
  const byCategory = new Map<MarketEvent["category"], number[]>();
  for (const claim of claims) {
    const outcome = outcomeById.get(claim.id);
    if (!outcome || outcome.observedAtSession === null) continue;
    const list = byCategory.get(claim.eventCategory) ?? [];
    list.push(outcome.observedAtSession);
    byCategory.set(claim.eventCategory, list);
  }

  const suggestions: LagSuggestion[] = [];
  for (const [category, lags] of byCategory) {
    if (lags.length < MIN_SAMPLE) continue;
    const sorted = [...lags].sort((a, b) => a - b);
    const current = heuristicWindowFor(category);
    const suggested: [number, number] = [
      Math.max(0, Math.floor(quantile(sorted, 0.1))),
      Math.max(1, Math.ceil(quantile(sorted, 0.75))),
    ];
    if (suggested[0] === current[0] && suggested[1] === current[1]) continue;
    suggestions.push({
      category,
      current,
      suggested,
      n: sorted.length,
      reason: `Dari ${sorted.length} kejadian yang benar-benar terpenuhi, separuhnya di sesi ke-${quantile(sorted, 0.5).toFixed(0)} dan tiga perempatnya pada atau sebelum sesi ke-${suggested[1]}.`,
    });
  }
  return suggestions.sort((a, b) => b.n - a.n);
}

export const CALIBRATION_DIMENSION_LABELS = DIMENSION_LABELS;
