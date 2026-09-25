# Web-watch deep filter: plan

Status: agreed 2026-09-24 (grilling session, Q1–Q39). Not started. Phase 2 is held until the Gemini
key stops returning 403.

Runnable with ECC: the PRD is `.claude/PRPs/prds/web-watch-deep-filter.prd.md`, and Phase 1 is split
into four plans under `.claude/PRPs/plans/`. Run each in turn with `/prp-implement <plan>`. This
document stays the source of truth; the PRD and plans point back here.

This plan builds on `docs/PLAN-WEB-WATCH-TRIAGE.md` and changes one of its commitments. Triage
said nothing enters `accepted` without a human decision, and later auto-accept loosened that. This
plan goes further: the agents decide almost every item, and a person sees only the residual.

## Goal

Remove three kinds of news before they reach the engine, without adding LLM spend:

- **(b) rumor:** the actionable claim rests only on unnamed sources, "dikabarkan" or "disebut", or
  market talk, with no issuer statement, disclosure or named official on the record.
- **(c) misleading title**, subtypes `menyesatkan` and `memancing emosi` (ragebait): the title's
  claim is not supported by the body.
- **(d) figure contradiction:** a closing figure in the article disagrees with the recordings.

No source gets a trust exemption. An OJK, BI or ESDM text is checked like any other, and a
first-person issuer statement counts as confirmation because of what it says, not who published it.

## Decisions

| # | Decision |
| --- | --- |
| Pipeline | Triage (existing 4 rules), then (d) regex check, then **System One** (local NLI, free), then **System Two** (the existing Gemini proposal, already paid for), then a human residual. |
| When unsure | Escalate. Reject only when confident. This replaces triage's "when unsure, review". |
| Reject | Final. No restore for auto-rejects or for triage archives. Remove the restore route action and the Pantau button. |
| Accept | Needs a clean screen plus a verified proposal under the existing `isAutoAcceptable` rules. Auto-accepts keep their undo. |
| (b) rumor | Reject. |
| (c) misleading title | With an empty body: reject. With a substantive body: accept path, with a neutral title built from the body and a `misleadingTitle` marker. |
| (d) contradiction | Reject. Anything not cleanly checkable is "tidak dapat dicek" and carries no penalty. |
| Low band, failed verification | Reject ("relevansi rendah", "usulan gagal verifikasi"). |
| Residual | Both systems unsure, or they disagree: "Perlu keputusan" in Pantau. Every residual decision becomes a calibration label. |
| Undecided items | Retry each run up to `webWatchUndecidedMaxSweeps`, then reject "tidak dapat disaring". The timer does not run while the LLM is down. |
| Daily accept cap | Kept as a circuit breaker, raised from 5. |
| Kill switch | `autoDecideEnabled` replaces `autoAcceptEnabled`. It covers accept and reject. Read the old `webWatchAutoAccept` setting and `WEB_WATCH_AUTO_ACCEPT` env as fallbacks. |
| Few-shot | Auto decisions stay excluded (`fewShotExamples` already filters `auto`). `sourceHealth` still counts them. |
| Markers | `unconfirmed` and `misleadingTitle` travel with accepted events. The case view and the assistant say "belum dikonfirmasi resmi". |
| Engine | System One is `mDeBERTa-v3-base-xnli-multilingual-nli-2mil7`, ONNX int8 (338 MB), with no torch. Jev, free API tiers and a local decision model (von, Laya) were considered. Local NLI costs nothing per call and does not depend on Gemini. |
| NLI checks | Body supports title (premise body, hypothesis title). Text cites an official statement or a named document. Body is substantive. Relevance to each matched emiten (see W19). The hypothesis sentences live in one table next to `TRIAGE_RULES`, in id and en, picked by a new seed field `lang`. |
| Long bodies | Windows over **prose sentences only** (see W3). Take the max score per check, capped by `webWatchNliMaxWindows`. The winning window is stored as the evidence span. |
| Calibration | Temperature scaling on labels. Use a strict threshold until `webWatchCalibrationMinLabels` is reached. Record the provenance honestly: most labels today come from Claude, not a person (W17). |
| Gate | Hard: 0 human-dismissed items auto-accepted, and 0 golden-set clean items rejected as rumor or misleading. Reported, not gated: ECE, the false-reject list, residual share against `webWatchResidualMaxShare`. |
| LLM hold | Until the 403 is fixed, unsure items skip System Two and go to the residual. Nothing auto-rejects because of the outage. |

New thresholds in `lib/agent/thresholds.ts`, each with provenance: `webWatchDecideMinConfidence`,
`webWatchCalibrationMinLabels`, `webWatchNliMaxWindows`, `webWatchUndecidedMaxSweeps`,
`webWatchResidualMaxShare`, `webWatchPctTolerancePp`, `webWatchVolumeToleranceShare`, and a raised
`webWatchAutoAcceptDailyMax`.

## Wiring check against the code (2026-09-24)

Each item below was checked against the source or the live project. A **change** entry amends a
decision above.

- **W1 (change). Auto-accept runs before the screen.** `watchAll` drafts and then calls
  `autoAcceptPending` inside the 17:30 sweep, which is earlier than any NLI run. Move auto-accept
  into the new decide step. The sweep keeps triage, enqueue and drafting only.
- **W2 (change). Broken titles.** 8 of 50 pending items carry a URL-derived title: BI `sp
  2819226.aspx`, GAPKI slugs such as `produksi-cpo-cukup-untuk-b50-…`. The real headline is the
  first line of the body. Fix title derivation first. Until then, skip (c) when the title came from
  the URL, because a title-versus-body check on a filename means nothing.
- **W3 (change). Page chrome in bodies.** CNBC bodies begin with CSS class fragments and menus,
  and BI bodies with several thousand characters of navigation. Build NLI windows from sentences
  that pass the same prose test triage already uses (`proseChars`, `webWatchProseSentenceMinWords`),
  never from raw body offsets.
- **W4. Content duplicates.** Pending #21 and #32 are the same ESDM article republished with a typo
  in the title, under two ids. The `duplicate` rule missed this. **Fixed:** `duplicate` now also
  archives a candidate whose whole sentences overlap an earlier item's by at least
  `webWatchDuplicateSentenceShare`.
- **W5 (change). Timing for (d).** The recordings are compiled into the image (`DATA_AS_OF`). The
  data refresh runs 17:30, 19:30 and 21:30 WIB. The web-watch sweep runs at 17:30. Schedule the
  decide run after the last refresh attempt (22:30 WIB, Asia/Jakarta), and let the service judge
  (d), since the service holds the recordings of the revision it serves. Figures dated after
  `DATA_AS_OF` are uncheckable.
- **W6 (change). Only closing figures.** Real articles mix closes with session, opening, intraday
  and range figures. Compare only a close ("ditutup", "penutupan", "parkir") on one resolved date.
  Golden cases: sindonews quotes a session-I level (6,429.88) on a day whose recorded close differs,
  and a BRI Danareksa note gives prices for "15–21 September" that match no single close. Both must
  come out uncheckable, not contradicted.
- **W7 (change). IHSG is recorded.** `priceSeries[*].ihsg` holds the index close per date. Market
  wraps are the most common figure-bearing items, so (d) covers the IHSG series as well as the 18
  symbols' `close`, `volume` and derived percent change. Real positive: beritadua reports the 22 Sep
  close as 7.583 against a recorded 6277.
- **W8. Number formats.** Both `6.277,04` and `6,429.88` occur, and one site strips separators
  (`639234`, `anjlok 781 persen`). Parse both locales. Anything implausible or ambiguous is
  uncheckable, because a final reject must never rest on a parse guess.
- **W9. Symbol attachment.** A figure counts only when a registry symbol code, or the IHSG, is in
  the same sentence. The rancakmedia article shows this is enough: "BMRI terkoreksi 0,95% menjadi
  Rp 4.160" matches the recording exactly.
- **W10 (change). No Cloud Run Job infrastructure exists** (`gcloud run jobs list`: 0). Run NLI as
  a Cloud Build config, `cloudbuild-screen.yaml`. This is the same Scheduler → Cloud Build pattern
  as `cloudbuild-refresh.yaml`, on the default machine type (the refresh uses `E2_HIGHCPU_8`,
  which is outside the free minutes). Python with `onnxruntime`, `tokenizers` and `numpy`. The
  model is fetched per run or cached in the bucket. `INTERNAL_CRON_SECRET` comes through
  `availableSecrets`, so the Cloud Build service account needs `secretAccessor` on that secret.
- **W11 (change). One writer.** The build does not write `queue.json` and does not need a
  `screen.json`. It reads the queue, then POSTs its verdicts to `/api/internal/web-watch-decide`,
  which applies them through the generation-guarded `saveQueue`. Auth: the `checkInternalAuth`
  bearer, as on `web-watch-triage`.
- **W12. System Two already ran.** Drafting happens in the sweep for pending items under
  `webWatchSweepLlmCalls`, so the decide step finds any proposal already stored. There are no
  extra calls and no reordering. Optional later saving: draft only the items System One left unsure.
- **W13. Restore removal touches** `restore()` in `lib/web-watch/queue.ts`, the `restore` action in
  `app/api/web-watch/route.ts`, and `ArchivedList` in `components/web-watch-review.tsx`. Keep
  reading the `restored` section in `normalizeQueue` for old files, and stop writing it.
- **W14. Settings.** `isAutoAcceptEnabled` in `lib/settings.ts` reads `WEB_WATCH_AUTO_ACCEPT`, then
  `webWatchAutoAccept`. The new switch keeps both as fallbacks.
- **W15. Copy.** New Pantau copy ("Perlu keputusan", "Diputuskan otomatis", check labels) means
  `npm run chrome:build` and an update to the Pantau retrieval bundle.
- **W16. The engine reads accepted events** through the queue overlay (`getOverlayEvents`,
  `lib/data/providers.ts`). Markers on `MarketEvent` reach the case view and the assistant with no
  new path. `MarketEvent` has no field for them yet, so add an optional one.
- **W17. Human labels are thin.** The queue holds 26 human decisions: 8 accepts and 18 dismisses.
  18 are BMKG housekeeping, and only about 5 concern news. The labels this plan calibrates on
  today are Claude's (see Labels). Calibration provenance must say so until a person confirms them.
- **W18. Alias false positives drive most rejects.** In the 50 pending items: "bukit" → PTBA
  (BUVA), "rakyat indonesia" → BBRI (a sugar farmers' association), "central" → BBCA (Siloam,
  Vietnam), "mandiri" → BMRI (an Australian developer), "timah" → TINS (an opening-bell wrap).
  **Fixed** in triage (`nameMatcher`): a name counts only when written as a name.
  On the production queue, 7 of 50 pending items are now archived as `no-watched-match`, and no
  accepted item changes. One of the 7 is a real loss: the ICOMEX tin article (#45) names PT Timah
  only in a photo credit, so the commodity-to-TINS link has to come from the W19 relevance check.
- **W19 (change). The residual floods during the LLM hold.** 37 of 50 pending items have no
  proposal, mostly source-declared ESDM, GAPKI and BI items that match 3–8 emiten each. Without
  System Two, they all fall to the residual. Add a System One relevance check per matched emiten.
  The hypothesis is built from the registry name, for example that the news affects the business
  of the company named in `companies`, never a typed name. Confident "not relevant" for every
  matched emiten is a reject.

## Labels

Written 2026-09-24 by Claude at the user's request. **No person has reviewed them.**

- `tests/fixtures/web-watch-pending-labels.json`: the 50 pending items. 10 accept, 40 reject,
  each with a reason. Low confidence is marked on the market wraps, the forecast item and three
  GAPKI or ESDM items.
- `tests/fixtures/web-watch-golden.json`: 20 text cases and 7 figure cases, from real articles
  fetched through Exa and Jina. It stores URLs and labels only, no article text. The harness
  fetches the text into a gitignored cache and skips any page it cannot fetch. Seven sites refused
  the fetch today (Cloudflare challenges or 520 errors) and are not in the set.

The set is lopsided. It has 7 rumor positives, but only 2 misleading-title positives (one of them
low confidence) and 1 figure contradiction. The watched feeds produced no rumors or clickbait in
this window, so positives had to come from outside sources. Treat the title check's gate as weak
until the residual adds labeled positives.

## Phases

**Phase 0 (review):** A person confirms or overturns the provisional labels, starting with the
low-confidence ones.

**Phase 1 (now, no LLM):**

1. Final-reject plumbing and removal of restore (W13). **Built** (PRP phase 1).
2. `autoDecideEnabled` (W14), auto-accept moved to the decide step (W1). **Built** (PRP phase 1).
3. `/api/internal/web-watch-decide` (W11). **Built** (PRP phase 1).
4. Title derivation fix (W2) and prose-sentence windowing (W3). **Built** (PRP phase 2).
5. (d) regex check with IHSG coverage, closes only, both number locales (W5–W9). **Built** (PRP phase 2).
6. Seed `lang`, the hypothesis table, the new thresholds. **Built** (PRP phase 3).
7. `cloudbuild-screen.yaml` and its Scheduler job at 22:30 WIB (W10). **Config written** (PRP phase 3); the Scheduler job, IAM and source snapshot wait for a person.
8. Replay and calibration harness over both fixtures. **Built** (PRP phase 3). First replay (2026-09-25): hard gate green; on the 50 pending items the screen rejects 1 (relevance), accepts 0, and leaves 49 to the residual (98%, against a 30% target). Relevance is the main blocker (45 items unsure). See `.claude/PRPs/reports/web-watch-deep-filter-3-nli-screen-report.md`.
9. Pantau "Perlu keputusan" and "Diputuskan otomatis" (W15), `chrome:build`, retrieval bundle. **Built** (PRP phase 4). A person's decision on a residual item is stored with `fromResidual: true`; markers reach the causal chain and the event-impact answer as labels (W16). The neutral title for `misleadingTitle` items waits for System Two.
10. `docs/DEPLOY.md`. **Written** (PRP phase 4, §10b), as commands still to run; nothing in it exists in the live project yet.

**Phase 2 (after the 403 is fixed):** System Two in the decide step, the undecided timer, and
optional LLM figure extraction for (d).

**Deploy:** ask the model and provider at deploy time. The first decide run on the current pending
items is a dry-run report, applied only on approval, because its rejects are final.
