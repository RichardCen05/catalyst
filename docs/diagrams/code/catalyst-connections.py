"""Peta koneksi — setiap garis menjelaskan apa yang terjadi antar bagian. Dibuat dengan orthogram."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-architecture-diagrams")
from arch_drawio import Diagram, SYNC, EVENT, DATA, PLUMBING, L, R, T, B

d = Diagram("Catalyst — peta koneksi", subtitle="Revisi 00018: sitasi asal + kegagalan jujur. Misal ANTM.")

kamu = d.panel("Kamu", col=0, row=0)
watcher = kamu.card("Kamu", "watchlist 18 emiten IDX, misal ANTM")
triase = kamu.card("Layar triase", "Dashboard, cases, impact — hitung lokal, tanpa fetch")

layar = d.panel("Layar: hanya 3 fetch", col=1, row=0)
copilot = layar.card("Copilot /copilot", "tanya → POST /api/chat → jawab + sitasi")
memsync = layar.card("Memory-sync global", "GET uid · POST debounce 1,5 dtk")
pantau = layar.card("Pantau /pantau", "GET antrean · POST terima/tolak")

api = d.panel("API routes", col=2, row=0)
chat = api.card("chat/analyze/impact/graph", "zod 400 · null→404 · mode recorded")
watchapi = api.card("web-watch", "baca antrean · review→overlay · 422 bila salah")
internal = api.card("memory+internal+health", "uid cookie · Bearer 401 · tanpa secret 503")

mesin = d.panel("Engine", col=3, row=0)
pillars = mesin.card("4 pilar + gates", "konsentrasi volume momentum katalis · gate tolak")
chateng = mesin.card("answerFollowUp", "advice/missing/unknown/event")
graph = mesin.card("Causal builder", "≤6 sumber · tanding-3 · span→sorot")
llm = mesin.card("LLM bersyarat", "exposure+answer · cache sha · gagal→pasti")

data = d.panel("Data + sitasi", col=4, row=0)
fixtures = data.card("Fixtures 11 Sep", "generated → sitasi → providers + overlay")
origin = data.card("Sitasi asal", "ada source→artikel · agregat→endpoint benar")
live = data.card("Sectors live terpisah", "cache-first GCS · engine tak sentuh")

ops = d.panel("Simpan", col=2, row=1)
mem = ops.card("Memori", "zustand lokal ↔ GCS uid · offline→lokal")
gcs = ops.card("GCS", "recorded/cache/llm/checks/queue")
ship = ops.card("Cloud Run 00018", "gate+build · secrets · e2e 28/28")

watch = d.panel("Web-watch", col=3, row=1)
sweep = watch.card("Sweep terjadwal", "feed/listing/document → kandidat")
review = watch.card("Review manusia", "accept→overlay→mesin · dismiss mati")
seeds = watch.card("Seeds + kunci", "14 sumber · lock anti-ganda")

d.edge(watcher, triase, EVENT, "mulai triase harian", exit=B(), entry=T(), direct=True)
d.edge(watcher, copilot, SYNC, "tanya asisten", exit=R(0.5), entry=L(0.3), lane=d.lane(after=0))
d.edge(copilot, chat, SYNC, "POST /api/chat", exit=R(0.5), entry=L(0.3), lane=d.lane(after=1))
d.edge(memsync, internal, SYNC, "GET+POST uid", exit=R(0.5), entry=L(0.5), lane=d.lane(after=1))
d.edge(pantau, watchapi, SYNC, "GET+POST antrean", exit=R(0.5), entry=L(0.7), lane=d.lane(after=1))

d.edge(chat, pillars, SYNC, "valid → hitung", exit=R(0.5), entry=L(0.3), lane=d.lane(after=2))
d.edge(pillars, fixtures, DATA, "baca rekaman+overlay", exit=R(0.4), entry=L(0.3), lane=d.lane(after=3))
d.edge(chateng, origin, DATA, "span + link asal", exit=R(0.6), entry=L(0.5), lane=d.lane(after=3))
d.edge(graph, fixtures, DATA, "events ≤6 + span", exit=R(0.8), entry=L(0.7), lane=d.lane(after=3))

d.edge(internal, mem, DATA, "uid ↔ GCS", exit=B(0.5), entry=T(0.5), band=d.band(below_row=0))
d.edge(llm, gcs, DATA, "cache sha + budget", exit=B(0.5), entry=R(0.5), lane=d.lane(after=2))
d.edge(watchapi, review, DATA, "baca + putus antrean", exit=R(0.5), entry=L(0.4), lane=d.lane(after=2))
d.edge(review, fixtures, DATA, "accepted → overlay → mesin", exit=R(0.5), entry=L(0.8), lane=d.lane(after=3))

d.edge(sweep, review, EVENT, "kandidat baru", exit=R(0.5), entry=L(0.5), lane=d.lane(after=3))
d.edge(internal, sweep, PLUMBING, "cron 17:30 → cek sumber", exit=R(0.7), entry=L(0.3), lane=d.lane(after=2), dashed=True)
d.edge(ship, triase, PLUMBING, "tayang 00018", exit=B(0.2), entry=B(0.8), band=d.band(below_row=1), dashed=True)

d.legend(SYNC, "tanya → jawab")
d.legend(DATA, "baca / tulis")
d.legend(EVENT, "alur lanjut")
d.legend(PLUMBING, "ops", dashed=True)

d.write("docs/diagrams/code/catalyst-connections.drawio")
print("Wrote connections")
