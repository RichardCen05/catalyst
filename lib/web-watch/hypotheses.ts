/**
 * NLI hypotheses — the sentences System One tests every pending item against.
 *
 * The screen asks a multilingual NLI model whether a window of the article
 * entails a hypothesis. This is the one table of those hypotheses, in the two
 * languages sources declare (`WatchedSource.lang`). It sits beside
 * `TRIAGE_RULES` in spirit: fixed structural sentences, true of every case,
 * never prose about one article.
 *
 * Two entries are templates rather than sentences:
 * - `title`: the hypothesis is the item's own headline (`{title}`).
 * - `relevance`: `{company}` is filled from the registry name in
 *   `lib/data/fixtures.ts`, once per matched emiten (W19). No company name is
 *   typed here.
 *
 * `rumor` and `official` are a pair: the (b) score is "rumor entailed and
 * official not entailed". The Python runner never holds its own copy; the
 * decide route renders these and hands them over, so this file stays the
 * single source.
 */

import { LEGAL_TOKENS } from "@/lib/agent/query";
import { companies } from "@/lib/data/fixtures";
import type { SourceLang } from "@/lib/web-watch/types";
import type { SymbolCode } from "@/lib/types";

export const SCREEN_CHECKS = ["rumor", "official", "title", "substance", "relevance"] as const;
export type ScreenCheck = (typeof SCREEN_CHECKS)[number];

export const SOURCE_LANGS = ["id", "en"] as const satisfies readonly SourceLang[];

/** The language a source without a declared `lang` is read in. */
export const DEFAULT_SOURCE_LANG: SourceLang = "id";

export const HYPOTHESES: Record<ScreenCheck, Record<SourceLang, string>> = {
  // Short on purpose. The long form ("the claim rests only on unnamed
  // sources…") was entailed at ≥ 0.95 by some window of 16 of 20 golden
  // articles, rumor or not; the short form left 10 of the 13 non-rumor ones
  // under 0.5 (replay, 2026-09-25 — a small set, see the phase-3 report).
  rumor: { id: "Ini adalah rumor.", en: "This is a rumor." },
  // Names the response, not the genre. "Ini adalah pernyataan resmi." was
  // entailed at ≥ 0.83 by 4 of 6 golden rumor articles that crossed the rumor
  // bar, so no rumor was ever quarantined, and at 0.015 by a company's own
  // quoted denial (BBCA, 28 Sep), which was. This form scored 0.01 on two of
  // those rumors and ≥ 0.97 on all four clean articles that answer a rumor
  // (FP32 replay, 2026-09-28 — ten articles, a small set).
  official: {
    id: "Perusahaan telah mengonfirmasi atau membantah kabar ini secara resmi.",
    en: "The company has officially confirmed or denied this news.",
  },
  title: { id: "{title}", en: "{title}" },
  substance: {
    id: "Teks ini melaporkan peristiwa atau angka yang konkret.",
    en: "This text reports a concrete event or concrete figures.",
  },
  relevance: {
    id: "Berita ini memengaruhi usaha {company}.",
    en: "This news affects the business of {company}.",
  },
};

/**
 * The registry name without its legal form: "PT Aneka Tambang Tbk." reads
 * "Aneka Tambang". The model sees the name a journalist would write.
 */
export function companyDisplayName(symbol: SymbolCode): string | null {
  const company = companies.find((c) => c.symbol === symbol);
  if (!company) return null;
  const words = company.name
    .split(/\s+/)
    .filter((word) => word && !LEGAL_TOKENS.has(word.toLowerCase().replace(/[^a-z]/g, "")));
  return words.join(" ").replace(/[.,]+$/, "") || company.name;
}

export function relevanceHypothesis(symbol: SymbolCode, lang: SourceLang): string | null {
  const name = companyDisplayName(symbol);
  return name ? HYPOTHESES.relevance[lang].replace("{company}", name) : null;
}

export interface RenderedHypotheses {
  rumor: string;
  official: string;
  substance: string;
  /** Absent when the headline was cut from the address: nothing to test. */
  title: string | null;
  relevance: Array<{ symbol: SymbolCode; hypothesis: string }>;
}

export function renderHypotheses(input: {
  title: string;
  titleIsUrl: boolean;
  symbols: SymbolCode[];
  lang: SourceLang;
}): RenderedHypotheses {
  const { lang } = input;
  return {
    rumor: HYPOTHESES.rumor[lang],
    official: HYPOTHESES.official[lang],
    substance: HYPOTHESES.substance[lang],
    title: input.titleIsUrl || !input.title.trim() ? null : HYPOTHESES.title[lang].replace("{title}", input.title.trim()),
    relevance: input.symbols.flatMap((symbol) => {
      const hypothesis = relevanceHypothesis(symbol, lang);
      return hypothesis ? [{ symbol, hypothesis }] : [];
    }),
  };
}
