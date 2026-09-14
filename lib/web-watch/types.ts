/**
 * Web-watch types — port of ReguLens `WatchedSource` model to Catalyst.
 *
 * A watched source is a registered URL that is re-read on a schedule. When the
 * *wording* changes, the new version enters through the ordinary candidate
 * path (review queue → gates → engine), never by writing straight into
 * `rawEvents` / `market.generated.ts`.
 */

import type { MarketEvent } from "@/lib/types";

export type WebWatchKind = "document" | "feed" | "listing";

export type WebWatchStatus =
  | "never"
  | "unchanged"
  | "changed"
  | "baselined"
  | "error"
  | "busy"
  | "disabled"
  | "not_due";

export interface WatchedSource {
  id: string;
  url: string;
  label: string;
  kind: WebWatchKind;
  enabled: boolean;
  /** Hours between checks. Default 24. */
  checkIntervalHours: number;
  /** Required for listing: only links whose absolute URL matches are documents. */
  linkPattern?: string;
  /** Which MarketEvent bucket a change here lands in. Declared up front — a
   *  person registering the address says what it is, the document does not
   *  get to upgrade itself. */
  category: MarketEvent["category"];
  sourceType: MarketEvent["sourceType"];
}

export interface WatchedSourceState extends WatchedSource {
  lastCheckedAt: string | null;
  lastChangedAt: string | null;
  lastStatus: WebWatchStatus | "not_found";
  lastError: string | null;
  lastEtag: string | null;
  lastModified: string | null;
  /** sha256 of the *extracted text*, not the raw bytes. */
  lastTextSha: string | null;
  seenEntryIds: string[];
  documentIds: string[];
  checks: number;
  changes: number;
  /** A check is running. Older than the lock lifetime = dead process. */
  checkLockAt: string | null;
}

export function newSourceState(source: WatchedSource): WatchedSourceState {
  return {
    ...source,
    lastCheckedAt: null,
    lastChangedAt: null,
    lastStatus: "never",
    lastError: null,
    lastEtag: null,
    lastModified: null,
    lastTextSha: null,
    seenEntryIds: [],
    documentIds: [],
    checks: 0,
    changes: 0,
    checkLockAt: null,
  };
}

/** Pure scheduling arithmetic — no clock, no I/O, trivially testable. */
export function isDue(state: WatchedSourceState, nowMs: number = Date.now()): boolean {
  if (!state.enabled) return false;
  if (!state.lastCheckedAt) return true;
  const elapsedMs = nowMs - Date.parse(state.lastCheckedAt);
  return elapsedMs >= state.checkIntervalHours * 3_600_000;
}

export interface CheckResult {
  sourceId: string;
  url: string;
  label: string;
  status: WebWatchStatus | "not_found";
  reason?: string;
  /** Candidates produced by this check (before human review). */
  candidates?: MarketEvent[];
  failed?: Array<{ title: string; link: string; error: string; permanent: boolean }>;
  newEntries?: number;
  error?: string;
}

export interface WatchSummary {
  checked: number;
  changed: number;
  unchanged: number;
  baselined: number;
  errors: number;
  candidates: number;
}

export interface WatchAllResult {
  summary: WatchSummary;
  results: CheckResult[];
  checkedAt: string;
}
