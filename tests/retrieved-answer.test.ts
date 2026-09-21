import { describe, expect, it, vi } from "vitest";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";

const draft = (text: string) => vi.fn().mockResolvedValue({ text });

describe("composeAnswerWithLlm", () => {
  const input = { question: "Kenapa ANTM masuk daftar?", evidenceSummary: "Konsentrasi broker 27,5%.", evidenceNumbers: ["27,5%"] };

  it("returns a grounded draft", async () => {
    const result = await composeAnswerWithLlm(input, draft("Konsentrasi broker mencapai 27,5%."));
    expect(result.text).toContain("27,5%");
  });

  it("rejects a fabricated numeral", async () => {
    await expect(composeAnswerWithLlm(input, draft("Konsentrasi broker mencapai 91,4%."))).rejects.toThrow(/verifier/);
  });

  it("rejects advisory phrasing", async () => {
    await expect(composeAnswerWithLlm(input, draft("Konsentrasinya tinggi, sebaiknya beli."))).rejects.toThrow(/verifier/);
  });

  it("rejects an English draft for an Indonesian question", async () => {
    await expect(composeAnswerWithLlm(input, draft("The broker concentration is high and that is why it is listed."))).rejects.toThrow(/verifier/);
  });
});
