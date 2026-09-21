import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import {
  budgetNoteFor,
  dailyBudget,
  isRateLimitError,
  LlmBudgetError,
  noteLlmRateLimited,
  reserveLlmCall,
  resetLocalLlmBudget,
  type LlmBudgetStore,
  type LlmDayLedger,
} from "@/lib/agent/llm/budget";

/** `.env.example` promised a daily model-call ceiling long before anything
 *  enforced one. These cover the four states that promise has to survive:
 *  under budget, at budget, over budget, and a 429 arriving mid-day. */

const NOW = new Date("2026-09-17T04:00:00.000Z");
const DATE = "2026-09-17";

function memoryStore(seed?: LlmDayLedger): LlmBudgetStore & { current: LlmDayLedger | null; writes: number } {
  const state = {
    current: seed ?? null,
    writes: 0,
    generation: seed ? "1" : "0",
    async load(date: string) {
      return state.current && state.current.date === date
        ? { data: structuredClone(state.current), generation: state.generation }
        : null;
    },
    async save(_date: string, ledger: LlmDayLedger) {
      state.current = structuredClone(ledger);
      state.generation = String(Number(state.generation) + 1);
      state.writes += 1;
    },
  };
  return state as LlmBudgetStore & { current: LlmDayLedger | null; writes: number };
}

beforeEach(() => {
  resetLocalLlmBudget();
});

afterEach(() => {
  vi.unstubAllEnvs();
  vi.restoreAllMocks();
});

describe("reserveLlmCall", () => {
  it("counts the call when the day is under budget", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "3");
    const store = memoryStore({ date: DATE, calls: 1 });

    await expect(reserveLlmCall(store, NOW)).resolves.toBeUndefined();
    expect(store.current).toEqual({ date: DATE, calls: 2 });
  });

  it("allows the last call at the budget boundary and refuses the next", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "3");
    const store = memoryStore({ date: DATE, calls: 2 });

    // calls 2 -> 3 is the last one the ceiling permits.
    await reserveLlmCall(store, NOW);
    expect(store.current).toEqual({ date: DATE, calls: 3 });

    await expect(reserveLlmCall(store, NOW)).rejects.toBeInstanceOf(LlmBudgetError);
    expect(store.current).toEqual({ date: DATE, calls: 3 });
  });

  it("refuses with reason 'budget' once the day is over budget", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "5");
    const store = memoryStore({ date: DATE, calls: 9 });

    await expect(reserveLlmCall(store, NOW)).rejects.toMatchObject({ name: "LlmBudgetError", reason: "budget" });
    expect(budgetNoteFor("budget")).toContain("Plafon panggilan model");
  });

  it("starts a fresh count on a new day", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "2");
    const store = memoryStore({ date: "2026-09-16", calls: 2 });

    await expect(reserveLlmCall(store, NOW)).resolves.toBeUndefined();
    expect(store.current).toEqual({ date: DATE, calls: 1 });
  });

  it("imposes no ceiling when the variable is unset", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "");
    const store = memoryStore({ date: DATE, calls: 10_000 });

    expect(dailyBudget()).toBeNull();
    await expect(reserveLlmCall(store, NOW)).resolves.toBeUndefined();
    expect(store.writes).toBe(0);
  });

  it("falls open to an in-process count when the ledger cannot be read", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "2");
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const broken: LlmBudgetStore = {
      load: async () => { throw new Error("GCS metadata GET failed: 503"); },
      save: async () => { throw new Error("GCS write failed"); },
    };

    // The page must not go dark because the ledger object is unreachable, but
    // this instance still caps itself.
    await reserveLlmCall(broken, NOW);
    await reserveLlmCall(broken, NOW);
    await expect(reserveLlmCall(broken, NOW)).rejects.toMatchObject({ reason: "budget" });
  });
});

describe("noteLlmRateLimited", () => {
  it("closes the gate for the rest of the day once the strikes run out", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "100");
    vi.stubEnv("LLM_RATE_LIMIT_STRIKES", "3");
    const store = memoryStore({ date: DATE, calls: 4 });

    await noteLlmRateLimited(store, NOW);
    await noteLlmRateLimited(store, NOW);
    await noteLlmRateLimited(store, NOW);
    expect(store.current?.rateLimitedAt).toBe(NOW.toISOString());

    await expect(reserveLlmCall(store, NOW)).rejects.toMatchObject({ reason: "rate-limit" });
    // The refused call is not counted — it never reached the model.
    expect(store.current?.calls).toBe(4);
    expect(budgetNoteFor("rate-limit")).toContain("429");
  });

  /** A shared free pool answers 429 when someone else was busy for a second.
   *  Closing on the first one would cost a full day of prose on a healthy key. */
  it("keeps serving the model through a transient 429", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "100");
    vi.stubEnv("LLM_RATE_LIMIT_STRIKES", "3");
    const store = memoryStore({ date: DATE, calls: 4 });

    await noteLlmRateLimited(store, NOW);
    expect(store.current?.rateLimits).toBe(1);
    expect(store.current?.rateLimitedAt).toBeUndefined();

    await expect(reserveLlmCall(store, NOW)).resolves.toBeUndefined();
    expect(store.current?.calls).toBe(5);
  });

  it("counts the strikes across instances, not per instance", async () => {
    vi.stubEnv("LLM_DAILY_CALL_BUDGET", "100");
    vi.stubEnv("LLM_RATE_LIMIT_STRIKES", "2");
    const store = memoryStore({ date: DATE, calls: 0, rateLimits: 1 });

    await noteLlmRateLimited(store, NOW);
    expect(store.current?.rateLimits).toBe(2);
    expect(store.current?.rateLimitedAt).toBe(NOW.toISOString());
  });

  it("recognises the shapes a 429 arrives in", () => {
    expect(isRateLimitError({ status: 429 })).toBe(true);
    expect(isRateLimitError(new Error("got status 429 RESOURCE_EXHAUSTED"))).toBe(true);
    expect(isRateLimitError(new Error("429"))).toBe(true);
    expect(isRateLimitError(new Error("403 PERMISSION_DENIED"))).toBe(false);
    // A budget refusal is ours, not the model's — it must not be mistaken for
    // an upstream rate limit and re-close the gate.
    expect(isRateLimitError(new LlmBudgetError("budget", "Daily model call budget reached (3/3)"))).toBe(false);
  });
});
