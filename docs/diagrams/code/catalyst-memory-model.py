"""Apa yang diinget — profil, playbook, case, overlay. Dibuat dengan orthogram data-model."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-data-models")
from erd_drawio import Model, L, R, T, B

m = Model("Apa yang diinget", "misal profil pantau ANTM, ambang 85")

watcher = m.table("profile", ["id PK", "watchlist 18 simbol", "pillarOrder + depth"], col=0, row=0)
company = m.table("company", ["symbol PK misal ANTM", "sektor + subsektor", "asOf 11 Sep 2026"], col=1, row=0)
price_day = m.table("price harian", ["symbol FK misal ANTM", "tanggal FK", "close + ihsg + volume"], col=2, row=0)

rule = m.table("playbook", ["profile FK", "relevanceFloor 85", "exposures + falsifiers"], col=0, row=1)
case = m.table("research_case", ["caseId PK", "symbol FK misal ANTM", "lifecycle 5 tahap", "disposisi + resolusi"], col=1, row=1)
news = m.table("market_event", ["event id PK", "symbol FK via impactLinks", "relevansi + arah + path", "overlay accepted?"], col=2, row=1)

proof = m.table("user_insight", ["insight id PK", "symbol FK misal ANTM", "status pending/dismissed", "hipotesis terbuka"], col=1, row=2)

m.rel(watcher, rule, "one-to-one", "punya 1 playbook ambang 85",
      exit=B(0.5), entry=T(0.5), direct=True)
m.rel(company, price_day, "one-to-many", "punya banyak hari rekaman",
      exit=company.at("symbol"), entry=price_day.at("symbol", "L"), direct=True)
m.rel(company, news, "one-to-many", "dipetakan N peristiwa + overlay",
      exit=R(0.6), entry=L(0.5), corridor=m.corridor(after_col=1))
m.rel(company, case, "one-to-many", "dibuka 1 case aktif",
      exit=B(0.5), entry=T(0.5), direct=True)
m.rel(case, proof, "one-to-many", "catatan jadi hipotesis open",
      exit=B(0.5), entry=T(0.5), direct=True)
m.rel(watcher, case, "one-to-many", "triase watchlist aktif",
      exit=B(0.3), entry=L(0.3), corridor=m.corridor(after_col=0))

m.write("docs/diagrams/code/catalyst-memory-model.drawio")
print("Wrote model")
