"""Ritual harian — triase, clarification gate, disposisi. Dibuat dengan orthogram flowchart."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-flowcharts")
import flow_drawio as F
from flow_drawio import Flow, L, R, T, B

F.COL_PITCH = 520
f = Flow("Triase harian sampai disposisi", "watchlist 18 emiten · ambang relevansi 85")

s0 = f.start("Buka Dashboard /", col=0, row=0)
s1 = f.process("Pilih watchlist misal ANTM", col=0, row=1)
q1 = f.decision("Ada perubahan material? relevansi ≥85?", col=0, row=2)
wait = f.terminal("Pantau dulu · balik lagi nanti", col=1, row=2)
s2 = f.process("Buka case /cases/ANTM", col=0, row=3)
s3 = f.process("Baca 4 pilar + sitasi", col=0, row=4)
q2 = f.decision("Clarification required? fokus belum dipilih?", col=0, row=5)
s4 = f.process("Pilih fokus bisnis misal pricing", col=1, row=5)
s5 = f.process("Uji jalur + hipotesis tanding", col=0, row=6)
q3 = f.decision("Bukti cukup eskalasi?", col=0, row=7)
note = f.process("Pantau observable · tunggu data", col=1, row=7)
s6 = f.process("Simpan resolusi + usul aturan", col=0, row=8)
end = f.terminal("Beress · rule proposal pending", col=0, row=9)
end2 = f.terminal("Beress · observable dipantau", col=1, row=8)

f.then(s0, s1)
f.then(s1, q1)
f.branch(q1, yes=s2, no=wait, yes_label="Ya · misal ANTM relevan 90", no_label="Ga · di bawah ambang")
f.then(s2, s3)
f.then(s3, q2)
f.branch(q2, yes=s4, no=s5, yes_label="Ya · pilih dulu", no_label="Ga · fokus keset")
f.to(s4, s5, "clarificationChoice kesimpen", exit=B(), entry=R(), corridor=f.corridor(after_col=0))
f.then(s5, q3)
f.branch(q3, yes=s6, no=note, yes_label="Ya · eskalasi riset", no_label="Belum · monitor/dismiss")
f.then(s6, end)
f.then(note, end2)

f.pool("Kamu", cols=[0])
f.pool("Penolong", cols=[1])
f.legend(F.FLOW, "jalan utama")
f.write("docs/diagrams/code/catalyst-daily-flow.drawio")
print("Wrote flow")
