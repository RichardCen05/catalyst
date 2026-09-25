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
import { sourceFor } from "@/lib/web-watch/triage";
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

export function screenWindows(body: string, t: ResolvedThresholds = resolveThresholds()): ProseWindow[] {
  return proseWindows(body, {
    maxWindows: t.webWatchNliMaxWindows,
    minWords: t.webWatchProseSentenceMinWords,
    maxChars: t.webWatchNliWindowChars,
  });
}

export function screenItem(
  event: MarketEvent,
  input: { symbols: SymbolCode[]; lang: SourceLang; sourceId?: string | null; matchedBy?: unknown[]; hasProposal?: boolean; noAuto?: boolean },
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
    windows: screenWindows(body, t),
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
  const items = queue.pending.map((event) => {
    const match = queue.matches[event.id];
    return screenItem(
      event,
      {
        symbols: match?.symbols ?? [],
        lang: langOf(event.id, sources),
        sourceId: sourceFor(event.id, sources)?.id ?? null,
        matchedBy: match?.matchedBy ?? [],
        hasProposal: Boolean(queue.proposals[event.id]),
        noAuto: Boolean(match?.noAuto),
      },
      t,
    );
  });
  return { items, thresholds: screenThresholds(t) };
}
