import { generateStructured } from "@/lib/agent/llm/client";
import { strongModel } from "@/lib/agent/llm/models";
import { extractNumerals, verifyDraft } from "@/lib/agent/llm/verify";
import type { RecordingDigest } from "@/lib/data/recording-digest";

/**
 * What a reading means and why it matters, written from the measurements.
 *
 * These two sentences used to be a table of hand-written verdicts, one per
 * feed: the broker card always said concentration is fragile, the foreign
 * card always said "asing masuk" is a common reason to buy. That table is a
 * liability in a system whose whole claim is that figures are traceable —
 * it drifts from the data the moment a threshold moves or a feed is added,
 * and nothing fails when it does.
 *
 * So the model writes them, and it is given nothing but the digest: the
 * span, the values, and the comparisons already computed in
 * `lib/data/recording-digest.ts`, including the bounds of what the feed can
 * say. Every numeral in the draft must appear in that material — the
 * verifier rejects the pair otherwise, exactly as it does for chat answers,
 * because a fabricated figure inside provenance is worse than no sentence.
 */

export interface ReadingExplainInput {
  /** Feed address with the emiten collapsed, e.g. `/v2/daily/{symbol}/`. */
  endpoint: string;
  /** Response keys in plain words. */
  fieldGloss: string;
  digest: RecordingDigest;
}

export interface ReadingExplanation {
  /** What the values mean in ordinary terms, and what they do not settle. */
  takeaway: string;
  /** What the reading decides, or the mistake it prevents. */
  why: string;
}

const EXPLAIN_SCHEMA = {
  type: "object",
  properties: {
    takeaway: { type: "string" },
    why: { type: "string" },
  },
  required: ["takeaway", "why"],
};

const SYSTEM_INSTRUCTION = `Kamu menulis dua kalimat pada panel bukti aplikasi riset saham Indonesia, untuk pembaca yang tidak punya latar keuangan.

Kamu diberi: alamat rekaman, arti kolomnya, cakupan yang dibaca, nilai terukur, dan pembanding. Semuanya sudah dihitung. Tugasmu hanya menerjemahkan, bukan menghitung ulang atau menambah fakta.

"takeaway" = apa arti angka-angka itu dalam bahasa sehari-hari, lalu apa yang BELUM dibuktikan angka tersebut.
"why" = kenapa bacaan ini penting bagi orang yang sedang memeriksa sebuah perubahan harga: apa yang ditentukannya, atau kekeliruan apa yang dicegahnya.

Aturan:
1. Pakai HANYA angka yang muncul persis pada bahan yang diberikan. Jangan menghitung angka baru, termasuk persentase, selisih, atau kelipatan.
2. Bila bahan menyebut "Batas arti rekaman" atau "Arti kekosongan", kandungannya wajib tercermin di "takeaway".
3. Jangan memberi saran transaksi (beli, jual, tahan, target harga, stop loss) dan jangan memprediksi harga.
4. Jangan menyebut kode saham, nama emiten, atau nama perusahaan.
5. Jangan menyebut "endpoint", "API", "kolom", "field", "JSON", "data yang diberikan", atau proses internal apa pun.
6. Bahasa Indonesia. "takeaway" maksimal 45 kata, "why" maksimal 35 kata. Tanpa pembuka, tanpa daftar.
7. Bila angka terlihat kecil atau besar, katakan apa adanya lewat pembanding yang diberikan; jangan menilai bagus atau buruk.`;

/** Words that turn a reading into a recommendation. */
const ADVICE = /\b(beli sekarang|jual sekarang|sebaiknya beli|sebaiknya jual|target harga|stop loss|layak dikoleksi|rekomendasi)\b/i;

/** Plumbing a reader never asked about. */
const PLUMBING = /\b(endpoint|api|json|field|payload|request|url)\b/i;

/** A ticker in a sentence cached for every emiten reading this feed. */
const TICKER = /\b[A-Z]{4}\b/;

/** Everything the draft is allowed to quote as a figure. */
function allowedNumerals(input: ReadingExplainInput): string[] {
  return extractNumerals(
    input.endpoint,
    input.fieldGloss,
    input.digest.scope,
    ...input.digest.values.flatMap((entry) => [entry.label, entry.value]),
    ...input.digest.context.flatMap((entry) => [entry.label, entry.value]),
  );
}

function rejectionFor(text: string, label: string, maxWords: number, allowed: string[]): string | undefined {
  if (!text) return `${label} kosong`;
  const violations = verifyDraft(text, allowed, []).violations;
  if (violations.length) return `${label}: ${violations.join("; ")}`;
  if (PLUMBING.test(text)) return `${label} menjelaskan pipa, bukan bacaannya`;
  if (TICKER.test(text)) return `${label} menyebut satu emiten pada kalimat yang dipakai ulang`;
  if (ADVICE.test(text)) return `${label} berisi saran transaksi`;
  if (text.split(/\s+/).length > maxWords) return `${label} lebih panjang dari ${maxWords} kata`;
  return undefined;
}

export async function explainReadingWithLlm(
  input: ReadingExplainInput,
  call: typeof generateStructured = generateStructured,
): Promise<ReadingExplanation> {
  const material = [
    `Alamat: ${input.endpoint}`,
    `Arti kolom: ${input.fieldGloss}`,
    `Cakupan yang dibaca: ${input.digest.scope}`,
    ...input.digest.values.map((entry) => `Nilai — ${entry.label}: ${entry.value}`),
    ...input.digest.context.map((entry) => `Pembanding — ${entry.label}: ${entry.value}`),
  ].join("\n");

  const draft = await call<ReadingExplanation>({
    model: strongModel(),
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: material,
    schema: EXPLAIN_SCHEMA,
  });

  const takeaway = draft.takeaway.trim();
  const why = draft.why.trim();
  const allowed = allowedNumerals(input);
  const rejection = rejectionFor(takeaway, "takeaway", 55, allowed) ?? rejectionFor(why, "why", 45, allowed);
  if (rejection) throw new Error(`Reading explanation rejected: ${rejection}`);
  return { takeaway, why };
}
