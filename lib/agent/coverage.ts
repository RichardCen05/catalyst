import { companies, coverageInfo, priceSeries } from "@/lib/data/fixtures";
import { calculateVolumeSignal } from "@/lib/agent/metrics";
import type { ResolvedThresholds } from "@/lib/agent/thresholds";
import type { PricePoint, SymbolCode } from "@/lib/types";

/**
 * Where one emiten stands against the reader's list and the recordings.
 *
 * - `case`: on the watchlist and fully recorded, so `/cases` lists it.
 * - `recorded`: fully recorded but off the watchlist; adding it opens a case.
 * - `partial`: on the watchlist, but a recording a case needs is missing.
 * - `outside`: neither on the watchlist nor fully recorded.
 */
export type CoverageStatus = "case" | "recorded" | "partial" | "outside";

export const COVERAGE_ORDER: CoverageStatus[] = ["case", "recorded", "partial", "outside"];

export interface MovementCheck {
  /** `insufficient` when the series is too short or too flat to test. */
  status: "crossed" | "quiet" | "insufficient";
  /** Robust z of the last session's volume against the sessions before it. */
  volumeZ: number | null;
  volumeCrossed: boolean;
  /** Last session's close against the one before, as a fraction. */
  lastSessionChange: number | null;
  dropCrossed: boolean;
  /** The session the test was run on. */
  date: string | null;
}

/**
 * The two market tests a price series alone can answer, run with the same
 * floors the case pillars use: did the last session's volume leave its
 * baseline (`volumeZFloor`), and did the last session's close fall by at least
 * `contagionDropFloor`. Nothing here needs broker or financial recordings, so
 * the test also runs for an emiten that cannot open a case — which is the
 * only way to say "checked, and nothing crossed" rather than "not shown".
 *
 * The volume arithmetic mirrors `buildAnalysisUncached` in
 * `lib/agent/engine.ts` line for line; `tests/coverage.test.ts` holds the two
 * to the same answer for every analysed emiten.
 */
export function checkMovement(series: PricePoint[], thresholds: ResolvedThresholds): MovementCheck {
  const current = series.at(-1);
  const previous = series.at(-2);
  if (!current || !previous) {
    return { status: "insufficient", volumeZ: null, volumeCrossed: false, lastSessionChange: null, dropCrossed: false, date: current?.date ?? null };
  }
  const baseline = series.slice(0, -1).map((point) => point.volume);
  const medianDailyValue = baseline[Math.floor(baseline.length / 2)] * current.close;
  const volume = calculateVolumeSignal(baseline, current.volume, medianDailyValue / 1e9, {
    elevated: thresholds.volumeZFloor,
    extreme: thresholds.volumeExtremeFloor,
  });
  const lastSessionChange = current.close / previous.close - 1;
  const volumeCrossed = volume.status === "Elevated" || volume.status === "Extreme";
  const dropCrossed = lastSessionChange <= -Math.abs(thresholds.contagionDropFloor);
  const status = volumeCrossed || dropCrossed ? "crossed" : volume.status === "Insufficient Data" ? "insufficient" : "quiet";
  return { status, volumeZ: volume.robustZ, volumeCrossed, lastSessionChange, dropCrossed, date: current.date };
}

export interface CoverageRow {
  symbol: SymbolCode;
  status: CoverageStatus;
  /** Recordings a case still needs, from `coverageInfo`. Empty when complete. */
  missing: string[];
  movement: MovementCheck;
}

/** Every emiten in the registry, in registry order, with its status and test. */
export function coverageRows(watchlist: SymbolCode[], thresholds: ResolvedThresholds): CoverageRow[] {
  return companies.map((company) => {
    const watched = watchlist.includes(company.symbol);
    const status: CoverageStatus = company.analyzed ? (watched ? "case" : "recorded") : watched ? "partial" : "outside";
    return {
      symbol: company.symbol,
      status,
      missing: company.analyzed ? [] : coverageInfo[company.symbol]?.missing ?? [],
      movement: checkMovement(priceSeries[company.symbol] ?? [], thresholds),
    };
  });
}
