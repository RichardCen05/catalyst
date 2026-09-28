import { DIMENSION_LABELS, DIMENSION_OBSERVABLES } from "@/lib/agent/dimensions";
import { labelVocabulary } from "@/lib/ui-labels";

/**
 * Indonesian labels an English answer should not carry.
 *
 * The material a chat answer is written from is Indonesian: pillar labels,
 * business-impact dimensions, direction labels. Told to "keep quoted labels
 * exactly as they appear", the model kept them — "check margin operasi and
 * arus kas operasi", "the catalyst is Berlawanan" — and every function-word
 * count still said English, so the language check passed it.
 *
 * What counts is read from the label tables the page itself translates with,
 * never typed here: the Indonesian side of `ui-labels`, the dimension labels
 * and their observables. Two shapes:
 *
 * - a label that is one word ("Berlawanan", "Konsentrasi");
 * - two neighbouring words of a label, one of them at least
 *   `DISTINCT_MIN_LETTERS` long ("margin kotor", "kas operasi", "arus asing").
 *
 * Single words inside longer labels do not count on their own: "biaya per
 * unit" holds "per" and "unit", which English writes the same way, and the
 * first version of this check rejected every faithful English answer for
 * them. An acronym (IHSG, HHI) is a name in both languages and never counts,
 * nor does a word the English side of `ui-labels` also uses ("margin",
 * "momentum", "gas").
 */
const DISTINCT_MIN_LETTERS = 5;

function tokens(text: string): string[] {
  return text.replace(/[^\p{L}\s]/gu, " ").split(/\s+/).filter(Boolean);
}

const isAcronym = (word: string) => word.length >= 2 && word === word.toUpperCase();

interface Vocabulary {
  singles: Set<string>;
  pairs: Set<string>;
}

let vocabulary: Vocabulary | null = null;

function indonesianVocabulary(): Vocabulary {
  if (vocabulary) return vocabulary;
  const { indonesian, english } = labelVocabulary();
  const shared = new Set(english.flatMap(tokens).map((word) => word.toLowerCase()));
  const usable = (word: string) => !isAcronym(word) && !shared.has(word.toLowerCase());
  const singles = new Set<string>();
  const pairs = new Set<string>();
  // A one-word label counts whole; a word left alone by the split below does
  // not ("Logam dan mineral" leaves "mineral", which is English too).
  const labels = [...indonesian, ...Object.values(DIMENSION_LABELS), ...Object.values(DIMENSION_OBSERVABLES)];
  for (const label of labels) {
    const words = tokens(label);
    if (words.length === 1 && usable(words[0])) singles.add(words[0].toLowerCase());
  }
  // Pairs come from each comma-, bracket- or conjunction-separated part of a
  // label ("Margin kotor, margin operasi, selisih, atau biaya per unit").
  for (const segment of labels.flatMap((label) => label.split(/[,()]|\batau\b|\bdan\b/))) {
    const words = tokens(segment);
    for (let i = 0; i + 1 < words.length; i += 1) {
      const pair = [words[i], words[i + 1]];
      if (pair.some(isAcronym)) continue;
      if (!pair.some((word) => word.length >= DISTINCT_MIN_LETTERS && usable(word))) continue;
      pairs.add(pair.join(" ").toLowerCase());
    }
  }
  vocabulary = { singles, pairs };
  return vocabulary;
}

/** The Indonesian labels a draft in `language` should not contain. Only an
 *  English draft is checked; an Indonesian one is written in them. */
export function untranslatedTerms(draftText: string, language: "id" | "en" | "unknown"): string[] {
  if (language !== "en") return [];
  const { singles, pairs } = indonesianVocabulary();
  const words = tokens(draftText);
  const found = new Set<string>();
  words.forEach((word, i) => {
    if (!isAcronym(word) && singles.has(word.toLowerCase())) found.add(word.toLowerCase());
    const pair = i + 1 < words.length ? `${word} ${words[i + 1]}`.toLowerCase() : "";
    if (pairs.has(pair)) found.add(pair);
  });
  return [...found];
}
