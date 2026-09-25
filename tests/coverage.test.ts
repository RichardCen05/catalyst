import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { checkMovement, coverageRows } from "@/lib/agent/coverage";
import { DEFAULT_THRESHOLDS, resolveThresholds } from "@/lib/agent/thresholds";
import { companies, demoProfiles, priceSeries } from "@/lib/data/fixtures";

const thresholds = resolveThresholds();

describe("coverage tab", () => {
  it("lists every emiten in the registry exactly once", () => {
    const rows = coverageRows(demoProfiles[0].watchlist, thresholds);
    expect(rows.map((row) => row.symbol)).toEqual(companies.map((company) => company.symbol));
  });

  it("derives each status from the watchlist and the recordings, never a list", () => {
    const watchlist = demoProfiles[0].watchlist;
    for (const row of coverageRows(watchlist, thresholds)) {
      const company = companies.find((item) => item.symbol === row.symbol)!;
      const watched = watchlist.includes(row.symbol);
      const expected = company.analyzed ? (watched ? "case" : "recorded") : watched ? "partial" : "outside";
      expect(row.status, row.symbol).toBe(expected);
      // A complete recording has nothing missing; an incomplete one says what.
      expect(row.missing.length === 0, row.symbol).toBe(company.analyzed);
    }
  });

  it("holds the volume test to the same answer as the case pillar", async () => {
    for (const company of companies.filter((item) => item.analyzed)) {
      const analysis = await agentEngine.analyzeCompany(company.symbol, demoProfiles[0]);
      const pillar = analysis!.pillars.find((item) => item.key === "volume")!;
      const recorded = pillar.metrics.find((metric) => metric.label === "Skor z tahan pencilan")!.value;
      const movement = checkMovement(priceSeries[company.symbol] ?? [], thresholds);
      expect(movement.volumeZ === null ? "Belum tersedia" : new Intl.NumberFormat("id-ID", { minimumFractionDigits: 2, maximumFractionDigits: 2 }).format(movement.volumeZ), company.symbol).toBe(recorded);
      expect(movement.volumeCrossed, company.symbol).toBe(pillar.status === "Elevated" || pillar.status === "Extreme");
    }
  });

  it("flags a one-session drop at the playbook floor, and follows the floor when it moves", () => {
    for (const company of companies) {
      const series = priceSeries[company.symbol] ?? [];
      if (series.length < 2) continue;
      const change = series.at(-1)!.close / series.at(-2)!.close - 1;
      const movement = checkMovement(series, thresholds);
      expect(movement.dropCrossed, company.symbol).toBe(change <= -DEFAULT_THRESHOLDS.contagionDropFloor);
      // Raise the floor past this drop and the same session no longer crosses.
      const raised = resolveThresholds({ relevanceFloor: DEFAULT_THRESHOLDS.relevanceFloor, thresholds: { contagionDropFloor: Math.abs(change) + 0.01 } } as never);
      expect(checkMovement(series, raised).dropCrossed, company.symbol).toBe(false);
    }
  });

  it("only says 'quiet' when both tests ran and neither crossed", () => {
    for (const row of coverageRows([], thresholds)) {
      if (row.movement.status !== "quiet") continue;
      expect(row.movement.volumeZ, row.symbol).not.toBeNull();
      expect(row.movement.volumeCrossed || row.movement.dropCrossed, row.symbol).toBe(false);
    }
  });
});
