import { agentMode } from "@/lib/agent/mode";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";
import { generateStructured } from "@/lib/agent/llm/client";
import { verifyDraft } from "@/lib/agent/llm/verify";
import { glossField } from "@/lib/agent/explain";

/**
 * What a figure means, in one sentence, written by the model rather than kept
 * as a table in this repository.
 *
 * A hand-written gloss per metric read well and rotted quietly. One of them
 * carried a worked example — "5.6 berarti konsentrasinya seperti hanya ada
 * sekitar 6 pembeli" — a number no recording had produced since the day it was
 * typed, sitting directly under the real figure. Another described a window
 * the recordings had already moved. Nothing failed when they drifted: the
 * tests passed and the screen explained a measurement the app was no longer
 * making.
 *
 * The model is given the metric's label, its own formula, and the glossed
 * column names it reads — never the value. The verifier rejects a draft that
 * carries a numeral for that reason: a figure is on screen already, and an
 * invented one beside it is worse than no sentence at all. A rejected draft
 * renders nothing; the explanation simply omits the meaning line.
 */

export interface MetricGlossInput {
  /** Metric label as the card shows it. */
  label: string;
  /** Its own arithmetic, where it has one. */
  formula?: string;
  /** Response keys behind the figure, verbatim. */
  fields: string;
}

interface MetricGlossDraft {
  meaning: string;
}

const GLOSS_SCHEMA = {
  type: "object",
  properties: { meaning: { type: "string" } },
  required: ["meaning"],
};

const SYSTEM_INSTRUCTION = `Kamu menulis satu kalimat penjelas untuk satu angka pada panel bukti aplikasi riset saham Indonesia.

Kamu diberi nama angka, rumusnya (bila ada), dan arti kolom rekaman yang dibacanya. Tulis SATU kalimat bahasa Indonesia yang menjelaskan apa yang diukur angka itu, untuk pembaca yang belum pernah melihat istilahnya.

Aturan:
1. Jelaskan HANYA dari nama, rumus, dan arti kolom yang diberikan. Jangan menambah cakupan, sumber, atau ukuran lain.
2. Jangan menulis angka apa pun, termasuk contoh nilai.
3. Jangan menyalin rumus, nama kolom mentah, kata "endpoint", "API", "kolom", "field", atau "JSON".
4. Kalimatmu berlaku untuk semua emiten. Jangan menyebut kode saham atau nama perusahaan.
5. Jangan menilai, menyimpulkan, atau menyarankan transaksi. Hanya arti ukurannya.
6. Maksimal 28 kata, satu kalimat, diakhiri titik. Tanpa pembuka.`;

const PLUMBING = /\b(endpoint|api|json|field|kolom|payload|request|url)\b/i;
const TICKER = /\b[A-Z]{4}\b/;

export async function describeMetricWithLlm(
  input: MetricGlossInput,
  call: typeof generateStructured = generateStructured,
): Promise<string> {
  const draft = await call<MetricGlossDraft>({
    model: process.env.GEMINI_MODEL || "gemini-3.5-flash",
    systemInstruction: SYSTEM_INSTRUCTION,
    contents: [
      `Nama angka: ${input.label}`,
      input.formula ? `Rumus: ${input.formula}` : "Rumus: tidak dihitung, dibaca langsung dari rekaman.",
      `Arti kolom: ${glossField(input.fields)}`,
    ].join("\n"),
    schema: GLOSS_SCHEMA,
    maxOutputTokens: 2048,
  });
  const meaning = draft.meaning.trim();
  const violations = verifyDraft(meaning, [], []).violations;
  if (violations.length) throw new Error(`Metric gloss rejected: ${violations.join("; ")}`);
  if (!meaning) throw new Error("Metric gloss rejected: empty");
  if (PLUMBING.test(meaning)) throw new Error("Metric gloss rejected: describes the plumbing, not the measurement");
  if (TICKER.test(meaning)) throw new Error("Metric gloss rejected: names one emiten in a sentence cached for all of them");
  if (meaning.split(/\s+/).length > 32) throw new Error("Metric gloss rejected: longer than one sentence");
  return meaning;
}

/**
 * Cached resolver for the answer path. Returns nothing — never a placeholder —
 * when the model is off, the call fails, or the draft is rejected.
 */
export async function resolveMetricGloss(input: MetricGlossInput): Promise<string | undefined> {
  if (agentMode() !== "llm") return undefined;
  const key = cacheKeyFor(["metric-gloss", input.label, input.formula ?? "", input.fields]);
  const cached = await getCached<{ meaning: string }>(key);
  if (cached?.meaning) return cached.meaning;
  try {
    const meaning = await describeMetricWithLlm(input);
    await setCached(key, { meaning });
    return meaning;
  } catch {
    return undefined;
  }
}
