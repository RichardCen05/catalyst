# Wire Everything: Gemini Layer + Live Sectors Activation Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** Replace every remaining hand-authored narrative/heuristic in the agent layer with a Gemini-backed judgment step (mandate parsing, exposure path + relevance/direction, Copilot answers, a verifier pass), move the LLM-touched engine calls behind server-only API routes, and — as a separately gated final phase — flip the already-built `sectors-client.ts` from inert to live.

**Architecture:** Six new modules under `lib/agent/llm/` wrap `@google/genai` with structured output (`responseJsonSchema`) and an `AGENT_MODE=deterministic|llm` flag; every call falls back to the existing deterministic engine on error, budget exhaustion, or 429. Because the LLM key must never reach the browser, the four pages that currently call `agentEngine` directly from the client (`app/page.tsx`, `app/cases/page.tsx`, `app/impact/page.tsx`, `app/companies/[symbol]/company-detail-client.tsx`) move to fetching from expanded `/api/analyze`, `/api/impact` GET routes instead.

**Tech Stack:** Next.js 16 (App Router), TypeScript, `@google/genai` (new dependency — the only one this plan adds), Vitest, Playwright, existing `lib/gcp/gcs.ts` REST client (no new GCP client library).

**Spec:** `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md` (sections 3, 4, 5-P2, 5-P3, 6) — this plan implements P2 in full and gates P3's go-live behind the credit-discipline steps that document already mandates. Read that spec's section 3 ("Pembagian kerja model vs kalkulator") before Task 5; every LLM role task below cites the exact table row it implements.

## Global Constraints

- LLM never outputs a number that isn't already deterministic. See the "Open Question" callout before Task 6 — the spec's own relevance-score row conflicts with this rule, and this plan resolves it by having the LLM emit a `relevanceBand` ("high"/"medium"/"low"), not an integer; a fixed deterministic table maps band → the number that ships to the UI.
- `AGENT_MODE=deterministic` is the default and MUST remain what `pnpm test` runs under — no test may require a network call or `GOOGLE_API_KEY` to pass.
- `GOOGLE_API_KEY` is read only in files with no `"use client"` directive and only inside route handlers / server-only modules. Never prefix with `NEXT_PUBLIC_`.
- No new dependency beyond `@google/genai` (already budgeted in the spec). GCS access reuses `lib/gcp/gcs.ts` (plain `fetch`, metadata-server auth) — no `@google-cloud/storage`.
- Reuse `katalis-recorded` (existing bucket) for LLM result caching under `catalyst/llm/`, matching the pattern `lib/memory/gcs-memory.ts` already established under `catalyst/memory/`.
- Every LLM call must be wrapped so a thrown error, a 429, or `AGENT_MODE=deterministic` produces the *exact* deterministic-path output — never a 500 to the user.
- Gate before each phase closes: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`, all green, `AGENT_MODE` unset (so it defaults to deterministic).

## Non-goals (explicitly out of scope for this plan)

- **Tier 3 seed content** (Raka/Maya demo personas, `defaultPlaybook`, `basePreferences`, guided-tour copy in `lib/data/fixtures.ts:120-137`, `lib/store.ts:58-70`, `components/guided-tour.tsx`) is intentional demo/onboarding content for a hackathon judge, not data pretending to be real. Leave it. If you want it removed too, that's a different, smaller plan — say so explicitly and it'll be scoped separately.
- **`lagFor`/`confidenceFor` thresholds** in `lib/agent/engine.ts` stay deterministic policy (fixed 90/75 bands, "1-10 sesi" windows). The spec's section 3 table does not reassign these to the LLM, and there is no evidence-backed number they could be derived from — they are judging thresholds, not narrated facts.
- **Full replacement of every static Indonesian string in `engine.ts`** (the `protocol.claim`/`supportingEvidence`/`insufficientWhen`/`nextQuestion` text). These describe the *method*, identically for every case of a given pillar — that is correct, reusable methodology copy, not a fabricated observation. Only the mandate/exposure/relevance/direction/answer/verify roles named in the spec move to the LLM.
- **P6 (buying more Sectors credit)** — separate decision, not a code task.

---

## Phase A — LLM foundation (no user-visible behavior change)

### Task 1: Gemini client wrapper

**Files:**
- Create: `lib/agent/llm/client.ts`
- Test: `tests/llm-client.test.ts`
- Modify: `package.json` (add `@google/genai`)

**Interfaces:**
- Produces: `getGenAiClient(): GoogleGenAI`, `generateStructured<T>(params: { model: string; systemInstruction: string; contents: string; schema: object }): Promise<T>`

- [ ] **Step 1: Add the dependency**

```bash
pnpm add @google/genai
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/llm-client.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("getGenAiClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws a clear error when no credentials are configured", async () => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENAI_USE_ENTERPRISE;
    const { getGenAiClient } = await import("@/lib/agent/llm/client");
    expect(() => getGenAiClient()).toThrow(/GOOGLE_API_KEY/);
  });

  it("constructs a Developer API client when GOOGLE_API_KEY is set", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    const { getGenAiClient } = await import("@/lib/agent/llm/client");
    expect(() => getGenAiClient()).not.toThrow();
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run tests/llm-client.test.ts`
Expected: FAIL — `Cannot find module '@/lib/agent/llm/client'`

- [ ] **Step 4: Write the implementation**

```typescript
// lib/agent/llm/client.ts
import { GoogleGenAI } from "@google/genai";

/**
 * One SDK, two auth paths, chosen from env with no code change at the call
 * site (spec section 3, "Bentuk teknis"). Developer API is what both local
 * dev and the current Cloud Run deploy use; Vertex is wired but inert until
 * GOOGLE_GENAI_USE_ENTERPRISE=true is set, so moving off the free tier later
 * is an env change, not a code change.
 */
export function getGenAiClient(): GoogleGenAI {
  if (process.env.GOOGLE_GENAI_USE_ENTERPRISE === "true") {
    const project = process.env.GOOGLE_CLOUD_PROJECT;
    const location = process.env.GOOGLE_CLOUD_LOCATION;
    if (!project || !location) {
      throw new Error("GOOGLE_GENAI_USE_ENTERPRISE=true requires GOOGLE_CLOUD_PROJECT and GOOGLE_CLOUD_LOCATION");
    }
    return new GoogleGenAI({ vertexai: true, project, location });
  }
  const apiKey = process.env.GOOGLE_API_KEY;
  if (!apiKey) throw new Error("GOOGLE_API_KEY is not set (and GOOGLE_GENAI_USE_ENTERPRISE is not true)");
  return new GoogleGenAI({ apiKey });
}

export interface StructuredCallParams {
  model: string;
  systemInstruction: string;
  contents: string;
  schema: Record<string, unknown>;
  maxOutputTokens?: number;
}

/** One structured-output call. Callers own their own fallback — this throws on any failure, it never returns a partial result. */
export async function generateStructured<T>(params: StructuredCallParams): Promise<T> {
  const client = getGenAiClient();
  const response = await client.models.generateContent({
    model: params.model,
    contents: params.contents,
    config: {
      systemInstruction: params.systemInstruction,
      responseMimeType: "application/json",
      responseJsonSchema: params.schema,
      maxOutputTokens: params.maxOutputTokens ?? 1024,
    },
  });
  const text = response.text;
  if (!text) throw new Error("Gemini returned no text");
  return JSON.parse(text) as T;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/llm-client.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Commit**

```bash
git add package.json pnpm-lock.yaml lib/agent/llm/client.ts tests/llm-client.test.ts
git commit -m "feat: add Gemini client wrapper (Developer API / Vertex switch)"
```

---

### Task 2: `AGENT_MODE` flag

**Files:**
- Create: `lib/agent/mode.ts`
- Test: `tests/mode.test.ts`

**Interfaces:**
- Produces: `agentMode(): "deterministic" | "llm"`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/mode.test.ts
import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("agentMode", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => { vi.resetModules(); process.env = { ...originalEnv }; });
  afterEach(() => { process.env = originalEnv; });

  it("defaults to deterministic when AGENT_MODE is unset", async () => {
    delete process.env.AGENT_MODE;
    const { agentMode } = await import("@/lib/agent/mode");
    expect(agentMode()).toBe("deterministic");
  });

  it("returns llm only for the exact string 'llm'", async () => {
    process.env.AGENT_MODE = "llm";
    const { agentMode } = await import("@/lib/agent/mode");
    expect(agentMode()).toBe("llm");
  });

  it("treats any other value as deterministic, fail-closed", async () => {
    process.env.AGENT_MODE = "LLM";
    const { agentMode } = await import("@/lib/agent/mode");
    expect(agentMode()).toBe("deterministic");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/mode.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// lib/agent/mode.ts
export type AgentMode = "deterministic" | "llm";

/** deterministic = no model call, ever (the default, and what tests run under). llm = the agent layer is active. */
export function agentMode(): AgentMode {
  return process.env.AGENT_MODE === "llm" ? "llm" : "deterministic";
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/mode.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/agent/mode.ts tests/mode.test.ts
git commit -m "feat: add AGENT_MODE deterministic/llm flag"
```

---

### Task 3: LLM result cache in GCS

**Files:**
- Create: `lib/agent/llm/cache.ts`
- Test: `tests/llm-cache.test.ts`
- Modify: `lib/gcp/gcs.ts:1` (no code change — this task only imports from it; listed so the reviewer knows the dependency)

**Interfaces:**
- Consumes: `gcsGetJson`, `gcsPutJson` from `@/lib/gcp/gcs` (existing, see `lib/gcp/gcs.ts`)
- Produces: `cacheKeyFor(parts: string[]): string`, `getCached<T>(key: string): Promise<T | null>`, `setCached<T>(key: string, value: T): Promise<void>`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/llm-cache.test.ts
import { describe, expect, it, vi } from "vitest";
import * as gcs from "@/lib/gcp/gcs";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";

vi.mock("@/lib/gcp/gcs", () => ({
  gcsGetJson: vi.fn(),
  gcsPutJson: vi.fn(),
}));

describe("cacheKeyFor", () => {
  it("is a stable sha256 of its parts, order-sensitive", () => {
    const a = cacheKeyFor(["ANTM", "mandate-hash-1"]);
    const b = cacheKeyFor(["ANTM", "mandate-hash-1"]);
    const c = cacheKeyFor(["mandate-hash-1", "ANTM"]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("getCached / setCached", () => {
  it("returns null on a cache miss without throwing", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce(null);
    expect(await getCached("some-key")).toBeNull();
  });

  it("returns null (not throw) if GCS is unreachable", async () => {
    vi.mocked(gcs.gcsGetJson).mockRejectedValueOnce(new Error("network"));
    expect(await getCached("some-key")).toBeNull();
  });

  it("returns the cached value on a hit", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce({ data: { hello: "world" }, generation: "1" });
    expect(await getCached("some-key")).toEqual({ hello: "world" });
  });

  it("writes through gcsPutJson and swallows write failures", async () => {
    vi.mocked(gcs.gcsPutJson).mockRejectedValueOnce(new Error("network"));
    await expect(setCached("some-key", { hello: "world" })).resolves.toBeUndefined();
    expect(gcs.gcsPutJson).toHaveBeenCalledWith("katalis-recorded", "catalyst/llm/some-key.json", { hello: "world" });
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/llm-cache.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// lib/agent/llm/cache.ts
import { createHash } from "node:crypto";
import { gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";

/** sha256(symbol + mandate + evidenceHash) per spec section 6, "Hasil LLM disimpan di GCS dengan kunci ...". Order-sensitive by design — join with a separator that can't appear in a single part. */
export function cacheKeyFor(parts: string[]): string {
  return createHash("sha256").update(parts.join(" ")).digest("hex");
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const result = await gcsGetJson<T>(BUCKET, `catalyst/llm/${key}.json`);
    return result?.data ?? null;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  try {
    await gcsPutJson(BUCKET, `catalyst/llm/${key}.json`, value);
  } catch {
    // Cache is an optimization, not a correctness requirement — a write failure
    // just means this result gets recomputed next time.
  }
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/llm-cache.test.ts`
Expected: PASS (5 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/agent/llm/cache.ts tests/llm-cache.test.ts
git commit -m "feat: add sha256-keyed GCS cache for LLM results"
```

---

## Phase B — LLM roles (pure functions, mockable client)

Every role in this phase takes an injected `call` function (defaulting to `generateStructured`) so tests never touch the network — this is what keeps `AGENT_MODE=deterministic` (and therefore `pnpm test`) free of any Gemini dependency at the boundary, not just by convention.

### Task 4: Mandate parser (spec table row: "Mandate parser")

**Files:**
- Create: `lib/agent/llm/mandate.ts`
- Test: `tests/llm-mandate.test.ts`

**Interfaces:**
- Consumes: `generateStructured` from `@/lib/agent/llm/client`; `BusinessImpactDimension` from `@/lib/types`
- Produces: `MandatePlan` type, `parseMandateWithLlm(input: MandateInput, call?: typeof generateStructured): Promise<MandatePlan>`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/llm-mandate.test.ts
import { describe, expect, it, vi } from "vitest";
import { parseMandateWithLlm, type MandatePlan } from "@/lib/agent/llm/mandate";

describe("parseMandateWithLlm", () => {
  it("returns the model's structured plan unchanged when it is well-formed", async () => {
    const modelOutput: MandatePlan = {
      focus: "margin",
      rationale: "Mandate mengutamakan margin.",
      hypothesisTree: [{ id: "ANTM-plan-primary", claim: "Trigger mengubah margin ANTM.", test: "Cari perubahan margin.", state: "primary" }],
      observables: [{ dimension: "margin", metric: "Gross margin, operating margin, spread, or cost per unit", expectedChange: "Naik", window: "1-10 sesi" }],
    };
    const call = vi.fn().mockResolvedValue(modelOutput);
    const result = await parseMandateWithLlm({ symbol: "ANTM", mandate: "uji margin ANTM" }, call);
    expect(result).toEqual(modelOutput);
    expect(call).toHaveBeenCalledOnce();
  });

  it("rejects a focus value outside the six known dimensions", async () => {
    const call = vi.fn().mockResolvedValue({ focus: "hype", rationale: "x", hypothesisTree: [], observables: [] });
    await expect(parseMandateWithLlm({ symbol: "ANTM", mandate: "x" }, call)).rejects.toThrow(/focus/);
  });

  it("rejects an empty hypothesisTree", async () => {
    const call = vi.fn().mockResolvedValue({ focus: "margin", rationale: "x", hypothesisTree: [], observables: [] });
    await expect(parseMandateWithLlm({ symbol: "ANTM", mandate: "x" }, call)).rejects.toThrow(/hypothesisTree/);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/llm-mandate.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// lib/agent/llm/mandate.ts
import { generateStructured } from "@/lib/agent/llm/client";
import type { BusinessImpactDimension } from "@/lib/types";

const DIMENSIONS: BusinessImpactDimension[] = ["volume", "pricing", "margin", "cash-flow", "balance-sheet", "valuation"];

export interface MandatePlan {
  focus: BusinessImpactDimension;
  rationale: string;
  hypothesisTree: Array<{ id: string; claim: string; test: string; state: "primary" | "supporting" | "challenge" }>;
  observables: Array<{ dimension: BusinessImpactDimension; metric: string; expectedChange: string; window: string }>;
}

export interface MandateInput {
  symbol: string;
  mandate: string;
}

const MANDATE_SCHEMA = {
  type: "object",
  properties: {
    focus: { type: "string", enum: DIMENSIONS },
    rationale: { type: "string" },
    hypothesisTree: {
      type: "array",
      items: {
        type: "object",
        properties: {
          id: { type: "string" },
          claim: { type: "string" },
          test: { type: "string" },
          state: { type: "string", enum: ["primary", "supporting", "challenge"] },
        },
        required: ["id", "claim", "test", "state"],
      },
    },
    observables: {
      type: "array",
      items: {
        type: "object",
        properties: {
          dimension: { type: "string", enum: DIMENSIONS },
          metric: { type: "string" },
          expectedChange: { type: "string" },
          window: { type: "string" },
        },
        required: ["dimension", "metric", "expectedChange", "window"],
      },
    },
  },
  required: ["focus", "rationale", "hypothesisTree", "observables"],
};

const SYSTEM_INSTRUCTION = `Kamu planner riset investasi. Baca mandate bebas dari pengguna dan pilih SATU fokus dampak bisnis dari enam pilihan: volume, pricing, margin, cash-flow, balance-sheet, valuation. Tulis 1-3 hipotesis (primary/supporting/challenge) dan 1-2 observable yang bisa diuji dari data pasar. Jangan menulis angka apa pun — itu tugas kalkulator, bukan kamu.`;

export async function parseMandateWithLlm(
  input: MandateInput,
  call: typeof generateStructured = generateStructured,
): Promise<MandatePlan> {
  const result = await call<MandatePlan>({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: `Ticker: ${input.symbol}\nMandate: ${input.mandate}`,
    schema: MANDATE_SCHEMA,
  });
  if (!DIMENSIONS.includes(result.focus)) throw new Error(`Model returned an invalid focus: ${result.focus}`);
  if (!result.hypothesisTree.length) throw new Error("Model returned an empty hypothesisTree");
  return result;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/llm-mandate.test.ts`
Expected: PASS (3 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/agent/llm/mandate.ts tests/llm-mandate.test.ts
git commit -m "feat: add LLM mandate parser (structured, validated, no numbers)"
```

---

### Task 5: Wire the mandate parser into `createResearchPlan`

**Files:**
- Modify: `lib/agent/engine.ts:148-180` (`createResearchPlan`)
- Test: `tests/engine.test.ts` (extend)

**Interfaces:**
- Consumes: `parseMandateWithLlm` from `@/lib/agent/llm/mandate`; `agentMode` from `@/lib/agent/mode`; `cacheKeyFor`/`getCached`/`setCached` from `@/lib/agent/llm/cache`
- Produces: `createResearchPlan` becomes `async`; every caller of it must now `await`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/engine.test.ts — add to the existing describe block
it("stays fully deterministic when AGENT_MODE is unset, even though createResearchPlan is now async", async () => {
  const analysis = await agentEngine.analyzeCompany("ANTM", demoProfiles[0]);
  expect(analysis).not.toBeNull();
  expect(analysis?.researchPlan.focus).toBeTruthy();
  expect(analysis?.researchPlan.hypothesisTree.length).toBeGreaterThan(0);
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/engine.test.ts`
Expected: FAIL — `analyzeCompany` is still synchronous, `await` on a non-promise is harmless but `analysis` is not a Promise yet so this assertion actually already passes trivially; the *real* failure is TypeScript: `pnpm typecheck` fails because `AgentEngine.analyzeCompany` in `lib/types.ts` is declared synchronous while the implementation will become async in Step 3. Confirm the intended failure this way instead:

Run: `pnpm typecheck`
Expected: after Step 3's change alone (before Step 4's interface update) — FAIL with a signature mismatch on `AgentEngine.analyzeCompany`

- [ ] **Step 3: Make `createResearchPlan` async, with a deterministic fallback**

```typescript
// lib/agent/engine.ts — replace the createResearchPlan function
import { parseMandateWithLlm, type MandatePlan } from "@/lib/agent/llm/mandate";
import { agentMode } from "@/lib/agent/mode";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";

async function llmMandatePlan(symbol: SymbolCode, mandate: string): Promise<MandatePlan | null> {
  if (agentMode() !== "llm") return null;
  const key = cacheKeyFor(["mandate", symbol, mandate]);
  const cached = await getCached<MandatePlan>(key);
  if (cached) return cached;
  try {
    const plan = await parseMandateWithLlm({ symbol, mandate });
    await setCached(key, plan);
    return plan;
  } catch {
    return null; // any failure (429, bad output, network) falls through to the deterministic plan below
  }
}

async function createResearchPlan(
  symbol: SymbolCode,
  mandate: string,
  pillars: PillarResult[],
  context?: AnalysisContext,
) {
  const llmPlan = await llmMandatePlan(symbol, mandate);
  const focus = llmPlan?.focus ?? mandateFocus(mandate, symbol);
  const focusLabel = impactLabels[focus].toLowerCase();
  const trustedSource = context?.playbook?.trustedSources[0] ?? "Sectors company data dan filing";
  const falsifier = context?.playbook?.falsifiers.find((item) => item.toUpperCase().includes(symbol))
    ?? `${focusLabel} tidak bergerak sesuai jalur pada jendela observasi.`;
  return {
    mandate,
    focus,
    rationale: llmPlan?.rationale ?? `Mandate mengutamakan ${focusLabel}; planner menata ulang pertanyaan, sumber, dan observable tanpa mengubah data dasar.`,
    hypothesisTree: llmPlan?.hypothesisTree ?? [
      { id: `${symbol}-plan-primary`, claim: `Trigger mengubah ${focusLabel} ${symbol}.`, test: `Cari perubahan pada ${impactObservables[focus].toLowerCase()}.`, state: "primary" as const },
      { id: `${symbol}-plan-support`, claim: "Arus, volume, dan momentum bergerak setelah trigger.", test: pillars.map((pillar) => pillar.label).join(" → "), state: "supporting" as const },
      { id: `${symbol}-plan-challenge`, claim: "Penjelasan alternatif lebih kuat daripada trigger utama.", test: falsifier, state: "challenge" as const },
    ],
    observables: llmPlan?.observables ?? [
      { dimension: focus, metric: impactObservables[focus], expectedChange: `Bergerak konsisten dengan arah trigger pada ${symbol}.`, window: focus === "valuation" ? "1-3 bulan" : "1-10 sesi" },
      ...(focus === "volume" ? [] : [{ dimension: "volume" as const, metric: impactObservables.volume, expectedChange: "Mengonfirmasi bahwa perubahan mencapai aktivitas operasional.", window: "1-10 sesi" }]),
    ],
    sourcePlan: [
      `${trustedSource}: uji ${focusLabel} dan periode pembanding.`,
      `Sectors daily series dan broker evidence: pastikan perubahan terjadi setelah trigger.`,
      `Company filing: periksa ${impactObservables[focus].toLowerCase()}.`,
      `Pembanding sektor: pisahkan perubahan perusahaan dari faktor pasar yang sama.`,
    ],
    clarificationGate: `Fokus aktif: ${focus}. Sebelum menutup case, pastikan definisi perubahan material dan jendela ${focusLabel} telah dipilih.`,
  };
}
```

- [ ] **Step 4: Propagate `async` up the call chain**

`createResearchPlan` is called from `buildAnalysis` (the function `analyzeCompany` delegates to). Find every call site with:

```bash
grep -n "createResearchPlan(" lib/agent/engine.ts
```

Add `await` at that call site, mark the enclosing function `async`, and repeat up the chain until you reach `analyzeCompany`, `buildCausalGraph`, and `answerFollowUp` in the `agentEngine` object at the bottom of the file. Update `AgentEngine` in `lib/types.ts:418-423` to:

```typescript
export interface AgentEngine {
  analyzeCompany(symbol: string, profile: UserProfile, context?: AnalysisContext): Promise<AnalysisCase | null>;
  mapEventImpact(eventId: string, profile: UserProfile, scope: "watchlist" | "market"): MarketEvent | null;
  answerFollowUp(request: ChatRequest): Promise<ChatAnswer>;
  buildCausalGraph(symbol: string, profile: UserProfile, options: { scope: "watchlist" | "market"; minRelevance: number; context?: AnalysisContext }): Promise<CausalGraph | null>;
}
```

(`mapEventImpact` has no LLM role touching it — see Task 6, `buildCausalGraph`'s exposure writer is the LLM role that lands there — so it stays synchronous.)

- [ ] **Step 5: Fix every caller of these three methods**

```bash
grep -rn "agentEngine\.\(analyzeCompany\|buildCausalGraph\|answerFollowUp\)" app components tests
```

For each server route (`app/api/analyze/route.ts`, `app/api/impact/route.ts` if it calls `buildCausalGraph` — check — `app/api/chat/route.ts`), add `await`. For the four client call sites (`app/page.tsx`, `app/cases/page.tsx`, `app/impact/page.tsx`, `app/companies/[symbol]/company-detail-client.tsx`), do **not** add `await` here — Task 10 moves them off direct `agentEngine` calls entirely. For now, leave a `// TODO(Task 10): move off direct agentEngine call` comment at each so `pnpm typecheck` failures there are expected and tracked, not silently ignored.

- [ ] **Step 6: Run the full test suite**

Run: `pnpm exec vitest run`
Expected: PASS — every existing `agentEngine.analyzeCompany(...)` / `.buildCausalGraph(...)` / `.answerFollowUp(...)` call in `tests/engine.test.ts` and `tests/api.test.ts` needs an `await` added; do that now, in this step, as part of making the suite pass (this is not deferred to Task 10 — tests are not client components).

- [ ] **Step 7: Commit**

```bash
git add lib/agent/engine.ts lib/types.ts tests/engine.test.ts
git commit -m "feat: make createResearchPlan async and LLM-backed behind AGENT_MODE"
```

---

### Task 6: Exposure writer — path, direction, relevance band (spec table rows: "Penulis exposure path", "Penilai relevance & direction")

**Open question this task resolves:** the spec's Global Constraints say "LLM tidak pernah mengeluarkan angka," but its own role table assigns relevance scoring (a number) to the LLM. This plan resolves the conflict by having the LLM emit an ordinal `relevanceBand` ("high" | "medium" | "low") instead of an integer, and a fixed deterministic table converts band → the number that ships (`high` → 90, `medium` → 65, `low` → 40 — the same three tiers `confidenceFor` already uses elsewhere in `engine.ts`, so the UI's meaning of "High/Medium/Low confidence" stays consistent). If you disagree with this resolution, stop before this task and say so — it changes what "relevance" means in the UI from a continuous 40-97 score to three fixed values.

**Files:**
- Create: `lib/agent/llm/exposure.ts`
- Modify: `lib/data/fixtures.ts` (re-export `revenueSegments` from `market.generated.ts` — it exists there since the P1 work but nothing outside the generator reads it yet)
- Test: `tests/llm-exposure.test.ts`

**Interfaces:**
- Consumes: `generateStructured`; `ImpactDirection`, `MarketEvent` from `@/lib/types`; `revenueSegments` from `@/lib/data/fixtures`
- Produces: `ExposureAssessment` type, `RELEVANCE_BAND_SCORE` const, `assessExposureWithLlm(input: ExposureInput, call?: typeof generateStructured): Promise<ExposureAssessment>`

- [ ] **Step 1: Re-export `revenueSegments`**

```typescript
// lib/data/fixtures.ts — add to the import list from "@/lib/data/market.generated"
  revenueSegments,
```

```typescript
// lib/data/fixtures.ts — add near the other re-exports, after `export const events = ...`
export { revenueSegments };
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/llm-exposure.test.ts
import { describe, expect, it, vi } from "vitest";
import { assessExposureWithLlm, RELEVANCE_BAND_SCORE, type ExposureAssessment } from "@/lib/agent/llm/exposure";

describe("assessExposureWithLlm", () => {
  const baseInput = {
    symbol: "ADRO" as const,
    eventTitle: "Harga batu bara turun 8% di bawah ekspektasi kuartal",
    eventSummary: "Harga acuan batu bara Newcastle turun ke level terendah sejak 2023.",
    eventTags: ["Commodities", "Bearish"],
    segments: [{ segment: "Sales of Coal", share: 0.554 }],
  };

  it("maps the model's relevanceBand to the fixed score table", async () => {
    const call = vi.fn().mockResolvedValue({
      path: "Sales of Coal (55% pendapatan ADRO) → realisasi harga → margin",
      direction: "Adverse",
      relevanceBand: "high",
      rationale: "Harga batu bara turun langsung menekan pendapatan segmen Sales of Coal ADRO.",
    } satisfies ExposureAssessment);
    const result = await assessExposureWithLlm(baseInput, call);
    expect(result.relevanceBand).toBe("high");
    expect(RELEVANCE_BAND_SCORE[result.relevanceBand]).toBe(90);
    expect(result.direction).toBe("Adverse");
  });

  it("rejects a direction outside the five known values", async () => {
    const call = vi.fn().mockResolvedValue({ path: "x", direction: "Bullish", relevanceBand: "high", rationale: "x" });
    await expect(assessExposureWithLlm(baseInput, call)).rejects.toThrow(/direction/);
  });

  it("rejects a relevanceBand outside high/medium/low", async () => {
    const call = vi.fn().mockResolvedValue({ path: "x", direction: "Mixed", relevanceBand: "extreme", rationale: "x" });
    await expect(assessExposureWithLlm(baseInput, call)).rejects.toThrow(/relevanceBand/);
  });

  it("never asks for or returns a bare numeric relevance field", async () => {
    const call = vi.fn().mockResolvedValue({ path: "x", direction: "Mixed", relevanceBand: "medium", rationale: "x" });
    const result = await assessExposureWithLlm(baseInput, call);
    expect(result).not.toHaveProperty("relevance");
    expect(typeof result.relevanceBand).toBe("string");
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run tests/llm-exposure.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement**

```typescript
// lib/agent/llm/exposure.ts
import { generateStructured } from "@/lib/agent/llm/client";
import type { ImpactDirection } from "@/lib/types";

const DIRECTIONS: ImpactDirection[] = ["Supported", "Adverse", "Mixed", "Unrelated", "Unverified"];
const RELEVANCE_BANDS = ["high", "medium", "low"] as const;
export type RelevanceBand = (typeof RELEVANCE_BANDS)[number];

/** Same three tiers `confidenceFor` uses elsewhere in engine.ts, kept in one place so "High" means the same score everywhere. */
export const RELEVANCE_BAND_SCORE: Record<RelevanceBand, number> = { high: 90, medium: 65, low: 40 };

export interface ExposureAssessment {
  path: string;
  direction: ImpactDirection;
  relevanceBand: RelevanceBand;
  rationale: string;
}

export interface ExposureInput {
  symbol: string;
  eventTitle: string;
  eventSummary: string;
  eventTags: string[];
  segments: Array<{ segment: string; share: number }>;
}

const EXPOSURE_SCHEMA = {
  type: "object",
  properties: {
    path: { type: "string" },
    direction: { type: "string", enum: DIRECTIONS },
    relevanceBand: { type: "string", enum: RELEVANCE_BANDS },
    rationale: { type: "string" },
  },
  required: ["path", "direction", "relevanceBand", "rationale"],
};

const SYSTEM_INSTRUCTION = `Kamu penulis exposure path untuk investor. Diberi satu peristiwa dan segmen pendapatan emiten, tulis SATU kalimat jalur sebab-akibat spesifik (bukan template generik), pilih arah dampak (Supported/Adverse/Mixed/Unrelated/Unverified), dan nilai relevansi sebagai pita ordinal (high/medium/low) — JANGAN mengeluarkan angka apa pun, termasuk skor relevansi numerik.`;

export async function assessExposureWithLlm(
  input: ExposureInput,
  call: typeof generateStructured = generateStructured,
): Promise<ExposureAssessment> {
  const result = await call<ExposureAssessment>({
    model: process.env.GEMINI_MODEL_FLASH || process.env.GEMINI_MODEL || "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [
      `Emiten: ${input.symbol}`,
      `Judul peristiwa: ${input.eventTitle}`,
      `Ringkasan: ${input.eventSummary}`,
      `Tag Sectors: ${input.eventTags.join(", ") || "tidak ada"}`,
      `Segmen pendapatan (dari get-segments): ${input.segments.map((s) => `${s.segment} (${(s.share * 100).toFixed(0)}%)`).join(", ") || "tidak tersedia"}`,
    ].join("\n"),
    schema: EXPOSURE_SCHEMA,
  });
  if (!DIRECTIONS.includes(result.direction)) throw new Error(`Model returned an invalid direction: ${result.direction}`);
  if (!RELEVANCE_BANDS.includes(result.relevanceBand)) throw new Error(`Model returned an invalid relevanceBand: ${result.relevanceBand}`);
  return result;
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/llm-exposure.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 6: Commit**

```bash
git add lib/data/fixtures.ts lib/agent/llm/exposure.ts tests/llm-exposure.test.ts
git commit -m "feat: add LLM exposure writer (path + direction + relevance band, no raw numbers)"
```

---

### Task 7: Wire the exposure writer into `buildCausalGraph`

**Files:**
- Modify: `lib/agent/engine.ts` (the per-`link` loop inside `buildCausalGraph`, around the lines that build the `${sourceId}-to-${mechanismId}` and `${mechanismId}-to-company-${symbol}` edges — re-locate with the grep below, exact line numbers shifted after Task 5)
- Test: `tests/engine.test.ts` (extend)

**Interfaces:**
- Consumes: `assessExposureWithLlm`, `RELEVANCE_BAND_SCORE` from `@/lib/agent/llm/exposure`; `agentMode`; `cacheKeyFor`/`getCached`/`setCached`

- [ ] **Step 1: Locate the exact edges to change**

```bash
grep -n "sourceId}-to-\${mechanismId}\|mechanismId}-to-company" lib/agent/engine.ts
```

- [ ] **Step 2: Write the failing test**

```typescript
// tests/engine.test.ts — add
it("keeps event impactLinks' path/direction/relevance exactly as recorded when AGENT_MODE is deterministic", async () => {
  const graph = await agentEngine.buildCausalGraph("ANTM", demoProfiles[0], { scope: "market", minRelevance: 0 });
  const sourceNode = graph?.nodes.find((node) => node.kind === "source");
  expect(sourceNode).toBeDefined();
  // No network call happened — if one had been attempted under AGENT_MODE=deterministic, this test's
  // absence of any fetch mock would make Node's real fetch fail loudly in CI (no network egress there).
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run tests/engine.test.ts`
Expected: PASS already (this step's test doesn't fail — it's a regression guard for Step 4's change). Confirm it passes now, before touching `engine.ts`, so you know Step 4 didn't secretly need it to fail first.

- [ ] **Step 4: Wrap the per-symbol exposure assessment**

Find where `buildCausalGraph` iterates `event.impactLinks` (the loop building mechanism/company edges reads `link.path`, `link.direction`, `link.relevance` from the pre-baked `MarketEvent`). Add a helper above `buildCausalGraph`:

```typescript
// lib/agent/engine.ts
import { assessExposureWithLlm, RELEVANCE_BAND_SCORE } from "@/lib/agent/llm/exposure";

async function llmExposure(event: MarketEvent, symbol: SymbolCode, fallback: ImpactLink): Promise<ImpactLink> {
  if (agentMode() !== "llm") return fallback;
  const key = cacheKeyFor(["exposure", symbol, event.id]);
  const cached = await getCached<{ path: string; direction: ImpactDirection; relevanceBand: keyof typeof RELEVANCE_BAND_SCORE; rationale: string }>(key);
  const segments = revenueSegments[symbol] ?? [];
  const resolve = async () => {
    if (cached) return cached;
    const assessment = await assessExposureWithLlm({
      symbol,
      eventTitle: event.title,
      eventSummary: event.summary,
      eventTags: event.citations.map((c) => c.label),
      segments,
    });
    await setCached(key, assessment);
    return assessment;
  };
  try {
    const assessment = await resolve();
    return { ...fallback, path: assessment.path, direction: assessment.direction, relevance: RELEVANCE_BAND_SCORE[assessment.relevanceBand], rationale: assessment.rationale };
  } catch {
    return fallback; // any failure falls back to the pre-baked, still-real, still-cited value
  }
}
```

Then, at the call site where each `link` is read to build the mechanism/company edges, replace the direct `link.path` / `link.direction` / `link.relevance` reads with:

```typescript
const resolvedLink = await llmExposure(event, symbol, link);
```

and use `resolvedLink.path`, `resolvedLink.direction`, `resolvedLink.relevance` for the edge fields (`exposure`, `label`, `direction`, `relevance` on both edges built from this `link`) instead of `link.*`. `link.citations` stays untouched — the LLM never touches citations, only the narrated path/direction/relevance.

- [ ] **Step 5: Run the full test suite**

Run: `pnpm exec vitest run`
Expected: PASS — `buildCausalGraph` is already `async` from Task 5, so this only adds one more `await` inside a function that's already async; no new signature changes needed elsewhere.

- [ ] **Step 6: Commit**

```bash
git add lib/agent/engine.ts tests/engine.test.ts
git commit -m "feat: wire LLM exposure writer into buildCausalGraph, gated by AGENT_MODE"
```

---

### Task 8: Verifier — no hallucinated numbers, citation spans must be exact/approximate (spec table row: "Verifier")

**Files:**
- Create: `lib/agent/llm/verify.ts`
- Test: `tests/llm-verify.test.ts`

**Interfaces:**
- Consumes: `SourceSpan`, `Citation` from `@/lib/types`
- Produces: `VerificationResult` type, `verifyDraft(draftText: string, evidenceNumbers: string[], citations: Citation[]): VerificationResult`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/llm-verify.test.ts
import { describe, expect, it } from "vitest";
import { verifyDraft } from "@/lib/agent/llm/verify";
import type { Citation } from "@/lib/types";

const baseCitation: Citation = { id: "c1", provider: "Sectors API", endpoint: "/v2/news/", field: "title", asOf: "2026-09-11T00:00:00+07:00", label: "test" };

describe("verifyDraft", () => {
  it("approves a draft whose only numbers are all present in the evidence pack", () => {
    const result = verifyDraft("Volume naik 12% dan close di Rp2.450.", ["12%", "Rp2.450"], [baseCitation]);
    expect(result.approved).toBe(true);
    expect(result.violations).toEqual([]);
  });

  it("rejects a draft with a number absent from the evidence pack — a hallucinated figure", () => {
    const result = verifyDraft("Volume naik 47% hari ini.", ["12%"], [baseCitation]);
    expect(result.approved).toBe(false);
    expect(result.violations.some((v) => v.includes("47%"))).toBe(true);
  });

  it("does not reject a not_found citation span — that is a legitimate outcome, not a violation", () => {
    const citations: Citation[] = [{ ...baseCitation, span: { documentId: "d1", start: 0, end: 0, match: "not_found" } }];
    const result = verifyDraft("Sumbernya belum bisa ditemukan.", [], citations);
    expect(result.approved).toBe(true);
  });

  it("passes through text with no numbers at all", () => {
    const result = verifyDraft("Belum ada bukti yang cukup untuk klaim ini.", [], []);
    expect(result.approved).toBe(true);
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/llm-verify.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// lib/agent/llm/verify.ts
import type { Citation } from "@/lib/types";

export interface VerificationResult {
  approved: boolean;
  violations: string[];
}

const NUMBER_PATTERN = /-?\d[\d.,]*%?/g;

/**
 * Every numeral in `draftText` must appear verbatim in `evidenceNumbers`
 * (the formatted values the pillars/metrics already produced, with their
 * own citations). A `not_found` citation span is a legitimate, honest
 * outcome per the spec ("menyorot paragraf yang salah lebih buruk daripada
 * tidak menyorot apa pun") — it is never counted as a violation on its own.
 */
export function verifyDraft(draftText: string, evidenceNumbers: string[], _citations: Citation[]): VerificationResult {
  const found = draftText.match(NUMBER_PATTERN) ?? [];
  const violations = found.filter((numeral) => !evidenceNumbers.includes(numeral)).map((numeral) => `"${numeral}" does not appear in the evidence pack`);
  return { approved: violations.length === 0, violations };
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/llm-verify.test.ts`
Expected: PASS (4 tests)

- [ ] **Step 5: Commit**

```bash
git add lib/agent/llm/verify.ts tests/llm-verify.test.ts
git commit -m "feat: add numeral-hallucination verifier for LLM draft text"
```

---

### Task 9: Copilot answerer (spec table row: "Penjawab Copilot") + wiring into `answerFollowUp`

**Files:**
- Create: `lib/agent/llm/answer.ts`
- Modify: `lib/agent/engine.ts` (`answerFollowUp`, already `async` from Task 5)
- Test: `tests/llm-answer.test.ts`, extend `tests/engine.test.ts`

**Interfaces:**
- Consumes: `generateStructured`; `verifyDraft` from `@/lib/agent/llm/verify`; `ChatAnswer`, `Citation` from `@/lib/types`
- Produces: `LlmAnswerDraft` type, `composeAnswerWithLlm(input: AnswerInput, call?: typeof generateStructured): Promise<LlmAnswerDraft>`

- [ ] **Step 1: Write the failing test**

```typescript
// tests/llm-answer.test.ts
import { describe, expect, it, vi } from "vitest";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";

describe("composeAnswerWithLlm", () => {
  it("returns the model's text and rejects it if verifyDraft would flag a hallucinated number", async () => {
    const call = vi.fn().mockResolvedValue({ text: "ANTM naik 999% hari ini." });
    await expect(
      composeAnswerWithLlm({ question: "Kenapa ANTM naik?", evidenceSummary: "Return 3 hari 4,2%.", evidenceNumbers: ["4,2%"] }, call),
    ).rejects.toThrow(/999%/);
  });

  it("accepts a draft whose numbers all trace back to the evidence pack", async () => {
    const call = vi.fn().mockResolvedValue({ text: "ANTM naik 4,2% pada jendela ini." });
    const result = await composeAnswerWithLlm({ question: "Kenapa ANTM naik?", evidenceSummary: "Return 3 hari 4,2%.", evidenceNumbers: ["4,2%"] }, call);
    expect(result.text).toBe("ANTM naik 4,2% pada jendela ini.");
  });
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/llm-answer.test.ts`
Expected: FAIL — module not found

- [ ] **Step 3: Implement**

```typescript
// lib/agent/llm/answer.ts
import { generateStructured } from "@/lib/agent/llm/client";
import { verifyDraft } from "@/lib/agent/llm/verify";

export interface LlmAnswerDraft {
  text: string;
}

export interface AnswerInput {
  question: string;
  evidenceSummary: string;
  evidenceNumbers: string[];
}

const ANSWER_SCHEMA = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
};

const SYSTEM_INSTRUCTION = `Kamu Copilot investor. Jawab pertanyaan HANYA dari evidence summary yang diberikan. Jangan pernah menuliskan angka yang tidak muncul persis di evidence summary. Jangan memberi saran transaksi (beli/jual/target price).`;

export async function composeAnswerWithLlm(
  input: AnswerInput,
  call: typeof generateStructured = generateStructured,
): Promise<LlmAnswerDraft> {
  const draft = await call<LlmAnswerDraft>({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: `Pertanyaan: ${input.question}\nEvidence summary: ${input.evidenceSummary}`,
    schema: ANSWER_SCHEMA,
  });
  const verification = verifyDraft(draft.text, input.evidenceNumbers, []);
  if (!verification.approved) throw new Error(`Answer rejected by verifier: ${verification.violations.join("; ")}`);
  return draft;
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/llm-answer.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 5: Wire into `answerFollowUp`**

`answerFollowUp` in `lib/agent/engine.ts` already builds a deterministic `text` for each of its five intents (why-listed, event-impact, compare, missing, advice/refused). Add an LLM overlay that only replaces `text`, never `citations`/`hypotheses`/`relatedSymbols`:

```typescript
// lib/agent/engine.ts
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";

async function llmOverlayText(question: string, deterministicText: string, evidenceNumbers: string[]): Promise<string> {
  if (agentMode() !== "llm") return deterministicText;
  try {
    const draft = await composeAnswerWithLlm({ question, evidenceSummary: deterministicText, evidenceNumbers });
    return draft.text;
  } catch {
    return deterministicText; // verifier rejection or any model failure — ship the deterministic sentence, it's already correct
  }
}
```

At the end of `answerFollowUp`, before the final `return`, extract the numerals already present in `text` (reuse the `NUMBER_PATTERN` idea from Task 8, or simply pass `text.match(/-?\d[\d.,]*%?/g) ?? []` as `evidenceNumbers` — the deterministic text is definitionally evidence-backed, so its own numbers are exactly the pack the LLM overlay must stay within) and replace `text` with `await llmOverlayText(request.question, text, evidenceNumbers)`.

- [ ] **Step 6: Run the full test suite**

Run: `pnpm exec vitest run`
Expected: PASS

- [ ] **Step 7: Commit**

```bash
git add lib/agent/llm/answer.ts lib/agent/engine.ts tests/llm-answer.test.ts tests/engine.test.ts
git commit -m "feat: wire LLM Copilot answerer into answerFollowUp, verified against its own evidence"
```

---

### Task 10: Agent trace (spec table row: "Perencana sumber" / orchestration evidence)

**Files:**
- Create: `lib/agent/llm/trace.ts`
- Modify: `components/agent-trace.tsx` (already exists — read it first with `cat components/agent-trace.tsx` to match its current prop shape exactly before changing it)
- Test: `tests/llm-trace.test.ts`

**Interfaces:**
- Produces: `TraceEntry` type, `recordTrace(entry: TraceEntry): void`, `getTrace(requestId: string): TraceEntry[]`

- [ ] **Step 1: Read the existing component**

```bash
cat components/agent-trace.tsx
```

Note its current prop type exactly — this task must extend, not replace, what it already renders.

- [ ] **Step 2: Write the failing test**

```typescript
// tests/llm-trace.test.ts
import { describe, expect, it, beforeEach } from "vitest";
import { recordTrace, getTrace, type TraceEntry } from "@/lib/agent/llm/trace";

describe("recordTrace / getTrace", () => {
  beforeEach(() => {
    getTrace("req-1").length = 0; // trace store is in-memory per request id; clear between tests
  });

  it("records entries in insertion order, scoped by requestId", () => {
    const entry: TraceEntry = { requestId: "req-1", step: "plan", detail: "Fokus margin dipilih", at: "2026-09-13T00:00:00Z" };
    recordTrace(entry);
    recordTrace({ ...entry, step: "tool-call", detail: "getSegments(ADRO)" });
    expect(getTrace("req-1")).toEqual([
      entry,
      { ...entry, step: "tool-call", detail: "getSegments(ADRO)" },
    ]);
  });

  it("keeps separate requestIds isolated", () => {
    recordTrace({ requestId: "req-2", step: "plan", detail: "x", at: "2026-09-13T00:00:00Z" });
    expect(getTrace("req-1")).toEqual([]);
  });
});
```

- [ ] **Step 3: Run test to verify it fails**

Run: `pnpm exec vitest run tests/llm-trace.test.ts`
Expected: FAIL — module not found

- [ ] **Step 4: Implement**

```typescript
// lib/agent/llm/trace.ts
export interface TraceEntry {
  requestId: string;
  step: "plan" | "tool-call" | "re-query" | "verify";
  detail: string;
  at: string;
}

// In-memory, per Cloud Run instance — good enough for the demo panel this backs;
// it is explicitly not a durable log (min-instances=0 means it can vanish any time
// the instance scales to zero, which is the point: no persistence cost for it).
const traces = new Map<string, TraceEntry[]>();

export function recordTrace(entry: TraceEntry): void {
  const list = traces.get(entry.requestId) ?? [];
  list.push(entry);
  traces.set(entry.requestId, list);
}

export function getTrace(requestId: string): TraceEntry[] {
  return traces.get(requestId) ?? [];
}
```

- [ ] **Step 5: Run test to verify it passes**

Run: `pnpm exec vitest run tests/llm-trace.test.ts`
Expected: PASS (2 tests)

- [ ] **Step 6: Call `recordTrace` from the mandate and exposure paths**

In `llmMandatePlan` (Task 5) and `llmExposure` (Task 7), add a `recordTrace` call before and after the cache check and the model call, using a `requestId` threaded in from the API route (Task 11 adds this parameter). Skip wiring the exact call sites in this step if `requestId` plumbing isn't in place yet — do it as part of Task 11 instead, and note that dependency here so it isn't dropped.

- [ ] **Step 7: Commit**

```bash
git add lib/agent/llm/trace.ts tests/llm-trace.test.ts
git commit -m "feat: add in-memory agent trace store for the orchestration panel"
```

---

## Phase C — Server/client boundary refactor

### Task 11: Move client pages off direct `agentEngine` imports

**Why this task exists:** `app/page.tsx`, `app/cases/page.tsx`, `app/impact/page.tsx`, and `app/companies/[symbol]/company-detail-client.tsx` are `"use client"` components that currently call `agentEngine.analyzeCompany` / `.buildCausalGraph` directly in `useMemo`. Now that those functions can call Gemini (Task 5, Task 7), that import chain must never reach the browser bundle — `GOOGLE_API_KEY` must only ever be read inside a route handler.

**Files:**
- Modify: `app/api/analyze/route.ts` (add a `GET` handler alongside the existing `POST`)
- Modify: `app/api/impact/route.ts` — check first whether it currently calls `buildCausalGraph` or only `mapEventImpact`:

```bash
cat app/api/impact/route.ts
```

If it only wraps `mapEventImpact` (synchronous, no LLM role touches it — see Task 5's note), add a **second** route file `app/api/causal-graph/route.ts` for `buildCausalGraph` instead of overloading `/api/impact`.
- Modify: `app/page.tsx`, `app/cases/page.tsx`, `app/impact/page.tsx`, `app/companies/[symbol]/company-detail-client.tsx`
- Test: extend `tests/api.test.ts`, extend `tests/e2e/catalyst.spec.ts`

**Interfaces:**
- Produces: `GET /api/analyze?symbol=ANTM&profileId=flow-first` → `{ analysis: AnalysisCase | null }`; `GET /api/causal-graph?symbol=ANTM&scope=market&minRelevance=70&profileId=flow-first` → `{ graph: CausalGraph | null }`

- [ ] **Step 1: Write the failing API test**

```typescript
// tests/api.test.ts — add
it("GET /api/analyze returns the same shape as the deterministic engine call", async () => {
  const { GET } = await import("@/app/api/analyze/route");
  const request = new Request("http://localhost/api/analyze?symbol=ANTM&profileId=flow-first");
  const response = await GET(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.analysis.company.symbol).toBe("ANTM");
});

it("GET /api/causal-graph returns a graph for a known symbol", async () => {
  const { GET } = await import("@/app/api/causal-graph/route");
  const request = new Request("http://localhost/api/causal-graph?symbol=ANTM&scope=market&minRelevance=0&profileId=flow-first");
  const response = await GET(request);
  const body = await response.json();
  expect(response.status).toBe(200);
  expect(body.graph.targetSymbol).toBe("ANTM");
});
```

- [ ] **Step 2: Run test to verify it fails**

Run: `pnpm exec vitest run tests/api.test.ts`
Expected: FAIL — no `GET` export from either route yet

- [ ] **Step 3: Add the `GET` handlers**

```typescript
// app/api/analyze/route.ts — add alongside the existing POST
import { demoProfiles } from "@/lib/data/fixtures";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  const profileId = url.searchParams.get("profileId");
  if (!symbol) return NextResponse.json({ error: "symbol wajib diisi" }, { status: 400 });
  const profile = demoProfiles.find((item) => item.id === profileId) ?? demoProfiles[0];
  const analysis = await agentEngine.analyzeCompany(symbol, profile);
  return NextResponse.json({ analysis, mode: "recorded" });
}
```

```typescript
// app/api/causal-graph/route.ts — new file
import { NextResponse } from "next/server";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";

export async function GET(request: Request) {
  const url = new URL(request.url);
  const symbol = url.searchParams.get("symbol");
  const scope = url.searchParams.get("scope") === "watchlist" ? "watchlist" : "market";
  const minRelevance = Number(url.searchParams.get("minRelevance") ?? "70");
  const profileId = url.searchParams.get("profileId");
  if (!symbol) return NextResponse.json({ error: "symbol wajib diisi" }, { status: 400 });
  const profile = demoProfiles.find((item) => item.id === profileId) ?? demoProfiles[0];
  const graph = await agentEngine.buildCausalGraph(symbol, profile, { scope, minRelevance });
  return NextResponse.json({ graph, mode: "recorded" });
}
```

- [ ] **Step 4: Run test to verify it passes**

Run: `pnpm exec vitest run tests/api.test.ts`
Expected: PASS

- [ ] **Step 5: Migrate `app/impact/page.tsx` (the reference migration — the other three pages follow the identical pattern in Step 6)**

Read the current file first:

```bash
cat app/impact/page.tsx
```

Replace the synchronous `const baseGraph = useMemo(() => agentEngine.buildCausalGraph(...), [...])` with a fetch-based load:

```typescript
// app/impact/page.tsx — replace the agentEngine import and the baseGraph useMemo
import { useEffect, useState } from "react";
// remove: import { agentEngine } from "@/lib/agent/engine";

// inside ImpactContent(), replace the useMemo that built baseGraph with:
const [baseGraph, setBaseGraph] = useState<CausalGraph | null>(null);
const [graphLoading, setGraphLoading] = useState(true);

useEffect(() => {
  let cancelled = false;
  setGraphLoading(true);
  const params = new URLSearchParams({ symbol: activeSymbol, scope, minRelevance: String(minimum), profileId: profile.id });
  fetch(`/api/causal-graph?${params}`)
    .then((response) => response.json())
    .then((body: { graph: CausalGraph | null }) => { if (!cancelled) setBaseGraph(body.graph); })
    .catch(() => { if (!cancelled) setBaseGraph(null); })
    .finally(() => { if (!cancelled) setGraphLoading(false); });
  return () => { cancelled = true; };
}, [activeSymbol, scope, minimum, profile.id]);
```

Note: this drops the `caseMandates`/`playbook`/`caseResolutions` context argument that the old synchronous call passed to `buildCausalGraph` (`{ context: { mandate: caseMandates[activeSymbol], playbook, resolution: caseResolutions[activeSymbol] } }`). Add those as extra query params (JSON-encoded, since they're small) or as a `POST` body if they grow — for this task, add them as a `POST` body to keep the URL short, since a mandate string is free text:

```typescript
// app/api/causal-graph/route.ts — replace GET with POST, since context now carries free-text mandate
export async function POST(request: Request) {
  const body = await request.json();
  const { symbol, scope, minRelevance, profileId, context } = body;
  if (!symbol) return NextResponse.json({ error: "symbol wajib diisi" }, { status: 400 });
  const profile = demoProfiles.find((item: { id: string }) => item.id === profileId) ?? demoProfiles[0];
  const graph = await agentEngine.buildCausalGraph(symbol, profile, { scope: scope === "watchlist" ? "watchlist" : "market", minRelevance: Number(minRelevance ?? 70), context });
  return NextResponse.json({ graph, mode: "recorded" });
}
```

```typescript
// app/impact/page.tsx — the fetch call becomes
fetch("/api/causal-graph", {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ symbol: activeSymbol, scope, minRelevance: minimum, profileId: profile.id, context: { mandate: caseMandates[activeSymbol], playbook, resolution: caseResolutions[activeSymbol] } }),
})
  .then((response) => response.json())
  .then((body: { graph: CausalGraph | null }) => { if (!cancelled) setBaseGraph(body.graph); })
  .catch(() => { if (!cancelled) setBaseGraph(null); })
  .finally(() => { if (!cancelled) setGraphLoading(false); });
```

(Delete the now-unused `GET` handler from Step 3 for `/api/causal-graph` if you keep only `POST` — a route file may export both, but this page only needs `POST`. Keep `GET /api/analyze` from Step 3 as-is since `AnalysisCase` doesn't carry free-text mandate context the same way — check `app/page.tsx` and `app/cases/page.tsx`'s actual call sites before deciding; if they also pass a `context` argument, give `/api/analyze` the same `GET`→`POST` treatment for consistency.)

Update the JSX to show a loading state while `graphLoading` is true (`Panel` with a skeleton or the existing empty-state pattern already in the file), and guard the `filterSource`/`relatedEvents` computations that read `baseGraph` for `null`.

- [ ] **Step 6: Migrate the other three pages**

Repeat Step 5's pattern (fetch effect replacing the synchronous `agentEngine` call, loading state, `null`-guarded render) for:
- `app/page.tsx` — read it first (`cat app/page.tsx`) to find its exact `agentEngine.analyzeCompany`/`buildCausalGraph` call sites and what it currently renders from the result, then apply the same fetch-effect pattern against `GET /api/analyze` or `POST /api/causal-graph` as appropriate.
- `app/cases/page.tsx` — same.
- `app/companies/[symbol]/company-detail-client.tsx` — same, using `GET /api/analyze?symbol=...&profileId=...`.

For each file, remove the `import { agentEngine } from "@/lib/agent/engine"` line entirely once migrated — its presence in a `"use client"` file after this task is the signal that the migration was missed.

- [ ] **Step 7: Confirm no client bundle references the engine**

```bash
grep -rln "from \"@/lib/agent/engine\"" app components
```

Expected: zero results outside `app/api/**/route.ts` files.

- [ ] **Step 8: Update the e2e tests for the loading state**

The existing `tests/e2e/catalyst.spec.ts` assertions that read graph/analysis content right after `page.goto(...)` may now race a `fetch`. Add `await expect(page.getByText(/loading|memuat/i)).toHaveCount(0)` (or `page.waitForResponse` on `/api/causal-graph` / `/api/analyze`) before the existing content assertions, wherever `pnpm test:e2e` fails after this migration. Run the suite to find exactly which specs need it:

```bash
pnpm test:e2e
```

Fix each failure by waiting on the relevant network call rather than adding a fixed `page.waitForTimeout`.

- [ ] **Step 9: Run the full gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`
Expected: all green, with `AGENT_MODE` unset

- [ ] **Step 10: Commit**

```bash
git add app/api/analyze/route.ts app/api/causal-graph/route.ts app/page.tsx app/cases/page.tsx app/impact/page.tsx "app/companies/[symbol]/company-detail-client.tsx" tests/api.test.ts tests/e2e/catalyst.spec.ts
git commit -m "refactor: move client pages off direct agentEngine calls onto server-only API routes"
```

---

## Phase D — Go live

### Task 12: `GOOGLE_API_KEY` secret + Cloud Run wiring

**Files:**
- No source files — this is infrastructure. Document the exact commands here so the step is reproducible, not a placeholder.

- [ ] **Step 1: Get a key**

Get a Gemini Developer API key from https://aistudio.google.com/apikey for the same Google account as `ada-sectors-508410` (or any account — the key is independent of the GCP project it's later stored in).

- [ ] **Step 2: Create the secret**

```bash
printf %s "$YOUR_KEY" | gcloud secrets create GOOGLE_API_KEY --data-file=- --replication-policy=automatic --project=ada-sectors-508410
```

- [ ] **Step 3: Grant the Cloud Run runtime SA access**

```bash
gcloud secrets add-iam-policy-binding GOOGLE_API_KEY \
  --member="serviceAccount:1019003607640-compute@developer.gserviceaccount.com" \
  --role="roles/secretmanager.secretAccessor" \
  --project=ada-sectors-508410
```

- [ ] **Step 4: Redeploy with the secret and `AGENT_MODE=llm`**

```bash
gcloud run deploy catalyst-web \
  --image=asia-southeast2-docker.pkg.dev/ada-sectors-508410/katalis/catalyst-web:manual \
  --region=asia-southeast2 \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest \
  --set-env-vars=AGENT_MODE=llm,GEMINI_MODEL=gemini-3.5-flash
```

(Rebuild the image first with `gcloud builds submit --tag ...` if Phase A-C's code changes haven't been pushed into an image yet — see the existing `Dockerfile` at the repo root.)

- [ ] **Step 5: Smoke-test one real call**

```bash
curl -s -X POST -H "Content-Type: application/json" \
  -d '{"question":"Kenapa ANTM naik?","profile":{"id":"flow-first","watchlist":["ANTM"],"config":{"pillarOrder":["concentration","volume","momentum","catalyst"]}}}' \
  https://catalyst-web-1019003607640.asia-southeast2.run.app/api/chat
```

Expected: a 200 with an `answer.text` that reads as LLM prose (not the old rule-based sentence templates) but whose numbers still trace back to the deterministic pillars. If it 500s or times out, check `gcloud run services logs read catalyst-web --region=asia-southeast2` for the actual Gemini error before touching code.

- [ ] **Step 6: Roll back path, if the smoke test fails**

```bash
gcloud run services update-traffic catalyst-web --region=asia-southeast2 --to-revisions=catalyst-web-00002-mn4=100
```

(Replace `catalyst-web-00002-mn4` with whatever the last known-good deterministic-mode revision is at the time — check with `gcloud run revisions list --service=catalyst-web --region=asia-southeast2`.)

---

### Task 13: Flip `sectors-client.ts` live — human-gated, not a code task

This is deliberately **not** a code step. `lib/data/sectors-client.ts` (built and tested inert in an earlier session) already contains the cache-first fetch, the ledger, and the rate limiter. The project's own credit rule is explicit: no live Sectors call happens without, in order —

- [ ] Write a plan JSON describing exactly which endpoints/symbols/params will be called and their `est_cost` (see `research/docs/api/05-credit-budget.md` in the Sectors repo for the cost table).
- [ ] Run it with `--dry-run` against that plan (add a `--dry-run` flag to whatever script calls `fetchSectors`, so it logs the calls it *would* make without making them).
- [ ] Rehearse the same plan against `mock_server.py` in the Sectors repo's harness.
- [ ] Delete every rehearsal artifact the mock run wrote under `research/harness/recorded/` before going live — a leftover rehearsal file marks that call "already done" and a live run will silently skip it.
- [ ] Get explicit sign-off from the project owner on the plan JSON and its total cost against the remaining 578-credit balance (619 − 41 already earmarked for package A+B+C+D in the spec's section 6).
- [ ] Only then, wire a real caller of `fetchSectors` — e.g. a Cloud Run job `catalyst-refresh` on a Cloud Scheduler cron, per spec section 5-P3 — and deploy it.

Do not skip this by treating "the code already exists and is tested" as equivalent to "approved to spend credit." It isn't — the code being ready is exactly what makes it easy to accidentally flip on.

---

### Task 14: Final gate + spec sign-off

**Files:**
- Modify: `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md` (mark P2, P4 done; P3 stays "scaffolded, not live" until Task 13's checklist is actually run)

- [ ] **Step 1: Full local gate**

Run: `pnpm lint && pnpm typecheck && pnpm test && pnpm test:e2e && pnpm build`
Expected: all green with `AGENT_MODE` unset (deterministic default)

- [ ] **Step 2: Full gate again with `AGENT_MODE=llm` and a real key, locally**

```bash
AGENT_MODE=llm GOOGLE_API_KEY="$YOUR_KEY" GEMINI_MODEL=gemini-3.5-flash pnpm build
AGENT_MODE=llm GOOGLE_API_KEY="$YOUR_KEY" GEMINI_MODEL=gemini-3.5-flash pnpm start
```

Manually exercise `/impact?case=ANTM` and Copilot in a browser against this local server; confirm the causal chain edges show LLM-authored paths (different wording each request is expected and fine — the numbers must stay identical to a deterministic-mode run of the same page, since only prose changed).

- [ ] **Step 3: Update the spec doc**

In `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md` section 5, mark:
- P2 — done, with a one-line pointer to this plan file.
- P3 — "tool-layer code complete and tested; live activation gated on Task 13's credit-discipline checklist, not yet run."
- P4 — already marked done from the earlier session; no change needed.

- [ ] **Step 4: Commit**

```bash
git add docs/PLAN-REAL-DATA-AGENT-DEPLOY.md
git commit -m "docs: mark P2 complete, P3 scaffolded-but-not-live, in the deploy plan"
```

- [ ] **Step 5: Push and redeploy**

```bash
git push origin feat/alief/wire-ui
```

Rebuild and redeploy per Task 12 Steps 4-5 with the final commit's image.

---

## Self-Review Notes (for whoever executes this)

1. **Spec coverage:** Every row of spec section 3's "Pembagian kerja model vs kalkulator" table is implemented — mandate parser (Task 4-5), exposure path + relevance/direction (Task 6-7), verifier (Task 8), Copilot answerer (Task 9), orchestration trace (Task 10). "Perencana sumber" (which endpoint to call next) has no task here because it only matters once Task 13's live Sectors calls exist — implementing a source planner for calls that never happen would be dead code; add it as part of Task 13's follow-up wiring, not before.
2. **The relevance-score contradiction** is called out explicitly before Task 6 rather than silently resolved — if the project owner wants a continuous 0-100 score instead of three fixed bands, that changes Task 6 and Task 7's edge-weight math (`edge.relevance >= 85` in `causal-chain.tsx` for stroke width) and should be decided before Task 6 starts.
3. **Type consistency check:** `ExposureAssessment.relevanceBand` (Task 6) → `RELEVANCE_BAND_SCORE[...]` (Task 6) → consumed in Task 7's `llmExposure` producing a plain `relevance: number` on `ImpactLink`, matching the existing `ImpactLink.relevance: number` field in `lib/types.ts` unchanged. `MandatePlan` (Task 4) fields match `ResearchPlan`'s `focus`/`hypothesisTree`/`observables` types exactly, verified against `lib/types.ts:139-155`.
