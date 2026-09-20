import { describe, expect, it } from "vitest";
import {
  deriveClaims,
  heuristicWindowFor,
  resolvePrediction,
  type PredictionClaim,
} from "@/lib/agent/prediction";
import { buildCalibration, MIN_SAMPLE, relevanceBand, suggestLagWindows } from "@/lib/agent/calibration";
import { runPredictionBacktest } from "@/lib/agent/prediction-run";
import type { MarketEvent, PricePoint } from "@/lib/types";

const DATES = [
  "2026-08-03", "2026-08-04", "2026-08-05", "2026-08-06", "2026-08-07",
  "2026-08-10", "2026-08-11", "2026-08-12", "2026-08-13", "2026-08-14",
  "2026-08-17", "2026-08-18", "2026-08-19", "2026-08-20", "2026-08-21",
  "2026-08-24", "2026-08-25", "2026-08-26", "2026-08-27", "2026-08-28",
];

/**
 * Quiet baseline with a little jitter. A perfectly flat volume series has a
 * MAD of zero, which the resolver correctly refuses to score — so a test
 * fixture must breathe, or every verdict comes back `void`.
 */
function flatSeries(count: number, options: Partial<PricePoint> = {}): PricePoint[] {
  return DATES.slice(0, count).map((date, index) => ({
    date,
    close: options.close ?? 1_000,
    ihsg: options.ihsg ?? 7_000,
    // Alternating two values still yields a MAD of zero, so the spread has
    // to be genuinely uneven: 95..105, deterministic, median 100, MAD 3.
    volume: options.volume ?? 95 + ((index * 7) % 11),
  }));
}

function event(overrides: Partial<MarketEvent> = {}): MarketEvent {
  return {
    id: "event-1",
    title: "Kontrak pasokan baru",
    summary: "Ringkasan",
    body: null,
    category: "company",
    sourceType: "filing",
    publishedAt: "2026-08-13T09:00:00+07:00",
    asOf: "2026-08-13T09:00:00+07:00",
    sector: "Bahan dasar",
    impactLinks: [{ symbol: "ANTM", direction: "Positive", relevance: 95, path: "kontrak → volume", rationale: "uji" }],
    citations: [],
    ...overrides,
  } as MarketEvent;
}

function claimFor(overrides: Partial<PredictionClaim> = {}): PredictionClaim {
  return {
    id: "claim-1",
    symbol: "ANTM",
    issuedAt: "2026-08-13",
    eventId: "event-1",
    eventCategory: "company",
    eventSourceType: "filing",
    relevanceAtIssue: 95,
    shadow: false,
    metric: "volumeRobustZ",
    threshold: 2.5,
    windowSessions: [0, 3],
    createdAt: "2026-09-20T00:00:00.000Z",
    ...overrides,
  };
}

describe("prediction claims", () => {
  it("issues a claim at the last session on or before the event date", () => {
    const claims = deriveClaims({
      symbol: "ANTM",
      event: event({ publishedAt: "2026-08-15T09:00:00+07:00" }),
      series: flatSeries(20),
      beta: 1,
      shadow: false,
      now: "2026-09-20T00:00:00.000Z",
    });
    // 2026-08-15 is a Saturday in the fixture calendar; the last traded
    // session at or before it is 2026-08-14.
    expect(claims).toHaveLength(2);
    expect(claims.every((claim) => claim.issuedAt === "2026-08-14")).toBe(true);
  });

  it("emits one claim per checkable metric and freezes the thresholds in force", () => {
    const claims = deriveClaims({
      symbol: "ANTM",
      event: event(),
      series: flatSeries(20),
      beta: 1,
      shadow: true,
      playbook: {
        preferredComparables: {}, materialityRules: [], knownExposures: [],
        thesisAssumptions: [], trustedSources: [], falsifiers: [],
        thresholds: { volumeZFloor: 4, momentumIdiosyncraticFloor: 0.09 },
      },
      now: "2026-09-20T00:00:00.000Z",
    });
    expect(claims.map((claim) => claim.metric)).toEqual(["volumeRobustZ", "marketAdjustedMove"]);
    expect(claims[0].threshold).toBe(4);
    expect(claims[1].threshold).toBe(0.09);
    expect(claims.every((claim) => claim.shadow)).toBe(true);
  });

  it("emits nothing when the symbol is not linked to the event", () => {
    expect(deriveClaims({
      symbol: "BBCA", event: event(), series: flatSeries(20), beta: 1, shadow: false,
    })).toEqual([]);
  });

  it("reuses the lag heuristics the app actually applies", () => {
    expect(heuristicWindowFor("company")).toEqual([0, 3]);
    expect(heuristicWindowFor("rates")).toEqual([5, 20]);
    expect(heuristicWindowFor("commodity")).toEqual([1, 10]);
  });
});

describe("prediction resolution", () => {
  it("calls a hit when the threshold is crossed inside the window", () => {
    const series = flatSeries(16);
    series[11] = { ...series[11], volume: 100_000 }; // session 3 after 2026-08-13
    const outcome = resolvePrediction(claimFor(), series);
    expect(outcome.verdict).toBe("hit");
    expect(outcome.observedAtSession).toBe(3);
    expect(outcome.observedAtDate).toBe("2026-08-18");
  });

  it("calls a late when the threshold is crossed after the window closes", () => {
    const series = flatSeries(16);
    series[14] = { ...series[14], volume: 100_000 }; // session 6, window is 0-3
    const outcome = resolvePrediction(claimFor(), series);
    expect(outcome.verdict).toBe("late");
    expect(outcome.observedAtSession).toBe(6);
  });

  it("calls an early when the window opens later than the move", () => {
    const series = flatSeries(20);
    series[11] = { ...series[11], volume: 100_000 }; // session 3, window opens at 5
    const outcome = resolvePrediction(claimFor({ eventCategory: "rates", windowSessions: [5, 20] }), series);
    expect(outcome.verdict).toBe("early");
  });

  it("calls a miss only once the full window has elapsed", () => {
    const series = flatSeries(16);
    const outcome = resolvePrediction(claimFor(), series);
    expect(outcome.verdict).toBe("miss");
    expect(outcome.observedAtSession).toBeNull();
  });

  it("stays pending while the window is still open", () => {
    const series = flatSeries(11); // only 2 sessions after 2026-08-13, window needs 3
    const outcome = resolvePrediction(claimFor(), series);
    expect(outcome.verdict).toBe("pending");
    expect(outcome.sessionsAvailable).toBe(2);
  });

  it("voids instead of missing when the baseline cannot support a verdict", () => {
    const outcome = resolvePrediction(claimFor({ issuedAt: "2026-08-04" }), flatSeries(16));
    expect(outcome.verdict).toBe("void");
  });

  it("scores the market-adjusted move against beta, not raw return", () => {
    const series = flatSeries(16);
    // Market and stock both up 10%: entirely explained by the index at beta 1.
    for (let index = 11; index < 16; index += 1) {
      series[index] = { ...series[index], close: 1_100, ihsg: 7_700 };
    }
    const claim = claimFor({ metric: "marketAdjustedMove", threshold: 0.03 });
    expect(resolvePrediction(claim, series, 1).verdict).toBe("miss");
    // Same price path, but the stock barely tracks the index: now it is the
    // stock's own move, and it counts.
    expect(resolvePrediction(claim, series, 0.1).verdict).toBe("hit");
  });
});

describe("no look-ahead", () => {
  it("computes identical values whatever arrives after the sessions being scored", () => {
    const short = flatSeries(16);
    short[11] = { ...short[11], volume: 400 };
    const long = flatSeries(20).map((point, index) => (index === 11 ? { ...point, volume: 400 } : point));
    // A volume explosion far in the future must not move the baseline median
    // or MAD, which are drawn only from sessions up to issuedAt.
    long[18] = { ...long[18], volume: 5_000_000 };

    const claim = claimFor({ threshold: 2.5 });
    const shortOutcome = resolvePrediction(claim, short);
    const longOutcome = resolvePrediction(claim, long);
    expect(longOutcome.observedAtSession).toBe(shortOutcome.observedAtSession);
    expect(longOutcome.observedValue).toBe(shortOutcome.observedValue);
  });

  it("never reads a session later than issuedAt into the baseline", () => {
    const series = flatSeries(16);
    // Make every post-issue session enormous. If they leaked into the
    // baseline, the median would rise and the spike would stop registering.
    for (let index = 9; index < 16; index += 1) {
      series[index] = { ...series[index], volume: 10_000 };
    }
    const outcome = resolvePrediction(claimFor(), series);
    expect(outcome.verdict).toBe("hit");
    expect(outcome.observedAtSession).toBe(1);
  });
});

describe("calibration", () => {
  const claims = Array.from({ length: MIN_SAMPLE }, (_, index) => claimFor({ id: `claim-${index}` }));
  const outcomes = claims.map((claim, index) => ({
    claimId: claim.id,
    verdict: index < 12 ? ("hit" as const) : ("miss" as const),
    observedAtSession: index < 12 ? 2 : null,
    observedValue: index < 12 ? 3 : null,
    observedAtDate: index < 12 ? "2026-08-18" : null,
    sessionsAvailable: 5,
    note: "uji",
  }));

  it("reports a hit rate once the bucket is large enough", () => {
    const report = buildCalibration(claims, outcomes);
    const bucket = report.buckets.find((item) => item.dimension === "eventCategory" && item.key === "company")!;
    expect(bucket.n).toBe(MIN_SAMPLE);
    expect(bucket.sufficient).toBe(true);
    expect(bucket.hitRate).toBeCloseTo(0.6, 5);
  });

  it("marks a thin bucket as insufficient instead of quoting its rate as knowledge", () => {
    const report = buildCalibration(claims.slice(0, 3), outcomes.slice(0, 3));
    const bucket = report.buckets.find((item) => item.dimension === "eventCategory")!;
    expect(bucket.sufficient).toBe(false);
    expect(report.summary.sufficientBuckets).toBe(0);
  });

  it("excludes pending and void claims from the graded count", () => {
    const extra = [...claims, claimFor({ id: "claim-pending" }), claimFor({ id: "claim-void" })];
    const extraOutcomes = [
      ...outcomes,
      { claimId: "claim-pending", verdict: "pending" as const, observedAtSession: null, observedValue: null, observedAtDate: null, sessionsAvailable: 1, note: "" },
      { claimId: "claim-void", verdict: "void" as const, observedAtSession: null, observedValue: null, observedAtDate: null, sessionsAvailable: 0, note: "" },
    ];
    const report = buildCalibration(extra, extraOutcomes);
    expect(report.summary.graded).toBe(MIN_SAMPLE);
    expect(report.summary.pending).toBe(1);
    expect(report.summary.void).toBe(1);
  });

  it("suggests a lag window only from claims that actually came true", () => {
    // 12 of the 20 outcomes carry a lag, which is below MIN_SAMPLE: a window
    // is estimated from occurrences, not from bucket size, so a bucket that
    // is large enough to quote a hit rate can still be too thin to retime.
    expect(suggestLagWindows(claims, outcomes)).toEqual([]);

    const allHit = claims.map((claim, index) => ({
      claimId: claim.id,
      verdict: "late" as const,
      observedAtSession: 6 + (index % 3),
      observedValue: 4,
      observedAtDate: "2026-08-24",
      sessionsAvailable: 9,
      note: "uji",
    }));
    const suggestion = suggestLagWindows(claims, allHit)[0];
    expect(suggestion?.category).toBe("company");
    expect(suggestion?.n).toBe(MIN_SAMPLE);
    // Heuristic says 0-3 sessions; every observation landed at 6 or later.
    expect(suggestion?.current).toEqual([0, 3]);
    expect(suggestion?.suggested[1]).toBeGreaterThan(3);
  });

  it("bands relevance on the same cut points the reviewer scores use", () => {
    expect(relevanceBand(95)).toBe("high");
    expect(relevanceBand(85)).toBe("high");
    expect(relevanceBand(70)).toBe("medium");
    expect(relevanceBand(55)).toBe("low");
  });
});

describe("backtest over the recorded bundle", () => {
  const run = runPredictionBacktest({ now: "2026-09-20T00:00:00.000Z" });

  it("emits a claim pair per linked event and scores every one of them", () => {
    expect(run.claims.length).toBeGreaterThan(0);
    expect(run.outcomes).toHaveLength(run.claims.length);
    expect(run.claims.length % 2).toBe(0);
  });

  it("marks events that lost trigger selection as shadow claims", () => {
    expect(run.claims.some((claim) => claim.shadow)).toBe(true);
    expect(run.claims.some((claim) => !claim.shadow)).toBe(true);
  });

  it("never reports a verdict for a window the recording cannot close", () => {
    const pendingIds = new Set(run.outcomes.filter((outcome) => outcome.verdict === "pending").map((o) => o.claimId));
    for (const claim of run.claims.filter((item) => pendingIds.has(item.id))) {
      const outcome = run.outcomes.find((item) => item.claimId === claim.id)!;
      expect(outcome.sessionsAvailable).toBeLessThan(claim.windowSessions[1]);
    }
  });
});
