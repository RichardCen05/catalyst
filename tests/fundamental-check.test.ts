import { describe, expect, it } from "vitest";
import { checkNarrativeAgainstFinancials, directionOfFinancialTrend } from "@/lib/agent/fundamental-check";
import type { FinancialInput, MarketEvent } from "@/lib/types";

const finCite = [{ id: "financial-ANTM", provider: "Sectors rekaman", endpoint: "/v2/financials/quarterly/ANTM/", field: "period, revenue", asOf: "2026-09-11T16:15:00+07:00", label: "Konteks keuangan ANTM" }] as FinancialInput["citations"];
const evCite = [{ id: "news-e1", provider: "Sectors rekaman", endpoint: "/v2/news/", field: "title", asOf: "2026-09-11T16:15:00+07:00", label: "Berita" }] as MarketEvent["citations"];

const upRows: FinancialInput[] = [{
  label: "Revenue", value: "Rp33,4T", period: "2026-06-30", interpretation: "x", citations: finCite,
  valueNum: 33390942000000,
  history: [
    { period: "2025-09-30", value: 13008399000000 },
    { period: "2025-12-31", value: 12614315000000 },
    { period: "2026-03-31", value: 29323338000000 },
    { period: "2026-06-30", value: 33390942000000 },
  ],
}];

const downRows: FinancialInput[] = [{
  label: "Revenue", value: "Rp10T", period: "2026-06-30", interpretation: "x", citations: finCite,
  valueNum: 100,
  history: [
    { period: "2025-09-30", value: 400 },
    { period: "2025-12-31", value: 300 },
    { period: "2026-03-31", value: 200 },
    { period: "2026-06-30", value: 100 },
  ],
}];

const mkEvent = (direction: "Supported" | "Adverse"): MarketEvent => ({
  id: "e1",
  title: "Nikel menguat",
  summary: "s",
  body: null,
  category: "commodity",
  sourceType: "sectors",
  publishedAt: "2026-09-10T00:00:00+07:00",
  asOf: "2026-09-11T16:15:00+07:00",
  sector: "Basic Materials",
  impactLinks: [{ symbol: "ANTM", direction, relevance: 85, path: "p", rationale: "r", citations: evCite }],
  citations: evCite,
});

describe("fundamental-check", () => {
  it("agreeing pair yields nothing", () => {
    expect(directionOfFinancialTrend(upRows, "Revenue")).toBe("up");
    expect(checkNarrativeAgainstFinancials({ event: mkEvent("Supported"), symbol: "ANTM", financialContext: upRows })).toBeNull();
  });

  it("opposing pair yields one contradiction carrying both citations", () => {
    const out = checkNarrativeAgainstFinancials({ event: mkEvent("Supported"), symbol: "ANTM", financialContext: downRows });
    expect(out).not.toBeNull();
    expect(out?.text).toMatch(/Nikel menguat/);
    expect(out?.text).toMatch(/Revenue/);
    const ids = (out?.citations ?? []).map((c) => c.id);
    expect(ids).toContain("news-e1");
    expect(ids).toContain("financial-ANTM");
  });

  it("missing financial rows yield nothing and no throw", () => {
    expect(directionOfFinancialTrend([], "Revenue")).toBe("unknown");
    expect(checkNarrativeAgainstFinancials({ event: mkEvent("Supported"), symbol: "ANTM", financialContext: [] })).toBeNull();
  });
});
