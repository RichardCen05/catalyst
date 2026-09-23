"""Catalyst system architecture, drawn with the orthogram arch_drawio emitter.

    python3 docs/diagrams/catalyst-architecture.py

Writes docs/diagrams/catalyst-architecture.drawio. Every component and flow is
read from the code and from docs/DEPLOY.md; nothing here is aspirational.
"""

import os
import sys

sys.path.insert(0, os.environ.get("ARCH_DRAWIO_DIR", os.path.expanduser(
    "~/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-architecture-diagrams")))

import arch_drawio as G  # noqa: E402
from arch_drawio import (AGENT, DATA, DLQ, EVENT, MODEL, PLUMBING, SYNC,  # noqa: E402
                         B, L, R, T)

G.COL_PITCH = 760


def col_x(c):
    return G.MARGIN_X + c * G.COL_PITCH


def below(panel, gap=56):
    return panel.y + panel.h + gap


def path(src, ex, dst, en, *moves):
    """Orthogonal waypoints: alternate ('x', v) / ('y', v) moves from the exit."""
    i = G._offset(en, dst.point(en))
    cur = G._offset(ex, src.point(ex))
    pts = []
    for axis, v in moves:
        cur = (v, cur[1]) if axis == "x" else (cur[0], v)
        pts.append(cur)
    if en[0] in (0.0, 1.0):
        if cur[1] != i[1]:
            pts.append((cur[0], i[1]))
    elif cur[0] != i[0]:
        pts.append((i[0], cur[1]))
    return pts


d = G.Diagram("Architecture: Catalyst",
              subtitle="catalyst-web · Cloud Run us-central1 · project ada-sectors-508410")

RUN = "gcp/compute/run.png"
TS = "programming/language/typescript.png"
PY = "programming/language/python.png"
GCS = "gcp/storage/storage.png"
WEB = "onprem/client/client.png"

# ------------------------------------------------------------ phase 1: boxes
# Every panel and every in-panel arrow first, so stacks open to their final
# height before any corridor is measured against them.

# Row 0 — platform plumbing across the top.
secrets = d.loose_card("Secret Manager", "5 secrets · API keys + cron secret",
                       G.icon("gcp/security/secret-manager.png"), x=col_x(0) + 14, y=150)
logging = d.loose_card("Cloud Logging", "structured JSON · llm-fallback lines",
                       G.icon("gcp/operations/logging.png"), x=col_x(0) + 14, y=300)

cicd = d.panel("CI/CD · manual release", col=1, row=0)
cbuild = cicd.card("Cloud Build", "gcloud run deploy --source .", "gcp/devtools/build.png")
registry = cicd.card("Artifact Registry", "cloud-run-source-deploy", "gcp/devtools/container-registry.png")
d.edge(cbuild, registry, PLUMBING, "push image", exit=B(), entry=T(), direct=True)

refresh = d.panel("Scheduled refresh · Cloud Build", col=2, row=0)
snapshot = refresh.card("refresh-source.tgz", "GCS source snapshot, not git", GCS)
record = refresh.card("refresh_sectors.py", "extend window to today", PY)
rebuild = refresh.card("build_market_data.py", "rebuild the recorded bundle", PY)
gate = refresh.card("Gate", "lint · typecheck · vitest", "gcp/devtools/build.png")
redeploy = refresh.card("gcloud run deploy", "only when the gate is green", RUN)
d.edge(snapshot, record, PLUMBING, "source", exit=B(), entry=T(), direct=True)
d.edge(record, rebuild, PLUMBING, "raw recordings", exit=B(), entry=T(), direct=True)
d.edge(rebuild, gate, PLUMBING, "market.generated.ts", exit=B(), entry=T(), direct=True)
d.edge(gate, redeploy, PLUMBING, "green only", exit=B(), entry=T(), direct=True)

sectors = d.loose_card("Sectors API", "daily · news · filings · flow",
                       G.icon("gcp/api/api-gateway.png"), x=col_x(3) + 14, y=150)

# Main row.
MAIN_Y = below(refresh, 270)

browser = d.panel("Browser · Next.js client", col=0, y=MAIN_Y)
reader = browser.card("Reader", "investor · operator", "onprem/client/users.png")
client = browser.card("React client", "pages · copilot · settings drawer", "programming/framework/react.png")
store = browser.card("Local store", "zustand persist · profile · watchlist", TS)
d.edge(reader, client, SYNC, "reads · asks", exit=B(), entry=T(), direct=True)
d.edge(client, store, DATA, "persist", exit=B(), entry=T(), direct=True)

sched = d.panel("Cloud Scheduler · Asia/Jakarta", col=0, y=below(browser))
watch_job = sched.card("catalyst-web-watch", "30 17 * * 1-5", "gcp/devtools/scheduler.png")
data_job = sched.card("catalyst-data-refresh", "30 17 * * 1-5", "gcp/devtools/scheduler.png")

web = d.panel("Watched sources · the open web", col=0, y=below(sched))
regulators = web.card("Regulators", "IDX · OJK · BPS · ESDM", WEB)
bmkg = web.card("BMKG API", "weather feeds", WEB)
news = web.card("Market news", "CNBC Indonesia · Katadata", WEB)
commod = web.card("Commodity pages", "EIA · KPBN · Logam Mulia · MSCI", WEB)

run = d.panel("Cloud Run · catalyst-web", col=1, y=MAIN_Y)
pages = run.card("Pages", "server-rendered views", "programming/framework/nextjs.png")
chat = run.card("/api/chat · analyze · impact", "causal-graph · question + profile", RUN)
fact = run.card("/api/fact · endpoint-summary", "today's fact · feed gloss", RUN)
memory_api = run.card("/api/memory", "snapshot GET · POST", RUN)
watch_api = run.card("/api/web-watch", "review queue · Terima / Tolak", RUN)
settings_api = run.card("/api/settings/refresh", "refresh toggle", RUN)
check_api = run.card("/api/internal/check-sources", "Bearer cron secret", RUN)

bg = d.panel("Background work (in-process)", col=1, y=below(run, 72))
checker = bg.card("Web-watch checker", "fetch · safe-regex · review", TS)
sectors_refresh = bg.card("Sectors refresh", "broker + foreign-flow legs", TS)
d.edge(check_api, checker, AGENT, "watch-all", exit=B(), entry=T(), direct=True)

engine_p = d.panel("Agent engine · lib/agent (in-process)", col=2, y=MAIN_Y)
router = engine_p.card("Query router", "schemas · gates · unknown symbols", TS)
engine = engine_p.card("Answer engine", "engine.ts · handlers · follow-up", TS)
retrieval = engine_p.card("Retrieval", "corpus · score · bundle · VIEWS", TS)
writer = engine_p.card("LLM writer", "lib/agent/llm · providers.ts", "gcp/ml/ai-platform.png")
verifier = engine_p.card("Verifier", "verify.ts · numerals · no advice", "gcp/security/security-scanner.png")
budget = engine_p.card("Budget gate", "budget.ts · 429 strikes", "gcp/operations/monitoring.png")
d.edge(router, engine, AGENT, "symbol · intent", exit=B(), entry=T(), direct=True)
d.edge(engine, retrieval, AGENT, "scored query", exit=B(), entry=T(), direct=True)
d.edge(retrieval, writer, AGENT, "grounded material", exit=B(), entry=T(), direct=True)
d.edge(writer, verifier, AGENT, "draft JSON", exit=B(), entry=T(), direct=True)

bucket = d.panel("Cloud Storage · katalis-recorded", col=2, y=below(engine_p, 72))
mem_obj = bucket.card("memory/", "{uid}.json per reader", GCS)
llm_obj = bucket.card("llm/", "verified answer cache", GCS)
watch_obj = bucket.card("web-watch/", "registry.json · review queue", GCS)
config_obj = bucket.card("config/", "settings.json", GCS)
refresh_obj = bucket.card("refresh/", "raw Sectors responses", GCS)

baked = d.panel("Baked into the image", col=3, y=MAIN_Y)
market = baked.card("market.generated.ts", "recorded figures · DATA_AS_OF", TS)
chrome = baked.card("chrome.generated.ts", "indexed UI headings", TS)
registry_ts = baked.card("fixtures · thresholds", "citations · DEFAULT_THRESHOLDS", TS)

ai = d.panel("AI · model providers", col=3, y=below(baked, 60))
openrouter = ai.card("OpenRouter", "openai-compatible · live", "gcp/ml/inference-api.png")
gemini = ai.card("Gemini · AI Studio", "rollback · LLM_PROVIDER unset", "gcp/ml/vertex-ai.png")

# ------------------------------------------------------------ phase 2: flows

# Lanes are handed out left to right in call order. Within a gutter the order
# below is chosen so the L-shaped routes nest instead of crossing each other.

# Top band — deploys, secrets, logs, and the long hauls between rows.
d.edge(registry, run.port(), PLUMBING, "deploy revision", exit=B(), entry=T(0.5),
       band=d.band(below_row=0))
d.edge(redeploy, run.port(), PLUMBING, "new revision", exit=B(), entry=T(0.82),
       band=d.band(below_row=0))
d.edge(secrets, run.port(), PLUMBING, "mounted env", exit=R(0.35), entry=T(0.3), dashed=True,
       points=path(secrets, R(0.35), run.port(), T(0.3),
                   ("x", d.lane(after=0)), ("y", d.band(below_row=0))))
d.edge(run.port(), logging, PLUMBING, "stdout logs", exit=T(0.12), entry=R(0.5), dashed=True,
       points=path(run.port(), T(0.12), logging, R(0.5),
                   ("y", d.band(below_row=0)), ("x", d.lane(after=0))))
d.edge(data_job, snapshot, EVENT, "builds.create", exit=L(), entry=L(),
       points=path(data_job, L(), snapshot, L(),
                   ("x", G.MARGIN_X - 26), ("y", d.band(below_row=0)),
                   ("x", d.lane(after=1))))
d.edge(record, sectors, SYNC, "one call per feed", exit=R(), entry=L(0.35),
       lane=d.lane(after=2))
d.edge(sectors_refresh, sectors, SYNC, "broker · foreign-flow", exit=R(), entry=L(0.7),
       points=path(sectors_refresh, R(), sectors, L(0.7),
                   ("x", d.lane(after=1)), ("y", d.band(below_row=0)),
                   ("x", d.lane(after=2))))
d.edge(rebuild, market, PLUMBING, "compiled into image", exit=R(), entry=L(0.3),
       lane=d.lane(after=2))

# Reader to service. Upward routes take the inner lanes, downward ones nest
# with the highest furthest right.
d.edge(client, pages, SYNC, "HTTPS", exit=R(0.2), entry=L(), lane=d.lane(after=0))
d.edge(client, chat, SYNC, "POST question", exit=R(0.4), entry=L(), lane=d.lane(after=0))
d.edge(store, settings_api, SYNC, "refresh toggle", exit=R(0.7), entry=L(0.3), lane=d.lane(after=0))
d.edge(store, memory_api, SYNC, "sync snapshot", exit=R(0.3), entry=L(), lane=d.lane(after=0))
d.edge(client, watch_api, SYNC, "review verdict", exit=R(0.8), entry=L(), lane=d.lane(after=0))
d.edge(client, fact, SYNC, "GET fact", exit=R(0.6), entry=L(), lane=d.lane(after=0))
d.edge(watch_job, check_api, EVENT, "POST · cron secret", exit=R(), entry=L(), lane=d.lane(after=0))
d.edge(settings_api, sectors_refresh, AGENT, "run refresh", exit=L(0.7), entry=L(0.7),
       lane=d.lane(after=0))
d.edge(checker, web.port(), SYNC, "fetch watched pages", exit=L(0.3), entry=R(0.3),
       lane=d.lane(after=0))

# Service to storage, lowest source innermost.
d.edge(sectors_refresh, refresh_obj, DATA, "raw responses", exit=R(0.3), entry=L(), lane=d.lane(after=1))
d.edge(checker, watch_obj, DATA, "queue findings", exit=R(), entry=L(0.7), lane=d.lane(after=1))
d.edge(settings_api, config_obj, DATA, "settings", exit=R(0.7), entry=L(), lane=d.lane(after=1))
d.edge(watch_api, watch_obj, DATA, "registry", exit=R(), entry=L(0.3), lane=d.lane(after=1))
d.edge(memory_api, mem_obj, DATA, "read / write", exit=R(), entry=L(), lane=d.lane(after=1))

# Service to engine, and the engine's own loop back.
d.edge(chat, router, AGENT, "agentEngine", exit=R(), entry=L(), lane=d.lane(after=1))
d.edge(fact, writer, AGENT, "today-fact", exit=R(), entry=L(0.3), lane=d.lane(after=1))
d.edge(budget, engine, DLQ, "gate closed: deterministic text", exit=L(), entry=L(0.3),
       dashed=True, lane=d.lane(after=1))
d.edge(verifier, engine, AGENT, "verified sentence", exit=L(), entry=L(0.7), lane=d.lane(after=1))

# Engine to data and models.
d.edge(engine, market, DATA, "recorded figures", exit=R(), entry=L(0.7), lane=d.lane(after=2))
d.edge(retrieval, chrome, DATA, "corpus + page bundles", exit=R(0.3), entry=L(), lane=d.lane(after=2))
d.edge(router, registry_ts, DATA, "symbols · thresholds", exit=R(), entry=L(), lane=d.lane(after=2))
d.edge(writer, budget, AGENT, "429 strike", exit=R(0.8), entry=R(), lane=d.lane(after=2))
d.edge(writer, llm_obj, DATA, "cache", exit=R(0.6), entry=R(), lane=d.lane(after=2))
d.edge(writer, gemini, MODEL, "rollback", exit=R(0.4), entry=L(), dashed=True, lane=d.lane(after=2))
d.edge(writer, openrouter, MODEL, "json_schema strict", exit=R(0.2), entry=L(), lane=d.lane(after=2))

d.legend(SYNC, "Synchronous HTTP request / response")
d.legend(EVENT, "Scheduled trigger: Cloud Scheduler cron")
d.legend(AGENT, "In-process call inside the Next.js server")
d.legend(DATA, "Read / write: GCS objects and the recorded bundle")
d.legend(MODEL, "Model call (dashed = rollback provider)", dashed=False)
d.legend(DLQ, "Failure path: verifier rejects or 429 closes the gate", dashed=True)
d.legend(PLUMBING, "CI/CD · secrets · logs (dashed = supporting)")

d.write("docs/diagrams/catalyst-architecture.drawio")
