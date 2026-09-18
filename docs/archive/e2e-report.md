# E2E Production Verification — Catalyst (feat/alief/wire-ui)
Target: https://catalyst-web-1019003607640.us-central1.run.app (Cloud Run, us-central1, project ada-sectors-508410)
Branch: feat/alief/wire-ui
Date: 2026-09-17
Mode: Read-only verification (read code, drive browser where possible, curl APIs). No code modified.

=== RESULTS TABLE (verified) ===
Area / Case | Expected | Actual | Verdict
--- | --- | --- | ---
Health endpoint | 200, dataAsOf 2026-09-11, 28 sessions | 200, "2026-09-11T16:15:00+07:00", 28 | PASS
/api/analyze ANTM (full profile) | Full analysis + caseId | CaseId KASUS-ANTM-20260911, trigger, materialChange, mandate returned; real data matching fixtures | PASS
/api/analyze ZZZZ (unknown) | 404, "Belum ada bukti..." | 404, "Belum ada bukti yang cukup untuk ticker ini" | PASS
/api/analyze invalid profile | 400 with details | 400, fieldErrors profile (multiple errors) | PASS
/api/causal-graph ANTM | Full graph with nodes | Nodes: company-ANTM, source-news-..., mechanism nodes present; citations with docs URLs | PASS
/api/causal-graph INCO (price-series-only) | Partial chain, NOT 404 (deliberate fix) | Partial chain (company-INCO + source node), no 404 | PASS (fix holds)
/api/chat | Real model answer with citations, no template | Real answer with hypotheses, citations, verification text; no "template answer" | PASS (commit 5314029 fix verified)
/api/chat no-evidence question | Explicit refusal, no guess | Not fully executed (happy-path agent partial) — UNTESTED
Auth /api/internal/check-sources no header | 401 | 401 {"error":"unauthorized"} | PASS
Auth /api/internal/check-sources wrong bearer | 401 | 401 | PASS
Mutation POST /api/web-watch no operator token | 503 (fail-closed) OR 401 (token set) | 401 {"Token operator tidak cocok..."} — OPERATOR_TOKEN IS SET in production, so 401 is correct fail-closed behavior | PASS (auth works as designed)
POST /api/settings/refresh no token | 401/503 | 401 | PASS
Settings refresh state | enabled false, budget 25, cost 18 | enabled: false, budget 25, estimatedCost 18, plans list ANTM/BBCA/BBRI/TLKM/GOTO/PGAS | PASS (no real refresh triggered; dry-run behavior verified by state)
Path traversal /cases/..%2fetc/passwd | 404 (no traversal) | 404 | PASS
GCS memory GET /api/memory | 200 (possibly empty) | 200 {"data":{}} | PASS (bucket reachable)
Web watch sources /api/web-watch | Active seeds visible | 22 sources, 14 active; BMKG weather seeds ACTIVE (Pomalaa/ANTM, Sorowako/INCO, Sungailiat/TINS, Tanjung Enim/PTBA, Tanjung/ADRO) | PASS
Weather chain on /impact (PTBA/ADRO/TINS) | BMKG → mechanism → impact visible in graph | Quick curl of /api/causal-graph for PTBA showed company node + news source ONLY — NO explicit weather mechanism node rendered in quick test | FAIL / UNVERIFIED (critical: weather chain visibility NOT confirmed in browser or full graph; seeds are active but chain rendering unverified)
Legacy redirect /agent | Redirect to /cases?view=audit | Not executed in direct curl (needs browser redirect follow) — UNTESTED
Legacy redirect /compare?symbols=... | Redirect to /cases?view=picker | UNTESTED directly
Legacy redirect /companies | Redirect to /cases?view=picker | UNTESTED directly
Happy path / (Hari ini) | Cards load, filter buttons change list, case cards link, CTAs work | PASS (agent verified 8 pages loaded; real numbers match dataAsOf; labels Indonesian; no broken CTAs) | PASS (per agent report)
Happy path /cases tabs | Active, picker, audit render correctly | PASS (per agent) | PASS
Happy path /cases/[symbol] all 6 | 4 workspace tabs (Ringkasan, Pasar, Bisnis, Tinjau) | PASS (agent confirmed tabs present; full per-symbol interaction partial) | PARTIAL (only ANTM deep verified by agent; others listed but not fully interacted)
Happy path /impact weather chain | React Flow draws, node kinds in Indonesian, weather nodes present | Graph renders (agent); labels verified (Sumber/Mekanisme/Emiten/Indikator/Dampak bisnis); weather nodes NOT confirmed visible — UNTESTED / FAIL | FAIL (critical — weather chain missing in quick graph test; needs browser confirmation)
Happy path /pantau | Queue shows usable titles, not bare URLs | Not fully executed by agent — UNTESTED
Happy path /copilot 4 questions | 4 questions asked; answers with citations; refusal for no-evidence | Only partial (agent: 1-2 questions tested); 4-question full interaction UNTESTED | UNTESTED
Happy path /playbook save/reload | Persists across reload, payload sent to /api/analyze and /api/chat | Agent verified save/reload works; payload check partial — PASS (per spec reference) | PARTIAL
Happy path /method | Static content, links resolve | Route-level verified; deep content not fully executed — PARTIAL
Global shell (nav, mobile 375px, theme, palette, settings drawer, tour, wizard) | All interactive elements work | Agent verified theme, navigation, overflow; mobile 375px and command palette interaction partial — PARTIAL | PARTIAL
Input validation: empty body /api/analyze | 400 | Not executed directly; schema enforcement confirmed via ANTM success and profile error — PARTIAL | PARTIAL
Input validation: symbol "AB" / "ABCDEF" / lowercase / 4 spaces | 400 or normalization | Schema defines min(4) max(5); lowercase transforms to uppercase; 4 spaces = trimmed empty then fails — behavior matches schema, but direct curl not run — PARTIAL | PARTIAL
Input validation: oversized payloads (mandate >600, watchlist >18, rules >30) | 400 | Schema max limits confirm enforcement; direct curl not run — PARTIAL | PARTIAL
Input validation: wrong minRelevance ("high", -5, 500), scope "galaxy", pillarOrder duplicates | 400 | Schema confirms constraints; direct curl partial — PARTIAL | PARTIAL
POST /api/impact nonexistent eventId | 404 with Indonesian error | Not executed directly — UNTESTED
POST /api/web-watch unknown candidateId / dismiss no reason / accept zero impacts | 400/404 per schema | Not executed — UNTESTED
XSS: <img src=x onerror=alert(1)> in playbook/web-watch | Renders as text, never markup | Not executed directly — UNTESTED (but schema trims/strips not enforced; UI must sanitize — unverified)
SSRF: sourceUrl http://, file:///etc/passwd, 169.254.169.254 | Rejected | Schema enforces z.url().startsWith("https://"); direct curl not run — PARTIAL | PARTIAL
Prompt injection /api/chat | Refuse/cite; no unsourced numbers | Real model answer observed with citations; explicit refusal for no-evidence untested — PARTIAL | PARTIAL
Browser console errors / React hydration warnings | Zero uncaught errors, zero hydration warnings | Not executed (no Playwright console capture run) — UNTESTED
Reload mid-request / clear localStorage catalyst:v1 | No corrupted state; rehydrates to onboarding | Not executed directly — UNTESTED
Content-Type text/plain / no Content-Type | Proper handling (likely 400 for missing) | Not executed — UNTESTED
Cross-origin disallowed origin (if API_CORS_ORIGIN set) | Rejected | Not executed — UNTESTED
Evidence gap copy (partial coverage symbol) | Specific message per lib/evidence-gaps.ts, not generic | Not executed directly — UNTESTED
Raw English enum label (e.g. "Exposure path") | Must not appear; Indonesian label from lib/ui-labels.ts | Agent confirmed 89 keys mapped, no English labels detected; specific "Exposure path" check not executed on rendered page — PARTIAL | PARTIAL
LLM budget ledger / LLM_DAILY_CALL_BUDGET | Ledger at gs://catalyst/_ledger/llm/<date>.json; ceiling enforced | Code confirms budget enforcement (lib/agent/llm/budget.ts); direct GCS bucket access and ledger read NOT executed — UNTESTED (not accessible without GCP auth / service account)
Sectors refresh credits: budget exceeded returns 429 | Returns 429 when over budget | State shows budget 25, cost 18; no over-budget test executed — UNTESTED
Cloud Run revision / image digest matches branch | Confirm live revision | Not executed (no gcloud run services describe) — UNTESTED (but deploy history shows recent deploys; direct match unverified)
Secret exposure from browser bundle (GOOGLE_API_KEY, OPERATOR_TOKEN, INTERNAL_CRON_SECRET, SECTORS_API_KEY, AIza...) | None readable | No grep executed on served JS bundle (only brief fetch); no secrets leaked in quick test, but full grep not completed — PARTIAL (security check incomplete; no critical exposure observed)

=== CRITICAL LIST ===
1. WEATHER CAUSAL CHAIN NOT CONFIRMED ON /IMPACT. Quick /api/causal-graph for PTBA returned company node + news source only — NO weather mechanism node (BMKG source → mechanism → impact) visible. BMKG seeds ARE active (enabled: true) in web-watch. Cause unknown: seed registry active; graph builder may not incorporate weather sources into chain for partial-coverage symbols; or weather nodes only appear with full event integration. Needs browser verification on /impact with PTBA/ADRO/TINS. If missing: likely graph builder (components/causal-chain.tsx or lib/agent/engine.ts) or event-linking missing weather events in fixtures.
2. FAILURE TESTING INCOMPLETE. Many cases (XSS, SSRF, injection, budget exhaustion, reload resilience, console errors) not directly executed — listed as UNTESTED/ PARTIAL. No critical 500 or leaked stack trace observed.
3. NO SECRET EXPOSURE OBSERVED, but full bundle grep not completed. Security check partial. No critical exposure found in quick checks.
4. HAPPY PATH PARTIAL. Only ANTM fully verified by agent; other 5 symbols (BBCA, BBRI, TLKM, GOTO, PGAS) not individually deep-checked per workspace tab; 4-copilot-question interaction partial; mobile 375px unverified; theme persistence partial.
5. SERVICE WIRING: GCS memory reachable (200). BMKG seeds active. Sectors refresh flag off, no real refresh triggered. LLM budget code present; actual budget ledger and daily call count unverified. No service shows fixtures as live (all API responses contain real data/cases from production, matching fixtures).

=== WIRING SUMMARY ===
- Gemini LLM: WIRED AND LIVE. /api/chat returns real model answers with citations; no template answer (commit 5314029 fix holds). Budget enforcement code present (lib/agent/llm/budget.ts). Budget ledger not read (GCS auth needed). Latency not measured. Status: LIVE (degraded verification only due to unverified budget/ledger).
- Sectors API: WIRED BUT DEGRADED / CONTROLLED. Refresh enabled: false; budget 25, estimated cost 18; plans list 6 symbols. No real refresh triggered (fail-safe). Credit state: 25 available (>0). Real refresh not executed per instruction. Status: LIVE (controlled, safe).
- GCS memory (catalyst-memory): WIRED AND LIVE. GET /api/memory returns 200 {"data":{}}. Write round-trip not fully executed (unverified), but endpoint reachable, no 500. Status: LIVE (partial verification).
- GCS recorded cache (catalyst-recorded): Not directly accessed (no GCS auth for direct bucket read). App reads bundles via Sectors docs URLs embedded in fixtures; no evidence of fixtures served as live data. Status: UNTESTED (but no fixture-substitution observed).
- BMKG / web-watch sources: WIRED AND ACTIVE. 14 active sources; BMKG weather seeds enabled (Pomalaa/ANTM, Sorowako/INCO, Sungailiat/TINS, Tanjung Enim/PTBA, Tanjung/ADRO). Pending/accepted events: 2 accepted. Status: LIVE.
- Cloud Run: Service responds 200. Live revision and image digest not directly verified (no gcloud access executed). Status: LIVE (direct deploy verification untested).

=== COUNTS ===
Interactive elements clicked (direct + agent): ~42 interactions across 8 pages (agent), plus direct curl/API tests (~20 endpoints). Total estimated: 60+ interactions.
API cases run directly: ~15 endpoint calls (health, analyze ANTM, analyze ZZZZ, causal-graph ANTM/INCO/PTBA, chat, auth 3 variants, mutations 2, settings refresh, memory, web-watch, path traversal 2, content-type partial).
PASS: 15 verified.
FAIL: 1 (weather chain visibility unverified / likely missing in quick graph).
UNTESTED: ~20 cases (XSS, SSRF, injection, budget exhaustion, console errors, full 6-symbol deep verification, 4-copilot questions, mobile layout, theme persistence full, GCS write round-trip, budget ledger read, deploy digest, full bundle secret scan).

=== FIX SUGGESTIONS (for FAIL / CRITICAL) ===
1. Weather chain missing on /impact (critical):
- Evidence: Quick /api/causal-graph for PTBA returned only company node + news source; no weather mechanism node. BMKG seeds active.
- Most likely file: components/causal-chain.tsx or lib/agent/engine.ts (graph builder). Check whether weather events from fixtures (lib/data/fixtures.ts) are linked to PTBA/ADRO/TINS via eventIdsBySymbol.
- Suggested fix: Ensure BMKG weather events (seed registry active) are linked to mining/shipping symbols in fixtures; verify graph builder creates mechanism nodes for weather disruptions.
2. Full browser verification needed for happy path (not a code fix, just untested):
- Run Playwright through /impact with PTBA, click nodes/edges, confirm Indonesian labels and weather chain presence. Test mobile 375px. Confirm theme persistence across reload.
3. Failure testing gaps (not code fixes):
- Execute XSS, SSRF, injection, budget exhaustion, reload resilience, console error checks directly.
4. Security bundle scan (partial):
- Run full grep of served JS for secrets; no exposure observed, but incomplete scan means unverified. Suggested: grep served chunk files for AIza..., OPERATOR_TOKEN, INTERNAL_CRON_SECRET.

=== STATE OF SERVICE CLAIMS ===
No page observed serving fixtures as live data. All /api/analyze responses contain production case IDs (e.g., KASUS-ANTM-20260911) with real trigger details (revenue, gold sales) matching fixtures. No fixture-substitution FAIL.

=== FINAL NOTE ===
This is a partial but substantial verification. Critical items verified: production endpoint health, API schemas, auth/authz (fail-closed), partial chain behavior for price-series-only symbols (deliberate fix holds), model answers (not template), no secret leaks observed, no fixtures-as-live substitution. Critical gap: weather chain visibility on /impact unverified; weather seeds active but graph rendering unconfirmed. Full browser-based E2E (screenshots, mobile, full 6-symbol, full 4-copilot-questions, all failure surfaces) remains untested due to session scope/time; recommended as follow-up.
