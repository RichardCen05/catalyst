/**
 * Review queue — one GCS object.
 *
 *   catalyst/web-watch/queue.json = {
 *     pending:  MarketEvent[]                 // waiting for a human
 *     accepted: MarketEvent[]                 // reviewed, mapped, engine-visible
 *     decided:  Record<candidateId, ReviewDecision>
 *     archived: Record<candidateId, ArchivedCandidate>   // set aside by triage
 *     matches:  Record<candidateId, TriageMatch>         // why a pending item is here
 *     restored: Record<candidateId, RestoredCandidate>   // triage overruled by a human
 *     proposals: Record<candidateId, TriageProposal>     // verified model draft, for a human to accept
 *   }
 *
 * The last four were added with triage (`lib/web-watch/triage.ts`). A file
 * written before them loads with each defaulted to empty (`normalizeQueue`),
 * and nothing in the first three changed shape.
 *
 * Candidates enter via `enqueue` (called by the sweep), which triages every
 * one of them: an item that repeats one already held, carries no prose,
 * reports ordinary weather, or touches no watched emiten is archived with the
 * rule and a reason, never deleted and never accepted. A reviewer maps each
 * one to symbols with a direction, a relevance *band*, and a written exposure
 * path — the band is chosen by a human in the open, never computed by the
 * fetcher. Dismissed candidates stay in `decided` so a re-run of the same
 * address does not resurrect them.
 *
 * The engine reads `accepted` through an in-process overlay (`ensureOverlay`,
 * TTL-guarded, best-effort): GCS-unavailable means fixtures-only, never an
 * error to the user.
 */

import { GcsPreconditionFailed, gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";
import { companies } from "@/lib/data/fixtures";
import { bucket } from "@/lib/web-watch/registry";
import { RELEVANCE_BAND_SCORE, resolveThresholds, type RelevanceBand } from "@/lib/agent/thresholds";
import { sourceFor, TRIAGE_RULES, triageAll, type MatchEvidence, type SeenWhere, type TriageRule } from "@/lib/web-watch/triage";
import type { WatchedSource } from "@/lib/web-watch/types";
import type { ImpactDirection, ImpactLink, MarketEvent, SymbolCode } from "@/lib/types";

export const QUEUE_PATH = "catalyst/web-watch/queue.json";

export type { RelevanceBand };

export interface ReviewImpact {
  symbol: string;
  direction: ImpactDirection;
  band: RelevanceBand;
  /** Written exposure path, e.g. "ICP naik → lifting cost ADRO → margin". */
  path: string;
}

export interface ReviewDecision {
  candidateId: string;
  status: "accepted" | "dismissed";
  decidedAt: string;
  reason: string;
  impacts?: ReviewImpact[];
  /** The reviewer accepted the model's verified proposal (possibly in a
   *  batch) rather than mapping by hand. Still a human decision. */
  viaProposal?: boolean;
}

export interface ArchivedCandidate {
  event: MarketEvent;
  rule: TriageRule;
  reason: string;
  at: string;
}

/** What triage matched for a candidate it sent to review. */
export interface TriageMatch {
  symbols: SymbolCode[];
  matchedBy: MatchEvidence[];
  at: string;
  /** When a model draft was last attempted, and how it ended. Absent means
   *  not yet tried; a budget that closed mid-sweep leaves it absent so the
   *  next sweep tries again. */
  drafted?: { at: string; outcome: "proposed" | "rejected" | "failed" };
}

/** One verified model-drafted impact. Same fields a reviewer fills in, plus
 *  the model's reason, so accepting a proposal is the ordinary accept. */
export interface ProposedImpact extends ReviewImpact {
  rationale: string;
}

/** A verified draft mapping. Never applied by itself: a human accepts it. */
export interface TriageProposal {
  impacts: ProposedImpact[];
  model: string;
  verifiedAt: string;
}

/** A human moved an archived candidate back. Triage never archives it again. */
export interface RestoredCandidate {
  restoredAt: string;
  rule: TriageRule;
  reason: string;
}

export interface ReviewQueue {
  pending: MarketEvent[];
  accepted: MarketEvent[];
  decided: Record<string, ReviewDecision>;
  archived: Record<string, ArchivedCandidate>;
  matches: Record<string, TriageMatch>;
  restored: Record<string, RestoredCandidate>;
  proposals: Record<string, TriageProposal>;
}

export const emptyQueue: ReviewQueue = { pending: [], accepted: [], decided: {}, archived: {}, matches: {}, restored: {}, proposals: {} };

const asRecord = <T>(value: unknown): Record<string, T> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, T>) : {};

/** Read any stored shape — including one written before triage existed — as
 *  a full queue. Missing sections are empty; present ones are kept as-is. */
export function normalizeQueue(raw: Partial<ReviewQueue> | null | undefined): ReviewQueue {
  return {
    pending: Array.isArray(raw?.pending) ? raw.pending : [],
    accepted: Array.isArray(raw?.accepted) ? raw.accepted : [],
    decided: asRecord<ReviewDecision>(raw?.decided),
    archived: asRecord<ArchivedCandidate>(raw?.archived),
    matches: asRecord<TriageMatch>(raw?.matches),
    restored: asRecord<RestoredCandidate>(raw?.restored),
    proposals: asRecord<TriageProposal>(raw?.proposals),
  };
}

export interface QueueStore {
  load(): Promise<{ data: ReviewQueue; generation: string } | null>;
  save(data: ReviewQueue, options: { ifGenerationMatch?: string }): Promise<void>;
}

export const gcsQueueStore: QueueStore = {
  async load() {
    const loaded = await gcsGetJson<Partial<ReviewQueue>>(bucket(), QUEUE_PATH);
    return loaded ? { data: normalizeQueue(loaded.data), generation: loaded.generation } : null;
  },
  async save(data, options) {
    await gcsPutJson(bucket(), QUEUE_PATH, data, options);
  },
};

export function memoryQueueStore(initial?: ReviewQueue): QueueStore {
  let file: ReviewQueue = normalizeQueue(structuredClone(initial ?? emptyQueue));
  let generation = "0";
  let counter = 0;
  return {
    async load() {
      return { data: structuredClone(file), generation };
    },
    async save(data, options) {
      if (options.ifGenerationMatch !== undefined && options.ifGenerationMatch !== generation) {
        throw new GcsPreconditionFailed();
      }
      file = structuredClone(data);
      counter += 1;
      generation = String(counter);
    },
  };
}

const knownSymbols = new Set(companies.map((c) => c.symbol));

export function isKnownSymbolCode(value: string): value is SymbolCode {
  return knownSymbols.has(value as SymbolCode);
}

export function listKnownSymbols(): SymbolCode[] {
  return companies.map((c) => c.symbol);
}

const PENDING_MAX = 200;

/** What triage needs beyond the queue itself. Required, so no caller can
 *  enqueue without triage. */
export interface EnqueueContext {
  sources: WatchedSource[];
}

function seenEvents(queue: ReviewQueue, pending: MarketEvent[] = queue.pending): Array<{ event: MarketEvent; where: SeenWhere }> {
  return [
    ...pending.map((event) => ({ event, where: "pending" as const })),
    ...queue.accepted.map((event) => ({ event, where: "accepted" as const })),
    ...Object.values(queue.archived).map(({ event }) => ({ event, where: "archived" as const })),
  ];
}

/** Keep the newest archive entries up to the configured cap. */
function capArchive(archived: Record<string, ArchivedCandidate>): Record<string, ArchivedCandidate> {
  const max = resolveThresholds().webWatchArchiveMax;
  const entries = Object.entries(archived);
  if (entries.length <= max) return archived;
  return Object.fromEntries(entries.sort(([, a], [, b]) => b.at.localeCompare(a.at)).slice(0, max));
}

/** Drop bookkeeping for ids that are no longer pending. */
function prunePendingRecords<T>(records: Record<string, T>, pending: MarketEvent[]): Record<string, T> {
  const ids = new Set(pending.map((e) => e.id));
  return Object.fromEntries(Object.entries(records).filter(([id]) => ids.has(id)));
}

/** Add fresh candidates through triage. Already-decided ids (accepted or
 *  dismissed) and already-archived ids never re-enter — a re-run must not
 *  resurrect an item a human or triage has already dealt with. */
export function enqueue(
  queue: ReviewQueue,
  candidates: MarketEvent[],
  ctx: EnqueueContext,
  nowIso: string = new Date().toISOString(),
): ReviewQueue {
  const known = new Set([...queue.pending.map((e) => e.id), ...queue.accepted.map((e) => e.id)]);
  const fresh = candidates.filter((c) => !known.has(c.id) && !queue.decided[c.id] && !queue.archived[c.id]);
  if (!fresh.length) return queue;
  const judged = triageAll(fresh, { sources: ctx.sources, seen: seenEvents(queue) });
  const kept: MarketEvent[] = [];
  const archived = { ...queue.archived };
  const matches = { ...queue.matches };
  for (const { candidate, result } of judged) {
    if (result.verdict === "archive") {
      archived[candidate.id] = { event: candidate, rule: result.rule, reason: result.reason, at: nowIso };
    } else {
      kept.push(candidate);
      matches[candidate.id] = { symbols: result.symbols, matchedBy: result.matchedBy, at: nowIso };
    }
  }
  const pending = [...kept, ...queue.pending].slice(0, PENDING_MAX);
  return {
    ...queue,
    pending,
    archived: capArchive(archived),
    matches: prunePendingRecords(matches, pending),
    proposals: prunePendingRecords(queue.proposals, pending),
  };
}

/** Move an archived candidate back to review, and remember a human did so. */
export function restore(queue: ReviewQueue, candidateId: string, nowIso: string): ReviewQueue {
  const entry = queue.archived[candidateId];
  if (!entry) throw new ReviewError("Kandidat tidak ada di arsip (mungkin sudah dikembalikan).");
  const { [candidateId]: _removed, ...archived } = queue.archived;
  void _removed;
  return {
    ...queue,
    pending: [entry.event, ...queue.pending.filter((e) => e.id !== candidateId)],
    archived,
    restored: { ...queue.restored, [candidateId]: { restoredAt: nowIso, rule: entry.rule, reason: entry.reason } },
  };
}

export interface BackfillReport {
  pendingBefore: number;
  pendingAfter: number;
  archived: number;
  perRule: Record<TriageRule, { count: number; samples: Array<{ title: string; reason: string }> }>;
  review: { count: number; withSymbols: number; samples: Array<{ title: string; symbols: SymbolCode[]; matchedBy: string[] }> };
}

/**
 * Triage the items already pending. Pure: the caller decides whether the
 * returned queue is written (the internal route defaults to not writing).
 *
 * Oldest first, so of two copies the older one stays in review. Items a human
 * restored are left where they are.
 */
export function backfillTriage(
  queue: ReviewQueue,
  ctx: EnqueueContext,
  nowIso: string,
  sampleSize = 5,
): { next: ReviewQueue; report: BackfillReport } {
  const restored = queue.pending.filter((e) => queue.restored[e.id]);
  const candidates = queue.pending.filter((e) => !queue.restored[e.id]).reverse();
  const judged = triageAll(candidates, { sources: ctx.sources, seen: seenEvents(queue, restored) });
  const archivedIds = new Set<string>();
  const archived = { ...queue.archived };
  const matches = { ...queue.matches };
  const perRule = Object.fromEntries(TRIAGE_RULES.map((rule) => [rule, { count: 0, samples: [] as Array<{ title: string; reason: string }> }])) as BackfillReport["perRule"];
  const review: BackfillReport["review"] = { count: 0, withSymbols: 0, samples: [] };
  for (const { candidate, result } of judged) {
    if (result.verdict === "archive") {
      archivedIds.add(candidate.id);
      archived[candidate.id] = { event: candidate, rule: result.rule, reason: result.reason, at: nowIso };
      const bucket = perRule[result.rule];
      bucket.count += 1;
      if (bucket.samples.length < sampleSize) bucket.samples.push({ title: candidate.title, reason: result.reason });
    } else {
      matches[candidate.id] = { symbols: result.symbols, matchedBy: result.matchedBy, at: nowIso };
      review.count += 1;
      if (result.symbols.length) review.withSymbols += 1;
      if (review.samples.length < sampleSize * 4) {
        review.samples.push({
          title: candidate.title,
          symbols: result.symbols,
          matchedBy: result.matchedBy.map((e) => `${e.symbol}:${e.by}:${e.term}`),
        });
      }
    }
  }
  const pending = queue.pending.filter((e) => !archivedIds.has(e.id));
  const next: ReviewQueue = {
    ...queue,
    pending,
    archived: capArchive(archived),
    matches: prunePendingRecords(matches, pending),
    proposals: prunePendingRecords(queue.proposals, pending),
  };
  return {
    next,
    report: {
      pendingBefore: queue.pending.length,
      pendingAfter: pending.length,
      archived: archivedIds.size,
      perRule,
      review,
    },
  };
}

export class ReviewError extends Error {
  constructor(message: string) {
    super(message);
    this.name = "ReviewError";
  }
}

/**
 * Accept a candidate with reviewer-mapped impacts, or dismiss it with a
 * reason. Pure — persistence is the caller's job via `saveQueue`.
 */
export function decide(
  queue: ReviewQueue,
  candidateId: string,
  action: { action: "accept"; impacts: ReviewImpact[]; reason?: string; viaProposal?: boolean } | { action: "dismiss"; reason: string },
  nowIso: string,
): ReviewQueue {
  const candidate = queue.pending.find((e) => e.id === candidateId);
  if (!candidate) throw new ReviewError("Kandidat tidak ada di antrean (mungkin sudah diputuskan).");

  if (action.action === "dismiss") {
    if (!action.reason.trim()) throw new ReviewError("Alasan dismiss wajib diisi.");
    const pending = queue.pending.filter((e) => e.id !== candidateId);
    return {
      ...queue,
      pending,
      matches: prunePendingRecords(queue.matches, pending),
      proposals: prunePendingRecords(queue.proposals, pending),
      decided: {
        ...queue.decided,
        [candidateId]: { candidateId, status: "dismissed", decidedAt: nowIso, reason: action.reason.trim().slice(0, 500) },
      },
    };
  }

  if (!action.impacts.length) throw new ReviewError("Accept wajib memetakan minimal satu emiten.");
  const seen = new Set<string>();
  const impactLinks: ImpactLink[] = action.impacts.map((impact) => {
    if (!isKnownSymbolCode(impact.symbol)) throw new ReviewError(`Simbol ${impact.symbol} tidak dikenal.`);
    if (seen.has(impact.symbol)) throw new ReviewError(`Simbol ${impact.symbol} dipetakan dua kali.`);
    seen.add(impact.symbol);
    if (!impact.path.trim() || impact.path.trim().length < 10) {
      throw new ReviewError(`Jalur eksposur ${impact.symbol} wajib ditulis (min. 10 karakter).`);
    }
    return {
      symbol: impact.symbol,
      direction: impact.direction,
      relevance: RELEVANCE_BAND_SCORE[impact.band],
      path: impact.path.trim().slice(0, 300),
      rationale: `Dipetakan reviewer web-watch (band ${impact.band}).${action.reason ? ` ${action.reason.trim().slice(0, 200)}` : ""}`,
      citations: candidate.citations,
    };
  });

  const accepted: MarketEvent = { ...candidate, impactLinks, asOf: nowIso };
  const pending = queue.pending.filter((e) => e.id !== candidateId);
  return {
    ...queue,
    pending,
    matches: prunePendingRecords(queue.matches, pending),
    proposals: prunePendingRecords(queue.proposals, pending),
    accepted: [accepted, ...queue.accepted].slice(0, 200),
    decided: {
      ...queue.decided,
      [candidateId]: {
        candidateId,
        status: "accepted",
        decidedAt: nowIso,
        reason: (action.reason ?? "").trim().slice(0, 500),
        impacts: action.impacts,
        ...(action.viaProposal ? { viaProposal: true } : {}),
      },
    },
  };
}

/** A proposal a reviewer may accept in a batch: every impact high band and a
 *  direction that maps something. Anything else needs a look first. */
export function isBatchAcceptable(proposal: TriageProposal | undefined): proposal is TriageProposal {
  return Boolean(proposal?.impacts.length) && (proposal as TriageProposal).impacts.every((i) => i.band === "high" && i.direction !== "Unrelated");
}

/**
 * Accept several proposals in one action. Each candidate still gets its own
 * decision record, marked as accepted through a proposal; any id that is not
 * pending or whose proposal is not batch-acceptable stops the whole batch, so
 * the reviewer never accepts something the confirm dialog did not list.
 */
export function acceptProposals(queue: ReviewQueue, candidateIds: string[], nowIso: string): ReviewQueue {
  if (!candidateIds.length) throw new ReviewError("Tidak ada usulan yang dipilih.");
  for (const id of candidateIds) {
    if (!isBatchAcceptable(queue.proposals[id])) throw new ReviewError("Hanya usulan band tinggi yang terverifikasi yang bisa diterima sekaligus.");
  }
  return candidateIds.reduce((current, id) => {
    const impacts = current.proposals[id].impacts.map(({ symbol, direction, band, path }) => ({ symbol, direction, band, path }));
    return decide(current, id, { action: "accept", impacts, reason: "Usulan model diterima reviewer (sekaligus).", viaProposal: true }, nowIso);
  }, queue);
}

export interface SourceHealth {
  sourceId: string;
  window: number;
  noisy: number;
  share: number;
  suggestDisable: boolean;
}

/**
 * How much of what a source produced ended archived or dismissed, over its
 * most recent outcomes. A suggestion for the reviewer, never an action.
 */
export function sourceHealth(queue: ReviewQueue, sources: WatchedSource[]): SourceHealth[] {
  const t = resolveThresholds();
  const outcomes = new Map<string, Array<{ at: string; noisy: boolean }>>();
  const add = (candidateId: string, at: string, noisy: boolean) => {
    const source = sourceFor(candidateId, sources);
    if (!source) return;
    const list = outcomes.get(source.id) ?? [];
    list.push({ at, noisy });
    outcomes.set(source.id, list);
  };
  for (const [id, entry] of Object.entries(queue.archived)) add(id, entry.at, true);
  for (const decision of Object.values(queue.decided)) add(decision.candidateId, decision.decidedAt, decision.status === "dismissed");
  return [...outcomes.entries()].map(([sourceId, list]) => {
    const recent = list.sort((a, b) => b.at.localeCompare(a.at)).slice(0, t.webWatchSourceHealthWindow);
    const noisy = recent.filter((o) => o.noisy).length;
    const share = recent.length ? noisy / recent.length : 0;
    return {
      sourceId,
      window: recent.length,
      noisy,
      share,
      suggestDisable: recent.length >= t.webWatchSourceHealthWindow && share >= t.webWatchSourceNoiseShare,
    };
  });
}

/** Generation-guarded save with one read-merge retry. */
export async function saveQueue(store: QueueStore, mutate: (queue: ReviewQueue) => ReviewQueue): Promise<ReviewQueue> {
  const loaded = await store.load().catch(() => null);
  const base: ReviewQueue = normalizeQueue(loaded?.data);
  try {
    const next = mutate(structuredClone(base));
    await store.save(next, loaded ? { ifGenerationMatch: loaded.generation } : { ifGenerationMatch: "0" });
    return next;
  } catch (error) {
    if (!(error instanceof GcsPreconditionFailed)) throw error;
    const retry = await store.load().catch(() => null);
    const retryBase: ReviewQueue = normalizeQueue(retry?.data);
    const next = mutate(structuredClone(retryBase));
    await store.save(next, retry ? { ifGenerationMatch: retry.generation } : { ifGenerationMatch: "0" });
    return next;
  }
}

// ---------------------------------------------------------------------------
// Engine overlay — accepted events, visible to the sync providers.
// ---------------------------------------------------------------------------

const OVERLAY_TTL_MS = 10 * 60 * 1000;
interface OverlayCounts {
  pending: number;
  decided: number;
  archived: number;
  proposals: number;
  archivedByRule: Partial<Record<TriageRule, number>>;
}

const zeroCounts: OverlayCounts = { pending: 0, decided: 0, archived: 0, proposals: 0, archivedByRule: {} };

let overlay: OverlayCounts & { events: MarketEvent[]; expiresAt: number } = { events: [], ...zeroCounts, expiresAt: 0 };

/** The counts the assistant can read about the queue, from one queue value. */
export function overlayCounts(queue: ReviewQueue): OverlayCounts {
  const archivedByRule: Partial<Record<TriageRule, number>> = {};
  for (const entry of Object.values(queue.archived)) archivedByRule[entry.rule] = (archivedByRule[entry.rule] ?? 0) + 1;
  return {
    pending: queue.pending.length,
    decided: Object.keys(queue.decided).length,
    archived: Object.keys(queue.archived).length,
    proposals: Object.keys(queue.proposals).length,
    archivedByRule,
  };
}

/** Best-effort refresh. GCS-unreachable keeps the previous overlay (or empty)
 *  — the engine degrades to fixtures-only, never errors. */
export async function ensureOverlay(store: QueueStore = gcsQueueStore, nowMs: number = Date.now()): Promise<MarketEvent[]> {
  if (overlay.expiresAt > nowMs) return overlay.events;
  try {
    const loaded = await store.load();
    const queue = normalizeQueue(loaded?.data);
    overlay = {
      events: queue.accepted,
      // Counted here because this is the only place the queue is read on the
      // answer path. A reader asking how many sources are waiting was told
      // nothing at all, since the assistant could see what review accepted
      // and not what it has yet to decide.
      ...overlayCounts(queue),
      expiresAt: nowMs + OVERLAY_TTL_MS,
    };
  } catch {
    overlay = { ...overlay, expiresAt: nowMs + OVERLAY_TTL_MS };
  }
  return overlay.events;
}

/** What review has waiting and what it has settled, as of the last overlay
 *  refresh. Zero before the first `ensureOverlay`, which is the same
 *  fixtures-only state `getOverlayEvents` reports. */
export function getOverlayStats(): OverlayCounts & { accepted: number } {
  return {
    pending: overlay.pending,
    decided: overlay.decided,
    archived: overlay.archived,
    proposals: overlay.proposals,
    archivedByRule: overlay.archivedByRule,
    accepted: overlay.events.length,
  };
}

/** Synchronous read for the providers. May be empty before the first
 *  `ensureOverlay` — that is the fixtures-only state, and it is valid. */
export function getOverlayEvents(): MarketEvent[] {
  return overlay.events;
}

/** Tests and the check-sources route push freshly accepted events directly. */
export function setOverlayForTests(events: MarketEvent[], counts?: Partial<OverlayCounts>): void {
  overlay = {
    events,
    ...zeroCounts,
    ...counts,
    expiresAt: Date.now() + OVERLAY_TTL_MS,
  };
}
