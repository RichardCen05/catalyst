# Plan: Web-watch deep filter, phase 4: Pantau residual, markers, deploy docs

## Summary
Show the reviewer only what the screen left undecided ("Perlu keputusan") and show what it decided
alone ("Diputuskan otomatis"). Carry the `unconfirmed` and `misleadingTitle` markers from accepted
items into the engine, so the case view and the assistant say "belum dikonfirmasi resmi". Rebuild
the chrome registry, update the Pantau retrieval bundle, and document the screen job in
`docs/DEPLOY.md`.

## User Story
As a reviewer, I want Pantau to show only the items the agents could not decide, with the reason
each is unsure. I also want to see what they decided alone and why. Every decision I make becomes a
calibration label.

## Problem → Solution
Pantau lists every pending item, and nothing tells an auto decision from a human one. Afterwards:
- a "Perlu keputusan" section lists residual items with the unsure check and span;
- a "Diputuskan otomatis" section lists auto accepts (undo allowed) and auto rejects (final, with
  check and span);
- markers reach `MarketEvent`.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/web-watch-deep-filter.prd.md`
- **PRD Phase**: 4, Pantau residual + docs
- **Design source**: `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` (Markers row, W15, W16)
- **Depends on**: phase 3 (verdicts exist in the queue)
- **Estimated Files**: 9

---

## UX Design

### Before
```
Pantau
  Menunggu review (50)   [every pending item]
  Diterima
  Diarsipkan
```

### After
```
Pantau
  Perlu keputusan (n)       [residual only: title, unsure check, span, Terima / Tolak]
  Menunggu penyaringan (m)  [pending, not screened yet]
  Diputuskan otomatis       [auto accept: Batalkan | auto reject: check + span, final]
  Diterima
  Diarsipkan                [read-only]
```

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Residual item | Mixed in pending | Own section with the unsure check | Decision becomes a label (W17) |
| Auto reject | Did not exist | Listed, final, no button | Decisions table: Reject is final |
| Auto accept | Toggle text "Terima otomatis" | Toggle "Putuskan otomatis" | Same `set-auto-accept` action from phase 1 |
| Accepted case with marker | No marker | "Belum dikonfirmasi resmi" / "Judul tidak sesuai isi" | W16 |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `components/web-watch-review.tsx` | all | Current sections, handlers, copy |
| P0 | `app/api/web-watch/route.ts` | GET | What the page loads |
| P0 | `lib/agent/retrieval/context/web-watch.ts` | all | Pantau retrieval bundle |
| P0 | `AGENTS.md` | chrome registry section | `npm run chrome:build`; never pin a heading string in a test |
| P1 | `lib/types.ts` | 369-382 | `MarketEvent`, where the optional markers go |
| P1 | `lib/data/providers.ts` | `getOverlayEvents` use | How accepted events reach the engine (W16) |
| P1 | Case view component (grep `impactLinks` in `components/`) | - | Where a marker is shown |
| P1 | `lib/agent/llm/verify.ts` | all | Assistant sentences are verified; a marker must be material, not prose |
| P1 | `docs/DEPLOY.md` | §10 | Format for the new job section |

---

## Patterns to Mirror

### STRUCTURAL_COPY
Headings, labels and empty states are allowed literals (AGENTS.md) and are indexed by
`scripts/build-chrome-registry.mjs`. A reason or explanation per item is not copy: render the
stored `reason`, `check` and `span` from the queue.

### RETRIEVAL_BUNDLE
// SOURCE: lib/agent/retrieval/context/web-watch.ts
The bundle reads live state (it already reads the switch) and hands measurements to the model. Add
counts of residual, auto-accepted and auto-rejected items, computed from the queue.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `lib/types.ts` | UPDATE | `markers?: Array<"unconfirmed" \| "misleadingTitle">` on `MarketEvent` |
| `lib/web-watch/queue.ts` | UPDATE | Accept path copies verdict markers onto the accepted event; `overlayCounts` adds residual / auto counts |
| `app/api/web-watch/route.ts` | UPDATE | GET returns `residual`, `autoDecided` lists |
| `components/web-watch-review.tsx` | UPDATE | New sections and toggle label |
| Case view component | UPDATE | Show the marker label |
| `lib/agent/retrieval/context/web-watch.ts` | UPDATE | New counts in the bundle |
| `lib/data/chrome.generated.ts` | REGENERATE | `npm run chrome:build`; never hand-edit |
| `docs/DEPLOY.md` | UPDATE | Screen job: trigger, Scheduler 22:30 WIB Asia/Jakarta, secret IAM, dry-run-first, kill switch |
| `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` | UPDATE | Mark phase 1 items done |

## NOT Building

- Phase 5 (LLM, undecided timer).
- Editing the neutral title for `misleadingTitle` items. That needs the LLM, so the marker is shown
  and the title is left alone until phase 5.

---

## Step-by-Step Tasks

### Task 1: Markers on `MarketEvent` (W16)
- **ACTION**: Add the optional field. When `applyVerdicts` accepts an item whose verdict carries
  markers, the accepted event gets them.
- **GOTCHA**: `MarketEvent` is used by fixtures and generated data. Keep the field optional, and do
  not touch `market.generated.ts`.
- **VALIDATE**: typecheck; queue test.

### Task 2: API and Pantau sections
- **ACTION**: The GET returns residual items with `matches[id].residual`, and auto decisions with
  `decided[id].auto` or `autoReject`. Render the sections from the After diagram.
- **IMPLEMENT**: A residual accept or dismiss by a person uses the existing `decide`. That decision
  is the label phase 3 calibration reads, so add `fromResidual: true` to the decision.
- **VALIDATE**: preview the page with `preview_start`; screenshot the new sections with a seeded
  memory queue.

### Task 3: Marker in the case view and the assistant
- **ACTION**: Show "Belum dikonfirmasi resmi" or "Judul tidak sesuai isi" next to a marked event.
  Include the marker in the material handed to the model, so the assistant can say so verified.
- **GOTCHA**: The verify guards limit numerals and names. A marker is a field label, so it passes.
  Do not write a per-event sentence.
- **VALIDATE**: assistant test with a marked overlay event (`setOverlayForTests`).

### Task 4: Chrome registry and retrieval bundle
- **ACTION**: Run `npm run chrome:build` after the JSX change. Add the counts to the bundle.
- **VALIDATE**: `tests/chrome-registry.test.ts`, `tests/retrieval-views.test.ts`.

### Task 5: `docs/DEPLOY.md`
- **ACTION**: Add a section for the screen job, in the style of §10. Cover:
  - the trigger and Scheduler commands (22:30 WIB, `Asia/Jakarta`);
  - the `secretAccessor` grant for the Cloud Build service account on `INTERNAL_CRON_SECRET`;
  - `_APPLY` empty for the first run, with the dry-run report read by the user before the switch;
  - the kill switch (`WEB_WATCH_AUTO_DECIDE=false` or the Pantau toggle);
  - the fact that rejects are final.
  Record that phase 1 removed auto-accept from the sweep.
- **GOTCHA**: DEPLOY.md is the only doc verified against the live project. Write the commands as
  "to run", not as done, until the user runs them.
- **VALIDATE**: read-through.

---

## Testing Strategy

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| marker carried | accept verdict with `unconfirmed` | accepted event has the marker | |
| residual list | queue with `matches[id].residual` | in GET `residual` | |
| auto reject list | queue with `autoReject` decision | in GET `autoDecided`, no undo action | |
| residual decision | person dismisses a residual item | decision has `fromResidual: true` | |
| bundle | queue with each kind | counts match | |

---

## Validation Commands

```bash
npm run typecheck
```
```bash
npm run lint
```
```bash
npm run chrome:build
```
```bash
rtk proxy npx vitest run --exclude '**/zz-live*' --reporter=dot > /tmp/vitest-phase4.log 2>&1; echo "exit $?"
```
```bash
npm run build
```
EXPECT: all exit 0

### Browser Validation
Start the dev server through `preview_start` (see `.claude/launch.json`). Open Pantau and check
that the three new sections render with a seeded memory queue. Check phone width too.

---

## Acceptance Criteria
- [ ] Residual, auto-accepted and auto-rejected items are visibly separate
- [ ] Auto rejects have no action button
- [ ] Markers reach the case view and the assistant material
- [ ] Chrome registry and retrieval bundle current
- [ ] DEPLOY.md describes the job without claiming it is live
- [ ] typecheck, lint, vitest, build green

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Heading string pinned in a test | Medium | Test breaks on copy change | Never pin headings (chrome registry memory) |
| Marker read as per-event prose | Low | AGENTS.md violation | Marker is an enum label, rendered by a shared component |

## Notes
- Deploy only when the user asks. Ask for the model and provider first.
- The first production decide run is a dry-run; apply only on the user's approval, because rejects
  are final.
