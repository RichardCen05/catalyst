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
  | "event"
  | "metric"
  | "endpoint"
  | "causal-node"
  | "threshold"
  | "view";

export interface HistoryTurn {
  role: "user" | "assistant";
  text: string;
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
 * winners are worth materializing into prompt text.
 */
export interface CorpusEntry {
  id: string;
  kind: EntryKind;
  terms: string[];
  symbols: SymbolCode[];
  view?: ViewId;
  load(context: RequestContext): Promise<ContextBundle>;
}
