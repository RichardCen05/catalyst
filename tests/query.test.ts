import { describe, expect, it } from "vitest";
import { findSymbolsRobust, matchEventForQuestion, normalizeQuery } from "@/lib/agent/query";
import type { MarketEvent } from "@/lib/types";

const symbols = ["ANTM", "INCO", "BBCA"] as const;

const events: MarketEvent[] = [
  {
    id: "e-nickel",
    title: "Harga nikel menguat tajam",
    summary: "Harga acuan nikel naik dan menopang emiten tambang",
    body: null,
    category: "commodity",
    sourceType: "commodity",
    publishedAt: "2026-09-10T00:00:00+07:00",
    asOf: "2026-09-11T16:15:00+07:00",
    sector: "Basic Materials",
    impactLinks: [],
    citations: [],
  },
  {
    id: "e-rate",
    title: "Bank Indonesia menahan suku bunga",
    summary: "RDG memutuskan BI-Rate tetap",
    body: null,
    category: "rates",
    sourceType: "sectors",
    publishedAt: "2026-09-09T00:00:00+07:00",
    asOf: "2026-09-11T16:15:00+07:00",
    sector: "Market",
    impactLinks: [],
    citations: [],
  },
];

describe("query matching", () => {
  it("matches symbols by alias and full name", () => {
    expect(findSymbolsRobust("Bagaimana Aneka Tambang hari ini?", [...symbols])).toEqual(["ANTM"]);
    expect(findSymbolsRobust("bandingkan VALE vs antm", [...symbols])).toEqual(["ANTM", "INCO"]);
    expect(findSymbolsRobust("cuaca cerah sekali", [...symbols])).toEqual([]);
  });

  it("does not fire on substrings inside unrelated words", () => {
    expect(findSymbolsRobust("belum ada kabar", [...symbols])).toEqual([]);
  });

  it("routes commodity questions to the commodity event", () => {
    expect(matchEventForQuestion("bagaimana harga nikel minggu ini?", events)?.id).toBe("e-nickel");
  });

  it("returns undefined when nothing overlaps", () => {
    expect(matchEventForQuestion("siapa presiden klub bola?", events)).toBeUndefined();
  });

  it("normalizes punctuation", () => {
    expect(normalizeQuery("Bandingkan ANTM & INCO!")).toBe("bandingkan antm inco");
  });
});
