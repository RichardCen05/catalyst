# Implementation Report: Web-watch deep filter, phase 1 (final reject + decide route)

## Summary
Rejects are final: `restore()` and the `restore` review action are gone, and the Pantau archived
list has no "Kembalikan" button. The auto-accept switch became an auto-decide switch
(`isAutoDecideEnabled`) that reads the older env and settings key as fallbacks. The 17:30 sweep and
the single-source check no longer accept anything. `applyVerdicts` in `lib/web-watch/queue.ts`
applies screen verdicts (accept, reject, residual), and the new internal route
`/api/internal/web-watch-decide` runs it: `GET` lists pending items for the screen, `POST` dry-runs
by default and writes only with `apply: true`, through `saveQueue`. The daily accept cap went from
5 to 20.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium | Medium |
| Confidence | not stated | High: every path has a unit or route test |
| Files Changed | 11 | 17 (13 source + 4 tests), plus 1 new route and 1 new test |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Auto-decide switch | Complete | Deviated: both env vars are read before any stored flag (see Deviations) |
| 2 | Final reject in the queue | Complete | `restored` still read by `normalizeQueue` and backfill |
| 3 | Verdict type and `applyVerdicts` | Complete | Shared `acceptOnProposal`; `autoReject` record; `residual` on `TriageMatch` |
| 4 | `/api/internal/web-watch-decide` | Complete | zod schema local to the route; reject requires `check` |
| 5 | Auto-accept out of the sweep | Complete | `autoAccept` and `autoAcceptPending` removed; `WatchAllResult.autoAccepted` removed |
| 6 | Switch callers and restore UI | Complete | `chrome:build` run |
| 7 | Daily cap 5 → 20 | Complete | Provenance stays `guess` |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | Pass | `tsc` 0 errors; `eslint .` 0 errors (23 warnings, none new in touched code) |
| Unit Tests | Pass | Full run: 84 files passed, 1 skipped; 787 tests passed, 1 skipped; exit 0 |
| Build | Pass | `npm run build` exit 0 |
| Integration | Pass | Route tests with mocked GCS (auth, disabled, dry-run, apply, 400s, 500) |
| Edge Cases | Pass | Empty list, >200 verdicts, unknown verdict, duplicate id, stale id, GCS down |
| Manual | Pass | Prod queue copy (`gcloud storage cp`, read-only): all-residual verdicts on 50 pending changed only `matches[*].residual`; 0 skipped |

pytest: no Python tests exist before phase 3.

## Files Changed

| File | Action |
|---|---|
| `lib/settings.ts` | UPDATED: `isAutoDecideEnabled`, `isAutoDecidePinnedByEnv`, `webWatchAutoDecide` |
| `lib/web-watch/queue.ts` | UPDATED: header, `restore` removed, `ScreenVerdict`, `applyVerdicts`, `AutoRejectRecord`, `residual` |
| `lib/web-watch/watch-all.ts` | UPDATED: no auto-accept in the sweep |
| `lib/web-watch/types.ts` | UPDATED: `WatchAllResult.autoAccepted` removed |
| `lib/web-watch/proposals.ts` | UPDATED: few-shot excludes `autoReject` |
| `lib/web-watch/triage.ts` | UPDATED: header comment (archive is final) |
| `lib/schemas.ts` | UPDATED: `restore` action removed |
| `lib/agent/thresholds.ts` | UPDATED: `webWatchAutoAcceptDailyMax` 20 |
| `lib/agent/retrieval/context/web-watch.ts` | UPDATED: reads the new gate; copy no longer says archives can be restored |
| `app/api/internal/web-watch-decide/route.ts` | CREATED |
| `app/api/internal/check-sources/route.ts` | UPDATED: no auto-accept |
| `app/api/internal/web-watch-triage/route.ts` | UPDATED: JSDoc |
| `app/api/web-watch/route.ts` | UPDATED: no restore; new gate; switch writes `webWatchAutoDecide` |
| `components/web-watch-review.tsx` | UPDATED: archived list read-only |
| `lib/data/chrome.generated.ts` | REGENERATED |
| `tests/web-watch-decide-route.test.ts` | CREATED (8 tests) |
| `tests/web-watch-auto-accept.test.ts`, `tests/settings-refresh.test.ts`, `tests/web-watch-auto-accept-route.test.ts`, `tests/web-watch-triage.test.ts` | UPDATED |

## Deviations from Plan
- **Switch order.** The plan put the stored `webWatchAutoDecide` before the `WEB_WATCH_AUTO_ACCEPT`
  env. That would let a stored flag override an operator's env kill-switch. Both env vars are read
  first, then the stored flags. Neither env var is set in prod (`docs/DEPLOY.md`), so prod behaviour
  is the same either way.
- **`isAutoAcceptEnabled` removed outright** instead of kept as a deprecated alias, because every
  caller moved in the same change.
- **`autoAccept` and `autoAcceptPending` removed.** Their tests now run through `applyVerdicts`
  (a helper in the test file posts an accept verdict for every pending item), so coverage of the
  eligibility rules, the cap and revert is kept.
- **Apply path reads the queue first.** `saveQueue` falls back to an empty queue on a failed read;
  the route now loads first so a GCS failure answers 500 before any write.
- `markers` are accepted by the route and type but not stored yet; phase 4 adds the `MarketEvent`
  field.

## Issues Encountered
- A Python `str.replace` on the archived list also matched the identical markup in
  `AutoAcceptedList` and dropped its error line and flex layout. Caught by the lint warning
  (`error` unused) and restored.
- `/code-review` (medium) found 2 issues, both fixed with tests:
  1. One accept whose stored proposal no longer validates threw inside `applyVerdicts` and sank
     the whole batch (all rejects lost, 500). It now goes to residual with the reason.
  2. An accept verdict on a reverted (`noAuto`) item got the reason "usulan belum memenuhi syarat";
     it now says the reviewer reverted it.

## Behaviour change to know before deploying
Deploying this phase alone stops all automatic accepts until the phase-3 screen posts verdicts.
The "Diterima otomatis" copy still says "Diterima oleh sapuan"; phase 4 rewrites the Pantau copy.

## Next Steps
- [x] Code review via `/code-review`
- [ ] Phase 2: `.claude/PRPs/plans/web-watch-deep-filter-2-figure-check.plan.md`
- No commit, no deploy (user rule).
