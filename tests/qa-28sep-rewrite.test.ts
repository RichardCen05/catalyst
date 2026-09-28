import { afterEach, describe, expect, it, vi } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";

vi.mock("@/lib/agent/llm/answer", () => ({ composeAnswerWithLlm: vi.fn() }));

const { composeAnswerWithLlm } = await import("@/lib/agent/llm/answer");
const mockCompose = composeAnswerWithLlm as ReturnType<typeof vi.fn>;

/**
 * F8 of the 28 Sep 2026 QA follow-ups, at the engine: the Indonesian
 * attribution answer came back as "residual di luar IHSG 2,3%" with no beta
 * term, so the reader could not see how much of the move the market explains.
 * The rewrite is handed the figures it must keep.
 */
describe("F8 attribution rewrite keeps the beta term", () => {
  afterEach(() => {
    delete process.env.AGENT_MODE;
    vi.clearAllMocks();
  });

  it("passes beta and the residual as figures the draft must quote", async () => {
    process.env.AGENT_MODE = "llm";
    mockCompose.mockRejectedValue(new Error("Answer rejected by verifier"));
    const profile = demoProfiles[0];
    await agentEngine.answerFollowUp({ question: "Seberapa besar kenaikan ANTM yang disebabkan oleh laporan laba H1 dibanding pergerakan sektor?", profile });
    const analysis = await agentEngine.analyzeCompany("ANTM", profile);
    const calculation = analysis!.pillars.find((pillar) => pillar.key === "momentum")!.calculation!;
    const beta = calculation.substitution.split(" − ")[1].split(" × ")[0];
    expect(mockCompose).toHaveBeenCalledOnce();
    expect(mockCompose.mock.calls[0][0].mustQuote).toEqual(expect.arrayContaining([beta, calculation.result.split(" · ")[0]]));
  });
});
