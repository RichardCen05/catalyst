import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";

describe("leadership honesty (Task 10)", () => {
  it("symbol with recorded leadership event gets observable + gap, without scores", async () => {
    const analysis = await agentEngine.analyzeCompany("BBCA", demoProfiles[0]);
    expect(analysis).not.toBeNull();
    expect(analysis?.researchDisposition.monitorObservable).toMatch(/biaya dan eksekusi pada laporan kuartal berikutnya/);
    expect(analysis?.missingEvidence.join(" ")).toMatch(/Rekam jejak individu/);
    expect(analysis?.nextResearchActions.join(" ")).toMatch(/Batalkan pengaruh pengurus/);
    const blob = JSON.stringify(analysis);
    expect(blob).not.toMatch(/skor pengurus|rating|reputasi/i);
  });

  it("symbol without leadership gets neither", async () => {
    const analysis = await agentEngine.analyzeCompany("GOTO", demoProfiles[0]);
    expect(analysis).not.toBeNull();
    expect(analysis?.missingEvidence.join(" ")).not.toMatch(/Rekam jejak individu/);
    expect(analysis?.nextResearchActions.join(" ")).not.toMatch(/Batalkan pengaruh pengurus/);
  });
});
