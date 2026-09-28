/**
 * Tolerant text matching, shared by every place a reader types words at
 * Catalyst: the case chat, the compare search, the command palette, the
 * onboarding asset search and the web-watch filter.
 *
 * Every one of those used to be `haystack.includes(needle)`. One dropped
 * letter — "pesert efektif", "free flaot", "ANTMM" — and the app answered
 * that it had nothing, about a figure printed on the same screen or a symbol
 * in the list below the box. Adding more aliases does not fix that: a typo
 * is not a synonym, and a list cannot enumerate misspellings.
 *
 * So matching is tolerant by construction, with three rules that keep it
 * from guessing:
 *
 * 1. Exact matching always runs first. Tolerance only decides what happens
 *    when nothing matched at all, so no exact hit can ever be outranked.
 * 2. Tolerance scales with word length, and short words are exact-only. One
 *    edit away from "hhi" or "beta" is a different term, not a typo.
 * 3. Words are matched word-against-word inside a window of the same size,
 *    so a phrase can never match scattered halves of an unrelated sentence.
 *
 * Transpositions count as one mistake, not two: "flaot" is the single most
 * common way a reader misspells "float".
 */

const WORD_SPLIT = /[^\p{L}\p{N}%]+/u;

export function words(text: string): string[] {
  return text.toLowerCase().split(WORD_SPLIT).filter(Boolean);
}

/**
 * How many mistakes a word of this length is allowed.
 *
 * Four letters and under are exact-only: at that length one edit is usually
 * a different word, not a slip. "what" is one edit from "what's" and "beta"
 * one from "beda", and both of those collisions sent real questions to the
 * wrong answer. Longer words are where typos actually live, and where an
 * edit or two still leaves only one plausible target.
 */
function wordTolerance(typed: string, target: string): number {
  const length = Math.min(typed.length, target.length);
  if (length <= 4) return 0;
  if (length <= 7) return 1;
  return 2;
}

/**
 * Optimal string alignment distance, abandoned as soon as it passes `limit`.
 * The early exit keeps this cheap enough to run per keystroke over a list.
 */
export function editDistanceWithin(candidate: string, target: string, limit: number): number {
  if (limit < 0) return 1;
  if (candidate === target) return 0;
  if (Math.abs(candidate.length - target.length) > limit) return limit + 1;
  let twoBack: number[] = [];
  let previous = Array.from({ length: target.length + 1 }, (_, index) => index);
  for (let row = 1; row <= candidate.length; row += 1) {
    const current = [row];
    let best = row;
    for (let column = 1; column <= target.length; column += 1) {
      const cost = candidate[row - 1] === target[column - 1] ? 0 : 1;
      let distance = Math.min(previous[column] + 1, current[column - 1] + 1, previous[column - 1] + cost);
      const transposed = row > 1 && column > 1
        && candidate[row - 1] === target[column - 2]
        && candidate[row - 2] === target[column - 1];
      if (transposed) distance = Math.min(distance, twoBack[column - 2] + 1);
      current.push(distance);
      if (distance < best) best = distance;
    }
    if (best > limit) return limit + 1;
    twoBack = previous;
    previous = current;
  }
  return previous[target.length];
}

/** One typed word against one expected word, at that word's own tolerance. */
export function wordMatches(typed: string, target: string): boolean {
  if (typed === target) return true;
  const tolerance = wordTolerance(typed, target);
  return tolerance > 0 && editDistanceWithin(typed, target, tolerance) <= tolerance;
}

/**
 * The same comparison for a four-letter token that is known to be a name —
 * a ticker, not a word. "ANTMM" has to reach ANTM, and the first letter has
 * to agree, which is the cheapest guard against ADRO/AMRT-style collisions:
 * readers mistype the end of a code far more often than its first letter.
 */
export function codeMatches(typed: string, target: string): boolean {
  if (wordMatches(typed, target)) return true;
  if (target.length !== 4 || typed[0] !== target[0]) return false;
  return editDistanceWithin(typed, target, 1) <= 1;
}

/**
 * Every word of `target` paired with a distinct word of `window`, in any
 * order. Order-insensitivity is what makes "itu apa" reach the same answer
 * as "apa itu" — a word-order variant is not a different question, and no
 * alias list can hold every permutation.
 */
function windowMatches(window: string[], target: string[]): boolean {
  const taken = new Set<number>();
  return target.every((word) => {
    const index = window.findIndex((candidate, position) => !taken.has(position) && wordMatches(candidate, word));
    if (index === -1) return false;
    taken.add(index);
    return true;
  });
}

/**
 * True when `haystack` contains `phrase`, or something a typo or two away
 * from it. Case-insensitive; either argument may carry padding or casing.
 */
export function phraseMatches(haystack: string, phrase: string): boolean {
  const lower = haystack.toLowerCase();
  const needle = phrase.toLowerCase();
  if (lower.includes(needle)) return true;
  const target = words(needle);
  if (!target.length) return false;
  const typed = words(lower);
  if (!typed.length) return false;
  const joined = target.join("");
  for (let start = 0; start + target.length <= typed.length; start += 1) {
    if (windowMatches(typed.slice(start, start + target.length), target)) return true;
  }
  // Then the same span with its spaces removed, one word wider and one word
  // narrower. Two things need this. A phrase whose typos land in more than
  // one word — "sumbr dta" is two edits from "sumber data" across the pair,
  // and neither word alone is close enough. And a space the reader put in a
  // different place than the label does: "pesertaefektif", "imbalhasil 3
  // hari". Spacing is not a typo the reader can be expected to get right,
  // because the label's own spacing is a choice this app made.
  if (target.length === 1 && joined.length < 5) return false;
  const widest = Math.min(typed.length, target.length + 1);
  for (let size = 1; size <= widest; size += 1) {
    for (let start = 0; start + size <= typed.length; start += 1) {
      const span = typed.slice(start, start + size).join("");
      // One whole word against a squashed phrase forgives the missing space and
      // one slip, no more: "seberapa" is two edits from "sumberapa" and is a
      // word of its own, not "sumber apa" typed badly.
      if (size === 1 && target.length > 1) {
        const tolerance = Math.min(1, wordTolerance(span, joined));
        if (span === joined || (tolerance > 0 && editDistanceWithin(span, joined, tolerance) <= tolerance)) return true;
      } else if (wordMatches(span, joined)) return true;
    }
  }
  return false;
}

/**
 * Search-box matching: every word the reader typed has to appear somewhere
 * in the row, as a prefix or a near-miss. Prefixes matter here and not in
 * the chat — someone typing "ant" into a symbol box is narrowing a list, not
 * misspelling "ANTM".
 */
export function fuzzyIncludes(haystack: string, query: string): boolean {
  const needle = query.trim().toLowerCase();
  if (!needle) return true;
  const lower = haystack.toLowerCase();
  if (lower.includes(needle)) return true;
  const rowWords = words(lower);
  return words(needle).every((typed) =>
    rowWords.some((word) => word.startsWith(typed) || wordMatches(typed, word)));
}
