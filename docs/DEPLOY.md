# Deploy and operate Catalyst on GCP

Every value in this file was read from the live project on **18 September 2026** with the
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
| Serving revision | `catalyst-web-00037-d9g`, created 2026-09-18T00:59:28Z, 100% of traffic | `gcloud run revisions list --service=catalyst-web --region=us-central1` |
| Image | `us-central1-docker.pkg.dev/ada-sectors-508410/cloud-run-source-deploy/catalyst-web@sha256:1deccf1f…` | `gcloud run revisions describe` |
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
- `GEMINI_MODEL=gemini-3.5-flash`
- `GCS_CACHE_BUCKET=katalis-recorded`

Secrets mounted from Secret Manager, all at version `latest`: `GOOGLE_API_KEY`,
`INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`, `OPERATOR_TOKEN`
(`gcloud secrets list` shows exactly these four).

`GCS_MEMORY_BUCKET` is not set. `lib/memory/gcs-memory.ts` falls back to `katalis-recorded`, so
user memory is written there, not to the `catalyst-memory` bucket. The `catalyst-memory` bucket
exists in `US-CENTRAL1` but is empty and unused; the design plan's `catalyst-recorded` bucket was
never created.

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

Do not deploy with a red gate. `pnpm test:e2e` (Playwright) is the slower local check and is worth
running when UI or routing changed.

## 6. Deploy

One command, run from the repository root on the branch you want live:

```bash
gcloud run deploy catalyst-web \
  --source . \
  --project=ada-sectors-508410 \
  --region=us-central1 \
  --service-account=catalyst-run@ada-sectors-508410.iam.gserviceaccount.com \
  --allow-unauthenticated \
  --port=8080 --cpu=1 --memory=512Mi --concurrency=80 --max-instances=3 --timeout=300 \
  --set-env-vars=AGENT_MODE=llm,GEMINI_MODEL=gemini-3.5-flash,GCS_CACHE_BUCKET=katalis-recorded \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,INTERNAL_CRON_SECRET=INTERNAL_CRON_SECRET:latest,SECTORS_API_KEY=SECTORS_API_KEY:latest,OPERATOR_TOKEN=OPERATOR_TOKEN:latest
```

`--set-env-vars` and `--set-secrets` replace the whole set each time, so keep every entry in the
command even when you are only changing one of them. Dropping `INTERNAL_CRON_SECRET` makes
`/api/internal/*` fail closed and breaks the scheduler.

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

## 10. Rotate a secret

```bash
printf %s "$NEW_VALUE" | gcloud secrets versions add GOOGLE_API_KEY --data-file=-
gcloud run services update catalyst-web --region=us-central1 \
  --set-secrets=GOOGLE_API_KEY=GOOGLE_API_KEY:latest,INTERNAL_CRON_SECRET=INTERNAL_CRON_SECRET:latest,SECTORS_API_KEY=SECTORS_API_KEY:latest,OPERATOR_TOKEN=OPERATOR_TOKEN:latest
```

A new secret version does not reach a running revision on its own — the service needs a new
revision, which the `update` above creates.

## 11. Which document to trust

| Document | Status |
|---|---|
| `docs/DEPLOY.md` (this file) | Current. Verified against the live project on 18 Sep 2026. |
| `README.md` | Current for the product model and local commands. Says nothing about deployment. |
| `docs/PLAN-REAL-DATA-AGENT-DEPLOY.md` | Design plan, 17 Sep 2026. Useful for intent and for the decision record. Its deploy section is out of date: bucket `catalyst-recorded` was never created, `catalyst-memory` sits empty, the `catalyst-refresh` job and the Cloud Build trigger do not exist, and secret `OPERATOR_TOKEN` is missing from its list. |
| `docs/IMPLEMENTATION-PLAN-NO-DUMMY.md`, `docs/KICKOFF-PROMPT.md`, `docs/superpowers/plans/*` | Historical. They record what was planned on their dates, not what runs now. |
| Root-level `e2e-*.md`, `*-prompt.md`, `failure-test-part3-report.md`, `docs/PLAN-E2E-PROD-REMEDIATION.md` | Untracked working notes from 14–17 Sep 2026 sessions. They never reach a clone, and they target revision `catalyst-web-00033-gmn` or older while `00037-d9g` is live. Do not treat them as instructions. |
