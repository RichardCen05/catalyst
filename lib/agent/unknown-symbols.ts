import { SYMBOL_CODES } from "@/lib/data/symbols.generated";

/**
 * Upper-case words that are not tickers.
 *
 * The index, the meeting, the metric and the file format all look like a
 * ticker to a regular expression. Listing them is cheaper than guessing, and
 * a word missing from this list costs one sentence saying it is not recorded
 * — never a sentence inventing what it is.
 */
const NOT_TICKERS = new Set([
  "IHSG", "RUPS", "RUPSLB", "EBIT", "EBITDA", "CAGR", "ROIC", "NPAT", "IPO",
  "JSON", "HTTP", "HTTPS", "REST", "CSV", "PDF", "CAPEX", "OPEX", "YOY", "QOQ",
]);

/**
 * Ticker-shaped words in a question that no recording covers.
 *
 * "kenapa GARUDA masuk peta sebab akibat" used to be answered with a list of
 * what the map does hold, which reads as evasion: the reader asked about one
 * name and was told about eighteen others without ever being told theirs is
 * not among them. Naming the gap is the answer.
 *
 * A question typed entirely in capitals is skipped — "APA ISI DASHBOARD" is
 * shouting, not a ticker — and so is a word already in the registry.
 */
export function unrecordedTickers(question: string): string[] {
  if (question === question.toUpperCase()) return [];
  const known = new Set<string>(SYMBOL_CODES);
  const found = new Set<string>();
  for (const match of question.matchAll(/\b[A-Z]{4,6}\b/g)) {
    const token = match[0];
    if (known.has(token) || NOT_TICKERS.has(token)) continue;
    found.add(token);
  }
  return [...found];
}
