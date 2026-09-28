/**
 * What the NLI screen reads for each pending item.
 *
 * The Python runner (`scripts/screen/screen.py`) is a dumb executor: it never
 * builds windows, picks a language or writes a hypothesis. Everything it
 * scores comes from here, rendered from the TypeScript tables, so the sentence
 * splitter, the hypothesis table and the thresholds each exist once. The decide
 * route's `GET` answers with `screenPayload`; the offline replay dumps the same
 * payload from a local queue copy (`tests/web-watch-screen-payload.test.ts`).
 */

import { resolveThresholds, type ResolvedThresholds } from "@/lib/agent/thresholds";
import { titleFromUrl } from "@/lib/web-watch/fetching";
import { DEFAULT_SOURCE_LANG, renderHypotheses, type RenderedHypotheses } from "@/lib/web-watch/hypotheses";
import type { ReviewQueue } from "@/lib/web-watch/queue";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { sentences, sourceFor } from "@/lib/web-watch/triage";
import type { SourceLang, TitleSource, WatchedSource, WebWatchCandidate } from "@/lib/web-watch/types";
import { proseWindows, type ProseWindow } from "@/lib/web-watch/windows";
import type { MarketEvent, SymbolCode } from "@/lib/types";

export interface ScreenItem {
  id: string;
  title: string;
  titleSource: TitleSource | null;
  body: string;
  publishedAt: string;
  sourceId: string | null;
  lang: SourceLang;
  symbols: SymbolCode[];
  matchedBy: unknown[];
  hasProposal: boolean;
  noAuto: boolean;
  windows: ProseWindow[];
  hypotheses: RenderedHypotheses;
}

export interface ScreenPayload {
  items: ScreenItem[];
  thresholds: { decideMinConfidence: number; strictFloor: number; calibrationMinLabels: number; residualMaxShare: number };
}

/** Where the headline came from. Items stored before the field existed are
 *  recognised by a title that is the address's own tail. */
export function titleSourceOf(event: MarketEvent): TitleSource | null {
  const stored = (event as WebWatchCandidate).titleSource;
  if (stored) return stored;
  const url = event.citations[0]?.url;
  return url && event.title === titleFromUrl(url).slice(0, 200) ? "url" : null;
}

/** The source's declared language. A registry entry written before `lang`
 *  existed falls back to its seed, then to the default. */
export function langOf(candidateId: string, sources: WatchedSource[]): SourceLang {
  const source = sourceFor(candidateId, sources) ?? sourceFor(candidateId, SEED_SOURCES);
  if (source?.lang) return source.lang;
  return SEED_SOURCES.find((seed) => seed.id === source?.id)?.lang ?? DEFAULT_SOURCE_LANG;
}

export function screenWindows(body: string, t: ResolvedThresholds = resolveThresholds(), skip?: ReadonlySet<string>): ProseWindow[] {
  return proseWindows(body, {
    maxWindows: t.webWatchNliMaxWindows,
    minWords: t.webWatchProseSentenceMinWords,
    maxChars: t.webWatchNliWindowChars,
    ...(skip?.size ? { skip } : {}),
  });
}

/**
 * Sentences each source repeats across its pending items. A site's own text
 * — a menu description, an accessibility link, a closing line on every
 * release — ends like a sentence and passes the prose test, so on bi.go.id it
 * filled every item's first window and the screen judged the menu. The same
 * sentence in several different items from one source is the site talking,
 * not the news.
 */
export function sourceBoilerplate(
  items: Array<{ sourceId: string | null; body: string }>,
  t: ResolvedThresholds = resolveThresholds(),
): Map<string, Set<string>> {
  const seen = new Map<string, Map<string, number>>();
  for (const { sourceId, body } of items) {
    if (!sourceId) continue;
    const counts = seen.get(sourceId) ?? new Map<string, number>();
    for (const sentence of new Set(sentences(body, t.webWatchProseSentenceMinWords))) counts.set(sentence, (counts.get(sentence) ?? 0) + 1);
    seen.set(sourceId, counts);
  }
  return new Map(
    [...seen].map(([sourceId, counts]) => [sourceId, new Set([...counts].filter(([, n]) => n >= t.webWatchBoilerplateMinItems).map(([sentence]) => sentence))]),
  );
}

export function screenItem(
  event: MarketEvent,
  input: { symbols: SymbolCode[]; lang: SourceLang; sourceId?: string | null; matchedBy?: unknown[]; hasProposal?: boolean; noAuto?: boolean; skip?: ReadonlySet<string> },
  t: ResolvedThresholds = resolveThresholds(),
): ScreenItem {
  const titleSource = titleSourceOf(event);
  const body = event.body ?? "";
  return {
    id: event.id,
    title: event.title,
    titleSource,
    body,
    publishedAt: event.publishedAt,
    sourceId: input.sourceId ?? null,
    lang: input.lang,
    symbols: input.symbols,
    matchedBy: input.matchedBy ?? [],
    hasProposal: input.hasProposal ?? false,
    noAuto: input.noAuto ?? false,
    windows: screenWindows(body, t, input.skip),
    hypotheses: renderHypotheses({ title: event.title, titleIsUrl: titleSource === "url", symbols: input.symbols, lang: input.lang }),
  };
}

export function screenThresholds(t: ResolvedThresholds = resolveThresholds()): ScreenPayload["thresholds"] {
  return {
    decideMinConfidence: t.webWatchDecideMinConfidence,
    strictFloor: t.webWatchNliStrictFloor,
    calibrationMinLabels: t.webWatchCalibrationMinLabels,
    residualMaxShare: t.webWatchResidualMaxShare,
  };
}

export function screenPayload(queue: ReviewQueue, sources: WatchedSource[], t: ResolvedThresholds = resolveThresholds()): ScreenPayload {
  const sourceIds = new Map(queue.pending.map((event) => [event.id, sourceFor(event.id, sources)?.id ?? null]));
  const boilerplate = sourceBoilerplate(queue.pending.map((event) => ({ sourceId: sourceIds.get(event.id) ?? null, body: event.body ?? "" })), t);
  const items = queue.pending.map((event) => {
    const match = queue.matches[event.id];
    const sourceId = sourceIds.get(event.id) ?? null;
    return screenItem(
      event,
      {
        symbols: match?.symbols ?? [],
        lang: langOf(event.id, sources),
        sourceId,
        ...(sourceId && boilerplate.get(sourceId)?.size ? { skip: boilerplate.get(sourceId) } : {}),
        matchedBy: match?.matchedBy ?? [],
        hasProposal: Boolean(queue.proposals[event.id]),
        noAuto: Boolean(match?.noAuto),
      },
      t,
    );
  });
  return { items, thresholds: screenThresholds(t) };
}
