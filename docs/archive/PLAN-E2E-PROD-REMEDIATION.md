# Plan — production remediation after the E2E verification

Branch: `feat/alief/wire-ui`. Service: `catalyst-web`, `us-central1`, revision `catalyst-web-00033-gmn`.
Written 2026-09-17, after `e2e-prod-report-verification.md`.

Three phases, in dependency order. Phase 1 is read-only and can start immediately. Phase 2 mutates production state and needs an explicit go-ahead per step. Phase 3 is verification and reporting.

Everything here reads production configuration from the service, never from `.env.local`:

```
gcloud run services describe catalyst-web --region=us-central1 --format=yaml
```

---

## Phase 1 — Make the weather queue reviewable (read-only, no approval needed)

**Problem.** Six BMKG weather candidates sit in the review queue with a raw JSON slice as both `title` and `summary` (`{"lokasi":{"adm1":"63",…`). They predate the reviewer-title fix in `lib/web-watch/json-summary.ts` (commit `ec19eb7`). `enqueue` (`lib/web-watch/queue.ts:102`) dedupes strictly by candidate id, and the id embeds a content hash, so existing entries are never rewritten in place.

**Mechanic that makes this cheap.** BMKG forecast and quake payloads change on every sweep, so a fresh sweep produces *new* candidate ids, and those new candidates run through `buildCandidate` (`lib/web-watch/check.ts:88`), which calls `summarizeJsonPayload`. Both shapes are supported: `summarizeQuake` and `summarizeForecast`. The output is a human title such as `Prakiraan cuaca Tanjung, Tanjung, Tabalong (Kalimantan Selatan)`.

**Steps.**

1. Read the internal token:
   ```
   gcloud secrets versions access latest --secret=INTERNAL_CRON_SECRET --project=ada-sectors-508410
   ```
2. List watched sources and their last check status (`GET /api/internal/check-sources` with `Authorization: Bearer <token>`). Record which of the five forecast seeds and the quake seed report `lastStatus` ok, and note any that error.
3. Run a sweep. Prefer per-source calls so one failing endpoint cannot mask the others: `POST /api/internal/check-sources` with `{"sourceId":"<seed id>","force":true}` for each weather seed. A full sweep is `{"force":true}` with no `sourceId`.
4. Re-read `GET /api/web-watch` and confirm new weather candidates carry readable titles.

**Gate.** Phase 2 does not start until at least the PTBA (Tanjung Enim) and ADRO (Tanjung, Tabalong) forecast candidates have human titles. Accepting a candidate whose title is an unreadable payload slice is how a wrong exposure gets written into the causal chain.

**Risk.** A sweep costs no Sectors credits and makes no model calls — it fetches public BMKG endpoints and writes GCS objects. The pending queue is capped at 200 (`queue.ts:106`); it currently holds 56, so there is headroom.

---

## Phase 2 — Wire the weather leg and fix configuration drift (production mutations)

Each step below is a separate approval. Nothing here runs without a go-ahead.

### 2a. Dismiss the six stale raw-JSON candidates

`POST /api/web-watch` with `Authorization: Bearer <OPERATOR_TOKEN>` (from `gcloud secrets versions access latest --secret=OPERATOR_TOKEN`), body:

```json
{"action":"dismiss","candidateId":"<id>","reason":"judul JSON mentah, pra-ec19eb7; diganti kandidat sweep baru"}
```

A dismiss reason is mandatory and is stored in the decision record, so the audit trail explains why they went.

### 2b. Accept the fresh weather candidates with reviewer-authored exposure paths

This is the step that makes "sebab akibat for weather" visible. The accept payload carries the exposure mapping — the fetcher deliberately does not guess it (`lib/web-watch/check.ts:72`). Shape per `webWatchImpactSchema`: `symbol`, `direction` (`Supported` | `Adverse` | `Mixed` | `Unrelated` | `Unverified`), `band` (`high` | `medium` | `low`), `path` (10–300 chars, Indonesian, states the mechanism).

Site-to-symbol mapping already encoded in the seeds:

| Seed site | Symbol | Exposure to state in `path` |
|---|---|---|
| Tanjung Enim, Muara Enim | PTBA | rainfall disrupts pit operations and rail haulage → production volume |
| Tanjung, Tabalong | ADRO | rainfall disrupts pit operations and barge loading → production volume |
| Sungailiat, Bangka | TINS | sea-weather warnings gate offshore dredging and shipment → volume |
| Pomalaa | ANTM | rainfall gates ore haulage to the smelter → volume |
| Sorowako | INCO | rainfall gates mining and processing → volume |

Write each `path` from what the summary actually says. Do not accept a candidate whose summary shows benign weather as if it were disruptive — an accepted event is evidence, and the whole product claim is that evidence is not invented.

**Verification after each accept.** Re-request the graph and confirm a weather node appears:

```
POST /api/causal-graph  {"symbol":"PTBA","profile":<profile>,"scope":"market","minRelevance":0}
```

Baseline before the change: 11 nodes — 1 `company`, 5 `source`, 5 `mechanism`, sourceType `sectors` / `macro` / `commodity` only, and no `observation` or `business-impact` terminal node. Success is a `source` node with `sourceType: "weather"` plus its paired `mechanism`. Then confirm the same in the browser on `/impact`: the node label must render as `Cuaca` (`lib/ui-labels.ts`), not the raw English enum.

**Rollback.** A wrong accept is corrected by dismissing the candidate; the decision record keeps both actions. Note the overlay caveat in `app/api/internal/check-sources/route.ts` — an accept lands in the serving instance's overlay immediately, other instances pick it up on the next overlay refresh, so verify twice rather than concluding from one fast request.

### 2c. Resolve the memory bucket drift

`GCS_MEMORY_BUCKET` is unset on the service, so `lib/memory/gcs-memory.ts:17` falls back to `katalis-recorded`. A verified round-trip wrote to `gs://katalis-recorded/catalyst/memory/e21ecd81-….json`, and `gs://catalyst-memory/` is empty. Two acceptable end states — pick one, do not leave it ambiguous:

- **Use the dedicated bucket:** `gcloud run services update catalyst-web --region=us-central1 --update-env-vars GCS_MEMORY_BUCKET=catalyst-memory`. Existing memory objects stay behind in `katalis-recorded`; only the one E2E test object exists, so nothing real is orphaned.
- **Keep the fallback:** delete the unused `catalyst-memory` bucket and update every doc that names it, including `.env.example` and the plan docs.

### 2d. Cap the model budget

`LLM_DAILY_CALL_BUDGET` is unset on the service. Per `.env.example`, empty means **no ceiling**, and `gs://katalis-recorded/catalyst/_ledger/llm/` does not exist — no ledger has ever been written. Production is running an `AGENT_MODE=llm` path uncapped against a free-tier quota.

```
gcloud run services update catalyst-web --region=us-central1 --update-env-vars LLM_DAILY_CALL_BUDGET=200
```

Then make one chat request and confirm an object appears under `gs://katalis-recorded/catalyst/_ledger/llm/2026-09-17.json`. If it does not, the ledger write path is broken and that is a separate defect to open — the budget silently falls back to a per-instance in-memory count, which several instances can exceed.

Both 2c and 2d are `gcloud run services update` calls, which create a new revision. Batch them into one update if they are approved together, so production takes one revision bump rather than two.

---

## Phase 3 — Close the untested surface and reissue the report

Eight items were never exercised. They need a real browser, not curl.

1. Mobile layout at 375px: drawer nav, bottom nav, no horizontal scroll.
2. Theme toggle persistence across reload, light and dark.
3. Command palette: open, search, navigate.
4. Guided tour and onboarding wizard, full step flow.
5. Playbook: toggle, save, reload, and confirm the saved playbook is actually sent in the `/api/analyze` and `/api/chat` payloads.
6. Copilot: the full four-question pass, including the no-evidence refusal and citation presence on every answer.
7. XSS: inject `<img src=x onerror=alert(1)>` into playbook free text and a web-watch dismiss reason, reload, confirm it renders as text.
8. SSRF: `sourceUrl` with `http://`, `file:///etc/passwd`, `http://169.254.169.254/` — all must be rejected.

Also still open from the verification pass:

- Match the running image digest `sha256:1057a833c483d59a275e4a3fc01f0926c96c8a3aa2b7972af5ab14d360428a97` to a commit, so "the deployed revision is this branch" stops being an assumption.
- Scan the served JS bundle for `AIza`, `OPERATOR_TOKEN`, `INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`. The previous report marked this PASS on the strength of an audit rather than a scan.

Then reissue `e2e-prod-report.md` with production environment facts, a status per item, and counts that agree with the table. The previous report reported `FAIL 0` while the table carried a FAIL row, and marked the Gemini service DEGRADED while marking a chat call against that same service PASS.

---

## Order of operations, condensed

| Step | Mutates prod | Blocked by | Success signal |
|---|---|---|---|
| 1. Sweep sources | No (writes queue objects) | — | Weather candidates carry human titles |
| 2a. Dismiss stale six | Yes | 1 | Pending count drops by 6, decisions recorded |
| 2b. Accept fresh weather | Yes | 2a | `sourceType: "weather"` node in the PTBA graph, `Cuaca` label on `/impact` |
| 2c. Memory bucket | Yes (new revision) | — | Round-trip object lands in the intended bucket |
| 2d. LLM budget | Yes (new revision) | — | Ledger object exists for today |
| 3. Browser pass | No | 2b | Eight items resolved, no console errors |
| 4. Reissue report | No | 3 | Counts consistent, prod env quoted from the service |

## Out of scope for this plan

Sectors refresh stays off. The key is mounted, the credit grant is finite and non-refillable, and nothing in the weather leg needs it. Do not flip `enabled` to run a real refresh as part of this work.
