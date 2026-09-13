"""Dari awal sampai pelajaran — santai + contoh. Dibuat dengan orthogram step-flow."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-step-flows")
from step_drawio import Steps, L, R, T, B

s = Steps("Dari awal sampai paham — misal BBCA", "6 langkah aja")

w = s.node("Kamu", "misal mau pantau BBCA", col=0, row=0)
today = s.node("Hari Ini", "misal BBCA naik 3%", col=1, row=0)
check = s.node("Bedah", "misal kok naik?", col=2, row=0)
links = s.node("Alur duit", "misal kabar oke -> laris?", col=2, row=1)
helper = s.node("Tanya-tanya", "misal kurang berita apa?", col=1, row=1)
keep = s.node("Buku aku", "misal BBCA kuat, simpen!", col=0, row=1)

s.step(w, today, "pilih BBCA + 5 lagi", exit=R(), entry=L(), direct=True)
s.step(today, check, "klik BBCA yang naik", exit=R(), entry=L(), direct=True)
s.step(check, links, "adu 2 tebakan misal asing beli?", exit=B(), entry=T(), direct=True)
s.step(links, helper, "nanya kurang apa?", exit=L(), entry=R(), direct=True)
s.step(helper, keep, "simpen misal BBCA kuat", exit=L(), entry=R(), corridor=s.corridor(after_col=0))
s.step(keep, w, "besok kepake lagi", exit=T(), entry=B(), band=s.band(below_row=0))
s.link(today, helper, "nanya cepat aja", exit=B(), entry=T(), direct=True)
s.note("Misal: angka dari 11 Sep. Coretanmu ga ubah angka.", col=0, row=1.4, w=340)

s.write("docs/diagrams/code/catalyst-setup-to-lesson-steps.drawio")
print("Wrote steps santai")
