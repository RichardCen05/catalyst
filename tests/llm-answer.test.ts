import { describe, expect, it, vi } from "vitest";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

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

  it("tells the model the answer language in that language", async () => {
    const call = vi.fn().mockResolvedValue({ text: "PGAS evidence is mixed because the market layer and the business layer disagree." });
    await composeAnswerWithLlm({ question: "Why is the PGAS evidence mixed?", evidenceSummary: "Status bukti PGAS: Bukti bercampur. Lapisan pasar dan lapisan bisnis tidak searah.", evidenceNumbers: [] }, call);
    expect(call.mock.calls[0][0].contents).toMatch(/Write the answer in English\./);
  });
  it("reads the language from the reader's words, not from a quoted headline", async () => {
    const call = vi.fn().mockResolvedValue({ text: "Jalur ini menghubungkan sengketa kontrak dengan kewajiban kompensasi dan arus kas operasi." });
    const question = "Jelaskan jalur PGAS Loses Partial Arbitration Award to Gunvor untuk PGAS.";
    await composeAnswerWithLlm({
      question, languageSource: "Jelaskan jalur untuk PGAS.",
      evidenceSummary: "Jalur sengketa kontrak → kewajiban kompensasi → arus kas operasi.", evidenceNumbers: [],
    }, call);
    expect(call.mock.calls[0][0].contents).toMatch(/Tulis jawaban dalam bahasa Indonesia\.$/m);
  });

  it("cuts a verbose draft at the sentence cap rather than shipping or dropping it", async () => {
    const call = vi.fn().mockResolvedValue({
      text: "ANTM naik 4,2% pada rekaman ini. Kalimat kedua menambahkan detail. Kalimat ketiga mengulang. Kalimat keempat mengulang lagi. Kalimat kelima yang tidak diminta pembaca. Kalimat keenam juga tidak.",
    });
    const result = await composeAnswerWithLlm({
      question: "Kenapa ANTM naik?",
      evidenceSummary: "Return 3 hari 4,2% pada rekaman ini.",
      evidenceNumbers: ["4,2%"],
    }, call);
    expect(result.text).toContain("Kalimat keempat");
    expect(result.text).not.toContain("Kalimat kelima");
    expect(result.text.split(/(?<=[.!?])\s+/)).toHaveLength(DEFAULT_THRESHOLDS.answerMaxSentences);
  });

  it("asks for a premise the recordings contradict to be corrected first, within the shared cap", async () => {
    const call = vi.fn().mockResolvedValue({ text: "Rekaman tidak menunjukkan penurunan itu; yang terekam naik 4,2%." });
    await composeAnswerWithLlm({
      question: "Kenapa ANTM turun 15% pekan ini?",
      evidenceSummary: "Return 3 hari 4,2% pada rekaman ini.",
      evidenceNumbers: ["4,2%"],
    }, call);
    const { systemInstruction } = call.mock.calls[0][0] as { systemInstruction: string };
    expect(systemInstruction).toMatch(/premis/i);
    expect(systemInstruction).toContain("kalimat pertama");
    // The cap in the prompt and the cap the verifier enforces cannot drift.
    expect(systemInstruction).toContain(`Maksimal ${DEFAULT_THRESHOLDS.answerMaxSentences} kalimat`);
  });
});

describe("grounding across languages", () => {
  it("an English draft of Indonesian material passes on the shared ticker, a meta draft does not", async () => {
    const { groundingViolation } = await import("@/lib/agent/llm/verify");
    const evidence = "Status bukti PGAS: Bukti bercampur. Lapisan pasar dan lapisan bisnis tidak searah.";
    expect(groundingViolation("PGAS evidence is mixed because the market layer and the business layer disagree.", evidence, [])).toBeNull();
    expect(groundingViolation("The available information contains details about this company.", evidence, [])).toBeTruthy();
    expect(groundingViolation("Saham ini sedang dalam pengamatan yang panjang.", evidence, [])).toBeTruthy();
  });
});

describe("numeral ranges", () => {
  it("the right end of a range is an allowed figure on its own", async () => {
    const { extractNumerals, verifyDraft } = await import("@/lib/agent/llm/verify");
    const allowed = extractNumerals("keyakinan Sedang, jeda 1-10 sesi.");
    expect(verifyDraft("Jedanya 1 hingga 10 sesi.", allowed, []).approved).toBe(true);
    expect(verifyDraft("Jedanya 1 hingga 12 sesi.", allowed, []).approved).toBe(false);
  });
});
