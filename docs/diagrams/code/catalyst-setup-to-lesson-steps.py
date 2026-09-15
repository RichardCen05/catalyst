"""Dari triase sampai aturan reusable — misal ANTM. Dibuat dengan orthogram step-flow."""
import sys
sys.path.insert(0, "/Users/af/.claude/plugins/cache/orthogram/orthogram/0.2.0/skills/drawing-step-flows")
from step_drawio import Steps, L, R, T, B

s = Steps("Dari triase sampai aturan — misal ANTM", "6 langkah aja")

w = s.node("Kamu", "misal pantau ANTM + 17 lagi", col=0, row=0)
today = s.node("Dashboard", "misal ANTM relevan 90", col=1, row=0)
check = s.node("Case", "misal fokus pricing?", col=2, row=0)
links = s.node("Impact graph", "misal ≤6 sumber + tanding", col=2, row=1)
helper = s.node("Copilot", "misal kurang sumber apa?", col=1, row=1)
keep = s.node("Playbook", "misal aturan ANTM, simpen!", col=0, row=1)

s.step(w, today, "triase by rank + konflik", exit=R(), entry=L(), direct=True)
s.step(today, check, "buka ANTM + mandate", exit=R(), entry=L(), direct=True)
s.step(check, links, "buildCausalGraph ≤6", exit=B(), entry=T(), direct=True)
s.step(links, helper, "nanya kurang apa?", exit=L(), entry=R(), direct=True)
s.step(helper, keep, "accept usul aturan", exit=L(), entry=R(), corridor=s.corridor(after_col=0))
s.step(keep, w, "besok kepake lagi", exit=T(), entry=B(), band=s.band(below_row=0))
s.link(today, helper, "nanya cepat aja", exit=B(), entry=T(), direct=True)
s.note("Misal: rekaman 11 Sep + overlay. Insight ga ubah angka.", col=0, row=1.4, w=340)

s.write("docs/diagrams/code/catalyst-setup-to-lesson-steps.drawio")
print("Wrote steps")
