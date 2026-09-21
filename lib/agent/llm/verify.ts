import { assertSafeOutput } from "@/lib/agent/gates";
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
function canonicalNumeral(numeral: string): string {
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
  return [...new Set(texts.flatMap((text) => text.match(NUMBER_PATTERN) ?? []))];
}

export function verifyDraft(draftText: string, evidenceNumbers: string[], _citations: Citation[]): VerificationResult {
  const allowed = new Set(evidenceNumbers.map(canonicalNumeral));
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
export function verifyAnswer(draftText: string, evidenceNumbers: string[], question: string): VerificationResult {
  const violations = [...verifyDraft(draftText, evidenceNumbers, []).violations];

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

  return { approved: violations.length === 0, violations };
}
