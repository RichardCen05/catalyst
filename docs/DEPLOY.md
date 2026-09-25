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
| Serving revision | `catalyst-web-00077-5tc`, deployed 2026-09-25, 100% of traffic. Built from `7c5000d` on `feat/alief/wire-ui` (source deploys carry no commit): everything in `00076-55v`, plus `origin/main` merged in (`730b0e5`: Pantau shows the accepted list above the queue and collapses each long list to three rows; case outcome card; learning corrections accepted on save; steadier causal-chain edges), and two opt-in provider variables (`7c5000d`, see §2). Runs `openai-compatible` against `https://bandelbanget.xyz/v1` with `deepseek-v4-flash`, `LLM_SCHEMA_MODE=prompt`, `LLM_REASONING=off`, `LLM_REASONING_FIELD=thinking`, `LLM_RATE_LIMIT_STRIKES=3`, on recordings pulled from the scheduled refresh (data as of 23 Sep). Verified live on this revision: `/api/health` ok, `/`, `/pantau` and `/favicon.ico` 200, `/api/internal/check-sources` 401 without the bearer, `contextSymbol: "XXXX"` answers 400, six live `/api/chat` questions answered 200 with no `llmFallbackNote`, and the revision log has no error, fallback or rejection line | `gcloud run revisions list --service=catalyst-web --region=us-central1`, `gcloud logging read ... revision_name="catalyst-web-00077-5tc"` |
| Image | `us-central1-docker.pkg.dev/ada-sectors-508410/cloud-run-source-deploy/catalyst-web@sha256:9d939d79f8737…` | `gcloud run revisions describe` |
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

Pull the recordings the scheduled refresh last deployed before you build. The repository's
recordings trail them — the scheduled job does not commit — so deploying without this step puts
the board back on the committed window until the next evening's run. It costs no credit:

```bash
gcloud storage rsync gs://ada-sectors-508410_cloudbuild/catalyst/recordings data/sectors \
  --recursive --delete-unmatched-destination-objects
python3 scripts/build_market_data.py      # the bundle's asOf should now match the live board
```

Commit the refreshed `data/sectors/` and `lib/data/market.generated.ts` if you want the repository
to catch up; the deploy does not need it.

### 6a0. With the bandelbanget.xyz gateway (live since 2026-09-25)

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

### 6a. With OpenRouter

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
| Scheduler job | `catalyst-data-refresh`, `30 17,19,21 * * 1-5` Asia/Jakarta, region `us-central1` |
| Target | Cloud Build REST `projects/ada-sectors-508410/locations/us-central1/builds`, inline build body |
| Build identity | `1019003607640-compute@developer.gserviceaccount.com` |
| Source | `gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz` |
| State between runs | `gs://ada-sectors-508410_cloudbuild/catalyst/recordings` — the recordings last deployed, and `_ledger.jsonl` |
| Cost per try | 37 credits when it lands a new session (prices, IHSG, foreign flow); 85 when news, filings and broker summaries are 3+ days old and come along; 1 when Sectors has not published yet; 0 once landed |

Each try:

1. **restore** — pulls the published recordings and the ledger.
2. **refresh** — `refresh_sectors.py --adopt --probe --slow-every 3`: takes the published
   recordings when they reach a later session than the snapshot, asks the one-credit IHSG window
   first, and only if IHSG holds a session the recordings lack fetches daily prices and foreign
   flow (36 more), plus news, filings and broker summaries once their window is three days old
   (48 more — about twice a week). Then compares the last
   session on disk with `dataAsOf` from `/api/health` and writes `deploy` or `skip`.
3. **save-ledger** — always, so probe credits are counted too.
4. **install → gate → deploy → publish-recordings** — only on `deploy`.

Three tries an evening because Sectors does not say when a session is published. "Already
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
  --schedule="30 17,19,21 * * 1,4"  # twice a week instead of five times
gcloud scheduler jobs pause catalyst-data-refresh --location=us-central1
```

### The source snapshot

The scheduled build runs from a tarball in GCS, not from git, because no Cloud Build trigger is
connected to the GitHub repository. Code changes do not reach the scheduled run until the snapshot
is replaced. Upload it without running the pipeline (a `gcloud builds submit` would spend credit
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

## 10b. Nightly web-watch screen (to run — not created yet)

**Status on 25 Sep 2026: nothing in this section exists in the live project.** The code is on
`feat/alief/wire-ui`, uncommitted, and not deployed. Revision `catalyst-web-00073-c2g` still
auto-accepts inside the 17:30 sweep (§1). The commands below are what a person runs, in order, once
the branch is committed and deployed. Update this section to "live" only after they have run.

What changes when this branch ships:

- The sweep (`check-sources`) no longer accepts anything by itself. Deep-filter phase 1 moved
  every decision without a person into one route, `POST /api/internal/web-watch-decide`.
- A Cloud Build job, `cloudbuild-screen.yaml`, reads the pending items from that route's `GET`,
  scores each one with a local multilingual NLI model (no LLM call), and posts one verdict per item:
  accept, reject or residual.
- The route runs the figure check against the recordings compiled into the serving revision, then
  applies the verdicts through the same generation-guarded write every queue change uses. The build
  never writes `queue.json`.
- **Rejects are final.** A rejected item keeps its check, the span the check read and the score, and
  it never returns to the queue. An accept can still be undone from Pantau, and residual items wait
  in Pantau under "Perlu keputusan".

| What | Value (planned) |
|---|---|
| Scheduler job | `catalyst-web-watch-screen`, `30 22 * * 1-5` Asia/Jakarta, region `us-central1`. It runs after the last refresh try (21:30), so the figure check reads that evening's recordings. |
| Target | Cloud Build REST `projects/ada-sectors-508410/locations/us-central1/builds`, inline build body |
| Build identity | `1019003607640-compute@developer.gserviceaccount.com` (same as §10) |
| Source | `gs://ada-sectors-508410_cloudbuild/catalyst/screen-source.tgz` |
| Model cache | `gs://katalis-recorded/catalyst/web-watch/models/mdeberta-v3-base-xnli-multilingual-nli-2mil7`. The first run fills it from Hugging Face. |
| Runtime | About 15 minutes for 50 pending items on the default machine; `timeout: 3600s`. Do not add `machineType`. |
| Kill switch | The Pantau toggle "Putuskan otomatis", or `WEB_WATCH_AUTO_DECIDE=false` on the service (this pins it). With either one off, the route answers `{ applied: false, disabled: true }` and writes nothing. |

Run these in order:

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

4. **Create the job as a dry-run.** `_APPLY` is empty in the YAML, so the route reports what the
   verdicts would do and writes nothing:

   ```bash
   python3 scripts/refresh_job_body.py --config cloudbuild-screen.yaml \
     --snapshot-object catalyst/screen-source.tgz > /tmp/screen-body.json
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

6. **Switch to apply, only after a person has read that report:**

   ```bash
   python3 scripts/refresh_job_body.py --config cloudbuild-screen.yaml \
     --snapshot-object catalyst/screen-source.tgz --sub _APPLY=--apply > /tmp/screen-body.json
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
After a refit, re-run the offline replay and its hard gate (`scripts/screen/replay.py`), then upload
a new snapshot (step 3). A change to `cloudbuild-screen.yaml` needs the job body replaced as well
(step 6, with or without `--sub _APPLY=--apply`, whichever the job runs now).

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
