import type { SymbolCode } from "@/lib/types";

export interface Holding {
  shares: number;
  avgCost: number;
}

export type Holdings = Partial<Record<SymbolCode, Holding>>;

const MATERIALITY_WEIGHT: Record<string, number> = { High: 3, Medium: 2, Low: 1 };

/** Rupiah exposure of one holding at the recorded close price. */
export function holdingExposure(holding: Holding | undefined, price: number): number {
  if (!holding || holding.shares <= 0 || price <= 0) return 0;
  return holding.shares * price;
}

/** Unrealized P&L in rupiah against the recorded close price. */
export function holdingPnl(holding: Holding | undefined, price: number): number {
  if (!holding || holding.shares <= 0) return 0;
  return (price - holding.avgCost) * holding.shares;
}

/** Portfolio weight of one symbol (0-1); 0 when there is no position data. */
export function holdingWeight(symbol: SymbolCode, holdings: Holdings, prices: Partial<Record<SymbolCode, number>>): number {
  const total = (Object.keys(holdings) as SymbolCode[]).reduce(
    (sum, key) => sum + holdingExposure(holdings[key], prices[key] ?? 0),
    0,
  );
  if (total <= 0) return 0;
  return holdingExposure(holdings[symbol], prices[symbol] ?? 0) / total;
}

/**
 * Rank score combining playbook materiality with actual money at stake.
 * Falls back to pure materiality when the user has not entered positions.
 */
export function portfolioRankScore(materiality: string, weight: number): number {
  return (MATERIALITY_WEIGHT[materiality] ?? 1) * (1 + weight * 4);
}
