import { companies } from "@/lib/data/fixtures";
import { findSymbolsRobust, normalizeQuery } from "@/lib/agent/query";
import type { HistoryTurn } from "@/lib/agent/retrieval/types";
import type { SymbolCode } from "@/lib/types";

/**
 * What a follow-up was pointing at, decided by rule rather than by model.
 *
 * A second model call to rewrite the question would be down exactly when the
 * daily gate closes, and would add nondeterminism to the one class of
 * question that can be settled exactly. The rules here are closed and few:
 * they resolve a pointer or they say they could not, and the caller answers
 * with the menu rather than guessing.
 */
export interface FollowUp {
  /** The question with the referent named, or the question unchanged. */
  question: string;
  /** The symbol the pointer resolved to, when it resolved. */
  symbol?: SymbolCode;
  /** The question points at something an earlier turn said. */
  anaphoric: boolean;
  /** The pointer found its referent. `anaphoric` without this is the menu. */
  resolved: boolean;
}

/**
 * Pointers that mean nothing on their own.
 *
 * "yang satunya" is not a question about anything unless a previous turn
 * listed more than one thing, so it counts as a pointer even when the list
 * is missing — that is precisely the case the reader has to be told about.
 */
const STANDALONE_POINTERS = ["yang satunya", "satunya lagi", "yang satu lagi", "satunya"];

/**
 * Pointers that are ordinary words until a list exists.
 *
 * "apa pilar pertama" on a first turn is a plain question. Treating it as a
 * dangling pointer would replace a real answer with a menu, so these count
 * only when an earlier turn actually offered candidates.
 */
const ORDINAL_POINTERS: Array<[string[], number]> = [
  [["yang pertama", "pertama"], 0],
  [["yang kedua", "kedua"], 1],
  [["yang ketiga", "ketiga"], 2],
];
const VAGUE_POINTERS = ["yang itu", "itu tadi", "yang tadi", "tersebut", "tadi", "itu"];

/**
 * Pronouns that have no meaning without a referent.
 *
 * "kenapa dia naik" names nothing. Unlike the vague pointers above it is not
 * an ordinary word in any other reading, so it counts as a pointer even when
 * no earlier turn offered a candidate — which is exactly the case that has to
 * end in a question back to the reader rather than in an answer about
 * whichever entry ranked first.
 */
const PRONOUN_POINTERS = ["dia", "ia", "mereka", "beliau"];

/** The symbols the most recent assistant turn put in front of the reader. */
function candidatesFrom(history: HistoryTurn[]): SymbolCode[] {
  const known = new Set(companies.map((company) => company.symbol));
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.role !== "assistant") continue;
    // Validated against the registry, never trusted: history is client text,
    // and a symbol invented there must not select an entry.
    const symbols = (turn.symbols ?? []).filter((symbol) => known.has(symbol));
    if (symbols.length) return [...new Set(symbols)];
  }
  return [];
}

function containsPhrase(normalized: string, phrase: string): boolean {
  return ` ${normalized} `.includes(` ${phrase} `);
}

export function resolveFollowUp(question: string, history: HistoryTurn[]): FollowUp {
  const unchanged: FollowUp = { question, anaphoric: false, resolved: false };
  // A question that names its own subject is not pointing at an earlier turn,
  // whatever else it says.
  if (findSymbolsRobust(question, companies.map((company) => company.symbol)).length) return unchanged;

  const normalized = normalizeQuery(question);
  const candidates = candidatesFrom(history);

  const standalone = STANDALONE_POINTERS.some((phrase) => containsPhrase(normalized, phrase));
  const ordinal = ORDINAL_POINTERS.find(([phrases]) => phrases.some((phrase) => containsPhrase(normalized, phrase)));
  const vague = VAGUE_POINTERS.some((phrase) => containsPhrase(normalized, phrase));
  const pronoun = PRONOUN_POINTERS.some((phrase) => containsPhrase(normalized, phrase));

  // Ordinals and vague words are pointers only once there is something to
  // point at; a standalone pointer or a bare pronoun is one either way.
  const anaphoric = standalone || pronoun || (Boolean(ordinal || vague) && candidates.length > 0);
  if (!anaphoric) return unchanged;

  const picked = pick({ standalone, ordinalIndex: ordinal?.[1], vague: vague || pronoun, candidates });
  if (!picked) return { question, anaphoric: true, resolved: false };
  // Naming the referent is the whole rewrite. The symbol reaches retrieval as
  // a word in the question, which is how every other question names one — it
  // selects entries and can never become a figure, because figures are read
  // from the loaded bundles alone.
  return { question: `${question} ${picked}`, symbol: picked, anaphoric: true, resolved: true };
}

function pick(input: {
  standalone: boolean;
  ordinalIndex?: number;
  vague: boolean;
  candidates: SymbolCode[];
}): SymbolCode | undefined {
  const { standalone, ordinalIndex, vague, candidates } = input;
  // "the other one" is the second thing on the list. With one candidate there
  // is no other one, and saying so is more use than naming the only one.
  if (standalone) return candidates.length >= 2 ? candidates[1] : undefined;
  if (ordinalIndex !== undefined) return candidates[ordinalIndex];
  // "itu" with several candidates is genuinely ambiguous, and the reader is
  // the only one who knows which. Guessing here is how an answer ends up
  // about the wrong issuer while sounding certain.
  if (vague) return candidates.length === 1 ? candidates[0] : undefined;
  return undefined;
}
