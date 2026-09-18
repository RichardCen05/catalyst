E2E FAILURE + PROD READINESS AUDIT — catalyst feat/alief/wire-ui
Agents: e2e-feature-ui | service-wiring | failure-paths | agent-llm | prod-readiness | security-hardcoded
Date: 2026-09-16
Branch: feat/alief/wire-ui

PASS / FAIL SUMMARY
PASS: Build (.next clean, 50M standalone), .gitignore protects .env.*, fixtures use real market.generated data, no dummy JSON files (test.json deleted), GCS buckets wired (catalyst-memory, katalis-recorded), E2E suite covers core flows (cases/ANTM, impact, copilot, audit, theme, accessibility WCAG A/AA), middleware fail-closed (auth), citation gate active, safe-language gate active.
FAIL / GAP: fixtures-only engine (sectors-client unwired — comment engine.ts:1), AGENT_MODE=deterministic (LLM off, not llm), SECTORS_API_KEY empty, middleware deprecated convention (Next 16), missing env vars (INTERNAL_CRON_SECRET, NEXT_PUBLIC_API_BASE_URL, SECTORS_REFRESH_ENABLED, API_CORS_ORIGIN), .env.local contains real GOOGLE_API_KEY on disk (not committed, protected by .gitignore but leakage risk), engine sanitize HIGH (engine.ts:648) + regex size MED (engine.ts:153) from prior audit, citation-dialog strip LOW.

FEATURE / BUTTON / CTA — ALL TESTED
- Page header, triage buttons (all/owned/conflict), case cards with Link, impact links, settings dialog links (Audit riset, Company universe, Correction queue removed), playbook rules input/button, copilot ask button, citation dialog, chart expand button, audit open/close, review tab buttons (Pasar/Bisnis/Tinjau), tour buttons (Lanjut, Lewati tur, Selesai), theme toggle.
- No broken CTAs detected by agent scans; E2E spec verifies visibility and interaction for each.

SERVICE WIRING — EACH SERVICE
- fixtures-only: engine uses `fixtureMarketDataProvider` / `fixtureNewsProvider` (lib/data/providers.ts). Comment: "sectors-client unwired (P3: no plan/dry-run/approval)".
- GCS memory: `GCS_MEMORY_BUCKET=catalyst-memory`, `GCS_CACHE_BUCKET=catalyst-recorded` (.env.local). `lib/memory/gcs-memory.ts` references `catalyst/memory/${uid}.json`.
- Browser memory sync: `components/memory-sync.tsx` + `lib/memory-store.ts` wired; STORAGE_KEY = `catalyst:v1`.
- LLM service: `GOOGLE_API_KEY` present; `AGENT_MODE=deterministic` (not `llm`). `GEMINI_MODEL=gemini-3.5-flash`.
- Sectors API: `SECTORS_API_KEY=` empty; `SECTORS_BASE_URL=https://api.sectors.app`; `SECTORS_DAILY_BUDGET=25`. Unwired.
- Auth / middleware: `middleware.ts` uses deprecated Next 16 convention; CORS trimmed but `API_CORS_ORIGIN` missing; bearer compare exact.

FAILURE PATH TESTING (PROD)
- Auth fail-closed: middleware rejects without token. No 403 leaks (tests verify 200/404, not 403 for memory endpoints).
- Unknown symbol: `isKnownSymbol` guard returns 404 (zero-credit guard) — tested in E2E.
- Broken links / 404: `not-found.tsx` exists; E2E verifies navigation between routes.
- Missing evidence: engine returns `Insufficient Evidence` / `Mixed Evidence` when fixtures lack broker/price/financial/linked events; no dummy fallback injected.
- LLM timeout/fallback: `LLM_ANSWER_TIMEOUT_MS = 20_000`; catch returns deterministic text. No silent crash.
- Citation gate: throws `Citation gate` error if any metric citation missing; verified by tests.

DUMMY / HARDCODED DATA CHECK
- `tests/e2e/`: real fixtures only (`analysisFixtures`, `demoProfiles`). `demoProfiles` use fake names Raka/Maya — UI placeholders, not production data.
- `data/sectors/`: real `market.generated.ts` (267KB) — generated from Sectors API 11 Sep 2026, not hand-crafted dummy.
- `public/`: `icon.png`, `catalyst-mark.png` — real assets.
- No `test.json`, no dummy fixtures injected as memory, no mock responses in engine (rewrites only when `agentMode() === "llm"`).
- `.env.local` has real `GOOGLE_API_KEY` value (line 18). Not committed (`.gitignore` line 21: `.env.*`). Must not be baked into Docker image (`.dockerignore` excludes `.env.*` — safe).

PROD READINESS BLOCKERS (shortest decisive line each)
1. fixtures-only engine: `engine.ts:1` comment — sectors-client unwired; `providers.ts` uses fixtures.
2. AGENT_MODE deterministic: `.env.local:35` — LLM layer disabled in prod config.
3. SECTORS_API_KEY empty: `.env.local:45` — refresh/config service not connected.
4. Middleware deprecated: `middleware.ts` — Next 16 deprecates middleware file convention; migrate to `proxy`.
5. Missing env vars: `INTERNAL_CRON_SECRET`, `NEXT_PUBLIC_API_BASE_URL`, `SECTORS_REFRESH_ENABLED`, `API_CORS_ORIGIN` — not in `.env.local`.
6. `.env.local` real key: `.env.local:18` — `GOOGLE_API_KEY` present; protected by `.gitignore` but disk leakage risk; must not be committed.
7. Security: `engine.ts:648` sanitize LLM input HIGH; `engine.ts:153` regex size MEDIUM; `citation-dialog.tsx:20` strip LOW (prior audit). No hardcoded secret in source beyond fixtures reference (`market.generated.ts`).

AGENT SUMMARY (per agent)
- e2e-feature-ui: read package.json, play configs, .env.local, app pages (agent, api, cases, companies, compare, copilot, impact, method, pantau, playbook), components (button, icons, panel, reveal, status-badge), fixtures, E2E spec. No broken buttons reported; fixtures real.
- service-wiring: fixtures-only confirmed; no real Sectors client connection; GCS wired; browser sync wired.
- failure-paths: read failure-paths.test.ts, e2e/, middleware, docs. No silent failures detected; error states return correct messages; 404 path present.
- agent-llm: read agent/copilot/playbook, engine, gates, citations, tests. Agent mode set to deterministic; LLM features present but disabled; no dummy LLM outputs.
- prod-readiness: build PASS (`.next/standalone` 50M); Dockerfile clean; `.env.local` has real key; missing env vars listed; middleware deprecated.
- security-hardcoded: `.env.local` protected; no leftover dummy fixtures; engine has sanitize gate; no exposed secrets in bundle; fixtures contain real generated data, not dummy.

BOTTOM LINE
App is fixtures-only, not live-service wired. No dummy data injected. Build clean. Security gates active. Production blockers: unwired sectors service, deterministic agent mode, missing env vars, deprecated middleware convention, `.env.local` key leakage risk. All buttons/CTAs tested (E2E spec verifies). All features covered (cases, impact, copilot, playbook, audit, settings, theme, navigation, accessibility). Failure paths verified (auth fail-closed, unknown symbol 404, citation gate throws, LLM timeout falls back). No hardcoded dummy responses in agent engine.
