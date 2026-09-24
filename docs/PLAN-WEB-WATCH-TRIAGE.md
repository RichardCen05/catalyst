# Web-watch triage agent — plan

Status: proposed 2026-09-24. Not started.

## Problem

Pantau shows `Antrean (156)`. Every candidate reaches the reviewer raw: no symbol, no direction, no
band, no exposure path. The reviewer does all mapping by hand, and most of the queue is noise.

Snapshot of the production queue (`gs://katalis-recorded/catalyst/web-watch/queue.json`, read
2026-09-24): 156 pending, 7 accepted, 25 decided (18 dismissed).

| Share of pending | What it is |
| --- | --- |
| 75 (cnbc-market 38, cnbc-news 37) + katadata 20 | General news feeds. Most items touch none of the 18 registry symbols ("Mobil China Makin Gencar", "Trump … Iran", "Jamie Dimon Prediksi AI"). |
| 22 | BMKG mine-site forecasts. The text changes every 12 h sweep, so each sweep enqueues the same five sites again with no signal crossing anything. |
| 13 | Duplicate titles. |
| 156 / 156 | Arrive with `impactLinks: []`. |

The 18 human dismissals repeat three reasons: quake location not near an asset; fetched text is a
JS-rendered navigation skeleton; forecast point is a sample `adm4` in Jakarta, not a mine site.
Those are rules, and a machine can apply them.

## Goal

The reviewer sees roughly 10–20 candidates per day instead of 156, and each arrives with a checked
draft mapping. The reviewer keeps the final say: **nothing enters `accepted` without a human
decision.** This is the same contract as learned rules ("Aturan baru hanya menjadi usulan").

## Non-goals

- No auto-accept. An optional, default-off switch is described in Phase 5 and is out of scope
  unless the user asks for it.
- No change to how accepted events reach the engine (`ensureOverlay`).
- No new sources and no crawler. Triage works on what the sweep already fetched.
- No deploy. Deploying follows `docs/DEPLOY.md`, and the user picks the model and provider.

## Constraints (read before coding)

- `AGENTS.md` **No hard-coded values**. Symbols, names, sectors and segments come from
  `lib/data/fixtures.ts`. Every cut-off (duplicate similarity, weather warning level, quake radius,
  per-sweep LLM call cap, source dismiss-rate hint) goes into `DEFAULT_THRESHOLDS` in
  `lib/agent/thresholds.ts` with its provenance entry. No per-source prose tables.
- Model output that a reader sees is verified before it ships (`lib/agent/llm/verify.ts`). A
  rejected draft produces no proposal. The candidate then falls back to plain manual review. It is
  never auto-archived because the model failed.
- Candidate text is fetched from the open web. Treat it as untrusted data inside prompts, never as
  instructions. Past human `reason` strings are also data (few-shot examples), not instructions.
- `queue.json` is live production state. Schema changes must read the old shape without loss, and
  writes keep the existing `ifGenerationMatch` guard (`saveQueue`).
- Next.js in this repo differs from training data. Read `node_modules/next/dist/docs/` before
  touching routes.

## Where triage hooks in

Candidates are enqueued from two places. Both must go through triage, via one function:

- `app/api/internal/check-sources/route.ts:97`: `saveQueue(gcsQueueStore, (q) => enqueue(q, …))`
- `lib/web-watch/watch-all.ts:83`: `saveQueue(deps.queue, (q) => enqueue(q, fresh))`

Add `triage()` in a new `lib/web-watch/triage.ts`. Call it inside `enqueue` (or wrap `enqueue`), so
no future caller can skip it.

## Phase 0 — one relevance-band table

Two band tables disagree today:

- `lib/web-watch/queue.ts` `BAND_SCORE`: high 85, medium 70, low 50 (a human chose the band)
- `lib/agent/llm/exposure.ts` `RELEVANCE_BAND_SCORE`: high 90, medium 65, low 40 (the model chose it)

The same band means a different score depending on who assigned it. Move a single table into
`thresholds.ts` with provenance. Point both call sites at it (including `engine.ts:35`/`:1556`) and
update the tests that pin either number. Run the full suite, because rankings may shift.

Done when: one table, `grep -rn "high: 8\|high: 9" lib` finds only `thresholds.ts`, and tests pass.

## Phase 1 — sources declare what they concern

The source-to-symbol mapping lives only in comments and labels today (`// ANTM: Pomalaa…`,
`"… (ANTM)"`).

- Add optional `symbols?: SymbolCode[]` to `WatchedSource` (`lib/web-watch/types.ts`). Where it
  applies, also add `region?: string`, the administrative area the source covers.
- Fill it in `lib/web-watch/seeds.ts` from the existing comments. Sector-wide sources stay without
  symbols.
- Make sure the GCS registry (`catalyst/web-watch/registry.json`) picks up the new fields. See
  `tests/web-watch-seed-sync.test.ts` and `lib/web-watch/registry.ts`. Old registry entries without
  the field must still load.

## Phase 2 — deterministic triage (no model, free)

`triage(candidate, ctx) → TriageResult`, a pure function. `ctx` holds the registry companies, the
source record, and the queue (pending, accepted, decided) for duplicate checks.

```ts
type TriageResult =
  | { verdict: "archive"; rule: TriageRule; reason: string }
  | { verdict: "review"; symbols: SymbolCode[]; matchedBy: MatchEvidence[] };
```

Rules, applied in order. Each archive carries a reader-facing reason assembled from the matched
data, not typed per case:

1. **Duplicate.** Normalised title equal to, or body hash equal to, an item already pending,
   accepted or decided. A near-duplicate cut-off, if used, lives in thresholds.
2. **Empty extract.** Extracted text below a minimum length, or navigation-only (the JS-rendered
   skeleton case). The minimum lives in thresholds.
3. **Touches nothing watched.** Match against symbol codes, company names and meaningful name
   tokens, sector and subsector from `companies`, and `source.symbols`. No match leads to archive
   with "tidak menyentuh emiten pantauan". Watch for Indonesian enclitics (see the memory note on
   `normalizeQuery`) and for short tokens that collide with ordinary words. Test both.
4. **Weather below warning.** For BMKG forecast and quake payloads (`lib/web-watch/json-summary.ts`
   already parses them), keep a candidate only when a value crosses a warning level in thresholds
   (rain intensity or weather code class; quake magnitude and distance or region match against
   `source.region`). Do not invent site coordinates. If the registry has no location for a site,
   match by region text only, and say so in the reason.

Everything not archived becomes `verdict: "review"` with the symbols it matched.

**Queue schema.** Extend `ReviewQueue` with:

```ts
archived: Record<candidateId, { event: MarketEvent; rule: TriageRule; reason: string; at: string }>;
proposals: Record<candidateId, TriageProposal>;   // Phase 3
```

Default a missing key to empty on load (`gcsGetJson` of the old file). A re-run of the same address
must not resurrect an archived item, as `decided` already guarantees for dismissals. Restoring an
archived item moves it back to `pending` and records that the human restored it.

**Backfill.** Add an internal, authenticated action (reuse `lib/internal-auth.ts`) that triages the
existing `pending` list. It defaults to **dry-run**: it reports counts per rule and 5 sampled
titles per rule, and writes nothing. A real run needs an explicit flag.

Done when: pure unit tests cover each rule, including false-positive guards. A dry-run over a local
copy of the production queue (download read-only into the scratchpad; never write to GCS) reports
the archive share per rule, and a human has looked at the sample.

## Phase 3 — model drafts the mapping

For each `review` candidate and each matched symbol, draft `{ direction, band, path, rationale }`.
Reuse `assessExposureWithLlm` in `lib/agent/llm/exposure.ts`, which already takes the symbol, event
and segments and returns that shape.

- **Few-shot.** Include up to N recent human decisions from `decided` and `accepted` (N in
  thresholds): title, decision, reason and impacts, marked clearly as examples.
- **Verification.** Reject a draft unless all of these hold:
  - the symbol is in the registry **and** in the Phase 2 match set;
  - every numeral in `path` and `rationale` appears in the candidate's title, summary or body
    (reuse `extractNumerals` and `verifyAnswer` conventions);
  - it contains no advice language (`safeLanguage`);
  - the direction and band are valid enum values.
- **Budget.** Go through `lib/agent/llm/budget.ts`, with a per-sweep call cap in thresholds. When
  the budget closes, the remaining candidates stay in plain review with no proposal. That is not
  an error.
- Store the result as `proposals[candidateId] = { impacts: ReviewImpact[], model, verifiedAt }`.
  Rejected drafts are logged (`reportLlmFallback` style) and not stored.
- Run triage in the sweep and after the response is written, if the sweep route has a deadline.
  The Cloud Scheduler job `catalyst-web-watch` must not time out; see `docs/DEPLOY.md`.

Done when: unit tests with a stubbed `generateStructured` cover a verified proposal, a
fabricated-number rejection, an out-of-match-set symbol rejection, and budget closed. The sweep
completes under its deadline with the call cap reached.

## Phase 4 — Pantau review UI

`components/web-watch-review.tsx` (plus `app/api/web-watch/route.ts` for the new actions):

- **Order.** Proposals first, by band then time. Then plain review items. The count in the header
  is what needs a human, not the raw pending size.
- **Accept a proposal.** A proposal pre-fills the existing accept form (`decide()` with `impacts`).
  "Terima usulan" is one click, and editing before accepting stays possible.
- **Batch accept.** Only for high-band verified proposals, behind a confirm dialog that lists them.
  It still records a human decision per candidate.
- **"Diarsipkan otomatis (n)".** Collapsed, with the rule and reason per item and "Kembalikan" to
  restore.
- **Source health hint.** When a source's archive plus dismiss share over the last M decisions
  crosses a threshold, show "Pertimbangkan menonaktifkan sumber ini". It is a suggestion only;
  nothing is disabled automatically.
- Run `npm run chrome:build` after the copy changes (see `AGENTS.md`). Update the Pantau retrieval
  bundle (`lib/agent/retrieval/context/web-watch.ts`) so the assistant can explain the archive and
  the proposals.
- Update `tests/e2e/catalyst.spec.ts` if it pins Pantau copy or counts.

Done when: the page works at desktop and 375 px, in light and dark, and keyboard reachable. The
e2e and a11y checks pass.

## Phase 5 — optional, default off (only if the user asks)

A setting "Terima otomatis bila band tinggi dan lolos verifikasi", stored where the refresh toggle
lives (`app/api/settings/refresh` pattern). It is off by default. Every auto-accept is recorded in
`decided` with `reason: "otomatis: …"` and can be reverted from Pantau.

Built 2026-09-24 on `feat/web-watch-auto-accept` at the user's request. Not deployed.

- The switch is on the Pantau page. It is stored as `webWatchAutoAccept` in
  `catalyst/config/settings.json`, next to the refresh flag. `WEB_WATCH_AUTO_ACCEPT=false` is an
  operator kill-switch, and `=true` forces it on.
- The sweep (`watchAll` and the single-source path) calls `autoAcceptPending` after drafting.
  It takes a proposal only when every impact is high band, verified, `Supported` or `Adverse`, and
  the candidate's own text names the emiten by ticker or registry name. A match by sector,
  region or source alone does not qualify.
- At most `webWatchAutoAcceptDailyMax` auto-accepts in any 24 hours (`thresholds.ts`).
- Each decision carries `auto: { event, match, proposal }`. "Batalkan" (`revert-auto`) puts the
  item back in review exactly as it was, marked `noAuto`, so the sweep never auto-accepts it again.
- Auto-accepts are kept out of the few-shot examples, so the model never learns from its own
  drafts.

## Gates for every phase

```bash
pnpm typecheck
pnpm lint
pnpm test          # exclude the gitignored tests/zz-live test; read the raw exit code
npm run chrome:build && git diff --exit-code lib/data/chrome.generated.ts
pnpm build
```

Commit per phase on its own branch, with messages in the repo's `feat(web-watch): …` style.

## Measuring success

Run the Phase 2 dry-run, and later the Phase 3 dry-run, against a read-only copy of the production
queue. Report:

- pending before and after;
- archive count per rule, with samples;
- proposals drafted, verified and rejected;
- LLM calls spent.

The target is at most 20 items needing a human on a normal day. Any archived item that a human
would have accepted counts as a defect. Collect those and tighten the rule.
