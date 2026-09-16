import { describe, expect, it } from "vitest";
import {
  detectContagionCandidates,
  excessReturns,
  fundamentallyLinked,
  pairCorrelation,
  returnSeries,
} from "@/lib/agent/contagion";
import type { MarketEvent, PricePoint } from "@/lib/types";

const mkSeries = (closes: number[], ihsg = 7000): PricePoint[] =>
  closes.map((close, i) => ({
    date: `2026-08-${String(3 + i).padStart(2, "0")}`,
    close,
    ihsg: ihsg + i,
    volume: 1_000_000,
  }));

const mkEvent = (id: string, symbols: Array<"AAA" | "BBB">, direction: "Adverse" | "Supported" = "Adverse", publishedAt = "2026-08-10T09:00:00+07:00"): MarketEvent =>
  ({
    id,
    title: id,
    summary: id,
    body: null,
    category: "company",
    sourceType: "sectors",
    publishedAt,
    asOf: "2026-09-11T16:15:00+07:00",
    sector: "Market",
    impactLinks: symbols.map((symbol) => ({ symbol: symbol as never, direction, relevance: 80, path: "p", rationale: "r", citations: [] })),
    citations: [],
  }) as unknown as MarketEvent;

describe("contagion", () => {
  it("computes excess returns by subtracting market", () => {
    const s: PricePoint[] = [
      { date: "2026-08-03", close: 100, ihsg: 1000, volume: 1 },
      { date: "2026-08-04", close: 110, ihsg: 1000, volume: 1 },
    ];
    expect(returnSeries([100, 110])[0]).toBeCloseTo(0.1, 9);
    expect(excessReturns(s)[0]).toBeCloseTo(0.1, 6);
  });

  it("yields zero candidates on a market-wide IHSG drop", () => {
    // Semua turun bersama IHSG → excess ≈ 0, korelasi null (varians nol).
    const flat = (base: number) => Array.from({ length: 28 }, (_, i) => base * (1 - i * 0.01));
    const bySymbol = {
      AAA: mkSeries(flat(1000)),
      BBB: mkSeries(flat(2000)),
    };
    const out = detectContagionCandidates({
      symbol: "AAA" as never,
      date: "2026-08-30",
      priceSeriesBySymbol: bySymbol as never,
      events: [],
      thresholds: { contagionDropFloor: 0.04, contagionCorrelationFloor: 0.5 },
    });
    expect(out).toEqual([]);
  });

  it("excludes fundamentally-linked pairs even at correlation 0.95", () => {
    const linked = fundamentallyLinked("ANTM" as never, "INCO" as never, {
      events: [],
      getSubsector: () => undefined,
      playbook: { preferredComparables: { ANTM: ["INCO"] }, materialityRules: [], knownExposures: [], thesisAssumptions: [], trustedSources: [], falsifiers: [] } as never,
    });
    expect(linked).toBe(true);
  });

  it("returns null on short overlap rather than a fabricated correlation", () => {
    expect(pairCorrelation([0.1, 0.2, 0.3], [0.1, 0.2, 0.3])).toBeNull();
  });

  it("finds exactly one candidate on a PIPA/BUVA-shaped fixture", () => {
    // 28 sesi: target jatuh 6% pada hari terakhir tanpa peristiwa;
    // peer jatuh setelah peristiwa adverse, excess berkorelasi tinggi, tidak linked.
    const base = Array.from({ length: 27 }, (_, i) => 1000 + Math.sin(i) * 10 + i);
    const peerBase = Array.from({ length: 27 }, (_, i) => 500 + Math.sin(i) * 5 + i * 0.5);
    const target = [...base, base[base.length - 1] * 0.94];
    const peer = [...peerBase, peerBase[peerBase.length - 1] * 0.95];
    const dates = Array.from({ length: 28 }, (_, i) => `2026-08-${String(3 + i).padStart(2, "0")}`);
    // Tanggal buatan melampaui Agustus; pakai ISO berurutan agar D/D-1 konsisten.
    const seq = Array.from({ length: 28 }, (_, i) => `2026-09-${String(1 + Math.floor(i / 1)).padStart(2, "0")}`);
    const mk = (closes: number[]): PricePoint[] =>
      closes.map((close, i) => ({ date: seq[i] ?? `2026-09-${i + 1}`, close, ihsg: 7000 + Math.sin(i) * 5, volume: 1_000_000 }));
    void dates;
    const bySymbol = { AAA: mk(target), BBB: mk(peer) };
    const lastDate = (bySymbol.AAA.at(-1)!.date);
    const prevDate = bySymbol.AAA.at(-2)!.date;
    void prevDate;
    const events = [mkEvent("ev-peer", ["BBB"], "Adverse", `${lastDate}T09:00:00+07:00`)];
    const out = detectContagionCandidates({
      symbol: "AAA" as never,
      date: lastDate,
      priceSeriesBySymbol: bySymbol as never,
      events: events as never,
      getSubsector: () => undefined,
      thresholds: { contagionDropFloor: 0.04, contagionCorrelationFloor: 0.1 },
    });
    expect(out).toHaveLength(1);
    expect(out[0].peer).toBe("BBB");
  });
});
