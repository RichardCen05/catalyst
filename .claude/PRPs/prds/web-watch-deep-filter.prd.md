# PRD: Web-watch deep filter

Source of truth for the design: `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` (decisions table, wiring
checks W1–W19, labels, phases). This PRD only restates what the ECC PRP commands need to pick the
next phase. When the two disagree, the plan doc wins; fix this file.

## Problem

Web-watch pulls Indonesian news into the review queue (Pantau). Three kinds of item reach the
engine or waste a reviewer's time:

- **(b) rumor**: the actionable claim rests on unnamed sources ("dikabarkan", "disebut", market
  talk) with no issuer statement, disclosure or named official on the record.
- **(c) misleading title** (`menyesatkan`, `memancing emosi`): the title's claim is not supported by
  the body.
- **(d) figure contradiction**: a closing figure in the article disagrees with the recordings in
  `lib/data/market.generated.ts`.

The user wants the agents to accept or reject nearly everything by themselves, with a second,
cheaper classifier when the first is unsure, and a person only for the residual.

## Constraints (all phases)

- No new LLM spend. System One is local NLI (mDeBERTa multilingual, ONNX int8), run in Cloud Build.
  System Two is the Gemini proposal the sweep already drafts.
- Gemini currently returns 403. Until that is fixed, nothing that needs the LLM ships, and nothing
  auto-rejects because the LLM is down.
- Rejects are final. No restore for auto-rejects or triage archives.
- `AGENTS.md` "No hard-coded values": thresholds only in `lib/agent/thresholds.ts` with provenance;
  symbol, name and sector strings only from `lib/data/fixtures.ts` or derived from it.
- Never deploy without asking the user which model and provider to use.
- Do not commit unless the user asks.
- The production queue (`gs://katalis-recorded/catalyst/web-watch/queue.json`) is written only
  through the generation-guarded `saveQueue`. The first decide run on real items is a dry-run report,
  applied only on the user's approval.
- Vitest: exclude the gitignored `zz-live` test; read the raw exit code (the rtk wrapper masks it):
  `rtk proxy npx vitest run --exclude '**/zz-live*' --reporter=dot > <log> 2>&1; echo $?`.

## Success metrics

- Hard gate: 0 human-dismissed items auto-accepted; 0 golden-set clean items rejected as rumor or
  misleading.
- Reported, not gated: ECE after temperature scaling, the false-reject list, residual share against
  `webWatchResidualMaxShare`.

## Implementation Phases

<!--
  STATUS: pending | in-progress | complete
  PARALLEL: phases that can run concurrently (e.g., "with 3" or "-")
  DEPENDS: phases that must complete first (e.g., "1, 2" or "-")
  PRP: link to generated plan file once created
-->

| # | Phase | Description | Status | Parallel | Depends | PRP Plan |
|---|-------|-------------|--------|----------|---------|----------|
| 0 | Alias + near-duplicate triage fix | Name-form alias matching (W18) and sentence-overlap duplicates (W4). Uncommitted on `feat/alief/wire-ui`. | complete | - | - | - |
| 1 | Final reject + decide route | Remove restore (W13), `autoDecideEnabled` switch (W14), move auto-accept out of the sweep (W1), `/api/internal/web-watch-decide` applying verdicts (W11). | complete | - | 0 | `.claude/PRPs/plans/completed/web-watch-deep-filter-1-decide-route.plan.md` (report: `.claude/PRPs/reports/web-watch-deep-filter-1-decide-route-report.md`) |
| 2 | Titles, prose windows, figure check | Headline from body for URL-derived titles (W2), prose-sentence windows (W3), (d) regex check on closes incl. IHSG, both number locales (W5–W9). | complete | - | 1 | `.claude/PRPs/plans/completed/web-watch-deep-filter-2-figure-check.plan.md` (report: `.claude/PRPs/reports/web-watch-deep-filter-2-figure-check-report.md`) |
| 3 | System One NLI screen | Seed `lang`, hypothesis table, NLI thresholds, `scripts/screen/` Python runner, `cloudbuild-screen.yaml` + Scheduler 22:30 WIB (W10), relevance check (W19), replay + calibration harness. | complete | - | 1, 2 | `.claude/PRPs/plans/completed/web-watch-deep-filter-3-nli-screen.plan.md` (report: `.claude/PRPs/reports/web-watch-deep-filter-3-nli-screen-report.md`) |
| 4 | Pantau residual + docs | "Perlu keputusan" / "Diputuskan otomatis" UI and markers (W15, W16), `chrome:build`, retrieval bundle, `docs/DEPLOY.md`. | complete | - | 3 | `.claude/PRPs/plans/completed/web-watch-deep-filter-4-pantau-residual.plan.md` (report: `.claude/PRPs/reports/web-watch-deep-filter-4-pantau-residual-report.md`) |
| 5 | System Two in decide (LLM) | HELD until the Gemini 403 is fixed. Proposal in the decide step, undecided timer (`webWatchUndecidedMaxSweeps`), optional LLM figure extraction. Do not plan or start before the user says the key works. | pending | - | 4 | - |

Human step, outside the phases: a person confirms or overturns the provisional labels in
`tests/fixtures/web-watch-pending-labels.json` and `tests/fixtures/web-watch-golden.json`, starting
with the low-confidence ones. Calibration provenance says "labeled by Claude" until then (W17).

### To start implementation

Run `/prp-implement .claude/PRPs/plans/web-watch-deep-filter-1-decide-route.plan.md`, then the next
plan in the table. Each plan is self-contained.
