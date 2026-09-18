Session prompt — copy this into another Claude session.

Project: /Users/af/dumpProject/catalyst (branch feat/alief/wire-ui)
File: e2e-complete-prompt.md (in same repo)
Deploy URL: https://catalyst-web-1019003607640.us-central1.run.app
Real GCS: gs://katalis-recorded (US-EAST1), gs://catalyst-memory (US-CENTRAL1)
SA: catalyst-run@ada-sectors-508410.iam.gserviceaccount.com (objectAdmin on both)
Auth: use real identity token (gcloud auth print-identity-token — afindo.mi01@gmail.com)
Env: .env.local (GCS_MEMORY_BUCKET=catalyst-memory, AGENT_MODE=deterministic, GOOGLE_CLOUD_LOCATION=us-central1)
Wired: fixtures-only engine (sectors-client unwired), browserMemoryStore wired (memory-sync + gcs-memory), no dummy JSON (catalyst/memory/test.json removed).

Run:
1. Read e2e-complete-prompt.md
2. Execute case 1-9 (case 9 PARALLEL with 1-8): auth, memory sync, causal graph, cases, impact, deploy check, naming/docs, full gate (lint/type/test/build direct, no Semgrep), browser click (Playwright: /app/cases, /app/impact, memory-sync storage key check, /api/* response data confirmation).
3. Report PASS/FAIL per case with shortest decisive error line. No dummy data. Real GCS/reference only.
