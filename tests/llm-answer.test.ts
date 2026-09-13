import { describe, expect, it, vi } from "vitest";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";

describe("composeAnswerWithLlm", () => {
  it("accepts a draft whose numbers all trace back", async () => {
    const call = vi.fn().mockResolvedValue({ text: "ANTM naik 4,2% pada jendela ini." });
    const result = await composeAnswerWithLlm({ question: "Kenapa ANTM naik?", evidenceSummary: "Return 3 hari 4,2%.", evidenceNumbers: ["4,2%"] }, call);
    expect(result.text).toBe("ANTM naik 4,2% pada jendela ini.");
  });
  it("rejects a draft with hallucinated number", async () => {
    const call = vi.fn().mockResolvedValue({ text: "ANTM naik 999% hari ini." });
    await expect(composeAnswerWithLlm({ question: "Kenapa ANTM naik?", evidenceSummary: "Return 3 hari 4,2%.", evidenceNumbers: ["4,2%"] }, call)).rejects.toThrow(/999%/);
  });
});
