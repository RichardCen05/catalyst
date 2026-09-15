import { describe, expect, it } from "vitest";
import {
  buildFieldPattern,
  compileListingPattern,
  escapeRegExp,
  MAX_PATTERN_LENGTH,
  SafePatternError,
  testWithBudget,
} from "@/lib/web-watch/safe-regex";
import { extractLinks } from "@/lib/web-watch/fetching";

describe("escapeRegExp", () => {
  it("escapes every metacharacter so the value matches literally", () => {
    const raw = `.*+?^\${}()|[]\\`;
    const re = new RegExp(escapeRegExp(raw));
    expect(re.test(raw)).toBe(true);
    expect(re.test("xxxxxxxxxxxx")).toBe(false);
  });
});

describe("compileListingPattern", () => {
  it("keeps regex semantics for operator seed patterns", () => {
    const re = compileListingPattern("/siaran-pers/Pages/[^\"']+\\.aspx");
    expect(re.test("https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/RDKB-Agustus-2026.aspx")).toBe(
      true,
    );
    expect(re.test("https://www.ojk.go.id/id/tentang")).toBe(false);
  });

  it("rejects nested-quantifier (ReDoS-shape) patterns", () => {
    expect(() => compileListingPattern("(a+)+$")).toThrow(SafePatternError);
    expect(() => compileListingPattern("([a-z]*)*")).toThrow(SafePatternError);
    expect(() => compileListingPattern("(\\d+)+")).toThrow(SafePatternError);
  });

  it("rejects over-long patterns", () => {
    expect(() => compileListingPattern("a".repeat(MAX_PATTERN_LENGTH + 1))).toThrow(SafePatternError);
  });

  it("rejects patterns that do not compile", () => {
    expect(() => compileListingPattern("(unclosed")).toThrow(SafePatternError);
  });

  it("compiles the empty default (matches everything, like before)", () => {
    expect(compileListingPattern("").test("https://anything.example/")).toBe(true);
  });
});

describe("testWithBudget", () => {
  it("matches normal inputs and skips over-long ones", () => {
    const re = compileListingPattern("example");
    expect(testWithBudget(re, "https://example.id/a")).toBe(true);
    expect(testWithBudget(re, `https://example.id/${"a".repeat(3000)}`)).toBe(false);
  });
});

describe("buildFieldPattern", () => {
  it("builds the tag pattern for known field names", () => {
    expect("<title>Halo</title>".match(buildFieldPattern("title"))?.[1]).toBe("Halo");
  });

  it("refuses unsafe names instead of interpolating them", () => {
    expect(() => buildFieldPattern("title)(.*")).toThrow(SafePatternError);
    expect(() => buildFieldPattern("")).toThrow(SafePatternError);
  });
});

describe("extractLinks hardening", () => {
  const markup = `<a href="/id/berita-dan-kegiatan/siaran-pers/Pages/RDKB-Agustus-2026.aspx">RDKB</a>`;

  it("surfaces a bad operator pattern as permanent FetchError, not a throw", () => {
    expect(() =>
      extractLinks(markup, "https://www.ojk.go.id/", "(a+)+$"),
    ).toThrowError(/Pola tautan tidak bisa dipakai/);
  });

  it("still filters, dedupes, and defragments with a good pattern", () => {
    const links = extractLinks(
      `${markup}<a href="/id/tentang">nav</a>`,
      "https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/",
      "/siaran-pers/Pages/[^\"']+\\.aspx",
    );
    expect(links.map((l) => l.link)).toEqual([
      "https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/RDKB-Agustus-2026.aspx",
    ]);
  });
});
