"""Apa yang diinget — santai + contoh. Dibuat dengan orthogram data-model."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-data-models")
from erd_drawio import Model, L, R, T, B

m = Model("Apa yang diinget", "misal aku jagoin BBCA")

watcher = m.table("aku", ["nama PK", "jagoan misal BBCA", "maunya apa"], col=0, row=0)
company = m.table("saham", ["kode PK misal BBCA", "nama panjang", "grup"], col=1, row=0)
price_day = m.table("harga harian", ["kode FK misal BBCA", "tanggal FK", "harga tutup", "rame ga", "duit asing"], col=2, row=0)

rule = m.table("mauku", ["aturan id PK", "nama aku FK", "banding misal ANTM", "sumber oke", "batas"], col=0, row=1)
case = m.table("bedahan", ["bedah id PK", "kode FK misal BBCA", "dugaan misal naik", "tahap", "pelajaran"], col=1, row=1)
news = m.table("kabar", ["kabar id PK", "kode FK misal BBCA", "tanggal", "judul", "catatan"], col=2, row=1)

proof = m.table("bukti", ["bukti id PK", "bedah id FK", "dugaan", "yang dukung", "yang lawan"], col=1, row=2)

m.rel(watcher, rule, "one-to-many", "bikin misal 3 aturan",
      exit=B(0.5), entry=T(0.5), direct=True)
m.rel(company, price_day, "one-to-many", "punya banyak hari misal 100 hari",
      exit=company.at("kode"), entry=price_day.at("kode", "L"), direct=True)
m.rel(company, news, "one-to-many", "disebut misal 5 kabar",
      exit=R(0.6), entry=L(0.5), corridor=m.corridor(after_col=1))
m.rel(company, case, "one-to-many", "dibedah misal 2x",
      exit=B(0.5), entry=T(0.5), direct=True)
m.rel(case, proof, "one-to-many", "pegang 4 bukti",
      exit=B(0.5), entry=T(0.5), direct=True)
m.rel(watcher, case, "one-to-many", "ikutin misal 6 saham",
      exit=B(0.3), entry=L(0.3), corridor=m.corridor(after_col=0))

m.write("docs/diagrams/code/catalyst-memory-model.drawio")
print("Wrote model santai")
