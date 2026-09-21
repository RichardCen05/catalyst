import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import type { ChatAnswer } from "@/lib/types";

export type HandlerId = ChatAnswer["intent"];

/**
 * What a handler is allowed to score on.
 *
 * Read the field that is missing: there is no signal for "a chip or the route
 * supplied a subject". That omission is the point of this module.
 */
export interface HandlerSignals {
  /** The question itself named a symbol. A chip or route does not set this. */
  symbolNamedInQuestion: boolean;
  /** The question named a figure on screen, or a response field. */
  figureNamedInQuestion: boolean;
  /** A phrase class matched without typo tolerance. */
  exactPhrase: boolean;
  /** A phrase class matched only through `phraseMatches` typo tolerance. */
  fuzzyPhrase: boolean;
  /** The evidence this handler needs actually exists. */
  evidenceReady: boolean;
  /** Retrieval's own top entry score, for the retrieved handler only. */
  retrievalScore?: number;
}

/**
 * How confident a handler is that it answers THIS question.
 *
 * The rule that matters is the one that is absent: a subject supplied by the
 * case chip or the route contributes nothing.
 *
 * Both branches this replaces scored on a phrase alone and then took their
 * subject from the chip. On a case page any question containing "kenapa"
 * returned that case's why-listed summary, and any question containing
 * "dampak" returned some recorded event's impact path — including questions
 * about an entirely different page. The reader saw a confident answer to a
 * question they had not asked, with citations attached to it.
 *
 * A chip may supply a subject. It may never justify a handler.
 */
export function handlerScore(signals: HandlerSignals): number {
  if (!signals.evidenceReady) return 0;
  if (signals.retrievalScore !== undefined) return signals.retrievalScore;
  let score = 0;
  if (signals.symbolNamedInQuestion) score += 0.35;
  if (signals.figureNamedInQuestion) score += 0.35;
  // A specific phrase is sufficient on its own. "apa sumber datamu" on a case
  // page is a real provenance question, and the chip only resolves which case
  // it is about — that is the chip supplying a subject, not justifying a
  // handler. What stops a generic phrase from answering about the wrong topic
  // is `evidenceReady`, not this weight: event-impact demands a resolved
  // event, and why-listed demands the question to have named the symbol.
  if (signals.exactPhrase) score += 0.35;
  else if (signals.fuzzyPhrase) score += 0.15;
  return score;
}

export function clearsFloor(score: number): boolean {
  return score >= DEFAULT_THRESHOLDS.handlerScoreFloor;
}

export interface Candidate {
  id: HandlerId;
  score: number;
}

/**
 * The handler that answers, or none.
 *
 * Ties keep the order the caller listed, which is the old sequence — so where
 * two handlers are equally confident, behaviour matches what shipped before.
 */
export function selectHandler(candidates: Candidate[]): Candidate | null {
  let best: Candidate | null = null;
  for (const candidate of candidates) {
    if (!best || candidate.score > best.score) best = candidate;
  }
  return best && clearsFloor(best.score) ? best : null;
}
