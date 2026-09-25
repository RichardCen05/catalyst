# Implementation Report: Web-watch deep filter, phase 4 (Pantau residual, markers, deploy docs)

## Summary
Pantau now separates what the screen left undecided from what it decided alone. Accepted items
carry their doubt markers into the engine.

- **Perlu keputusan.** Pending items with a residual mark are listed in their own section. Each
  card shows the check the screen was unsure about ("Penyaring belum yakin: …"). Items not yet
  screened stay in a separate "Menunggu penyaringan" section.
- **Diputuskan otomatis.** One collapsible block holds two lists:
  - "Diterima otomatis": auto accepts, each with the existing Batalkan (undo) button;
  - "Ditolak otomatis": auto rejects, each with check, time, source link, span and reason, and no
    button, because an auto reject is final.
- **Calibration labels.** A human accept or dismiss of a residual item is saved with
  `fromResidual: true`. These decisions are the labels a later calibration reads (W17).
- **Markers.** `unconfirmed` and `misleadingTitle` are stored on `MarketEvent.markers` when an item
  is accepted. They appear:
  - as pills on the accepted event in Pantau;
  - in the causal chain and market causal map node detail;
  - in the event-impact answer ("Penanda: Belum dikonfirmasi resmi.").
- **Retrieval.** The `view:pantau` bundle states the residual count, the auto-reject count and a
  count per marker, so the assistant can answer questions about the new sections.
- **Deploy docs.** `docs/DEPLOY.md` §10b documents the nightly screen job step by step. None of it
  has been run: no Scheduler job, IAM change, `gcloud builds submit` or bucket write was made.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Medium | Medium |
| Files Changed | 9 | 12 updated, 2 created (plus 3 test files) |
| New thresholds | 0 | 0 |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Markers on `MarketEvent` and the accept flow | Complete | `EVENT_MARKERS`, `EVENT_MARKER_LABEL`; the undo copy stays unmarked |
| 2 | Residual and auto-decided lists (route and UI) | Complete | `GET` returns `residual` and `autoRejected`; `POST` labels residual decisions |
| 3 | Markers in the case view and assistant | Complete | Shared `EventMarkers` component; engine source node and event-impact header |
| 4 | Retrieval bundle and chrome registry | Complete | `npm run chrome:build` regenerated 130 blocks |
| 5 | `docs/DEPLOY.md` screen-job section | Complete | §10b, marked "to run — not created yet" |

## Files Changed

| File | Action |
|---|---|
| `lib/types.ts` | UPDATED: `EVENT_MARKERS`, `EventMarker`, `EVENT_MARKER_LABEL`; `markers` on `MarketEvent` and `CausalNode` |
| `lib/web-watch/queue.ts` | UPDATED: `fromResidual`, `withResidualLabel`, markers in `acceptOnProposal`, title and url on `AutoRejectRecord`, `residual` and `autoRejected` counts, `withoutResidual` in `revertAutoAccept` |
| `app/api/web-watch/route.ts` | UPDATED: `GET` residual and auto-reject lists; `POST` accept and decide wrapped in `withResidualLabel` |
| `components/web-watch-review.tsx` | UPDATED: Perlu keputusan / Menunggu penyaringan split, `AutoDecidedList`, residual reason on cards, switch copy covers rejects |
| `components/event-markers.tsx` | CREATED: shared marker pills |
| `components/causal-chain.tsx`, `components/market-causal-map.tsx` | UPDATED: markers in node detail |
| `lib/agent/engine.ts` | UPDATED: markers on the source node; marker note in the event-impact answer |
| `lib/agent/retrieval/context/web-watch.ts` | UPDATED: residual, auto-reject and marker counts |
| `lib/data/chrome.generated.ts` | REGENERATED |
| `scripts/refresh_job_body.py` | UPDATED: `--config`, `--snapshot-object`, `--sub KEY=VALUE` |
| `docs/DEPLOY.md` | UPDATED: §10b nightly web-watch screen |
| `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` | UPDATED: items 9 and 10 marked |
| `tests/web-watch-auto-accept.test.ts` | UPDATED: residual labels, markers, counts; revert drops the residual mark |
| `tests/web-watch-auto-accept-route.test.ts` | UPDATED: `GET` lists; `POST` dismiss saves `fromResidual` |
| `tests/web-watch-markers.test.ts` | CREATED: causal node, event-impact answer, Pantau bundle |

## Deviations from Plan

- **`AutoDecidedList` replaces `AutoAcceptedList`.** One block holds both auto lists, so accepts
  and rejects are read side by side. Each list has its own empty state.
- **Markers in node detail, not a separate event list.** The case view has no separate list of
  events. The source event is a node in the causal chain and the market causal map, so the marker
  appears in that node's detail panel.
- **`refresh_job_body.py` generalized instead of a second script.** The screen job uses the same
  inline job body with a different config and snapshot. With no options, the output is
  byte-identical to HEAD (checked).
- **`AutoRejectRecord` gains `title` and `url`.** The auto-reject list must show what was rejected
  after the pending event is gone. `applyVerdicts` copies both from the pending event (title cut to
  300 characters, url from the first citation).
- **"Menunggu penyaringan" only when non-empty.** Before the screen job runs, every pending item is
  unscreened, and an empty section would add noise once it runs.

## Code review (`/code-review`, 1 finding, fixed)

- `revertAutoAccept` restored the item to pending with its old residual mark. The mark described a
  screen run from before the accept. A later human dismiss would then be saved with
  `fromResidual: true`, which is a wrong calibration label. The fix drops the residual mark on revert
  (`withoutResidual`). The next screen run re-marks the item if it is still unsure. A test covers
  the case. Items already accepted in prod are unaffected: prod has no residual marks yet.

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | Pass | `tsc --noEmit` 0 errors; `eslint .` 0 errors, 23 warnings (pre-existing) |
| Unit Tests | Pass | 6 + 2 queue tests, 2 route tests, 3 marker tests |
| Full vitest | Pass | exit 0: 88 files passed, 2 skipped; 859 tests passed, 3 skipped |
| Build | Pass | `npm run build` exit 0 |
| pytest | Pass | 23 passed (scratchpad venv) |
| Chrome registry | Pass | `npm run chrome:build` exit 0; `tests/chrome-registry.test.ts` green |
| Browser | Pass | Pantau with a seeded queue at 1280 px and 375 px: all sections render, no horizontal scroll |

The browser check stubbed `window.fetch` with a seeded queue. The "Failed to fetch RSC payload"
console errors came from the stub, not the app.

## Next Steps

- [ ] A person reviews `tests/fixtures/web-watch-pending-labels.json` (labeled by Claude, W17).
      Refit `scripts/screen/calibration.json` and re-run the replay.
- [ ] Run the `docs/DEPLOY.md` §10b commands (deploy, IAM, snapshot, Scheduler dry-run, switch to
      apply).
- [ ] Phase 5 (System Two) stays held until the Gemini 403 is fixed.
