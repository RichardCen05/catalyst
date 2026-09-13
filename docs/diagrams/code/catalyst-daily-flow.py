"""Ritual harian — santai + contoh BBCA. Dibuat dengan orthogram flowchart."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-flowcharts")
import flow_drawio as F
from flow_drawio import Flow, L, R, T, B

F.COL_PITCH = 520
f = Flow("Cek harian kayak ngopi pagi", "misal jagoin BBCA, ANTM, GOTO")

s0 = f.start("Buka Hari Ini", col=0, row=0)
s1 = f.process("Pilih 6 jagoanmu misal BBCA", col=0, row=1)
q1 = f.decision("Ada yang gerak gede? misal naik 3%?", col=0, row=2)
wait = f.terminal("Santai dulu · balik lagi nanti", col=1, row=2)
s2 = f.process("Buka bedahnya misal BBCA", col=0, row=3)
s3 = f.process("Baca 4 bukti misal siapa beli", col=0, row=4)
q2 = f.decision("Ceritanya nyambung?", col=0, row=5)
s4 = f.process("Coba tebakan lain misal GOTO", col=1, row=5)
s5 = f.process("Tanya yang kurang misal beritanya mana", col=0, row=6)
q3 = f.decision("Udah pede simpulkan?", col=0, row=7)
note = f.process("Coret catatan · pantau dulu", col=1, row=7)
s6 = f.process("Simpan pelajaran misal BBCA kuat", col=0, row=8)
end = f.terminal("Beress · pelajaran kesimpen", col=0, row=9)
end2 = f.terminal("Beress · catatan kesimpen", col=1, row=8)

f.then(s0, s1)
f.then(s1, q1)
f.branch(q1, yes=s2, no=wait, yes_label="Ya · misal BBCA naik", no_label="Ga · anteng semua")
f.then(s2, s3)
f.then(s3, q2)
f.branch(q2, yes=s5, no=s4, yes_label="Ya · nyambung", no_label="Ga · coba yang lain")
f.to(s4, s5, "misal pilih GOTO", exit=B(), entry=R(), corridor=f.corridor(after_col=0))
f.then(s5, q3)
f.branch(q3, yes=s6, no=note, yes_label="Ya · pede", no_label="Belum · liat dulu")
f.then(s6, end)
f.then(note, end2)

f.pool("Kamu", cols=[0])
f.pool("Penolong", cols=[1])
f.legend(F.FLOW, "jalan utama")
f.write("docs/diagrams/code/catalyst-daily-flow.drawio")
print("Wrote flow santai")
