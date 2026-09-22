import { getCorpus, type CorpusIndex } from "@/lib/agent/retrieval/corpus";
import { findSymbolsRobust, normalizeQuery } from "@/lib/agent/query";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { companies } from "@/lib/data/fixtures";
import type { CorpusEntry, RequestContext } from "@/lib/agent/retrieval/types";

/** Which kind of entry answers more of a question, when two match equally. */
const KIND_RANK: Record<import("@/lib/agent/retrieval/types").EntryKind, number> = {
  view: 0,
  case: 1,
  event: 2,
  "causal-node": 3,
  metric: 4,
  threshold: 5,
  endpoint: 6,
  chrome: 7,
};

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

/**
 * Generic words that must not decide which entry a question is about.
 *
 * The second row is how a reader points at something on screen rather than
 * what they are pointing at. "halaman Pantau isinya apa" is a question about
 * Pantau, but "halaman" also appears in the dashboard's own vocabulary, and
 * indexing it let the generic half of the question outvote the specific half.
 */
const QUESTION_WORDS = new Set([
  "apa", "apakah", "kenapa", "mengapa", "bagaimana", "berapa", "kapan", "dimana",
  "mana", "jelaskan", "ceritakan", "tolong", "coba", "bisa", "dong", "sih",
  "what", "why", "how", "when", "where", "which", "explain", "tell", "please",
  "halaman", "laman", "panel", "bagian", "layar", "menu", "tombol", "tulisan",
  "page", "screen", "section", "button", "label", "isinya", "maksud", "arti", "artinya",
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
  // A tie is decided by how much of an answer the entry is. "halaman Pantau
  // isinya apa" matches the Pantau page and a button reading "Pantau
  // indikator" equally well on words alone, and the page is what was asked
  // for: it describes the panels, while a panel cannot describe its page.
  // Without this the winner was whichever kind the corpus happened to list
  // first, which is not a reason for anything.
  return scored.sort((first, second) =>
    second.score - first.score || KIND_RANK[first.entry.kind] - KIND_RANK[second.entry.kind]);
}

/** The best score any entry reached, or 0. What the retrieved handler bids with. */
export function topScore(ranked: ScoredEntry[]): number {
  return ranked[0]?.score ?? 0;
}
