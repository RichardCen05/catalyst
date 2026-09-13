import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";

vi.mock("@/lib/agent/llm/answer", () => ({
  composeAnswerWithLlm: vi.fn(),
}));

const { composeAnswerWithLlm } = await import("@/lib/agent/llm/answer");
const mockCompose = composeAnswerWithLlm as ReturnType<typeof vi.fn>;

describe("answerFollowUp jalur LLM", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AGENT_MODE;
  });

  it("tetap deterministik bila AGENT_MODE bukan llm", async () => {
    const answer = await agentEngine.answerFollowUp({ question: "Kenapa ANTM masuk daftar hari ini?", profile: demoProfiles[0] });
    expect(answer.intent).toBe("why-listed");
    expect(mockCompose).not.toHaveBeenCalled();
  });

  it("pakai teks Gemini bila mode llm dan lolos verifier", async () => {
    process.env.AGENT_MODE = "llm";
    try {
      mockCompose.mockResolvedValue({ text: "ANTM masuk karena arus tercatat menguat." });
      const answer = await agentEngine.answerFollowUp({ question: "Kenapa ANTM masuk daftar hari ini?", profile: demoProfiles[0] });
      expect(mockCompose).toHaveBeenCalledOnce();
      expect(answer.text).toBe("ANTM masuk karena arus tercatat menguat.");
      expect(answer.intent).toBe("why-listed");
      expect(answer.citations.length).toBeGreaterThan(0);
    } finally {
      delete process.env.AGENT_MODE;
    }
  });

  it("jatuh ke teks deterministik bila Gemini gagal/verifier menolak", async () => {
    process.env.AGENT_MODE = "llm";
    try {
      mockCompose.mockRejectedValue(new Error("Answer rejected by verifier"));
      const answer = await agentEngine.answerFollowUp({ question: "Kenapa ANTM masuk daftar hari ini?", profile: demoProfiles[0] });
      expect(answer.intent).toBe("why-listed");
      expect(answer.text).toContain("ANTM masuk karena");
    } finally {
      delete process.env.AGENT_MODE;
    }
  });

  it("tidak pernah menulis ulang penolakan saran transaksi", async () => {
    process.env.AGENT_MODE = "llm";
    try {
      const answer = await agentEngine.answerFollowUp({ question: "Apakah saya harus beli ANTM?", profile: demoProfiles[0] });
      expect(answer.refused).toBe(true);
      expect(mockCompose).not.toHaveBeenCalled();
    } finally {
      delete process.env.AGENT_MODE;
    }
  });
});
