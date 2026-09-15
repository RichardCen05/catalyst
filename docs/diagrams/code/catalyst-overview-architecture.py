"""Arsitektur berjalan — engine 4 pilar, web-watch overlay, memori GCS. Dibuat dengan orthogram."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-architecture-diagrams")
from arch_drawio import Diagram, SYNC, EVENT, DATA, PLUMBING, L, R, T, B

d = Diagram("Catalyst — arsitektur berjalan", subtitle="Rekaman 11 Sep 2026 + overlay web-watch. Misal ANTM.")

person = d.panel("Kamu", col=0, row=0)
watcher = person.card("Kamu", "watchlist 18 emiten IDX, misal ANTM")
reader = person.card("Triase tiap hari", "buka Dashboard, urut by rank + konflik")

screens = d.panel("Layar yang kamu buka", col=1, row=0)
today = screens.card("Dashboard /", "triase: material, konflik, catatan pending")
case = screens.card("Case /cases/[symbol]", "lifecycle 5 tahap + clarification gate")
links = screens.card("Impact /impact", "causal graph ≤6 sumber + hipotesis tanding")
helper = screens.card("Copilot /copilot", "POST /api/chat, jawab + sitasi + intent")
rules = screens.card("Playbook /playbook", "ambang relevansi 85, eksposur, falsifier")

checker = d.panel("Engine di belakang", col=2, row=0)
proofs = checker.card("Agent engine", "4 pilar: konsentrasi, volume, momentum, katalis")
mapper = checker.card("Causal builder", "source→mechanism→company, competing hypotheses")
answerer = checker.card("Lapisan LLM", "mandate/exposure/answer, cache sha256, mode llm")
gate = checker.card("Gates", "safeLanguage, enforceCitations, tolak saran transaksi")

saved = d.panel("Gudang simpan", col=3, row=0)
records = saved.card("Fixtures rekaman", "companies, priceSeries, broker, events 11 Sep")
notebook = saved.card("Memori GCS", "catalyst/memory/{uid}: playbook, insight, resolusi")
price_history = saved.card("Overlay web-watch", "accepted events via ensureOverlay, TTL 10 mnt")

ops = d.panel("Urus-urus", col=3, row=1)
builder = ops.card("Web-watch sweep", "feed/listing/document → kandidat → antrean review")
keeper = ops.card("Browser ingat", "zustand persist catalyst:v1 + memory-sync")

d.edge(reader, today, SYNC, "buka Dashboard", exit=R(0.5), entry=L(0.3), lane=d.lane(after=0))
d.edge(watcher, case, SYNC, "pilih misal ANTM", exit=R(0.5), entry=L(0.5), lane=d.lane(after=0))

d.edge(today, proofs, SYNC, "analyzeCompany + playbook", exit=R(0.3), entry=L(0.25), lane=d.lane(after=1))
d.edge(case, proofs, SYNC, "mandate + clarification", exit=R(0.5), entry=L(0.4), lane=d.lane(after=1))
d.edge(links, mapper, SYNC, "buildCausalGraph", exit=R(0.5), entry=L(0.5), lane=d.lane(after=1))
d.edge(helper, answerer, SYNC, "answerFollowUp", exit=R(0.5), entry=L(0.65), lane=d.lane(after=1))
d.edge(rules, gate, SYNC, "relevanceFloor + aturan", exit=R(0.5), entry=L(0.8), lane=d.lane(after=1))

d.edge(proofs, records, DATA, "baca fixtures", exit=R(0.3), entry=L(0.3), lane=d.lane(after=2))
d.edge(mapper, records, DATA, "baca events + broker", exit=R(0.5), entry=L(0.5), lane=d.lane(after=2))
d.edge(answerer, notebook, DATA, "baca playbook + insight", exit=R(0.7), entry=L(0.7), lane=d.lane(after=2))
d.edge(gate, notebook, DATA, "cek ambang + sumber", exit=R(0.85), entry=L(0.85), lane=d.lane(after=2))
d.edge(proofs, price_history, DATA, "ensureOverlay accepted", exit=R(0.4), entry=L(0.4), lane=d.lane(after=2))

d.edge(proofs, builder, PLUMBING, "kandidat kosong link", exit=R(0.35), entry=L(0.3), lane=d.lane(after=2), dashed=True)
d.edge(gate, keeper, PLUMBING, "persist + sync", exit=R(0.6), entry=L(0.6), lane=d.lane(after=2), dashed=True)

d.edge(watcher, reader, EVENT, "mulai triase harian", exit=B(), entry=T(), direct=True)

d.legend(SYNC, "kamu tanya, layar jawab")
d.legend(DATA, "baca yang disimpan")
d.legend(EVENT, "lanjut liat")
d.legend(PLUMBING, "urus-urus", dashed=True)

d.write("docs/diagrams/code/catalyst-overview-architecture.drawio")
print("Wrote overview")
