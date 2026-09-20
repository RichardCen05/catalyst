import { describe, expect, it } from "vitest";
import { POST as analyze } from "@/app/api/analyze/route";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";
import { buildLearningSnapshot, feedbackRankDelta } from "@/lib/learning";
import { useCatalystStore } from "@/lib/store";
import type { CaseResolution, FeedbackEvent, InvestorResearchPlaybook, LearnedPreference, RuleProposal, UserInsight } from "@/lib/types";

const request = (path: string, body: unknown) => new Request(`http://localhost${path}`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify(body),
});

const playbook: InvestorResearchPlaybook = {
  preferredComparables: { ANTM: ["INCO"] },
  materialityRules: ["Uji perubahan laba dan arus kas."],
  knownExposures: [],
  thesisAssumptions: [],
  trustedSources: [],
  falsifiers: [],
};

const feedback: FeedbackEvent = {
  id: "fb-1",
  symbol: "ANTM",
  targetId: "pillar:ANTM:concentration",
  targetLabel: "ANTM · Konsentrasi",
  action: "useful",
  createdAt: "2026-09-18T09:00:00.000Z",
};

const preference: LearnedPreference = {
  id: "learned-fb-1",
  label: "Bukti ini berguna",
  explanation: "Dipelajari dari masukan yang dapat dibatalkan.",
  source: "feedback",
  active: true,
};

const insight: UserInsight = {
  id: "insight-1",
  symbol: "ANTM",
  pillar: "catalyst",
  category: "missing-context",
  note: "Kontrak USD dan IDR belum dibedakan dalam jalur margin.",
  status: "pending",
  createdAt: "2026-09-18T09:01:00.000Z",
  reviewHistory: [{ status: "pending", at: "2026-09-18T09:01:00.000Z" }],
};

const resolution: CaseResolution = {
  outcome: "challenged",
  finalHypothesis: "Hipotesis awal tidak cukup didukung oleh realisasi berikutnya.",
  falsifiedBy: "Margin tidak turun saat harga acuan melemah.",
  wrongAssumption: "Harga acuan dianggap langsung masuk ke margin.",
  reusableRule: "Uji harga realisasi dan margin sebelum menaikkan prioritas.",
  resolvedAt: "2026-09-18T09:02:00.000Z",
};

const proposal: RuleProposal = {
  id: "proposal-1",
  symbol: "ANTM",
  kind: "falsifier",
  rule: resolution.reusableRule,
  evidence: resolution.falsifiedBy,
  sourceResolutionAt: resolution.resolvedAt,
  status: "accepted",
  createdAt: resolution.resolvedAt,
};

describe("AI Learning view model", () => {
  it("keeps feedback, correction, and accepted rule traceable to their stored inputs", () => {
    const snapshot = buildLearningSnapshot({
      feedback: [feedback],
      preferences: [preference],
      insights: [insight],
      caseResolutions: { ANTM: resolution },
      ruleProposals: [proposal],
      playbook,
    });

    expect(snapshot.items.map((item) => item.kind)).toEqual(["resolution", "insight", "feedback"]);
    expect(snapshot.items.find((item) => item.id === "feedback-fb-1")).toMatchObject({
      targetLabel: "ANTM · Konsentrasi",
      status: "active",
      effectLabel: expect.stringMatching(/urutan kasus/i),
    });
    expect(snapshot.items.find((item) => item.id.startsWith("insight-"))?.status).toBe("pending");
    expect(snapshot.items.find((item) => item.id.startsWith("resolution-"))?.status).toBe("accepted");
    expect(snapshot.memories.some((item) => item.group === "rule" && item.status === "accepted")).toBe(true);
    expect(snapshot.summary).toMatchObject({ inputCount: 3, pendingCount: 1, activeCount: 3 });
  });

  it("preserves partial legacy data without inventing a preference or a rule decision", () => {
    const snapshot = buildLearningSnapshot({
      feedback: [{ ...feedback, id: "legacy-feedback", targetLabel: undefined }],
      preferences: [],
      insights: [{ ...insight, status: "dismissed", reviewHistory: [{ status: "dismissed", at: insight.createdAt }] }],
      caseResolutions: { ANTM: resolution },
      ruleProposals: [],
      playbook: { ...playbook, materialityRules: [], preferredComparables: {} },
    });

    expect(snapshot.items.find((item) => item.id === "feedback-legacy-feedback")?.status).toBe("active");
    expect(snapshot.items.find((item) => item.id.startsWith("resolution-"))?.status).toBe("stored");
    expect(snapshot.memories.some((item) => item.group === "insight")).toBe(false);
  });

  it("uses only active feedback preferences for dashboard ranking", () => {
    expect(feedbackRankDelta([feedback], [preference], "ANTM")).toBe(10);
    expect(feedbackRankDelta([feedback], [{ ...preference, active: false }], "ANTM")).toBe(0);
    expect(feedbackRankDelta([{ ...feedback, action: "not-useful" }], [preference], "ANTM")).toBe(-10);
  });
});

describe("AI Learning effects", () => {
  it("adds an accepted rule only once", () => {
    const store = useCatalystStore.getState();
    store.resetMemory();
    try {
      useCatalystStore.getState().saveCaseResolution("ANTM", {
        outcome: "supported",
        finalHypothesis: "Hipotesis akhir memiliki dasar bukti yang cukup.",
        falsifiedBy: "Belum ada bukti pembatal tambahan.",
        wrongAssumption: "Asumsi awal perlu diuji ulang pada periode berikutnya.",
        reusableRule: "TerimaMarker uji materialitas sebelum menaikkan prioritas.",
      });
      const created = useCatalystStore.getState().ruleProposals[0]!;
      useCatalystStore.getState().setRuleProposalStatus(created.id, "accepted");
      useCatalystStore.getState().setRuleProposalStatus(created.id, "accepted");
      const rules = useCatalystStore.getState().playbook.materialityRules.filter((item) => item.includes("TerimaMarker"));
      expect(rules).toHaveLength(1);
    } finally {
      useCatalystStore.getState().resetMemory();
    }
  });

  it("surfaces active user insights as case notes without changing market metrics", async () => {
    const baseline = await agentEngine.analyzeCompany("ANTM", demoProfiles[0]);
    const withInsight = await agentEngine.analyzeCompany("ANTM", demoProfiles[0], { userInsights: [insight] });
    expect(withInsight?.userNotes).toEqual([insight]);
    expect(withInsight?.pillars.flatMap((pillar) => pillar.metrics)).toEqual(baseline?.pillars.flatMap((pillar) => pillar.metrics));
  });

  it("accepts an active insight through the analysis API and returns it as a case note", async () => {
    const response = await analyze(request("/api/analyze", { symbol: "ANTM", profile: demoProfiles[0], userInsights: [insight] }));
    const body = await response.json();
    expect(response.status).toBe(200);
    expect(body.analysis.userNotes).toEqual([insight]);
  });
});
