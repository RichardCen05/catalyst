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
 *   - a 429 from the model, which closes the gate for the rest of that day
 *     rather than letting every later request re-learn the same rejection.
 *
 * Both raise `LlmBudgetError`, which the engine turns into the deterministic
 * answer plus a note the reader can see. Leaving the variable unset means no
 * ceiling — call volume is then unbounded, and `.env.example` says so.
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
  /** Set once a 429 lands, so the rest of the day skips the model. */
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
let localRateLimited = false;

function localLedger(date: string): LlmDayLedger {
  if (localDay !== date) {
    localDay = date;
    localCalls = 0;
    localRateLimited = false;
  }
  return { date, calls: localCalls, ...(localRateLimited ? { rateLimitedAt: date } : {}) };
}

/** Test seam — resets the in-process counter between cases. */
export function resetLocalLlmBudget(): void {
  localDay = "";
  localCalls = 0;
  localRateLimited = false;
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
  const budget = dailyBudget();
  if (budget === null) return;
  const date = dayOf(now);

  let loaded: { data: LlmDayLedger; generation: string } | null = null;
  let remote = true;
  try {
    loaded = await store.load(date);
  } catch (error) {
    remote = false;
    console.warn(`[llm-budget] ledger read failed, counting in-process only: ${error instanceof Error ? error.message : String(error)}`);
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
  localLedger(date);
  localRateLimited = true;
  if (dailyBudget() === null) return;
  try {
    const loaded = await store.load(date);
    const current = loaded?.data ?? { date, calls: 0 };
    await store.save(date, { ...current, date, rateLimitedAt: now.toISOString() }, loaded?.generation ?? "0");
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
