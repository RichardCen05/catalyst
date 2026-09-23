/**
 * Review queue — one GCS object, three sections.
 *
 *   catalyst/web-watch/queue.json = {
 *     pending:  MarketEvent[]                 // accepted or dismissed yet
 *     accepted: MarketEvent[]                 // reviewed, mapped, engine-visible
 *     decided:  Record<candidateId, ReviewDecision>
 *   }
 *
 * Candidates enter via `enqueue` (called by the sweep). A reviewer maps each
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
import { RELEVANCE_BAND_SCORE, type RelevanceBand } from "@/lib/agent/thresholds";
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
}

export interface ReviewQueue {
  pending: MarketEvent[];
  accepted: MarketEvent[];
  decided: Record<string, ReviewDecision>;
}

export const emptyQueue: ReviewQueue = { pending: [], accepted: [], decided: {} };

export interface QueueStore {
  load(): Promise<{ data: ReviewQueue; generation: string } | null>;
  save(data: ReviewQueue, options: { ifGenerationMatch?: string }): Promise<void>;
}

export const gcsQueueStore: QueueStore = {
  async load() {
    return gcsGetJson<ReviewQueue>(bucket(), QUEUE_PATH);
  },
  async save(data, options) {
    await gcsPutJson(bucket(), QUEUE_PATH, data, options);
  },
};

export function memoryQueueStore(initial?: ReviewQueue): QueueStore {
  let file: ReviewQueue = structuredClone(initial ?? emptyQueue);
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

/** Add fresh candidates. Already-decided ids (accepted or dismissed) never
 *  re-enter pending — a re-run must not resurrect a reviewed item. */
export function enqueue(queue: ReviewQueue, candidates: MarketEvent[]): ReviewQueue {
  const known = new Set([...queue.pending.map((e) => e.id), ...queue.accepted.map((e) => e.id)]);
  const fresh = candidates.filter((c) => !known.has(c.id) && !queue.decided[c.id]);
  if (!fresh.length) return queue;
  return { ...queue, pending: [...fresh, ...queue.pending].slice(0, 200) };
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
  action: { action: "accept"; impacts: ReviewImpact[]; reason?: string } | { action: "dismiss"; reason: string },
  nowIso: string,
): ReviewQueue {
  const candidate = queue.pending.find((e) => e.id === candidateId);
  if (!candidate) throw new ReviewError("Kandidat tidak ada di antrean (mungkin sudah diputuskan).");

  if (action.action === "dismiss") {
    if (!action.reason.trim()) throw new ReviewError("Alasan dismiss wajib diisi.");
    return {
      pending: queue.pending.filter((e) => e.id !== candidateId),
      accepted: queue.accepted,
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
  return {
    pending: queue.pending.filter((e) => e.id !== candidateId),
    accepted: [accepted, ...queue.accepted].slice(0, 200),
    decided: {
      ...queue.decided,
      [candidateId]: {
        candidateId,
        status: "accepted",
        decidedAt: nowIso,
        reason: (action.reason ?? "").trim().slice(0, 500),
        impacts: action.impacts,
      },
    },
  };
}

/** Generation-guarded save with one read-merge retry. */
export async function saveQueue(store: QueueStore, mutate: (queue: ReviewQueue) => ReviewQueue): Promise<ReviewQueue> {
  const loaded = await store.load().catch(() => null);
  const base: ReviewQueue = loaded?.data ?? structuredClone(emptyQueue);
  try {
    const next = mutate(structuredClone(base));
    await store.save(next, loaded ? { ifGenerationMatch: loaded.generation } : { ifGenerationMatch: "0" });
    return next;
  } catch (error) {
    if (!(error instanceof GcsPreconditionFailed)) throw error;
    const retry = await store.load().catch(() => null);
    const retryBase: ReviewQueue = retry?.data ?? structuredClone(emptyQueue);
    const next = mutate(structuredClone(retryBase));
    await store.save(next, retry ? { ifGenerationMatch: retry.generation } : { ifGenerationMatch: "0" });
    return next;
  }
}

// ---------------------------------------------------------------------------
// Engine overlay — accepted events, visible to the sync providers.
// ---------------------------------------------------------------------------

const OVERLAY_TTL_MS = 10 * 60 * 1000;
let overlay: { events: MarketEvent[]; pending: number; decided: number; expiresAt: number } =
  { events: [], pending: 0, decided: 0, expiresAt: 0 };

/** Best-effort refresh. GCS-unreachable keeps the previous overlay (or empty)
 *  — the engine degrades to fixtures-only, never errors. */
export async function ensureOverlay(store: QueueStore = gcsQueueStore, nowMs: number = Date.now()): Promise<MarketEvent[]> {
  if (overlay.expiresAt > nowMs) return overlay.events;
  try {
    const loaded = await store.load();
    overlay = {
      events: loaded?.data.accepted ?? [],
      // Counted here because this is the only place the queue is read on the
      // answer path. A reader asking how many sources are waiting was told
      // nothing at all, since the assistant could see what review accepted
      // and not what it has yet to decide.
      pending: loaded?.data.pending.length ?? 0,
      decided: Object.keys(loaded?.data.decided ?? {}).length,
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
export function getOverlayStats(): { pending: number; decided: number; accepted: number } {
  return { pending: overlay.pending, decided: overlay.decided, accepted: overlay.events.length };
}

/** Synchronous read for the providers. May be empty before the first
 *  `ensureOverlay` — that is the fixtures-only state, and it is valid. */
export function getOverlayEvents(): MarketEvent[] {
  return overlay.events;
}

/** Tests and the check-sources route push freshly accepted events directly. */
export function setOverlayForTests(events: MarketEvent[], counts?: { pending?: number; decided?: number }): void {
  overlay = {
    events,
    pending: counts?.pending ?? 0,
    decided: counts?.decided ?? 0,
    expiresAt: Date.now() + OVERLAY_TTL_MS,
  };
}
