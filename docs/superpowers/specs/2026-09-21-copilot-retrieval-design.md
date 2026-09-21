# Copilot retrieval — design

**Date:** 2026-09-21
**Status:** approved, pending implementation plan
**Scope:** `lib/agent/engine.ts`, `lib/agent/retrieval/**` (new), `lib/agent/gates.ts`,
`lib/agent/llm/*`, `lib/agent/thresholds.ts`, `lib/types.ts`, `lib/schemas.ts`,
`app/api/chat/route.ts`, `components/copilot.tsx`

## Problem

The copilot answers a narrow set of questions and refuses or misfires on the rest.

Asked "jelaskan semua kasus dalam satu jalur" from the causal map, it returns the
fallback at `engine.ts:1241` — "Pertanyaan itu belum bisa dipetakan ke bukti" — because
`routeFollowUp` resolves exactly one `primary` symbol (`engine.ts:1082`) and builds one
case from it. A question naming no symbol reaches no handler.

Two further defects compound it. The router matches first-keyword-wins over loose phrase
lists, so questions are captured by handlers that answer about a subject the reader never
named. And the assistant knows nothing about the page in front of the reader: the causal
map, the watchlist, the comparison table and the method pages are all invisible to it.

## Goals

1. Answer questions about any material the app serves, from any page.
2. Answer questions that name no symbol, and questions spanning many symbols.
3. Answer questions about the app itself — thresholds, method, how a figure is read.
4. Support conversational follow-ups.
5. Keep every figure traceable and every unsupported draft unrendered.

## Non-goals

- Trading advice. `safeLanguage` keeps refusing it.
- Any data source outside the recordings.
- Free-text search over provider responses not already in the citation registry.

## Decisions

| Decision | Choice | Rationale |
|---|---|---|
| Retrieval | Lexical index over derived terms | Corpus is ~261 KB. An embedding index is a second copy of the truth that can drift from the recordings; a lexical miss is visible and fixable, drift is silent. |
| Model calls per question | One | Keeps the fail-closed deterministic fallback intact and the cost flat. |
| Model | `gemini-3.5-flash-lite`, retry on `gemini-3.8-flash` | ~$16/month at 200 questions/day. Retry only on verification failure. |
| Page context | Registered builders, server-side | Typed and testable. No DOM scraping, no client-supplied figures. |
| Page context role | Prior, never filter | A reader on `/` must still get causal-map answers. |
| Conversation | Last N turns in the prompt | Follow-ups are most of what "understands everything" means in use. |

`GEMINI_MODEL` in `.env.local` is `gemini-3.5-flash` ($1.50 in / $9.00 out per 1M). It
becomes `gemini-3.8-flash` ($0.75 / $3.75) — newer and half the price. This is independent
of everything below and should land first.

## Architecture

### Retrieval layer — `lib/agent/retrieval/`

`corpus.ts` builds one index over every recorded entity. Entries are derived from
registries that already exist; no hand-typed alias table, matching the discipline of
`SYMBOL_ALIASES` at `query.ts:34`.

| kind | derived from |
|---|---|
| `case` | `companies`, `coverageInfo` |
| `event` | `marketEvents` |
| `metric` | `METRIC_FORMULA` / `glossField` in `explain.ts` |
| `endpoint` | the claim registry in `endpoint-registry.ts` |
| `causal-node` | `buildCausalGraph` labels, `mechanismLabelFor` |
| `threshold` | `DEFAULT_THRESHOLDS`, `THRESHOLD_PROVENANCE` |
| `view` | the context builders below |

```ts
interface CorpusEntry {
  id: string;
  kind: "case" | "event" | "metric" | "endpoint" | "causal-node" | "threshold" | "view";
  terms: string[];
  symbols: SymbolCode[];
  view?: ViewId;
  load(request: RequestContext): Promise<ContextBundle>;
}
```

`load` is lazy. Scoring touches every entry's terms; only the winners materialize into
prompt text.

`score.ts` reuses `normalizeQuery`, `phraseMatches`, `codeMatches` and `scoreEventOverlap`
from `query.ts`. An inverted index maps term to entry ids, so scoring is O(query terms),
not O(corpus). Term sets are normalized once at index build.

`context/` holds one builder per page, each re-deriving its material from the same
recordings the page rendered from: `/impact` graph nodes and edges, `/pantau` watchlist
rows, `/compare` both cases, `/method` method sections, `/` dashboard tiles. Every builder
is callable on every request regardless of route.

### Router — scored handlers

`routeFollowUp` stops being a sequence of `if` statements. Each handler declares:

```ts
interface Handler {
  id: ChatAnswer["intent"];
  match(q: NormalizedQuestion, ctx: RequestContext): { score: number; why: string } | null;
  answer(q: NormalizedQuestion, ctx: RequestContext): Promise<ChatAnswer>;
}
```

Score is built from explicit signals:

| signal | effect |
|---|---|
| question names a symbol (`findSymbolsRobust`) | positive |
| question names a figure (`matchFigure`) | positive |
| phrase class matched exactly | positive |
| phrase matched only via `phraseMatches` typo tolerance | smaller positive |
| subject came from chip or route, not the question | **zero** — tiebreak only |

The last row is the fix for the misfires. A chip may *supply* a subject; it may never
*justify* a handler.

Retrieval is one more candidate, scoring its normalized top-K relevance. Highest score
wins. Nothing clears `handlerScoreFloor` → the existing menu answer, wording unchanged.

Two defects this closes, both verified in the current source:

- `engine.ts:1176` — `if ((event && !namedFigure) || mentions(question, EVENT_PHRASES))`.
  The second clause fires with no event resolved and no symbol, so any question containing
  "dampak" gets answered about an arbitrary recorded event.
- `engine.ts:1227` — fires on `WHY_PHRASES` whenever a chip supplies `analysis`, so on
  `/cases/ANTM` any question containing "kenapa" returns ANTM's why-listed boilerplate.

"kenapa ANTM masuk daftar" still routes to why-listed: the question names the symbol.

### Aggregate questions

Aggregate intent is detected deterministically: `semua`, `seluruh`, `berapa banyak`,
`mana saja`, `total`, `all`, `how many`, `list`.

On detection, retrieval does **not** take top-K. A deterministic aggregator runs over the
full matching entry set and emits, as allowlisted figures, the count, the coverage
denominator (`6 dari 18`) and a bounded enumeration. When the enumeration exceeds
`retrievalContextCharCap`, the bundle states that and the coverage figure reflects only
what was included.

This is what makes "jelaskan semua kasus dalam satu jalur" truthful rather than plausible.
Top-K plus a char cap would hand the model a sample and let it write a confident sentence
about "semua"; the numeral verifier cannot catch that, because every numeral present is
legitimately in the bundle.

### Composition and verification

One `gemini-3.5-flash-lite` call receives the question, the last N turns, the retrieved
bundle and the figure allowlist. Verification then runs three checks:

1. **Numerals** — `verifyDraft`, unchanged. Every numeral must appear in the allowlist.
2. **Advice** — `assertSafeOutput`, caught and converted to a violation so `ADVICE_PATTERN`
   stays defined once in `gates.ts`.
3. **Language** — the answer's language matches the question's.

Checks 2 and 3 are new and exist because flash-lite's real failure mode is silent: it mixes
languages and drifts into advisory phrasing, neither of which the numeral rule sees. Without
them the retry would only ever trigger on fabricated numbers.

Any violation → one retry on `gemini-3.8-flash`. A second failure → deterministic render of
the bundle. No model prose, no invented note.

### Advice gating

`safeLanguage` currently runs on `request.question` only (`engine.ts:1079`), and
`assertSafeOutput` is called once, at `engine.ts:605`, on `thesis` — never on chat answers.
Model-written chat text is therefore not advice-gated today.

- `safeLanguage` runs per history turn at ingest. A tripping turn is **dropped from the
  prompt**, not refused; refusing a whole conversation over one past message is hostile and
  dropping is sufficient.
- The current question keeps today's refusal behavior.
- `assertSafeOutput` runs on every composed answer.

## Data flow

1. `components/copilot.tsx` sends `question`, `profile`, `contextSymbol` (from
   `resolveContext`), plus new `view` (pathname + search) and `history` (last
   `copilotHistoryTurns` from `useCopilotSession.messages` as `{role, text}`).
2. `POST /api/chat` → `chatRequestSchema.safeParse` with hard bounds on both new fields.
   Malformed → 400, as today.
3. `answerFollowUp` → `safeLanguage` on the question → history ingest and filtering.
4. All handlers score. Highest wins.
5. Retrieval handler, when it wins: resolve subjects from question, then history carry-over,
   then `contextSymbol`; score the corpus; apply `retrievalScoreFloor`; take
   `retrievalTopK`, or aggregate if aggregate intent was detected; `load()` the winners;
   concatenate to `retrievalContextCharCap`, dropping lowest-ranked overflow.
6. Build the figure allowlist **from bundles only** — never from history, never from the
   question. Citations come from the same bundles.
7. Compose, verify, retry once, else deterministic render.

`ChatAnswer.intent` gains `"retrieved"`. Every switch on `intent` in the UI is audited
before the value is added.

## Failure handling

| Failure | Behavior |
|---|---|
| `LlmBudgetError` (budget or 429) | Deterministic render plus existing `llmFallbackNote` via `budgetNoteFor`. Reused unchanged. |
| Verification fails twice | Deterministic render of the bundle. |
| A context builder throws | Drop that builder's entries, proceed with the rest, log once. Never a 500. |
| Retrieval finds nothing above floor | Existing menu answer, wording unchanged. |
| GCS ledger unreachable | Existing in-process counter path, untouched. |

## Caching

**L1 — corpus index.** Derived from static generated data. Built once per instance,
memoized at module scope, keyed by `DATA_AS_OF`.

**L2 — analysis and bundles.** `buildAnalysis` (`engine.ts:295`) is synchronous and
currently uncached, rebuilding the whole case on every request; the compare branch builds
two. It gains an in-process memo, key `[symbol, DATA_AS_OF, watchlistKey]`, as a bounded
LRU sized by `retrievalMemoMaxEntries`. **No GCS layer here** — a round-trip costs more
than recomputing a synchronous function.

**L3 — answer cache (GCS).** Key `[normalizedQuestion, bundleHash, DATA_AS_OF, model]`.
Written only when `history` is empty and the draft verified.

`bundleHash` replaces a profile fingerprint deliberately. Profiles are client-supplied and
near-unique per reader, so a profile-keyed cache would write constantly and almost never
read. Hashing the bundle collapses cardinality to genuinely distinct content, and closes
the cross-profile leak class (G18) by construction: different watchlists produce different
bundles and therefore different keys, while identical bundles are identical content, so
sharing them is safe by definition.

Invalidation is structural, not TTL-based: `DATA_AS_OF` appears in every key, so a
recordings refresh orphans old entries rather than serving stale figures.

Explicit Gemini context caching is **not** used: it bills $0.03/1M for flash-lite and
carries a minimum-token threshold the ~300-token system instruction does not approach.
Implicit caching is taken if it helps, at no cost and no code.

`maxOutputTokens` stays at 4096. Thinking tokens bill as output and vary per call — 394 on
one call and 674 on the next, per the note at `client.ts:30` — and the previous 1024 ceiling
truncated JSON mid-string. A flash-lite thinking budget is the right lever but requires
measured token usage first; it is a follow-up, not a guess.

## Thresholds

New entries in `lib/agent/thresholds.ts`, each with provenance recorded in
`THRESHOLD_PROVENANCE`, per the no-hard-coded-values rule:

| name | purpose |
|---|---|
| `handlerScoreFloor` | below this, no handler answers; the menu does |
| `retrievalTopK` | entries materialized for a non-aggregate question |
| `retrievalScoreFloor` | minimum entry score to be retrieved at all |
| `retrievalContextCharCap` | 6000 — caps bundle text, and so caps input cost |
| `copilotHistoryTurns` | turns sent to the model |
| `retrievalMemoMaxEntries` | LRU bound for the analysis memo |

## Cost

At `retrievalContextCharCap = 6000` (≈1,500 tokens), total input ≈2,200 tokens
(system + history + question + bundle), output ≈800 (answer plus thinking tokens, which
bill as output).

| model | per 1k questions | per month @200/day | @50/day |
|---|---|---|---|
| `gemini-3.5-flash-lite` | $2.66 | $15.96 | $3.99 |
| `gemini-3.8-flash` (retry path only) | $5.25 | — | — |

Tier 1 is a rate-limit change, not a price change; pay-as-you-go pricing is identical and
an active linked billing account is what qualifies. The recurring `429 RESOURCE_EXHAUSTED`
is free-tier throughput, not spend.

`gemini-3.8-flash` promotional pricing ends 2026-12-31, after which it doubles to
$1.50 / $7.50 per 1M.

## Testing

Unit, no API key required:

- index derivation — every registry entry yields a `CorpusEntry`; assert no hand-typed
  alias table exists
- handler scoring — a chip-supplied subject scores zero; "kenapa ANTM masuk daftar" still
  wins why-listed; "kenapa tambang ramai di peta sebab akibat?" with an ANTM chip goes to
  retrieval
- aggregate path — returns a coverage figure, and states truncation when the enumeration
  exceeds the cap
- allowlist excludes figures appearing only in `history` — the injection case, asserted
  directly
- advice gating — a tripping history turn is dropped; a composed answer containing advisory
  terms fails verification
- language check — an English draft for an Indonesian question fails verification
- cache keys — two different bundles never collide; `DATA_AS_OF` change orphans
- a throwing context builder degrades instead of failing

Golden fixture asserts relations, never entry ids, so a recordings refresh does not force a
re-bless: a causal question ranks a `causal-node` first; an ANTM question ranks the ANTM
case above the PGAS case; an aggregate question returns a coverage figure.

**Contract change requiring explicit sign-off.** Three tests assert the refusal is correct:
`tests/copilot-context.test.ts:121`, `tests/engine.test.ts:38`,
`tests/failure-paths.test.ts:137`, all expecting `"belum bisa dipetakan ke bukti"`. Where
retrieval now produces a grounded answer, those assertions must change. Each one is shown
before it is altered. Questions that should still refuse must still refuse.

Baselines recorded before work starts, so new breakage is distinguishable from old:
449/449 unit green, 6 pre-existing Playwright failures, plus 2 `catalyst.spec.ts`
assertions that fail on any machine with a live key (LLM-rewrite drift, unrelated).

## Rollout

`COPILOT_RETRIEVAL` env flag, default off. Ships dark, enabled after verification against
live recordings. Deployment stays manual per `docs/DEPLOY.md`.

## Risks

| Risk | Mitigation |
|---|---|
| Lexical retrieval misses paraphrases ("kenapa tambang lagi rame") | Falls to the existing menu; the miss is visible in logs and fixed by adding a derived alias. An embedding index would answer more but can drift from the recordings. |
| Router restructure changes pinned behavior | Every affected assertion is enumerated and shown before it changes. |
| flash-lite quality below Flash | Language and advice checks catch the silent failures; retry escalates to `gemini-3.8-flash`. |
| History is untrusted text in a prompt | Bounded in the schema, `safeLanguage`-filtered, and never contributes to the figure allowlist. |
