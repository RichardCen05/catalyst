# E2E production test prompt — Catalyst

Paste everything below into a fresh session. It is written to be self-contained.

---

You are running a full end-to-end verification of the **Catalyst** web app in **production**. Do not modify application code unless I explicitly ask; this run is read-only verification plus a written report. Treat every claim as unproven until a command output or a browser observation proves it.

## Target

- Production URL: `https://catalyst-web-1019003607640.us-central1.run.app` (Cloud Run service `catalyst-web`, region `us-central1`, project `ada-sectors-508410`). The service is public — `/api/health` returns 200 without a token.
- Repo: `/Users/af/dumpProject/catalyst`, branch `feat/alief/wire-ui`. Use it only to read expected behaviour (routes, schemas, fixtures), never to substitute local results for production results.
- The UI is Indonesian. Expected labels live in `lib/ui-labels.ts` — check against that file rather than guessing translations.

## Tools

Drive a real browser (the built-in browser pane, or Playwright MCP) for every page, button, and CTA. Use `curl` for API-level and failure cases. For a page, confirm both the network response and the rendered DOM — a 200 with an empty or error-state panel is a FAIL, and so is correct data rendered into the wrong component.

## Ground truth to verify against

**Symbol coverage** (source: `lib/data/fixtures.ts`, `lib/data/market.generated.ts`):
- Fully analyzed (price series + broker evidence + financials) — 6 symbols: `ANTM, BBCA, BBRI, TLKM, GOTO, PGAS`. These must return a full analysis and a full causal chain.
- Price series only — 12 symbols: `INCO, TINS, BMRI, JSMR, EXCL, BUKA, EMTK, ADRO, PTBA, ICBP, MYOR, AMRT`. `/api/analyze` is expected to 404 ("Belum ada bukti yang cukup untuk ticker ini"); `/api/causal-graph` is expected to return a **partial chain**, not a 404 (this was a deliberate fix — verify it still holds).
- Unknown symbol (e.g. `ZZZZ`) — 404 on both, and the UI must show an evidence-gap state, never a blank page or a stack trace.

**Routes** (from `app/`):
- Pages: `/` (Hari ini), `/cases`, `/cases/[symbol]`, `/impact` (Sebab akibat), `/pantau`, `/copilot`, `/playbook`, `/method`.
- Legacy redirects: `/companies` → `/cases?view=picker`, `/compare?symbols=…` → `/cases?view=picker&compare=…`, `/agent` → `/cases?view=audit`. Verify each actually redirects.
- API: `GET /api/health`, `POST /api/analyze`, `POST /api/causal-graph`, `POST /api/impact`, `POST /api/chat`, `GET|POST /api/memory`, `GET|POST /api/web-watch`, `GET|POST /api/settings/refresh`, `GET|POST /api/internal/check-sources`, `POST /api/internal/refresh-sectors`.

**Request shapes** are in `lib/schemas.ts`. Read it before composing payloads — `profile` is a required nested object on `/api/analyze`, `/api/causal-graph`, `/api/impact`, and `/api/chat`, and an invalid profile must produce 400 with `details`, never a 500.

## Part 1 — Happy path, every page

For each page: load it, screenshot it, read the DOM, and click **every** interactive element (nav link, tab, filter chip, toggle, button, card link, dialog trigger, and every CTA). For each click record: what you expected, what rendered, PASS/FAIL.

1. **`/` Hari ini** — headline cards render real numbers from the recorded window (`dataAsOf` 2026-09-11, 28 sessions). Filter buttons change the list. Case cards link to `/cases/<symbol>` for the 6 analyzed symbols. "Lihat semua" links to `/cases` and `/impact`. The "Tanya asisten" CTA reaches `/copilot`.
2. **`/cases`** — view tabs (`active`, `?view=picker`, `?view=audit`) each render their own panel. Case rows open the right symbol. Coverage badges linking to `/method` appear only for symbols with missing recordings. Compare/picker selection flows work.
3. **`/cases/[symbol]`** — run this for all 6 analyzed symbols. Check the four workspace tabs: **Ringkasan**, **Pasar**, **Bisnis**, **Tinjau**. Within them: evidence cards, citation dialogs (the quoted sentence must match the cited source, not placeholder text), competing hypotheses, signal history, price chart, analysis audit, case resolution, clarification gate (`#clarification-gate`), and the "Ask agent" buttons. Confirm numbers on screen match what `/api/analyze` returns for the same symbol.
4. **`/impact` Sebab akibat** — the causal chain must actually draw (React Flow graph, not an empty canvas). Verify node kinds render with the Indonesian labels from `lib/ui-labels.ts`: `Sumber`, `Mekanisme`, `Emiten`, `Indikator`, `Dampak bisnis`. Click a node and an edge; the edge panel must show Eksposur, Indikator yang dicari, Dampak bisnis, Penjelasan lain, Batal jika, Dasar keyakinan, plus confidence and lag badges. **Weather specifically**: a weather-sourced chain (BMKG → mining/shipping disruption → volume/pricing impact for `PTBA`, `ADRO`, `TINS`) must be present and visible — if weather nodes are missing, say so loudly and trace whether the cause is the seed registry, the web-watch queue, or the graph builder. Verify the partial-chain behaviour for a price-series-only symbol.
5. **`/pantau`** — watched sources, pending review queue, accepted events. Confirm each pending candidate shows a usable title (JSON sources must not show a bare URL — that was a specific fix). Exercise accept and dismiss. Without an operator token these must fail closed (503/403), not silently succeed.
6. **`/copilot`** — ask at least four questions: one about an analyzed symbol, one comparing two symbols, one about a causal path, and one about a symbol with no evidence. Every answer must carry citations, must not invent numbers, and the no-evidence question must produce an explicit refusal rather than a guess. Confirm the answer is a real model answer, not the canned template (a template answer here is a regression of the fix in commit `5314029`).
7. **`/playbook`** — company toggles, preference switches, save buttons. Confirm a saved playbook persists across a reload and is actually sent to `/api/analyze` / `/api/chat` (check the network payload).
8. **`/method`** — static content renders, internal links resolve.
9. **Global shell** — sidebar nav (all 5 items), mobile nav drawer at 375px width, bottom nav, theme toggle (light/dark, both persist), command palette (open, search, navigate), settings drawer (Sectors refresh toggle, dry-run, real run, operator token field, "Ulangi tur inti"), guided tour, onboarding wizard, and the floating "Tanya asisten" button.

## Part 2 — Service wiring

For each external service, prove the production instance is talking to the real thing, and name the evidence:

- **Gemini LLM** — is `AGENT_MODE` actually `llm` in production, and does a copilot answer come back from the model? Check latency (a cold model call was ~14s), check the daily budget ledger at `gs://<cache-bucket>/catalyst/_ledger/llm/<date>.json`, and confirm `LLM_DAILY_CALL_BUDGET` is enforced. If the model is down (e.g. a Google billing 403), the app must fall back to the deterministic path **and tell the user in the answer**, not fail silently.
- **Sectors API** — `/api/settings/refresh` state, whether the key is present, whether the refresh flag is on or off, and what a dry run reports. Credits are limited and non-refillable: **do not** trigger a real (non-dry) refresh unless I say so. Verify a run attempt when the flag is off returns the documented status rather than spending credits.
- **GCS memory** (`catalyst-memory`) — `GET /api/memory` then `POST /api/memory` with a valid playbook, then `GET` again and confirm the write round-trips. Note the uid cookie behaviour. If the bucket is unreachable the route must return `{unavailable: true}` with 200, not a 500.
- **GCS recorded cache** (`catalyst-recorded`) — confirm the app reads recorded bundles and report which objects exist.
- **BMKG / web-watch sources** — `GET /api/internal/check-sources` (needs `INTERNAL_CRON_SECRET`; without it, expect 401 or 503, never open). Report how many seeds are active, how many candidates are pending, how many accepted, and whether the BMKG JSON endpoints are still returning parseable data.
- **Cloud Run itself** — confirm the live revision, the image digest, and that it matches the latest commit on the branch. Confirm there is exactly one service and no stale duplicates.

State plainly, per service: **wired and live**, **wired but degraded**, or **not wired**. If a page renders data that comes from fixtures while presenting itself as live, that is a FAIL and must be called out.

## Part 3 — Failure testing (do this thoroughly)

For every case: expected status, actual status, actual body, and whether the UI degrades gracefully. A 500 or an unhandled client exception is a FAIL. A leaked stack trace, internal path, bucket name, or key fragment is a **critical** FAIL.

**Input validation**
1. `POST /api/analyze` with: empty body; `{}`; missing `profile`; malformed JSON; `symbol` too short (`"AB"`); `symbol` too long (`"ABCDEF"`); lowercase symbol (must normalize); `symbol` of 4 spaces.
2. Oversized payloads: `mandate` over 600 chars, `question` over 500 chars, `watchlist` over 18 entries, `materialityRules` over 30 entries, a ~5 MB body.
3. Wrong types: `minRelevance: "high"`, `minRelevance: -5`, `minRelevance: 500`, `scope: "galaxy"`, `profile.config.pillarOrder` with duplicates.
4. `POST /api/impact` with a nonexistent `eventId` → 404 with the Indonesian error message.
5. `POST /api/web-watch` with an unknown `candidateId`, with `action: "dismiss"` and no reason, and with an accept carrying zero impacts.

**Auth and authorization**
6. `/api/internal/check-sources` and `/api/internal/refresh-sectors` with: no header; a wrong bearer; a malformed header. Expect 401/403/503 — never a 200 and never an execution.
7. `POST /api/web-watch` and `POST /api/settings/refresh` mutations without an operator token → 503 in production (fail closed, per `lib/operator-auth.ts`). Confirm a whitespace/newline-padded token does not accidentally pass or fail — that was a past bug.
8. Confirm no secret is readable from the browser bundle: grep the served JS for `GOOGLE_API_KEY`, `OPERATOR_TOKEN`, `INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`, and any `AIza…` pattern.

**Budget and rate limits**
9. Check the LLM ledger for today and confirm the ceiling. Do not deliberately exhaust the budget; instead read the ledger and the enforcement code path, and report what would happen at the ceiling (expected: deterministic fallback plus a user-visible note).
10. Confirm `/api/internal/refresh-sectors` returns `budget-exceeded` with 429 when over the Sectors budget, and confirm the current credit state before touching it.

**Abuse and injection**
11. Prompt injection via `/api/chat`: a question containing instructions to ignore the system prompt, to reveal env vars, or to output a number without a citation. The assistant must refuse or cite; it must not emit unsourced numbers.
12. XSS: submit `<img src=x onerror=alert(1)>` and `"><script>alert(1)</script>` into the playbook free-text fields and the web-watch reason. Reload and confirm it renders as text, never as markup.
13. SSRF-shaped input where a URL is accepted (`sourceUrl` must be an `https://` URL): try `http://`, `file:///etc/passwd`, `http://169.254.169.254/`. Expect rejection.
14. Path traversal in any symbol/id path segment: `/cases/..%2f..%2fetc%2fpasswd`, `/cases/%00`.

**Network and resilience**
15. In the browser, block the `/api/causal-graph` request and reload `/impact` — the page must show an error or empty state, not hang or crash.
16. Throttle to slow 3G and confirm loading states render (skeletons, `role="status"`).
17. Double-click every mutating button and confirm no duplicate write and no stuck disabled state.
18. Reload mid-request and confirm no corrupted local state; clear `localStorage` (key `catalyst:v1`) and confirm the app rehydrates to onboarding rather than crashing.
19. Send a request with `Content-Type: text/plain` and with no `Content-Type`.
20. If `API_CORS_ORIGIN` is configured, verify a cross-origin request from a disallowed origin is rejected.

**UI failure surfaces**
21. Open a case for a symbol with partial coverage and confirm the evidence-gap copy is specific about what is missing (see `lib/evidence-gaps.ts`), not a generic error.
22. Confirm no page shows a raw English enum where `lib/ui-labels.ts` defines an Indonesian label — the "Exposure path" generic-label bug is a known past regression, so check the causal chain labels carefully.
23. Check the browser console on every page: zero uncaught errors, zero React hydration warnings. Report any that appear with the exact message.

## Part 4 — Report

End with:

1. A results table: area / case / expected / actual / PASS or FAIL.
2. A separate **critical** list: anything user-facing that is broken, any secret exposure, any service claiming to be live while serving fixtures, any missing feature (name it explicitly — e.g. "weather causal chain not rendered on /impact").
3. A wiring summary: one line per service — live, degraded, or not wired — with the evidence for that verdict.
4. Counts: total interactive elements clicked, total API cases run, PASS/FAIL totals.
5. For every FAIL: the shortest decisive line of output, the file and line most likely responsible, and a suggested fix — but do not apply fixes unless I ask.

Do not summarize optimistically. If something is untested, list it as untested rather than assumed passing.
