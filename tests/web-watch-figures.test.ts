import { existsSync, readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { DATA_AS_OF, priceSeries } from "@/lib/data/fixtures";
import type { MarketEvent, PricePoint, SymbolCode } from "@/lib/types";
import { checkFigures, extractCloseFigures, IHSG, parseIdNumber } from "@/lib/web-watch/figures";

const golden = JSON.parse(readFileSync("tests/fixtures/web-watch-golden.json", "utf8")) as {
  figures: Array<{ id: string; expect: "contradicts" | "consistent" | "uncheckable"; claim?: { date: string }; claims?: Array<{ date: string }> }>;
};
const CACHE = "tests/fixtures/.cache";

function article(body: string, publishedAt = "2026-09-24T02:00:00.000Z", asOf = "2026-09-24T10:00:00.000Z"): MarketEvent {
  return { id: "web-x", title: "Judul", summary: "", body, category: "company", sourceType: "macro", publishedAt, asOf, sector: "Market", impactLinks: [], citations: [] };
}

// Everything below is built from the recordings, so a data refresh moves the
// fixtures with it: a symbol with at least two rows, its last row and the one before.
const symbol = (Object.keys(priceSeries) as SymbolCode[]).find((s) => (priceSeries[s]?.length ?? 0) >= 2)!;
const rows = priceSeries[symbol] as PricePoint[];
const last = rows[rows.length - 1];
const prev = rows[rows.length - 2];
const id = (n: number, digits = 0) => n.toLocaleString("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits });
const slash = (date: string) => { const [y, m, d] = date.split("-"); return `${Number(d)}/${Number(m)}/${y}`; };
const pct = (a: number, b: number) => Math.abs((a / b - 1) * 100);
const closeSentence = (target: string, level: number, move: number, date = last.date) =>
  `Saham ${target} ditutup melemah ${id(move, 2)}% ke level Rp ${id(level)} pada perdagangan (${slash(date)}).`;

describe("parseIdNumber", () => {
  it.each([
    ["6.277,04", 6277.04],
    ["6,429.88", 6429.88],
    ["7.583", 7583],
    ["1,69", 1.69],
    ["0,4", 0.4],
    ["0.95", 0.95],
    ["639234", 639234],
    ["1.234.567", 1234567],
    ["1,234,567.5", 1234567.5],
    ["0,950", 0.95],
  ])("%s → %s", (raw, value) => {
    expect(parseIdNumber(raw)).toBe(value);
  });

  it.each(["1.2.3", "12,34.5,6", "6.27.", "", "abc", "1.23,4.5"])("%s is ambiguous", (raw) => {
    expect(parseIdNumber(raw)).toBeNull();
  });
});

describe("recordings", () => {
  it("every symbol carries the same IHSG value for a date", () => {
    const byDate = new Map<string, Set<number>>();
    for (const series of Object.values(priceSeries)) {
      for (const p of series) byDate.set(p.date, (byDate.get(p.date) ?? new Set()).add(p.ihsg));
    }
    for (const [date, values] of byDate) expect({ date, values: values.size }).toEqual({ date, values: 1 });
  });
});

describe("checkFigures", () => {
  it("confirms a close and a change that match the recordings", () => {
    const result = checkFigures(article(closeSentence(symbol, last.close, pct(last.close, prev.close))));
    expect(result.status).toBe("consistent");
    expect(result.figures.map((f) => [f.kind, f.status, f.firm])).toEqual([
      ["pct", "consistent", true],
      ["close", "consistent", true],
    ]);
  });

  it("contradicts a firm close far from the recording and quotes both numbers", () => {
    const wrong = Math.round(last.close * 1.2);
    const result = checkFigures(article(closeSentence(symbol, wrong, pct(last.close, prev.close))));
    expect(result.status).toBe("contradicted");
    const figure = result.figures.find((f) => f.status === "contradicted")!;
    expect(figure.recorded).toBe(last.close);
    expect(figure.reason).toContain(id(wrong));
    expect(figure.reason).toContain(id(last.close));
  });

  it("compares the size of a fall, whichever way the sign is written", () => {
    const body = `Saham ${symbol} ditutup turun -${id(pct(last.close, prev.close), 2)}% pada perdagangan (${slash(last.date)}).`;
    expect(checkFigures(article(body)).status).toBe("consistent");
  });

  it("checks the IHSG against the index column", () => {
    const body = `IHSG ditutup di level ${id(last.ihsg)} pada perdagangan (${slash(last.date)}).`;
    const result = checkFigures(article(body));
    expect(result.figures[0]).toMatchObject({ target: IHSG, status: "consistent", recorded: last.ihsg });
  });

  it("never contradicts a figure dated after the recordings", () => {
    const after = new Date(Date.parse(DATA_AS_OF) + 3 * 86_400_000).toISOString().slice(0, 10);
    const result = checkFigures(article(closeSentence(symbol, last.close * 2, 1, after)));
    expect(result.status).toBe("uncheckable");
    expect(result.figures[0].reason).toContain("setelah data rekaman");
  });

  it("treats session, opening and forecast figures as uncheckable", () => {
    for (const lead of ["pada penutupan sesi I", "dibuka", "berpotensi menguji"]) {
      const body = `IHSG ${lead} di level ${id(Math.round(last.ihsg * 1.2))} pada perdagangan (${slash(last.date)}).`;
      const result = checkFigures(article(body));
      expect(result.status).toBe("uncheckable");
    }
  });

  it("treats a date range as uncheckable", () => {
    const [, m] = last.date.split("-");
    const body = `Saham ${symbol} ditutup turun 9,99% ke level Rp ${id(last.close * 1.3)} dalam kurun 1-5 ${["januari", "februari", "maret", "april", "mei", "juni", "juli", "agustus", "september", "oktober", "november", "desember"][Number(m) - 1]}.`;
    expect(checkFigures(article(body)).status).toBe("uncheckable");
  });

  it("reads a figure with stripped separators as a parse error, not a claim", () => {
    const body = `IHSG ditutup anjlok ${Math.round(last.ihsg * 100)} poin ke level ${Math.round(last.ihsg * 100)} pada perdagangan (${slash(last.date)}).`;
    const result = checkFigures(article(body));
    expect(result.status).toBe("uncheckable");
    expect(result.figures[0].reason).toContain("salah baca");
  });

  it("ignores figures with no symbol, two symbols, or a code inside a word", () => {
    const other = (Object.keys(priceSeries) as SymbolCode[]).find((s) => s !== symbol)!;
    const date = `(${slash(last.date)})`;
    expect(extractCloseFigures(article(`Rupiah ditutup melemah ke level Rp ${id(last.close)} pada perdagangan ${date}.`))).toEqual([]);
    expect(extractCloseFigures(article(`Saham ${symbol} dan ${other} ditutup ke level Rp ${id(last.close)} pada perdagangan ${date}.`))).toEqual([]);
    expect(extractCloseFigures(article(`Saham ${symbol}X ditutup melemah ke level Rp ${id(last.close)} pada perdagangan ${date}.`))).toEqual([]);
  });

  it("a weak figure can confirm but never contradict", () => {
    // Target carried from the previous clause, no close word: weak.
    const body = `${symbol} mencatat penurunan terdalam, yakni ${id(pct(last.close, prev.close), 2)}% ke level Rp ${id(Math.round(last.close * 1.2))} pada perdagangan (${slash(last.date)}).`;
    const result = checkFigures(article(body));
    expect(result.figures.every((f) => !f.firm)).toBe(true);
    expect(result.status).toBe("consistent");
    expect(result.figures.find((f) => f.kind === "close")?.status).toBe("uncheckable");
  });

  it("does not pin 'hari ini' to a day when the source gave no publish date", () => {
    const at = `${last.date}T09:00:00.000Z`;
    const body = `Saham ${symbol} ditutup melemah ke level Rp ${id(last.close * 2)} pada perdagangan hari ini.`;
    expect(checkFigures(article(body, at, at)).status).toBe("uncheckable");
    expect(checkFigures(article(body, at, `${last.date}T11:00:00.000Z`)).status).not.toBe("uncheckable");
  });

  it("a close word does not carry to a sentence that names another day", () => {
    const body = `IHSG ditutup di level ${id(last.ihsg)} pada perdagangan (${slash(last.date)}). Pada perdagangan sebelumnya (${slash(prev.date)}), IHSG berada di level ${id(Math.round(prev.ihsg * 1.2))}.`;
    const result = checkFigures(article(body));
    expect(result.status).toBe("consistent");
    expect(result.figures.find((f) => f.date === prev.date)?.firm).toBe(false);
  });

  it("an earlier day's move beside the stated date never contradicts", () => {
    const today = id(pct(last.ihsg, prev.ihsg), 2);
    const kemarin = `IHSG ditutup menguat ${today}% pada perdagangan (${slash(last.date)}) setelah kemarin turun 9,87%.`;
    expect(checkFigures(article(kemarin)).status).toBe("uncheckable");
    const twice = `IHSG ditutup menguat ${today}% pada perdagangan (${slash(last.date)}) setelah turun 9,87%.`;
    expect(checkFigures(article(twice)).status).not.toBe("contradicted");
  });

  it("an empty body has nothing to check", () => {
    expect(checkFigures(article(""))).toEqual({ status: "uncheckable", figures: [] });
  });
});

describe("golden figure cases", () => {
  const recorded = new Set(Object.values(priceSeries).flatMap((s) => s.map((p) => p.date)));
  const want = { contradicts: "contradicted", consistent: "consistent", uncheckable: "uncheckable" } as const;
  for (const c of golden.figures) {
    const path = `${CACHE}/${c.id}.txt`;
    const dates = [c.claim, ...(c.claims ?? [])].filter(Boolean).map((claim) => claim!.date);
    // Article text is fetched into a gitignored cache, never committed; and a
    // claim whose date left the recording window can no longer be judged.
    const runnable = existsSync(path) && dates.every((d) => recorded.has(d));
    it.skipIf(!runnable)(`${c.id} is ${c.expect}`, () => {
      const at = "2026-09-24T00:00:00.000Z";
      const result = checkFigures(article(readFileSync(path, "utf8"), at, at));
      expect(result.status).toBe(want[c.expect]);
    });
  }
});
