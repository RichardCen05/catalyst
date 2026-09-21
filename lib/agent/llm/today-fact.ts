import { generateStructured } from "@/lib/agent/llm/client";
import { extractNumerals, verifyDraft } from "@/lib/agent/llm/verify";
import type { RecordingDigest } from "@/lib/data/recording-digest";

/**
 * One friendly line about what a recording says for a single emiten, for the
 * floating assistant to say out loud before anybody has asked it anything.
 *
 * The invitation is the only part of the app that speaks first, so it is also
 * the easiest place to start inventing: a hand-written "hari ini ANTM ramai"
 * would survive every data refresh and keep being cheerful about a session it
 * no longer describes. The model is therefore given the daily digest and
 * nothing else — the same measurements the evidence panel is written from —
 * and every numeral it writes must appear in that material.
 *
 * Unlike `reading-explain`, naming the emiten here is required rather than
 * forbidden: the draft is cached per symbol, so the sentence is never reused
 * under a different ticker. Naming a *second* emiten is what gets rejected.
 */
export interface TodayFactInput {
  symbol: string;
  digest: RecordingDigest;
}

export interface TodayFact {
  /** One sentence naming the emiten and a measured figure from the recording. */
  fact: string;
}

const FACT_SCHEMA = {
  type: "object",
  properties: { fact: { type: "string" } },
  required: ["fact"],
};

const SYSTEM_INSTRUCTION = `Kamu menulis SATU kalimat sapaan pada tombol asisten aplikasi riset saham Indonesia, untuk pembaca yang tidak punya latar keuangan.

Kamu diberi: kode emiten, cakupan rekaman, nilai terukur, dan pembanding. Semuanya sudah dihitung. Tugasmu hanya menyampaikan satu hal menarik dari bahan itu, bukan menghitung ulang atau menambah fakta.

Aturan:
1. Pakai HANYA angka yang muncul persis pada bahan yang diberikan. Jangan menghitung angka baru, termasuk persentase, selisih, atau kelipatan.
2. Sebut kode emiten yang diberikan, tepat satu kali. Jangan menyebut kode emiten lain.
3. Jangan memberi saran transaksi (beli, jual, tahan, target harga, stop loss) dan jangan memprediksi harga.
4. Jangan menyebut sebab. Rekaman mencatat apa yang terjadi, bukan kenapa.
5. Jangan menilai bagus atau buruk. Sampaikan angkanya apa adanya lewat pembanding yang diberikan.
6. Jangan menyebut "endpoint", "API", "kolom", "field", "JSON", "data yang diberikan", atau proses internal apa pun.
7. Bahasa Indonesia, maksimal 20 kata, satu kalimat, nada ramah dan ringan. Tanpa daftar, tanpa tanda kutip.`;

/** Words that turn a fact into a recommendation. */
const ADVICE = /\b(beli sekarang|jual sekarang|sebaiknya beli|sebaiknya jual|target harga|stop loss|layak dikoleksi|rekomendasi)\b/i;

/** Plumbing a reader never asked about. */
const PLUMBING = /\b(endpoint|api|json|field|payload|request|url)\b/i;

/** Causal language the recording cannot support. */
const CAUSAL = /\b(karena|akibat|disebabkan|dipicu|gara-gara|imbas)\b/i;

/** Everything the draft is allowed to quote as a figure. */
function allowedNumerals(input: TodayFactInput): string[] {
  return extractNumerals(
    input.symbol,
    input.digest.scope,
    ...input.digest.values.flatMap((entry) => [entry.label, entry.value]),
    ...input.digest.context.flatMap((entry) => [entry.label, entry.value]),
  );
}

function rejectionFor(text: string, symbol: string, allowed: string[]): string | undefined {
  if (!text) return "kalimat kosong";
  const violations = verifyDraft(text, allowed, []).violations;
  if (violations.length) return violations.join("; ");
  const tickers: string[] = text.match(/\b[A-Z]{4}\b/g) ?? [];
  if (!tickers.includes(symbol)) return `kalimat tidak menyebut ${symbol}`;
  if (tickers.some((ticker) => ticker !== symbol)) return "kalimat menyebut emiten lain";
  if (PLUMBING.test(text)) return "kalimat menjelaskan pipa, bukan rekamannya";
  if (ADVICE.test(text)) return "kalimat berisi saran transaksi";
  if (CAUSAL.test(text)) return "kalimat menyebut sebab yang tidak direkam";
  if (text.split(/\s+/).length > 26) return "kalimat lebih panjang dari 26 kata";
  return undefined;
}

export async function writeTodayFactWithLlm(
  input: TodayFactInput,
  call: typeof generateStructured = generateStructured,
): Promise<TodayFact> {
  const material = [
    `Kode emiten: ${input.symbol}`,
    `Cakupan yang dibaca: ${input.digest.scope}`,
    ...input.digest.values.map((entry) => `Nilai — ${entry.label}: ${entry.value}`),
    ...input.digest.context.map((entry) => `Pembanding — ${entry.label}: ${entry.value}`),
  ].join("\n");

  const draft = await call<TodayFact>({
    model: process.env.GEMINI_MODEL || "gemini-3.8-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: material,
    schema: FACT_SCHEMA,
  });

  const fact = draft.fact.trim();
  const rejection = rejectionFor(fact, input.symbol, allowedNumerals(input));
  if (rejection) throw new Error(`Today fact rejected: ${rejection}`);
  return { fact };
}
