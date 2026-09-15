"""Yang perlu hati-hati — gates, overlay, review manusia. Dibuat dengan orthogram threat-model."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-threat-models")
from dfd_drawio import Model, L, R, T, B

m = Model("Yang perlu hati-hati", "misal warnet, share layar, ANTM")

watcher = m.entity("Kamu", "orang di rumah", col=0, row=0)
today = m.process("Dashboard", "triase + disposisi", col=1, row=0)
check = m.process("Engine", "4 pilar + gates", col=2, row=0)
helper = m.process("Copilot", "jawab + sitasi", col=3, row=0)
saved = m.store("Fixtures + overlay", "rekaman 11 Sep + accepted", col=1, row=1)
mine = m.store("Memori GCS", "playbook + insight + resolusi", col=2, row=1)

home = m.boundary("Rumah", cols=[0, 0], rows=[0, 1])
app = m.boundary("Aplikasi", cols=[1, 3], rows=[0, 1])

f1 = m.flow(watcher, today, "watchlist misal ANTM", exit=R(), entry=L(), direct=True, crosses=home)
f2 = m.flow(today, check, "ANTM relevan 90", exit=R(), entry=L(), direct=True)
f3 = m.flow(check, saved, "minta fixtures + overlay", exit=B(), entry=T(), direct=True)
f4 = m.flow(check, mine, "baca playbook + insight", exit=B(0.6), entry=T(0.4), direct=True)
f5 = m.flow(helper, mine, "baca memori buat jawab", exit=B(), entry=T(0.6),
            band=m.band(below_row=0))
f6 = m.flow(check, helper, "teruskan tanya", exit=R(), entry=L(),
            direct=True)

m.threat(f1, "S", "Misal di warnet ada yang ngaku jadi kamu liat ANTM-mu",
         mitigation="Pakai browser sendiri, cookie uid milikmu; habis warnet keluar + hapus")
m.threat(f1, "I", "Misal screenshare, watchlist ANTM-mu keliatan orang",
         mitigation="Tutup dulu pas share, jangan pasang nama di gambar")
m.threat(f3, "T", "Misal rekaman 11 Sep dikira live hari ini",
         mitigation="Tiap layar tulis asOf + staleness; overlay cuma dari accepted")
m.threat(f4, "I", "Misal insight ANTM dibaca temen satu browser",
         mitigation="Insight cuma di persist browsermu + uid GCS-mu")
m.threat(f5, "D", "Misal copilot malah bilang beli aja!",
         mitigation="safeLanguage tolak saran transaksi, wajib sitasi + intent")
m.threat(f6, "E", "Misal kandidat web-watch langsung jadi fakta",
         mitigation="Kandidat impactLinks kosong; manusia accept + tulis path dulu")

m.write("docs/diagrams/code/catalyst-trust-review.drawio")
print("Wrote trust")
