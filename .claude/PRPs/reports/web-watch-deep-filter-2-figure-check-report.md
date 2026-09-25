# Implementation Report: Web-watch deep filter, phase 2 (titles, prose windows, figure check)

## Summary
Three deterministic pieces for the screen, all pure TypeScript.

1. **Titles.** A listing link with no text is flagged (`FeedEntry.titleFromUrl`). `buildCandidate`
   then uses the first prose sentence of the body as the headline and records `titleSource`. The
   candidate id is unchanged.
2. **Prose windows.** `proseWindows` in `lib/web-watch/windows.ts` builds NLI windows from whole
   prose sentences only.
3. **Figure check (d).** `checkFigures` in `lib/web-watch/figures.ts` compares closing, change and
   volume figures for one registry symbol or the IHSG with `priceSeries`.

The decide route runs the figure check on every pending item. A contradicted item becomes a
`check: "figure"` reject that overrides any posted verdict. The dry-run answer carries a `figures`
block, and `GET` carries `titleSource`.

## Assessment vs Reality

| Metric | Predicted (Plan) | Actual |
|---|---|---|
| Complexity | Large | Large |
| Confidence | not stated | High for "never a false contradiction" on the data at hand; the (d) gate stays weak (1 positive label) |
| Files Changed | 8 | 8 source (2 new) + 3 test files (2 new) + `.gitignore` |

## Tasks Completed

| # | Task | Status | Notes |
|---|---|---|---|
| 1 | Flag URL-derived titles | Complete | `titleSource` sits on a web-watch type (`WebWatchCandidate`), not on `MarketEvent` |
| 2 | Prose windows | Complete | Deviated: the shared sentence splitter was fixed (see Deviations) |
| 3 | Number parsing | Complete | `parseIdNumber`, both locales; ambiguous shapes return null |
| 4 | Close-figure extraction | Complete | Deviated: adds "firm or weak" figures and paragraph context (see Deviations) |
| 5 | `checkFigures` verdict | Complete | Plausibility bound comes from the series range × `webWatchFigurePlausibleFactor` |
| 6 | Wire (d) into the decide route | Complete | Figure rejects are recomputed inside the guarded write against the queue as it stands |

## Thresholds added (all in `lib/agent/thresholds.ts`, three places each)

| Key | Value | Provenance | Why |
|---|---|---|---|
| `webWatchNliWindowChars` | 1200 | convention | About 300 mDeBERTa tokens, under the 512-token limit together with a hypothesis |
| `webWatchNliMaxWindows` | 8 | convention | 9,600 prose characters, longer than nearly every article; bounds Cloud Build time |
| `webWatchPriceToleranceShare` | 0.005 | guess | Rounding never trips it; a made-up level (7.583 against a recorded 6.277) is far outside it |
| `webWatchPctTolerancePp` | 0.05 | guess | Articles round to 2 decimals, and the IHSG is recorded as a whole number (about ±0.02 pp) |
| `webWatchVolumeToleranceShare` | 0.05 | guess | A lots-versus-shares slip (×100) is far outside it |
| `webWatchFigurePlausibleFactor` | 2 | guess | A figure outside the series' recorded range ÷/× 2 is treated as a misread separator and is uncheckable |

## Validation Results

| Level | Status | Notes |
|---|---|---|
| Static Analysis | Pass | `tsc --noEmit` 0 errors; `eslint .` 0 errors, 23 warnings (all existed before) |
| Unit Tests | Pass | `web-watch-figures` (38), `web-watch-windows` (9), 2 new decide-route tests |
| Full vitest | Pass | exit 0: 86 files passed, 1 skipped; 836 tests passed, 1 skipped |
| Build | Pass | `npm run build` exit 0 |
| Golden figure cases | Pass | All 7 match their labels: c06 contradicted; c17d, c15d, c03d consistent; c14d, c20d, c11d uncheckable |
| Prod-queue copy | Pass | pending 50: 0 contradicted, 4 consistent, 46 uncheckable. accepted 13: 0 contradicted, 0 consistent, 13 uncheckable (target: 0 contradicted among accepted) |
| Triage regression | Pass | Over 182 prod-copy events, the splitter change moved no verdict; one archived item changed rule (duplicate → no-watched-match), still archived |

Golden article text is fetched through `r.jina.ai` into `tests/fixtures/.cache/`, which is
gitignored. A case skips when its file is missing, or when its claim date is no longer inside the
recordings.

## Files Changed

| File | Action |
|---|---|
| `lib/web-watch/figures.ts` | CREATED: `parseIdNumber`, `extractCloseFigures`, `checkFigures`, term constants |
| `lib/web-watch/windows.ts` | CREATED: `proseWindows` |
| `lib/web-watch/triage.ts` | UPDATED: digit-aware `SENTENCE`; exports `sentenceSpans`, `sentences`, `codePattern` |
| `lib/web-watch/fetching.ts` | UPDATED: `FeedEntry.titleFromUrl`; `titleFromUrl` exported |
| `lib/web-watch/check.ts` | UPDATED: `headlineFor`, `buildCandidate(…, titleIsUrl)` returns `WebWatchCandidate` |
| `lib/web-watch/types.ts` | UPDATED: `TitleSource`, `WebWatchCandidate` |
| `app/api/internal/web-watch-decide/route.ts` | UPDATED: `withFigureCheck`, `figures` report, `titleSource` in `GET` |
| `lib/agent/thresholds.ts` | UPDATED: 6 keys |
| `.gitignore` | UPDATED: `tests/fixtures/.cache/` |
| `tests/web-watch-figures.test.ts`, `tests/web-watch-windows.test.ts` | CREATED |
| `tests/web-watch-decide-route.test.ts` | UPDATED: figure-override and `titleSource` tests |

## Deviations from Plan

- **Sentence splitter fixed, not only exported.** Triage's regex ended a sentence at any dot, so
  "BBRI … ke level Rp 3.180 per saham." survived only as "180 per saham." That dropped everything
  before the number, ticker included. That was a live triage defect too: `matchText` lost ticker
  mentions. The dot now ends a sentence only when it is not followed by a digit. The prod-copy diff
  is recorded above.
- **Firm and weak figures.** A sentence-only rule could not reach two golden labels:
  - c06 states the level in the sentence after the one naming the IHSG, the close and the date.
  - c17d has no close verb at all.

  So a figure takes its date from the sentence, then the paragraph, then the article; its target
  from its clause, or from an earlier clause in the same sentence. Only a *firm* figure can
  contradict. A firm figure has:
  - a target named in its own clause;
  - a close word whose date is the one the figure uses;
  - a date from its own sentence or paragraph;
  - no other figure of the same kind in its clause;
  - for a percent, a word of movement.

  A weak figure can confirm a recording, and a mismatch on one is reported as uncheckable.
- **More "not a close" words than the plan listed**: forecasts ("target", "berpotensi"), company
  and macro figures ("YoY", "pendapatan", "BI-Rate"). The prod copy showed "Pendapatan TINS
  melonjak 147% YoY" read as a TINS move. Every such word makes the sentence uncheckable, never
  contradicted.
- **The "akhir pekan" fallback to the previous trading day was not built.** With no exact row, the
  figure is uncheckable. This is safer, and no golden case needs the fallback.
- **Old URL titles.** `GET` also reports `titleSource: "url"` for stored items with no field, when
  the title equals the address tail. No stored item is rewritten.

## Code review (`/code-review`, 2 findings, both fixed with tests)

1. `figures.ts`: a close word from an earlier sentence made a figure firm even when that figure's
   sentence named another day. Now a carried close word applies only with its carried date.
2. `figures.ts`: "kemarin" next to an explicit date was ignored, and two figures of one kind in a
   clause ("naik 0,5% setelah turun 1,2%") could both be firm. Now "kemarin" makes the sentence
   two-dated (uncheckable), "hari ini" does so only when a trusted publish date disagrees, and a
   clause with two figures of one kind has no firm figure of that kind.

## Issues Encountered
None blocking. `"hari ini"` resolves only when the source gave a publish date
(`publishedAt !== asOf`). A listing item stamped with fetch time never pins "today".

## Next Steps
- [ ] Phase 3: System One NLI screen (`proseWindows`, `titleSource` feed into it).
- [ ] A person reviews the golden figure labels; with 1 positive, the (d) gate is weak.
