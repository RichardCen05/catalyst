import type { Citation, SymbolCode, UserProfile } from "@/lib/types";

/**
 * Every page a reader can ask from.
 *
 * Used as a ranking prior and never as a filter. A reader on the dashboard
 * asking about the causal map must still reach it, so the current view can
 * only ever move an entry up a ranking it already entered.
 */
export type ViewId =
  | "dashboard"
  | "cases"
  | "case"
  | "company"
  | "companies"
  | "compare"
  | "impact"
  | "pantau"
  | "playbook"
  | "method"
  | "agent"
  | "ai-learning"
  | "copilot";

export const VIEW_IDS: readonly ViewId[] = [
  "dashboard", "cases", "case", "company", "companies", "compare",
  "impact", "pantau", "playbook", "method", "agent", "ai-learning", "copilot",
];

export type EntryKind =
  | "case"
  | "chrome"
  | "event"
  | "metric"
  | "endpoint"
  | "causal-node"
  | "threshold"
  | "view";

export interface HistoryTurn {
  role: "user" | "assistant";
  text: string;
  /** The symbols an assistant turn put in front of the reader, so the next
   *  turn's "yang satunya" has a list to point into. Client-supplied, so
   *  every symbol is checked against the registry before it selects
   *  anything, and none of them may ever become a figure. */
  symbols?: SymbolCode[];
}

export interface RequestContext {
  profile: UserProfile;
  contextSymbol?: SymbolCode;
  view?: ViewId;
  history: HistoryTurn[];
}

/**
 * One entry's material, written out for the prompt.
 *
 * `figures` is the allowlist the verifier checks a draft against, so it holds
 * every numeral this bundle puts in front of the model and nothing else. A
 * figure that reaches the model without appearing here costs the reader the
 * whole answer, because the verifier will reject the draft that quotes it.
 */
export interface ContextBundle {
  id: string;
  kind: EntryKind;
  /** The page this material belongs to, when it belongs to one. A chrome
   *  block sets it so its page's material is fetched once for the whole
   *  answer rather than repeated under every panel that matched. */
  view?: ViewId;
  title: string;
  body: string;
  figures: string[];
  citations: Citation[];
  symbols: SymbolCode[];
}

/**
 * One searchable thing the app serves.
 *
 * `terms` is derived from the registries, never typed by hand — the same
 * discipline as `SYMBOL_ALIASES` in `lib/agent/query.ts`, and for the same
 * reason: a hand-kept alias list rots by omission, and adding a feed is not
 * what breaks it.
 *
 * `load` is lazy because scoring touches every entry's terms while only the
 * winners are worth materializing into prompt text. It answers `null` when the
 * entry has nothing of its own to say in this request's context — a page that
 * only exists with a parameter the request did not carry. Borrowing another
 * entry's bundle instead would collide with that entry's id, and
 * `retrieveContext` drops a repeated id without a trace.
 */
export interface CorpusEntry {
  id: string;
  kind: EntryKind;
  terms: string[];
  symbols: SymbolCode[];
  view?: ViewId;
  load(context: RequestContext): Promise<ContextBundle | null>;
}
