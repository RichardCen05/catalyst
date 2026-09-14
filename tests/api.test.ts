import { describe, expect, it } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { POST as chat } from "@/app/api/chat/route";
import { POST as impact } from "@/app/api/impact/route";
import { demoProfiles, events } from "@/lib/data/fixtures";

const request = (path: string, body: unknown) => new Request(`http://localhost${path}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

describe("public route handlers", () => {
  it("returns a cited analysis for a supported symbol", async () => {
    const response = await analyze(request("/api/analyze", { symbol: "ANTM", profile: demoProfiles[0] }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.analysis.evidenceState).toBe("Corroborated");
    expect(body.analysis.sources.length).toBeGreaterThan(0);
  });

  it("returns 404 instead of inventing an unknown analysis", async () => {
    const response = await analyze(request("/api/analyze", { symbol: "XXXX", profile: demoProfiles[0] }));
    expect(response.status).toBe(404);
  });

  it("filters impact links at the API boundary", async () => {
    const watched = events.find((item) => item.impactLinks.some((link) => demoProfiles[0].watchlist.includes(link.symbol)))!;
    const response = await impact(request("/api/impact", { eventId: watched.id, profile: demoProfiles[0], scope: "watchlist" }));
    const body = await response.json();
    expect(response.status).toBe(200);
    const expected = watched.impactLinks
      .filter((link) => demoProfiles[0].watchlist.includes(link.symbol))
      .sort((a, b) => b.relevance - a.relevance)
      .map((link) => link.symbol);
    expect(body.event.impactLinks.map((link: { symbol: string }) => link.symbol)).toEqual(expected);
  });

  it("refuses an advisory prompt without echoing its transaction term", async () => {
    const response = await chat(request("/api/chat", { question: "Apakah saya harus beli ANTM?", profile: demoProfiles[0] }));
    const body = await response.json();
    expect(body.answer.refused).toBe(true);
    expect(body.answer.text.toLowerCase()).not.toContain("beli");
  });
});

describe("sectors refresh guard", () => {
  it("refuses refresh while the flag is off and never spends", async () => {
    const { POST } = await import("@/app/api/internal/refresh-sectors/route");
    const response = await POST(request("/api/internal/refresh-sectors", { symbols: ["ANTM"], dryRun: false }));
    expect(response.status).toBe(403);
    expect((await response.json()).error).toBe("refresh-disabled");
  });

  it("dry-run plans only recorded symbols with zero spend", async () => {
    process.env.SECTORS_REFRESH_ENABLED = "true";
    try {
      const { POST } = await import("@/app/api/internal/refresh-sectors/route");
      const response = await POST(request("/api/internal/refresh-sectors", { symbols: ["ANTM", "XXXX"], dryRun: true }));
      const body = await response.json();
      expect(response.status).toBe(200);
      expect(body.dryRun).toBe(true);
      expect(body.plans.map((p: { symbol: string }) => p.symbol)).toEqual(["ANTM"]);
      expect(body.rejected).toEqual(["XXXX"]);
    } finally {
      delete process.env.SECTORS_REFRESH_ENABLED;
    }
  });
});
