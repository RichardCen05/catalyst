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
| Serving revision | `catalyst-web-00061-ctm`, deployed 2026-09-23, 100% of traffic. Source commit untracked (source deploys carry none) — built by the scheduled refresh (§11) from `be706ef` on `feat/alief/wire-ui`. Running the Gemini variant (§6b) with `LLM_RATE_LIMIT_STRIKES=3`. Live `/api/fact` calls return model-written prose over the 2026-09-22 window, so the AI Studio cap that produced 429s on 2026-09-22 is lifted | `gcloud run revisions list --service=catalyst-web --region=us-central1`, `gcloud run services describe ... --format="value(status.traffic...)"`, `gcloud logging read ... "llm-fallback"` |
| Image | `us-central1-docker.pkg.dev/ada-sectors-508410/cloud-run-source-deploy/catalyst-web@sha256:cd0cbab4…` | `gcloud run revisions describe` |
| Service account | `catalyst-run@ada-sectors-508410.iam.gserviceaccount.com` | `gcloud run services describe` |
| Sizing | cpu 1, memory 512Mi, concurrency 80, max instances 3, port 8080, request timeout 300s | `gcloud run revisions describe` |
| Access | unauthenticated — `roles/run.invoker` is granted to `allUsers` | `gcloud run services get-iam-policy catalyst-web --region=us-central1` |

The image lives in the `cloud-run-source-deploy` repository, which means the service is deployed
from source with `gcloud run deploy --source .`. There is no `cloudbuild.yaml` in this repository
and no Cloud Build trigger (`gcloud builds triggers list` returns nothing), so **no deploy happens
automatically on push**. Every release is a manual command run by a person with project access.

## 2. Runtime configuration on the live revision

Plain environment variables:

- `AGENT_MODE=llm`
- `LLM_PROVIDER=openai-compatible`
- `LLM_BASE_URL=https://openrouter.ai/api/v1`
- `LLM_MODEL=nex-agi/nex-n2.5-mini:free`
- `LLM_RATE_LIMIT_STRIKES=3`
- `LLM_REASONING=off`
- `COPILOT_RETRIEVAL=on`
- `GCS_CACHE_BUCKET=katalis-recorded`

Secrets mounted from Secret Manager, all at version `latest`: `GOOGLE_API_KEY`, `LLM_API_KEY`,
`INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`, `OPERATOR_TOKEN` (`gcloud secrets list` shows exactly
these five).

The image on this revision contains `fc5a247` (`feat(llm): select the model provider by
environment`), so the OpenRouter variables above are read and the effective provider is
OpenRouter. Every earlier revision set the same variables on an image that predated that commit
and silently kept calling Gemini, which is why an env-only change is not a provider change:
`LLM_PROVIDER` is read by code, so switching it requires an image that contains the code.
Verified 2026-09-22 on `catalyst-web-00054-gvr`: two live `/api/chat` calls returned 200 with no
`llmFallbackNote`, and this revision's logs carry no AI Studio error.

`GEMINI_MODEL` and `GEMINI_MODEL_CHEAP` are inert under `openai-compatible` (see
`lib/agent/llm/models.ts`) and are no longer set; the built-in Gemini defaults keep a rollback
working without them. `GOOGLE_API_KEY` stays mounted either way — costless while unused, and a
rollback without it needs a new secret version plus a new revision.

Measured before the switch, over 40-request bursts against the real answer path,
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

The live revision runs `openai-compatible` against OpenRouter, on an image that reads the
variable. This section describes how the selection works and how to move it.

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

The gate runs on your machine, not inside the image:

```bash
pnpm lint && pnpm typecheck && pnpm test && pnpm build
```

`pnpm build` runs `prebuild` first, which regenerates `lib/data/chrome.generated.ts` from the JSX
in `app/` and `components/`. That happens again inside the image build, so the registry a deployed
revision answers from is always built from the source it was built with — a heading edited without
`pnpm chrome:build` can no longer ship a stale index. `tests/chrome-registry.test.ts` still fails on
a stale committed file, so the diff stays honest too; commit the regenerated file with the change.

Do not deploy with a red gate. `pnpm test:e2e` (Playwright) is the slower local check and is worth
running when UI or routing changed.

## 6. Deploy

Two variants — pick one. Both run from the repository root on the branch you want live, and
both build the image from current source (required: the provider switch only exists in code
containing `fc5a247`). `--set-env-vars` and `--set-secrets` replace the whole set each time,
so each command below is complete on its own: never mix half of one with half of the other.

### 6a. With OpenRouter (current recommendation)

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

### 6b. With Gemini (fallback)

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

Source deploys carry no commit metadata, so the serving revision cannot be traced back to a commit
from the console. Record the commit in the pull request when you deploy.

## 7. Verify after deploying

```bash
curl -s https://catalyst-web-ibyebnreqa-uc.a.run.app/api/health
# expect: {"status":"ok","dataAsOf":"…","windowSessions":…}

curl -s -o /dev/null -w '%{http_code}\n' https://catalyst-web-ibyebnreqa-uc.a.run.app/
# expect: 200

curl -s -o /dev/null -w '%{http_code}\n' -X POST \
  https://catalyst-web-ibyebnreqa-uc.a.run.app/api/internal/check-sources
# expect: 401 — proves INTERNAL_CRON_SECRET is mounted
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
`catalyst/web-watch/` is the web-watch registry, `catalyst/config/` is stored settings.

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
| Scheduler job | `catalyst-data-refresh`, `30 17 * * 1-5` Asia/Jakarta, region `us-central1` |
| Target | Cloud Build REST `projects/ada-sectors-508410/locations/us-central1/builds`, inline build body |
| Build identity | `1019003607640-compute@developer.gserviceaccount.com` |
| Source | `gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz` |
| Cost | 85 Sectors credits per run that advances the window; 0 when it is already current |

This is the one thing that ships without a human. Pushing a branch still deploys nothing.

### Why the whole window moves at once

`scripts/build_market_data.py` loads daily, news, filings and foreign-flow for all eighteen
symbols at one shared window, and derives the timeline from the intersection of the IHSG dates
with every symbol's daily dates. Refreshing a subset cannot advance that intersection — the
unrefreshed symbols hold it back — and the build fails on filenames that no longer exist. The way
to stretch a non-renewable grant is therefore a longer cadence, not a narrower scope:

```bash
gcloud scheduler jobs update http catalyst-data-refresh --location=us-central1 \
  --schedule="30 17 * * 1,4"        # twice a week instead of five times
gcloud scheduler jobs pause http catalyst-data-refresh --location=us-central1
```

### The source snapshot

The scheduled build runs from a tarball in GCS, not from git, because no Cloud Build trigger is
connected to the GitHub repository. Code changes do not reach the scheduled run until the snapshot
is replaced:

```bash
gcloud builds submit --config=cloudbuild-refresh.yaml --region=us-central1   # also validates it
gcloud storage cp "gs://ada-sectors-508410_cloudbuild/source/<the tarball just uploaded>.tgz" \
  gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz
```

Data is not affected by a stale snapshot: `scripts/refresh_sectors.py` extends from whatever
window the snapshot carries to today in one call per feed, and a window call costs the same credit
whether it spans a day or a month.

### Refreshing by hand

```bash
python3 scripts/refresh_sectors.py                 # plan and cost, spends nothing
python3 scripts/refresh_sectors.py --execute       # needs SECTORS_API_KEY
python3 scripts/build_market_data.py
```

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
