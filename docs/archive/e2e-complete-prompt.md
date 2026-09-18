E2E test prompt — complete, no dummy data, everything wired.

Project: /Users/af/dumpProject/catalyst. Branch: feat/alief/wire-ui.
Deploy URL: https://catalyst-web-1019003607640.us-central1.run.app (only service after cleanup: katalis-api deleted, old catalyst-web asia-southeast2 deleted).
Real GCS: gs://katalis-recorded (US-EAST1), gs://catalyst-memory (US-CENTRAL1). SA: catalyst-run@ada-sectors-508410.iam.gserviceaccount.com (objectAdmin on both). Auth: use real identity token (gcloud auth print-identity-token — account afindo.mi01@gmail.com).
Env: .env.local (GCS_MEMORY_BUCKET=catalyst-memory, GCS_CACHE_BUCKET=catalyst-recorded, GOOGLE_CLOUD_LOCATION=us-central1, AGENT_MODE=deterministic, GOOGLE_API_KEY set).
Wired: fixtures-only (sectors-client unwired — comment in lib/agent/engine.ts). browserMemoryStore wired (components/memory-sync.tsx + lib/memory-store.ts). GCS memory reference added (lib/memory/gcs-memory.ts). No dummy data: catalyst/memory/test.json deleted; use real bucket content or note absence.

Test cases (run in order, no skips):
1. Auth: GET /api/memory with Bearer token (expect 200 or 404, NOT 403). POST /api/memory with symbol+profile (expect 200 or 404, NOT 403). Confirm SA grants active (gcs-memory + katalis-recorded).
2. Memory sync: components/memory-sync.tsx loads profile from localStorage (STORAGE_KEY = "catalyst:v1"). Check hydration effect runs; no dummy file used. Confirm GCS path reference (lib/memory/gcs-memory.ts line 19: catalyst/memory/${uid}.json).
3. Causal graph: POST /api/causal-graph with valid symbol (expect 200 with graph or 404 if no evidence). Check isKnownSymbol guard; unknown symbol returns 404 (zero-credit guard).
4. Cases: GET /app/cases (expect 200). Confirm no dummy fixture leakage; engine uses fixtures (analysisFixtures, demoProfiles, WINDOW_SESSIONS).
5. Impact: GET /app/impact (expect 200). Confirm analysis + graph rendered when data exists; 404 when missing.
6. Deploy: confirm only one service (catalyst-web us-central1). Confirm region aligned (.env.local, docs, deploy URL). Confirm duplicate services deleted (katalis-api, old catalyst-web asia-southeast2).
7. Naming: confirm .remember/logs/ exists (memory-2026-09-13.log, memory-2026-09-14.log, hook-errors.log). Confirm catalyst/memory/ directory exists; if empty, report gap (no dummy JSON inserted). Confirm docs/PLAN-REAL-DATA-AGENT-DEPLOY.md references updated (no katalis-api, region us-central1 for service, us-east1 for bucket).
8. Full gate (direct, no Semgrep): pnpm lint (expect 0 errors, ~46 warnings), pnpm typecheck (clean), pnpm test (61 passed), pnpm build (PASS). Report exact error lines if any fail.
9. Browser agent click test (run PARALLEL with cases 1-8): open deployed URL https://catalyst-web-1019003607640.us-central1.run.app in browser (Playwright). Click /app/cases link. Verify page loads with cases list (no dummy fixture data; fixtures-only mode). Click /app/impact. Verify impact page loads (analysis + graph or 404 when missing). Click memory-sync component; verify localStorage STORAGE_KEY = "catalyst:v1" set. Click /api/memory (via browser/network or page interaction) — verify response data, not 403 (with auth) or dummy data. Confirm every click shows expected real data (no dummy JSON, real GCS reference, fixtures-only engine). Report PASS/FAIL per interaction with shortest decisive line.

Constraints:
- No dummy data. No test.json. No fixtures injected as real memory.
- Everything wired: fixtures-only engine, memory-sync + browserMemoryStore, GCS reference live.
- Use real GCS buckets (not mock). Use real deploy URL. Use real identity token for auth.
- Report PASS/FAIL per case. Quote shortest decisive error line for any FAIL. End with summary table.
