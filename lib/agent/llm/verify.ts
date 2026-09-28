import { assertSafeOutput } from "@/lib/agent/gates";
import { untranslatedTerms } from "@/lib/agent/llm/language-leak";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import type { Citation } from "@/lib/types";

export interface VerificationResult {
  approved: boolean;
  violations: string[];
}

const NUMBER_PATTERN = /-?\d[\d.,]*%?/g;

/**
 * The evidence pack quotes providers verbatim, so an English filing carries
 * `62.71` while the Indonesian prose next to it carries `6,2%`. The model
 * writes the whole answer in Indonesian and localises the separator, so it
 * returns `62,71` for the same figure. A literal string match called that a
 * fabricated number and rejected an otherwise faithful draft, which is why a
 * working key still produced the deterministic answer.
 *
 * Comparison therefore happens on the digits alone. Separators carry no
 * information the verifier needs: a hallucinated figure has different digits,
 * not a different comma. A trailing percent sign is kept, so `6,2%` is never
 * accepted on the strength of a bare `6.2` in the evidence.
 */
export function canonicalNumeral(numeral: string): string {
  const percent = numeral.endsWith("%");
  const digits = numeral.replace(/%$/, "").replace(/[.,]/g, "");
  return percent ? `${digits}%` : digits;
}

/**
 * Every numeral in `text`, de-duplicated, in the same shape the verifier
 * compares. Callers build the allowed pool from whatever the reader can
 * already see, so the pattern that decides what counts as a number lives
 * here rather than being re-typed at each call site.
 */
export function extractNumerals(...texts: string[]): string[] {
  // "jeda 1-10 sesi" is a range, but the pattern reads it as 1 and -10, so a
  // draft writing "1 hingga 10 sesi" was rejected for inventing a 10. A
  // hyphen directly after a digit is a range separator; its right end is
  // added unsigned as well.
  const rangeEnds = (text: string) => [...text.matchAll(/(?<=\d)-(\d[\d.,]*%?)/g)].map((match) => match[1]);
  return [...new Set(texts.flatMap((text) => [...(text.match(NUMBER_PATTERN) ?? []), ...rangeEnds(text)]))];
}

/**
 * The sentences of a draft, in the order they were written.
 *
 * Split only where a full stop, question mark or exclamation mark is followed
 * by whitespace: a decimal point never is ("2,5" holds, "2.5" holds), so a
 * figure never counts as two sentences. Anything the reader would pause at
 * does count, which is the unit the answer cap is written in.
 */
export function answerSentences(text: string): string[] {
  return text.split(/(?<=[.!?])\s+/).map((sentence) => sentence.trim()).filter(Boolean);
}

export function verifyDraft(draftText: string, evidenceNumbers: string[], _citations: Citation[]): VerificationResult {
  // A recorded "-4,0%" may be written as its size: "PGAS fell 4.0%" carries
  // the direction in the verb and invents no digit. The other way round — a
  // minus the recordings never had — still fails.
  const allowed = new Set(evidenceNumbers.flatMap((numeral) => [canonicalNumeral(numeral), canonicalNumeral(numeral.replace(/^[-−]/, ""))]));
  const found = draftText.match(NUMBER_PATTERN) ?? [];
  const violations = found
    .filter((numeral) => !allowed.has(canonicalNumeral(numeral)))
    .map((numeral) => `"${numeral}" does not appear in the evidence pack`);
  return { approved: violations.length === 0, violations };
}

/**
 * Which language a sentence is in, decided by function words.
 *
 * The cheap model answers an Indonesian question in English often enough to
 * matter, and the numeral rule cannot see it: every figure is correct, the
 * sentence is simply in the wrong language for the reader who asked. Function
 * words are the cheapest reliable signal, because content words are shared
 * across both languages here — ANTM, HHI, broker, momentum — while grammar
 * words are not. Interrogatives count as function words: no English sentence
 * contains "kenapa", and no Indonesian one contains "why".
 */
const ID_MARKERS = ["yang", "ini", "itu", "pada", "dari", "dengan", "karena", "untuk", "adalah", "tidak", "dan", "ke", "di",
  "kenapa", "mengapa", "bagaimana", "apakah", "berapa", "kapan", "siapa", "apa"];
const EN_MARKERS = ["the", "is", "are", "was", "because", "from", "with", "this", "that", "and", "to", "of", "not",
  "why", "what", "how", "which", "when", "who"];

export function detectLanguage(text: string): "id" | "en" | "unknown" {
  const words = text.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const count = (markers: string[]) => words.filter((word) => markers.includes(word)).length;
  const indonesian = count(ID_MARKERS);
  const english = count(EN_MARKERS);
  if (indonesian === english) return "unknown";
  return indonesian > english ? "id" : "en";
}

/**
 * Everything a composed chat answer has to satisfy.
 *
 * `verifyDraft` checks numerals and nothing else, so two failure modes shipped
 * silently for as long as the model layer has been wired: an answer in the
 * wrong language, and one that drifts into advisory phrasing. Neither carries
 * a fabricated figure, so neither was ever rejected and neither ever triggered
 * a retry — the reader simply got a worse answer with no sign anything went
 * wrong.
 *
 * The advice check calls `assertSafeOutput` rather than re-testing the
 * pattern, so `ADVICE_PATTERN` stays defined once, in `gates.ts`, next to the
 * refusal that uses it on the way in.
 */
/**
 * A sentence about the material instead of from it.
 *
 * "Ringkasan yang tersedia memuat informasi mengenai…" passes every other
 * rule here: no figure, no advice, the right language. It still answers
 * nothing, and it reads as the app having no data while the case page shows
 * the answer. These are the shapes that description takes in both languages.
 */
const META_PATTERN = /\b(?:informasi|ringkasan|data|keterangan|bukti) yang (?:tersedia|diberikan|ada)(?: hanya)? (?:memuat|mencakup|berisi|menyebut|membahas)\b|\bmemuat informasi (?:mengenai|tentang)\b|\btidak (?:tercantum|disebutkan) (?:dalam|di) (?:ringkasan|informasi|data)\b|\b(?:the )?(?:available|provided) (?:information|summary|data|evidence) (?:contains|covers|includes|mentions|describes)\b/i;

/** Words too common to show a sentence was written from the evidence. */
const GROUNDING_STOPWORDS = new Set([
  "yang", "untuk", "dari", "pada", "dengan", "adalah", "dalam", "karena", "tidak", "belum", "sudah", "masih",
  "bisa", "dapat", "akan", "juga", "atau", "tetapi", "namun", "sebagai", "lebih", "antara", "tersebut", "bahwa",
  "saat", "ini", "itu", "kasus", "emiten", "saham", "data", "bukti", "informasi", "ringkasan", "tersedia",
  "which", "that", "this", "with", "from", "have", "been", "there", "their", "about", "into", "than", "these",
  "those", "because", "while", "would", "could", "should", "case", "stock", "data", "evidence", "information",
]);

function contentTerms(text: string): Set<string> {
  return new Set(
    text.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/)
      .filter((word) => word.length >= 4 && !GROUNDING_STOPWORDS.has(word) && !/^\d/.test(word)),
  );
}

/**
 * Whether a draft states something the evidence says.
 *
 * A figure quoted from the evidence is enough on its own. Without one, the
 * draft has to carry a few of the evidence's own content words — a status
 * label, an indicator name, a trigger — so an answer written in the other
 * language still passes on the tickers and terms it keeps verbatim.
 */
export function groundingViolation(draftText: string, evidenceText: string, evidenceNumbers: string[]): string | null {
  if (META_PATTERN.test(draftText)) return "draft describes the evidence instead of stating it";
  if (!evidenceText.trim()) return null;
  const allowed = new Set(evidenceNumbers.map(canonicalNumeral));
  const quoted = (draftText.match(NUMBER_PATTERN) ?? []).some((numeral) => allowed.has(canonicalNumeral(numeral)));
  if (quoted) return null;
  const evidence = contentTerms(evidenceText);
  const shared = [...contentTerms(draftText)].filter((term) => evidence.has(term)).length;
  // A translated answer keeps the ticker and the verbatim labels but little
  // else: "Why is the PGAS evidence mixed?" answered faithfully in English
  // shares one term with the Indonesian material. Across languages one shared
  // term is the bar; the meta check above still applies in full.
  const drafted = detectLanguage(draftText);
  const recorded = detectLanguage(evidenceText);
  const translated = drafted !== "unknown" && recorded !== "unknown" && drafted !== recorded;
  return shared >= (translated ? 1 : DEFAULT_THRESHOLDS.answerGroundedMinTerms)
    ? null
    : `draft shares ${shared} content terms with the evidence and quotes no evidence figure`;
}

export function verifyAnswer(draftText: string, evidenceNumbers: string[], question: string, evidenceText = ""): VerificationResult {
  const violations = [...verifyDraft(draftText, evidenceNumbers, []).violations];

  // Rule 6 of the prompt used to be the only thing holding the length, and a
  // prompt is a request: every other writer in this layer rejects a draft
  // over its own cap (`reading-explain`, `metric-gloss`, `endpoint-summary`,
  // `today-fact`), and chat answers alone shipped unbounded — 1024 tokens of
  // allowance said nothing about sentences, and a 15-sentence draft was
  // approved and rendered in full.
  const count = answerSentences(draftText).length;
  if (count > DEFAULT_THRESHOLDS.answerMaxSentences) {
    violations.push(`draft has ${count} sentences and the answer cap is ${DEFAULT_THRESHOLDS.answerMaxSentences}`);
  }

  const grounding = groundingViolation(draftText, evidenceText, evidenceNumbers);
  if (grounding) violations.push(grounding);

  try {
    assertSafeOutput(draftText);
  } catch {
    violations.push("draft carries advisory or transactional language");
  }

  const asked = detectLanguage(question);
  const answered = detectLanguage(draftText);
  if (asked !== "unknown" && answered !== "unknown" && asked !== answered) {
    violations.push(`draft language ${answered} does not match question language ${asked}`);
  }
  // Function words decide the language; they cannot see an Indonesian label
  // kept inside an English sentence ("check margin operasi next").
  const kept = untranslatedTerms(draftText, asked);
  if (kept.length) violations.push(`draft keeps Indonesian terms in an English answer: ${kept.join(", ")}`);

  return { approved: violations.length === 0, violations };
}
