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

  it("builds a cited causal chain that terminates in a business outcome", () => {
    const graph = agentEngine.buildCausalGraph("ANTM", demoProfiles[0], { scope: "market", minRelevance: 60 });

    expect(graph).not.toBeNull();
    expect(new Set(graph?.nodes.map((node) => node.kind))).toEqual(
      new Set(["source", "mechanism", "company", "business-impact"]),
    );
    expect(graph?.nodes.filter((node) => node.kind === "business-impact").every((node) => node.citations.length > 0)).toBe(true);
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

  it("compares several hypotheses against one business observable", () => {
    const graph = agentEngine.buildCausalGraph("ANTM", demoProfiles[0], { scope: "market", minRelevance: 60 });

    expect(graph?.targetObservable).toBe("Realisasi harga");
    expect(graph?.competingHypotheses.length).toBeGreaterThanOrEqual(3);
    expect(graph?.competingHypotheses.map((item) => item.rank)).toEqual([1, 2, 3]);
    expect(graph?.competingHypotheses.every((item) =>
      item.targetObservable === graph.targetObservable
      && item.supportingEvidence
      && item.counterEvidence
      && item.discriminator,
    )).toBe(true);
    expect(graph?.edges.every((edge) => edge.businessImpactDimension && edge.businessImpactImplication)).toBe(true);
  });

  it("organizes company analysis as a hypothesis-driven Research Case", () => {
    const researchCase = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);

    expect(researchCase?.caseId).toMatch(/^KASUS-ANTM-/);
    expect(researchCase?.trigger.title).toBeTruthy();
    expect(researchCase?.mandate).toContain("Periksa perubahan ANTM");
    expect(researchCase?.lifecycle.map((step) => step.key)).toEqual(["mandate", "decompose", "source-plan", "evidence", "review"]);
    expect(researchCase?.sourcePlan.length).toBeGreaterThan(2);
    expect(researchCase?.unresolvedQuestions.length).toBeGreaterThan(3);
    expect(researchCase?.pillars.every((pillar) =>
      pillar.protocol.claim && pillar.protocol.supportingEvidence && pillar.protocol.challengingEvidence
      && pillar.protocol.insufficientWhen && pillar.protocol.nextQuestion,
    )).toBe(true);
  });

  it("turns every detected change into an explicit contract and research disposition", () => {
    const researchCase = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);

    expect(researchCase?.materialChange.whatChanged).toContain("ANTM");
    expect(researchCase?.materialChange.baseline).toMatch(/45 hari|sektor/i);
    expect(researchCase?.materialChange.whyMaterial).toBeTruthy();
    expect(researchCase?.materialChange.rule).toBeTruthy();
    expect(researchCase?.researchDisposition.kind).toBe("escalate");
    expect(researchCase?.researchDisposition.reason).toBeTruthy();
    expect(researchCase?.researchDisposition.monitorObservable).toBeTruthy();
    expect(researchCase?.researchDisposition.reopenWhen).toBeTruthy();
  });

  it("blocks an ambiguous mandate until the user chooses a clarification branch", () => {
    const ambiguous = agentEngine.analyzeCompany("ANTM", demoProfiles[0], {
      mandate: "Cari tahu apa yang terjadi pada ANTM.",
    });
    expect(ambiguous?.clarification.required).toBe(true);
    expect(ambiguous?.clarification.options).toHaveLength(2);
    expect(ambiguous?.lifecycle.find((item) => item.key === "decompose")?.state).toBe("blocked");

    const resolved = agentEngine.analyzeCompany("ANTM", demoProfiles[0], {
      mandate: "Cari tahu apa yang terjadi pada ANTM.",
      clarificationChoice: "pricing",
    });
    expect(resolved?.clarification.required).toBe(false);
    expect(resolved?.clarification.selectedOptionId).toBe("pricing");
    expect(resolved?.researchPlan.focus).toBe("pricing");
  });

  it("organizes evidence into market confirmation and business transmission", () => {
    const researchCase = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);

    expect(researchCase?.evidenceLayers).toEqual([
      expect.objectContaining({ key: "market-confirmation", pillarKeys: ["concentration", "volume", "momentum"] }),
      expect.objectContaining({ key: "business-transmission", pillarKeys: ["catalyst"] }),
    ]);
    expect(demoProfiles[0].watchlist).toEqual(["ANTM", "INCO", "TINS", "PGAS", "ADRO", "PTBA"]);
  });

  it("replans the visible investigation when the mandate changes", () => {
    const baseline = agentEngine.analyzeCompany("ANTM", demoProfiles[0]);
    const mandate = "Uji apakah pelemahan rupiah menekan margin dan cash flow ANTM.";
    const replanned = agentEngine.analyzeCompany("ANTM", demoProfiles[0], {
      mandate,
      playbook: {
        preferredComparables: { ANTM: ["INCO"] },
        materialityRules: ["Naikkan prioritas bila margin atau arus kas dapat berubah."],
        knownExposures: ["ANTM: biaya energi dan kontrak USD."],
        thesisAssumptions: ["ANTM: harga jual tidak sepenuhnya mengimbangi biaya USD."],
        trustedSources: ["Sectors financials lalu filing perusahaan."],
        falsifiers: ["ANTM: margin bertahan dan arus kas operasi tidak melemah."],
      },
    });

    expect(replanned?.researchPlan.mandate).toBe(mandate);
    expect(replanned?.researchPlan.focus).toBe("margin");
    expect(replanned?.researchPlan.hypothesisTree[0].claim).toContain("margin");
    expect(replanned?.researchPlan.observables.some((item) => item.dimension === "margin")).toBe(true);
    expect(replanned?.sourcePlan).not.toEqual(baseline?.sourcePlan);
    expect(replanned?.clarificationGate).toContain("margin");
    expect(replanned?.businessImpact.map((item) => item.dimension)).toEqual([
      "volume", "pricing", "margin", "cash-flow", "balance-sheet", "valuation",
    ]);
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
    expect(answer.preferenceNote).toContain("catatan pengguna");
    expect(after?.evidenceState).toBe(before?.evidenceState);
    expect(after?.pillars.flatMap((pillar) => pillar.metrics)).toEqual(
      before?.pillars.flatMap((pillar) => pillar.metrics),
    );
  });
});
