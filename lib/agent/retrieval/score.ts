import { getCorpus, type CorpusIndex } from "@/lib/agent/retrieval/corpus";
import { expandEnclitics, findSymbolsRobust, mentionsReader, normalizeQuery } from "@/lib/agent/query";
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
  /** What the handler bids with: overlap plus every prior. */
  score: number;
  /** Overlap alone, before any prior. Ranking is decided on this first, so a
   *  prior can lift an entry over the answer floor but can never move it
   *  above an entry that matched more of the question. */
  raw: number;
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
 * The page the question named, which outranks the page the reader is on.
 *
 * "apa isi dashboard" asked from the causal map tied on words with a news
 * event — both carried one of the two content words — and the page prior then
 * broke the tie for the event, because the event belongs to the page the
 * reader happened to be standing on. The answer described the dashboard using
 * a spike in TLKM coverage.
 *
 * Naming a page is a stronger signal than standing on one, so it is worth
 * more. It is still additive and still cannot move an entry above one that
 * matched more of the question.
 */
const NAMED_VIEW_BOOST = VIEW_BOOST * 2;

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
  "page", "screen", "section", "button", "label", "isi", "isinya", "berisi",
  "maksud", "arti", "artinya",
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
  // Both the written form and its stem. A reader who owns a thing says so —
  // "pantauanku", "kasusku" — and neither word is in any index, so the
  // question reached nothing at all. The original stays, so a page that
  // spells the long form still matches it whole.
  const words = expandEnclitics(normalized.split(" "))
    .filter((word) => word.length >= 3 && !QUESTION_WORDS.has(word));
  if (!words.length) return [];

  const symbols = findSymbolsRobust(question, companies.map((company) => company.symbol));
  // A third prior, and the same rule as the other two: it moves an entry up a
  // ranking the question already put it in. A reader who says "kasusku" is
  // asking about their list; a reader who says "berapa emiten terekam" is
  // not, and nothing here stops the second question reaching registry
  // material — there is no penalty on the other side.
  const scoped = mentionsReader(question);
  const hits = new Map<string, number>();
  const add = (id: string, weight: number) => hits.set(id, (hits.get(id) ?? 0) + weight);

  for (const word of new Set(words)) {
    for (const id of index.byTerm.get(word) ?? []) add(id, 1);
  }
  for (const [term, ids] of index.byTerm) {
    if (!term.includes(" ") || !normalized.includes(term)) continue;
    for (const id of ids) add(id, term.split(" ").length);
  }

  // Which pages the question named, read off the page entries themselves so a
  // renamed page renames the signal with it.
  const namedViews = new Set<string>();
  for (const [id, overlap] of hits) {
    if (!overlap) continue;
    const entry = index.byId.get(id);
    if (entry?.kind === "view" && entry.view) namedViews.add(entry.view);
  }

  // One slip of the finger must not change which page the answer is about.
  //
  // "apa isi dashbord" reached no term at all, so the page bundle never
  // entered the prompt and the answer was written from whichever recordings
  // shared a word with the rest of the sentence. Only page names are matched
  // this loosely, and only within one edit: a page is a closed, short list of
  // words the reader is trying to type, unlike a company name or a figure.
  if (!namedViews.size) {
    for (const word of new Set(words)) {
      if (word.length < 5) continue;
      for (const [term, ids] of index.byTerm) {
        if (term.includes(" ") || Math.abs(term.length - word.length) > 1) continue;
        if (!withinOneEdit(word, term)) continue;
        for (const id of ids) {
          const entry = index.byId.get(id);
          if (entry?.kind !== "view" || !entry.view) continue;
          add(id, 1);
          namedViews.add(entry.view);
        }
      }
    }
  }

  const scored: ScoredEntry[] = [];
  for (const [id, overlap] of hits) {
    const entry = index.byId.get(id);
    if (!entry) continue;
    const raw = overlap / words.length;
    let score = raw;
    if (symbols.length && entry.symbols.some((symbol) => symbols.includes(symbol))) score += SYMBOL_BOOST;
    if (context.view && entry.view === context.view) score += VIEW_BOOST;
    if (entry.view && namedViews.has(entry.view)) score += NAMED_VIEW_BOOST;
    if (scoped && entry.scope === "user") score += DEFAULT_THRESHOLDS.retrievalScopeBoost;
    if (score >= DEFAULT_THRESHOLDS.retrievalScoreFloor) scored.push({ entry, score, raw });
  }
  // A tie is decided by how much of an answer the entry is. "halaman Pantau
  // isinya apa" matches the Pantau page and a button reading "Pantau
  // indikator" equally well on words alone, and the page is what was asked
  // for: it describes the panels, while a panel cannot describe its page.
  // Without this the winner was whichever kind the corpus happened to list
  // first, which is not a reason for anything.
  // Overlap decides the order; the priors decide whether the winner is
  // confident enough to answer at all. Without this split, "menurutku ada
  // berapa emiten yang punya kasus lengkap" — a registry question with a
  // conversational "-ku" in it — had the reader's own list lifted over the
  // coverage entry that matched twice as much of it, and was answered with
  // the wrong denominator. A prior that can do that is a filter wearing a
  // prior's name.
  return scored.sort((first, second) =>
    second.raw - first.raw
    || second.score - first.score
    || KIND_RANK[first.entry.kind] - KIND_RANK[second.entry.kind]);
}

/**
 * Whether two words differ by at most one insertion, deletion or substitution.
 *
 * Written out rather than pulled from a library because it runs inside the
 * ranking loop and only ever needs the "one edit" answer, never the distance.
 */
function withinOneEdit(first: string, second: string): boolean {
  if (first === second) return true;
  const [shorter, longer] = first.length <= second.length ? [first, second] : [second, first];
  if (longer.length - shorter.length > 1) return false;
  let short = 0;
  let long = 0;
  let edits = 0;
  while (short < shorter.length && long < longer.length) {
    if (shorter[short] === longer[long]) {
      short += 1;
      long += 1;
      continue;
    }
    edits += 1;
    if (edits > 1) return false;
    if (shorter.length === longer.length) short += 1;
    long += 1;
  }
  return true;
}

/** The best score any entry reached, or 0. What the retrieved handler bids with. */
export function topScore(ranked: ScoredEntry[]): number {
  return ranked[0]?.score ?? 0;
}
