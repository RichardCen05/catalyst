import { companies, coverageInfo, primarySymbol } from "@/lib/data/fixtures";
import type { SymbolCode } from "@/lib/types";

/**
 * The emiten `/impact` opens on.
 *
 * A requested emiten on the reader's watchlist wins. Without one, the page
 * opens the first watchlist emiten that has a case: the first watchlist entry
 * may be an emiten with no business recordings (ADRO in the QA pass), and
 * opening on it showed a chain that stops before any case, when the page is
 * where a case is read. Only a watchlist with no case at all falls back to
 * its first entry, and an empty one to the registry's primary case.
 */
export function defaultImpactSymbol(watchlist: readonly string[], requested: SymbolCode | undefined): SymbolCode {
  const available = companies.filter((company) => watchlist.includes(company.symbol)).map((company) => company.symbol);
  if (requested && available.includes(requested)) return requested;
  return available.find((symbol) => coverageInfo[symbol]?.analyzed) ?? available[0] ?? primarySymbol;
}
