# Deploy and operate Catalyst on GCP

Every value in this file was read from the live project on **18 September 2026**, and §1, §2 and
§2b were re-read on **22 September 2026** after the redeploy that made OpenRouter live, with the
`gcloud` commands quoted next to it. If a command below disagrees with what you see, trust the
live project and fix this file in the same pull request.

This is the operational document. `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md` is the design plan that
preceded the deployment; parts of it were never built, so do not follow it for deploys.

## 1. Live coordinates

| What | Value | Verified with |
|---|---|---|
| Project | `ada-sectors-508410` | `gcloud config get-value project` |
| Service | `catalyst-web`, region `us-central1` | `gcloud run services list` |
| Public URL | https://catalyst-web-ibyebnreqa-uc.a.run.app | `gcloud run services list`, `curl` → 200 |
| Alternate URL | https://catalyst-web-1019003607640.us-central1.run.app | `curl` → 200 (same service) |
| Serving revision | `catalyst-web-00084-484`, deployed 2026-09-25 13:00 UTC by the first run of `cloudbuild-deploy.yaml` (build `d8778fbe`), 100% of traffic, labelled `commit=27d97bb` (`feat/alief/wire-ui`). Everything in `00080-qgh` plus the Terindikasi Rumor tab on Pantau (`bd70929`) and the recordings bundle refreshed to 24 Sep (`27d97bb`). DeepSeek profile (`_PROVIDER=deepseek`): `openai-compatible` against `https://bandelbanget.xyz/v1` with `deepseek-v4-flash`, `LLM_SCHEMA_MODE=prompt`, `LLM_REASONING=off`, `LLM_REASONING_FIELD=thinking`, `LLM_RATE_LIMIT_STRIKES=3`, five secrets. The same run moved the refresh worker onto this source (§10). Verified live: `/api/health` ok with `dataAsOf` 24 Sep and 37 sessions, `/` and `/pantau` 200 with the Terindikasi Rumor tab, `/api/internal/check-sources` 401 without the bearer, `contextSymbol: "XXXX"` answers 400, and chat answers with `generator: llm` in Indonesian and English. The next scheduled refresh (build `db4c69d7`, triggered by hand) passed and skipped its deploy because live was current | `gcloud run revisions list --service=catalyst-web --region=us-central1`, `gcloud logging read ... revision_name="catalyst-web-00084-484"` |
| Image | `us-central1-docker.pkg.dev/ada-sectors-508410/cloud-run-source-deploy/catalyst-web@sha256:9d939d79f8737…` | `gcloud run revisions describe` |
| Service account | `catalyst-run@ada-sectors-508410.iam.gserviceaccount.com` | `gcloud run services describe` |
| Sizing | cpu 1, memory 512Mi, concurrency 80, max instances 3, port 8080, request timeout 300s | `gcloud run revisions describe` |
| Access | unauthenticated — `roles/run.invoker` is granted to `allUsers` | `gcloud run services get-iam-policy catalyst-web --region=us-central1` |

The image lives in the `cloud-run-source-deploy` repository, which means the service is deployed
from source with `gcloud run deploy --source .`. A person starts a release with one
`gcloud builds submit --config cloudbuild-deploy.yaml` (§6), which runs the gate and that deploy
inside Cloud Build. There is no Cloud Build trigger (`gcloud builds triggers list` returns nothing),
so **no deploy happens automatically on push**. The only unattended deploy is the scheduled data
refresh (§10), which keeps the serving revision's env and secrets.

## 2. Runtime configuration on the live revision

Plain environment variables:

- `AGENT_MODE=llm`
- `LLM_PROVIDER=openai-compatible`
- `LLM_BASE_URL=https://bandelbanget.xyz/v1`
- `LLM_MODEL=deepseek-v4-flash`
- `LLM_SCHEMA_MODE=prompt`
- `LLM_REASONING=off`
- `LLM_REASONING_FIELD=thinking`
- `LLM_RATE_LIMIT_STRIKES=3`
- `COPILOT_RETRIEVAL=on`
- `GCS_CACHE_BUCKET=katalis-recorded`

The bandelbanget.xyz gateway needs the two variables added in `7c5000d`. It accepts
`response_format: json_schema` and drops it — `deepseek-v4-flash` answered in prose on 6 of 6
probes, which would send every chat answer to the deterministic path — so `LLM_SCHEMA_MODE=prompt`
puts the schema in the system instruction and asks for `json_object`. It also ignores
`reasoning: {enabled: false}` (170–970 reasoning tokens a call) and honours
`thinking: {type: "disabled"}` (none), so `LLM_REASONING_FIELD=thinking` sends `LLM_REASONING=off`
in that shape. Both default to the old behaviour, so the OpenRouter and Gemini variants are
unchanged.

Measured 2026-09-25 through the real answer path and verifier (`tests/zz-live-burst.test.ts`,
20 calls at concurrency 4): all 20 parsed, 4 passed the verifier and 16 were rejected for advisory
language, p90 1.8s. Gemini 3.8 Flash passed 12 of 20 on the same harness. The harness evidence
contains "beli bersih", which the advice gate refuses, so the numbers compare models, not
production rates — but expect more deterministic answers than on Gemini. The key is the
`LLM_API_KEY` secret, version 2 (created 2026-09-25).

Secrets mounted from Secret Manager, all at version `latest`: `GOOGLE_API_KEY`, `LLM_API_KEY`,
`INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`, `OPERATOR_TOKEN` (`gcloud secrets list` shows exactly
these five).

The image on this revision contains `fc5a247` (`feat(llm): select the model provider by
environment`) and `7c5000d`, so the variables above are read and the effective provider is the
bandelbanget.xyz gateway. Before `catalyst-web-00054-gvr`, every revision set the same variables on an image that predated that commit
and silently kept calling Gemini, which is why an env-only change is not a provider change:
`LLM_PROVIDER` is read by code, so switching it requires an image that contains the code.
Verified 2026-09-22 on `catalyst-web-00054-gvr`: two live `/api/chat` calls returned 200 with no
`llmFallbackNote`, and this revision's logs carry no AI Studio error.

`GEMINI_MODEL` and `GEMINI_MODEL_CHEAP` are inert under `openai-compatible` (see
`lib/agent/llm/models.ts`) and are no longer set; the built-in Gemini defaults keep a rollback
working without them. `GOOGLE_API_KEY` stays mounted either way — costless while unused, and a
rollback without it needs a new secret version plus a new revision.

Measured before the OpenRouter switch (2026-09-22), over 40-request bursts against the real answer path,
`nex-agi/nex-n2.5-mini:free` produced a verifier-approved answer 26 times out of 40, at p90
2.3s, with no 429 and no 5xx. The other ~35% fall to the deterministic path — mostly advisory
phrasing and invented figures that `lib/agent/llm/verify.ts` catches. That rate is the known
cost of the free tier and has not been compared against Gemini on the same harness.

`LLM_REASONING=off` is load-bearing, not cosmetic: without it the free reasoning model thinks
before answering (measured 543–966 completion tokens, 6.6–18.2s per call), with it the same
call costs 87–102 tokens and 1.3–2.5s. A revision without this variable pays the thinking tax
on every chat answer. `LLM_MODEL_CHEAP` is intentionally unset in the §6 command: one model doing both jobs means
`composeRetrieved` makes a single attempt instead of asking the same vendor twice (see
`lib/agent/engine.ts`). The serving image carries that skip.

`GCS_MEMORY_BUCKET` is not set. `lib/memory/gcs-memory.ts` falls back to `katalis-recorded`, so
user memory is written there, not to the `catalyst-memory` bucket. The `catalyst-memory` bucket
exists in `US-CENTRAL1` but is empty and unused; the design plan's `catalyst-recorded` bucket was
never created.

`GEMINI_MODEL` and `GEMINI_MODEL_CHEAP` are no longer set on the live revision: under
`openai-compatible` they are inert, and `lib/agent/llm/models.ts` carries defaults that keep a
rollback working without them. One model (`LLM_MODEL`) now does both the draft and the retry.
Unpriced on the OpenRouter free tier — the cost is queue wait, not money. The ~$16/month at 200
questions/day figure applies to the Gemini variant only, so do not read it against this revision.

Heads-up for a rollback (measured 2026-09-22): the Gemini key's project had exceeded its monthly
spending cap (`ai.studio/spend`), so model calls answered 429 and the app served the
deterministic fallback. Irrelevant on OpenRouter; blocking the moment you switch back — raise the
cap in AI Studio first.

## 2b. Switching model provider

The live revision runs `openai-compatible` against the bandelbanget.xyz gateway, on an image
that reads the variable. For a gateway that drops `json_schema` or reads `thinking` rather than
`reasoning`, see `LLM_SCHEMA_MODE` and `LLM_REASONING_FIELD` in §2. This section describes how the selection works and how to move it.

`LLM_PROVIDER` selects the provider in `lib/agent/llm/providers.ts`. Unset means `gemini`, so
removing the variable is the rollback. The other value is `openai-compatible`:
any `/v1/chat/completions` endpoint that honours `response_format: json_schema` with
`strict: true` — OpenRouter, OpenAI, Groq, Together, vLLM, and Anthropic's OpenAI-compatible
endpoint. A provider that ignores the schema is not usable: the guards in `lib/agent/llm/verify.ts`
reject free prose, so the panel renders the deterministic text instead.

`openai-compatible` additionally requires `LLM_BASE_URL` (no trailing slash) and `LLM_API_KEY`
(a Secret Manager secret, never a plain env var), plus `LLM_MODEL`. The model id is not optional
for a non-Gemini provider: `lib/agent/llm/models.ts` refuses to guess one rather than send a
Gemini id to a vendor that has never heard of it. `LLM_MODEL_CHEAP` is optional; without it one
model does both the draft and the retry.

`LLM_MODEL` and `LLM_MODEL_CHEAP` also override `GEMINI_MODEL` and `GEMINI_MODEL_CHEAP` while the
provider is still Gemini, so a Gemini deployment can be renamed without touching anything else.

A 429 from any provider counts against the day's gate identically — `LlmHttpError` carries the
status so `isRateLimitError` in `lib/agent/llm/budget.ts` recognises it. `LLM_RATE_LIMIT_STRIKES`
(default 3) decides how many close it. One was right while Gemini's per-key quota was the only
possibility: the first 429 means the allowance is gone. A shared free pool answers 429 when
another tenant was busy for a second, so on `openai-compatible` leave the default or raise it;
on Gemini, setting it to 1 restores the old behaviour. Rolling back is `LLM_PROVIDER=gemini` or removing the
variable; no redeploy of the image is needed for either direction, only
`gcloud run services update`:

```bash
gcloud run services update catalyst-web --region=us-central1 --project=ada-sectors-508410 \
  --remove-env-vars=LLM_PROVIDER
```

Switching the other way, or to a different model, uses `--update-env-vars` and
`--update-secrets`. Never the `--set-` variants: those replace the whole list and would drop
`AGENT_MODE`, `COPILOT_RETRIEVAL`, `GCS_CACHE_BUCKET` and the other four secrets.

A provider change also needs the image to carry the provider code. Moving to a provider on an
image built before commit `fc5a247` sets variables that nothing reads, and the app keeps calling
Gemini while the configuration says otherwise.

`COPILOT_RETRIEVAL` gates the retrieval layer (`lib/agent/retrieval/`): the lexical corpus
index, scored-handler routing, and aggregate answers over the full matching set. When unset
(or anything but `on`) the `retrieved` handler scores 0 and the copilot behaves exactly as
before retrieval shipped — scored keyword handlers, menu fallback, no new model calls.
Flipping it needs no code change, but environment changes only reach a new revision, so flip
it with `gcloud run services update ... --set-env-vars` (or redeploy with the command in
section 6) rather than expecting a running revision to pick it up.

## 3. What a new teammate needs before touching anything

1. A Google account with access to project `ada-sectors-508410`. As of 18 September 2026 two
   accounts hold `roles/owner` and two more hold pending owner invitations; list them
   with `gcloud projects get-iam-policy ada-sectors-508410 --flatten='bindings[].members'
   --format='value(bindings.members,bindings.role)'`. An owner has to grant access to anyone new.
   Whoever deploys needs at least
   `roles/run.admin`, `roles/iam.serviceAccountUser` on `catalyst-run@`, and
   `roles/cloudbuild.builds.editor` for the source build.
2. `gcloud` installed, then:

   ```bash
   gcloud auth login
   gcloud config set project ada-sectors-508410
   ```

3. For local development only, a `.env.local` copied from `.env.example` with a real
   `SECTORS_API_KEY` and `GOOGLE_API_KEY`. Never commit it, and never pass key values on the
   `gcloud run deploy` command line — production reads them from Secret Manager.

## 4. Run it locally

```bash
pnpm install
pnpm dev
```

Then open http://localhost:3000. To rebuild the recorded dataset from `data/sectors/`:

```bash
python3 scripts/build_market_data.py
```

## 5. Gate before every deploy

The deploy pipeline of §6 runs the gate itself, in Cloud Build, before it builds the image:
`pnpm lint`, `pnpm typecheck`, `vitest` (without the gitignored `tests/zz-live.test.ts`), the NLI
screen's `pytest` (stub model, no model files), the Playwright journeys in `tests/e2e`, then
`pnpm build` inside the image. A red step fails the build and the serving revision is untouched.

The Playwright step (`e2e`) builds the app, serves `.next/standalone`, and runs four workers in the
`mcr.microsoft.com/playwright:v<_PLAYWRIGHT>-noble` image — about three and a half minutes for the
step, of which the 39 tests take about two and a half on `E2_HIGHCPU_8`. It never
touches production state. The app's stores default to the production bucket
(`GCS_CACHE_BUCKET || "katalis-recorded"`, and `GCS_MEMORY_BUCKET` the same) and the build identity
can write there, so `playwright.config.ts` starts the server with both pointed at
`gs://ada-sectors-508410-catalyst-e2e` (`_E2E_BUCKET`; US-CENTRAL1, uniform access, public access
prevention, objects deleted after one day) and with `AGENT_MODE=deterministic`, so no model is called
and no answer drifts. The step refuses a bucket that does not end in `-e2e`, and
`tests/deploy-pipeline.test.ts` fails when the app reads a `GCS_*_BUCKET` variable the config does not
redirect. This is why it was out of the gate before: the first attempt (build `08621ea5`, 25 September
2026, cancelled) ran without that config and left 35 test profiles under
`gs://katalis-recorded/catalyst/memory/`, created 13:04–13:15 UTC. `_PLAYWRIGHT` must match
`@playwright/test` in the lockfile — the step stops with both versions named when it does not.
The first gated run (dry run `a3209116`, commit `9ebd77c`) passed 39/39; the e2e bucket gained 35
objects and `katalis-recorded` gained none from the step (two writes during the run carry timestamps
from before the tests started, from live traffic).

Left out on purpose: `tests/e2e/copilot-prod.spec.ts` checks the deployed service with live model
calls (`pnpm exec playwright test -c playwright.prod.config.ts`); the `zz-live-*` tests need a live
key; the screen-payload and triage dry-run files are opt-in dump tools; and seven golden figure
cases skip because their article text is fetched into a gitignored cache and never committed.

Running the gate locally first is still the faster way to find a failure:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm build` runs `prebuild` first, which regenerates `lib/data/chrome.generated.ts` from the JSX
in `app/` and `components/`. That happens again inside the image build, so the registry a deployed
revision answers from is always built from the source it was built with — a heading edited without
`pnpm chrome:build` can no longer ship a stale index. `tests/chrome-registry.test.ts` still fails on
a stale committed file, so the diff stays honest too; commit the regenerated file with the change.

Locally, `pnpm test:e2e` starts `pnpm dev` on port 3100 with the same test bucket and deterministic
agent (the variables set in `playwright.config.ts` win over `.env.local`), on one worker because a
dev server compiles each route on first request. It reuses a server already on 3100, never the one on
3000. To run it the way the pipeline does: `pnpm build`, copy `public` and `.next/static` into
`.next/standalone`, then `CI=1 pnpm exec playwright test`.

## 6. Deploy

One command, from the repository root on the branch you want live. Ask which model and provider
first; `_PROVIDER` has no default and the build stops without one:

```bash
gcloud builds submit --config cloudbuild-deploy.yaml --region=us-central1 \
  --project=ada-sectors-508410 \
  --substitutions=_PROVIDER=deepseek,_COMMIT=$(git rev-parse --short HEAD)
```

| `_PROVIDER` | Serves | Env and secret set |
|---|---|---|
| `deepseek` | `deepseek-v4-flash` via the bandelbanget.xyz gateway | §6a0 |
| `openrouter` | `nex-agi/nex-n2.5-mini:free` via OpenRouter | §6a |
| `gemini` | `gemini-3.8-flash` / `gemini-3.5-flash-lite` | §6b |
| `keep` | whatever the serving revision serves | unchanged |

`cloudbuild-deploy.yaml` runs, in order: pull the recordings the scheduled refresh last deployed
from `gs://ada-sectors-508410_cloudbuild/catalyst/recordings` into `data/sectors/`, rebuild
`lib/data/market.generated.ts` from them, install, gate (§5), then `gcloud run deploy --source .`
with the profile's complete env and secret set. The profiles in that file are the only copy;
the sections below explain each one and are not commands to paste.

The recordings pull matters: the repository's recordings trail the published ones — the scheduled
job does not commit — so a deploy built from the repository alone puts the board back on the
committed window until the next evening's run. Pass `_PULL_RECORDINGS=false` only when you ran
`scripts/refresh_sectors.py --execute` yourself and your recordings are newer than the bucket's.

What is uploaded is the working tree minus `.gitignore`'d files: uncommitted edits ship,
`.env.local` does not. Deploy from a clean tree when the revision should match a commit. `_COMMIT`
labels the service with it (`commit=<sha>`), since source deploys carry no commit metadata of their
own; record it in the pull request as well.

The same run moves the scheduled refresh (§10) onto what it just deployed. That job rebuilds and
redeploys the app from a source tarball through a body inlined into its scheduler job, so a stale
tarball or body makes each refresh that lands a session roll the app back — on 25 September 2026 it
redeployed the previous day's code. After a green deploy, the `sync-workers` step:

- copies `gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz` to
  `refresh-source.prev-<UTC stamp>.tgz` and the job's current body to `refresh-body.prev-<UTC stamp>.json`;
- uploads this build's workspace (taken after the recordings pull, before `node_modules`) as the new
  `refresh-source.tgz`;
- replaces the `catalyst-data-refresh` body with `scripts/refresh_job_body.py`'s output, which is
  rendered and checked before the deploy, so a broken body stops the release before anything changes;
- does the same for the nightly web-watch screen (§10b): `screen-source.tgz` (only `scripts/screen`)
  and the `catalyst-web-watch-screen` body, with `screen-source.prev-<UTC stamp>.tgz` and
  `screen-body.prev-<UTC stamp>.json` kept beside them. The body is rendered from
  `cloudbuild-screen.yaml`'s defaults, and the render fails unless the screen step carries `--apply`,
  so a release can neither leave the screen on old code nor turn it back into a dry-run.

If the sync fails, the app is deployed and the worker still runs its previous source: the build is
red, and re-running the release repairs it. To put the worker back by hand:

```bash
gcloud storage cp gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.prev-<STAMP>.tgz \
  gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz
gcloud storage cp gs://ada-sectors-508410_cloudbuild/catalyst/refresh-body.prev-<STAMP>.json /tmp/body.json
gcloud scheduler jobs update http catalyst-data-refresh --location=us-central1 \
  --message-body-from-file=/tmp/body.json
```

`_DRY_RUN=true` runs every step, the gate included, and changes nothing — no deploy, no upload, no
job update. Use it to prove a pipeline edit before it touches production.

`catalyst-web-watch` needs no sync: it is an HTTP call to the app's `/api/internal/check-sources`,
so its code ships with every deploy.

Follow the run with `gcloud builds log --stream <BUILD_ID> --region=us-central1`, then verify (§7).

### 6a0. `_PROVIDER=deepseek` — the bandelbanget.xyz gateway (live since 2026-09-25)

Equivalent single command, for reference and for a deploy without Cloud Build:

```bash
gcloud run deploy catalyst-web \
  --source . \
  --project=ada-sectors-508410 \
  --region=us-central1 \
  --service-account=catalyst-run@ada-sectors-508410.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=8080 --cpu=1 --memory=512Mi --concurrency=80 --max-instances=3 --timeout=300 \
  --set-env-vars=AGENT_MODE=llm,LLM_PROVIDER=openai-compatible,LLM_BASE_URL=https://bandelbanget.xyz/v1,LLM_MODEL=deepseek-v4-flash,LLM_RATE_LIMIT_STRIKES=3,LLM_REASONING=off,LLM_REASONING_FIELD=thinking,LLM_SCHEMA_MODE=prompt,COPILOT_RETRIEVAL=on,GCS_CACHE_BUCKET=katalis-recorded \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,INTERNAL_CRON_SECRET=INTERNAL_CRON_SECRET:latest,SECTORS_API_KEY=SECTORS_API_KEY:latest,OPERATOR_TOKEN=OPERATOR_TOKEN:latest,LLM_API_KEY=LLM_API_KEY:latest
```

Needs an image containing `7c5000d`; on an older image `LLM_SCHEMA_MODE` and
`LLM_REASONING_FIELD` are read by nothing and every answer falls back. Rolling back to Gemini
from this revision is §6b, or `gcloud run services update ... --remove-env-vars=LLM_PROVIDER`.

### 6a. `_PROVIDER=openrouter` — OpenRouter

Equivalent single command:

```bash
gcloud run deploy catalyst-web \
  --source . \
  --project=ada-sectors-508410 \
  --region=us-central1 \
  --service-account=catalyst-run@ada-sectors-508410.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=8080 --cpu=1 --memory=512Mi --concurrency=80 --max-instances=3 --timeout=300 \
  --set-env-vars=AGENT_MODE=llm,LLM_PROVIDER=openai-compatible,LLM_BASE_URL=https://openrouter.ai/api/v1,LLM_MODEL=nex-agi/nex-n2.5-mini:free,LLM_RATE_LIMIT_STRIKES=3,LLM_REASONING=off,COPILOT_RETRIEVAL=on,GCS_CACHE_BUCKET=katalis-recorded \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,INTERNAL_CRON_SECRET=INTERNAL_CRON_SECRET:latest,SECTORS_API_KEY=SECTORS_API_KEY:latest,OPERATOR_TOKEN=OPERATOR_TOKEN:latest,LLM_API_KEY=LLM_API_KEY:latest
```

`GEMINI_MODEL` / `GEMINI_MODEL_CHEAP` are deliberately absent: inert under `openai-compatible`,
and the built-in defaults keep a rollback working without them. `GOOGLE_API_KEY` stays mounted
but unused — costless, and removing `LLM_PROVIDER` alone then rolls back to Gemini with no new
secret version. `LLM_REASONING=off` is load-bearing (see §2), not cosmetic.

### 6b. `_PROVIDER=gemini` — Gemini (fallback)

Equivalent single command:

```bash
gcloud run deploy catalyst-web \
  --source . \
  --project=ada-sectors-508410 \
  --region=us-central1 \
  --service-account=catalyst-run@ada-sectors-508410.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=8080 --cpu=1 --memory=512Mi --concurrency=80 --max-instances=3 --timeout=300 \
  --set-env-vars=AGENT_MODE=llm,GEMINI_MODEL=gemini-3.8-flash,GEMINI_MODEL_CHEAP=gemini-3.5-flash-lite,LLM_RATE_LIMIT_STRIKES=3,COPILOT_RETRIEVAL=on,GCS_CACHE_BUCKET=katalis-recorded \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,INTERNAL_CRON_SECRET=INTERNAL_CRON_SECRET:latest,SECTORS_API_KEY=SECTORS_API_KEY:latest,OPERATOR_TOKEN=OPERATOR_TOKEN:latest
```

Unset `LLM_PROVIDER` means `gemini`, so no provider variable is needed. `LLM_RATE_LIMIT_STRIKES=3`
restores the per-key-quota behaviour: on Gemini the first 429 means the allowance is gone, so one
strike closes the gate (see §2). `LLM_API_KEY` and the `LLM_MODEL` group are dropped — fully
Gemini, no dangling OpenRouter secrets. Prerequisite: raise the AI Studio spend cap first
(`ai.studio/spend`) — on 2026-09-22 the key's project was capped and every model call answered
429. Priced at ~$16/month at 200 questions/day.

Dropping `INTERNAL_CRON_SECRET` in either variant makes `/api/internal/*` fail closed and breaks
the scheduler; dropping the `LLM_PROVIDER` group from 6a without switching to 6b silently keeps
whatever the image defaults to, so always deploy one complete variant.

Source deploys carry no commit metadata of their own. The pipeline's `_COMMIT` label is how a
revision is traced back to a commit; a hand-run command above has none, so record the commit in the
pull request when you deploy.

## 7. Verify after deploying

```bash
curl -s https://catalyst-web-ibyebnreqa-uc.a.run.app/api/health
# expect: {"status":"ok","dataAsOf":"…","windowSessions":…}

curl -s -o /dev/null -w '%{http_code}\n' https://catalyst-web-ibyebnreqa-uc.a.run.app/
# expect: 200

curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://catalyst-web-ibyebnreqa-uc.a.run.app/api/internal/check-sources
# expect: 401 — proves INTERNAL_CRON_SECRET is mounted

curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  -H 'content-type: application/json' \
  -d '{"question":"apa isi kasus ini","contextSymbol":"XXXX","profile":{…}}' \
  https://catalyst-web-ibyebnreqa-uc.a.run.app/api/chat
# expect: 400 — proves the image rejects a ticker no recording covers. Before
# `b9b2ff8` this answered 200 with an entry id of `case:XXXX` and a sentence
# about a different issuer, so a 200 here means the revision predates the fix.
```

All three were run on 18 September 2026 and returned exactly that.

## 8. Where to check things

Logs, newest first:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="catalyst-web"' \
  --limit=20 --freshness=1d \
  --format="value(timestamp,severity,httpRequest.requestUrl,httpRequest.status,jsonPayload.message)"
```

Errors only:

```bash
gcloud logging read \
  'resource.type="cloud_run_revision" AND resource.labels.service_name="catalyst-web" AND severity>=ERROR' \
  --limit=20 --freshness=7d --format="value(timestamp,jsonPayload.message,textPayload)"
```

Application log lines are structured, so read `jsonPayload.message`; `textPayload` is usually empty.

Stored state, all under one bucket:

```bash
gcloud storage ls gs://katalis-recorded/catalyst/
# catalyst/config/  catalyst/llm/  catalyst/memory/  catalyst/web-watch/
```

`catalyst/memory/{uid}.json` is per-user memory, `catalyst/llm/` is the LLM response cache,
`catalyst/web-watch/` is the web-watch registry and review queue, `catalyst/config/` is stored settings.

The review queue (`catalyst/web-watch/queue.json`) is triaged on the way in by every sweep. The
items that were pending before triage shipped are triaged only by the backfill route, which is a
dry-run unless told otherwise:

```bash
curl -s -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" -H 'content-type: application/json' \
  -d '{}' https://catalyst-web-ibyebnreqa-uc.a.run.app/api/internal/web-watch-triage
# dry-run: counts per rule with sampled titles and reasons, writes nothing

curl -s -X POST -H "Authorization: Bearer $INTERNAL_CRON_SECRET" -H 'content-type: application/json' \
  -d '{"apply":true}' https://catalyst-web-ibyebnreqa-uc.a.run.app/api/internal/web-watch-triage
# writes: archived items keep their rule and reason and can be restored from Pantau
```

Scheduled work: one Cloud Scheduler job, `catalyst-web-watch` in `us-central1`, `30 17 * * 1-5`
Asia/Jakarta, enabled, which POSTs to
`https://catalyst-web-ibyebnreqa-uc.a.run.app/api/internal/check-sources`
(`gcloud scheduler jobs describe catalyst-web-watch --location=us-central1`). The
`catalyst-refresh` job described in the old plan does not exist; the only Cloud Run job in the
project is `katalis-refresh` in `asia-southeast2`, which belongs to a different application.

Consoles:

- Service: https://console.cloud.google.com/run/detail/us-central1/catalyst-web/metrics?project=ada-sectors-508410
- Logs: https://console.cloud.google.com/run/detail/us-central1/catalyst-web/logs?project=ada-sectors-508410
- Secrets: https://console.cloud.google.com/security/secret-manager?project=ada-sectors-508410
- Bucket: https://console.cloud.google.com/storage/browser/katalis-recorded/catalyst?project=ada-sectors-508410
- Scheduler: https://console.cloud.google.com/cloudscheduler?project=ada-sectors-508410

## 9. Roll back

```bash
gcloud run revisions list --service=catalyst-web --region=us-central1 --limit=5
gcloud run services update-traffic catalyst-web --region=us-central1 \
  --to-revisions=catalyst-web-00036-9k4=100
```

Send traffic back to `LATEST` with `--to-latest` once the fix is deployed.

## 10. Scheduled data refresh

`cloudbuild-refresh.yaml` re-records the Sectors feeds, rebuilds
`lib/data/market.generated.ts` from them, runs the gate of §5, and deploys only if it passes. A
red gate aborts the build and leaves the serving revision untouched.

| What | Value |
|---|---|
| Scheduler job | `catalyst-data-refresh`, `30 7,17,19,21 * * 1-5` Asia/Jakarta, region `us-central1` |
| Target | Cloud Build REST `projects/ada-sectors-508410/locations/us-central1/builds`, inline build body |
| Build identity | `1019003607640-compute@developer.gserviceaccount.com` |
| Source | `gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz` |
| State between runs | `gs://ada-sectors-508410_cloudbuild/catalyst/recordings` — the recordings last deployed, and `_ledger.jsonl`; `…/catalyst/staged-recordings` — recordings a try paid for but could not deploy |
| Cost per try | 37 credits when it lands a new session (prices, IHSG, foreign flow); 85 when news, filings and broker summaries are 3+ days old and come along; 1 when Sectors has not published yet; 0 once landed |

Each try:

1. **restore** — pulls the published recordings and the ledger, then overlays the staged
   recordings when an earlier try left some (after the ledger, which the staged copy carries an
   older version of).
2. **refresh** — `refresh_sectors.py --adopt --probe --slow-every 3`: takes the published
   recordings when they reach a later session than the snapshot, asks the one-credit IHSG window
   first, and only if IHSG holds a session the recordings lack fetches daily prices and foreign
   flow (36 more), plus news, filings and broker summaries once their window is three days old
   (48 more — about twice a week). Then compares the last
   session on disk with `dataAsOf` from `/api/health` and writes `deploy` or `skip`.
3. **save-ledger** — always, so probe credits are counted too.
4. **stage-recordings** — only on `deploy`, before the gate: copies `data/sectors` to
   `staged-recordings`, so a red gate or a failed deploy no longer throws away what was bought.
   On 28 Sep 2026 the 17:30 and 19:30 tries each paid 85 credits for the same recordings, failed
   the gate, and published nothing. The first try with staging (29 Sep, build `822cf1c4`) paid
   37 credits for 28 Sep, went red on a test, and staged the set. The retry after the test fix
   (build `5dae68e2`) adopted it instead of buying it again.
5. **install → gate → deploy → publish-recordings** — only on `deploy`. Publishing removes the
   staged copy.

Three tries an evening and one the next morning, because Sectors does not say when a session is
published. On 28 Sep 2026 the 21:30 try still found IHSG ending on 25 Sep; before the 07:30 try
existed, a session published after 21:30 reached the board only the next evening. The morning try
costs the one-credit probe when nothing is new. "Already
current" is judged by the rows, not the filename: on 23 Sep 2026 a hand refresh at 13:05 WIB
asked for `end-2026-09-23` while the market was open and got only the 22 Sep close; the 17:30 run
read the filename, spent nothing, and left the board on 22 Sep. Comparing with `/api/health` also
means a manual deploy that shipped older recordings is undone by the next try.

Check what happened on a given evening:

```bash
gcloud builds list --region=us-central1 --limit=5
gcloud builds log <BUILD_ID> --region=us-central1 | grep -E 'probe|adopt|status|wrote'
gcloud storage cat gs://ada-sectors-508410_cloudbuild/catalyst/recordings/_ledger.jsonl | wc -l
curl -s https://catalyst-web-ibyebnreqa-uc.a.run.app/api/health
```

The refresh deploys with no `--set-env-vars` or `--set-secrets`, so the new revision inherits the
serving revision's provider and keys. Until 25 September 2026 it pinned the Gemini set of §6b, and
its 17:30 run that day (build `db77fb53`, revision `catalyst-web-00082-wp2`) undid the DeepSeek
deploy of that afternoon. A scheduler body posted before that fix still does this.

The scheduler POSTs an inline copy of the build, not `cloudbuild-refresh.yaml`. A change to the
steps reaches the scheduled run only after the job body is replaced as well as the snapshot:

```bash
python3 scripts/refresh_job_body.py > /tmp/refresh-body.json
gcloud scheduler jobs update http catalyst-data-refresh --location=us-central1 \
  --message-body-from-file=/tmp/refresh-body.json
```

This is the one thing that ships without a human. Pushing a branch still deploys nothing.

### Which feeds move when

`scripts/build_market_data.py` derives the timeline from the intersection of the IHSG dates with
every symbol's daily dates, so a feed's eighteen symbols always move together — refreshing a
subset cannot advance the intersection. Feeds do not have to move together: each recording is
found by its own window, and what the build derives from news and foreign flow is dated by that
feed's own coverage, never by the price date (a lagging news window must not read as a drop in
coverage). To stretch the grant, raise `_SLOW_EVERY` or thin the cadence, not the symbol list:

```bash
gcloud scheduler jobs update http catalyst-data-refresh --location=us-central1 \
  --schedule="30 7,17,19,21 * * 1,4"  # twice a week instead of five times
gcloud scheduler jobs pause catalyst-data-refresh --location=us-central1
```

### The source snapshot

The scheduled build runs from a tarball in GCS, not from git, because no Cloud Build trigger is
connected to the GitHub repository. Every release through `cloudbuild-deploy.yaml` replaces the
tarball and the job body with what it deployed (§6). The hand upload below is only for a change to
the worker that ships without an app release. Upload it without running the pipeline (a `gcloud builds submit` would spend credit
and deploy):

```bash
git archive --format=tar.gz -o /tmp/refresh-source.tgz HEAD
gcloud storage cp gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz \
  gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.prev-$(date +%F).tgz
gcloud storage cp /tmp/refresh-source.tgz gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz
```

Data is not affected by a stale snapshot: each try adopts the published recordings when they are
later, and a window call costs the same credit whether it spans a day or a month.

### Refreshing by hand

Pull the published recordings first (§6) — otherwise the plan re-asks days the scheduled run has
already paid for.

```bash
python3 scripts/refresh_sectors.py                 # plan and cost, spends nothing
python3 scripts/refresh_sectors.py --execute       # needs SECTORS_API_KEY; add --all for every feed
python3 scripts/build_market_data.py
```

## 10b. Nightly web-watch screen (live — applying)

**Status on 28 Sep 2026: live, applying.** `catalyst-web-watch-screen` runs with `--apply` (the
default of `_APPLY` in `cloudbuild-screen.yaml` since then) from `screen-source.tgz`; every release
re-syncs both (§6, `sync-workers`), so an edit to `cloudbuild-screen.yaml` or `scripts/screen/`
reaches the job by deploying, not by hand.
The first run on 26 Sep (build `330aa522`) left all 65 pending items residual; the cause was the
int8 model file, which scores near-uniform on Cloud Build's CPU (see the Model cache row). The FP32
dry-run (build `c1ec6312`) matched the offline replay exactly: 1 accept, 6 relevance rejects,
58 residual, every verdict agreeing with the labels. The route held the accept back as residual
("belum ada usulan terverifikasi"). A person read the six rejects, and the first applied run
(build `cd5d2f19`, 08:10 UTC, all 65 scores reused from the cache) wrote them: Pantau shows
"Penyaringan terakhir", Antrean 59, all under "Perlu keputusan", Terindikasi Rumor 0. The queue on
that day held no rumor article, so the empty rumor tab is expected; the golden replay quarantines
two of its six rumor articles and no clean one.

What changes when this branch ships:

- The sweep (`check-sources`) no longer accepts anything by itself. Deep-filter phase 1 moved
  every decision without a person into one route, `POST /api/internal/web-watch-decide`.
- A Cloud Build job, `cloudbuild-screen.yaml`, reads the pending items from that route's `GET`,
  scores each one with a local multilingual NLI model (no LLM call), and posts one verdict per item:
  accept, reject or residual.
- The route runs the figure check against the recordings compiled into the serving revision, then
  applies the verdicts through the same generation-guarded write every queue change uses. The build
  never writes `queue.json`.
- **Rumor rejects quarantine; other rejects need a calibrated check.** A `rumor` or
  `misleading-title` verdict moves the item to the Terindikasi Rumor tab with its match and
  proposal, and a reviewer either disputes it back to Antrean (`dispute-rumor`, human-only
  afterwards via `noAuto`) or confirms it finally (`dismiss-suspected`). A substance or
  relevance "no" rejects only when that check is calibrated (`T` with n ≥ 50); until then the
  item is residual, with the would-be reason prefixed "cek belum terkalibrasi" (since 28 Sep,
  after a household gas-network release was rejected as irrelevant to PGAS). A reject keeps
  its check, the span, the score and — since 28 Sep — the pending item itself; the screen never
  undoes it, but a reviewer can (`restore-reject` with a reason, "Kembalikan ke antrean" under
  Diputuskan otomatis), which puts the item back human-only. A reject written before 28 Sep
  comes back with its title and address only. An accept can still be undone from Pantau, and
  residual items wait in Pantau under "Perlu keputusan".

| What | Value |
|---|---|
| Scheduler job | `catalyst-web-watch-screen`, `30 22 * * 1-5` Asia/Jakarta, region `us-central1`. It runs after the last refresh try (21:30), so the figure check reads that evening's recordings. |
| Target | Cloud Build REST `projects/ada-sectors-508410/locations/us-central1/builds`, inline build body |
| Build identity | `1019003607640-compute@developer.gserviceaccount.com` (same as §10) |
| Source | `gs://ada-sectors-508410_cloudbuild/catalyst/screen-source.tgz` |
| Model cache | `gs://katalis-recorded/catalyst/web-watch/models/mdeberta-v3-base-xnli-multilingual-nli-2mil7`, holding the FP32 `model.onnx`. The first run fills it from Hugging Face. Never the int8 `model_quantized.onnx`: on Cloud Build's x86 CPU (AVX2, no VNNI) it scores every pair near-uniform, which is why the first dry-run left all 65 items residual. `screen.py` refuses to screen when its self-check pairs fail. |
| Score cache | `gs://katalis-recorded/catalyst/web-watch/screen-scores.json`: logits per pending item, keyed by the item's text and hypotheses and by the model file. A night scores only new or changed items; a change to `lib/web-watch/hypotheses.ts` or the model rescores everything. |
| Runtime | About 34 seconds per item scored on the default machine (65 items, 37 minutes, probe build `daed4cff`, 28 Sep); cached items cost nothing. `timeout: 7200s` covers a full rescore of about 190 items. Do not add `machineType`. |
| Kill switch | The Pantau toggle "Putuskan otomatis", or `WEB_WATCH_AUTO_DECIDE=false` on the service (this pins it). With either one off, the route answers `{ applied: false, disabled: true }` and writes nothing. |

Changing the screen after setup: edit `cloudbuild-screen.yaml` or `scripts/screen/`, commit, and
deploy (§5–§6). The release's `sync-workers` step uploads the new tarball and replaces the job's
body in apply mode; nothing below needs to be run again. For a one-off dry-run, render the body with
`--sub _APPLY=` (step 4), run the job once, and deploy again or re-render without `--sub` to go back to
applying.

The first setup, done 26–28 Sep 2026, ran these in order:

1. **Deploy the branch** (§5 gate, then §6). Ask which model and provider first. Then check that the
   route exists and that it refuses a request without the bearer:

   ```bash
   curl -s -o /dev/null -w '%{http_code}\n' https://catalyst-web-ibyebnreqa-uc.a.run.app/api/internal/web-watch-decide   # expect 401
   ```

2. **Grant the build identity what the job reads and writes.** Check the current policy first,
   because the refresh job may already hold part of it:

   ```bash
   gcloud secrets get-iam-policy INTERNAL_CRON_SECRET
   gcloud secrets add-iam-policy-binding INTERNAL_CRON_SECRET \
     --member=serviceAccount:1019003607640-compute@developer.gserviceaccount.com \
     --role=roles/secretmanager.secretAccessor
   gcloud storage buckets get-iam-policy gs://katalis-recorded
   # The model cache step reads objects, and creates them on the first run. If the identity
   # cannot create objects in this bucket, grant roles/storage.objectCreator on it, or fill the
   # cache once by hand from scripts/screen/.model/.
   ```

3. **Upload the source snapshot.** The job builds from a tarball, not from git, the same as §10. The
   tarball holds `scripts/screen/`, including `calibration.json`, so commit first:

   ```bash
   git archive --format=tar.gz -o /tmp/screen-source.tgz HEAD scripts/screen
   gcloud storage cp /tmp/screen-source.tgz gs://ada-sectors-508410_cloudbuild/catalyst/screen-source.tgz
   ```

4. **Create the job as a dry-run.** `--sub _APPLY=` empties the flag, so the route reports what the
   verdicts would do and writes nothing:

   ```bash
   python3 scripts/refresh_job_body.py --config cloudbuild-screen.yaml \
     --snapshot-object catalyst/screen-source.tgz --sub _APPLY= > /tmp/screen-body.json
   gcloud scheduler jobs create http catalyst-web-watch-screen --location=us-central1 \
     --schedule="30 22 * * 1-5" --time-zone=Asia/Jakarta \
     --uri=https://cloudbuild.googleapis.com/v1/projects/ada-sectors-508410/locations/us-central1/builds \
     --http-method=POST --headers=Content-Type=application/json \
     --message-body-from-file=/tmp/screen-body.json \
     --oauth-service-account-email=1019003607640-compute@developer.gserviceaccount.com \
     --oauth-token-scope=https://www.googleapis.com/auth/cloud-platform
   gcloud scheduler jobs run catalyst-web-watch-screen --location=us-central1
   ```

5. **Read the dry-run report.** The build log prints the route's answer: counts of accept, reject
   and residual, sampled titles for each, and the figure-check results. Read every reject in it.

   ```bash
   gcloud builds list --region=us-central1 --limit=3
   gcloud builds log <BUILD_ID> --region=us-central1 | tail -80
   ```

6. **Switch to apply, only after a person has read that report.** `--apply` is the YAML's default:

   ```bash
   python3 scripts/refresh_job_body.py --config cloudbuild-screen.yaml \
     --snapshot-object catalyst/screen-source.tgz > /tmp/screen-body.json
   gcloud scheduler jobs update http catalyst-web-watch-screen --location=us-central1 \
     --message-body-from-file=/tmp/screen-body.json
   ```

Stop it:

```bash
gcloud scheduler jobs pause catalyst-web-watch-screen --location=us-central1
gcloud run services update catalyst-web --region=us-central1 --update-env-vars=WEB_WATCH_AUTO_DECIDE=false
```

Calibration. `scripts/screen/calibration.json` was fitted on labels that Claude wrote and that no
person has reviewed yet (`labeledBy` says so). Every decision a person makes on a residual item is
stored with `fromResidual: true` in `queue.json`: these are the labels to review and refit from.
A fitted temperature is written as `T`, and used, only when it lowers the check's expected
calibration error and lies inside the search grid; otherwise it is kept as `T_fit` and the check
stays on the strict floor. On the 28 Sep fit (FP32 scores) every check was refused: rumor and
substance because the fit raised the error, title and relevance because the fit ran to the grid's
T = 20, which only flattens every probability toward the base rate. The screen therefore runs on
the strict floor everywhere until better labels or a better hypothesis make a fit pay. Scores from
one model file never calibrate another: after the int8 → FP32 switch the file was refit. To refit: dump the live
payload (`GET` the decide route with the bearer), then

```bash
python3 scripts/screen/replay.py --payload queue-payload.json --golden-payload golden-payload.json \
  --labels tests/fixtures/web-watch-pending-labels.json --golden tests/fixtures/web-watch-golden.json \
  --calibration scripts/screen/calibration.json --scores scores.json          # scores every item once
python3 scripts/screen/calibrate.py --scores scores.json \
  --labels tests/fixtures/web-watch-pending-labels.json --golden tests/fixtures/web-watch-golden.json
```

re-run the replay against the new file and its hard gate, commit, and deploy: the release ships the
new `calibration.json` to the job.

## 11. Rotate a secret

```bash
printf %s "$NEW_VALUE" | gcloud secrets versions add GOOGLE_API_KEY --data-file=-
gcloud run services update catalyst-web --region=us-central1 \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,INTERNAL_CRON_SECRET=INTERNAL_CRON_SECRET:latest,SECTORS_API_KEY=SECTORS_API_KEY:latest,OPERATOR_TOKEN=OPERATOR_TOKEN:latest
```

A new secret version does not reach a running revision on its own — the service needs a new
revision, which the `update` above creates.

## 12. Which document to trust

| Document | Status |
|---|---|
| `docs/DEPLOY.md` (this file) | Current. Verified against the live project on 18 Sep 2026. |
| `README.md` | Current for the product model and local commands. Says nothing about deployment. |
| `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md` | Design plan, 17 Sep 2026. Useful for intent and for the decision record. Its deploy section is out of date: bucket `catalyst-recorded` was never created, `catalyst-memory` sits empty, the `catalyst-refresh` job and the Cloud Build trigger do not exist, and secret `OPERATOR_TOKEN` is missing from its list. |
| `docs/IMPLEMENTATION-PLAN-NO-DUMMY.md`, `docs/KICKOFF-PROMPT.md`, `docs/superpowers/plans/*` | Historical. They record what was planned on their dates, not what runs now. |
| Root-level `e2e-*.md`, `*-prompt.md`, `failure-test-part3-report.md`, `docs/PLAN-E2E-PROD-REMEDIATION.md` | Untracked working notes from 14–17 Sep 2026 sessions. They never reach a clone, and they target revision `catalyst-web-00033-gmn` or older while `00037-d9g` is live. Do not treat them as instructions. |
