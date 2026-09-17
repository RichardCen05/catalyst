import type { SymbolCode } from "@/lib/types";

export interface Holding {
  shares: number;
  avgCost: number;
}

export type Holdings = Partial<Record<SymbolCode, Holding>>;

const MATERIALITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

/**
 * Rupiah exposure of one holding at the recorded close price, or `null` when
 * there is no recorded price for that symbol.
 *
 * `null` rather than `0`: a watchlist symbol outside the recorded universe has
 * no close price, and callers used to pass `company?.price ?? 0`. Zero is a
 * number a reader will read as a number.
 */
export function holdingExposure(holding: Holding | undefined, price: number | undefined): number | null {
  if (!holding || holding.shares <= 0) return 0;
  if (price === undefined || price <= 0) return null;
  return holding.shares * price;
}

/**
 * Unrealized P&L in rupiah against the recorded close price, or `null` when
 * that price is not recorded.
 *
 * This one mattered most: with `price ?? 0` the arithmetic became
 * `(0 - avgCost) * shares` and the page showed the user a total loss on their
 * own position, in rupiah, for a symbol Catalyst simply has no price for.
 */
export function holdingPnl(holding: Holding | undefined, price: number | undefined): number | null {
  if (!holding || holding.shares <= 0) return 0;
  if (price === undefined || price <= 0) return null;
  return (price - holding.avgCost) * holding.shares;
}

/** Portfolio weight of one symbol (0-1); 0 when there is no position data. */
export function holdingWeight(symbol: SymbolCode, holdings: Holdings, prices: Partial<Record<SymbolCode, number>>): number {
  // Unpriced holdings drop out of both sides of the ratio. This value only
  // ranks the list, so an unknown price must not shift the order by pretending
  // the position is worth nothing.
  const total = (Object.keys(holdings) as SymbolCode[]).reduce(
    (sum, key) => sum + (holdingExposure(holdings[key], prices[key]) ?? 0),
    0,
  );
  if (total <= 0) return 0;
  return (holdingExposure(holdings[symbol], prices[symbol]) ?? 0) / total;
}

/**
 * Rank score combining playbook materiality with actual money at stake.
 * Falls back to pure materiality when the user has not entered positions.
 */
export function portfolioRankScore(materiality: string, weight: number): number {
  return (MATERIALITY_WEIGHT[materiality] ?? 1) * (1 + weight * 4);
}
