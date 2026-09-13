import { describe, expect, it } from "vitest";
import { locate, snippet } from "@/lib/agent/citations";
import { events } from "@/lib/data/fixtures";

describe("locate", () => {
  const body = "Bank Mandiri issued a USD750 million perpetual bond on September 10, 2026, to strengthen capital.\nThe bond carries an initial distribution rate of 7.35% per year.";

  it("finds an exact match, whitespace aside", () => {
    const span = locate("doc-1", body, "issued a USD750 million perpetual bond on September 10, 2026");
    expect(span.match).toBe("exact");
    expect(body.slice(span.start, span.end).toLowerCase()).toContain("usd750 million");
  });

  it("tolerates line-wrapped whitespace as an exact match", () => {
    const claim = "capital.\nThe bond carries";
    const span = locate("doc-1", body, claim);
    expect(span.match).toBe("exact");
  });

  it("finds an approximate match for a lightly reworded claim", () => {
    const claim = "Bank Mandiri issued a US$750 million perpetual bond on September 10, 2026, to strengthen its capital";
    const span = locate("doc-1", body, claim);
    expect(span.match).toBe("approximate");
    expect(span.end).toBeGreaterThan(span.start);
  });

  it("returns not_found rather than pointing at the wrong sentence", () => {
    const span = locate("doc-1", body, "the company plans to acquire a competitor next quarter");
    expect(span).toEqual({ documentId: "doc-1", start: 0, end: 0, match: "not_found" });
  });

  it("returns not_found when there is no document body", () => {
    expect(locate("doc-1", null, "anything").match).toBe("not_found");
    expect(locate("doc-1", "", "anything").match).toBe("not_found");
  });

  it("returns not_found for an empty claim", () => {
    expect(locate("doc-1", body, "").match).toBe("not_found");
    expect(locate("doc-1", body, "   ").match).toBe("not_found");
  });
});

describe("locate against real recorded event bodies", () => {
  it("locates the summary inside the body for every event that carries one, or reports not_found honestly", () => {
    const withBody = events.filter((event) => event.body);
    expect(withBody.length).toBeGreaterThan(0);
    for (const event of withBody) {
      const span = locate(event.id, event.body, event.summary.replace(/…$/, ""));
      expect(["exact", "approximate", "not_found"]).toContain(span.match);
      if (span.match !== "not_found") expect(span.end).toBeGreaterThan(span.start);
    }
  });

  it("locates most summaries exactly, since they are literal truncations of the body", () => {
    const withBody = events.filter((event) => event.body);
    const exact = withBody.filter((event) => locate(event.id, event.body, event.summary.replace(/…$/, "")).match === "exact");
    expect(exact.length / withBody.length).toBeGreaterThan(0.8);
  });
});

describe("snippet", () => {
  const body = "x".repeat(300) + "TARGET" + "y".repeat(300);

  it("returns empty string for not_found", () => {
    expect(snippet(body, { documentId: "d", start: 0, end: 0, match: "not_found" })).toBe("");
  });

  it("includes surrounding context and ellipses when truncated on both sides", () => {
    const start = body.indexOf("TARGET");
    const end = start + "TARGET".length;
    const result = snippet(body, { documentId: "d", start, end, match: "exact" }, 20);
    expect(result.startsWith("… ")).toBe(true);
    expect(result.endsWith(" …")).toBe(true);
    expect(result).toContain("TARGET");
  });
});
