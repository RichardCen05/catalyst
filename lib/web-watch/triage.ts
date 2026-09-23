/**
 * Web-watch triage — which candidates reach a human, and why the rest do not.
 *
 * Every sweep candidate used to land in the review queue raw. On 2026-09-24
 * that was 156 items, and the reviewer's dismissals repeated three reasons: the
 * item names no watched emiten, the fetched text is a navigation skeleton, the
 * weather is ordinary. Those are rules, so a machine applies them here, in the
 * open, and writes down which rule fired and on what.
 *
 * Three commitments:
 *
 * **Nothing is accepted here.** The only verdicts are "archive" and "review".
 * Archived items stay in the queue file with their rule and reason, and a
 * reviewer can restore any of them.
 *
 * **Nothing is typed per case.** Symbols, names and sectors come from the
 * registry (`companies`, `SYMBOL_ALIASES`), declared emiten and regions from
 * the source record, cut-offs from `DEFAULT_THRESHOLDS`. Reasons are assembled
 * from what matched, so a refresh or a moved threshold changes them too.
 *
 * **When unsure, review.** A payload this file does not recognise is never
 * archived by the weather rule; an alias too rare to judge is still counted.
 * An archived item a human would have accepted is the defect this module must
 * not produce; an extra item in review only costs a glance.
 */

import { ENCLITICS, SYMBOL_ALIASES } from "@/lib/agent/query";
import { resolveThresholds, type ResolvedThresholds } from "@/lib/agent/thresholds";
import { companies as registryCompanies } from "@/lib/data/fixtures";
import { readForecast, readQuake, summarizeJsonPayload } from "@/lib/web-watch/json-summary";
import type { WatchedSource } from "@/lib/web-watch/types";
import type { Company, MarketEvent, SymbolCode } from "@/lib/types";

export const TRIAGE_RULES = ["duplicate", "empty-extract", "weather-below-warning", "no-watched-match"] as const;
export type TriageRule = (typeof TRIAGE_RULES)[number];

export type MatchKind = "symbol" | "name" | "sector" | "subsector" | "source" | "region" | "weather";

/** One reason a candidate concerns one emiten. `term` is what matched. */
export interface MatchEvidence {
  symbol: SymbolCode;
  by: MatchKind;
  term: string;
}

export type TriageResult =
  | { verdict: "archive"; rule: TriageRule; reason: string }
  | { verdict: "review"; symbols: SymbolCode[]; matchedBy: MatchEvidence[] };

export type SeenWhere = "pending" | "accepted" | "archived";

export interface TriageContext {
  sources: WatchedSource[];
  /** Events the queue already holds. Duplicates are judged against these. */
  seen: Array<{ event: MarketEvent; where: SeenWhere }>;
  companies?: Array<Pick<Company, "symbol" | "sector" | "subsector">>;
  aliases?: Partial<Record<SymbolCode, string[]>>;
  thresholds?: ResolvedThresholds;
}

// ---------------------------------------------------------------------------
// Text helpers
// ---------------------------------------------------------------------------

const escapeRegex = (value: string) => value.replace(/[.*+?^${}()|[\]\\]/g, "\\$&");
const BOUNDARY_BEFORE = "(?<![\\p{L}\\p{N}])";
const BOUNDARY_AFTER = "(?![\\p{L}\\p{N}])";
const ENCLITIC_TAIL = `(?:${ENCLITICS.join("|")})?`;

/** A word or phrase as a whole word, case-insensitive, allowing an enclitic
 *  ("timahnya", "Antam-lah" reads the same as the bare name). */
function phrasePattern(phrase: string): RegExp {
  const body = phrase.trim().split(/\s+/).map(escapeRegex).join("[\\s\\-]+");
  return new RegExp(`${BOUNDARY_BEFORE}${body}${ENCLITIC_TAIL}${BOUNDARY_AFTER}`, "iu");
}

/** A code-like token as written in capitals only. `BUKA` is a ticker; `buka`
 *  is the word "open", and a case-insensitive match would file half the
 *  Indonesian web under Bukalapak. */
function codePattern(code: string): RegExp {
  return new RegExp(`${BOUNDARY_BEFORE}${escapeRegex(code.toUpperCase())}${BOUNDARY_AFTER}`, "u");
}

function normalizeTitle(title: string): string {
  return title.toLowerCase().normalize("NFKC").replace(/[^\p{L}\p{N}]+/gu, " ").trim();
}

/** FNV-1a over the whitespace-collapsed body. Pure JS so this module stays
 *  importable anywhere; a collision only ever merges two identical-looking
 *  candidates into one review item. */
function bodyKey(event: MarketEvent): string {
  const text = (event.body || event.summary || "").replace(/\s+/g, " ").trim();
  let hash = 0x811c9dc5;
  for (let i = 0; i < text.length; i += 1) {
    hash ^= text.charCodeAt(i);
    hash = Math.imul(hash, 0x01000193);
  }
  return `${text.length}:${(hash >>> 0).toString(16)}`;
}

const isStructured = (event: MarketEvent) => summarizeJsonPayload(event.body ?? "") !== null;

/** Every run of text that ends the way a sentence ends. Menus, "Baca Juga"
 *  headline lists and ticker ribbons do not, which is the point. */
function sentences(text: string, minWords = 1): string[] {
  return (text.match(/[^.!?\n]+[.!?](?=\s|$)/g) ?? [])
    .map((sentence) => sentence.trim())
    .filter((sentence) => sentence.split(/\s+/).length >= minWords);
}

/** Characters that sit inside whole sentences — what a navigation menu lacks. */
export function proseChars(text: string, minWords: number): number {
  return sentences(text, minWords).reduce((sum, sentence) => sum + sentence.length, 0);
}

/**
 * The text a candidate is matched on: its title and the sentences of its
 * body. A fetched news page carries the site's chrome with it — a "Baca Juga"
 * list, related videos, a ticker ribbon — and on 2026-09-24 that chrome was
 * why a Katadata piece on an LRT project matched TINS: a sidebar headline
 * about PT Timah. Sidebar headlines end without punctuation; article prose
 * does not.
 */
function matchText(event: MarketEvent): string {
  return [event.title, ...sentences(event.body || event.summary)].join("\n");
}

const fmt = (value: number) => value.toLocaleString("id-ID");

/** Which registered source produced a candidate. Ids are `web-<source>-<hash>`
 *  and source ids contain hyphens, so the longest matching prefix wins. */
export function sourceFor(candidateId: string, sources: WatchedSource[]): WatchedSource | undefined {
  return sources
    .filter((source) => candidateId.startsWith(`web-${source.id}-`))
    .sort((a, b) => b.id.length - a.id.length)[0];
}

// ---------------------------------------------------------------------------
// Matching against the registry
// ---------------------------------------------------------------------------

interface Matcher {
  symbol: SymbolCode;
  by: MatchKind;
  term: string;
  pattern: RegExp;
}

function buildMatchers(ctx: TriageContext, corpus: string[], t: ResolvedThresholds): Matcher[] {
  const companies = ctx.companies ?? registryCompanies;
  const aliases = ctx.aliases ?? SYMBOL_ALIASES;
  const judgeShare = corpus.length >= t.webWatchAliasMinCorpus;
  const matchers: Matcher[] = [];
  for (const company of companies) {
    matchers.push({ symbol: company.symbol, by: "symbol", term: company.symbol, pattern: codePattern(company.symbol) });
    for (const alias of aliases[company.symbol] ?? []) {
      if (alias === company.symbol.toLowerCase()) continue;
      // Acronyms ("bca", "pgn") are code-like: capitals only, same as tickers.
      if (!alias.includes(" ") && alias.length <= 3) {
        matchers.push({ symbol: company.symbol, by: "name", term: alias.toUpperCase(), pattern: codePattern(alias) });
        continue;
      }
      const pattern = phrasePattern(alias);
      if (judgeShare) {
        const share = corpus.filter((text) => pattern.test(text)).length / corpus.length;
        if (share > t.webWatchAliasMaxDocShare) continue;
      }
      matchers.push({ symbol: company.symbol, by: "name", term: alias, pattern });
    }
    matchers.push({ symbol: company.symbol, by: "sector", term: company.sector, pattern: phrasePattern(company.sector) });
    if (company.subsector && company.subsector !== company.sector) {
      matchers.push({ symbol: company.symbol, by: "subsector", term: company.subsector, pattern: phrasePattern(company.subsector) });
    }
  }
  return matchers;
}

function dedupeEvidence(evidence: MatchEvidence[]): MatchEvidence[] {
  const seen = new Set<string>();
  return evidence.filter((item) => {
    const key = `${item.symbol}|${item.by}|${item.term.toLowerCase()}`;
    if (seen.has(key)) return false;
    seen.add(key);
    return true;
  });
}

// ---------------------------------------------------------------------------
// Weather
// ---------------------------------------------------------------------------

type WeatherOutcome =
  | { kind: "not-weather" }
  | { kind: "archive"; reason: string }
  | { kind: "keep"; evidence: MatchEvidence[]; skipMatch: boolean };

function weather(candidate: MarketEvent, source: WatchedSource | undefined, ctx: TriageContext, t: ResolvedThresholds): WeatherOutcome {
  const body = candidate.body ?? "";
  const forecast = readForecast(body);
  if (forecast) {
    const signals: string[] = [];
    if (forecast.maxRainMm !== null && forecast.maxRainMm >= t.webWatchRainMmPerStep) signals.push(`hujan ${fmt(forecast.maxRainMm)} mm`);
    if (forecast.maxWindKmh !== null && forecast.maxWindKmh >= t.webWatchWindKmh) signals.push(`angin ${fmt(forecast.maxWindKmh)} km/jam`);
    if (forecast.maxWeatherCode !== null && forecast.maxWeatherCode >= t.webWatchWarningWeatherCode) signals.push(`kode cuaca ${forecast.maxWeatherCode}`);
    if (!signals.length) {
      const parts = [
        forecast.maxRainMm === null ? "hujan tidak dilaporkan" : `hujan tertinggi ${fmt(forecast.maxRainMm)} mm`,
        forecast.maxWindKmh === null ? "angin tidak dilaporkan" : `angin tertinggi ${fmt(forecast.maxWindKmh)} km/jam`,
        forecast.maxWeatherCode === null ? "kode cuaca tidak dilaporkan" : `kode cuaca tertinggi ${forecast.maxWeatherCode}`,
      ];
      return {
        kind: "archive",
        reason: `Prakiraan ${forecast.place}, ${forecast.steps} langkah: ${parts.join(", ")}. Semua di bawah ambang peringatan (hujan ${fmt(t.webWatchRainMmPerStep)} mm per langkah, angin ${fmt(t.webWatchWindKmh)} km/jam, kode cuaca ${t.webWatchWarningWeatherCode}).`,
      };
    }
    const evidence = (source?.symbols ?? []).map((symbol) => ({ symbol, by: "weather" as const, term: signals.join(", ") }));
    return { kind: "keep", evidence, skipMatch: false };
  }

  const quake = readQuake(body);
  if (quake) {
    const where = `${quake.region} ${quake.feltAt}`;
    const watched = ctx.sources.filter((s) => s.region && s.symbols?.length);
    const hits = watched.filter((s) => phrasePattern(s.region as string).test(where));
    const evidence = hits.flatMap((s) => (s.symbols ?? []).map((symbol) => ({ symbol, by: "region" as const, term: s.region as string })));
    if (quake.magnitude >= t.webWatchQuakeAlwaysReviewMagnitude) return { kind: "keep", evidence, skipMatch: true };
    if (hits.length && quake.magnitude >= t.webWatchQuakeMinMagnitude) return { kind: "keep", evidence, skipMatch: true };
    const regions = [...new Set(watched.map((s) => s.region as string))];
    if (hits.length) {
      const named = [...new Set(hits.map((s) => s.region as string))].join(", ");
      return {
        kind: "archive",
        reason: `Gempa M${fmt(quake.magnitude)} menyebut wilayah aset pantauan (${named}), tetapi magnitudonya di bawah ambang ${fmt(t.webWatchQuakeMinMagnitude)}.`,
      };
    }
    return {
      kind: "archive",
      reason: `Gempa M${fmt(quake.magnitude)}: ${quake.region || "wilayah tidak disebut"}. Pusat gempa dan daerah yang merasakannya tidak menyebut wilayah aset pantauan (${regions.join(", ") || "belum ada sumber berwilayah"}). Dicocokkan lewat teks wilayah saja; registri tidak menyimpan koordinat lokasi.`,
    };
  }
  return { kind: "not-weather" };
}

// ---------------------------------------------------------------------------
// Triage
// ---------------------------------------------------------------------------

const WHERE_LABEL: Record<SeenWhere, string> = {
  pending: "sudah ada di antrean",
  accepted: "sudah diterima",
  archived: "sudah diarsipkan",
};

/**
 * Triage a batch, in order. Each candidate is judged against the queue and
 * against the candidates before it in the same batch, so two feeds carrying
 * one article in one sweep yield one review item, and the earlier one stays.
 */
export function triageAll(
  candidates: MarketEvent[],
  ctx: TriageContext,
): Array<{ candidate: MarketEvent; result: TriageResult }> {
  const t = ctx.thresholds ?? resolveThresholds();
  const corpus = [...ctx.seen.map(({ event }) => matchText(event)), ...candidates.map(matchText)];
  const matchers = buildMatchers(ctx, corpus, t);
  const companyCount = new Set((ctx.companies ?? registryCompanies).map((c) => c.symbol)).size;

  const byTitle = new Map<string, { event: MarketEvent; where: SeenWhere }>();
  const byBody = new Map<string, { event: MarketEvent; where: SeenWhere }>();
  const remember = (event: MarketEvent, where: SeenWhere) => {
    if (!isStructured(event)) {
      const title = normalizeTitle(event.title);
      if (title && !byTitle.has(title)) byTitle.set(title, { event, where });
    }
    const key = bodyKey(event);
    if (!byBody.has(key)) byBody.set(key, { event, where });
  };
  for (const { event, where } of ctx.seen) remember(event, where);

  return candidates.map((candidate) => {
    const result = triageOne(candidate);
    remember(candidate, result.verdict === "archive" ? "archived" : "pending");
    return { candidate, result };
  });

  function triageOne(candidate: MarketEvent): TriageResult {
    const structured = isStructured(candidate);

    // 1. Duplicate. A JSON payload's title is derived from its place name and
    //    repeats every sweep by design, so only its body can make it a copy.
    const titleHit = structured ? undefined : byTitle.get(normalizeTitle(candidate.title));
    const bodyHit = byBody.get(bodyKey(candidate));
    const dup = [titleHit, bodyHit].find((hit) => hit && hit.event.id !== candidate.id);
    if (dup) {
      const how = dup === titleHit ? "judul" : "isi";
      return {
        verdict: "archive",
        rule: "duplicate",
        reason: `Duplikat: ${how} sama dengan "${dup.event.title.slice(0, 120)}", yang ${WHERE_LABEL[dup.where]}.`,
      };
    }

    // 2. Empty extract. A payload is data, not prose; only text pages are judged.
    if (!structured) {
      const chars = proseChars(candidate.body || candidate.summary, t.webWatchProseSentenceMinWords);
      if (chars < t.webWatchProseMinChars) {
        return {
          verdict: "archive",
          rule: "empty-extract",
          reason: `Teks terekstrak hanya memuat ${fmt(chars)} karakter kalimat utuh (ambang ${fmt(t.webWatchProseMinChars)}): kemungkinan kerangka navigasi halaman yang dirender JS, bukan isi.`,
        };
      }
    }

    const source = sourceFor(candidate.id, ctx.sources);

    // 4 before 3 for weather payloads: for a quake, being in a watched region
    //    *is* the match, so the weather rule decides both at once.
    const outcome = weather(candidate, source, ctx, t);
    if (outcome.kind === "archive") return { verdict: "archive", rule: "weather-below-warning", reason: outcome.reason };
    const evidence: MatchEvidence[] = outcome.kind === "keep" ? [...outcome.evidence] : [];
    if (outcome.kind === "keep" && outcome.skipMatch) {
      const matchedBy = dedupeEvidence(evidence);
      return { verdict: "review", symbols: [...new Set(matchedBy.map((e) => e.symbol))], matchedBy };
    }

    // 3. Touches something watched.
    for (const symbol of source?.symbols ?? []) evidence.push({ symbol, by: "source", term: source?.label ?? "" });
    const text = matchText(candidate);
    for (const matcher of matchers) {
      if (matcher.pattern.test(text)) evidence.push({ symbol: matcher.symbol, by: matcher.by, term: matcher.term });
    }
    const matchedBy = dedupeEvidence(evidence);
    if (!matchedBy.length) {
      const origin = source ? `sumber "${source.label}"` : "sumbernya";
      return {
        verdict: "archive",
        rule: "no-watched-match",
        reason: `Tidak menyentuh emiten pantauan: teks tidak menyebut kode, nama, sektor, atau subsektor satu pun dari ${fmt(companyCount)} emiten di registri, dan ${origin} tidak mendeklarasikan emiten.`,
      };
    }
    return { verdict: "review", symbols: [...new Set(matchedBy.map((e) => e.symbol))], matchedBy };
  }
}

export function triage(candidate: MarketEvent, ctx: TriageContext): TriageResult {
  return triageAll([candidate], ctx)[0].result;
}
