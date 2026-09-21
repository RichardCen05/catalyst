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

/**
 * The rules the draft has to satisfy, plus two the model kept breaking.
 *
 * It opened almost every answer with "Berdasarkan evidence summary yang
 * diberikan" — naming its own plumbing to a reader who has no idea what an
 * evidence summary is. And when the summary did not contain the answer it
 * wrote a flat denial, which reads as "this app has no data" even while the
 * figure sits on screen. Saying what the recordings DO cover is the honest
 * version of not knowing.
 *
 * The number rule stays absolute: the verifier rejects the draft over it, so
 * a model that invents a figure costs the reader the whole answer.
 */
const SYSTEM_INSTRUCTION = `Kamu Copilot riset saham Catalyst. Aturan:
1. Jawab HANYA dari ringkasan bukti yang diberikan. Jangan pernah menuliskan angka yang tidak muncul persis di ringkasan itu.
2. Jangan memberi saran transaksi (beli, jual, target harga, stop loss).
3. Jangan menyebut "evidence summary", "ringkasan bukti", "data yang diberikan", atau proses internal apa pun. Langsung jawab isinya.
4. Bila ringkasan tidak memuat jawabannya, katakan singkat apa yang justru tersedia di ringkasan itu, jangan hanya menyatakan tidak ada informasi.
5. Jawab dalam bahasa pertanyaan: pertanyaan Inggris dijawab Inggris, pertanyaan Indonesia dijawab Indonesia. Istilah teknis, kode saham, dan angka tetap apa adanya.
6. Maksimal 4 kalimat. Tanpa pembuka, tanpa penutup, tanpa daftar bernomor.`;

export async function composeAnswerWithLlm(
  input: AnswerInput,
  call: typeof generateStructured = generateStructured,
): Promise<LlmAnswerDraft> {
  const draft = await call<LlmAnswerDraft>({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: `Pertanyaan: ${input.question}\nEvidence summary: ${input.evidenceSummary}`,
    schema: ANSWER_SCHEMA,
  });
  const verification = verifyDraft(draft.text, input.evidenceNumbers, []);
  if (!verification.approved) throw new Error(`Answer rejected by verifier: ${verification.violations.join("; ")}`);
  return draft;
}
