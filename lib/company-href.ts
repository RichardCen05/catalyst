import { companies } from "@/lib/data/fixtures";

/**
 * Where a link to one issuer should land: its case when the recordings hold
 * one, the impact map otherwise. `/companies/[symbol]` resolves to the same
 * place, but only through a server `redirect()`, and a client navigation into
 * that prerendered redirect can stall React's shell in a suspend loop
 * (minified error #482, seen on prod rev 00092 about one click in four). A
 * link that already names the destination never takes that hop.
 */
export function companyHref(symbol: string) {
  const company = companies.find((item) => item.symbol === symbol);
  return company?.analyzed ? `/cases/${symbol}` : `/impact?company=${symbol}`;
}
