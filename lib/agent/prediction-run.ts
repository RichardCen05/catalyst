import { analysisFixtures, events } from "@/lib/data/fixtures";
import { deriveClaims, resolvePrediction, type PredictionClaim, type PredictionOutcome } from "@/lib/agent/prediction";
import { buildCalibration, type CalibrationReport } from "@/lib/agent/calibration";
import type { InvestorResearchPlaybook, MarketEvent, SymbolCode } from "@/lib/types";

/**
 * Menjalankan Lapis 3 secara retrospektif atas rekaman yang sudah ada.
 *
 * Kenapa retrospektif. Bundle rekaman berhenti di satu tanggal dan hanya
 * bergerak saat scripts/build_market_data.py dijalankan ulang. Mode prospektif
 * (mencatat klaim hari ini, menilainya minggu depan) berarti nol klaim
 * tervonis sampai bundle berikutnya — loop belajarnya tidak pernah terlihat.
 * Retrospektif memakai peristiwa yang tanggalnya ada di tengah deret, lalu
 * menilainya dengan sesi yang sudah terekam setelahnya. Penilainya sama
 * persis; yang berbeda hanya dari mana "masa depan" itu diambil.
 *
 * Kejujuran waktu dijaga di resolvePrediction: baseline hanya memakai sesi
 * sampai issuedAt. Satu sesi masa depan yang bocor ke baseline membuat seluruh
 * hit-rate ini fiksi, jadi lihat tests/prediction.test.ts sebelum mengubah
 * potongan deret di sana.
 */

export interface PredictionRun {
  claims: PredictionClaim[];
  outcomes: PredictionOutcome[];
  report: CalibrationReport;
}

/** Pemicu utama per simbol, meniru urutan yang dipakai engine (relevansi, lalu terbaru). */
function primaryEventIdFor(symbol: SymbolCode, related: MarketEvent[]): string | undefined {
  return [...related].sort((a, b) => {
    const ra = a.impactLinks.find((link) => link.symbol === symbol)?.relevance ?? 0;
    const rb = b.impactLinks.find((link) => link.symbol === symbol)?.relevance ?? 0;
    return rb - ra || b.publishedAt.localeCompare(a.publishedAt);
  })[0]?.id;
}

export interface PredictionRunOptions {
  playbook?: InvestorResearchPlaybook | null;
  /** Batasi ke simbol tertentu; kosong berarti seluruh rekaman. */
  symbols?: SymbolCode[];
  now?: string;
}

export function runPredictionBacktest(options: PredictionRunOptions = {}): PredictionRun {
  const claims: PredictionClaim[] = [];
  const outcomes: PredictionOutcome[] = [];
  const wanted = options.symbols?.length ? new Set(options.symbols) : null;

  for (const [symbol, fixture] of Object.entries(analysisFixtures)) {
    if (wanted && !wanted.has(symbol as SymbolCode)) continue;
    const series = fixture.priceSeries;
    if (!series?.length) continue;

    // Semua peristiwa yang menyentuh simbol ini — bukan hanya yang menang
    // seleksi. Klaim untuk yang kalah ditandai shadow supaya base rate tidak
    // hanya dihitung dari berita yang sudah terlanjur dianggap penting.
    const related = events.filter((event) => event.impactLinks.some((link) => link.symbol === symbol));
    if (!related.length) continue;
    const primaryId = primaryEventIdFor(symbol as SymbolCode, related.filter((event) => fixture.catalystEventIds.includes(event.id)));

    for (const event of related) {
      const derived = deriveClaims({
        symbol: symbol as SymbolCode,
        event,
        series,
        beta: fixture.beta,
        shadow: event.id !== primaryId,
        playbook: options.playbook,
        now: options.now,
      });
      for (const claim of derived) {
        claims.push(claim);
        outcomes.push(resolvePrediction(claim, series, fixture.beta));
      }
    }
  }

  return { claims, outcomes, report: buildCalibration(claims, outcomes) };
}
