import { generateStructured } from "@/lib/agent/llm/client";
import { verifyDraft } from "@/lib/agent/llm/verify";
import { glossField } from "@/lib/agent/explain";

/**
 * What a feed holds, in one sentence, written by the model rather than kept
 * as a table in this repository.
 *
 * "Rincian teknis" used to open on `/v2/foreign-flow/ANTM/` and
 * `date, net_foreign_inflow` alone, which tells a reader who does not write
 * HTTP requests neither what was measured nor why a path is on screen. A
 * hand-written sentence per endpoint fixes the reading and rots: the list has
 * to be edited every time a feed is added, and nothing fails when it is not.
 *
 * The model is given only the address, the column names already glossed for
 * this app, and the provider. It describes that material; it does not know
 * the figures and is not asked for any. The verifier rejects a draft carrying
 * a numeral for the same reason the chat verifier does — a described feed is
 * provenance, and a number invented inside provenance is worse than silence.
 *
 * One more rejection is specific to this prompt. The address is templated to
 * `{symbol}` because one sentence serves every emiten, and a draft naming a
 * ticker would be cached against all of them: a first pass wrote "untuk saham
 * ANTM" and that line would then have sat under INCO's foreign flow.
 */

export interface EndpointSummaryInput {
  /** Feed address with the emiten collapsed, e.g. `/v2/daily/{symbol}/`. */
  endpoint: string;
  /** Response keys, verbatim. */
  field: string;
  provider: string;
}

export interface EndpointSummaryDraft {
  summary: string;
}

const SUMMARY_SCHEMA = {
  type: "object",
  properties: { summary: { type: "string" } },
  required: ["summary"],
};

const SYSTEM_INSTRUCTION = `Kamu menulis satu kalimat penjelas untuk panel bukti aplikasi riset saham Indonesia.

Kamu diberi alamat data (endpoint), nama kolom aslinya, arti kolom itu, dan nama penyedia. Tulis SATU kalimat bahasa Indonesia yang menjelaskan isi rekaman di alamat tersebut, untuk pembaca yang tidak pernah memanggil API.

Aturan:
1. Jelaskan HANYA dari alamat, nama kolom, dan arti kolom yang diberikan. Jangan menambah kolom, cakupan, atau sumber yang tidak disebut.
2. Jangan menulis angka apa pun.
3. Jangan menyalin alamat, nama kolom mentah, kata "endpoint", "API", "kolom", "field", atau "JSON" ke dalam kalimat.
4. Kalimatmu berlaku untuk semua emiten. Jangan menyebut kode saham atau nama perusahaan mana pun.
5. Jelaskan isi rekamannya, bukan sekadar mendaftar ulang arti kolom.
6. Jangan menilai, menyimpulkan, atau menyarankan transaksi. Hanya deskripsi isi.
7. Maksimal 20 kata, satu kalimat, diakhiri titik. Tanpa pembuka.
8. Tulis padat. Hindari frasa pengisi seperti "data ini", "rekaman ini menyajikan informasi mengenai". Sebut langsung isinya.`;

/** Words that mean the model described the plumbing instead of the data. */
const PLUMBING = /\b(endpoint|api|json|field|kolom|payload|request|url)\b/i;

/** A ticker in a sentence cached for every emiten. */
const TICKER = /\b[A-Z]{4}\b/;

export async function summarizeEndpointWithLlm(
  input: EndpointSummaryInput,
  call: typeof generateStructured = generateStructured,
): Promise<EndpointSummaryDraft> {
  const draft = await call<EndpointSummaryDraft>({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [
      `Alamat: ${input.endpoint}`,
      `Nama kolom: ${input.field}`,
      `Arti kolom: ${glossField(input.field)}`,
      `Penyedia: ${input.provider}`,
    ].join("\n"),
    schema: SUMMARY_SCHEMA,
    maxOutputTokens: 2048,
  });
  const summary = draft.summary.trim();
  const violations = verifyDraft(summary, [], []).violations;
  if (violations.length) throw new Error(`Endpoint summary rejected: ${violations.join("; ")}`);
  if (!summary) throw new Error("Endpoint summary rejected: empty");
  if (PLUMBING.test(summary)) throw new Error("Endpoint summary rejected: describes the plumbing, not the data");
  if (TICKER.test(summary)) throw new Error("Endpoint summary rejected: names one emiten in a sentence cached for all of them");
  if (summary.split(/\s+/).length > 24) throw new Error("Endpoint summary rejected: longer than one sentence");
  return { summary };
}
