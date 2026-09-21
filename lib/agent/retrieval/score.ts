import { getCorpus, type CorpusIndex } from "@/lib/agent/retrieval/corpus";
import { findSymbolsRobust, normalizeQuery } from "@/lib/agent/query";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { companies } from "@/lib/data/fixtures";
import type { CorpusEntry, RequestContext } from "@/lib/agent/retrieval/types";

export interface ScoredEntry {
  entry: CorpusEntry;
  score: number;
}

/**
 * Two priors, both additive, both small enough to reorder rather than decide.
 *
 * The page prior is the one that matters. It is deliberately not a filter: a
 * reader on the dashboard asking about the causal map must reach it, and a
 * reader on the causal map asking about one emiten must reach that. The page
 * can only move an entry up a ranking the question already put it in.
 */
const VIEW_BOOST = 0.12;
const SYMBOL_BOOST = 0.25;

/** Generic question words that must not decide which entry a question is about. */
const QUESTION_WORDS = new Set([
  "apa", "apakah", "kenapa", "mengapa", "bagaimana", "berapa", "kapan", "dimana",
  "mana", "jelaskan", "ceritakan", "tolong", "coba", "bisa", "dong", "sih",
  "what", "why", "how", "when", "where", "which", "explain", "tell", "please",
]);

/**
 * Which recorded entries a question is about.
 *
 * The inverted term map means this touches only entries sharing a word with
 * the question rather than the whole corpus, so cost tracks the question's
 * length and not the recording count.
 *
 * Score is the share of the question's content words an entry carries. A
 * multi-word term the question contains whole counts for each of its words,
 * because "peta sebab akibat" appearing in full is a much stronger signal than
 * "peta" appearing alone.
 */
export function scoreCorpus(
  question: string,
  context: RequestContext,
  index: CorpusIndex = getCorpus(),
): ScoredEntry[] {
  const normalized = normalizeQuery(question);
  const words = normalized
    .split(" ")
    .filter((word) => word.length >= 3 && !QUESTION_WORDS.has(word));
  if (!words.length) return [];

  const symbols = findSymbolsRobust(question, companies.map((company) => company.symbol));
  const hits = new Map<string, number>();
  const add = (id: string, weight: number) => hits.set(id, (hits.get(id) ?? 0) + weight);

  for (const word of new Set(words)) {
    for (const id of index.byTerm.get(word) ?? []) add(id, 1);
  }
  for (const [term, ids] of index.byTerm) {
    if (!term.includes(" ") || !normalized.includes(term)) continue;
    for (const id of ids) add(id, term.split(" ").length);
  }

  const scored: ScoredEntry[] = [];
  for (const [id, overlap] of hits) {
    const entry = index.byId.get(id);
    if (!entry) continue;
    let score = overlap / words.length;
    if (symbols.length && entry.symbols.some((symbol) => symbols.includes(symbol))) score += SYMBOL_BOOST;
    if (context.view && entry.view === context.view) score += VIEW_BOOST;
    if (score >= DEFAULT_THRESHOLDS.retrievalScoreFloor) scored.push({ entry, score });
  }
  return scored.sort((first, second) => second.score - first.score);
}

/** The best score any entry reached, or 0. What the retrieved handler bids with. */
export function topScore(ranked: ScoredEntry[]): number {
  return ranked[0]?.score ?? 0;
}
