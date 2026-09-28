import { RELEVANCE_BANDS, type RelevanceBand } from "@/lib/agent/thresholds";

/**
 * How a figure is written in Indonesian market prose: a currency before the
 * number, or a unit after it. Structural, like `CLOSE_TERMS`: these are the
 * words that make "25" a quantity rather than a date or a list number.
 */
export const FIGURE_UNIT_TERMS = ["persen", "bps", "basis poin", "triliun", "miliar", "juta", "ribu", "ton", "barel"] as const;
const CURRENCY_BEFORE = /(?:\brp|\busd|\bus\$|\bidr)\s?\d/i;
const UNIT_AFTER = new RegExp(`\\d[\\d.,]*\\s?(?:%|(?:${FIGURE_UNIT_TERMS.join("|")})\\b)`, "i");

/** The text states at least one measured quantity: an amount, a rate, a
 *  volume. A year, a date or an event name with a number in it is not one. */
export function statesFigure(text: string): boolean {
  return CURRENCY_BEFORE.test(text) || UNIT_AFTER.test(text);
}

const LOWEST_BAND: RelevanceBand = RELEVANCE_BANDS[RELEVANCE_BANDS.length - 1];

/**
 * The band a proposal may carry for this article.
 *
 * A seminar, a festival or a speech that states no figure gives a reviewer
 * nothing to weigh an exposure by, and the model still proposed BI's FEKDI
 * programme as "Mendukung · Sedang" for three banks (QA P2-7). Such an
 * article is proposed at the lowest band, whatever the model chose; an
 * article that states a figure keeps the model's band.
 */
export function bandForArticle(band: RelevanceBand, articleText: string): RelevanceBand {
  return statesFigure(articleText) ? band : LOWEST_BAND;
}
