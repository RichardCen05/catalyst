# Execution prompt — production remediation run

Paste everything below into a fresh session. It is self-contained; do not assume access to any earlier conversation.

---

You are executing a production remediation plan for **Catalyst**, a Next.js app deployed on Cloud Run. Work from `/Users/af/dumpProject/catalyst`, branch `feat/alief/wire-ui`. The written plan is `docs/PLAN-E2E-PROD-REMEDIATION.md` and the findings it rests on are in `e2e-prod-report-verification.md` — read both before acting.

Report honestly. If a step fails, say so with the failing output rather than working around it quietly. If a step is skipped, say it was skipped and why.

## Established facts — do not re-derive, but do re-confirm before mutating

Production service: `catalyst-web`, region `us-central1`, project `ada-sectors-508410`, public URL `https://catalyst-web-1019003607640.us-central1.run.app`, revision at time of writing `catalyst-web-00033-gmn`, image digest `sha256:1057a833c483d59a275e4a3fc01f0926c96c8a3aa2b7972af5ab14d360428a97`.

Production environment, read from the service (**never** from `.env.local` — that file is local-only and describing production from it is exactly the mistake the previous report made):

```
gcloud run services describe catalyst-web --region=us-central1 --format=yaml
```

| Variable | Production value |
|---|---|
| `AGENT_MODE` | `llm` |
| `GEMINI_MODEL` | `gemini-3.5-flash` |
| `GCS_CACHE_BUCKET` | `katalis-recorded` |
| `GOOGLE_API_KEY`, `INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`, `OPERATOR_TOKEN` | mounted from Secret Manager (`secretKeyRef`, `:latest`) |
| `GCS_MEMORY_BUCKET` | not set — falls back to `katalis-recorded` (`lib/memory/gcs-memory.ts:17`) |
| `LLM_DAILY_CALL_BUDGET` | not set — per `.env.example`, empty means **no ceiling** |
| `SECTORS_DAILY_BUDGET` | not set |

Baseline state to compare against:

- `GET /api/web-watch` → 56 pending, 2 accepted. Accepted are both news (`web-src-bi-news-aad4f1fe`, `web-src-cnbc-news-2ebb8a72`). Pending by category: company 25, policy 19, weather 6, commodity 4, rates 2.
- All 6 weather candidates carry a raw JSON slice as **both** `title` and `summary`, e.g. `{"lokasi":{"adm1":"63","adm2":"63.09",…`. They predate the reviewer-title fix (commit `ec19eb7`, `lib/web-watch/json-summary.ts`).
- `POST /api/causal-graph` for `PTBA` (scope `market`, `minRelevance` 0) returns 11 nodes: 1 `company`, 5 `source`, 5 `mechanism`; sourceType `sectors` / `macro` / `commodity` only. **No weather node**, and no `observation` or `business-impact` terminal node.
- `gs://katalis-recorded/catalyst/_ledger/llm/` does not exist — no LLM ledger has ever been written.
- `gs://catalyst-memory/` is empty; a verified memory round-trip wrote to `gs://katalis-recorded/catalyst/memory/<uid>.json`.

Enabled BMKG seed ids (`lib/web-watch/seeds.ts`): `src-bmkg-forecast-sungailiat` (TINS), `src-bmkg-forecast-tanjung-tabalong` (ADRO), `src-bmkg-forecast-tanjung-enim` (PTBA), `src-bmkg-forecast-pomalaa` (ANTM), `src-bmkg-forecast-sorowako` (INCO), `src-bmkg-quake`. Disabled and to be left alone: `src-bmkg-warning` (JS-rendered page), `src-bmkg-forecast-sample`.

A reusable profile body for the API calls:

```json
{"id":"catalyst-first","name":"E2E","description":"e2e","watchlist":["ANTM","PTBA","ADRO","TINS","INCO"],"owned":[],"config":{"horizon":"swing","depth":"standard","pillarOrder":["catalyst","concentration","volume","momentum"]},"preferredSectors":["Basic Materials","Energy"],"preferredEventTypes":["weather","commodity","company"],"hasOnboarded":true}
```

## Hard guardrails

- **Do not run a real Sectors refresh.** The credit grant is finite and non-refillable. The refresh flag is off and must stay off. A dry run is acceptable; `run: true, dryRun: false` is not.
- **Do not edit application code** unless a step below explicitly turns into a code defect and I approve the fix.
- **Do not commit or push** without asking.
- **Stop and ask before every production mutation** listed in Phase 2. Reads are free; writes are not.
- Never paste a secret value into a file, a commit, or the report. Read it into a shell variable and use it there.

---

## Phase 1 — Make the weather queue reviewable (read-only, start immediately)

1. Confirm the live revision and environment with the `describe` command above. If anything differs from the table, stop and report the difference before continuing — the rest of this plan assumes that configuration.

2. Read the internal token into a variable:
   ```
   gcloud secrets versions access latest --secret=INTERNAL_CRON_SECRET --project=ada-sectors-508410
   ```

3. `GET /api/internal/check-sources` with `Authorization: Bearer <token>`. Record for each of the six enabled BMKG seeds: `enabled`, `lastStatus`, `lastError`, `lastCheckedAt`, `checks`, `changes`. Report any seed that is erroring — a dead endpoint is a finding in its own right.

4. Sweep each weather seed individually so one failing endpoint cannot mask the others:
   ```
   POST /api/internal/check-sources
   {"sourceId":"src-bmkg-forecast-tanjung-enim","force":true}
   ```
   Repeat for `src-bmkg-forecast-tanjung-tabalong`, `src-bmkg-forecast-sungailiat`, `src-bmkg-forecast-pomalaa`, `src-bmkg-forecast-sorowako`, `src-bmkg-quake`.

   Why this works: `enqueue` (`lib/web-watch/queue.ts:102`) dedupes strictly by candidate id, and the id embeds a content hash, so existing entries are never rewritten. BMKG payloads change between sweeps, so the sweep mints **new** candidate ids, and new candidates pass through `buildCandidate` (`lib/web-watch/check.ts:88`) which calls `summarizeJsonPayload`. Both payload shapes are handled — `summarizeQuake` and `summarizeForecast` — so the new titles read like `Prakiraan cuaca Tanjung Enim, …` and `Gempa M5.1, kedalaman 10 km — …`.

5. Re-read `GET /api/web-watch`. Report the new pending count, and for every weather candidate print `id`, `title`, and the first 200 characters of `summary`.

**Gate.** Do not proceed to Phase 2 unless the PTBA (`tanjung-enim`) and ADRO (`tanjung-tabalong`) candidates now have human titles. If a sweep produced no new candidate because the payload was byte-identical, say so and stop — re-running will not change it, and the fix is then a code question (deriving titles for already-queued candidates), not an operational one.

Cost check: a sweep spends no Sectors credits and makes no model calls. The pending queue is capped at 200 (`queue.ts:106`) and currently holds 56.

---

## Phase 2 — Wire the weather leg and fix configuration drift (ask before each)

### 2a. Dismiss the six stale raw-JSON candidates

Read the operator token:
```
gcloud secrets versions access latest --secret=OPERATOR_TOKEN --project=ada-sectors-508410
```
Then for each stale id, `POST /api/web-watch` with `Authorization: Bearer <OPERATOR_TOKEN>`:
```json
{"action":"dismiss","candidateId":"<id>","reason":"judul JSON mentah, pra-ec19eb7; diganti kandidat sweep baru"}
```
A reason is mandatory and is stored in the decision record. Confirm the response `pending` count drops by six.

### 2b. Accept the fresh weather candidates with reviewer-authored exposure paths

This is the step that makes the weather causal chain visible. The fetcher deliberately does not guess the exposure mapping (`lib/web-watch/check.ts:72`) — the reviewer writes it. Payload per `webWatchImpactSchema` in `lib/schemas.ts`:

```json
{"action":"accept","candidateId":"<id>","impacts":[{"symbol":"PTBA","direction":"Adverse","band":"medium","path":"<10–300 chars, Indonesian, states the mechanism>"}]}
```

Site-to-symbol mapping, already encoded in the seed comments:

| Seed | Symbol | Exposure the `path` should state |
|---|---|---|
| `src-bmkg-forecast-tanjung-enim` | PTBA | rainfall disrupts pit operations and rail haulage → production volume |
| `src-bmkg-forecast-tanjung-tabalong` | ADRO | rainfall disrupts pit operations and barge loading → production volume |
| `src-bmkg-forecast-sungailiat` | TINS | sea-weather conditions gate offshore dredging and shipment → volume |
| `src-bmkg-forecast-pomalaa` | ANTM | rainfall gates ore haulage to the smelter → volume |
| `src-bmkg-forecast-sorowako` | INCO | rainfall gates mining and processing → volume |

**Write each `path` from what the candidate summary actually says.** If the summary shows benign weather, either accept with `direction: "Unverified"` / `band: "low"` and a path that says so, or leave it pending — do not dress calm weather up as a disruption. An accepted event becomes evidence, and the product's whole claim is that evidence is not invented. Show me each proposed `path` before sending it.

**Verification after the accepts:**

```
POST /api/causal-graph  {"symbol":"PTBA","profile":<profile above>,"scope":"market","minRelevance":0}
```

Compare against the 11-node baseline. Success is a `source` node with `sourceType: "weather"` plus its paired `mechanism` node. Repeat for `ADRO`. Then open `/impact` in a browser, load the PTBA chain, and confirm the node renders with the Indonesian label `Cuaca` (from `lib/ui-labels.ts`) and not a raw English enum. Screenshot it.

Note the instance caveat in `app/api/internal/check-sources/route.ts`: an accept lands in the serving instance's overlay immediately, other instances pick it up on the next overlay refresh. Verify at least twice, spaced apart, before concluding either way.

**Rollback:** dismiss the candidate. Both decisions stay in the record.

### 2c. Resolve the memory bucket drift

`GCS_MEMORY_BUCKET` is unset, so memory writes land in `katalis-recorded` while the docs name `catalyst-memory`. Pick one end state and make the docs agree:

- Use the dedicated bucket: `gcloud run services update catalyst-web --region=us-central1 --update-env-vars GCS_MEMORY_BUCKET=catalyst-memory`. Only one test object exists in the fallback location, so nothing real is orphaned.
- Or keep the fallback: delete `catalyst-memory` and update every doc that names it, including `.env.example`.

Ask me which. After the change, run a round-trip — `POST /api/memory` with a playbook, `GET` it back on the same cookie, and confirm the object exists in the intended bucket.

### 2d. Cap the model budget

Production runs `AGENT_MODE=llm` with no ceiling and no ledger. Set one:

```
gcloud run services update catalyst-web --region=us-central1 --update-env-vars LLM_DAILY_CALL_BUDGET=200
```

Then make one chat request and confirm an object appears under `gs://katalis-recorded/catalyst/_ledger/llm/<today>.json`. If it does not appear, that is a defect worth opening: the budget then falls back to a per-instance in-memory count, which several instances can collectively exceed.

If 2c and 2d are both approved, batch them into a single `gcloud run services update` so production takes one revision bump.

---

## Phase 3 — Close the untested surface

Use a real browser for these; curl cannot settle them. Report PASS/FAIL per item with evidence.

1. Mobile at 375px: drawer nav, bottom nav, no horizontal scroll.
2. Theme toggle persistence across reload, light and dark.
3. Command palette: open, search, navigate.
4. Guided tour and onboarding wizard, full step flow.
5. Playbook: toggle, save, reload, and confirm the saved playbook is actually present in the `/api/analyze` and `/api/chat` request payloads.
6. Copilot, four questions: an analyzed symbol (`ANTM`), a comparison, a causal path, and a symbol with no evidence. Every answer must carry citations; the no-evidence question must refuse rather than guess. A canned template answer is a regression of commit `5314029`.
7. XSS: inject `<img src=x onerror=alert(1)>` into a playbook free-text field and a web-watch dismiss reason, reload, confirm it renders as text.
8. SSRF: `sourceUrl` with `http://`, `file:///etc/passwd`, `http://169.254.169.254/` — all must be rejected.

Also close these two, which the earlier report asserted without testing:

- Match the running image digest to a commit, so "the deployed revision is this branch" stops being an assumption.
- Scan the served JS bundle for `AIza`, `OPERATOR_TOKEN`, `INTERNAL_CRON_SECRET`, `SECTORS_API_KEY`. The previous report marked this PASS on the strength of an audit rather than a scan.

Check the browser console on every page: report any uncaught error or hydration warning with its exact message.

---

## Deliverable

Rewrite `e2e-prod-report.md` with:

1. A results table — area, case, expected, actual, PASS/FAIL/UNTESTED. Counts must agree with the table; the previous version reported `FAIL 0` while carrying a FAIL row, and marked the Gemini service DEGRADED while marking a chat call against it PASS.
2. Production configuration quoted from `gcloud run services describe`, with the revision and image digest of whatever is live when you finish.
3. Before and after for the weather leg: node counts and node kinds for the PTBA graph, plus the screenshot.
4. A wiring summary, one line per service — live, degraded, or not wired — each with the evidence for that verdict.
5. Anything still open, listed as open. Do not mark an item PASS because it probably passes.
