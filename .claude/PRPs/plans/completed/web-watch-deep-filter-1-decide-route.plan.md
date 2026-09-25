# Plan: Web-watch deep filter, phase 1: final reject and decide route

## Summary
Make rejects final, rename the auto-accept switch to an auto-decide switch that covers accept and
reject, take auto-accept out of the 17:30 sweep, and add `/api/internal/web-watch-decide`: the one
writer that applies screen verdicts (accept, reject, residual) to the queue. No NLI and no LLM in
this phase. The route takes verdicts as input so phase 3 can POST them.

## User Story
As the Catalyst operator, I want an internal route that applies accept or reject verdicts to the
review queue through the guarded writer, so that an offline screen can decide items without a
person and without a second writer to `queue.json`.

## Problem → Solution
Auto-accept runs inside the sweep before any screen exists, triage archives can be restored from
Pantau, and nothing can reject a pending item except a person → one decide step, run by the route,
applies verdicts; rejects are final; the sweep only triages, enqueues and drafts.

## Metadata
- **Complexity**: Medium
- **Source PRD**: `.claude/PRPs/prds/web-watch-deep-filter.prd.md`
- **PRD Phase**: 1, Final reject + decide route
- **Design source**: `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` (W1, W11, W13, W14)
- **Estimated Files**: 11

---

## UX Design

### Before
Pantau "Diarsipkan" list shows a "Kembalikan" button per item. The auto-accept toggle reads
"Terima otomatis".

### After
The archived list has no button. The toggle still exists and now controls auto-decide. Its copy
changes in phase 4, not here.

### Interaction Changes
| Touchpoint | Before | After | Notes |
|---|---|---|---|
| Archived row | "Kembalikan" restores to pending | Read-only | W13 |
| POST `/api/web-watch` `restore` | Restores | 400 (schema no longer accepts it) | W13 |
| `set-auto-accept` action | Writes `webWatchAutoAccept` | Writes `webWatchAutoDecide` | Keep the action name; old settings key read as fallback |

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `lib/web-watch/queue.ts` | 1-160, 255-275, 348-548, 576-610 | Queue shape, `restore`, `decide`, `autoAccept`, `revertAutoAccept`, `saveQueue` |
| P0 | `lib/web-watch/watch-all.ts` | 36-150 | `autoAcceptPending`, `watchAll` order (W1) |
| P0 | `app/api/internal/web-watch-triage/route.ts` | all | Pattern for the new internal route: auth, dry-run default, `saveQueue` |
| P0 | `lib/settings.ts` | 55-95 | `isAutoAcceptEnabled`, `isAutoAcceptPinnedByEnv` |
| P1 | `app/api/web-watch/route.ts` | all | `restore` action, `set-auto-accept`, status mapping |
| P1 | `app/api/internal/check-sources/route.ts` | 90-110 | Second caller of `autoAcceptPending` |
| P1 | `components/web-watch-review.tsx` | 490-545, 780-790 | `ArchivedList` and its restore button |
| P1 | `lib/agent/retrieval/context/web-watch.ts` | all | Reads the switch for the Pantau bundle |
| P1 | `lib/agent/thresholds.ts` | 196-210, 300-310, 435-445 | Threshold + provenance + resolver triple |
| P2 | `tests/web-watch-auto-accept.test.ts`, `tests/web-watch-auto-accept-route.test.ts`, `tests/internal-auth.test.ts` | all | Test patterns to mirror |
| P2 | `lib/validation/*` (grep `webWatchReviewSchema`) | - | The zod schema for review actions |

## External Documentation
None needed. Next.js route handlers: read `node_modules/next/dist/docs/` if anything about
`runtime`/`dynamic` exports is unclear (AGENTS.md: this Next.js has breaking changes).

---

## Patterns to Mirror

### INTERNAL_ROUTE
// SOURCE: app/api/internal/web-watch-triage/route.ts
```ts
export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = checkInternalAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: { apply?: unknown } = {};
  try { body = await request.json(); } catch { body = {}; }
  const apply = body.apply === true;
  ...
  if (apply) {
    await saveQueue(gcsQueueStore, (queue) => { const result = backfillTriage(queue, ...); report = result.report; return result.next; });
  } else {
    const loaded = await gcsQueueStore.load();
    report = backfillTriage(normalizeQueue(loaded?.data), ...).report;
  }
  return NextResponse.json({ applied: apply, report });
}
```

### PURE_QUEUE_TRANSFORM
// SOURCE: lib/web-watch/queue.ts:491-519 (`autoAccept`)
Pure function `(queue, ..., nowIso) => { next, <ids> }`; the caller persists through `saveQueue`.
Accepted items go through `decide(...)` and get `auto: AutoAcceptRecord` on the decision.

### SETTINGS_GATE
// SOURCE: lib/settings.ts:72-83
Env `"true"`/`"false"` wins, then `getRuntimeSettings()` field, then the default. A separate
`is…PinnedByEnv()` tells the UI the toggle cannot override.

### THRESHOLD
// SOURCE: lib/agent/thresholds.ts
Three places per key: `DEFAULT_THRESHOLDS` (Indonesian JSDoc), the provenance table (`"guess"`,
`"convention"`, …), and `resolveThresholds()`. `tsc` fails if the resolver misses a key.

### TEST_STRUCTURE
// SOURCE: tests/web-watch-auto-accept-route.test.ts:1-20
`vi.mock("@/lib/gcp/gcs", …)` with `gcsGetJson`/`gcsPutJson` mocked, env saved and restored in
`beforeEach`, route imported dynamically inside the test.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `lib/settings.ts` | UPDATE | `isAutoDecideEnabled` / `isAutoDecidePinnedByEnv`, fallbacks to the auto-accept env and key |
| `lib/web-watch/queue.ts` | UPDATE | Remove `restore`; stop writing `restored`; add `ScreenVerdict`, `applyVerdicts`, auto-reject record |
| `lib/web-watch/watch-all.ts` | UPDATE | Drop the auto-accept call from `watchAll`; keep `autoAcceptPending` exported only if still used |
| `app/api/internal/check-sources/route.ts` | UPDATE | Remove its `autoAcceptPending` call |
| `app/api/internal/web-watch-decide/route.ts` | CREATE | The decide route (W11) |
| `app/api/web-watch/route.ts` | UPDATE | Remove `restore`; switch to the new gate |
| `lib/validation/…` (file holding `webWatchReviewSchema`) | UPDATE | Drop the `restore` action |
| `components/web-watch-review.tsx` | UPDATE | Remove the restore button and its handler |
| `lib/agent/retrieval/context/web-watch.ts` | UPDATE | Read `isAutoDecideEnabled` |
| `lib/agent/thresholds.ts` | UPDATE | Raise `webWatchAutoAcceptDailyMax` |
| `tests/web-watch-decide-route.test.ts` | CREATE | Route tests |
| `tests/web-watch-auto-accept.test.ts`, `tests/web-watch-triage.test.ts`, `tests/web-watch-auto-accept-route.test.ts` | UPDATE | Remove restore tests; move auto-accept expectations off `watchAll` |

## NOT Building

- NLI, the Python runner, `cloudbuild-screen.yaml` (phase 3).
- The (d) figure check and title derivation (phase 2).
- New Pantau copy, "Perlu keputusan" section, markers on `MarketEvent` (phase 4).
- Anything that calls Gemini (phase 5, held).
- No backfill or apply against the production queue.

---

## Step-by-Step Tasks

### Task 1: Auto-decide switch
- **ACTION**: Add `isAutoDecideEnabled()` and `isAutoDecidePinnedByEnv()` to `lib/settings.ts`.
- **IMPLEMENT**: Order: env `WEB_WATCH_AUTO_DECIDE` → `settings.webWatchAutoDecide` → env
  `WEB_WATCH_AUTO_ACCEPT` → `settings.webWatchAutoAccept` → default `true`. Pinned when either env
  is `"true"`/`"false"`. Add `webWatchAutoDecide?: boolean` to the runtime settings type. Keep
  `isAutoAcceptEnabled` as a deprecated alias that returns `isAutoDecideEnabled()` so nothing
  breaks mid-change; remove it once every caller moved (Task 6).
- **MIRROR**: SETTINGS_GATE
- **GOTCHA**: `saveRuntimeSettings` merges; the `set-auto-accept` action must now write
  `webWatchAutoDecide` and leave the old key as-is.
- **VALIDATE**: `npm run typecheck`; unit test each fallback step.

### Task 2: Final reject in the queue
- **ACTION**: Delete `restore()` from `lib/web-watch/queue.ts`.
- **IMPLEMENT**: `normalizeQueue` keeps reading `restored` so old files load, and triage keeps
  honouring existing `restored` entries (a person's past overrule stands). Nothing writes a new
  `restored` entry. Update the header comment (the "restored" line and "can be restored from Pantau"
  in the triage route's JSDoc).
- **GOTCHA**: `revertAutoAccept` is not a restore: it undoes an auto-*accept* and stays (decisions
  table: "Auto-accepts keep their undo").
- **VALIDATE**: `rtk grep -n "restore(" lib app components` shows no call sites.

### Task 3: Verdict type and `applyVerdicts`
- **ACTION**: Add to `lib/web-watch/queue.ts`:
  ```ts
  export type ScreenCheck = "rumor" | "misleading-title" | "figure" | "substance" | "relevance";
  export interface ScreenVerdict {
    candidateId: string;
    verdict: "accept" | "reject" | "residual";
    /** Which check decided a reject, with the evidence span it read. */
    check?: ScreenCheck;
    reason: string;
    span?: string;
    score?: number;
    markers?: Array<"unconfirmed" | "misleadingTitle">;
  }
  export function applyVerdicts(queue: ReviewQueue, verdicts: ScreenVerdict[], nowIso: string, dailyMax?: number):
    { next: ReviewQueue; accepted: string[]; rejected: string[]; residual: string[]; skipped: Array<{ id: string; why: string }> };
  ```
- **IMPLEMENT**:
  - Only ids still in `pending` are touched; others go to `skipped` ("tidak lagi menunggu").
  - `reject`: `decide(queue, id, { action: "dismiss", reason }, nowIso)` then mark the decision
    `autoReject: { check, span, score, at }` (new optional field on `ReviewDecision`). Final: no
    revert path.
  - `accept`: only when `isAutoAcceptable(proposal, match)` holds (existing rule), under the daily
    cap, via the same code as `autoAccept` (extract a shared helper, do not duplicate). An accept
    verdict without an eligible proposal becomes `residual` with why "belum ada usulan
    terverifikasi" (LLM hold, decisions table).
  - `residual`: set `matches[id].residual = { at, reason }` (new optional field on `TriageMatch`).
    Leave the item pending.
  - Items with `matches[id].noAuto` are never auto-accepted (existing rule) and never auto-rejected.
- **MIRROR**: PURE_QUEUE_TRANSFORM
- **GOTCHA**: `dismiss` reasons are read by `fewShotExamples`; it already filters `auto`. Make sure
  it also filters `autoReject` so machine rejects never become few-shot examples.
- **VALIDATE**: unit tests (Testing Strategy).

### Task 4: `/api/internal/web-watch-decide`
- **ACTION**: Create `app/api/internal/web-watch-decide/route.ts`.
- **IMPLEMENT**: Body `{ verdicts: ScreenVerdict[]; apply?: boolean }`, validated with zod (reject
  unknown verdict strings, cap array length at the current pending count + margin, ids must be
  strings). Auth `checkInternalAuth`. Gate: if `isAutoDecideEnabled()` is false, return
  `{ applied: false, disabled: true }` and write nothing. Dry-run default: run `applyVerdicts` on
  the loaded queue and return counts plus samples (title, verdict, check, reason). `apply: true`
  writes through `saveQueue`. Also expose `GET` returning the pending items the screen needs
  (`id`, `title`, `body`, `matches[id].symbols`, `matchedBy`, source id, whether the title came from
  the URL once phase 2 adds it). The Cloud Build runner reads through this `GET`, so it never needs
  GCS credentials for the queue.
- **MIRROR**: INTERNAL_ROUTE
- **GOTCHA**: The route is reachable publicly; every path must pass `checkInternalAuth` first.
- **VALIDATE**: route tests with mocked GCS.

### Task 5: Take auto-accept out of the sweep (W1)
- **ACTION**: Remove the `autoAcceptPending` call from `watchAll` and from
  `app/api/internal/check-sources/route.ts:100`.
- **IMPLEMENT**: `WatchAllResult.autoAccepted` goes away. The decide route becomes the only place
  that accepts without a person. Until phase 3 ships, no automatic accepts happen at all; say so in
  the JSDoc and in `docs/DEPLOY.md` (phase 4). Do not deploy this phase alone without the user
  agreeing to that gap.
- **GOTCHA**: `tests/web-watch-auto-accept.test.ts` has sweep-level expectations; move them to
  `applyVerdicts` tests instead of deleting coverage.
- **VALIDATE**: typecheck; affected tests.

### Task 6: Callers of the switch and restore UI
- **ACTION**: Point `app/api/web-watch/route.ts`, `lib/agent/retrieval/context/web-watch.ts` and
  anything else from `rtk grep -rn isAutoAcceptEnabled lib app components` at `isAutoDecideEnabled`.
  Remove the `restore` action from the route and the review schema, the `"restored"` status branch
  for restore (keep it for `revert-auto`), `restore` in `components/web-watch-review.tsx:496-545`
  and the `onRestored` prop.
- **GOTCHA**: The button text "Kembalikan" and "Mengembalikan…" are indexed by the chrome registry.
  Run `npm run chrome:build` after the JSX change; `tests/chrome-registry.test.ts` fails if stale.
- **VALIDATE**: typecheck, lint, `npm run chrome:build`, full vitest.

### Task 7: Raise the daily accept cap
- **ACTION**: `webWatchAutoAcceptDailyMax` from 5 to 20 in `lib/agent/thresholds.ts`.
- **IMPLEMENT**: Provenance stays `"guess"`. JSDoc: circuit breaker for the decide step; 20 matches
  `webWatchSweepLlmCalls`, one sweep's worth of drafts.
- **VALIDATE**: typecheck.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| reject is final | pending item, verdict reject | in `decided` as dismissed with `autoReject`; not in pending; no restore export exists | |
| accept needs proposal | accept verdict, no proposal | residual, reason "belum ada usulan terverifikasi" | yes |
| accept eligible | accept verdict, proposal passing `isAutoAcceptable` | accepted with `auto` record, revertable | |
| cap | 25 eligible accepts, cap 20 | 20 accepted, 5 residual | yes |
| noAuto | reject verdict on `noAuto` item | skipped, stays pending | yes |
| stale id | verdict for id already decided | `skipped` | yes |
| few-shot | queue with an auto-reject | not returned by `fewShotExamples` | |
| switch fallbacks | env/settings combinations | order in Task 1 | yes |
| route auth | no bearer | 401/403 from `checkInternalAuth` | |
| route disabled | switch off | `{ disabled: true }`, no `gcsPutJson` | |
| route dry-run | verdicts, no apply | report, no `gcsPutJson` | |
| route apply | verdicts, apply true | one `gcsPutJson` with the expected queue | |
| watchAll | sweep with an eligible proposal | nothing auto-accepted | |
| old file | queue JSON with `restored` entries | loads; triage still skips those ids | |

### Edge Cases Checklist
- [ ] Empty verdict list
- [ ] Verdict array larger than the cap
- [ ] Unknown verdict value (400)
- [ ] Generation conflict in `saveQueue` (retry path unchanged)
- [ ] GCS unavailable (500, nothing written)

---

## Validation Commands

### Static Analysis
```bash
npm run typecheck
```
EXPECT: Zero type errors

```bash
npx eslint lib/settings.ts lib/web-watch app/api/internal/web-watch-decide app/api/web-watch components/web-watch-review.tsx
```
EXPECT: Exit 0

### Unit Tests
```bash
rtk proxy npx vitest run tests/web-watch-decide-route.test.ts tests/web-watch-auto-accept.test.ts tests/web-watch-triage.test.ts --reporter=dot
```
EXPECT: All pass

### Full Test Suite
```bash
npm run chrome:build
```
```bash
rtk proxy npx vitest run --exclude '**/zz-live*' --reporter=dot > /tmp/vitest-phase1.log 2>&1; echo "exit $?"
```
EXPECT: exit 0 (read the log tail, not a JSON report: it can be stale)

### Manual Validation
- [ ] Dry-run the decide route logic against a local copy of the prod queue (copy with
      `gcloud storage cp gs://katalis-recorded/catalyst/web-watch/queue.json <scratch>/queue.json`,
      never write back): all-residual verdicts change nothing but `matches[*].residual`.

---

## Acceptance Criteria
- [ ] No code path restores an archived or rejected item
- [ ] `watchAll` accepts nothing on its own
- [ ] Decide route: auth, dry-run default, apply through `saveQueue`, gate respected
- [ ] Old queue files load unchanged
- [ ] typecheck, lint, chrome registry, full vitest green

## Completion Checklist
- [ ] No hard-coded thresholds outside `lib/agent/thresholds.ts`
- [ ] JSDoc updated where behaviour changed (queue header, triage route, watch-all)
- [ ] No commit, no deploy

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Deploying phase 1 alone stops all auto-accepts | High if deployed | Reviewer backlog grows | Do not deploy before phase 3, or ask the user |
| Auto-reject decisions leak into few-shot | Medium | Model learns from machine rejects | Filter `autoReject` in `fewShotExamples`, test it |
| Old `restored` entries ignored | Low | A person's overrule lost | Keep reading `restored` in triage; test with an old file |

## Notes
- Deploy only when the user asks, and ask for the model and provider first.
- Do not commit unless asked. The branch is `feat/alief/wire-ui`; the alias fix (PRD phase 0) is
  still uncommitted there. Keep it in the same working tree; do not stash it away.
