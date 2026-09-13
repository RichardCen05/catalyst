import { generateStructured } from "@/lib/agent/llm/client";
import { verifyDraft } from "@/lib/agent/llm/verify";

export interface LlmAnswerDraft {
  text: string;
}

export interface AnswerInput {
  question: string;
  evidenceSummary: string;
  evidenceNumbers: string[];
}

const ANSWER_SCHEMA = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
};

const SYSTEM_INSTRUCTION = `Kamu Copilot investor. Jawab pertanyaan HANYA dari evidence summary yang diberikan. Jangan pernah menuliskan angka yang tidak muncul persis di evidence summary. Jangan memberi saran transaksi (beli/jual/target price).`;

export async function composeAnswerWithLlm(
  input: AnswerInput,
  call: typeof generateStructured = generateStructured,
): Promise<LlmAnswerDraft> {
  const draft = await call<LlmAnswerDraft>({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: `Pertanyaan: ${input.question}\nEvidence summary: ${input.evidenceSummary}`,
    schema: ANSWER_SCHEMA,
  });
  const verification = verifyDraft(draft.text, input.evidenceNumbers, []);
  if (!verification.approved) throw new Error(`Answer rejected by verifier: ${verification.violations.join("; ")}`);
  return draft;
}
