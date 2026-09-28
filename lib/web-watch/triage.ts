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
 * Archived items stay in the queue file with their rule and reason. Archiving
 * is final: nothing moves an item back to review.
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

import { ENCLITICS, LEGAL_TOKENS, SYMBOL_ALIASES, registryNameTokens } from "@/lib/agent/query";
import { resolveThresholds, type ResolvedThresholds } from "@/lib/agent/thresholds";
import { companies as registryCompanies } from "@/lib/data/fixtures";
import { readForecast, readQuake, summarizeJsonPayload } from "@/lib/web-watch/json-summary";
import type { WatchedSource } from "@/lib/web-watch/types";
import type { Company, MarketEvent, SymbolCode } from "@/lib/types";

export const TRIAGE_RULES = ["duplicate", "empty-extract", "weather-below-warning", "no-watched-match"] as const;
export type TriageRule = (typeof TRIAGE_RULES)[number];

/** What each rule is called on screen and to the assistant. */
export const TRIAGE_RULE_LABEL: Record<TriageRule, string> = {
  duplicate: "Duplikat",
  "empty-extract": "Teks kosong",
  "weather-below-warning": "Cuaca di bawah ambang",
  "no-watched-match": "Tidak menyentuh emiten pantauan",
};

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

export type SeenWhere = "pending" | "accepted" | "archived" | "suspected";

export interface TriageContext {
  sources: WatchedSource[];
  /** Events the queue already holds. Duplicates are judged against these. */
  seen: Array<{ event: MarketEvent; where: SeenWhere }>;
  /** Without `name`, a company is matched by ticker, acronym, sector and
   *  subsector only: its name words are what `nameMatcher` checks a mention
   *  against. */
  companies?: Array<Pick<Company, "symbol" | "sector" | "subsector"> & { name?: string }>;
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
export function codePattern(code: string): RegExp {
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

/** The whole sentences of a text page, whitespace-collapsed and lowercased.
 *  A republished article keeps these while its title, view counter and
 *  sidebar change. */
function sentenceKeys(event: MarketEvent, minWords: number): Set<string> {
  return new Set(sentences(event.body || event.summary, minWords).map((s) => s.replace(/\s+/g, " ").toLowerCase()));
}

const isStructured = (event: MarketEvent) => summarizeJsonPayload(event.body ?? "") !== null;

/** A run of text that ends the way a sentence ends. A dot followed by a digit
 *  is a number ("7.583", "Rp 3.180"), not an ending: without that exception a
 *  sentence carrying a price lost everything before the number, ticker
 *  included. */
const SENTENCE = /(?:[^.!?\n]|\.(?=\d))+[.!?](?=\s|$)/g;

/** Every sentence of a text with where it starts. Menus, "Baca Juga" headline
 *  lists and ticker ribbons do not end like a sentence, which is the point. */
export function sentenceSpans(text: string, minWords = 1): Array<{ text: string; start: number }> {
  const spans: Array<{ text: string; start: number }> = [];
  for (const match of text.matchAll(SENTENCE)) {
    const raw = match[0];
    const sentence = raw.trim();
    if (sentence.split(/\s+/).length < minWords) continue;
    spans.push({ text: sentence, start: (match.index ?? 0) + raw.indexOf(sentence) });
  }
  return spans;
}

export function sentences(text: string, minWords = 1): string[] {
  return sentenceSpans(text, minWords).map((span) => span.text);
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
/**
 * A match's evidence as the card lists it: what the text itself touches, and
 * the symbols only the source declared.
 *
 * A source declares every symbol any of its releases might reach — BI lists
 * the banks and, for the rupiah, the exporters. Listed under "Cocok dengan"
 * beside real text matches, a BI seminar read as matching ANTM and INCO
 * (QA P2-7). A declared symbol the text also touches is a text match; one it
 * does not is shown apart, as the source's declaration it is.
 */
export function splitMatchEvidence(match: { matchedBy: MatchEvidence[] }): { text: MatchEvidence[]; declaredOnly: SymbolCode[] } {
  const text = match.matchedBy.filter((evidence) => evidence.by !== "source");
  const touched = new Set(text.map((evidence) => evidence.symbol));
  const declaredOnly = [...new Set(match.matchedBy.filter((evidence) => evidence.by === "source" && !touched.has(evidence.symbol)).map((evidence) => evidence.symbol as SymbolCode))];
  return { text, declaredOnly };
}

export function matchText(event: MarketEvent): string {
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
  test: (text: string) => boolean;
}

const fromPattern = (pattern: RegExp) => (text: string) => pattern.test(text);

const isCapitalized = (word: string) => /^\p{Lu}/u.test(word);
const bareWord = (word: string) => word.toLowerCase().replace(new RegExp(`${ENCLITIC_TAIL}$`, "u"), "");

const atSentenceStart = (text: string, start: number) => {
  const before = text.slice(0, start);
  return !before.trim() || /[\n.!?:"“”]\s*$/u.test(before);
};

/** The capitalised words directly around a span that are not `ours`,
 *  stopping at the first lowercase word or at any punctuation — a comma, a
 *  full stop, a bracket. A word that opens a sentence is capitalised by
 *  grammar, not because it names anything, so the scan stops there too. */
function foreignNeighbours(text: string, start: number, end: number, ours: (word: string) => boolean): string[] {
  const out: string[] = [];
  let left = start;
  for (;;) {
    const m = /([\p{L}\p{N}]+)[ \t]+$/u.exec(text.slice(Math.max(0, left - 80), left));
    if (!m || !isCapitalized(m[1])) break;
    left -= m[0].length;
    if (ours(m[1])) continue;
    if (!atSentenceStart(text, left)) out.push(m[1]);
    break;
  }
  let right = end;
  for (;;) {
    const m = /^[ \t]+([\p{L}\p{N}]+)/u.exec(text.slice(right, right + 80));
    if (!m || !isCapitalized(m[1])) break;
    right += m[0].length;
    if (ours(m[1])) continue;
    out.push(m[1]);
    break;
  }
  return out;
}

/** Whether the word right before or after a span is one of `ours` (so a
 *  single matched word at a sentence start still reads as part of a name:
 *  "Timah Tbk mencatat …"). */
function hasOwnNeighbour(text: string, start: number, end: number, ours: (word: string) => boolean): boolean {
  const before = /([\p{L}\p{N}]+)[ \t]+$/u.exec(text.slice(Math.max(0, start - 80), start));
  const after = /^[ \t]+([\p{L}\p{N}]+)/u.exec(text.slice(end, end + 80));
  return Boolean((before && ours(before[1])) || (after && isCapitalized(after[1]) && ours(after[1])));
}

/**
 * A registry name as a name, not as a word. On 2026-09-24 the production
 * queue matched "bukit" in PT Bukit Uluwatu Villa, "rakyat indonesia" in
 * Asosiasi Petani Tebu Rakyat Indonesia, "central" in PT Yogya Central
 * Terpadu and in "central counterparty clearing", "mandiri" in "Kota
 * Mandiri", and "timah" the commodity. A mention counts only when
 *
 * - every matched word is capitalised, as a name is written;
 * - the capitalised words around it are all words of this company's recorded
 *   name or legal forms (PT, Tbk, Persero) — otherwise it is part of some
 *   other proper name;
 * - a lone word does not open a sentence, where every word is capitalised.
 *
 * Headlines written in Title Case fail the second test; the article body,
 * which names the company in full, is what matches.
 */
function nameMatcher(alias: string, own: ReadonlySet<string>): (text: string) => boolean {
  const pattern = new RegExp(phrasePattern(alias).source, "giu");
  return (text) => {
    for (const hit of text.matchAll(pattern)) {
      const start = hit.index ?? 0;
      const end = start + hit[0].length;
      const words = hit[0].split(/[\s-]+/u).filter(Boolean);
      if (!words.every(isCapitalized)) continue;
      const ours = (word: string) => own.has(bareWord(word)) || LEGAL_TOKENS.has(word.toLowerCase());
      if (foreignNeighbours(text, start, end, ours).length) continue;
      if (words.length === 1 && atSentenceStart(text, start) && !hasOwnNeighbour(text, start, end, ours)) continue;
      return true;
    }
    return false;
  };
}

/**
 * Which derived aliases can stand for a company in news text, and how each
 * is tested. `SYMBOL_ALIASES` serves reader questions as well, where "asia"
 * or "resources" typed alone may well mean the issuer; news prose uses those
 * words for everything else. So here:
 *
 * - an acronym of the name, whatever its length, reads like a ticker —
 *   capitals only;
 * - the squashed name ("bukitasam") is unambiguous as it stands;
 * - a phrase counts only when it opens the recorded name ("bank rakyat",
 *   never "rakyat indonesia", which is also a farmers' association);
 * - a single word counts only when it is the name's first distinctive word
 *   ("central" for Bank Central Asia, never "asia").
 *
 * Phrases and words both go through `nameMatcher`.
 */
interface AliasMatcher {
  alias: string;
  term: string;
  /** Acronyms are judged by their capitals, not by how often a word appears. */
  acronym: boolean;
  test: (text: string) => boolean;
}

function aliasMatchers(symbol: SymbolCode, name: string | undefined, aliases: string[]): AliasMatcher[] {
  const tokens = name ? registryNameTokens(name) : [];
  if (!tokens.length) return [];
  const own = new Set(tokens);
  const acronym = tokens.map((token) => token[0]).join("");
  const squashed = tokens.join("");
  const head = tokens.find((token) => token !== symbol.toLowerCase() && aliases.includes(token));
  const out: AliasMatcher[] = [];
  for (const alias of aliases) {
    if (alias === symbol.toLowerCase()) continue;
    const words = alias.split(" ");
    if (alias === acronym) {
      out.push({ alias, term: alias.toUpperCase(), acronym: true, test: fromPattern(codePattern(alias)) });
    } else if (alias === squashed && words.length === 1 && !own.has(alias)) {
      out.push({ alias, term: alias, acronym: false, test: fromPattern(phrasePattern(alias)) });
    } else if (words.length > 1 && words.every((word, i) => tokens[i] === word)) {
      out.push({ alias, term: alias, acronym: false, test: nameMatcher(alias, own) });
    } else if (words.length === 1 && alias === head) {
      out.push({ alias, term: alias, acronym: false, test: nameMatcher(alias, own) });
    }
  }
  return out;
}

function buildMatchers(ctx: TriageContext, corpus: string[], t: ResolvedThresholds): Matcher[] {
  const companies = ctx.companies ?? registryCompanies;
  const aliases = ctx.aliases ?? SYMBOL_ALIASES;
  const judgeShare = corpus.length >= t.webWatchAliasMinCorpus;
  const matchers: Matcher[] = [];
  for (const company of companies) {
    matchers.push({ symbol: company.symbol, by: "symbol", term: company.symbol, test: fromPattern(codePattern(company.symbol)) });
    for (const { term, acronym, test } of aliasMatchers(company.symbol, company.name, aliases[company.symbol] ?? [])) {
      // A name the queue writes in a large share of its items is being used
      // as an ordinary word there, whatever its shape.
      if (judgeShare && !acronym) {
        const share = corpus.filter(test).length / corpus.length;
        if (share > t.webWatchAliasMaxDocShare) continue;
      }
      matchers.push({ symbol: company.symbol, by: "name", term, test });
    }
    matchers.push({ symbol: company.symbol, by: "sector", term: company.sector, test: fromPattern(phrasePattern(company.sector)) });
    if (company.subsector && company.subsector !== company.sector) {
      matchers.push({ symbol: company.symbol, by: "subsector", term: company.subsector, test: fromPattern(phrasePattern(company.subsector)) });
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
  suspected: "sudah ada di tab rumor",
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
  const bySentences: Array<{ event: MarketEvent; where: SeenWhere; keys: Set<string> }> = [];
  const remember = (event: MarketEvent, where: SeenWhere) => {
    if (!isStructured(event)) {
      const title = normalizeTitle(event.title);
      if (title && !byTitle.has(title)) byTitle.set(title, { event, where });
      const keys = sentenceKeys(event, t.webWatchProseSentenceMinWords);
      if (keys.size >= t.webWatchDuplicateMinSentences) bySentences.push({ event, where, keys });
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
    //    A republished copy: new title or view counter, same sentences.
    if (!structured) {
      const keys = sentenceKeys(candidate, t.webWatchProseSentenceMinWords);
      if (keys.size >= t.webWatchDuplicateMinSentences) {
        for (const prior of bySentences) {
          if (prior.event.id === candidate.id) continue;
          let shared = 0;
          for (const key of keys) if (prior.keys.has(key)) shared += 1;
          const share = shared / Math.min(keys.size, prior.keys.size);
          if (share < t.webWatchDuplicateSentenceShare) continue;
          return {
            verdict: "archive",
            rule: "duplicate",
            reason: `Duplikat: ${fmt(shared)} dari ${fmt(Math.min(keys.size, prior.keys.size))} kalimat isinya sama dengan "${prior.event.title.slice(0, 120)}", yang ${WHERE_LABEL[prior.where]} (ambang ${fmt(Math.round(t.webWatchDuplicateSentenceShare * 100))}%).`,
          };
        }
      }
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
      if (matcher.test(text)) evidence.push({ symbol: matcher.symbol, by: matcher.by, term: matcher.term });
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
