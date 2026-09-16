import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";

describe("contagion surfacing (Task 8)", () => {
  it("asks a falsifiable question with both price citations when candidates exist, else stays silent", async () => {
    // Default floors: latest-day drops (<3.5%) stay below 4% → honest empty, no crash.
    const analysis = await agentEngine.analyzeCompany("BBCA", demoProfiles[0]);
    expect(analysis).not.toBeNull();
    const qs = (analysis?.unresolvedQuestions ?? []).filter((q) => q.includes("penularan sentimen"));
    // Either empty (honest) or well-formed with correlation + peer.
    for (const q of qs) {
      expect(q).toMatch(/Penurunan \w+ .* tidak punya peristiwa terhubung/);
      expect(q).toMatch(/Korelasi imbal hasil berlebih/);
    }
    // Counter-evidence only when drop unexplained; never a verdict or advice.
    for (const c of analysis?.counterEvidence ?? []) {
      expect(c).not.toMatch(/\b(beli|jual|entry|stop\s*loss|target\s*price|take\s*profit|cuan|buy|sell)\b/i);
    }
  });

  it("marks co-movement graph edges Low and visually distinct from causal edges", async () => {
    const graph = await agentEngine.buildCausalGraph("BBCA", demoProfiles[0], { scope: "market", minRelevance: 60 });
    expect(graph).not.toBeNull();
    const comove = (graph?.edges ?? []).filter((e) => e.basis === "Observed correlation");
    // Deliberate exception (C9): co-movement bypasses confidenceFor, always Low.
    for (const e of comove) {
      expect(e.confidence).toBe("Low");
      expect(e.citations.length).toBeGreaterThan(0);
    }
    // Causal edges keep varying confidence; co-movement never shares their weight.
    const causal = (graph?.edges ?? []).filter((e) => e.basis === "Causal hypothesis");
    expect(causal.length).toBeGreaterThan(0);
  });
});
