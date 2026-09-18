# Implementation prompt — Market Psychology Signals

You are implementing `docs/superpowers/plans/2026-09-16-market-psychology-signals.md` in `/Users/af/dumpProject/catalyst` on branch `feat/alief/wire-ui`.

**Read the plan in full first.** It has been audited and it is wrong in ten specific places. The corrections below override the plan wherever they conflict. Do not re-derive them; do not relitigate them. If you find the plan says one thing and this prompt says another, this prompt wins.

Use `superpowers:executing-plans` to run it task by task. Before starting, read `AGENTS.md` and the relevant guide under `node_modules/next/dist/docs/` — this is not the Next.js in your training data.

---

## Non-negotiable project rules

- **Citation-first.** Every number shown to a user is computed in TypeScript from a recorded field in `data/sectors/` and carries a `Citation`. The LLM layer never emits figures. If a source is missing, emit a gap row via `deriveMissingEvidence` — never a placeholder value.
- **Deterministic.** `buildAnalysis()` (`lib/agent/engine.ts:313`) is synchronous and has no `Date`, `Math.random`, or LLM call. Keep it that way. Any new module under `lib/agent/` must be a pure function with no I/O.
- **Zero Sectors API credit.** Every input this work needs is already recorded on disk. Do not call the Sectors API. Task 12 stays unstarted unless the operator explicitly approves it.
- **No new `PillarKey`.** `pillarSchema` is a fixed 4-enum (`lib/schemas.ts:4`) and `pillarOrder` is `.length(4)` (`lib/schemas.ts:15`). New evidence attaches to the existing `concentration` pillar, or to `contradictions` / `counterEvidence` / `unresolvedQuestions`.
- **No advice language.** `ADVICE_PATTERN` in `lib/agent/gates.ts:17` rejects `beli|jual|entry|stop loss|target price|take profit|cuan|buy|sell` on word boundaries. Contagion output is a falsifiable question, never a verdict.
- **No reputation scores for named individuals.** Phase E surfaces the recorded RUPS fact plus an explicit "not recorded" gap. Nothing else.
- **Do not deploy.** Task 13 is operator-executed. Stop after Task 11 and report.

---

## Corrections to the plan — apply these

### C1 — Phase D is NOT already done. Task 9 is currently unimplementable.
The plan says quarterly financials are "already done, do not redo." The rendering is done; the data Task 9 needs is not.

`FinancialInput` (`lib/types.ts:80-86`) is `{ label, value: string, period, interpretation, citations }`. `financialRows` (`lib/data/market.generated.ts:4156`) carries **one period per label**, with values as pre-formatted Indonesian strings (`"Rp33,4T"`, `"11,8%"`). There is no numeric field and no time series. `directionOfFinancialTrend(financialContext, label)` cannot be written against this.

The raw data does exist — `data/sectors/v2_financials_quarterly_*__n_quarters-4.json` holds four quarters for ANTM, BBCA, BBRI, GOTO, PGAS, TLKM.

**Add a task before Task 9** (call it Task 8b) that:
- extends `FinancialInput` with a numeric field and a per-label quarterly series (keep `value: string` for display — do not break the two render sites at `app/companies/[symbol]/company-detail-client.tsx:79` and `components/research-case-workspace.tsx:82,84`),
- extends `scripts/build_market_data.py` to emit the numeric series from the recorded four quarters,
- regenerates and commits `lib/data/market.generated.ts` in the same commit as the script change.

Then write Task 9 against the numeric series. Parse from the numeric field, never from `interpretation` prose. `"unknown"` returns nothing — silence beats a guess.

### C2 — Task 5's `brokerChurnRatio` has no inputs.
`BrokerEvidence` (`lib/types.ts:110-123`) is `buyers: Array<{code, origin, value}>` / `sellers: Array<{…}>`. `scripts/build_market_data.py:658-664` writes `buy_idr` into `buyers[].value` and `sell_idr` into `sellers[].value`, discarding the per-broker `buy_idr`/`sell_idr`/`net_idr` triple. `(buy_idr + sell_idr) / max(|net_idr|, 1)` is not computable from the fixture.

The raw triple is on disk in `data/sectors/v2_broker-summary_*_top.json` (6 symbols: ANTM, BBCA, BBRI, GOTO, PGAS, TLKM).

**Before writing `brokerChurnRatio`:** extend `BrokerEvidence` to carry the per-broker `buyIdr`/`sellIdr`/`netIdr` triple, extend the build script to emit it, regenerate the bundle. Only then write the ratio. Keep the "proksi" labelling and the `calculation.notes` line stating pasar nego is not observable in this source.

### C3 — Task 4 names the wrong file.
The citation registry is `lib/data/fixtures.ts:58` — `citations.broker` is at `lib/data/fixtures.ts:61`. `lib/agent/citations.ts` is a ReguLens-ported source-span locator and has nothing to do with this.

Also: each filing row carries its **own** IDX announcement PDF in `source`, so `citations.filing(symbol)` cannot express it. Use `citations.filing(symbol, sourceUrl)` and pass the row's recorded `source` through. Follow the `cite()` signature at `lib/data/fixtures.ts`.

### C4 — Task 6 will throw, not degrade gracefully.
`enforceCitations` (`lib/agent/gates.ts:7-15`, called at `lib/agent/engine.ts:469`) **throws** when any pillar metric has zero or incomplete citations. 14 of 18 symbols have empty filings recordings (200 B files). If the three new concentration metrics are emitted unconditionally, every one of those cases 500s.

Emit the new metrics **only** when `institutionalFlows.length > 0`. State this gate in the task text so no future session re-adds them unconditionally.

Non-empty filings: GOTO (6 rows), BUKA (2), BMRI (2), JSMR (1). Empty: the other 14.

### C5 — Task 2's volume z-score literal is not where the plan says.
It is not in `calculateVolumeSignal`'s caller. There are **three** literals, in two files, and they disagree with each other and with the plan:
- `lib/agent/metrics.ts:58` — `absolute >= 5 ? "Extreme" : absolute >= 2.5 ? "Elevated" : "Normal"` (two literals, inside the pure function)
- `lib/agent/signal-history.ts:27` — `if (z >= 3) return "Ekstrem"` (a third, independent copy)

The plan's `volumeZFloor` default of `3` matches neither. Decide the default from the live values, not the plan's guess. Thread all three sites through `resolveThresholds`, change `calculateVolumeSignal`'s signature, and update `tests/metrics.test.ts` (5 cases) accordingly. Leaving `signal-history.ts` unthreaded means the slider moves the pillar but not the signal-history label — do not ship that.

### C6 — Thresholds are persisted server-side, unvalidated.
The plan's Phase A table says storage is "Zustand persist (browser)". That is incomplete. `components/memory-sync.tsx:62` POSTs the entire zustand state to `/api/memory`, and `app/api/memory/route.ts` writes it to GCS (`lib/memory/gcs-memory.ts:28`, object `catalyst/memory/<uid>.json`) with **no zod parse at all**.

So Task 1's "out-of-bound value is a 400, not a silent clamp" holds only on `/api/analyze`, `/api/causal-graph`, `/api/chat`. Thresholds reach GCS unvalidated.

**Task 1 must also:** validate the playbook slice in `app/api/memory/route.ts` against `playbookSchema` before it reaches `saveMemory`, and correct the Phase A table in the plan document to say "Zustand persist (browser) + GCS backup via /api/memory". Note `playbookSchema` is not `.strict()`, so an unknown `thresholds` key is silently stripped rather than rejected — the schema extension in Task 1 is what makes the field survive at all.

The plan's "no new environment variable" claim is correct and stays correct — `GCS_MEMORY_BUCKET` already exists (`lib/memory/gcs-memory.ts:16`, `.env.example:66`).

### C7 — Persist migration is under-specified.
`lib/store.ts:221-249` is `name: "catalyst:v1"`, `version: 3`, with both `migrate` and `merge`. Two things the plan misses:
- `merge` at `lib/store.ts:243` hardcodes a **second** copy of the 85 default: `playbook: { relevanceFloor: 85, ...current.playbook, ...(stored.playbook ?? {}) }`. Task 1's "one resolver, one default table" must de-duplicate this, not leave it.
- `components/memory-sync.tsx:39` calls `useCatalystStore.setState(remote)` wholesale on remote hydration, bypassing `merge` entirely. A remote snapshot predating `thresholds` lands with the field absent.

Bump to `version: 4`, add a `migrate` branch that fills `thresholds: stored.playbook?.thresholds ?? {}`, and make `resolveThresholds` default **per key** so a partial or absent object is always safe. Add a test for a persisted v3 snapshot with no `thresholds`.

### C8 — `EvidenceAvailability` needs a signature change the plan does not list.
`lib/evidence-gaps.ts:1-7` has no `institutionalFlows` field. Task 6's conditional gap line requires adding it, updating the call site at `lib/agent/engine.ts:564`, and updating `tests/improvements.test.ts:70`. List these three edits in the task.

### C9 — `relevanceFloor` silently drives causal-graph edge confidence.
`lib/agent/engine.ts:754` computes `graphFloor = relevanceFloorFor(options.context?.playbook)` and feeds it to `confidenceFor()`, which labels **every** graph edge High/Medium/Low. `minRelevance` (default 60, `lib/schemas.ts:43`) only filters which edges are visible. The two are independent and both live in the graph path.

Consequence: moving the Task 3 relevance slider re-labels every edge's confidence, and no task in the plan mentions it. **Task 2's `AppliedPlaybookRule` requirement must cover the graph path too**, not just pillar status — a user who moves a slider must see which graph confidences moved.

Task 8 hardcodes `confidence: "Low"` for co-movement edges, bypassing `confidenceFor`. That is a deliberate exception; keep it, but say so in a code comment so the inconsistency is not read as a bug later.

### C10 — The test baseline is wrong.
The plan says "the 54 existing tests must not regress." The real baseline is **175 test cases across 25 files** in `tests/`, plus 2 Playwright specs in `tests/e2e/`. `tests/engine.test.ts` has 13.

Also: `tests/settings-refresh.test.ts` (12 cases), `lib/data/sectors-refresh.ts`, `lib/settings.ts`, and `app/api/settings/` are **untracked** in git. Task 12 depends on them. Commit them before Task 11, or the "green suite" is not reproducible.

Correct the number in the plan document to 175 as part of Task 11.

---

## What the audit confirmed — do not re-verify

- `lib/agent/engine.ts:367` hardcodes `0.42`. `lib/agent/engine.ts:50-51` defines `relevanceFloorFor` defaulting to 85. `app/playbook/page.tsx:126,128` ships the range input. `playbookSchema` rides on all three request schemas (`lib/schemas.ts:36,46,94`). `lib/store.ts` has `playbook`, `ruleProposals`, `setRelevanceFloor`. `AppliedPlaybookRule` already has a `"materiality"` kind (`lib/types.ts:146-151`) and `appliedRules` is already on the case.
- Filings rows carry `holder_name`, `holder_type`, `holding_before`, `holding_after`, `amount_transaction`, `transaction_type`, `timestamp`, `source` — plus `price`, `transaction_value`, `share_percentage_*`. **Prefer the recorded `transaction_value` over recomputing from `referencePrice`** — a recorded field beats a derived one under the citation rule.
- `v2_broker-summary_*_top.json` has no market-board split. `origin` and `cohort` are recorded as `"all"` and are query parameters, not a board field. The plan's proxy-plus-gap approach is the right call.
- Daily OHLCV: 18 symbols, one shared window **2026-08-03 → 2026-09-11, 28 trading days**. IHSG covers the same 28 days, overlap 28/28.
- Quarterly financials: ANTM, BBCA, BBRI, GOTO, PGAS, TLKM.

## One design note on Task 7

28 closes yield **27 excess returns**. The `< 10 overlapping observations → null` guard can therefore never fire on the bundled universe — it is unreachable in production and only testable against a synthetic fixture. Keep the guard (it is correct defensive code for a future narrower window), but write its test against a deliberately short synthetic series and say in a comment that the bundled window always exceeds it.

Also sort contagion candidates explicitly before returning. Do not rely on object iteration order over the fixtures map.

---

## Order of work

1. C6 + C7 + Task 1 (types, schema, `lib/agent/thresholds.ts`, store version bump, memory-route validation)
2. C5 + Task 2 (three z-score sites, `0.42`, `appliedRules` including the graph path per C9)
3. Task 3 (sliders, `setThreshold`, drawer copy)
4. C2 + C3 + Task 4 (broker triple + filings lift + `citations.filing(symbol, sourceUrl)`, regenerate bundle)
5. Task 5 (`lib/agent/distribution.ts`)
6. C4 + C8 + Task 6 (wire into case, conditional metrics, gap lines)
7. Task 7 + Task 8 (`lib/agent/contagion.ts`, surface honestly)
8. C1 + Task 8b + Task 9 (numeric financial series, then `lib/agent/fundamental-check.ts`)
9. Task 10 (leadership gap + observable)
10. C10 + Task 11 (commit untracked files, then the full gate)

Write the test for each task in the same commit as the code. Regenerate `lib/data/market.generated.ts` in the same commit as any `scripts/build_market_data.py` change — the bundle and its generator must never drift.

## Definition of done

- `pnpm lint && pnpm typecheck && pnpm test && pnpm build` all green, `AGENT_MODE=deterministic`, no network.
- 175 pre-existing test cases still pass. The default-playbook regression guard from Task 2 proves untouched behaviour stayed untouched — this is testable because `buildAnalysis()` is deterministic.
- `pnpm test:e2e` green for the slider-persistence journey.
- Manual pass on `/playbook`, one case page with recorded filings (GOTO), one without (TLKM). Gap lines must read as honest absences, not errors.
- Stop. Report what is green, what you changed versus the plan, and anything you could not do. Do not deploy.

## When you disagree

If implementing reveals that a correction above is itself wrong, stop and say so with the file:line evidence rather than silently working around it. Same rule as the plan's own: if a `.env` change starts to look necessary, stop — it means state leaked to the wrong layer.
