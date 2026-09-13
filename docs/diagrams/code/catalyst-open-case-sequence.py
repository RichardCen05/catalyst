"""Buka bedah — santai + contoh. Dibuat dengan orthogram sequence."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-sequence-diagrams")
from seq_drawio import Sequence

s = Sequence("Buka bedah BBCA", "kamu · layar · dapur · gudang")
w = s.actor("Kamu", "orangnya")
t = s.actor("Hari Ini", "misal BBCA naik")
c = s.actor("Bedah", "cerita si BBCA")
k = s.actor("Tukang cek", "tukang uji")
v = s.actor("Gudang", "harga + catatanku")

s.call(w, t, "liatin jagoanku dong", blocking=True)
s.reply(t, w, "nih BBCA naik 3% paling atas")
s.call(w, c, "buka BBCA dong", blocking=True)
s.call(c, k, "coba uji BBCA", blocking=True)
s.call(k, v, "minta harga + berita BBCA", blocking=True)
s.reply(v, k, "nih harga + berita + maumu")
s.reply(k, c, "nih 4 bukti + yang ga cocok")
s.reply(c, w, "nih cerita + bukti + PR-nya")
s.send(c, v, "simpan coretanku")
s.note(v, "angka dari 11 Sep kemarin, bukan live", row=8)
s.frame("kalo nanya", rows=[8, 10])
s.call(w, c, "kok masuk hari ini?", blocking=True)
s.reply(c, w, "soalnya ini... sumbernya ini")
s.write("docs/diagrams/code/catalyst-open-case-sequence.drawio")
print("Wrote seq santai")
