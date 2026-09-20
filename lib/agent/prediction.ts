import type { MarketEvent, PricePoint, SymbolCode } from "@/lib/types";
import { resolveThresholds } from "@/lib/agent/thresholds";
import type { InvestorResearchPlaybook } from "@/lib/types";

/**
 * Lapis 3 — klaim yang bisa meleset, dan penilainya.
 *
 * Catalyst sudah memancarkan pernyataan tentang masa depan setiap kali ia
 * menganalisis: volume dianggap tidak wajar di atas ambang tertentu, berita
 * kategori tertentu diperkirakan berdampak dalam sekian sesi. Pernyataan itu
 * tidak pernah ditagih, sehingga ambang dan jendela di lib/agent/thresholds.ts
 * dan lib/agent/lag-validate.ts tetap berupa tebakan.
 *
 * Modul ini membekukan pernyataan tersebut sebagai `PredictionClaim`, lalu
 * menilainya dari deret harga yang datang setelahnya. Tidak ada pengguna yang
 * terlibat: yang memutuskan adalah data. Penjelasan konsepnya ada di
 * docs/KONSEP-BELAJAR-AI.md ("Lapis 3").
 *
 * Batas yang dijaga modul ini:
 *   - Vonis `hit` berarti kondisinya terpenuhi di jendela itu. BUKAN berarti
 *     peristiwanya menyebabkan. Kausalitas tidak diuji di sini dan tidak
 *     boleh disimpulkan dari hasilnya.
 *   - Semua perhitungan hanya memakai sesi <= issuedAt untuk baseline. Satu
 *     sesi masa depan yang bocor ke baseline membuat seluruh hit-rate fiksi.
 *   - Ambang dibekukan pada nilai saat klaim dibuat. Kalau pengguna menggeser
 *     slider besok, klaim lama tetap dinilai dengan ambang lamanya — kalau
 *     tidak, sejarah berubah setiap slider disentuh.
 */

export type PredictionMetric = "volumeRobustZ" | "marketAdjustedMove";

export type PredictionVerdict =
  /** Terpenuhi di dalam jendela yang diperkirakan. */
  | "hit"
  /** Terpenuhi sebelum jendela dibuka — jeda yang diperkirakan terlalu lambat. */
  | "early"
  /** Terpenuhi setelah jendela tutup — jeda yang diperkirakan terlalu cepat. */
  | "late"
  /** Jendela lewat, kondisi tidak pernah terpenuhi. */
  | "miss"
  /** Jendela belum penuh; belum boleh dinilai. */
  | "pending"
  /** Data tidak memungkinkan penilaian (baseline kurang, sebaran nol). */
  | "void";

export interface PredictionClaim {
  id: string;
  symbol: SymbolCode;
  /** Sesi terakhir yang boleh dipakai sebagai baseline. Tidak ada data setelah ini. */
  issuedAt: string;
  eventId: string;
  eventCategory: MarketEvent["category"];
  eventSourceType: MarketEvent["sourceType"];
  /** Skor pengaruh berita yang Catalyst berikan saat klaim dibuat (0-100). */
  relevanceAtIssue: number;
  /**
   * Apakah berita ini menang seleksi sebagai pemicu utama simbolnya.
   * Klaim untuk yang kalah seleksi tetap dibuat (shadow) supaya base rate
   * tidak hanya dihitung dari berita yang sudah terlanjur dianggap penting —
   * bias yang sama dengan menilai akurasi dokter hanya dari pasien yang ia
   * putuskan sakit.
   */
  shadow: boolean;
  metric: PredictionMetric;
  /** Ambang yang berlaku saat klaim dibuat. Dibekukan, tidak ikut slider berikutnya. */
  threshold: number;
  /** [sesi paling awal, sesi paling akhir] yang diperkirakan. */
  windowSessions: [number, number];
  createdAt: string;
}

export interface PredictionOutcome {
  claimId: string;
  verdict: PredictionVerdict;
  /** Sesi ke-berapa setelah issuedAt kondisi terpenuhi; null bila tidak pernah. */
  observedAtSession: number | null;
  /** Nilai metrik pada sesi itu, atau nilai terkuat yang tercapai bila tidak terpenuhi. */
  observedValue: number | null;
  /** Tanggal sesi tempat kondisi terpenuhi. */
  observedAtDate: string | null;
  /** Berapa sesi tersedia setelah issuedAt saat penilaian dijalankan. */
  sessionsAvailable: number;
  note: string;
}

/**
 * Jendela jeda per kategori, dalam sesi bursa.
 *
 * Angka ini menyalin heuristik di lib/agent/lag-validate.ts — sengaja, supaya
 * yang dinilai adalah tebakan yang benar-benar dipakai aplikasi, bukan versi
 * lain yang lebih mudah dibenarkan. Semuanya tebakan; itulah yang hendak
 * diukur.
 */
export function heuristicWindowFor(category: MarketEvent["category"]): [number, number] {
  if (category === "company") return [0, 3];
  if (category === "weather") return [0, 5];
  if (category === "rates") return [5, 20];
  if (category === "sentiment") return [1, 5];
  return [1, 10];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

/** Indeks sesi terakhir yang tanggalnya <= `date`. -1 bila tidak ada. */
function sessionIndexAtOrBefore(series: PricePoint[], date: string): number {
  let found = -1;
  for (let index = 0; index < series.length; index += 1) {
    if (series[index].date <= date) found = index;
    else break;
  }
  return found;
}

export interface DeriveClaimsInput {
  symbol: SymbolCode;
  event: MarketEvent;
  series: PricePoint[];
  beta: number;
  /** Berita ini pemicu utama simbolnya, atau kalah seleksi (shadow). */
  shadow: boolean;
  playbook?: InvestorResearchPlaybook | null;
  now?: string;
}

/**
 * Dua klaim per (berita, simbol):
 *
 *   volumeRobustZ      — volume melampaui ambang tidak-wajar
 *   marketAdjustedMove — harga bergerak melebihi yang dijelaskan IHSG
 *
 * Keduanya dipilih karena hanya butuh PricePoint (close, ihsg, volume), yang
 * punya riwayat harian. Metrik fundamental (margin, arus kas) tidak bisa
 * dinilai di sini: jawabannya baru ada saat laporan kuartal.
 *
 * `marketAdjustedMove` memakai residual = imbal hasil emiten dikurangi beta ×
 * imbal hasil IHSG. Itu kontrol confounder kasar: waktu IHSG naik 2%, semua
 * saham ikut naik dan setiap berita tampak "berpengaruh". Residual membuang
 * bagian itu. Selisih sektor tidak dipakai karena rekaman sektor hanya satu
 * angka snapshot, tidak punya riwayat harian.
 */
export function deriveClaims(input: DeriveClaimsInput): PredictionClaim[] {
  const { symbol, event, series, shadow } = input;
  const thresholds = resolveThresholds(input.playbook);
  const eventDate = event.publishedAt.slice(0, 10);
  const issuedIndex = sessionIndexAtOrBefore(series, eventDate);
  if (issuedIndex < 0) return [];
  const issuedAt = series[issuedIndex].date;
  const link = event.impactLinks.find((item) => item.symbol === symbol);
  if (!link) return [];
  const windowSessions = heuristicWindowFor(event.category);
  const createdAt = input.now ?? new Date().toISOString();
  const base = {
    symbol,
    issuedAt,
    eventId: event.id,
    eventCategory: event.category,
    eventSourceType: event.sourceType,
    relevanceAtIssue: link.relevance,
    shadow,
    windowSessions,
    createdAt,
  } as const;
  return [
    { ...base, id: `${event.id}-${symbol}-volume`, metric: "volumeRobustZ", threshold: thresholds.volumeZFloor },
    { ...base, id: `${event.id}-${symbol}-move`, metric: "marketAdjustedMove", threshold: thresholds.momentumIdiosyncraticFloor },
  ];
}

/** Nilai metrik pada tiap sesi setelah issuedAt. Baseline hanya sesi <= issuedAt. */
function seriesValues(claim: PredictionClaim, series: PricePoint[], beta: number): { values: number[]; dates: string[] } | null {
  const issuedIndex = series.findIndex((point) => point.date === claim.issuedAt);
  if (issuedIndex < 0) return null;
  const future = series.slice(issuedIndex + 1);
  if (!future.length) return { values: [], dates: [] };

  if (claim.metric === "volumeRobustZ") {
    // Baseline = seluruh sesi SAMPAI issuedAt. Tidak satu pun sesi masa depan
    // boleh masuk ke sini, termasuk lewat median atau MAD.
    const baseline = series.slice(0, issuedIndex + 1).map((point) => point.volume);
    if (baseline.length < 8) return null;
    const center = median(baseline);
    const mad = median(baseline.map((value) => Math.abs(value - center)));
    if (mad === 0) return null;
    return {
      values: future.map((point) => Math.abs((0.6745 * (point.volume - center)) / mad)),
      dates: future.map((point) => point.date),
    };
  }

  const start = series[issuedIndex];
  if (!start.close || !start.ihsg) return null;
  return {
    // Residual kumulatif dari issuedAt: imbal hasil emiten dikurangi bagian
    // yang dijelaskan IHSG. Yang tersisa adalah gerak yang tidak diterangkan
    // pasar — itu yang layak dihubungkan dengan berita spesifik emiten.
    values: future.map((point) => {
      const stockReturn = point.close / start.close - 1;
      const marketReturn = point.ihsg / start.ihsg - 1;
      return Math.abs(stockReturn - beta * marketReturn);
    }),
    dates: future.map((point) => point.date),
  };
}

/**
 * Nilai satu klaim terhadap deret harga.
 *
 * `series` harus deret lengkap simbol itu (termasuk sesi sebelum issuedAt);
 * fungsi ini yang memotongnya. Memberi deret yang sudah dipotong di masa depan
 * akan menghasilkan baseline yang salah.
 */
export function resolvePrediction(claim: PredictionClaim, series: PricePoint[], beta = 1): PredictionOutcome {
  const computed = seriesValues(claim, series, beta);
  const [minSession, maxSession] = claim.windowSessions;
  if (!computed) {
    return {
      claimId: claim.id,
      verdict: "void",
      observedAtSession: null,
      observedValue: null,
      observedAtDate: null,
      sessionsAvailable: 0,
      note: "Baseline tidak cukup atau sebarannya nol — klaim tidak dapat dinilai, dan tidak dihitung sebagai meleset.",
    };
  }
  const { values, dates } = computed;
  const sessionsAvailable = values.length;
  // Sesi ke-n dihitung 1-based setelah issuedAt: values[0] adalah sesi ke-1.
  const foundIndex = values.findIndex((value) => value >= claim.threshold);
  const peak = values.length ? Math.max(...values) : null;

  if (foundIndex === -1) {
    if (sessionsAvailable < maxSession) {
      return {
        claimId: claim.id,
        verdict: "pending",
        observedAtSession: null,
        observedValue: peak,
        observedAtDate: null,
        sessionsAvailable,
        note: `Baru ${sessionsAvailable} sesi tersedia dari ${maxSession} yang dibutuhkan. Jendela yang belum penuh tidak dinilai.`,
      };
    }
    return {
      claimId: claim.id,
      verdict: "miss",
      observedAtSession: null,
      observedValue: peak,
      observedAtDate: null,
      sessionsAvailable,
      note: `Jendela ${minSession}-${maxSession} sesi lewat tanpa melampaui ambang ${claim.threshold}.`,
    };
  }

  const session = foundIndex + 1;
  const verdict: PredictionVerdict = session < Math.max(minSession, 1)
    ? "early"
    : session <= maxSession
      ? "hit"
      : "late";
  const note = verdict === "early"
    ? `Terpenuhi di sesi ke-${session}, sebelum jendela ${minSession}-${maxSession} dibuka — perkiraan jedanya terlalu lambat.`
    : verdict === "hit"
      ? `Terpenuhi di sesi ke-${session}, di dalam jendela ${minSession}-${maxSession}.`
      : `Terpenuhi di sesi ke-${session}, setelah jendela ${minSession}-${maxSession} tutup — perkiraan jendelanya terlalu pendek.`;
  return {
    claimId: claim.id,
    verdict,
    observedAtSession: session,
    observedValue: values[foundIndex],
    observedAtDate: dates[foundIndex],
    sessionsAvailable,
    note,
  };
}

export const PREDICTION_METRIC_LABELS: Record<PredictionMetric, string> = {
  volumeRobustZ: "Volume melampaui ambang tidak wajar",
  marketAdjustedMove: "Harga bergerak melebihi yang dijelaskan IHSG",
};

export const PREDICTION_VERDICT_LABELS: Record<PredictionVerdict, string> = {
  hit: "Tepat",
  early: "Lebih cepat",
  late: "Terlambat",
  miss: "Meleset",
  pending: "Menunggu",
  void: "Tidak dapat dinilai",
};
