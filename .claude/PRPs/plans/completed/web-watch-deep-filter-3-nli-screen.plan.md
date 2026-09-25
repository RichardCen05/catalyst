# Plan: Web-watch deep filter, phase 3: System One NLI screen

## Summary
Screen every pending item with a free local NLI model and post the verdicts to the decide route.
The model is `MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`, ONNX int8. It runs in a
Cloud Build job at 22:30 WIB, after the last data refresh. It checks four things: rumor (b), title
support (c), substantive body, and relevance per matched emiten (W19). Scores are calibrated by
temperature scaling on the labels. An unsure item goes to the residual, and a confident one is
accepted or rejected. A replay harness gates the thresholds on both fixtures before anything runs
on production.

## User Story
As the Catalyst operator, I want most pending items decided by a free model with calibrated
confidence, so that the reviewer only sees items the model is unsure about. I also want no new LLM
spend while the Gemini key is broken.

## Problem → Solution
Today: 37 of 50 pending items have no proposal, and every item waits for a person. After this
phase: a nightly screen posts accept, reject or residual per item. Rejects are only confident
rumor, confident misleading title with an empty body, confident not-substantive, or confident
not-relevant for every matched emiten. Accepts still need a verified proposal (phase 1 rule).

## Metadata
- **Complexity**: XL
- **Source PRD**: `.claude/PRPs/prds/web-watch-deep-filter.prd.md`
- **PRD Phase**: 3, System One NLI screen
- **Design source**: `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` (decisions table rows Engine, NLI checks,
  Long bodies, Calibration, Gate; W10, W11, W17, W19)
- **Depends on**: phase 1 (decide route, verdict type), phase 2 (`proseWindows`, `titleSource`)
- **Estimated Files**: 14

---

## UX Design
N/A in this phase. Phase 4 shows residual items and auto decisions in Pantau.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` | all | Every decision this phase implements |
| P0 | `app/api/internal/web-watch-decide/route.ts` | all | Built in phase 1: the `GET` payload and `POST` verdicts |
| P0 | `lib/web-watch/windows.ts` | all | Built in phase 2 |
| P0 | `cloudbuild-refresh.yaml` | all | Scheduler → Cloud Build pattern, `availableSecrets`, comments style |
| P0 | `docs/DEPLOY.md` | §10 | How the refresh job and its Scheduler are set up |
| P0 | `tests/fixtures/web-watch-pending-labels.json`, `tests/fixtures/web-watch-golden.json` | all | Calibration and gate labels |
| P1 | `lib/web-watch/seeds.ts` | all | Seed shape; add `lang` |
| P1 | `lib/web-watch/triage.ts` | 34-45 | `TRIAGE_RULES` / `TRIAGE_RULE_LABEL`, where the hypothesis table sits beside |
| P1 | `lib/internal-auth.ts` | all | Bearer check the runner must satisfy |
| P1 | `tests/web-watch-triage-dryrun.test.ts` | all | Pattern for an env-gated replay over a local queue copy |
| P2 | `lib/agent/thresholds.ts` | THRESHOLD triple | New keys |

## External Documentation

| Topic | Source | Key Takeaway |
|---|---|---|
| Model | https://huggingface.co/MoritzLaurer/mDeBERTa-v3-base-xnli-multilingual-nli-2mil7 | Labels entailment/neutral/contradiction; input `premise`, `hypothesis`; 100+ languages incl. Indonesian |
| ONNX int8 | Hugging Face `optimum` export, or a community `onnx/model_quantized.onnx` (338 MB) | Load with `onnxruntime` CPU; tokenize with `tokenizers` (no torch) |
| Temperature scaling | Guo et al. 2017, "On Calibration of Modern Neural Networks" | One scalar T fit by NLL on held-out labels; `softmax(logits / T)` |
| Cloud Build secrets | https://cloud.google.com/build/docs/securing-builds/use-secrets | `availableSecrets.secretManager` + `secretEnv` per step |

---

## Patterns to Mirror

### CLOUD_BUILD_JOB
// SOURCE: cloudbuild-refresh.yaml
A long header comment explains why the job exists, when it runs, and what it costs. Steps are
`bash -c` with `set -euo pipefail`. Secrets come through `availableSecrets` and `secretEnv`, with
`logging: CLOUD_LOGGING_ONLY`. For the screen, do not set `machineType: E2_HIGHCPU_8`: the default
machine keeps it inside the free build minutes (W10).

### ENV_GATED_REPLAY
// SOURCE: tests/web-watch-triage-dryrun.test.ts
Skipped unless an env var names a local file. Never reads or writes GCS. Can write a JSON report to
a path from another env var.

### THRESHOLD
Three places per key: default + Indonesian JSDoc, provenance, resolver.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `lib/web-watch/types.ts` | UPDATE | `lang?: "id" \| "en"` on `WatchedSource` |
| `lib/web-watch/seeds.ts` | UPDATE | Declare `lang` per seed (EIA is `en`, the rest `id`) |
| `lib/web-watch/hypotheses.ts` | CREATE | The one hypothesis table, id + en, per check. Relevance hypothesis built from the registry name |
| `lib/agent/thresholds.ts` | UPDATE | `webWatchDecideMinConfidence`, `webWatchCalibrationMinLabels`, `webWatchNliMaxWindows`, `webWatchResidualMaxShare`, a strict pre-calibration floor |
| `app/api/internal/web-watch-decide/route.ts` | UPDATE | `GET` adds `lang`, hypotheses per item (rendered server-side from the table), calibration parameters |
| `scripts/screen/screen.py` | CREATE | Runner: GET items → NLI per window per check → calibrated verdicts → POST |
| `scripts/screen/requirements.txt` | CREATE | `onnxruntime`, `tokenizers`, `numpy`, `requests` pinned |
| `scripts/screen/calibrate.py` | CREATE | Fit T per check from labels; write `scripts/screen/calibration.json` |
| `scripts/screen/replay.py` | CREATE | Run the screen offline over a local queue copy and the golden set; print the gate |
| `cloudbuild-screen.yaml` | CREATE | The nightly job |
| `tests/web-watch-hypotheses.test.ts` | CREATE | Table covers every check × lang; relevance names come from the registry |
| `tests/web-watch-decide-route.test.ts` | UPDATE | `GET` payload shape |
| `.gitignore` | UPDATE | Model cache, fetched-article cache |
| `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` | UPDATE | Mark phase-1 items done as they land |

## NOT Building

- Any Gemini call. While the LLM is on hold (decisions table), unsure items go to the residual and
  are never rejected for lack of a proposal.
- The undecided timer (`webWatchUndecidedMaxSweeps`) is phase 5.
- A Cloud Run Job. W10: none exists; use Cloud Build.
- Writing `queue.json` from the runner. W11: the route is the only writer.
- Creating the Scheduler job or granting IAM on the live project without the user's go-ahead.
  Write the commands into `docs/DEPLOY.md` (phase 4) and ask.

---

## Step-by-Step Tasks

### Task 1: Seed `lang`
- **ACTION**: Add optional `lang` to `WatchedSource`. Set it on every seed in `lib/web-watch/seeds.ts`.
- **GOTCHA**: `applySeedDeclarations` copies declared fields onto registry entries. Add `lang` to
  what it copies, and check `tests/web-watch-seed-sync.test.ts`.
- **VALIDATE**: seed-sync test.

### Task 2: Hypothesis table
- **ACTION**: Create `lib/web-watch/hypotheses.ts`:
  ```ts
  export const SCREEN_CHECKS = ["rumor", "official", "title", "substance", "relevance"] as const;
  export const HYPOTHESES: Record<(typeof SCREEN_CHECKS)[number], Record<"id" | "en", string>> = { ... };
  export function relevanceHypothesis(symbol: SymbolCode, lang: "id" | "en"): string; // registry name from fixtures
  ```
- **IMPLEMENT**: Per check, one sentence per language. `rumor` and `official` form a pair: rumor
  is entailed by unnamed-source hedging, official by a named official, issuer statement or document.
  The (b) score is `rumor` with no `official`. `title` uses premise = window, hypothesis = the title
  itself; there is no table sentence, only a template. `relevance` uses a template with
  `{company}` filled from `companies` in `lib/data/fixtures.ts`. Never type a company name.
- **GOTCHA**: AGENTS.md allows structural literal text. A hypothesis is a fixed template true for
  every case, not per-case prose. Keep it to one table beside `TRIAGE_RULES`, as the plan says.
- **VALIDATE**: test that every check has both languages, and that `relevanceHypothesis` contains
  the fixture name for every symbol in `priceSeries`.

### Task 3: Thresholds
- **ACTION**: Add the keys listed in Files to Change, each with provenance `"guess"` and Indonesian
  JSDoc. Proposed starting values, to be replaced by replay results:
  - `webWatchDecideMinConfidence` 0.9, the calibrated probability needed for an auto-reject.
  - `webWatchCalibrationMinLabels` 50, per check. Below it, use the strict floor.
  - `webWatchNliStrictFloor` 0.97, the uncalibrated floor used before the minimum label count.
  - `webWatchNliMaxWindows` 6.
  - `webWatchResidualMaxShare` 0.3, reported and not gated.
- **VALIDATE**: typecheck.

### Task 4: Decide route `GET` payload
- **ACTION**: Extend the phase-1 `GET` with, per pending item:
  - `lang` from its source,
  - `windows` from `proseWindows`, capped by `webWatchNliMaxWindows`,
  - `title`, `titleSource`,
  - `symbols`, each with its rendered relevance hypothesis,
  - the rendered hypotheses.
  Also return `thresholds: { decideMinConfidence, strictFloor, calibrationMinLabels }`.
- **IMPLEMENT**: The runner stays a dumb executor. Text, hypotheses and thresholds all come from the
  service, so the TypeScript table stays the single source.
- **VALIDATE**: route test on the payload shape.

### Task 5: Python runner `scripts/screen/screen.py`
- **ACTION**: CLI `python screen.py --service-url URL [--apply] [--calibration calibration.json] [--queue-file local.json]`.
- **IMPLEMENT**:
  - Read items from `GET /api/internal/web-watch-decide` with `Authorization: Bearer $INTERNAL_CRON_SECRET`.
    `--queue-file` replaces the GET for offline replay; it needs the same payload, dumped by a
    small TS script or a test, so the Python side never re-implements windows.
  - For each item and check: score every window and take the max entailment. Keep the argmax window
    as `span`.
  - Apply the calibration T per check when available.
  - Verdict rules, from the plan's decisions table:
    - Reject `rumor` when P(rumor) is at least min confidence and P(official) is below 1 - min.
    - Reject `title` only when the body is not substantive. Otherwise add the `misleadingTitle`
      marker and continue on the accept path.
    - Skip `title` when `titleSource == "url"`.
    - Reject `relevance` when P(not relevant) is at least min confidence for every matched symbol.
    - Otherwise: `accept` when every check is confidently clean, `residual` when any check is unsure.
  - POST `{ verdicts, apply }`. `--apply` is off by default: the first production run is a dry-run
    report (plan: Deploy).
- **GOTCHA**:
  - Tokenize premise and hypothesis as a pair and truncate only the premise to 512 tokens.
  - Label order in this model's config: check `config.json` `id2label`, do not assume.
  - Batch windows to keep memory under the default Cloud Build machine.
- **VALIDATE**: `python -m pytest scripts/screen` (add `test_screen.py` with a stub model that
  returns fixed logits) and a dry replay (Task 7).

### Task 6: Calibration `scripts/screen/calibrate.py`
- **ACTION**: Fit one temperature per check by minimising NLL on labeled items. Use the pending
  labels plus the golden set, with the text fetched to the gitignored cache.
- **IMPLEMENT**: Write `calibration.json` with `{ check: { T, n, ece_before, ece_after, labeledBy } }`.
  `labeledBy` is `"claude-opus-5-5"` until a person reviews the labels (W17). The runner uses the
  strict floor for any check with `n < webWatchCalibrationMinLabels`.
- **VALIDATE**: unit test on synthetic logits where the true T is known.

### Task 7: Replay and gate `scripts/screen/replay.py`
- **ACTION**: Run the full screen offline over:
  - a local copy of the prod queue (`gcloud storage cp` to the scratchpad; never write back),
  - the golden set.
  Print the gate.
- **IMPLEMENT**:
  - Hard gate (exit 1 on failure): 0 human-dismissed items auto-accepted, and 0 golden clean items
    rejected as rumor or misleading.
  - Reported only: ECE per check, the false-reject list with spans, and residual share against
    `webWatchResidualMaxShare`.
  - Also report #45 (ICOMEX tin): the W18 fix lost it, and the relevance check should keep TINS if
    it still matches.
- **VALIDATE**: exit code 0 on the current fixtures, or a written list of which thresholds moved and
  why.

### Task 8: `cloudbuild-screen.yaml`
- **ACTION**: Create the Cloud Build config.
- **IMPLEMENT**:
  - Step 1 (`python:3.12-slim`): `pip install -r scripts/screen/requirements.txt`, then fetch the
    ONNX model. Prefer a copy cached in `gs://katalis-recorded/catalyst/web-watch/models/`, falling
    back to Hugging Face.
  - Step 2: `python scripts/screen/screen.py --service-url $_SERVICE_URL --calibration scripts/screen/calibration.json $_APPLY`,
    with `secretEnv: [INTERNAL_CRON_SECRET]`.
  - `availableSecrets` points at the existing `INTERNAL_CRON_SECRET` secret. The Cloud Build service
    account needs `roles/secretmanager.secretAccessor` on it (W10).
  - Default machine type, `timeout: 1800s`.
  - Header comment in the refresh file's style: why 22:30 WIB (after the last refresh try, W5), why
    Cloud Build (W10), why it never writes the queue (W11), and why `_APPLY` starts empty.
- **GOTCHA**: Do not create the trigger or the Scheduler job here. That is a live-project change:
  write the commands for `docs/DEPLOY.md` and ask the user.
- **VALIDATE**: `gcloud builds submit --config cloudbuild-screen.yaml --substitutions=_APPLY= --no-source`
  is a live action. Run it only with the user's go-ahead. Offline, lint the YAML (`python -c "import yaml,sys;yaml.safe_load(open('cloudbuild-screen.yaml'))"`).

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| hypothesis table | every check × lang | non-empty string | |
| relevance name | each symbol | contains its fixture name | |
| GET payload | pending item with chrome body | windows skip chrome; hypotheses rendered | |
| runner verdict | stub logits: rumor high, official low | reject `rumor` with span | |
| runner unsure | stub logits near 0.5 | residual | yes |
| URL title | `titleSource: "url"` | title check skipped | yes |
| empty-body clickbait | title contradicted, body not substantive | reject `title` | |
| body-rich clickbait | title contradicted, body substantive | accept path + `misleadingTitle` marker | |
| strict floor | n < min labels | floor used, not T | yes |
| calibration | synthetic logits, known T | fitted T within 5% | |

### Edge Cases Checklist
- [ ] Item with 0 windows (all chrome): substance check says not substantive; triage should have
      archived it already
- [ ] Item with 8 matched emiten (ESDM/GAPKI): relevance per symbol, reject only if all confidently
      irrelevant
- [ ] English source (EIA)
- [ ] Service unreachable: runner exits non-zero, nothing written
- [ ] Decide switch off: route answers `disabled`, runner logs and exits 0

---

## Validation Commands

### Static Analysis
```bash
npm run typecheck
```
EXPECT: Zero type errors
```bash
npx eslint lib/web-watch app/api/internal/web-watch-decide
```
EXPECT: Exit 0

### Unit Tests
```bash
rtk proxy npx vitest run tests/web-watch-hypotheses.test.ts tests/web-watch-decide-route.test.ts tests/web-watch-seed-sync.test.ts --reporter=dot
```
```bash
python3 -m pytest scripts/screen -q
```
EXPECT: All pass

### Full Test Suite
```bash
rtk proxy npx vitest run --exclude '**/zz-live*' --reporter=dot > /tmp/vitest-phase3.log 2>&1; echo "exit $?"
```
EXPECT: exit 0

### Replay gate
```bash
python3 scripts/screen/replay.py --queue-file <scratchpad>/queue.json --golden tests/fixtures/web-watch-golden.json --labels tests/fixtures/web-watch-pending-labels.json
```
EXPECT: exit 0, hard gate green; ECE, false rejects and residual share printed

---

## Acceptance Criteria
- [ ] Hypotheses live in one table; company names come from the registry
- [ ] Runner never writes GCS; route is the only writer
- [ ] Replay hard gate green on both fixtures
- [ ] Calibration output records `labeledBy` honestly
- [ ] `cloudbuild-screen.yaml` written, not triggered
- [ ] typecheck, lint, vitest, pytest green

## Completion Checklist
- [ ] Every new threshold has provenance
- [ ] No Gemini call anywhere in this phase
- [ ] No live-project change (Scheduler, IAM, trigger) without the user's go-ahead
- [ ] No commit, no deploy

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| NLI misreads Indonesian hedging | Medium | Rumor missed or false reject | Strict floor until 50 labels per check; residual when unsure |
| Few positive labels for (c) | High | Title check gate is weak | Report it; residual decisions become labels |
| Model download slow or rate-limited | Medium | Nightly run fails | Cache the ONNX file in the bucket |
| Relevance hypothesis too loose | Medium | Commodity news wrongly rejected | Reject only when every matched emiten is confidently irrelevant |

## Notes
- The labels were written by Claude and no person has reviewed them. Every calibration file and
  report must say so.
- Deploy only when the user asks, and ask for the model and provider first.
