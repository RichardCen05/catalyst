import { describe, expect, it } from "vitest";
import { companies, priceSeries } from "@/lib/data/fixtures";
import {
  companyDisplayName,
  HYPOTHESES,
  relevanceHypothesis,
  renderHypotheses,
  SCREEN_CHECKS,
  SOURCE_LANGS,
} from "@/lib/web-watch/hypotheses";
import type { SymbolCode } from "@/lib/types";

describe("NLI hypothesis table", () => {
  it("has a sentence for every check in every source language", () => {
    for (const check of SCREEN_CHECKS) {
      for (const lang of SOURCE_LANGS) expect(HYPOTHESES[check][lang].trim(), `${check}/${lang}`).not.toBe("");
    }
  });

  it("keeps templates as templates: title is the headline, relevance names a company slot", () => {
    for (const lang of SOURCE_LANGS) {
      expect(HYPOTHESES.title[lang]).toBe("{title}");
      expect(HYPOTHESES.relevance[lang]).toContain("{company}");
    }
  });

  it("types no company name: every one comes from the registry", () => {
    const table = JSON.stringify(HYPOTHESES).toLowerCase();
    for (const company of companies) {
      const name = companyDisplayName(company.symbol);
      expect(name && table.includes(name.toLowerCase()), company.symbol).toBe(false);
    }
  });
});

describe("relevance hypotheses", () => {
  it("names each recorded symbol by its registry name, without the legal form", () => {
    for (const symbol of Object.keys(priceSeries) as SymbolCode[]) {
      const company = companies.find((c) => c.symbol === symbol);
      if (!company) continue;
      const name = companyDisplayName(symbol) as string;
      expect(company.name, symbol).toContain(name.split(" ")[0]);
      expect(name, symbol).not.toMatch(/\b(PT|Tbk)\b/);
      for (const lang of SOURCE_LANGS) expect(relevanceHypothesis(symbol, lang), `${symbol}/${lang}`).toContain(name);
    }
  });

  it("returns null for a symbol the registry does not know", () => {
    expect(relevanceHypothesis("ZZZZ" as SymbolCode, "id")).toBeNull();
  });
});

describe("renderHypotheses", () => {
  const [a, b] = companies.map((c) => c.symbol);

  it("renders the pair, the title and one relevance hypothesis per matched symbol", () => {
    const rendered = renderHypotheses({ title: " Judul berita ", titleIsUrl: false, symbols: [a, b], lang: "en" });
    expect(rendered.rumor).toBe(HYPOTHESES.rumor.en);
    expect(rendered.official).toBe(HYPOTHESES.official.en);
    expect(rendered.title).toBe("Judul berita");
    expect(rendered.relevance.map((r) => r.symbol)).toEqual([a, b]);
  });

  it("skips the title check when the headline was cut from the address", () => {
    expect(renderHypotheses({ title: "sp 2819226.aspx", titleIsUrl: true, symbols: [], lang: "id" }).title).toBeNull();
  });
});
