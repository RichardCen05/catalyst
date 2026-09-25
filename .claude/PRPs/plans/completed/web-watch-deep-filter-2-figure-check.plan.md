# Plan: Web-watch deep filter, phase 2: titles, prose windows, figure check

## Summary
Three deterministic pieces the screen needs, all pure TypeScript and free. (1) A real headline for
items whose title came from the URL. (2) Prose-sentence windows over the body, which phase 3 feeds
to NLI. (3) The (d) figure check: closing figures for a registry symbol or the IHSG compared with
the recorded series. It returns contradicted, consistent or uncheckable.

## User Story
As the Catalyst operator, I want news whose closing figures contradict the recordings rejected,
and news with a filename for a title checked on its real headline. That way the engine never reads
a wrong number, and the title check never judges a slug.

## Problem → Solution
8 of 50 pending items carry a URL-slug title, bodies start with page chrome, and no code compares
article figures with `priceSeries`. Afterwards: listing items get the first prose line as the
headline and a `titleFromUrl` flag, windows skip chrome, and `checkFigures(event)` returns
per-figure verdicts with the recorded value beside each.

## Metadata
- **Complexity**: Large
- **Source PRD**: `.claude/PRPs/prds/web-watch-deep-filter.prd.md`
- **PRD Phase**: 2, Titles, prose windows, figure check
- **Design source**: `docs/PLAN-WEB-WATCH-DEEP-FILTER.md` (W2, W3, W5–W9) and the figure cases in
  `tests/fixtures/web-watch-golden.json` (`figureRule`)
- **Depends on**: phase 1, whose `ScreenVerdict` gives (d) a check name and span
- **Estimated Files**: 8

---

## UX Design
N/A: internal. Rejected items show the reason string in the archived list, which exists already.

---

## Mandatory Reading

| Priority | File | Lines | Why |
|---|---|---|---|
| P0 | `lib/web-watch/check.ts` | 76-110 | `buildCandidate` headline rule |
| P0 | `lib/web-watch/fetching.ts` | 349-392 | `extractLinks`, `titleFromUrl` |
| P0 | `lib/web-watch/triage.ts` | 95-150 | `sentences`, `proseChars`, `sentenceKeys`, `matchText` |
| P0 | `lib/types.ts` | 107-112, 369-382 | `PricePoint`, `MarketEvent` |
| P0 | `lib/data/fixtures.ts` | 1-60, 220-240 | `priceSeries`, `DATA_AS_OF` re-exports, symbol registry |
| P0 | `tests/fixtures/web-watch-golden.json` | all | Figure cases and `figureRule` text |
| P1 | `lib/agent/query.ts` | `SYMBOL_ALIASES`, `LEGAL_TOKENS`, `registryNameTokens` | Symbol detection; do not re-type codes |
| P1 | `lib/agent/thresholds.ts` | THRESHOLD triple | New tolerances |
| P2 | `tests/web-watch-check.test.ts`, `tests/web-watch-fetching.test.ts` | all | Test style |

---

## Patterns to Mirror

### PURE_HELPER_IN_TRIAGE_STYLE
// SOURCE: lib/web-watch/triage.ts:123-140
```ts
function sentences(text: string, minWords = 1): string[] { ... }
export function proseChars(text: string, minWords: number): number { ... }
```
Small pure functions, thresholds passed in or read from `resolveThresholds()` once per call.

### SYMBOL_CODES_FROM_REGISTRY
Symbol codes come from `Object.keys(priceSeries)` / `listKnownSymbols()` (`lib/web-watch/queue.ts:186`)
and are matched with `codePattern` (capitals only, word-bounded) as triage does. Never a literal list.

### THRESHOLD
Three places per key in `lib/agent/thresholds.ts`: default + Indonesian JSDoc, provenance, resolver.

---

## Files to Change

| File | Action | Justification |
|---|---|---|
| `lib/web-watch/fetching.ts` | UPDATE | `FeedEntry.titleFromUrl?: true` when the label was empty |
| `lib/web-watch/check.ts` | UPDATE | Headline from the first prose sentence when the title was URL-derived; carry the flag |
| `lib/web-watch/types.ts` or `lib/types.ts` | UPDATE | Optional `titleSource?: "feed" \| "url" \| "body" \| "json"` on the candidate (not on the engine event if avoidable) |
| `lib/web-watch/windows.ts` | CREATE | `proseWindows(body, maxWindows, minWords)` |
| `lib/web-watch/figures.ts` | CREATE | Number parsing, close-figure extraction, `checkFigures` |
| `lib/agent/thresholds.ts` | UPDATE | `webWatchPctTolerancePp`, `webWatchVolumeToleranceShare`, `webWatchNliMaxWindows` (used here by windows), `webWatchPriceToleranceShare` if a close needs one |
| `tests/web-watch-figures.test.ts` | CREATE | Parser, extractor, verdict tests incl. the golden figure cases |
| `tests/web-watch-windows.test.ts` | CREATE | Chrome-skipping, window cap |

## NOT Building

- NLI or any model call (phase 3; LLM figure extraction is phase 5).
- Figures without a registry symbol or IHSG in the same sentence (W9).
- Session, opening, intraday, range or multi-day figures (W6): uncheckable, never contradicted.
- Re-titling items already in the production queue (a backfill is a separate decision).

---

## Step-by-Step Tasks

### Task 1: Flag URL-derived titles (W2)
- **ACTION**: In `extractLinks`, set `titleFromUrl: true` on entries where `label` was empty.
  Thread it through `checkSource` to `buildCandidate`.
- **IMPLEMENT**: In `buildCandidate`, when the title is URL-derived, use the first body sentence
  that passes the prose test (`webWatchProseSentenceMinWords`), capped at 200 chars, as the headline.
  Record `titleSource`. When no sentence passes, keep the slug and `titleSource: "url"`.
- **GOTCHA**: The candidate id is `candidateId(state.id, key, textSha(text))`. It must not change,
  or already-decided items come back. Change only the title.
- **VALIDATE**: test: BI listing entry `sp_2819226.aspx` with a body whose first prose sentence is
  the headline; GAPKI slug `produksi-cpo-cukup-untuk-b50-…`.

### Task 2: Prose windows (W3)
- **ACTION**: Create `lib/web-watch/windows.ts` exporting
  `proseWindows(body: string, opts: { maxWindows: number; minWords: number; maxChars: number }): Array<{ text: string; start: number }>`.
- **IMPLEMENT**: Split with the same sentence rule triage uses. Export `sentences` from triage
  instead of copying it. Keep only sentences with at least `minWords` words. Pack consecutive kept
  sentences into windows up to `maxChars`, where 1,200 chars is about 300 mDeBERTa tokens; add
  `webWatchNliWindowChars`. Return at most `maxWindows` windows, first ones first. Store `start` so
  phase 3 can quote the evidence span.
- **GOTCHA**: CNBC bodies open with CSS class fragments and BI bodies with navigation lists. Those
  fail the word-count test, so they must never start a window. Add a test with a real-looking
  chrome prefix.
- **VALIDATE**: `tests/web-watch-windows.test.ts`.

### Task 3: Number parsing (W8)
- **ACTION**: In `lib/web-watch/figures.ts`, add `parseIdNumber(raw: string): number | null`.
- **IMPLEMENT**: Accept `6.277,04` (id) and `6,429.88` (en). A lone separator with exactly 3
  trailing digits is a thousands group. Anything else ambiguous returns `null`. Plain `639234` is a
  number. Reject implausible magnitudes against the recorded range of the target series, e.g. an
  IHSG level outside the series' min/max ×/÷ 2, by returning uncheckable, not contradicted.
  Percent: `0,95%`, `0.95 persen`.
- **GOTCHA**: "anjlok 781 persen" is a stripped-separator artefact. The plausibility bound must make
  it uncheckable. A final reject must never rest on a parse guess.
- **VALIDATE**: table test over every form in the golden figure cases.

### Task 4: Close-figure extraction (W6, W7, W9)
- **ACTION**: Add `extractCloseFigures(event: MarketEvent, nowIso: string): CloseFigure[]`.
- **IMPLEMENT**: Per prose sentence (Task 2 split), a figure counts only when all of these hold:
  - A registry symbol code (capitals, word-bounded) or the IHSG ("IHSG", "Indeks Harga Saham
    Gabungan") is in the same sentence. The IHSG words are structural, like `LEGAL_TOKENS`; keep
    them in one exported constant beside the check, not per call site.
  - A close verb is in the same sentence: "ditutup", "penutupan", "parkir", "closing". The verbs
    live in one exported constant.
  - The sentence resolves to one date: an explicit date, or "hari ini"/"kemarin" relative to
    `event.publishedAt` in Asia/Jakarta.
  - Any "sesi I", "sesi 1", "pembukaan", "dibuka", "intraday", a range ("15–21 September"),
    "sepekan" or "sepanjang" in the sentence makes it uncheckable (W6).
  Output: `{ target: SymbolCode | "IHSG"; kind: "close" | "pct" | "volume"; value; date; span }`.
- **GOTCHA**: Weekends and holidays have no recorded row. Use the last trading day on or before the
  date only when the article says "akhir pekan" or equivalent. Otherwise, with no exact row, the
  figure is uncheckable.
- **VALIDATE**: golden cases: sindonews session-I 6,429.88 is uncheckable, BRI Danareksa
  "15–21 September" is uncheckable, rancakmedia "BMRI terkoreksi 0,95% menjadi Rp 4.160" is
  consistent, beritadua 22 Sep close 7.583 against recorded 6277 is contradicted.

### Task 5: `checkFigures` verdict (W5)
- **ACTION**: Add `checkFigures(event, series = priceSeries, asOf = DATA_AS_OF): FigureCheck`.
- **IMPLEMENT**: Per figure:
  - Date after `asOf`: uncheckable, "setelah data rekaman".
  - No recorded row: uncheckable.
  - `close`: contradicted when `|value - recorded| / recorded > webWatchPriceToleranceShare`.
    Provenance "guess"; start at 0.005 so rounding in a headline never trips it.
  - `pct`: compute from the recorded close and the previous row. Contradicted when
    `|value - recorded| > webWatchPctTolerancePp`.
  - `volume`: contradicted when outside `webWatchVolumeToleranceShare`. Lots vs shares:
    "lot" × 100. With no unit word, the volume is uncheckable.
  - IHSG uses `priceSeries[anySymbol][i].ihsg` for the date. Every symbol carries the same value;
    assert that in a test so a refresh that breaks it fails loudly.
  Result: `{ status: "contradicted" | "consistent" | "uncheckable"; figures: Array<{ ..., recorded?: number, reason: string }> }`.
  Status is contradicted if any figure is, consistent if at least one is and none contradict,
  otherwise uncheckable. The reason string quotes both numbers from the data, with no literal
  numbers in code.
- **GOTCHA**: `DATA_AS_OF` is compiled into the image. Phase 3 runs the check in the service, not in
  Cloud Build, so the service's recordings are the ones compared (W5). Keep `checkFigures` pure.
  The decide route calls it for every pending item and turns "contradicted" into a reject verdict
  with `check: "figure"`.
- **VALIDATE**: unit tests plus the golden figure cases.

### Task 6: Wire (d) into the decide route
- **ACTION**: In `app/api/internal/web-watch-decide/route.ts` (phase 1), before applying posted
  verdicts, run `checkFigures` on each pending item. A contradicted item becomes
  `{ verdict: "reject", check: "figure", span, reason }` and overrides any posted accept.
- **IMPLEMENT**: Report figure results in the dry-run response as a separate `figures` block.
  Add `titleSource` to the `GET` payload so phase 3 skips the title check on `"url"` (W2).
- **VALIDATE**: route test: a contradicted item is rejected even when the posted verdict is accept.

---

## Testing Strategy

### Unit Tests

| Test | Input | Expected Output | Edge Case? |
|---|---|---|---|
| id locale | `6.277,04` | 6277.04 | |
| en locale | `6,429.88` | 6429.88 | |
| ambiguous | `1.234` without context | 1234 only when the target range makes it plausible, else null | yes |
| stripped | `anjlok 781 persen` | uncheckable | yes |
| session I | sindonews golden | uncheckable | yes |
| range | BRI Danareksa golden | uncheckable | yes |
| consistent | rancakmedia BMRI golden | consistent | |
| contradicted | beritadua IHSG golden | contradicted, reason names 7583 and 6277 | |
| after asOf | close dated after `DATA_AS_OF` | uncheckable | yes |
| no symbol | figure with no code or IHSG in sentence | ignored | |
| URL title | BI `sp_…aspx` listing item | headline from body, `titleSource: "body"` | |
| id stable | same item before/after Task 1 | same candidate id | yes |
| windows | chrome prefix + 3 prose sentences | window starts at the first prose sentence | |

Golden figure cases need article text. The harness fetches through Jina into a gitignored cache
(`tests/fixtures/.cache/`, add it to `.gitignore`) and `it.skip`s a case whose page it cannot fetch.
Never commit article text.

### Edge Cases Checklist
- [ ] Empty body
- [ ] Body at `BODY_CAP`
- [ ] Symbol code inside another word (word boundary)
- [ ] Two symbols in one sentence (figure attaches to neither: uncheckable)
- [ ] Negative percent ("-0,95%", "turun 0,95%")

---

## Validation Commands

### Static Analysis
```bash
npm run typecheck
```
EXPECT: Zero type errors
```bash
npx eslint lib/web-watch tests/web-watch-figures.test.ts tests/web-watch-windows.test.ts
```
EXPECT: Exit 0

### Unit Tests
```bash
rtk proxy npx vitest run tests/web-watch-figures.test.ts tests/web-watch-windows.test.ts tests/web-watch-check.test.ts tests/web-watch-fetching.test.ts --reporter=dot
```
EXPECT: All pass

### Full Test Suite
```bash
rtk proxy npx vitest run --exclude '**/zz-live*' --reporter=dot > /tmp/vitest-phase2.log 2>&1; echo "exit $?"
```
EXPECT: exit 0

### Manual Validation
- [ ] Run `checkFigures` over a local copy of the prod queue (pending + accepted). List every
      contradicted item and check each by hand against `priceSeries`. The target is 0 contradicted
      among the 13 accepted items.

---

## Acceptance Criteria
- [ ] Every golden figure case comes out as labeled
- [ ] No symbol, IHSG word list or close verb typed at a call site; one exported constant each
- [ ] Candidate ids unchanged by the title fix
- [ ] typecheck, lint, full vitest green

## Completion Checklist
- [ ] New thresholds have provenance
- [ ] Reasons quote recorded values computed at runtime, never literals
- [ ] No commit, no deploy

## Risks
| Risk | Likelihood | Impact | Mitigation |
|---|---|---|---|
| Parse guess causes a final reject | Medium | Good news lost forever | Ambiguous means uncheckable; plausibility bound per series |
| Session figure read as close | Medium | False contradiction | Session and opening words make the sentence uncheckable; golden cases cover it |
| IHSG differs across symbol rows after a refresh | Low | Wrong comparison | Assert equality in a test |

## Notes
The golden figure set is small: 7 cases, only 1 contradiction. Treat the (d) gate as weak until
the residual adds labeled positives.
