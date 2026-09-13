"""Yang perlu hati-hati — santai + contoh. Dibuat dengan orthogram threat-model."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-threat-models")
from dfd_drawio import Model, L, R, T, B

m = Model("Yang perlu hati-hati", "misal warnet, layar bareng, BBCA")

watcher = m.entity("Kamu", "orang di rumah", col=0, row=0)
today = m.process("Hari Ini", "kasih liat yang naik", col=1, row=0)
check = m.process("Bedah", "uji misal BBCA", col=2, row=0)
helper = m.process("Tanya-tanya", "jawab + sumber", col=3, row=0)
saved = m.store("Gudang pasar", "harga 11 Sep", col=1, row=1)
mine = m.store("Buku aku", "jagoin + coretan", col=2, row=1)

home = m.boundary("Rumah", cols=[0, 0], rows=[0, 1])
app = m.boundary("Aplikasi", cols=[1, 3], rows=[0, 1])

f1 = m.flow(watcher, today, "jagoanku misal BBCA", exit=R(), entry=L(), direct=True, crosses=home)
f2 = m.flow(today, check, "BBCA naik 3%", exit=R(), entry=L(), direct=True)
f3 = m.flow(check, saved, "minta harga BBCA", exit=B(), entry=T(), direct=True)
f4 = m.flow(check, mine, "baca coretanku", exit=B(0.6), entry=T(0.4), direct=True)
f5 = m.flow(helper, mine, "baca buku buat jawab", exit=B(), entry=T(0.6),
            band=m.band(below_row=0))
f6 = m.flow(check, helper, "teruskan tanya", exit=R(), entry=L(),
            direct=True)

m.threat(f1, "S", "Misal di warnet ada yang ngaku jadi kamu liat BBCA-mu",
         mitigation="Pakai browser sendiri, habis pakai warnet keluar + hapus")
m.threat(f1, "I", "Misal screenshare, list BBCA-mu keliatan orang",
         mitigation="Tutup dulu pas share, jangan pasang nama di gambar")
m.threat(f3, "T", "Misal angka 11 Sep dikira hari ini jalan",
         mitigation="Tiap layar tulis tanggalnya, misal 11 Sep di samping harga")
m.threat(f4, "I", "Misal coretan BBCA kuat dibaca temen",
         mitigation="Coretan cuma di browsermu, ga dikirim keluar")
m.threat(f5, "D", "Misal penolong malah bilang beli aja!",
         mitigation="Dilarang bilang beli-jual, wajib kasih sumber")
m.threat(f6, "E", "Misal coretan dipakai ubah harga BBCA",
         mitigation="Coretan ga bisa ubah angka, cuma bisa ubah urutan")

m.write("docs/diagrams/code/catalyst-trust-review.drawio")
print("Wrote trust santai")
