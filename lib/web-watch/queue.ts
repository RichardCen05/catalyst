/**
 * Review queue — one GCS object.
 *
 *   catalyst/web-watch/queue.json = {
 *     pending:  MarketEvent[]                 // waiting for a decision
 *     accepted: MarketEvent[]                 // reviewed, mapped, engine-visible
 *     decided:  Record<candidateId, ReviewDecision>
 *     archived: Record<candidateId, ArchivedCandidate>   // set aside by triage
 *     matches:  Record<candidateId, TriageMatch>         // why a pending item is here
 *     restored: Record<candidateId, RestoredCandidate>   // read-only: past human overrules of triage
 *     proposals: Record<candidateId, TriageProposal>     // verified model draft
 *   }
 *
 * The last four were added with triage (`lib/web-watch/triage.ts`). A file
 * written before them loads with each defaulted to empty (`normalizeQueue`),
 * and nothing in the first three changed shape. Auto-accept and auto-decide
 * added only optional fields (`ReviewDecision.auto`, `ReviewDecision.autoReject`,
 * `TriageMatch.noAuto`, `TriageMatch.residual`).
 *
 * Candidates enter via `enqueue` (called by the sweep), which triages every
 * one of them: an item that repeats one already held, carries no prose,
 * reports ordinary weather, or touches no watched emiten is archived with the
 * rule and a reason, never deleted and never accepted. Archiving is final:
 * nothing moves an archived item back. `restored` is kept only so the
 * overrules people made before that rule still stand.
 *
 * Pending items are decided without a person by `applyVerdicts`, which the
 * internal decide route runs on verdicts an offline screen posts. When the
 * auto-decide switch is on, a verdict can quarantine an item as suspected
 * rumor (`suspected`, reviewable in the Terindikasi Rumor tab), accept it
 * (only a verified proposal the auto-accept rules allow, capped per day and
 * undoable), or leave it for a person as residual. Reject verdicts for other
 * checks (misleading figures, no substance, irrelevant) dismiss the item, and
 * only a person can take one back (`restoreAutoReject`). A
 * reviewer maps each item a person decides to symbols with a direction, a
 * relevance *band*, and a written exposure path — the band is chosen in the
 * open, never computed by the fetcher. Dismissed candidates stay in `decided`
 * so a re-run of the same address does not resurrect them.
 *
 * A suspected item is not decided: the reviewer either confirms it is rumor
 * (`dismissSuspected`, final, with the reviewer's own reason) or disputes it
 * (`disputeSuspected`, which moves the item back to pending with its match
 * and proposal so the reviewer can accept it normally). A disputed item never
 * goes back to the screen alone (`noAuto`): only a person decides it.
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
import { repairStoredEvent } from "@/lib/web-watch/stored-fields";
import type { WatchedSource } from "@/lib/web-watch/types";
import type { EventMarker, ImpactDirection, ImpactLink, MarketEvent, SymbolCode } from "@/lib/types";

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
  /** Accepted with no person involved, because the auto-decide switch was
   *  on. Holds what the item looked like while pending, so a reviewer can put
   *  it back exactly (`revertAutoAccept`). */
  auto?: AutoAcceptRecord;
  /** Dismissed with no person involved, by a screen verdict. The screen never
   *  undoes it; a reviewer can (`restoreAutoReject`). Never set for quarantine checks (`rumor`,
   *  `misleading-title`): those go to `suspected`, not here. */
  autoReject?: AutoRejectRecord;
  /** A person confirmed a suspected item as rumor and dismissed it. Carries
   *  the screen evidence the reviewer confirmed, so the audit keeps what the
   *  screen read without counting the decision as automatic. */
  fromSuspect?: { check: ScreenCheck; span?: string; score?: number; at: string };
  /** A person decided an item the screen had left for them (residual). This
   *  decision is a calibration label (W17); auto decisions never carry it. */
  fromResidual?: boolean;
}

/** Which screen check decided a verdict. */
export type ScreenCheck = "rumor" | "misleading-title" | "figure" | "substance" | "relevance";

/**
 * Screen checks that quarantine instead of finally rejecting. A rumor or
 * misleading-title verdict moves the item to `suspected` for a person to
 * confirm or dispute; every other reject check stays final.
 */
export const QUARANTINE_CHECKS: ReadonlySet<ScreenCheck> = new Set(["rumor", "misleading-title"]);

export function isQuarantineCheck(check: ScreenCheck | undefined): check is ScreenCheck {
  return check !== undefined && QUARANTINE_CHECKS.has(check);
}

export interface AutoRejectRecord {
  check?: ScreenCheck;
  /** The text the check read when it decided. */
  span?: string;
  score?: number;
  at: string;
  /** A dismissed decision keeps no event, so the list of auto rejects shows
   *  what was rejected from these. */
  title?: string;
  url?: string;
  /** The pending item as the screen read it, so a reviewer can put a wrong
   *  reject back exactly (`restoreAutoReject`). Absent on rejects written
   *  before 2026-09-28; those come back with their title and address only. */
  event?: MarketEvent;
  match?: TriageMatch;
  proposal?: TriageProposal;
}

export interface AutoAcceptRecord {
  event: MarketEvent;
  match: TriageMatch;
  proposal: TriageProposal;
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
  /** A reviewer undid an auto-accept of this item. Nothing decides it
   *  again without a person. */
  noAuto?: boolean;
  /** The last screen left this item for a person, and why. */
  residual?: { at: string; reason: string };
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

/** A human moved an archived candidate back, before archiving became final.
 *  Nothing writes these any more; triage still never archives such an item
 *  again, so a person's past overrule stands. */
export interface RestoredCandidate {
  restoredAt: string;
  rule: TriageRule;
  reason: string;
}

/**
 * A pending item the screen flagged as rumor or misleading-title. Not
 * decided: the reviewer confirms it (final dismiss) or disputes it (back to
 * pending). Holds the pending state it came from so a dispute restores the
 * match and proposal exactly.
 */
export interface SuspectedCandidate {
  event: MarketEvent;
  match: TriageMatch;
  proposal?: TriageProposal;
  check: ScreenCheck;
  reason: string;
  span?: string;
  score?: number;
  at: string;
}

export interface ReviewQueue {
  pending: MarketEvent[];
  accepted: MarketEvent[];
  decided: Record<string, ReviewDecision>;
  archived: Record<string, ArchivedCandidate>;
  matches: Record<string, TriageMatch>;
  restored: Record<string, RestoredCandidate>;
  proposals: Record<string, TriageProposal>;
  /** Items the screen flagged as rumor or misleading-title, waiting for a
   *  person to confirm or dispute. Absent on files written before the
   *  Terindikasi Rumor tab existed: `normalizeQueue` defaults it to empty,
   *  and legacy rumor auto-rejects are read as suspected by the API. */
  suspected: Record<string, SuspectedCandidate>;
  /** When a screen run last applied verdicts (`/api/internal/web-watch-decide`
   *  with `apply: true`). Absent until the first run: Pantau and the assistant
   *  read it to say whether the screen has ever run, instead of promising a
   *  nightly run that may not be scheduled. */
  lastScreenAt?: string;
}

export const emptyQueue: ReviewQueue = { pending: [], accepted: [], decided: {}, archived: {}, matches: {}, restored: {}, proposals: {}, suspected: {} };

const asRecord = <T>(value: unknown): Record<string, T> =>
  value && typeof value === "object" && !Array.isArray(value) ? (value as Record<string, T>) : {};

/** Read any stored shape — including one written before triage existed — as
 *  a full queue. Missing sections are empty; present ones are kept as-is,
 *  except that events written before feed dates were read as ISO, or before
 *  a filename headline could fall back to the page title, are read the way a
 *  new item is written (`repairStoredEvent`). The id never changes: it hashes
 *  the text, not the headline or the date. */
export function normalizeQueue(raw: Partial<ReviewQueue> | null | undefined): ReviewQueue {
  const minWords = resolveThresholds().webWatchHeadlineMinWords;
  const repair = (events: MarketEvent[]) => events.map((event) => repairStoredEvent(event, minWords));
  const archived = asRecord<ArchivedCandidate>(raw?.archived);
  const suspected = asRecord<SuspectedCandidate>(raw?.suspected);
  return {
    pending: Array.isArray(raw?.pending) ? repair(raw.pending) : [],
    accepted: Array.isArray(raw?.accepted) ? repair(raw.accepted) : [],
    // An auto-accept keeps the event as it was while pending, which is what
    // Pantau lists under "Diterima otomatis" and what a revert puts back.
    decided: Object.fromEntries(
      Object.entries(asRecord<ReviewDecision>(raw?.decided)).map(([id, decision]) => [
        id,
        decision?.auto?.event ? { ...decision, auto: { ...decision.auto, event: repairStoredEvent(decision.auto.event, minWords) } } : decision,
      ]),
    ),
    archived: Object.fromEntries(
      Object.entries(archived).map(([id, entry]) => [id, entry?.event ? { ...entry, event: repairStoredEvent(entry.event, minWords) } : entry]),
    ),
    matches: asRecord<TriageMatch>(raw?.matches),
    restored: asRecord<RestoredCandidate>(raw?.restored),
    proposals: asRecord<TriageProposal>(raw?.proposals),
    suspected: Object.fromEntries(
      Object.entries(suspected).map(([id, entry]) => [id, entry?.event ? { ...entry, event: repairStoredEvent(entry.event, minWords) } : entry]),
    ),
    ...(typeof raw?.lastScreenAt === "string" ? { lastScreenAt: raw.lastScreenAt } : {}),
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

/** Most items the queue holds pending; also caps how many verdicts one decide call may carry. */
export const PENDING_MAX = 200;

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
    ...Object.values(queue.suspected ?? {}).map(({ event }) => ({ event, where: "suspected" as const })),
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
 *  dismissed, including confirmed rumor), already-archived ids, and ids
 *  already waiting in the rumor tab never re-enter — a re-run must not
 *  resurrect an item a human, triage, or the screen has already dealt with. */
export function enqueue(
  queue: ReviewQueue,
  candidates: MarketEvent[],
  ctx: EnqueueContext,
  nowIso: string = new Date().toISOString(),
): ReviewQueue {
  const suspectedIds = new Set(Object.keys(queue.suspected ?? {}));
  const known = new Set([...queue.pending.map((e) => e.id), ...queue.accepted.map((e) => e.id), ...suspectedIds]);
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

/**
 * Mark the decisions a person just made on items the screen had left for
 * them. `before` is the queue the person decided from, so the mark says the
 * item was residual when they chose, whatever happens to its match record
 * afterwards. Only the human routes call this; the screen never does.
 */
export function withResidualLabel(before: ReviewQueue, after: ReviewQueue, candidateIds: string[]): ReviewQueue {
  const labelled = candidateIds.filter((id) => before.matches[id]?.residual && after.decided[id] && !after.decided[id].auto && !after.decided[id].autoReject);
  if (!labelled.length) return after;
  const decided = { ...after.decided };
  for (const id of labelled) decided[id] = { ...decided[id], fromResidual: true };
  return { ...after, decided };
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

/** Evidence that the candidate's own text names the emiten, by ticker or by
 *  registry name. */
const NAMED_EVIDENCE: ReadonlySet<MatchEvidence["by"]> = new Set(["symbol", "name"]);

/** Evidence that the source itself declares the emiten (`WatchedSource.symbols`),
 *  e.g. a central-bank release declared for the banks. */
const SOURCE_EVIDENCE: ReadonlySet<MatchEvidence["by"]> = new Set(["source"]);

/** Bands the sweep may accept alone, per kind of evidence. A named emiten
 *  may go in at high or medium; one only its source declares needs high,
 *  because nothing in the text ties it to that company. */
const AUTO_BANDS_NAMED: ReadonlySet<RelevanceBand> = new Set(["high", "medium"]);
const AUTO_BANDS_SOURCE: ReadonlySet<RelevanceBand> = new Set(["high"]);

/** Directions the sweep may accept alone. `Mixed` says the model saw both
 *  ways, which is a judgement a person should make. */
const AUTO_DIRECTIONS: ReadonlySet<ImpactDirection> = new Set(["Supported", "Adverse"]);

/**
 * Whether the sweep may accept this verified proposal alone. Every impact
 * must have a clear direction and be either
 *   - named in the text, at high or medium band, or
 *   - declared by the source, at high band.
 * A match by sector, subsector, region or weather alone never qualifies, and
 * nothing a reviewer already un-accepted is taken again.
 */
export function isAutoAcceptable(proposal: TriageProposal | undefined, match: TriageMatch | undefined): boolean {
  if (!proposal?.impacts.length || !match || match.noAuto) return false;
  const by = (kinds: ReadonlySet<MatchEvidence["by"]>) =>
    new Set(match.matchedBy.filter((e) => kinds.has(e.by)).map((e) => e.symbol as string));
  const named = by(NAMED_EVIDENCE);
  const declared = by(SOURCE_EVIDENCE);
  return proposal.impacts.every(
    (impact) =>
      AUTO_DIRECTIONS.has(impact.direction) &&
      ((named.has(impact.symbol) && AUTO_BANDS_NAMED.has(impact.band)) ||
        (declared.has(impact.symbol) && AUTO_BANDS_SOURCE.has(impact.band))),
  );
}

const DAY_MS = 24 * 60 * 60 * 1000;

/** Auto-accepts recorded in the 24 hours before `nowIso`. */
export function autoAcceptedSince(queue: ReviewQueue, nowIso: string): number {
  const since = Date.parse(nowIso) - DAY_MS;
  return Object.values(queue.decided).filter((d) => d.auto && Date.parse(d.decidedAt) > since).length;
}

export const AUTO_ACCEPT_REASON = "otomatis: usulan terverifikasi, emiten disebut di teks (band tinggi/sedang) atau dideklarasikan sumber (band tinggi).";

/** Accept one pending item on its verified proposal, recording the pending
 *  state it came from so a reviewer can undo it. The caller has already
 *  checked `isAutoAcceptable` and the daily cap. */
function acceptOnProposal(queue: ReviewQueue, id: string, nowIso: string, markers: EventMarker[] = []): ReviewQueue {
  const record: AutoAcceptRecord = {
    event: queue.pending.find((event) => event.id === id) as MarketEvent,
    match: queue.matches[id],
    proposal: queue.proposals[id],
  };
  const impacts = record.proposal.impacts.map(({ symbol, direction, band, path }) => ({ symbol, direction, band, path }));
  const decided = decide(queue, id, { action: "accept", impacts, reason: AUTO_ACCEPT_REASON, viaProposal: true }, nowIso);
  // The markers ride on the accepted event only. The pending copy in `record`
  // stays as it was, so an undo puts back exactly what the screen saw.
  const unique = [...new Set(markers)];
  const accepted = unique.length ? decided.accepted.map((event) => (event.id === id ? { ...event, markers: unique } : event)) : decided.accepted;
  return { ...decided, accepted, decided: { ...decided.decided, [id]: { ...decided.decided[id], auto: record } } };
}

/** One screen's verdict on one pending item. */
export interface ScreenVerdict {
  candidateId: string;
  verdict: "accept" | "reject" | "residual";
  /** Which check decided a reject, with the evidence span it read. */
  check?: ScreenCheck;
  reason: string;
  span?: string;
  score?: number;
  markers?: EventMarker[];
}

export interface VerdictResult {
  next: ReviewQueue;
  accepted: string[];
  rejected: string[];
  /** Screen-flagged rumor/misleading-title items waiting for a person. */
  quarantined: string[];
  residual: string[];
  skipped: Array<{ id: string; why: string }>;
}

export const RESIDUAL_NO_PROPOSAL = "belum ada usulan terverifikasi";
export const RESIDUAL_PROPOSAL_NOT_ELIGIBLE = "usulan belum memenuhi syarat terima otomatis";
export const RESIDUAL_DAILY_CAP = "batas harian terima otomatis tercapai";
export const RESIDUAL_REVERTED = "penerimaan otomatisnya pernah dibatalkan reviewer; hanya orang yang memutuskan";

/**
 * Apply screen verdicts to the pending items. Pure; the caller persists.
 *
 *   - Only ids still pending are touched; any other id is skipped.
 *   - `reject` with a quarantine check (`rumor`, `misleading-title`) moves
 *     the item to `suspected` for a person to confirm or dispute — never a
 *     final dismiss. Every other `reject` dismisses with an `autoReject`
 *     record that keeps the pending item, so a reviewer can restore it.
 *   - `accept` accepts only a verified proposal `isAutoAcceptable` allows,
 *     newest first, under the daily cap. Without one, or over the cap, the
 *     item is left for a person (residual) with the reason why.
 *   - `residual` leaves the item pending, marked with the reason.
 *
 * An item a reviewer took back from an auto-accept or disputed from the
 * rumor tab (`noAuto`) is never rejected or quarantined here, and never
 * accepted (the rule above already refuses it).
 */
export function applyVerdicts(
  queue: ReviewQueue,
  verdicts: ScreenVerdict[],
  nowIso: string,
  dailyMax: number = resolveThresholds().webWatchAutoAcceptDailyMax,
): VerdictResult {
  const pending = new Map(queue.pending.map((event) => [event.id, event]));
  const skipped: VerdictResult["skipped"] = [];
  const seen = new Set<string>();
  const live: ScreenVerdict[] = [];
  for (const verdict of verdicts) {
    const id = verdict.candidateId;
    if (seen.has(id)) {
      skipped.push({ id, why: "verdict ganda untuk calon yang sama" });
      continue;
    }
    seen.add(id);
    if (!pending.has(id)) {
      skipped.push({ id, why: "tidak lagi menunggu" });
      continue;
    }
    if (verdict.verdict === "reject" && queue.matches[id]?.noAuto) {
      skipped.push({ id, why: RESIDUAL_REVERTED });
      continue;
    }
    live.push(verdict);
  }

  const accepted: string[] = [];
  const rejected: string[] = [];
  const quarantined: string[] = [];
  const residual: string[] = [];
  const leave = new Map<string, string>();
  let next = queue;

  for (const verdict of live.filter((v) => v.verdict === "reject")) {
    const id = verdict.candidateId;
    if (isQuarantineCheck(verdict.check)) {
      next = quarantine(next, id, verdict, nowIso);
      quarantined.push(id);
      continue;
    }
    const match = next.matches[id];
    const proposal = next.proposals[id];
    next = decide(next, id, { action: "dismiss", reason: verdict.reason }, nowIso);
    const event = pending.get(id);
    const url = event?.citations[0]?.url;
    const autoReject: AutoRejectRecord = {
      ...(event?.title ? { title: event.title.slice(0, 300) } : {}),
      ...(url ? { url } : {}),
      ...(event ? { event } : {}),
      ...(match ? { match } : {}),
      ...(proposal ? { proposal } : {}),
      ...(verdict.check ? { check: verdict.check } : {}),
      ...(verdict.span ? { span: verdict.span.slice(0, 500) } : {}),
      ...(typeof verdict.score === "number" ? { score: verdict.score } : {}),
      at: nowIso,
    };
    next = { ...next, decided: { ...next.decided, [id]: { ...next.decided[id], autoReject } } };
    rejected.push(id);
  }

  let room = Math.max(0, dailyMax - autoAcceptedSince(queue, nowIso));
  const accepts = live
    .filter((v) => v.verdict === "accept")
    .sort((a, b) => (pending.get(b.candidateId)?.publishedAt ?? "").localeCompare(pending.get(a.candidateId)?.publishedAt ?? ""));
  for (const verdict of accepts) {
    const id = verdict.candidateId;
    const proposal = next.proposals[id];
    if (next.matches[id]?.noAuto) {
      leave.set(id, RESIDUAL_REVERTED);
      continue;
    }
    if (!isAutoAcceptable(proposal, next.matches[id])) {
      leave.set(id, proposal ? RESIDUAL_PROPOSAL_NOT_ELIGIBLE : RESIDUAL_NO_PROPOSAL);
      continue;
    }
    if (room <= 0) {
      leave.set(id, RESIDUAL_DAILY_CAP);
      continue;
    }
    try {
      next = acceptOnProposal(next, id, nowIso, verdict.markers);
    } catch (error) {
      // A stored proposal that no longer validates (e.g. a symbol since
      // dropped from the registry) waits for a person; it must not sink the
      // rest of the batch.
      if (!(error instanceof ReviewError)) throw error;
      leave.set(id, `${RESIDUAL_PROPOSAL_NOT_ELIGIBLE}: ${error.message}`);
      continue;
    }
    room -= 1;
    accepted.push(id);
  }

  for (const verdict of live.filter((v) => v.verdict === "residual")) leave.set(verdict.candidateId, verdict.reason);
  if (leave.size) {
    const matches = { ...next.matches };
    for (const [id, reason] of leave) {
      matches[id] = { ...(matches[id] ?? { symbols: [], matchedBy: [], at: nowIso }), residual: { at: nowIso, reason: reason.slice(0, 500) } };
      residual.push(id);
    }
    next = { ...next, matches };
  }
  return { next, accepted, rejected, quarantined, residual, skipped };
}

/**
 * Move a pending item to the rumor tab, keeping what the screen saw so a
 * dispute restores it exactly. No decision is recorded: the item is waiting,
 * not dismissed.
 */
function quarantine(queue: ReviewQueue, id: string, verdict: ScreenVerdict, nowIso: string): ReviewQueue {
  const event = queue.pending.find((e) => e.id === id);
  if (!event) throw new ReviewError("Kandidat tidak ada di antrean (mungkin sudah diputuskan).");
  if (!verdict.check || !isQuarantineCheck(verdict.check)) throw new ReviewError("Karantina hanya untuk temuan rumor.");
  const match = queue.matches[id] ?? { symbols: [], matchedBy: [], at: nowIso };
  const proposal = queue.proposals[id];
  const pending = queue.pending.filter((e) => e.id !== id);
  return {
    ...queue,
    pending,
    matches: prunePendingRecords(queue.matches, pending),
    proposals: prunePendingRecords(queue.proposals, pending),
    suspected: {
      ...queue.suspected,
      [id]: {
        event,
        match,
        ...(proposal ? { proposal } : {}),
        check: verdict.check,
        reason: verdict.reason.slice(0, 500),
        ...(verdict.span ? { span: verdict.span.slice(0, 500) } : {}),
        ...(typeof verdict.score === "number" ? { score: verdict.score } : {}),
        at: nowIso,
      },
    },
  };
}

/** Legacy rumor auto-rejects (files written before `suspected` existed). */
export function legacySuspectedDecisions(queue: ReviewQueue): ReviewDecision[] {
  return Object.values(queue.decided).filter((d) => d.autoReject && isQuarantineCheck(d.autoReject.check));
}

/** Minimal event rebuilt from a legacy auto-reject, which kept only the
 *  title and address. Enough to list in the rumor tab and to dispute back to
 *  review; the reviewer maps it by hand like any item without a proposal. */
function legacySuspectedEvent(id: string, decision: ReviewDecision, nowIso: string): MarketEvent {
  const title = decision.autoReject?.title ?? id;
  const url = decision.autoReject?.url;
  return {
    id,
    title: title.slice(0, 300),
    summary: decision.reason.slice(0, 500),
    body: null,
    category: "company",
    sourceType: "macro",
    publishedAt: decision.decidedAt,
    asOf: nowIso,
    sector: "Market",
    impactLinks: [],
    citations: [
      {
        id: `web-${id}`,
        provider: "sumber web",
        endpoint: "web-watch",
        field: "body",
        asOf: nowIso,
        label: "Sumber web",
        ...(url ? { url, urlLabel: "Buka sumber asal" } : {}),
        access: "direct",
      },
    ],
  };
}

/**
 * Dispute a suspected item ("Bukan rumor"): it moves back to pending with its
 * match and proposal, marked so the screen never decides it alone again. The
 * reviewer's reason rides on the residual mark, so the eventual accept or
 * dismiss is labelled as calibration for the screen that flagged it.
 */
export function disputeSuspected(queue: ReviewQueue, candidateId: string, reason: string, nowIso: string): ReviewQueue {
  const trimmed = reason.trim().slice(0, 500);
  if (!trimmed) throw new ReviewError("Alasan bantahan wajib diisi.");
  const existing = queue.suspected?.[candidateId];
  const legacy = !existing ? queue.decided[candidateId] : undefined;
  if (!existing && !(legacy?.autoReject && isQuarantineCheck(legacy.autoReject.check))) {
    throw new ReviewError("Kandidat tidak ada di tab rumor (mungkin sudah diputuskan).");
  }
  const event = existing?.event ?? legacySuspectedEvent(candidateId, legacy as ReviewDecision, nowIso);
  const baseMatch = existing?.match ?? { symbols: [], matchedBy: [], at: nowIso };
  const proposal = existing?.proposal;
  if (queue.pending.some((e) => e.id === candidateId)) throw new ReviewError("Kandidat sudah kembali di antrean.");
  const match: TriageMatch = {
    ...withoutResidual(baseMatch),
    noAuto: true,
    residual: { at: nowIso, reason: `Bukan rumor menurut reviewer: ${trimmed}`.slice(0, 500) },
  };
  const decided = { ...queue.decided };
  if (legacy) delete decided[candidateId];
  const suspected = { ...queue.suspected };
  delete suspected[candidateId];
  return {
    ...queue,
    pending: [event, ...queue.pending.filter((e) => e.id !== candidateId)],
    decided,
    suspected,
    matches: { ...queue.matches, [candidateId]: match },
    ...(proposal ? { proposals: { ...queue.proposals, [candidateId]: proposal } } : {}),
  };
}

/**
 * Confirm a suspected item is rumor: final dismiss with the reviewer's own
 * reason. The screen evidence it confirmed is kept on the decision for audit,
 * without counting as an automatic reject.
 */
export function dismissSuspected(queue: ReviewQueue, candidateId: string, reason: string, nowIso: string): ReviewQueue {
  const trimmed = reason.trim().slice(0, 500);
  if (!trimmed) throw new ReviewError("Alasan penolakan wajib diisi.");
  const existing = queue.suspected?.[candidateId];
  const legacy = !existing ? queue.decided[candidateId] : undefined;
  if (!existing && !(legacy?.autoReject && isQuarantineCheck(legacy.autoReject.check))) {
    throw new ReviewError("Kandidat tidak ada di tab rumor (mungkin sudah diputuskan).");
  }
  const check = existing?.check ?? legacy?.autoReject?.check ?? ("rumor" as ScreenCheck);
  const screenAt = existing?.at ?? legacy?.autoReject?.at ?? nowIso;
  const fromSuspect: ReviewDecision["fromSuspect"] = {
    check,
    ...(existing?.span ?? legacy?.autoReject?.span ? { span: (existing?.span ?? legacy?.autoReject?.span as string).slice(0, 500) } : {}),
    ...(typeof (existing?.score ?? legacy?.autoReject?.score) === "number" ? { score: existing?.score ?? legacy?.autoReject?.score as number } : {}),
    at: screenAt,
  };
  const suspected = { ...queue.suspected };
  delete suspected[candidateId];
  return {
    ...queue,
    suspected,
    decided: {
      ...queue.decided,
      [candidateId]: { candidateId, status: "dismissed", decidedAt: nowIso, reason: trimmed, fromSuspect },
    },
  };
}

/**
 * Undo an auto-accept: the event leaves the engine's list and goes back to
 * review with its match and proposal, marked so the sweep never accepts it
 * alone again. Only auto-accepts can be undone here; a person's own accept
 * is theirs to keep.
 */
function withoutResidual(match: TriageMatch): TriageMatch {
  const { residual: _stale, ...rest } = match;
  void _stale;
  return rest;
}

export function revertAutoAccept(queue: ReviewQueue, candidateId: string): ReviewQueue {
  const decision = queue.decided[candidateId];
  if (!decision?.auto) throw new ReviewError("Hanya penerimaan otomatis yang bisa dibatalkan di sini.");
  const { event, match, proposal } = decision.auto;
  const { [candidateId]: _removed, ...decided } = queue.decided;
  void _removed;
  return {
    ...queue,
    pending: [event, ...queue.pending.filter((e) => e.id !== candidateId)],
    accepted: queue.accepted.filter((e) => e.id !== candidateId),
    decided,
    // A residual mark the match carried from an earlier screen run is
    // dropped: the screen resolved that doubt when it accepted, so neither the
    // page nor a later calibration label should read it. The next screen run
    // marks the item again (an accept on a `noAuto` item stays residual).
    matches: { ...queue.matches, [candidateId]: { ...withoutResidual(match), noAuto: true } },
    proposals: { ...queue.proposals, [candidateId]: proposal },
  };
}

/**
 * Take back a final auto-reject ("Kembalikan ke antrean"): the item returns to
 * pending as the screen read it, marked so the screen never decides it alone
 * again, with the reviewer's reason on the residual mark so the decision they
 * make next labels the screen's mistake. A reject written before the record
 * kept its event comes back with its title and address, like a legacy rumor.
 * Only screen rejects come back; a person's own dismiss stays theirs.
 */
export function restoreAutoReject(queue: ReviewQueue, candidateId: string, reason: string, nowIso: string): ReviewQueue {
  const trimmed = reason.trim().slice(0, 500);
  if (!trimmed) throw new ReviewError("Alasan pengembalian wajib diisi.");
  const decision = queue.decided[candidateId];
  const record = decision?.autoReject;
  if (!decision || !record || isQuarantineCheck(record.check)) {
    throw new ReviewError("Hanya penolakan otomatis penyaring yang bisa dikembalikan di sini.");
  }
  if (queue.pending.some((e) => e.id === candidateId)) throw new ReviewError("Kandidat sudah kembali di antrean.");
  const event = record.event ?? legacySuspectedEvent(candidateId, decision, nowIso);
  const match: TriageMatch = {
    ...withoutResidual(record.match ?? { symbols: [], matchedBy: [], at: nowIso }),
    noAuto: true,
    residual: { at: nowIso, reason: `Dikembalikan reviewer dari tolak otomatis: ${trimmed}`.slice(0, 500) },
  };
  const { [candidateId]: _removed, ...decided } = queue.decided;
  void _removed;
  return {
    ...queue,
    pending: [event, ...queue.pending],
    decided,
    matches: { ...queue.matches, [candidateId]: match },
    ...(record.proposal ? { proposals: { ...queue.proposals, [candidateId]: record.proposal } } : {}),
  };
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
  autoAccepted: number;
  /** Pending items the last screen left for a person. */
  residual: number;
  /** Items the screen dismissed alone (non-rumor checks); final. */
  autoRejected: number;
  /** Items the screen flagged as rumor, waiting for a person. */
  suspected: number;
  archivedByRule: Partial<Record<TriageRule, number>>;
  /** `ReviewQueue.lastScreenAt`; null before the screen's first applied run. */
  lastScreenAt: string | null;
}

const zeroCounts: OverlayCounts = { pending: 0, decided: 0, archived: 0, proposals: 0, autoAccepted: 0, residual: 0, autoRejected: 0, suspected: 0, archivedByRule: {}, lastScreenAt: null };

let overlay: OverlayCounts & { events: MarketEvent[]; expiresAt: number } = { events: [], ...zeroCounts, expiresAt: 0 };

/** The counts the assistant can read about the queue, from one queue value. */
export function overlayCounts(queue: ReviewQueue): OverlayCounts {
  const archivedByRule: Partial<Record<TriageRule, number>> = {};
  for (const entry of Object.values(queue.archived)) archivedByRule[entry.rule] = (archivedByRule[entry.rule] ?? 0) + 1;
  const legacySuspected = legacySuspectedDecisions(queue).length;
  return {
    pending: queue.pending.length,
    decided: Object.keys(queue.decided).length,
    archived: Object.keys(queue.archived).length,
    proposals: Object.keys(queue.proposals).length,
    autoAccepted: Object.values(queue.decided).filter((d) => d.auto).length,
    residual: queue.pending.filter((event) => queue.matches[event.id]?.residual).length,
    autoRejected: Object.values(queue.decided).filter((d) => d.autoReject && !isQuarantineCheck(d.autoReject.check)).length,
    suspected: Object.keys(queue.suspected ?? {}).length + legacySuspected,
    archivedByRule,
    lastScreenAt: queue.lastScreenAt ?? null,
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
    autoAccepted: overlay.autoAccepted,
    residual: overlay.residual,
    autoRejected: overlay.autoRejected,
    suspected: overlay.suspected,
    archivedByRule: overlay.archivedByRule,
    lastScreenAt: overlay.lastScreenAt,
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
