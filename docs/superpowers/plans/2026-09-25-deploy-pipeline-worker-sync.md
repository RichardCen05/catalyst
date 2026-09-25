# Deploy Pipeline With Worker Sync Implementation Plan

> **For agentic workers:** REQUIRED SUB-SKILL: Use superpowers:subagent-driven-development (recommended) or superpowers:executing-plans to implement this plan task-by-task. Steps use checkbox (`- [ ]`) syntax for tracking.

**Goal:** One `gcloud builds submit --config cloudbuild-deploy.yaml` deploys the web app and brings the scheduled refresh worker (its source snapshot and its scheduler job body) into step with what was deployed, so the refresh can never again redeploy older code or a different model.

**Architecture:** `cloudbuild-deploy.yaml` gains three steps: `snapshot` (tar the exact uploaded source after the recordings pull), `render-worker-body` (run `scripts/refresh_job_body.py` before the deploy, so a broken body stops the release before anything changes), and `sync-workers` (after the deploy: back up the current snapshot and job body, upload the new snapshot, replace the job body). `_DRY_RUN=true` runs everything except the deploy and the sync. `cloudbuild-refresh.yaml` deploys with no env or secret flags, so it inherits the serving revision's provider.

**Tech Stack:** Cloud Build, Cloud Run (`gcloud run deploy --source`), Cloud Scheduler (HTTP target → Cloud Build REST), GCS, Python 3.12 + PyYAML (body renderer), vitest (regression guard).

**Spec:** this conversation, 2026-09-25: "put the workers on Cloud Build too", plus two live defects found on revision `catalyst-web-00082-wp2` (refresh build `db77fb53`, 17:30 WIB):
1. the refresh deploy step pinned the Gemini env set, undoing the DeepSeek deploy;
2. the refresh builds from `gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz` dated 2026-09-24 12:12 UTC, so it redeployed a day-old app (761 tests vs 895+ at HEAD).

## Global Constraints

- Project `ada-sectors-508410`, region `us-central1`, service `catalyst-web`, runtime SA `catalyst-run@ada-sectors-508410.iam.gserviceaccount.com`.
- Build identity `1019003607640-compute@developer.gserviceaccount.com` (has `roles/editor`, `roles/run.admin`, `roles/iam.serviceAccountUser`, `roles/secretmanager.secretAccessor`).
- Snapshot object `catalyst/refresh-source.tgz` in bucket `ada-sectors-508410_cloudbuild` — the name `scripts/refresh_job_body.py` already posts.
- Scheduler job `catalyst-data-refresh`; only its message body changes. Schedule, target, OAuth and retry stay as they are.
- Provider is a per-deploy decision: `_PROVIDER` has no default (memory: always ask model/provider on deploy). This run: `deepseek` (user confirmed "ya").
- Never ship uncommitted work-in-progress: the first deploy goes from a clean worktree of HEAD (`27d97bb`) plus only this plan's files.
- `catalyst-web-watch` (Scheduler → `POST /api/internal/check-sources`) stays an HTTP call to the app; its code ships with the app image. Not touched.
- `cloudbuild-screen.yaml` (§10b) has no scheduler job yet; not touched. When it is created, the same sync step extends to it.
- No hard-coded reader-facing values (AGENTS.md) — this change touches only deploy config and docs.

## Review Focus

1. **Snapshot differs from the deployed source** — the tarball must be taken from the same `/workspace` the deploy uploads, after the recordings pull, before `node_modules` exists. Guard: test asserts step order `pull-recordings → build-bundle → snapshot → install`.
2. **Deploy succeeds, sync fails** — the refresh would then keep redeploying the old snapshot. Expected: the build goes red (visible), backups exist, and re-running the pipeline repairs it. Guard: `sync-workers` has `set -euo pipefail`; manual check in Task 4.
3. **Body renderer broken in the build image** (`yaml` module missing in `cloud-sdk:slim`) — must fail before the deploy. Guard: `render-worker-body` runs in `python:3.12` with `pip install pyyaml`, ordered before `deploy`; test asserts that order.
4. **Refresh re-pins a provider** — any `--set-env-vars`/`--set-secrets` in the refresh deploy step reintroduces defect 1. Guard: test asserts neither flag appears in `cloudbuild-refresh.yaml`.
5. **A profile drops a secret the app needs** — dropping `INTERNAL_CRON_SECRET` breaks the web-watch scheduler (fail-closed 401). Guard: test asserts every profile's secret set carries the four base secrets, and the LLM gateway profiles carry `LLM_API_KEY`.

---

### Task 1: Worker sync steps in `cloudbuild-deploy.yaml`

**Files:**
- Modify: `cloudbuild-deploy.yaml`
- Create: `tests/deploy-pipeline.test.ts`

**Interfaces:**
- Consumes: `scripts/refresh_job_body.py` (prints the job body JSON to stdout; reads `cloudbuild-refresh.yaml`; needs PyYAML).
- Produces: substitutions `_PROVIDER` (required: `deepseek|openrouter|gemini|keep`), `_COMMIT`, `_PULL_RECORDINGS` (default `true`), `_DRY_RUN` (default `false`), `_SNAPSHOT` (default `gs://ada-sectors-508410_cloudbuild/catalyst/refresh-source.tgz`), `_REFRESH_JOB` (default `catalyst-data-refresh`). Workspace files `_snapshot.tgz`, `_refresh-body.json`.

- [ ] **Step 1: Write the failing test** — `tests/deploy-pipeline.test.ts` reads both YAML files as text and asserts: step ids in order `check-provider, pull-recordings, build-bundle, snapshot, render-worker-body, install, gate, deploy, sync-workers`; refresh deploy step contains neither `--set-env-vars` nor `--set-secrets`; each of the three profiles names `GOOGLE_API_KEY`, `INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`, `OPERATOR_TOKEN` (via `BASE_SECRETS`) and `deepseek`/`openrouter` add `LLM_API_KEY`; `_SNAPSHOT` ends with the object `refresh_job_body.py` posts (`catalyst/refresh-source.tgz`).
- [ ] **Step 2: Run** `pnpm vitest run tests/deploy-pipeline.test.ts` — expect FAIL (no `snapshot`, `render-worker-body`, `sync-workers` steps).
- [ ] **Step 3: Implement** the three steps and `_DRY_RUN` guard in `deploy` and `sync-workers`:
  - `snapshot` (`cloud-sdk:slim`): `tar -czf /tmp/s.tgz --exclude=./_snapshot.tgz --exclude=./_refresh-body.json -C /workspace . && mv /tmp/s.tgz /workspace/_snapshot.tgz`.
  - `render-worker-body` (`python:3.12`): `pip install -q pyyaml && python3 scripts/refresh_job_body.py > _refresh-body.json && python3 -c 'json.load(...)'` sanity check that the deploy step carries no `--set-env-vars`.
  - `sync-workers` (`cloud-sdk:slim`, after `deploy`): stamp `TS=$(date -u +%Y%m%dT%H%MZ)`; copy the current snapshot to `refresh-source.prev-$TS.tgz`; save the current job body (`gcloud scheduler jobs describe --format='value(httpTarget.body)' | base64 -d`) to `catalyst/refresh-body.prev-$TS.json`; upload `_snapshot.tgz` to `_SNAPSHOT`; `gcloud scheduler jobs update http "$_REFRESH_JOB" --location=$_REGION --message-body-from-file=_refresh-body.json`.
- [ ] **Step 4: Run** the test — expect PASS. Run `bash -n` on each step script (with `$$` → `$`) and `yaml.safe_load` both files.
- [ ] **Step 5:** Do not commit (user has not asked); list the files at the end.

### Task 2: Docs

**Files:** Modify `docs/DEPLOY.md` §6 and §10.

- [ ] §6: add `_DRY_RUN` and the sync behaviour ("the release also replaces the refresh snapshot and job body; backups `refresh-source.prev-<ts>.tgz`, `refresh-body.prev-<ts>.json`"); rollback = copy both backups back and `gcloud scheduler jobs update http ... --message-body-from-file`.
- [ ] §10 "The source snapshot": the pipeline now replaces it on every release; the hand upload is for a worker-only change.

### Task 3: Verify before touching production

- [ ] Full local gate on the main tree: `pnpm lint && pnpm typecheck && pnpm vitest run --exclude tests/zz-live.test.ts` — must match the pre-change pass count plus the new test.
- [ ] Clean worktree of HEAD at `$SCRATCH/deploy-src`; copy in only `cloudbuild-deploy.yaml`, `cloudbuild-refresh.yaml`, `tests/deploy-pipeline.test.ts`, `docs/DEPLOY.md`. `git -C $SCRATCH/deploy-src status` shows only those.
- [ ] Record the pre-state: serving revision, its env, the current job body (saved to scratch), snapshot object generation.
- [ ] Dry run from the worktree: `gcloud builds submit --config cloudbuild-deploy.yaml --region=us-central1 --substitutions=_PROVIDER=deepseek,_DRY_RUN=true,_COMMIT=27d97bb`. Expect SUCCESS; log shows `snapshot` size, rendered body OK, gate green, `deploy`/`sync-workers` print skip. Confirm nothing changed: same serving revision, same job `userUpdateTime`, same snapshot generation.

### Task 4: Release and check

- [ ] Real run: same command with `_DRY_RUN=false`. Expect SUCCESS.
- [ ] Service: new revision serving 100%; env has `LLM_PROVIDER=openai-compatible`, `LLM_MODEL=deepseek-v4-flash`, secret `LLM_API_KEY`; label `commit=27d97bb`.
- [ ] §7 probes: `/api/health` 200 with `dataAsOf` 2026-09-24; `/` 200; `/api/internal/check-sources` 401; chat with `XXXX` → 400; one real chat question answers with a model generator (not fallback); `/pantau` contains "Terindikasi Rumor" (today's feature back).
- [ ] Worker: snapshot object updated (new generation, today's time), `.prev-<ts>` exists; job body decoded equals `_refresh-body.json` from the build and its deploy step has no `--set-env-vars`; `refresh-body.prev-<ts>.json` exists.
- [ ] End-to-end worker check: `gcloud scheduler jobs run catalyst-data-refresh` (costs 1 probe credit; if Sectors has published 2026-09-25 it spends ~37 and deploys, which the 21:30 run would do anyway). Expect the build to pass; if it deploys, the new revision keeps DeepSeek env and the new code.
- [ ] Update DEPLOY.md §1/§2 serving revision line if it names one.
