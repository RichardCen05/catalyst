/**
 * Language detection for the gates and the verifier alike.
 *
 * It lived in `llm/verify.ts`, which imports `gates.ts`; the request gate
 * needs it too, to refuse in the reader's language, so it sits in a leaf
 * module both can import. `verify.ts` re-exports it.
 */

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
// Pronouns and auxiliaries count too: "Should I buy PGAS now?" holds no
// article or conjunction, read as "unknown", and was refused in Indonesian.
const EN_MARKERS = ["the", "is", "are", "was", "because", "from", "with", "this", "that", "and", "to", "of", "not",
  "why", "what", "how", "which", "when", "who",
  "i", "you", "my", "it", "should", "can", "could", "do", "does", "will", "would", "now", "for"];

export function detectLanguage(text: string): "id" | "en" | "unknown" {
  const words = text.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
  const count = (markers: string[]) => words.filter((word) => markers.includes(word)).length;
  const indonesian = count(ID_MARKERS);
  const english = count(EN_MARKERS);
  if (indonesian === english) return "unknown";
  return indonesian > english ? "id" : "en";
}
