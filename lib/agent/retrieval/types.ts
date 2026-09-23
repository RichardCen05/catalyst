import type { Citation, InvestorResearchPlaybook, SymbolCode, UserInsight, UserProfile } from "@/lib/types";

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

/**
 * Whose material an entry holds.
 *
 * `user` is material computed for the reader who asked — their watchlist,
 * their open cases. `registry` is material true of every reader, computed
 * over the whole recorded set. Absent means the distinction does not apply.
 *
 * This is a ranking prior and a bookkeeping field, never a filter: a reader
 * asking a registry-wide question from their own page must still be answered
 * about the registry.
 */
export type EntryScope = "user" | "registry";

/**
 * What the request carries into a builder.
 *
 * The analysis fields mirror what `/cases` passes to `analyzeCompany`
 * (`app/cases/page.tsx`), so a scoped bundle and the screen compute the same
 * cases from the same inputs rather than two subtly different ones.
 * `caseResolutions` is deliberately absent: the panel does not send it, so
 * the claim this layer makes is equality of the symbol set, not of the
 * sentence. Sending it is a later decision, with its own schema and bound.
 */
export interface RequestContext {
  profile: UserProfile;
  contextSymbol?: SymbolCode;
  view?: ViewId;
  history: HistoryTurn[];
  playbook?: InvestorResearchPlaybook;
  userInsights?: UserInsight[];
  caseMandate?: string;
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
  /** Whose material this is. See `EntryScope`. */
  scope?: EntryScope;
  /** The page this material belongs to, when it belongs to one. A chrome
   *  block sets it so its page's material is fetched once for the whole
   *  answer rather than repeated under every panel that matched. */
  view?: ViewId;
  title: string;
  body: string;
  figures: string[];
  citations: Citation[];
  symbols: SymbolCode[];
  /** The entries this bundle was summarised from, when it summarises others.
   *  An aggregate answer used to report its own slug as the whole audit
   *  trail, so "which material said this" could not be answered about the one
   *  shape of answer that draws on the most of it. */
  sourceIds?: string[];
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
  /** Whose material this entry holds. See `EntryScope`. */
  scope?: EntryScope;
  load(context: RequestContext): Promise<ContextBundle | null>;
}
