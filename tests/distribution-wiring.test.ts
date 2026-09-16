import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";
import { isCompleteCitation } from "@/lib/agent/gates";

describe("distribution wiring (Task 6 + C4)", () => {
  it("emits whale metrics for GOTO (recorded filings) with complete citations", async () => {
    const analysis = await agentEngine.analyzeCompany("GOTO", demoProfiles[0]);
    expect(analysis).not.toBeNull();
    if (!analysis) return;
    const conc = analysis.pillars.find((p) => p.key === "concentration");
    expect(conc).toBeDefined();
    if (!conc) return;
    const labels = conc.metrics.map((m) => m.label);
    expect(labels).toContain("Aliran institusi bersih");
    expect(labels).toContain("Pemegang terbesar berubah");
    expect(labels).toContain("Rasio churn broker teratas (proksi)");
    for (const m of conc.metrics.filter((x) => x.label.includes("Aliran") || x.label.includes("Pemegang") || x.label.includes("churn"))) {
      expect(m.citations.length).toBeGreaterThan(0);
      expect(m.citations.every(isCompleteCitation)).toBe(true);
    }
    expect(conc.calculation?.notes.join(" ")).toMatch(/pasar nego tidak teramati/);
    // Gap afiliasi tidak muncul bila ada filings; nego selalu muncul.
    expect(analysis.missingEvidence.join(" ")).toMatch(/pasar negosiasi/);
    expect(analysis.missingEvidence.join(" ")).not.toMatch(/pihak terafiliasi/);
  });

  it("emits gap line and no metric for TLKM (empty filings), without throwing", async () => {
    const analysis = await agentEngine.analyzeCompany("TLKM", demoProfiles[0]);
    expect(analysis).not.toBeNull();
    if (!analysis) return;
    const conc = analysis.pillars.find((p) => p.key === "concentration");
    expect(conc).toBeDefined();
    if (!conc) return;
    expect(conc.metrics.map((m) => m.label)).not.toContain("Aliran institusi bersih");
    expect(analysis.missingEvidence.join(" ")).toMatch(/pihak terafiliasi/);
    expect(analysis.missingEvidence.join(" ")).toMatch(/pasar negosiasi/);
  });
});
