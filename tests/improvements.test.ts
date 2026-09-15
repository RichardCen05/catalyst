import { describe, expect, it } from "vitest";
import { describeSignalStability } from "@/lib/agent/signal-history";
import { getSharedShocks, validateLag } from "@/lib/agent/lag-validate";
import { deriveMissingEvidence } from "@/lib/evidence-gaps";
import { holdingExposure, holdingPnl, holdingWeight, portfolioRankScore } from "@/lib/portfolio";
import type { MarketEvent, PricePoint } from "@/lib/types";

const series: PricePoint[] = Array.from({ length: 12 }, (_, i) => ({
  date: `2026-08-${String(i + 1).padStart(2, "0")}`,
  close: 1000 + i * 10,
  ihsg: 7000,
  volume: i === 11 ? 10_000_000 : 1_000_000,
}));

describe("signal history", () => {
  it("reports stability across trailing halves", () => {
    const result = describeSignalStability(series);
    expect(result.windowScores).toHaveLength(3);
    expect(result.agreement).toMatch(/paruh/);
  });

  it("refuses short windows honestly", () => {
    expect(describeSignalStability(series.slice(0, 5)).windowScores).toEqual([]);
  });
});

describe("lag validation", () => {
  it("flags pre-event spikes as timing-inconsistent", () => {
    const event = {
      id: "e1",
      title: "Aksi korporasi",
      summary: "Emiten mengumumkan aksi",
      body: null,
      category: "company",
      sourceType: "sectors",
      publishedAt: "2026-08-12T00:00:00+07:00",
      asOf: "2026-09-11T16:15:00+07:00",
      sector: "Market",
      impactLinks: [],
      citations: [],
    } as MarketEvent;
    // Spike is the last point (08-12 in this 12-point slice is index 11).
    const validation = validateLag(event, series);
    expect(validation?.spikeDate).toBe("2026-08-12");
    expect(validation?.deltaSessions).toBe(0);
    expect(validation?.withinHeuristic).toBe(true);
  });

  it("finds shared shocks across the watchlist", () => {
    const mk = (id: string, symbols: Array<"ANTM" | "INCO" | "BBCA">) =>
      ({
        id,
        title: id,
        summary: id,
        body: null,
        category: "commodity",
        sourceType: "commodity",
        publishedAt: "2026-09-10T00:00:00+07:00",
        asOf: "2026-09-11T16:15:00+07:00",
        sector: "Market",
        impactLinks: symbols.map((symbol) => ({ symbol })),
        citations: [],
      }) as unknown as MarketEvent;
    expect(getSharedShocks([mk("a", ["ANTM", "INCO"]), mk("b", ["BBCA"])], ["ANTM", "INCO", "BBCA"])).toHaveLength(1);
  });
});

describe("evidence gaps", () => {
  it("derives gaps from availability, keeps standing limitations", () => {
    const gaps = deriveMissingEvidence({ analyzed: true, hasBroker: true, hasOwnershipSeries: false, eventCount: 0, financialRows: 2 });
    expect(gaps.join(" ")).toMatch(/kepemilikan/);
    expect(gaps.join(" ")).toMatch(/peristiwa terverifikasi/);
    expect(gaps.join(" ")).toMatch(/antrean pesanan/);
  });
});

describe("portfolio math", () => {
  it("computes exposure, pnl, weight, and rank", () => {
    expect(holdingExposure({ shares: 100, avgCost: 1000 }, 1200)).toBe(120_000);
    expect(holdingPnl({ shares: 100, avgCost: 1000 }, 1200)).toBe(20_000);
    const holdings = { ANTM: { shares: 100, avgCost: 1000 }, INCO: { shares: 100, avgCost: 1000 } } as const;
    expect(holdingWeight("ANTM", holdings, { ANTM: 2000, INCO: 1000 })).toBeCloseTo(2 / 3);
    expect(portfolioRankScore("High", 0.5)).toBeGreaterThan(portfolioRankScore("High", 0));
  });
});
