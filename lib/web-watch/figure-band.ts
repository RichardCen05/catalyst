import { RELEVANCE_BANDS, type RelevanceBand } from "@/lib/agent/thresholds";

/**
 * How a figure is written in Indonesian market prose: a currency before the
 * number, or a unit after it. Structural, like `CLOSE_TERMS`: these are the
 * words that make "25" a quantity rather than a date or a list number.
 */
export const FIGURE_UNIT_TERMS = ["persen", "bps", "basis poin", "triliun", "miliar", "juta", "ribu", "ton", "barel"] as const;
const CURRENCY_BEFORE = /(?:\brp|\busd|\bus\$|\bidr)\s?\d/i;
const UNIT_AFTER = new RegExp(`\\d[\\d.,]*\\s?(?:%|(?:${FIGURE_UNIT_TERMS.join("|")})\\b)`, "i");
/** The number of each figure: after a currency, or before a unit. */
const FIGURE_NUMBER = new RegExp(`(?:\\b(?:rp|usd|us\\$|idr)\\s?(\\d[\\d.,]*))|(?:(\\d[\\d.,]*)\\s?(?:%|(?:${FIGURE_UNIT_TERMS.join("|")})\\b))`, "gi");

/** The text states at least one measured quantity: an amount, a rate, a
 *  volume. A year, a date or an event name with a number in it is not one. */
export function statesFigure(text: string): boolean {
  return CURRENCY_BEFORE.test(text) || UNIT_AFTER.test(text);
}

/** The numbers of the figures a text states, without trailing punctuation. */
export function statedFigures(text: string): Set<string> {
  return new Set([...text.matchAll(FIGURE_NUMBER)].map((match) => (match[1] ?? match[2]).replace(/[.,]+$/, "")));
}

const LOWEST_BAND: RelevanceBand = RELEVANCE_BANDS[RELEVANCE_BANDS.length - 1];

/**
 * The band a proposal may carry for this article.
 *
 * A seminar, a festival or a speech gives a reviewer nothing to weigh an
 * exposure by, and the model proposed BI's FEKDI programme as "Mendukung ·
 * Sedang" for three banks (QA P2-7). Capping only articles with no figure at
 * all was not enough: a press release states some percentage somewhere, and
 * the model's own rationale still said the article held no explicit figure.
 * So a proposal keeps the model's band only when its own path or rationale
 * (`claim`) names a figure the article states; otherwise it is proposed at
 * the lowest band.
 */
export function bandForArticle(band: RelevanceBand, articleText: string, claim: string): RelevanceBand {
  const stated = statedFigures(articleText);
  for (const figure of statedFigures(claim)) if (stated.has(figure)) return band;
  return LOWEST_BAND;
}
