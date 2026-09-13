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
    expect(body.event.impactLinks.length).toBeGreaterThan(0);
    expect(body.event.impactLinks.every((link: { symbol: string }) => (demoProfiles[0].watchlist as string[]).includes(link.symbol))).toBe(true);
  });

  it("refuses an advisory prompt without echoing its transaction term", async () => {
    const response = await chat(request("/api/chat", { question: "Apakah saya harus beli ANTM?", profile: demoProfiles[0] }));
    const body = await response.json();
    expect(body.answer.refused).toBe(true);
    expect(body.answer.text.toLowerCase()).not.toContain("beli");
  });
});
