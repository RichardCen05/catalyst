import { DIMENSION_LABELS, DIMENSION_OBSERVABLES } from "@/lib/agent/dimensions";
import { labelVocabulary } from "@/lib/ui-labels";

/**
 * Indonesian words an English answer should not carry.
 *
 * The material a chat answer is written from is Indonesian: pillar labels,
 * business-impact dimensions, direction labels. Told to "keep quoted labels
 * exactly as they appear", the model kept them — "check margin operasi and
 * arus kas operasi", "the catalyst is Berlawanan" — and every function-word
 * count still said English, so the language check passed it.
 *
 * The vocabulary is read from the label tables the page itself translates
 * with, never typed here: the Indonesian side of `ui-labels`, the dimension
 * labels and their observables. A word the English side also uses ("margin",
 * "volume", "gas", "data") is shared, not Indonesian, and is left out, as is
 * any word an English label begins with ("platform" in "Digital Platforms").
 */
function words(text: string): string[] {
  return text.toLowerCase().replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter((word) => word.length >= 3);
}

let vocabulary: Set<string> | null = null;

function indonesianVocabulary(): Set<string> {
  if (vocabulary) return vocabulary;
  const { indonesian, english } = labelVocabulary();
  const shared = new Set(english.flatMap(words));
  // An English word may be the Indonesian one plus an ending ("platforms");
  // the other way round only for a stem long enough not to be a prefix of
  // everything ("tin" would swallow "tinggi").
  const sharedStem = (word: string) => [...shared].some((en) => en.startsWith(word) || (en.length >= 5 && word.startsWith(en)));
  const candidates = [...indonesian, ...Object.values(DIMENSION_LABELS), ...Object.values(DIMENSION_OBSERVABLES)].flatMap(words);
  vocabulary = new Set(candidates.filter((word) => !sharedStem(word)));
  return vocabulary;
}

/** The Indonesian label words a draft in `language` should not contain. Only
 *  an English draft is checked; an Indonesian one is written in them. */
export function untranslatedTerms(draftText: string, language: "id" | "en" | "unknown"): string[] {
  if (language !== "en") return [];
  const known = indonesianVocabulary();
  return [...new Set(words(draftText).filter((word) => known.has(word)))];
}
