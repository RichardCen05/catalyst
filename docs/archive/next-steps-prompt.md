# Catalyst — next work order (run in this order: 1 → 3 → 4 → 5 → 2)

Work in `/Users/af/dumpProject/catalyst`, branch `feat/alief/wire-ui`.
Answer in Indonesian. Write code, comments, commits and docs in normal English prose.

## Verified state as of 2026-09-17 01:30 WITA — trust this, but re-verify before you change anything

Production is Cloud Run, not local. The two configurations differ, so read prod
before believing `.env.local`.

```
project        ada-sectors-508410
service        catalyst-web  (us-central1)
url            https://catalyst-web-1019003607640.us-central1.run.app
revision       catalyst-web-00028-5rm
image          us-central1-docker.pkg.dev/ada-sectors-508410/katalis/catalyst-web:aa309b8
git HEAD       aa309b8 (matches the deployed image)
prod env       AGENT_MODE=llm, GEMINI_MODEL=gemini-3.5-flash, GCS_CACHE_BUCKET=katalis-recorded
prod secrets   GOOGLE_API_KEY, INTERNAL_CRON_SECRET, SECTORS_API_KEY, OPERATOR_TOKEN
buckets        katalis-recorded (US-EAST1, in use), catalyst-memory (US-CENTRAL1, empty)
scheduler      catalyst-web-watch — POST /api/internal/check-sources, 30 17 * * 1-5 Asia/Jakarta
queue          pending 58 (company 25, policy 20, weather 6, commodity 4, rates 3), accepted 0, decided 9
sectors        sectorsRefreshEnabled=false, no catalyst/refresh/ prefix, no ledger — zero credits ever spent
```

Useful reads (no writes):

```bash
gcloud run services describe catalyst-web --region=us-central1 --format=json
gcloud storage cat gs://katalis-recorded/catalyst/web-watch/queue.json
gcloud storage cat gs://katalis-recorded/catalyst/web-watch/registry.json
gcloud storage cat gs://katalis-recorded/catalyst/config/settings.json
```

### Known blocker — do not try to fix it

The Gemini key answers `403 PERMISSION_DENIED — "Your project has been denied
access."` on `generateContent`, while `models.list` answers 200. The key is fine;
Google has denied the key's project. The operator will handle it later (new key
from another project, or Vertex AI, which the client already supports via
`GOOGLE_GENAI_USE_ENTERPRISE`). Until then the agent runs the deterministic path
on purpose, and `[llm-fallback]` lines in Cloud Run logs say so. Do not switch
prod to Vertex AI — that is a paid path and a decision the operator has not made.

### Rules for every step

- Verify against prod, not against `.env.local`. Quote the command output you relied on.
- Never invent an exposure link, a relevance score or a direction. `check.ts:10` states the
  rule: a candidate enters the queue with empty `impactLinks` and a human maps it.
- Never print a secret value into the chat or into a file. Pass it through a shell
  variable (`TOK=$(gcloud secrets versions access latest --secret=...)`).
- Gates before every commit: `npx tsc --noEmit`, `npx eslint .` (0 errors; 39 pre-existing
  warnings are fine), `npx vitest run` (219 tests pass today), `npx next build`.
- Do not commit these untracked scratch files: `tests/zz-live.test.ts`,
  `e2e-*.md`, `implement-plan-prompt.md`, `verify-plan-prompt.md`, `next-steps-prompt.md`.
- Deploy only when a step says to:

```bash
SHA=$(git rev-parse --short HEAD)
gcloud builds submit --tag "us-central1-docker.pkg.dev/ada-sectors-508410/katalis/catalyst-web:$SHA"   # ~3 min
gcloud run deploy catalyst-web --region=us-central1 \
  --image="us-central1-docker.pkg.dev/ada-sectors-508410/katalis/catalyst-web:$SHA" --quiet
```

- End commit messages with `Co-Authored-By: Claude Opus 5 <noreply@anthropic.com>`.

---

## Step 1 — prove the web-watch pipeline reaches the causal chain

`accepted: 0` since the queue was created. The path "scraped source → human review →
node in the causal chain" has only ever been proven in unit tests, never in production.

Do this:

1. Read the pending queue and pick **one** candidate whose exposure is defensible without
   guessing — a policy item from ESDM or Bank Indonesia that names a commodity or a rate
   the recorded universe is exposed to (DMO/export rules → ADRO/PTBA, BI-Rate → BBCA/BBRI/BMRI).
   Print the candidate's title, body excerpt and source URL, and say why the exposure holds.
2. Stop and ask the operator to confirm the symbol mapping, the exposure path sentence and
   the relevance band before you post anything. This is a content decision, not a code one.
3. After confirmation, post the accept. The route needs the operator bearer:

```bash
TOK=$(gcloud secrets versions access latest --secret=OPERATOR_TOKEN)
curl -s -X POST https://catalyst-web-1019003607640.us-central1.run.app/api/web-watch \
  -H "Authorization: Bearer $TOK" -H 'Content-Type: application/json' \
  -d '{"action":"accept","candidateId":"<id>","impacts":[{"symbol":"<SYM>","direction":"<Supported|Adverse|Mixed|Unverified>","band":"<high|medium|low>","path":"<jalur eksposur, min 10 karakter>"}],"reason":"<alasan reviewer>"}'
```

4. Prove it landed in the chain, not just in the queue: POST `/api/causal-graph` for that
   symbol and show the new `source` node carrying the accepted event id, plus `accepted: 1`
   in `queue.json`.

Done when: a node sourced from a scraped page is visible in the production causal graph,
and you have shown the API response that proves it.

If the accepted event does **not** appear, do not paper over it — find out why
(`ensureOverlay`, the overlay TTL, `mergedEvents()` in `lib/data/providers.ts`, or the
relevance floor filtering it out) and report the cause before fixing.

## Step 3 — `LLM_DAILY_CALL_BUDGET` is documented but does not exist

`.env.example` promises: "Plafon panggilan model per hari … Lewat plafon atau kena 429,
aplikasi turun ke jalur deterministic dan memberi tahu pengguna." Grepping `lib/`, `app/`
and `tests/` for `LLM_DAILY_CALL_BUDGET` returns nothing. There is no counter, no ledger,
no gate. A project that sells transparency must not document a guardrail it does not have.

Pick one and say which you picked and why:

- **Implement it.** Model it on the Sectors spend ledger (`lib/data/sectors-client.ts`):
  a per-day counter in GCS, checked before `generateStructured`, and a fallback to the
  deterministic path with a user-visible note when the budget or a 429 is hit. Unit tests
  for: under budget, at budget, over budget, 429 mid-call.
- **Delete the claim.** Remove the promise from `.env.example` and anywhere in `docs/`
  that repeats it, and say plainly that call volume is unbounded.

Implementing is the better answer if the LLM path is meant to come back; deleting is
honest if it is not. Do not leave the claim standing either way.

Done when: the repo no longer claims a limit it cannot enforce, gates pass, and the change
is committed.

## Step 4 — JSON candidates are unreadable in `/pantau`

A reviewer has to read raw JSON to make a decision. Real titles from the production queue:

```
{"Infogempa":{"gempa":{"Tanggal":"16 Sep 2026","Jam":"08:11:31 WIB","Coordinates":"-7.22,107.62",...
{"lokasi":{"adm1":"74","adm2":"74.01","adm3":"74.01.07","adm4":"74.01.07.1002","provinsi":"Sulawesi Tenggara",...
```

Five mine-site BMKG forecast sources were added on 2026-09-17 (Sungailiat/TINS,
Tanjung-Tabalong/ADRO, Tanjung Enim/PTBA, Pomalaa/ANTM, Sorowako/INCO), so this hits the
weather leg every sweep.

Do this in `lib/web-watch/check.ts`, where `title` and `summary` are built
(`headline = (title ?? text.text.split("\n")[0] ?? fetchedUrl)`):

- When the fetched document parses as JSON, derive a human title and summary from its
  fields instead of slicing the blob. Two shapes matter today:
  - BMKG quake (`Infogempa.gempa`): magnitude, depth, region, felt-at, time.
  - BMKG forecast (`lokasi` + `data[].cuaca`): village, district, and the next few
    weather descriptions with rainfall and wind.
- Keep the raw text in `body` — the citation and the audit trail must not lose it.
- Fall back to current behaviour for any JSON shape you do not recognise. Do not guess
  at fields, and do not let a parse failure throw.
- Unit tests with the real payload shapes, including the unrecognised-shape fallback.

Done when: `/pantau` shows a sentence a reviewer can act on, the raw body is still
available, gates pass, committed, built and deployed (see the deploy block above).

## Step 5 — run the production E2E suite

Four revisions shipped on 2026-09-16/17 and the prod suite has not run since.

```bash
npx playwright test -c playwright.prod.config.ts
```

Read `playwright.prod.config.ts` first: it points at the live Cloud Run URL and allows a
90s expect timeout because it was written when answers went through a live Gemini rewrite.
With the 403 in place the deterministic path answers in ~2-4s, so specs that assert on
LLM-rewritten wording may fail. Triage every failure into one of:

- a real regression from today's changes (label fix, provider overlay, operator auth,
  seed sync) — fix it;
- an assertion that only held while the LLM was alive — adjust the spec so it asserts on
  what the deterministic path guarantees, and say in the diff why;
- flake — rerun once, and say so.

Do not weaken an assertion just to make the suite green. Report the counts before and after.

Done when: the prod suite result is reported honestly, real regressions are fixed, and any
spec change is justified in the commit message.

## Step 2 — LAST: unfreeze the data (spends non-refillable credits)

Everything the app shows is a recording from 2026-09-11. `asOf` will never move until a
refresh runs. The grant is 1,000 credits and cannot be topped up, so this goes last, after
steps 1/3/4/5 have proven the pipeline.

Guardrails already in the code: the plan is bounded to `RECORDED_SYMBOLS`
(ANTM, BBCA, BBRI, GOTO, PGAS, TLKM), two calls per symbol
(`/v2/broker-summary/{sym}/` cost 2, `/v2/foreign-flow/{sym}/` cost 1), a daily budget of
25 credits, and a GCS ledger. The bundled `lib/data/market.generated.ts` is never
overwritten at runtime.

Sequence — stop for operator confirmation before the live run:

1. Turn the gate on (Pengaturan drawer, or POST `{"enabled":true}` with the operator bearer).
2. Dry run first: POST `{"run":true,"dryRun":true}`. It spends nothing. Report the plan
   and the estimated cost.
3. **Ask the operator to confirm the live run.** Say the exact credit cost. Wait for a yes.
4. Live run: POST `{"run":true,"dryRun":false}`. Report what landed in
   `gs://katalis-recorded/catalyst/refresh/<date>/` and the ledger line.
5. Download the raw responses into `data/sectors/`, re-run `scripts/build_market_data.py`,
   and review the regenerated `lib/data/market.generated.ts` diff before committing —
   check that `asOf` moved and that no symbol lost data.
6. Gates, commit, build, deploy. Then confirm the new `asOf` through
   `GET /api/health` on prod.
7. Turn the refresh gate back off.

Done when: prod serves data newer than 2026-09-11, the credits spent are reported exactly,
and the gate is off again.

---

## Report at the end

One short section per step: what you changed, the command output that proves it works in
production, what you chose not to do and why. If a step is blocked, say so plainly and move
to the next one — do not silently narrow the scope.
