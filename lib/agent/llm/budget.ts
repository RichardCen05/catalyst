/**
 * Daily call ceiling for the model layer.
 *
 * `.env.example` has promised `LLM_DAILY_CALL_BUDGET` since the LLM path was
 * wired, but nothing enforced it: there was no counter, no ledger, and no
 * gate. A project that sells transparency must not document a guardrail it
 * does not have, so this is the counter that makes the promise true.
 *
 * Modelled on the Sectors spend ledger in `lib/data/sectors-client.ts`, with
 * one difference that matters. Sectors credit is money already spent and the
 * ledger must never undercount, so that path fails closed. Model quota is a
 * daily allowance that refills, and a page must not go dark because the
 * ledger object is unreachable, so this path fails open to an in-process
 * counter and says so in the log. A single Cloud Run instance still caps
 * itself in that state; several instances can collectively overshoot until
 * GCS answers again. That is the honest trade, written down rather than
 * hidden.
 *
 * Two things close the gate:
 *
 *   - the day's call count reaching `LLM_DAILY_CALL_BUDGET`;
 *   - repeated 429s from the model, which close the gate for the rest of that
 *     day rather than letting every later request re-learn the same
 *     rejection.
 *
 * A single 429 no longer closes it. That rule was written for a per-key daily
 * quota, where the first 429 means the allowance is gone and every later call
 * would meet the same wall. It is wrong for a shared pool — the free tiers
 * behind `LLM_PROVIDER=openai-compatible` answer 429 when someone else was
 * busy for a second, and one such second would otherwise cost a full day of
 * model prose on a perfectly healthy key. The gate closes on
 * `LLM_RATE_LIMIT_STRIKES` of them instead, which still costs at most that
 * many wasted calls against a genuinely exhausted quota.
 *
 * Both raise `LlmBudgetError`, which the engine turns into the deterministic
 * answer plus a note the reader can see. Leaving the variable unset means no
 * ceiling — call volume is then unbounded, and `.env.example` says so.
 *
 * The two gates are independent, and only the ceiling is ours. A free tier
 * has no spend to cap, so the ceiling is left unset there; the 429 gate is
 * the vendor refusing and still applies. Unsetting the ceiling used to switch
 * both off, which is exactly backwards for the case it exists for: nothing to
 * count, and every request re-learning the same refusal all day.
 */
import { gcsGetJson, gcsPutJson, GcsPreconditionFailed } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";

export type LlmBudgetReason = "budget" | "rate-limit";

export class LlmBudgetError extends Error {
  readonly reason: LlmBudgetReason;
  constructor(reason: LlmBudgetReason, message: string) {
    super(message);
    this.name = "LlmBudgetError";
    this.reason = reason;
  }
}

/** The note a reader sees when the deterministic path answered instead. */
export function budgetNoteFor(reason: LlmBudgetReason): string {
  return reason === "budget"
    ? "Plafon panggilan model hari ini sudah tercapai. Jawaban ini ditulis jalur deterministik, bukan model; angka dan kutipannya sama."
    : "Model menolak dengan batas laju (429). Jawaban ini ditulis jalur deterministik, bukan model; angka dan kutipannya sama.";
}

export interface LlmDayLedger {
  date: string;
  calls: number;
  /** How many 429s landed today, across every instance. */
  rateLimits?: number;
  /** Set once the strikes run out, so the rest of the day skips the model. */
  rateLimitedAt?: string;
}

export interface LlmBudgetStore {
  load(date: string): Promise<{ data: LlmDayLedger; generation: string } | null>;
  save(date: string, ledger: LlmDayLedger, ifGenerationMatch: string): Promise<void>;
}

const ledgerPath = (date: string) => `catalyst/_ledger/llm/${date}.json`;

export const gcsBudgetStore: LlmBudgetStore = {
  load: (date) => gcsGetJson<LlmDayLedger>(BUCKET, ledgerPath(date)),
  save: async (date, ledger, ifGenerationMatch) => {
    await gcsPutJson(BUCKET, ledgerPath(date), ledger, { ifGenerationMatch });
  },
};

/** Fallback counter for when the ledger object cannot be read or written. */
let localDay = "";
let localCalls = 0;
let localRateLimits = 0;
let localRateLimited = false;

function localLedger(date: string): LlmDayLedger {
  if (localDay !== date) {
    localDay = date;
    localCalls = 0;
    localRateLimits = 0;
    localRateLimited = false;
  }
  return { date, calls: localCalls, rateLimits: localRateLimits, ...(localRateLimited ? { rateLimitedAt: date } : {}) };
}

/** Test seam — resets the in-process counter between cases. */
export function resetLocalLlmBudget(): void {
  localDay = "";
  localCalls = 0;
  localRateLimits = 0;
  localRateLimited = false;
  warnedDay = "";
}

/**
 * The ledger being unreachable is one condition, not one per call.
 *
 * A machine with no credentials for the bucket repeats this on every model
 * call, which buries the lines that describe a single event. Saying it once
 * a day says the same thing.
 */
let warnedDay = "";
function warnLedgerUnreachable(date: string, error: unknown): void {
  if (warnedDay === date) return;
  warnedDay = date;
  console.warn(`[llm-budget] ledger unreachable, counting in-process only for ${date}: ${error instanceof Error ? error.message : String(error)}`);
}

/**
 * How many 429s in a day close the gate. One is right for a per-key quota and
 * wrong for a shared pool, so the count is configurable rather than assumed.
 */
const DEFAULT_RATE_LIMIT_STRIKES = 3;

export function rateLimitStrikes(): number {
  const raw = process.env.LLM_RATE_LIMIT_STRIKES;
  if (!raw) return DEFAULT_RATE_LIMIT_STRIKES;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : DEFAULT_RATE_LIMIT_STRIKES;
}

export function dailyBudget(): number | null {
  const raw = process.env.LLM_DAILY_CALL_BUDGET;
  if (!raw) return null;
  const parsed = Number(raw);
  return Number.isFinite(parsed) && parsed > 0 ? Math.floor(parsed) : null;
}

const dayOf = (now: Date) => now.toISOString().slice(0, 10);

/**
 * Count one model call against today's ceiling, or refuse it.
 *
 * Called immediately before the request goes out, not after it returns: a
 * call that fails still consumed quota, and counting only successes would let
 * a failing key burn the day's allowance without ever moving the counter.
 */
export async function reserveLlmCall(
  store: LlmBudgetStore = gcsBudgetStore,
  now: Date = new Date(),
): Promise<void> {
  const date = dayOf(now);

  // The strike gate first, and whether or not a ceiling is set: it records
  // the vendor refusing, not our own accounting, and a run with no ceiling
  // still must not spend the day re-learning the same 429.
  if (localLedger(date).rateLimitedAt) {
    throw new LlmBudgetError("rate-limit", `Model rate limited earlier today (${date})`);
  }

  const budget = dailyBudget();
  // No ceiling means nothing to count, so nothing to read or write. That also
  // keeps a run with no ledger reachable — a local machine with no
  // credentials — from warning once per model call about a file it has no
  // reason to open.
  if (budget === null) return;

  let loaded: { data: LlmDayLedger; generation: string } | null = null;
  let remote = true;
  try {
    loaded = await store.load(date);
  } catch (error) {
    remote = false;
    warnLedgerUnreachable(date, error);
  }

  const current = remote ? loaded?.data ?? { date, calls: 0 } : localLedger(date);
  if (current.rateLimitedAt) {
    throw new LlmBudgetError("rate-limit", `Model rate limited earlier today (${current.rateLimitedAt})`);
  }
  if (current.calls >= budget) {
    throw new LlmBudgetError("budget", `Daily model call budget reached (${current.calls}/${budget})`);
  }

  const next: LlmDayLedger = { ...current, date, calls: current.calls + 1 };
  if (!remote) {
    localCalls = next.calls;
    return;
  }
  try {
    await store.save(date, next, loaded?.generation ?? "0");
  } catch (error) {
    // A precondition failure means another instance counted first. Re-read
    // once; a second failure counts locally rather than dropping the call.
    if (error instanceof GcsPreconditionFailed) {
      const retry = await store.load(date).catch(() => null);
      const base = retry?.data ?? { date, calls: current.calls };
      if (base.rateLimitedAt) throw new LlmBudgetError("rate-limit", `Model rate limited earlier today (${base.rateLimitedAt})`);
      if (base.calls >= budget) throw new LlmBudgetError("budget", `Daily model call budget reached (${base.calls}/${budget})`);
      await store.save(date, { ...base, date, calls: base.calls + 1 }, retry?.generation ?? "0").catch(() => {
        localCalls = base.calls + 1;
      });
      return;
    }
    localCalls = next.calls;
    console.warn(`[llm-budget] ledger write failed, counting in-process only: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** Close the gate for the rest of the day after the model answered 429. */
export async function noteLlmRateLimited(
  store: LlmBudgetStore = gcsBudgetStore,
  now: Date = new Date(),
): Promise<void> {
  const date = dayOf(now);
  const strikes = rateLimitStrikes();
  localLedger(date);
  localRateLimits += 1;
  if (localRateLimits >= strikes) localRateLimited = true;
  if (dailyBudget() === null) return;
  try {
    const loaded = await store.load(date);
    const current = loaded?.data ?? { date, calls: 0 };
    const rateLimits = (current.rateLimits ?? 0) + 1;
    await store.save(
      date,
      { ...current, date, rateLimits, ...(rateLimits >= strikes ? { rateLimitedAt: now.toISOString() } : {}) },
      loaded?.generation ?? "0",
    );
  } catch (error) {
    console.warn(`[llm-budget] could not record rate limit: ${error instanceof Error ? error.message : String(error)}`);
  }
}

/** True when the thrown value is the model answering 429. */
export function isRateLimitError(error: unknown): boolean {
  if (error instanceof LlmBudgetError) return false;
  const status = (error as { status?: unknown })?.status;
  if (status === 429) return true;
  const code = (error as { code?: unknown })?.code;
  if (code === 429) return true;
  const message = error instanceof Error ? error.message : String(error);
  return /\b429\b|RESOURCE_EXHAUSTED|rate.?limit/i.test(message);
}
