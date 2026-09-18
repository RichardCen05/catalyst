# Production E2E report — Catalyst

Run date: 2026-09-17. Branch `feat/alief/wire-ui`. Executed against the live Cloud Run service, not local config.

This report replaces the earlier version of `e2e-prod-report.md`, whose findings were largely derived from `.env.local` and did not describe production. Corrections to that version are tracked in `e2e-prod-report-verification.md`; the remediation plan executed here is `docs/PLAN-E2E-PROD-REMEDIATION.md`.

---

## 1. Production configuration

Read with `gcloud run services describe catalyst-web --region=us-central1 --format=yaml`, at the end of this run.

- Service: `catalyst-web`, region `us-central1`, project `ada-sectors-508410`
- Revision serving 100% of traffic: **`catalyst-web-00033-gmn`** (unchanged by this run — no `gcloud run services update` was issued)
- Image digest: **`sha256:1057a833c483d59a275e4a3fc01f0926c96c8a3aa2b7972af5ab14d360428a97`**
- Service account: `catalyst-run@ada-sectors-508410.iam.gserviceaccount.com`
- Resources: cpu 1, memory 512Mi, containerConcurrency 80, maxScale 3

| Variable | Production value |
|---|---|
| `AGENT_MODE` | `llm` |
| `GEMINI_MODEL` | `gemini-3.5-flash` |
| `GCS_CACHE_BUCKET` | `katalis-recorded` |
| `GOOGLE_API_KEY` | secretKeyRef `GOOGLE_API_KEY:latest` |
| `INTERNAL_CRON_SECRET` | secretKeyRef `INTERNAL_CRON_SECRET:latest` |
| `SECTORS_API_KEY` | secretKeyRef `SECTORS_API_KEY:latest` |
| `OPERATOR_TOKEN` | secretKeyRef `OPERATOR_TOKEN:latest` |
| `GCS_MEMORY_BUCKET` | **not set** — falls back to `katalis-recorded` (`lib/memory/gcs-memory.ts:17`) |
| `LLM_DAILY_CALL_BUDGET` | **not set** — no model-call ceiling |
| `SECTORS_DAILY_BUDGET` | **not set** |

This matched the expected configuration exactly at the start of the run, so the plan proceeded.

### Image provenance

The digest traces to Cloud Build `9e33ed65-5390-4e8b-88e2-01b46de37b29` (SUCCESS, finished 2026-09-17T04:20:07Z), built from source archive `gs://run-sources-ada-sectors-508410-us-central1/services/catalyst-web/1789618616.036696-e5f9a1013c53495b8538237525d3ac6a.zip`. The build carries no git substitutions, so the archive was downloaded and diffed against the branch.

Result: of 150 `.ts`/`.tsx` files under `app/`, `components/`, `lib/` and `tests/`, **149 are byte-identical to commit `5314029`**. The single difference is `tests/zz-live.test.ts`, an untracked local file that was swept into the deploy tarball and never reaches runtime. The deployed revision is commit `5314029` — this is now verified, not assumed.

---

## 2. Results

| Area | Case | Expected | Actual | Status |
|---|---|---|---|---|
| Config | Production env matches plan table | All 10 variables as specified | Exact match | PASS |
| Config | Image digest maps to a commit | Digest traceable to branch commit | 149/150 files identical to `5314029`; diff is one untracked test file | PASS |
| Config | Scheduler job wired as code claims | Job `catalyst-web-watch` exists and enabled | ENABLED, `30 17 * * 1-5`, Asia/Jakarta | PASS |
| Web-watch | 6 enabled BMKG seeds healthy | No seed erroring | All 6 `lastStatus: changed`, `lastError: null` | PASS |
| Web-watch | Per-seed sweep mints readable titles | New candidates via `summarizeJsonPayload` | All 6 produced new ids with human titles | PASS |
| Web-watch | Gate — PTBA and ADRO readable | Human titles before Phase 2 | "Prakiraan cuaca Tanjung Enim…" / "Prakiraan cuaca Tanjung, Tabalong…" | PASS |
| Web-watch | 2a dismiss 6 stale raw-JSON candidates | Pending drops by exactly 6 | 62 → 56, `decidedCount` 11 → 17 | PASS |
| Web-watch | 2b accept 5 forecasts with reviewer paths | Accepted rises by 5 | Accepted 2 → 7, pending 55 → 51 | PASS |
| Web-watch | 2b quake handled honestly | No invented exposure | Dismissed — M2.7 near Kab. Bandung, no watchlist site nearby | PASS |
| Causal graph | Weather node for PTBA (API) | `sourceType: "weather"` + paired mechanism | 11 → 13 nodes; weather source present, edge relevance 50, direction Unverified | PASS |
| Causal graph | Weather node for ANTM / TINS / INCO (API) | Weather node present | Present on all three | PASS |
| Causal graph | Weather node for ADRO (API) | Weather node present | **Absent** — bounded out by `MAX_VISIBLE_SOURCES = 6`; `hiddenRelationshipCount: 2` | FAIL |
| Causal graph | Stability across instances | Same result on a second spaced pass | Identical on all 5 symbols ~40 min later | PASS |
| Causal graph | Weather node renders on `/impact` as `Cuaca` | Node visible in the UI | **Never renders** — `/impact` makes zero calls to `/api/causal-graph` | FAIL |
| Memory | Round-trip write/read in production | Value written and read back | 3 objects written this session (05:52–05:54Z); newest holds the saved playbook | PASS |
| Memory | Memory is actually consumed | Stored state reaches the engine | Playbook from memory is sent in `/api/chat` and echoed in `preferenceNote` | PASS |
| Memory | Bucket matches documentation | Docs and production agree | Docs name `catalyst-memory`; production writes `katalis-recorded`; `catalyst-memory` is empty | OPEN |
| Budget | Model calls capped | A daily ceiling enforced | `LLM_DAILY_CALL_BUDGET` unset; no ledger objects exist | OPEN |
| UI | Mobile 375px — no horizontal scroll | `scrollWidth == clientWidth` | 375 == 375 on `/` and `/cases` | PASS |
| UI | Mobile drawer nav | Opens, lists sections | Opens with 5 destinations | PASS |
| UI | Mobile bottom nav | Present and usable | Present, 5 items; `main` padding-bottom 96px > nav height 57px | PASS |
| UI | Theme toggle, both directions + persistence | Survives reload | dark → light → reload (still light) → dark; `catalyst:theme` in localStorage | PASS |
| UI | Command palette | Open, search, navigate | cmd+K opens, "asisten" filters to 1, click navigates to `/copilot` | PASS |
| UI | Onboarding wizard full flow | All steps traversed | 2/2 steps completed | PASS |
| UI | Guided tour full flow | All steps traversed | 5/5 steps traversed, each gated on a real action | PASS |
| UI | Console errors / hydration warnings | None | None attributable to the app (see §5) | PASS |
| Playbook | Save and survive reload | Value persists | Persisted through full page load via `/api/memory` | PASS |
| Playbook | Present in `/api/chat` payload | Playbook in request body | Confirmed — 7 playbook keys incl. `materialityRules`, `relevanceFloor: 85` | PASS |
| Playbook | Present in `/api/analyze` payload | Playbook in request body | **Not testable** — `/api/analyze` has no caller in the UI | UNTESTED |
| Copilot | Analyzed symbol answer with citations | Grounded answer + citations | "Kenapa ANTM bergerak dan apa buktinya?" → "tidak terdapat informasi…", 1 unrelated citation; reproducible | FAIL |
| Copilot | Comparison question | Grounded, cited, no invention | 10 citations, 4 hypotheses with outcomes; declines to invent INCO evidence | PASS |
| Copilot | Causal-path question | Grounded answer + citation | "Harga komoditas → realisasi harga → margin", 1 citation | PASS |
| Copilot | No-evidence question refuses | Refusal, no guessing | BUMI → "Belum ada bukti yang cukup…", 0 citations; ZZZZ → no-information answer | PASS |
| Copilot | Not a canned template answer | Distinct content per question | Four questions produced four materially different answers | PASS |
| Security | XSS via playbook free text | Renders as text | Persisted and re-rendered as literal text; 0 injected `img` tags; no dialog | PASS |
| Security | XSS via web-watch dismiss reason | Renders as text | **No render sink** — the reason string is never displayed; only `decidedCount` is | N/A |
| Security | SSRF — `http://`, `file:///`, `http://169.254.169.254/` | All rejected | All three rejected with HTTP 400 | PASS |
| Security | SSRF — sweep pointed at arbitrary URL | Rejected | Injected `url` ignored (`url:""`), all `not_found`; traversal id also `not_found` | PASS |
| Security | `https://169.254.169.254/` in `sourceUrl` | Rejected or harmless | Accepted by schema; never fetched server-side, only rendered as a link | PARTIAL |
| Security | Secrets in served JS bundle | No secrets | 0 matches for `AIza`, `OPERATOR_TOKEN`, `INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`; 0 matches for the 4 literal secret values | PASS |
| Perf | Client bundle contents | Server-only SDKs stay server-side | `@google/genai` SDK ships to the browser in an 863 KB chunk | FAIL |
| Guardrail | Sectors refresh stays off | Flag off, no credits spent | Flag off and untouched; no refresh run; 0 Sectors credits consumed | PASS |

**Counts: 33 PASS · 4 FAIL · 1 PARTIAL · 1 UNTESTED · 1 N/A · 2 OPEN — 42 rows.**

---

## 3. Before and after — the weather leg

Baseline (before this run), `POST /api/causal-graph` for PTBA, scope `market`, `minRelevance` 0:

- **11 nodes** — 1 `company`, 5 `source`, 5 `mechanism`
- sourceTypes present: `sectors`, `macro`, `commodity`
- no `weather` node, no `observation` or `business-impact` terminal node
- watch queue: 56 pending / 2 accepted, both accepted items news; all 6 weather candidates pending with raw-JSON titles

After the sweep, the six dismissals and the five accepts:

| Symbol | Nodes before | Nodes after | Weather node | Note |
|---|---|---|---|---|
| PTBA | 11 | **13** (1 company, 6 source, 6 mechanism) | **Yes** | weather edge relevance 50, direction `Unverified`, `hiddenRelationshipCount: 0` |
| ANTM | — | 15 (1 company, 6 source, 6 mechanism, 2 business-impact) | Yes | |
| TINS | — | 9 (1 company, 4 source, 4 mechanism) | Yes | |
| INCO | — | 9 (1 company, 4 source, 4 mechanism) | Yes | |
| ADRO | — | 13 (1 company, 6 source, 6 mechanism) | **No** | six visible sources all score ≥82; weather at 50 bounded out, `hiddenRelationshipCount: 2` |

Queue after: **50 pending / 7 accepted**, `decidedCount` 23. The five accepted weather events carry exactly one impact link each — PTBA, ADRO, TINS, ANTM, INCO — all `Unverified` / relevance 50.

Both passes were run ~40 minutes apart and returned identical results, so the overlay caveat in `app/api/internal/check-sources/route.ts` is satisfied: this is not one instance's cached view.

### Why the accepts are `Unverified` / `low`, not `Adverse` / `medium`

Every BMKG forecast fetched on 2026-09-17 shows benign weather:

| Site | Symbol | Conditions |
|---|---|---|
| Tanjung Enim | PTBA | Cerah → Udara Kabur, rain 0 mm, wind ≤6.6 km/jam |
| Tanjung, Tabalong | ADRO | Berawan → Udara Kabur, rain 0–0.6 mm, wind ≤13.3 km/jam |
| Sungailiat | TINS | Cerah, rain 0 mm, wind 13.9–20.8 km/jam E |
| Pomalaa | ANTM | Cerah/Cerah Berawan, rain 0 mm, wind 9.4–17 km/jam |
| Sorowako | INCO | Cerah/Cerah Berawan, rain 0–0.8 mm, wind ≤11.6 km/jam |

The plan's exposure table describes rainfall disrupting pit operations, haulage and loading. Today's data does not show that mechanism firing. Each accepted `path` therefore names the mechanism *and* records that it is not currently triggered. Marking calm weather `Adverse` would have been inventing evidence, which is the one thing the product claims it never does.

The trade-off, stated plainly: `band: "low"` maps to relevance 50 (`lib/web-watch/queue.ts:31`), below the `/impact` default threshold of 60. The node is reachable at the "≥ 40 · lebar" setting — except that `/impact` does not render it at all, for the reason below.

### The blocking defect: the UI never asks the API

`/impact` is a client component (`app/impact/page.tsx:1`) that imports the engine directly and calls `agentEngine.buildCausalGraph` in the browser (`app/impact/page.tsx:57`). The engine's event list merges `getOverlayEvents()` (`lib/data/providers.ts:21`), a module-level in-process cache that only the server-side API routes ever populate. In the browser that array is always empty, so the chain is built from bundled fixtures alone.

Measured on the live page at `/impact?company=PTBA` with the threshold set to "≥ 40 · lebar":

- page reports "Semua hubungan yang lolos ditampilkan" and shows 3 causes
- page text contains no "Cuaca" and no "Tanjung Enim"
- `performance.getEntriesByType('resource')` shows **0 requests to `/api/causal-graph`**; the only `/api/` call the page makes is `/api/memory`

`/api/causal-graph`, `/api/analyze` and `/api/impact` have **no caller anywhere in the UI**. Four client pages (`app/page.tsx`, `app/cases/page.tsx`, `app/impact/page.tsx`, `app/companies/[symbol]/company-detail-client.tsx`) run the engine in the browser instead.

Consequences:

1. **No reviewer-accepted web-watch event can ever appear in the UI.** Phase 2b's success criterion — the `Cuaca` label rendering on `/impact` — is unreachable without a code change. The accepts are correct and verifiable through the API; the UI simply never asks.
2. This is also why the served bundle carries the entire `@google/genai` SDK (863 KB chunk `3ag1h0sbwo46f.js`): importing the engine client-side drags its server dependencies along.

Screenshot: captured in-session against the live page (threshold "≥ 40 · lebar", PTBA, three causes, no weather node). A saved image file could not be produced — the Playwright MCP browser is held by a stale lock (`Browser is already in use … use --isolated`). The machine-checkable evidence above (zero `/api/causal-graph` requests, absent "Cuaca" string) is what the verdict rests on.

---

## 4. Service wiring

| Service | Verdict | Evidence |
|---|---|---|
| Cloud Run `catalyst-web` | **Live** | Revision `catalyst-web-00033-gmn` serving 100%; digest matches commit `5314029` on 149/150 files |
| Gemini (`AGENT_MODE=llm`) | **Live, uncapped** | Comparison question returned 10 citations, 4 hypotheses, distinct per-question content; `LLM_DAILY_CALL_BUDGET` unset and `gs://katalis-recorded/catalyst/_ledger/llm/` still does not exist |
| Sectors API | **Wired, deliberately idle** | Key mounted from Secret Manager; refresh flag off and untouched; 0 credits consumed this run |
| GCS cache bucket `katalis-recorded` | **Live** | Web-watch registry, queue, candidates and check runs all read and written during the sweep |
| GCS memory | **Live, in the fallback bucket** | 19 objects under `catalyst/memory/`, 3 written this session; `gs://catalyst-memory/` is empty |
| BMKG public endpoints (6 seeds) | **Live** | All 6 returned changed payloads on 2026-09-17; registry shows "Terakhir dicek 2026-09-17 05:22" |
| Cloud Scheduler `catalyst-web-watch` | **Live** | Job ENABLED, `30 17 * * 1-5`, Asia/Jakarta — matches the claim in the route's header comment |
| LLM call ledger | **Not wired** | Prefix `gs://katalis-recorded/catalyst/_ledger/llm/` has never been created |
| `/api/causal-graph`, `/api/analyze`, `/api/impact` | **Live but not wired to the UI** | Routes respond correctly; zero callers in `app/` or `components/` |

---

## 5. Console and network

No console errors or hydration warnings attributable to the application across `/`, `/cases`, `/cases/ANTM`, `/impact`, `/pantau`, `/playbook` and `/copilot`.

Three `Failed to load resource: the server responded with a status of 400` entries were recorded. All three are the SSRF probes this run deliberately sent to `/api/chat` with a malformed `sourceUrl`; the server rejecting them is the expected result. Every request after the subsequent reload returned 200.

---

## 6. Still open

1. **`/impact` cannot show reviewer-accepted events.** The client-side engine cannot see the server overlay. Until the page fetches `/api/causal-graph` (or the chain is rendered server-side), no web-watch accept — weather or otherwise — will appear in the UI. This is a code change and was not made; it needs a decision.
2. **ADRO's weather link is invisible at any threshold.** `MAX_VISIBLE_SOURCES = 6` (`lib/agent/engine.ts:1027`) bounds by count, not relevance, and ADRO already has six sources scoring ≥82. The accept is recorded and correct; the graph will not show it.
3. **Model calls are uncapped.** `LLM_DAILY_CALL_BUDGET` remains unset by explicit decision this run. With no ledger written, the fallback is a per-instance in-memory count that several instances can collectively exceed.
4. **Memory bucket drift persists.** Production writes memory to `katalis-recorded`; the docs and `.env.example` name `catalyst-memory`, which is empty. No env change was made, so no revision bump occurred. Memory itself is verified working and in use.
5. **Copilot evidence selection is phrasing-dependent.** "Kenapa ANTM bergerak dan apa buktinya?" routes to the `event-impact` intent and returns "no information" with a single unrelated coal-price citation, while "Kenapa ANTM masuk daftar hari ini?" routes to `why-listed` and answers correctly with full citations. Same symbol, same evidence base, opposite outcomes. Reproducible.
6. **`@google/genai` ships to the browser** in an 863 KB chunk — the largest served chunk. No secret leaks with it, but it is dead weight caused by item 1.
7. **`https://` link-local URLs are accepted** in `userInsightSchema.sourceUrl`. Not SSRF — nothing fetches it server-side — but `https://169.254.169.254/` can be stored and rendered as a clickable link.
8. **`/api/analyze` playbook propagation is untested**, because the route has no UI caller to exercise.
9. **Screenshot artifact not saved to disk** — Playwright MCP browser lock. Evidence recorded as measurements instead.

## 7. What this run changed in production

- 6 stale raw-JSON weather candidates dismissed, reason recorded
- 5 fresh BMKG forecast candidates accepted with reviewer-written exposure paths (PTBA, ADRO, TINS, ANTM, INCO), all `Unverified` / `low`
- 1 quake candidate dismissed, reason recorded
- Queue moved from 56 pending / 2 accepted to **50 pending / 7 accepted**
- Registry check counts advanced for the 6 enabled BMKG seeds
- Playbook `materialityRules` was temporarily modified for the XSS test and **restored**; the restored value is confirmed in the newest GCS memory object with no payload residue
- Theme toggled during testing and **restored to dark**

No environment variable was changed, no revision was created, no Sectors refresh was run, and no code was modified.
