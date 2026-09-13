"""Gambaran besar — bahasa santai + contoh. Dibuat dengan orthogram."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-architecture-diagrams")
from arch_drawio import Diagram, SYNC, EVENT, DATA, PLUMBING, L, R, T, B

d = Diagram("Catalyst — isinya apa aja sih?", subtitle="Ikutin geraknya. Pegang buktinya. misal BBCA naik.")

person = d.panel("Kamu", col=0, row=0)
watcher = person.card("Kamu", "misal: jagoin BBCA, ANTM, GOTO")
reader = person.card("Cek tiap hari", "buka Hari Ini, liat apa yang gerak")

screens = d.panel("Layar yang kamu buka", col=1, row=0)
today = screens.card("Hari Ini", "misal: BBCA naik 3%, GOTO rame")
case = screens.card("Bedah", "misal: kok BBCA naik? cek 4 bukti")
links = screens.card("Alur duit", "misal: kabar oke -> jualan naik -> harga naik?")
helper = screens.card("Tanya-tanya", "misal: kok masuk hari ini? dijawab + sumber")
rules = screens.card("Mauku", "misal: cuma mau yang naik >2%")

checker = d.panel("Dapur di belakang", col=2, row=0)
proofs = checker.card("Tukang cek", "misal: siapa beli? rame ga? ikut pasar ga?")
mapper = checker.card("Tukang gambar", "misal: sebabnya apa, hasilnya apa")
answerer = checker.card("Tukang jawab", "jawab + kasih liat sumbernya")
gate = checker.card("Pak jujur", "ga boleh ajak beli-jual, wajib ada sumber")

saved = d.panel("Gudang simpan", col=3, row=0)
records = saved.card("Buku pasar", "misal: harga + berita 11 Sep kemarin")
notebook = saved.card("Buku aku", "misal: jagoin apa, catatan, pelajaran")
price_history = saved.card("Catat harga", "misal: harga BBCA tiap hari")

ops = d.panel("Urus-urus", col=3, row=1)
builder = ops.card("Tukang rapi", "beresin arsip sekali aja")
keeper = ops.card("Tukang ingat", "ingetin kamu di browser ini")

d.edge(reader, today, SYNC, "buka Hari Ini", exit=R(0.5), entry=L(0.3), lane=d.lane(after=0))
d.edge(watcher, case, SYNC, "pilih misal BBCA", exit=R(0.5), entry=L(0.5), lane=d.lane(after=0))

d.edge(today, proofs, SYNC, "misal BBCA gerak apa", exit=R(0.3), entry=L(0.25), lane=d.lane(after=1))
d.edge(case, proofs, SYNC, "cek si BBCA dong", exit=R(0.5), entry=L(0.4), lane=d.lane(after=1))
d.edge(links, mapper, SYNC, "adu 2 tebakan", exit=R(0.5), entry=L(0.5), lane=d.lane(after=1))
d.edge(helper, answerer, SYNC, "nanya santai", exit=R(0.5), entry=L(0.65), lane=d.lane(after=1))
d.edge(rules, gate, SYNC, "mauku yang gede aja", exit=R(0.5), entry=L(0.8), lane=d.lane(after=1))

d.edge(proofs, records, DATA, "baca buku pasar", exit=R(0.3), entry=L(0.3), lane=d.lane(after=2))
d.edge(mapper, records, DATA, "baca laporan", exit=R(0.5), entry=L(0.5), lane=d.lane(after=2))
d.edge(answerer, notebook, DATA, "baca buku aku", exit=R(0.7), entry=L(0.7), lane=d.lane(after=2))
d.edge(gate, notebook, DATA, "cek mauku", exit=R(0.85), entry=L(0.85), lane=d.lane(after=2))
d.edge(proofs, price_history, DATA, "liat catat harga", exit=R(0.4), entry=L(0.4), lane=d.lane(after=2))

d.edge(proofs, builder, PLUMBING, "minta beresin", exit=R(0.35), entry=L(0.3), lane=d.lane(after=2), dashed=True)
d.edge(gate, keeper, PLUMBING, "simpan di sini", exit=R(0.6), entry=L(0.6), lane=d.lane(after=2), dashed=True)

d.edge(watcher, reader, EVENT, "mulai cek harian", exit=B(), entry=T(), direct=True)

d.legend(SYNC, "kamu tanya, layar jawab")
d.legend(DATA, "baca yang disimpan")
d.legend(EVENT, "lanjut liat")
d.legend(PLUMBING, "urus-urus", dashed=True)

d.write("docs/diagrams/code/catalyst-overview-architecture.drawio")
print("Wrote overview santai")
