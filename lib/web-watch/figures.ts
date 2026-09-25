/**
 * The figure check (d): closing figures in an article against the recordings.
 *
 * An article that says the IHSG closed at 7.583 on a day the recordings say
 * 6.277 is wrong, and the engine must never read it. This module finds the
 * figures an article states as a day's close, change or volume for one
 * registry symbol or the IHSG, and compares each with `priceSeries`.
 *
 * Three verdicts per figure: consistent, contradicted, uncheckable. Only a
 * contradiction rejects, so the rules are built to make a contradiction hard
 * to reach by accident:
 *
 * - **Only closes.** A session, opening, intraday, forecast or multi-day
 *   figure is uncheckable (`NOT_CLOSE_TERMS`, date ranges, times of day).
 * - **One target, one date.** The figure's clause names exactly one symbol or
 *   the IHSG, and the sentence resolves to exactly one date.
 * - **Firm or weak.** A figure is firm when its own clause names the target,
 *   its sentence or paragraph says "ditutup" or its kin (`CLOSE_TERMS`), and
 *   the date comes from the same paragraph. A weak figure (target carried
 *   from an earlier clause, or date from an earlier paragraph) can confirm a
 *   recording but never contradict it: a mismatch there is uncheckable.
 * - **Parse guesses never reject.** An ambiguous number parses to null, and a
 *   number outside the series' recorded range by `webWatchFigurePlausibleFactor`
 *   is taken as a mangled separator ("639234"), not as a claim.
 *
 * Nothing here is typed per case: symbols come from the registry, values and
 * ranges from the recordings, tolerances from `DEFAULT_THRESHOLDS`. The word
 * lists below are structural, like `LEGAL_TOKENS`: how Indonesian market news
 * says "closed", "session one" or "the composite index".
 */

import { resolveThresholds, type ResolvedThresholds } from "@/lib/agent/thresholds";
import { companies, DATA_AS_OF, priceSeries } from "@/lib/data/fixtures";
import type { MarketEvent, PricePoint, SymbolCode } from "@/lib/types";
import { codePattern, sentenceSpans } from "@/lib/web-watch/triage";

export const IHSG = "IHSG" as const;
export type FigureTarget = SymbolCode | typeof IHSG;
export type FigureKind = "close" | "pct" | "volume";

/** How an article names the composite index. A capitalised term is matched
 *  as written; the rest in any case. */
export const IHSG_TERMS = ["IHSG", "Indeks Harga Saham Gabungan"] as const;

/** Phrases that point back at the composite index once it has been named. */
export const INDEX_REFERENCE_TERMS = ["indeks utama", "indeks acuan", "indeks komposit"] as const;

/** Other indices and sector gauges: a clause naming one is not about the IHSG. */
export const OTHER_INDEX_TERMS = [
  "sektor",
  "sektoral",
  "LQ45",
  "IDX30",
  "IDX80",
  "Dow Jones",
  "Nasdaq",
  "S&P",
  "Nikkei",
  "Hang Seng",
  "Kospi",
  "Straits Times",
  "Shanghai",
] as const;

/** Words that make a figure the day's close. */
export const CLOSE_TERMS = ["ditutup", "penutupan", "parkir", "closing", "mengakhiri"] as const;

/** Words that make a figure something other than the day's close: a session,
 *  the open, a moment inside the day, a span of days, a forecast, or a
 *  company or macro figure (revenue growth, a policy rate) that shares a
 *  sentence with a ticker. */
export const NOT_CLOSE_TERMS = [
  "sesi I",
  "sesi 1",
  "sesi pertama",
  "sesi siang",
  "siang",
  "pagi",
  "pembukaan",
  "dibuka",
  "intraday",
  "awal perdagangan",
  "sempat",
  "pukul",
  "sepekan",
  "sepanjang",
  "pekan ini",
  "pekan lalu",
  "sebulan",
  "year to date",
  "target",
  "support",
  "resistance",
  "proyeksi",
  "diproyeksikan",
  "prediksi",
  "memprediksi",
  "diperkirakan",
  "berpotensi",
  "YoY",
  "QoQ",
  "YTD",
  "tahunan",
  "kuartal",
  "semester",
  "pendapatan",
  "laba",
  "penjualan",
  "produksi",
  "dividen",
  "yield",
  "imbal hasil",
  "suku bunga",
  "BI-Rate",
  "inflasi",
] as const;

/** Words that say a percentage is the day's move, not a share or a yield. */
export const MOVE_TERMS = [
  "naik",
  "turun",
  "menguat",
  "melemah",
  "anjlok",
  "terkoreksi",
  "koreksi",
  "merosot",
  "ambles",
  "ambruk",
  "terjun",
  "meroket",
  "melonjak",
  "tergelincir",
  "terperosok",
  "penurunan",
  "kenaikan",
  "melesat",
] as const;

export const MONTHS_ID = [
  "januari",
  "februari",
  "maret",
  "april",
  "mei",
  "juni",
  "juli",
  "agustus",
  "september",
  "oktober",
  "november",
  "desember",
] as const;

export const WEEKDAYS_ID = ["senin", "selasa", "rabu", "kamis", "jumat", "jum'at", "sabtu", "minggu"] as const;

/** Unit words: a multiplier for a count, and how many shares one unit is. */
const MULTIPLIERS: Record<string, number> = { ribu: 1e3, rb: 1e3, juta: 1e6, jt: 1e6, miliar: 1e9 };
const SHARES_PER: Record<string, number> = { lot: 100, lembar: 1, saham: 1 };

// ---------------------------------------------------------------------------
// Numbers
// ---------------------------------------------------------------------------

/**
 * A number as Indonesian or English news writes it: `6.277,04`, `6,429.88`,
 * `7.583`, `1,69`, `0.95`, `639234`. With both separators, the last one is the
 * decimal mark and the other must group thousands. With one separator, three
 * trailing digits make it a thousands group, anything else a decimal mark.
 * Any other shape is ambiguous and returns null.
 */
export function parseIdNumber(raw: string): number | null {
  const s = raw.trim();
  if (!/^\d[\d.,]*$/.test(s) || /[.,]$/.test(s)) return null;
  if (/^\d+$/.test(s)) return Number(s);
  const lastDot = s.lastIndexOf(".");
  const lastComma = s.lastIndexOf(",");
  if (lastDot >= 0 && lastComma >= 0) {
    const decimal = lastDot > lastComma ? "." : ",";
    const group = decimal === "." ? "," : ".";
    const at = s.lastIndexOf(decimal);
    const whole = s.slice(0, at);
    const fraction = s.slice(at + 1);
    if (whole.includes(decimal) || !/^\d+$/.test(fraction)) return null;
    const groups = whole.split(group);
    if (groups[0].length > 3 || groups.slice(1).some((g) => g.length !== 3)) return null;
    return Number(`${groups.join("")}.${fraction}`);
  }
  const separator = lastDot >= 0 ? "." : ",";
  const parts = s.split(separator);
  if (parts.length > 2) {
    if (parts[0].length > 3 || parts.slice(1).some((p) => p.length !== 3)) return null;
    return Number(parts.join(""));
  }
  const [whole, fraction] = parts;
  if (fraction.length === 3 && whole !== "0") return Number(`${whole}${fraction}`);
  return Number(`${whole}.${fraction}`);
}

// ---------------------------------------------------------------------------
// Dates
// ---------------------------------------------------------------------------

const JAKARTA_DATE = new Intl.DateTimeFormat("en-CA", { timeZone: "Asia/Jakarta", year: "numeric", month: "2-digit", day: "2-digit" });

/** The calendar date of an instant in Asia/Jakarta, `YYYY-MM-DD`. */
export function jakartaDate(iso: string): string | null {
  const time = Date.parse(iso);
  return Number.isFinite(time) ? JAKARTA_DATE.format(new Date(time)) : null;
}

function isoDate(year: number, month: number, day: number): string | null {
  if (month < 1 || month > 12 || day < 1 || day > 31) return null;
  const date = new Date(Date.UTC(year, month - 1, day));
  if (date.getUTCMonth() !== month - 1) return null;
  return date.toISOString().slice(0, 10);
}

function shiftDays(date: string, days: number): string {
  const d = new Date(`${date}T00:00:00Z`);
  d.setUTCDate(d.getUTCDate() + days);
  return d.toISOString().slice(0, 10);
}

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const MONTH_ALT = MONTHS_ID.join("|");
const TEXT_DATE = new RegExp(`\\b(\\d{1,2})\\s+(${MONTH_ALT})\\b(?:\\s+(\\d{4}))?`, "giu");
const SLASH_DATE = /(?<![\d/])(\d{1,2})\/(\d{1,2})(?:\/(\d{2}|\d{4}))?(?![\d/])/gu;
const DATE_RANGE_SOURCE = `\\b\\d{1,2}\\s*(?:[–—-]|s\\.d\\.?|sampai|hingga)\\s*\\d{1,2}\\s+(?:${MONTH_ALT})\\b|\\b\\d{1,2}\\s+(?:${MONTH_ALT})\\s*(?:[–—-]|s\\.d\\.?|sampai|hingga)\\s*\\d{1,2}`;
const DATE_RANGE = new RegExp(DATE_RANGE_SOURCE, "iu");
const DATE_RANGES = new RegExp(DATE_RANGE_SOURCE, "giu");
const TIME_OF_DAY = /\b\d{1,2}[.:]\d{2}\s*(?:[–—-]\s*\d{1,2}[.:]\d{2}\s*)?WIB\b/giu;
/** A bare four-digit year. News writes a price of two thousand as "2.026";
 *  an unseparated 19xx/20xx is a year. */
const BARE_YEAR = /(?<![\d.,])(?:19|20)\d{2}(?![\d]|[.,]\d)/gu;

interface SentenceDates {
  dates: string[];
  range: boolean;
  /** A weekday or relative word with no date the sentence itself resolves. */
  loose: boolean;
}

function wordPattern(term: string, flags = "iu"): RegExp {
  return new RegExp(`(?<![\\p{L}\\p{N}])${escapeRegex(term)}(?![\\p{L}\\p{N}])`, flags);
}

function termPattern(term: string): RegExp {
  return term === term.toUpperCase() ? codePattern(term) : wordPattern(term);
}

const hasAny = (text: string, terms: readonly string[]) => terms.some((term) => wordPattern(term).test(text));

function sentenceDates(sentence: string, published: string | null, publishedTrusted: boolean): SentenceDates {
  const year = Number((published ?? "").slice(0, 4)) || null;
  const found = new Set<string>();
  const resolve = (d: number, m: number, y?: string) => {
    const full = y ? (y.length === 2 ? 2000 + Number(y) : Number(y)) : year;
    if (!full) return;
    let date = isoDate(full, m, d);
    // "(22/12)" in a piece published 2 January is last year's December.
    if (date && !y && published && date > shiftDays(published, 1)) date = isoDate(full - 1, m, d);
    if (date) found.add(date);
  };
  for (const m of sentence.matchAll(TEXT_DATE)) resolve(Number(m[1]), MONTHS_ID.indexOf(m[2].toLowerCase() as (typeof MONTHS_ID)[number]) + 1, m[3]);
  for (const m of sentence.matchAll(SLASH_DATE)) resolve(Number(m[1]), Number(m[2]), m[3]);
  const relative = hasAny(sentence, ["hari ini", "kemarin"]);
  // "ditutup naik pada 22/9 setelah kemarin turun": two days in one sentence,
  // whether or not "kemarin" can be pinned. "hari ini, Selasa (22/9)" names
  // one day twice, unless the publish date says otherwise.
  const otherDay =
    hasAny(sentence, ["kemarin"]) || (publishedTrusted && published !== null && hasAny(sentence, ["hari ini"]) && !found.has(published));
  if (found.size && otherDay) return { dates: [...found, "relatif"], range: DATE_RANGE.test(sentence), loose: false };
  if (!found.size && relative && publishedTrusted && published) {
    if (hasAny(sentence, ["hari ini"])) found.add(published);
    if (hasAny(sentence, ["kemarin"])) found.add(shiftDays(published, -1));
  }
  const loose = !found.size && (relative || hasAny(sentence, WEEKDAYS_ID));
  return { dates: [...found], range: DATE_RANGE.test(sentence), loose };
}

/** Date ranges, dates, times and bare years blanked out so their digits are not read as figures. */
function maskNonFigures(text: string): string {
  const blank = (m: string) => " ".repeat(m.length);
  return text
    .replace(TIME_OF_DAY, blank)
    .replace(DATE_RANGES, blank)
    .replace(TEXT_DATE, blank)
    .replace(SLASH_DATE, blank)
    .replace(BARE_YEAR, blank);
}

// ---------------------------------------------------------------------------
// Extraction
// ---------------------------------------------------------------------------

export interface CloseFigure {
  target: FigureTarget;
  kind: FigureKind;
  value: number;
  /** The number as the article wrote it. */
  raw: string;
  date: string | null;
  /** The sentence the figure came from, verbatim. */
  span: string;
  /** May contradict a recording. A weak figure can only confirm one. */
  firm: boolean;
  /** Why the figure cannot be compared at all, before any lookup. */
  skip?: string;
}

const NUMBER = String.raw`\d+(?:[.,]\d+)*`;
const PCT = new RegExp(`(${NUMBER})\\s*(?:%|persen\\b)`, "giu");
const LEVEL = new RegExp(
  `(?<![\\p{L}\\p{N}])(?:level|posisi|ke|di|menjadi|pada)\\s+(?:(?:level|posisi)\\s+)?(?:Rp\\.?\\s*)?(${NUMBER})(?![.,]?\\d)`,
  "giu",
);
const NOT_A_LEVEL = /^\s*(?:%|persen|poin|ribu|rb|juta|jt|miliar|triliun|lot|lembar|saham|kali|emiten|x\b|us\$|dolar|per\s+dolar)/iu;
const VOLUME = new RegExp(`(${NUMBER})\\s*(ribu|rb|juta|jt|miliar)?\\s*(lot|lembar|saham)\\b`, "giu");
const TICKER_LIKE = /(?<![\p{L}\p{N}])[A-Z]{4}(?![\p{L}\p{N}])/gu;
const CLAUSE_BREAK = /,\s+|;\s+|\s+(?=(?:sedangkan|sementara)\s)/u;

interface Clause {
  text: string;
  targets: FigureTarget[];
  /** Names another index, sector or an unregistered ticker. */
  foreign: boolean;
}

function registrySymbols(series: Record<string, PricePoint[]>): SymbolCode[] {
  return [...new Set([...companies.map((c) => c.symbol), ...(Object.keys(series) as SymbolCode[])])];
}

function clausesOf(sentence: string, symbols: SymbolCode[], ihsgSeen: boolean): Clause[] {
  const known = new Set<string>([...symbols, IHSG]);
  return sentence.split(CLAUSE_BREAK).map((text) => {
    const targets: FigureTarget[] = symbols.filter((code) => codePattern(code).test(text));
    const otherIndex = OTHER_INDEX_TERMS.some((term) => termPattern(term).test(text));
    const namesIhsg = IHSG_TERMS.some((term) => termPattern(term).test(text));
    const refersIhsg = ihsgSeen && !otherIndex && hasAny(text, INDEX_REFERENCE_TERMS);
    if (namesIhsg || refersIhsg) targets.push(IHSG);
    const unknownTicker = [...text.matchAll(TICKER_LIKE)].some((m) => !known.has(m[0]));
    return { text, targets, foreign: otherIndex || unknownTicker };
  });
}

function figuresIn(clause: string): Array<{ kind: FigureKind; raw: string; value: number }> {
  const masked = maskNonFigures(clause);
  const out: Array<{ kind: FigureKind; raw: string; value: number }> = [];
  for (const m of masked.matchAll(PCT)) {
    const value = parseIdNumber(m[1]);
    if (value !== null) out.push({ kind: "pct", raw: m[0].trim(), value });
  }
  for (const m of masked.matchAll(LEVEL)) {
    const after = masked.slice((m.index ?? 0) + m[0].length);
    if (NOT_A_LEVEL.test(after)) continue;
    const value = parseIdNumber(m[1]);
    if (value !== null) out.push({ kind: "close", raw: m[1], value });
  }
  if (/\bvolume\b/iu.test(masked)) {
    for (const m of masked.matchAll(VOLUME)) {
      const value = parseIdNumber(m[1]);
      if (value === null) continue;
      const multiplier = m[2] ? MULTIPLIERS[m[2].toLowerCase()] : 1;
      out.push({ kind: "volume", raw: m[0].trim(), value: value * multiplier * SHARES_PER[m[3].toLowerCase()] });
    }
  }
  return out;
}

/**
 * Every closing, change or volume figure the article ties to one registry
 * symbol or the IHSG, each with its date and whether it is firm. Figures the
 * rules cannot date or that describe a session carry a `skip` reason.
 */
export function extractCloseFigures(event: MarketEvent, series: Record<string, PricePoint[]> = priceSeries): CloseFigure[] {
  const t = resolveThresholds();
  const symbols = registrySymbols(series);
  const published = jakartaDate(event.publishedAt);
  // A candidate with no date from its source was stamped with the fetch time;
  // "hari ini" then means nothing we can pin to a trading day.
  const publishedTrusted = event.publishedAt !== event.asOf;
  const body = event.body || event.summary || "";
  const out: CloseFigure[] = [];
  const article = { date: null as string | null, session: false, ihsgSeen: false };

  for (const paragraph of body.split(/\n+/)) {
    const para = { date: null as string | null, close: false, session: false };
    for (const { text: sentence } of sentenceSpans(paragraph, t.webWatchProseSentenceMinWords)) {
      const dates = sentenceDates(sentence, published, publishedTrusted);
      const notClose = hasAny(sentence, NOT_CLOSE_TERMS) || new RegExp(TIME_OF_DAY.source, "iu").test(sentence);
      const ownClose = hasAny(sentence, CLOSE_TERMS);
      const ownDate = dates.dates.length === 1 ? dates.dates[0] : null;

      let date: string | null = null;
      let dateFrom: "own" | "para" | "article" | null = null;
      let skip: string | undefined;
      if (dates.range) skip = "rentang tanggal, bukan satu sesi";
      else if (dates.dates.length > 1) skip = "lebih dari satu tanggal dalam kalimat";
      else if (ownDate) [date, dateFrom] = [ownDate, "own"];
      else if (!dates.loose && para.date) [date, dateFrom] = [para.date, "para"];
      else if (!dates.loose && article.date) [date, dateFrom] = [article.date, "article"];
      const inheritedSession = dateFrom === "para" ? para.session : dateFrom === "article" ? article.session : false;
      if (!skip && (notClose || inheritedSession)) skip = "bukan angka penutupan harian: sesi, pembukaan, intrahari, proyeksi, atau angka keuangan";
      if (!skip && !date) skip = "tanpa tanggal perdagangan yang jelas";
      // A close word from an earlier sentence carries only with its date: a
      // sentence that names its own day is a close only if it says so itself.
      const closeContext = ownClose ? dateFrom === "own" || dateFrom === "para" : para.close && dateFrom === "para";

      const clauses = clausesOf(sentence, symbols, article.ihsgSeen);
      let carried: FigureTarget | null = null;
      for (const clause of clauses) {
        let target: FigureTarget | null = null;
        let explicit = false;
        if (clause.targets.length === 1 && !clause.foreign) [target, explicit] = [clause.targets[0], true];
        else if (clause.targets.length === 0 && !clause.foreign) target = carried;
        carried = clause.targets.length === 1 && !clause.foreign ? clause.targets[0] : clause.targets.length ? null : carried;
        if (!target) continue;
        const moved = hasAny(clause.text, MOVE_TERMS);
        const figures = figuresIn(clause.text);
        // Two figures of one kind in a clause ("naik 0,5% setelah turun 1,2%")
        // are at most one close: neither may contradict.
        const single = (kind: FigureKind) => figures.filter((f) => f.kind === kind).length === 1;
        for (const figure of figures) {
          if (figure.kind === "volume" && target === IHSG) continue;
          const firm = !skip && explicit && closeContext && single(figure.kind) && (figure.kind !== "pct" || moved);
          out.push({ target, ...figure, date, span: sentence, firm, ...(skip ? { skip } : {}) });
        }
      }

      if (ownDate) {
        para.date = ownDate;
        article.date = ownDate;
        article.session = notClose;
      }
      para.close ||= ownClose;
      para.session ||= notClose;
      article.ihsgSeen ||= clauses.some((c) => c.targets.includes(IHSG));
    }
  }
  return out;
}

// ---------------------------------------------------------------------------
// Verdict
// ---------------------------------------------------------------------------

export type FigureStatus = "contradicted" | "consistent" | "uncheckable";

export interface CheckedFigure extends CloseFigure {
  status: FigureStatus;
  recorded?: number;
  reason: string;
}

export interface FigureCheck {
  status: FigureStatus;
  figures: CheckedFigure[];
}

const fmt = (value: number) => value.toLocaleString("id-ID", { maximumFractionDigits: 2 });

/** The recorded row for a target on a date, and the one before it. IHSG rows
 *  come from any symbol's series: every symbol carries the same index value
 *  for a date (tests/web-watch-figures.test.ts asserts it). */
function rowsFor(target: FigureTarget, date: string, series: Record<string, PricePoint[]>) {
  const rows = target === IHSG ? Object.values(series).find((s) => s.some((p) => p.date === date)) : series[target];
  if (!rows?.length) return null;
  const at = rows.findIndex((p) => p.date === date);
  const value = (p: PricePoint) => (target === IHSG ? p.ihsg : p.close);
  return { rows, at, value };
}

function judge(figure: CloseFigure, series: Record<string, PricePoint[]>, asOfDate: string, t: ResolvedThresholds): CheckedFigure {
  const uncheckable = (reason: string, recorded?: number): CheckedFigure => ({ ...figure, status: "uncheckable", reason, ...(recorded === undefined ? {} : { recorded }) });
  if (figure.skip) return uncheckable(figure.skip);
  if (!figure.date) return uncheckable("tanpa tanggal perdagangan yang jelas");
  if (figure.date > asOfDate) return uncheckable(`setelah data rekaman (${asOfDate})`);
  const found = rowsFor(figure.target, figure.date, series);
  if (!found) return uncheckable(`tidak ada rekaman untuk ${figure.target}`);
  const { rows, at, value } = found;
  if (at < 0) return uncheckable(`tidak ada sesi terekam untuk ${figure.target} pada ${figure.date}`);
  const factor = t.webWatchFigurePlausibleFactor;

  let recorded: number;
  let off: boolean;
  let label: string;
  if (figure.kind === "pct") {
    if (at === 0) return uncheckable(`tidak ada sesi sebelumnya untuk menghitung perubahan ${figure.target}`);
    const moves = rows.slice(1).map((p, i) => Math.abs((value(p) / value(rows[i]) - 1) * 100));
    if (Math.abs(figure.value) > Math.max(...moves) * factor) return uncheckable("persentase di luar rentang rekaman; kemungkinan salah baca angka");
    recorded = Math.round((value(rows[at]) / value(rows[at - 1]) - 1) * 10000) / 100;
    off = Math.abs(Math.abs(figure.value) - Math.abs(recorded)) > t.webWatchPctTolerancePp;
    label = "perubahan (%)";
  } else {
    const pick = figure.kind === "volume" ? (p: PricePoint) => p.volume : value;
    const values = rows.map(pick);
    if (figure.value < Math.min(...values) / factor || figure.value > Math.max(...values) * factor) {
      return uncheckable("angka di luar rentang rekaman; kemungkinan salah baca angka");
    }
    recorded = pick(rows[at]);
    const tolerance = figure.kind === "volume" ? t.webWatchVolumeToleranceShare : t.webWatchPriceToleranceShare;
    off = Math.abs(figure.value - recorded) / recorded > tolerance;
    label = figure.kind === "volume" ? "volume" : "penutupan";
  }
  const both = `${figure.target} ${label} ${figure.date}: artikel ${fmt(figure.value)}, rekaman ${fmt(recorded)}`;
  if (!off) return { ...figure, status: "consistent", recorded, reason: both };
  if (!figure.firm) return uncheckable(`${both}; kalimatnya tidak tegas menyebut penutupan hari itu`, recorded);
  return { ...figure, status: "contradicted", recorded, reason: both };
}

/**
 * Every figure the article ties to a close, judged against the recordings.
 * Contradicted when any figure is; consistent when at least one matches and
 * none contradicts; otherwise uncheckable. Pure: the service calls it with the
 * recordings compiled into its image.
 */
export function checkFigures(
  event: MarketEvent,
  series: Record<string, PricePoint[]> = priceSeries,
  asOf: string = DATA_AS_OF,
  t: ResolvedThresholds = resolveThresholds(),
): FigureCheck {
  const asOfDate = jakartaDate(asOf) ?? asOf.slice(0, 10);
  const figures = extractCloseFigures(event, series).map((figure) => judge(figure, series, asOfDate, t));
  const status: FigureStatus = figures.some((f) => f.status === "contradicted")
    ? "contradicted"
    : figures.some((f) => f.status === "consistent")
      ? "consistent"
      : "uncheckable";
  return { status, figures };
}
