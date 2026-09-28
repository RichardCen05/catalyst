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
    // A volume spike recorded before the trigger contradicts the timing, so the case may not
    // call its evidence aligned; the causal map reads the same check.
    expect(body.analysis.evidenceState).toBe(body.analysis.timing?.deltaSessions < 0 ? "Mixed Evidence" : "Corroborated");
    expect(body.analysis.sources.length).toBeGreaterThan(0);
  });

  it("rejects an unrecorded ticker at the boundary instead of inventing an analysis", async () => {
    // 400, not 404: the ticker is not a missing page, it is an invalid field.
    // `symbolSchema` checks membership in the generated registry, so nothing
    // downstream ever builds `case:XXXX` and answers about another issuer.
    const response = await analyze(request("/api/analyze", { symbol: "XXXX", profile: demoProfiles[0] }));
    expect(response.status).toBe(400);
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

describe("analysis context wiring", () => {
  it("applies the caller playbook relevanceFloor through the API", async () => {
    const { POST } = await import("@/app/api/analyze/route");
    const base = { symbol: "ANTM", profile: demoProfiles[0] };
    const def = await (await POST(request("/api/analyze", base))).json();
    expect(def.analysis.priority.materiality).toBe("High");
    const strict = await (
      await POST(
        request("/api/analyze", {
          ...base,
          playbook: { preferredComparables: {}, materialityRules: [], knownExposures: [], thesisAssumptions: [], trustedSources: [], falsifiers: [], relevanceFloor: 97 },
        }),
      )
    ).json();
    expect(strict.analysis.priority.materiality).toBe("Medium");
  });
});
