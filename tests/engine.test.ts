import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";
import { isCompleteCitation } from "@/lib/agent/gates";

describe("Catalyst agent engine", () => {
  it("personalizes explanation order without changing facts or verdict", () => {
    const flow = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);
    const catalyst = agentEngine.analyzeCompany("ANTM", demoProfiles[1]);

    expect(flow).not.toBeNull();
    expect(catalyst).not.toBeNull();
    expect(flow?.evidenceState).toBe(catalyst?.evidenceState);
    expect(flow?.pillars[0].key).toBe("concentration");
    expect(catalyst?.pillars[0].key).toBe("catalyst");
    expect(
      flow?.pillars.flatMap((pillar) => pillar.metrics).map((metric) => metric.value).sort(),
    ).toEqual(
      catalyst?.pillars.flatMap((pillar) => pillar.metrics).map((metric) => metric.value).sort(),
    );
  });

  it("limits event impact to the active watchlist", () => {
    const event = agentEngine.mapEventImpact("evt-nickel", demoProfiles[0], "watchlist");
    expect(event).not.toBeNull();
    expect(event?.impactLinks.every((link) => demoProfiles[0].watchlist.includes(link.symbol))).toBe(true);
  });

  it("fails closed for an unknown ticker", () => {
    expect(agentEngine.analyzeCompany("XXXX", demoProfiles[0])).toBeNull();
    const answer = agentEngine.answerFollowUp({ question: "Jelaskan XXXX", profile: demoProfiles[0] });
    expect(answer.intent).toBe("unknown");
    expect(answer.text).toContain("Belum ada bukti yang cukup");
  });

  it("gives every six-company metric complete citation metadata", () => {
    for (const symbol of ["ANTM", "BBCA", "BBRI", "TLKM", "GOTO", "PGAS"] as const) {
      const analysis = agentEngine.analyzeCompany(symbol, demoProfiles[0]);
      expect(analysis).not.toBeNull();
      expect(analysis?.pillars.flatMap((pillar) => pillar.metrics).every((metric) =>
        metric.citations.length > 0 && metric.citations.every(isCompleteCitation),
      )).toBe(true);
    }
  });

  it("keeps all five chat intents free of transaction instructions", () => {
    const questions = [
      "Kenapa ANTM masuk daftar hari ini?",
      "Berita nikel ini berdampak ke watchlist saya?",
      "Bandingkan konsentrasi BBCA dan BBRI.",
      "Data apa yang belum diperiksa untuk ANTM?",
      "Apakah saya harus beli ANTM?",
    ];
    const banned = /\b(beli|jual|entry|stop\s*loss|target\s*price|take\s*profit|cuan|bandar|manipulasi)\b/i;
    for (const question of questions) {
      const answer = agentEngine.answerFollowUp({ question, profile: demoProfiles[0] });
      expect(answer.text).not.toMatch(banned);
    }
  });

  it("builds a cited causal chain across source, mechanism, company, and observation", () => {
    const graph = agentEngine.buildCausalGraph("ANTM", demoProfiles[0], { scope: "market", minRelevance: 60 });

    expect(graph).not.toBeNull();
    expect(new Set(graph?.nodes.map((node) => node.kind))).toEqual(
      new Set(["source", "mechanism", "company", "observation"]),
    );
    expect(graph?.nodes.some((node) => node.sourceType === "weather")).toBe(true);
    expect(graph?.edges.length).toBeGreaterThan(4);
    expect(graph?.edges.every((edge) =>
      edge.citations.length > 0 && edge.citations.every(isCompleteCitation),
    )).toBe(true);
    expect(graph?.edges.every((edge) =>
      edge.exposure && edge.expectedObservable && edge.alternativeExplanation
      && edge.falsificationCondition && edge.confidenceBasis && edge.lag,
    )).toBe(true);
  });

  it("organizes company analysis as a hypothesis-driven Research Case", () => {
    const researchCase = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);

    expect(researchCase?.caseId).toMatch(/^CASE-ANTM-/);
    expect(researchCase?.trigger.title).toBeTruthy();
    expect(researchCase?.mandate).toContain("Investigasi perubahan ANTM");
    expect(researchCase?.lifecycle.map((step) => step.key)).toEqual(["mandate", "decompose", "source-plan", "evidence", "review"]);
    expect(researchCase?.sourcePlan.length).toBeGreaterThan(2);
    expect(researchCase?.unresolvedQuestions.length).toBeGreaterThan(3);
    expect(researchCase?.pillars.every((pillar) =>
      pillar.protocol.claim && pillar.protocol.supportingEvidence && pillar.protocol.challengingEvidence
      && pillar.protocol.insufficientWhen && pillar.protocol.nextQuestion,
    )).toBe(true);
  });

  it("treats a user correction as an open hypothesis without changing analysis facts", () => {
    const before = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);
    const answer = agentEngine.answerFollowUp({
      question: "Kenapa ANTM masuk daftar hari ini?",
      profile: demoProfiles[0],
      userInsights: [{
        id: "insight-test",
        symbol: "ANTM",
        pillar: "catalyst",
        category: "missing-context",
        note: "Kontrak penjualan belum dibedakan per mata uang.",
        status: "pending",
        createdAt: "2026-09-12T10:00:00.000Z",
        reviewHistory: [{ status: "pending", at: "2026-09-12T10:00:00.000Z" }],
      }],
    });
    const after = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);

    expect(answer.hypotheses.some((item) => item.id === "insight-test" && item.outcome === "open")).toBe(true);
    expect(answer.preferenceNote).toContain("catatan user");
    expect(after?.evidenceState).toBe(before?.evidenceState);
    expect(after?.pillars.flatMap((pillar) => pillar.metrics)).toEqual(
      before?.pillars.flatMap((pillar) => pillar.metrics),
    );
  });
});
