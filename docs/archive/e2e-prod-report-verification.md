# Verification of e2e-prod-report.md — independent re-check

Date: 2026-09-17. Verified against the live Cloud Run service, not the local `.env.local`.
Service: `catalyst-web`, region `us-central1`, revision `catalyst-web-00033-gmn`, image digest `sha256:1057a833c483d59a275e4a3fc01f0926c96c8a3aa2b7972af5ab14d360428a97`.

## Method error that produced most of the wrong findings

The report describes production configuration by quoting `.env.local` lines. That file is the local development config and has no effect on Cloud Run. Production configuration must be read with:

```
gcloud run services describe catalyst-web --region=us-central1 --format=yaml
```

Actual production environment (from the command above):

| Variable | Production value |
|---|---|
| `AGENT_MODE` | `llm` |
| `GEMINI_MODEL` | `gemini-3.5-flash` |
| `GCS_CACHE_BUCKET` | `katalis-recorded` |
| `GOOGLE_API_KEY` | secretKeyRef `GOOGLE_API_KEY:latest` |
| `INTERNAL_CRON_SECRET` | secretKeyRef `INTERNAL_CRON_SECRET:latest` |
| `SECTORS_API_KEY` | secretKeyRef `SECTORS_API_KEY:latest` |
| `OPERATOR_TOKEN` | secretKeyRef `OPERATOR_TOKEN:latest` |
| `GCS_MEMORY_BUCKET` | **not set** |
| `LLM_DAILY_CALL_BUDGET` | **not set** |
| `SECTORS_DAILY_BUDGET` | **not set** |

## Corrections

1. **"LLM OFF IN PRODUCTION — AGENT_MODE=deterministic" — wrong.** Production runs `AGENT_MODE=llm` with the key mounted from Secret Manager. Timing corroborates: a chat call that reaches the model took 3.86s (`Kenapa ANTM bergerak?`), while the no-evidence deterministic path returned in 0.91s. Note the `mode: "recorded"` field in the response is a hardcoded string literal in `app/api/chat/route.ts:20` — it is not a signal of which path ran, and must not be read as one.
2. **"SECTORS SERVICE UNWIRED — SECTORS_API_KEY empty" — wrong.** The key is mounted in production. What *is* true: the scheduled refresh flag is off (`GET /api/settings/refresh` returns `"enabled": false`, `"source": "settings"`), which is the intended default.
3. **"MISSING ENV VARS — INTEGRAL_CRON_SECRET …" — wrong** (and the name is a typo for `INTERNAL_CRON_SECRET`). It is mounted as a production secret, which is exactly why `/api/internal/check-sources` returns 401 rather than 503.
4. **"budget=25, daily ceiling enforced" — conflates two different budgets.** 25 is the Sectors credit default (`SECTORS_DAILY_BUDGET`), not the model-call ceiling. `LLM_DAILY_CALL_BUDGET` is unset in production, and `.env.example` documents that an empty value means **no ceiling at all**. The ledger prefix `gs://katalis-recorded/catalyst/_ledger/llm/` does not exist — no LLM ledger objects have been written. The correct status is: **model calls are currently uncapped in production**, which is the opposite of the report's claim.
5. **"GCS memory (catalyst-memory): WIRED" — wrong bucket.** `GCS_MEMORY_BUCKET` is unset, so `lib/memory/gcs-memory.ts:17` falls back to `katalis-recorded`. `gs://catalyst-memory/` contains no objects. Memory is being written into the cache bucket.
6. **"GCS memory POST round-trip — PARTIAL/UNVERIFIED" — understated.** The round-trip works. A POST with a playbook followed by a GET on the same cookie returned the written value, and the object exists at `gs://katalis-recorded/catalyst/memory/e21ecd81-3611-4a16-828b-f7963997b993.json`. Status is PASS, in the fallback bucket.
7. **"/pantau titles present — PASS" — wrong.** `GET /api/web-watch` shows 6 weather candidates whose `title` *and* `summary` are both a raw JSON slice, e.g. `{"lokasi":{"adm1":"63","adm2":"63.09",…`. The reviewer-title fix (`lib/web-watch/json-summary.ts`, commit `ec19eb7`) covers the quake shape in code, but the queued candidates still carry pre-fix titles — they were queued before the fix was deployed and are never re-derived.
8. **Weather causal chain — no longer "UNTESTED"; it is confirmed missing, and the cause is known.** `POST /api/causal-graph` for PTBA (minRelevance 0, scope market) returns 11 nodes: 1 company, 5 source, 5 mechanism — with sourceType `sectors`, `macro`, `commodity` only. There is no weather node, and also no `observation` or `business-impact` terminal node at all. Root cause is upstream of the graph builder: the watch queue holds **56 pending / 2 accepted**, the 2 accepted are both news items (`web-src-bi-news-aad4f1fe`, `web-src-cnbc-news-2ebb8a72`), and all 6 weather candidates are still pending. Nothing weather-related has ever entered the engine.
9. **Counts are internally inconsistent.** The table contains a row marked FAIL (Budget / LLM state) while the totals line reports `FAIL 0`. The same section reports both "Service: Gemini LLM — DEGRADED" and "/api/chat real model (ANTM) — PASS".
10. **"image digest aligns with branch" — not verified.** No provenance check was run. The digest is recorded above; matching it to a commit still needs doing.

## Claims that hold up

Health endpoint (200, `dataAsOf` 2026-09-11, 28 sessions); `/api/internal/check-sources` returns 401 with no header and 401 with a wrong bearer; unknown symbol `ZZZZ` returns 404; path traversal on `/cases/..%2f..` returns 404; Sectors refresh flag is off with the plan list intact; seed counts (5 forecast enabled, 1 quake enabled, 1 warning disabled as JS-rendered); no dummy data injected; `middleware.ts` exists and uses the older convention.

## Recommended next steps, in order

1. **Re-run the source check to rebuild candidate titles**, using the production `INTERNAL_CRON_SECRET`, so the 6 weather candidates carry human titles instead of raw JSON. Reviewing a candidate whose title is an unreadable payload slice is how a bad accept happens.
2. **Review and accept the weather candidates** through `/pantau` with the operator token, then re-request the PTBA and ADRO causal graphs and confirm a weather node appears. This is the single change that makes the "sebab akibat for weather" feature visible. It is a production mutation, so it needs an explicit go-ahead.
3. **Decide the memory bucket.** Either set `GCS_MEMORY_BUCKET=catalyst-memory` on the service and redeploy, or drop the unused bucket and update the docs that name it. The current state — docs say one bucket, production writes to another — is the kind of drift that makes the next audit wrong again.
4. **Set `LLM_DAILY_CALL_BUDGET` on the service.** Production is currently uncapped against a free-tier quota, and no ledger has ever been written. After setting it, confirm an object appears under `gs://katalis-recorded/catalyst/_ledger/llm/<date>.json`.
5. **Close the eight untested items** from the original report: mobile 375px, theme persistence, command palette, guided tour, playbook persistence across reload, the full four-question copilot pass, and direct XSS and SSRF injection. These need a real browser, not curl.
6. **Reissue the report** once the above are known, with production environment facts and consistent counts.
