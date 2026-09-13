/**
 * Find where a claim's text sits inside the source document it was read from.
 *
 * Ported from ReguLens (`api/app/core/citations.py`). Catalyst's sources are
 * news bodies and filing bodies rather than regulation tables, so the
 * table-row identifier fallback in the original module is not ported — there
 * is no row structure here to fall back to.
 *
 * Three outcomes, and the third is a real answer, not a failure:
 *
 *   exact        the claim text appears in the document, whitespace aside
 *   approximate  a long enough run of it aligns with the document
 *   not_found    it could not be located — highlighting the wrong sentence
 *                would be worse than highlighting nothing
 */
import type { SourceSpan } from "@/lib/types";

const MIN_RATIO = 0.6;
const ALIGN_WINDOW = 400;

function normalize(text: string): { normalized: string; offsets: number[] } {
  const out: string[] = [];
  const offsets: number[] = [];
  let previousSpace = true;
  for (let index = 0; index < text.length; index += 1) {
    const character = text[index];
    if (/\s/.test(character)) {
      if (previousSpace) continue;
      out.push(" ");
      offsets.push(index);
      previousSpace = true;
      continue;
    }
    out.push("–—‐‑‒−".includes(character) ? "-" : character.toLowerCase());
    offsets.push(index);
    previousSpace = false;
  }
  return { normalized: out.join(""), offsets };
}

function toOriginalSpan(offsets: number[], start: number, length: number, originalLength: number): [number, number] {
  if (!offsets.length || start >= offsets.length) return [0, 0];
  const endIndex = Math.min(start + length, offsets.length) - 1;
  return [offsets[start], Math.min(offsets[endIndex] + 1, originalLength)];
}

/** Longest common substring between two strings, restricted to given ranges — the browser/Node equivalent of Python's `difflib.SequenceMatcher.find_longest_match`. */
function longestMatch(a: string, b: string): { aStart: number; bStart: number; size: number } {
  let best = { aStart: 0, bStart: 0, size: 0 };
  const bIndex = new Map<string, number[]>();
  for (let j = 0; j < b.length; j += 1) {
    const char = b[j];
    const list = bIndex.get(char);
    if (list) list.push(j);
    else bIndex.set(char, [j]);
  }
  let previousRow = new Array(b.length).fill(0);
  for (let i = 0; i < a.length; i += 1) {
    const currentRow = new Array(b.length).fill(0);
    const positions = bIndex.get(a[i]);
    if (positions) {
      for (const j of positions) {
        const size = (j > 0 ? previousRow[j - 1] : 0) + 1;
        currentRow[j] = size;
        if (size > best.size) best = { aStart: i - size + 1, bStart: j - size + 1, size };
      }
    }
    previousRow = currentRow;
  }
  return best;
}

/** Ratio of matching characters between two strings (approximates `SequenceMatcher.ratio`, recursing on both sides of each match like the original). */
function similarityRatio(a: string, b: string): number {
  if (!a.length && !b.length) return 1;
  let matched = 0;
  const stack: Array<[string, string]> = [[a, b]];
  while (stack.length) {
    const [segmentA, segmentB] = stack.pop()!;
    if (!segmentA.length || !segmentB.length) continue;
    const match = longestMatch(segmentA, segmentB);
    if (!match.size) continue;
    matched += match.size;
    stack.push([segmentA.slice(0, match.aStart), segmentB.slice(0, match.bStart)]);
    stack.push([segmentA.slice(match.aStart + match.size), segmentB.slice(match.bStart + match.size)]);
  }
  return (2 * matched) / (a.length + b.length);
}

/** Where in `documentText` this claim was read from. */
export function locate(documentId: string, documentText: string | null | undefined, claimText: string): SourceSpan {
  const notFound: SourceSpan = { documentId, start: 0, end: 0, match: "not_found" };
  if (!documentText || !claimText) return notFound;

  const { normalized: haystack, offsets } = normalize(documentText);
  const { normalized: needle } = normalize(claimText);
  if (!needle) return notFound;

  const foundAt = haystack.indexOf(needle);
  if (foundAt >= 0) {
    const [start, end] = toOriginalSpan(offsets, foundAt, needle.length, documentText.length);
    return { documentId, start, end, match: "exact" };
  }

  const probe = needle.slice(0, ALIGN_WINDOW);
  const anchor = longestMatch(haystack, probe);
  if (!anchor.size) return notFound;

  const windowStart = Math.max(0, anchor.aStart - anchor.bStart);
  const windowEnd = Math.min(haystack.length, windowStart + Math.floor(probe.length * 1.4) + 8);
  const window = haystack.slice(windowStart, windowEnd);
  if (similarityRatio(window, probe) >= MIN_RATIO) {
    const [start, end] = toOriginalSpan(offsets, windowStart, window.length, documentText.length);
    return { documentId, start, end, match: "approximate" };
  }

  return notFound;
}

/** The cited passage with a little of what surrounds it, for a preview. */
export function snippet(documentText: string, span: SourceSpan, context = 220): string {
  if (span.match === "not_found") return "";
  const start = Math.max(0, span.start - context);
  const end = Math.min(documentText.length, span.end + context);
  const body = documentText.slice(start, end).trim().replace(/\n{3,}/g, "\n\n");
  return (start > 0 ? "… " : "") + body + (end < documentText.length ? " …" : "");
}
