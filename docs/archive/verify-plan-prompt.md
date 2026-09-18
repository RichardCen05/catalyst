# Verification prompt — market psychology signals plan

Paste the block below into a **fresh session** on this repo. It is self-contained: the verifier is not expected to have seen the conversation that produced the plan.

---

You are verifying an implementation plan against the repository it claims to describe. This is a **read-only audit**. Do not edit any file, do not create branches, do not run the build, do not call any external API. Your job is to find out where the plan is wrong before anyone writes code against it.

**Repo:** `/Users/af/dumpProject/catalyst` (branch `feat/alief/wire-ui`)
**Plan under audit:** `docs/superpowers/plans/2026-09-16-market-psychology-signals.md`

Read the plan first, in full. It proposes five features derived from a practitioner interview about the Indonesian stock market: user-tunable research thresholds, institutional distribution ("whale") detection, unexplained co-movement ("panic contagion") flagging, a narrative-versus-financials contradiction check, and an honest leadership-change surface. Background you need in order to judge it: this project is deliberately citation-first and deterministic — every number shown to a user is computed in TypeScript from a recorded source and carries a citation, the LLM layer never emits figures, and production deploys are manual and operator-gated because the Sectors API credit grant is non-renewable.

## Part 1 — Anchor claims

The plan cites specific files and line numbers. Each one below is a claim. Confirm or refute it by reading the actual file. A line number that has drifted by a line or two is CONFIRMED if the cited construct is clearly there; a claim pointing at unrelated code is REFUTED.

1. `lib/agent/engine.ts:367` contains a hardcoded concentration threshold of `0.42` that decides a pillar status.
2. `lib/agent/engine.ts:50` defines `relevanceFloorFor()` reading an optional `relevanceFloor` off the playbook, defaulting to 85.
3. `app/playbook/page.tsx:126-128` renders a range input bound to `relevanceFloor` — i.e. a user-adjustable threshold already ships end to end.
4. `lib/schemas.ts` constrains `pillarOrder` to exactly four unique values, making a fifth `PillarKey` a breaking change across schema, store, and UI.
5. `scripts/build_market_data.py:328-334` reads `v2_filings__*` recordings but keeps only title/body text, discarding the structured holder fields.
6. `scripts/build_market_data.py:440-450` already emits a leadership-change event from the RUPS `agm_result`, with an IDX citation.
7. Quarterly financials already reach the UI with citations at `app/companies/[symbol]/company-detail-client.tsx:79` and `components/research-case-workspace.tsx:82-84`.
8. `lib/evidence-gaps.ts` currently emits the unconditional line "Transaksi pihak terafiliasi belum diidentifikasi."
9. `playbookSchema` in `lib/schemas.ts` is already carried by the `/api/analyze`, `/api/causal-graph`, and `/api/chat` request schemas — so a new playbook field reaches the engine without new plumbing.
10. `lib/store.ts` persists `playbook`, `ruleProposals`, and exposes `setRelevanceFloor`.

## Part 2 — Data claims

The plan's headline assertion is that **Phases A through E cost zero Sectors API credit** because every input is already recorded in `data/sectors/`. Verify each part:

11. `data/sectors/v2_filings__*_symbol-*.JK.json` rows actually carry `holder_name`, `holder_type`, `holding_before`, `holding_after`, `amount_transaction`, `transaction_type`, `timestamp`, and a `source` URL. Name which symbols have non-empty results and which are empty.
12. `data/sectors/v2_broker-summary_*_top.json` has **no** regular-versus-negotiated market board split — the plan depends on this being a genuine data limitation rather than an oversight. If you find any field that does expose board or transaction type, say so loudly; it would change the design.
13. Daily OHLCV is recorded for the full symbol universe over one shared window, and an IHSG index series covers the same window. Report the exact window and the number of trading days in it.
14. Quarterly financials are recorded for a **subset** of symbols only. List them.
15. Given 13, is the plan's contagion design viable? It computes Pearson correlation on IHSG-excess daily returns and refuses to emit a number below 10 overlapping observations. State the actual overlap count and whether the guard is reachable or vacuous.
16. Does any task in Phases A–E require a file that is **not** on disk? If yes, name the file and the task — that would falsify the zero-credit claim.

## Part 3 — Omissions (the part that matters most)

Confirming the plan's own claims is the easy half. Now look for what it failed to account for. Investigate at least these, and anything else you find:

- **Playbook persistence beyond the browser.** The plan asserts thresholds are per-user client state needing no new environment variable. Check `lib/memory/gcs-memory.ts`, `app/api/memory/route.ts`, and `lib/memory-store.ts`. If the playbook is also persisted server-side, Task 1 is incomplete and the plan's "no new env var" claim needs re-examination.
- **Zustand persist migration.** Adding an optional `thresholds` object to a persisted store — does this repo's `persist` config set a `version`/`migrate`? What happens to a user whose localStorage predates the field?
- **`EvidenceAvailability` shape.** Task 6 wants a gap line conditional on `institutionalFlows.length`. Does `deriveMissingEvidence`'s input interface support that without a signature change the plan did not list?
- **Threshold interaction.** `causalGraphRequestSchema` defaults `minRelevance` to 60 while `relevanceFloor` defaults to 85. Do these two interact in the graph path, and does the plan's threshold work risk changing graph output in a way no task mentions?
- **Regression surface.** Task 2 claims a default playbook produces byte-identical output to today. Read enough of `buildAnalysis()` to judge whether that is actually testable as stated, or whether some computation is already non-deterministic (time, ordering, cache).
- **Test-count baseline.** The plan assumes an existing green suite. Count the test files and describe what a regression in `tests/engine.test.ts` would look like — do not run the suite.

## Output

Report as a table: `claim # | CONFIRMED / REFUTED / PARTIAL | file:line | one-line evidence`. Then, separately, a ranked list of omissions — most-likely-to-cause-rework first — each with the specific task number it should be folded into and what the task should say instead.

Be adversarial. A plan that survives this audit unchanged is suspicious; say so if that is what you find. Do not propose new features, and do not soften a refutation into a suggestion. Keep the whole report under 900 words.
