import { generateStructured } from "@/lib/agent/llm/client";
import { strongModel } from "@/lib/agent/llm/models";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { detectLanguage, verifyAnswer } from "@/lib/agent/llm/verify";

export interface LlmAnswerDraft {
  text: string;
}

export interface AnswerInput {
  question: string;
  evidenceSummary: string;
  evidenceNumbers: string[];
  /** The reader's own words when the question quotes something else — a map
   *  node's English headline made "Jelaskan jalur PGAS Loses …" read as an
   *  English question, and the Indonesian draft was rejected for it. */
  languageSource?: string;
}

/**
 * The language instruction, repeated in the language asked for.
 *
 * Rule 5 of the system prompt says the same thing in Indonesian, next to an
 * Indonesian summary, and DeepSeek answered English questions in Indonesian
 * every time — the verifier rejected each draft and the reader got the
 * Indonesian template. An instruction in the target language, after the
 * material, is the one it follows.
 */
function languageLine(language: ReturnType<typeof detectLanguage>): string {
  if (language === "en") return "\nWrite the answer in English. Keep tickers, figures and quoted labels exactly as they appear.";
  if (language === "id") return "\nTulis jawaban dalam bahasa Indonesia.";
  return "";
}

const ANSWER_SCHEMA = {
  type: "object",
  properties: { text: { type: "string" } },
  required: ["text"],
};

/**
 * The rules the draft has to satisfy, plus two the model kept breaking.
 *
 * Rule 4 used to invite the opposite: "say briefly what the summary does
 * cover". Handed a bundle of page text, the model obeyed literally and wrote
 * "Ringkasan yang tersedia memuat informasi mengenai…" — a list of section
 * names with no fact in it. The rule now asks for the nearest fact instead,
 * and `groundingViolation` rejects a draft that ignores it.
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
4. Setiap jawaban menyebut isi ringkasan: nilai, status, nama indikator, atau pemicunya. Bila ringkasan tidak menjawab langsung, sampaikan fakta terdekat dari ringkasan lalu sebut apa yang belum terekam. Jangan pernah mendeskripsikan ringkasan itu sendiri ("informasi yang tersedia memuat…").
5. Jawab dalam bahasa pertanyaan: pertanyaan Inggris dijawab Inggris, pertanyaan Indonesia dijawab Indonesia. Istilah teknis, kode saham, dan angka tetap apa adanya.
6. Maksimal 4 kalimat. Tanpa pembuka, tanpa penutup, tanpa daftar bernomor.`;

export async function composeAnswerWithLlm(
  input: AnswerInput,
  call: typeof generateStructured = generateStructured,
): Promise<LlmAnswerDraft> {
  const draft = await call<LlmAnswerDraft>({
    model: strongModel(),
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: `Pertanyaan: ${input.question}\nEvidence summary: ${input.evidenceSummary}${languageLine(detectLanguage(input.languageSource ?? input.question))}`,
    schema: ANSWER_SCHEMA,
    maxOutputTokens: DEFAULT_THRESHOLDS.answerMaxTokens,
  });
  const verification = verifyAnswer(draft.text, input.evidenceNumbers, input.languageSource ?? input.question, input.evidenceSummary);
  if (!verification.approved) throw new Error(`Answer rejected by verifier: ${verification.violations.join("; ")}`);
  return draft;
}
