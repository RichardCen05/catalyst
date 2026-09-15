"""Buka case — mandate, clarification, overlay, disposisi. Dibuat dengan orthogram sequence."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-sequence-diagrams")
from seq_drawio import Sequence

s = Sequence("Buka case ANTM", "kamu · dashboard · case · engine · gudang")
w = s.actor("Kamu", "orangnya")
t = s.actor("Dashboard", "triase by rank")
c = s.actor("Case workspace", "lifecycle + gate")
k = s.actor("Engine", "4 pilar + gates")
v = s.actor("Gudang", "fixtures + overlay + memori")

s.call(w, t, "liatin watchlist dong", blocking=True)
s.reply(t, w, "nih ANTM relevan 90 paling atas")
s.call(w, c, "buka ANTM + mandate dong", blocking=True)
s.call(c, k, "analyzeCompany + clarification", blocking=True)
s.call(k, v, "minta fixtures + overlay + playbook", blocking=True)
s.reply(v, k, "nih harga + events + ambang 85")
s.reply(k, c, "nih 4 pilar + hipotesis tanding")
s.reply(c, w, "nih fokus + disposisi + PR-nya")
s.send(c, v, "simpan insight + resolusi")
s.note(v, "rekaman 11 Sep, bukan live; overlay TTL 10 mnt", row=8)
s.frame("kalo nanya", rows=[8, 10])
s.call(w, c, "kok masuk hari ini?", blocking=True)
s.reply(c, w, "soalnya ini... sitasinya ini")
s.write("docs/diagrams/code/catalyst-open-case-sequence.drawio")
print("Wrote seq")
