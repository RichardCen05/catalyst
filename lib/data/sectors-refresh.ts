/**
 * Shared Sectors refresh planner + executor.
 *
 * Used by BOTH `POST /api/internal/refresh-sectors` (Bearer-guarded,
 * scheduler/manual entry point) and `POST /api/settings/refresh` (UI-facing).
 * One bounded code path either way: symbols already covered by the recorded
 * bundle, broker-summary top + foreign-flow per symbol. Raw responses land in
 * GCS under `catalyst/refresh/<date>/` for a human to download into
 * `data/sectors/` and re-run `scripts/build_market_data.py`. The bundled
 * generated file is never overwritten at runtime. Spend is tracked in the
 * client's GCS ledger and capped by `SECTORS_DAILY_BUDGET`.
 */
import { BudgetExceededError, fetchSectors, isKnownSymbol } from "@/lib/data/sectors-client";
import { gcsPutJson } from "@/lib/gcp/gcs";

export const RECORDED_SYMBOLS = ["ANTM", "BBCA", "BBRI", "TLKM", "GOTO", "PGAS"] as const;
const CACHE_BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";

export interface RefreshPlan {
  symbol: string;
  calls: Array<{ path: string; cost: number }>;
}

export function planFor(symbol: string): RefreshPlan {
  // Per-call costs are conservative estimates until verified against the
  // Sectors credit table — the GCS ledger records actuals, and
  // SECTORS_DAILY_BUDGET caps total spend either way.
  return {
    symbol,
    calls: [
      { path: `/v2/broker-summary/${symbol}/`, cost: 2 },
      { path: `/v2/foreign-flow/${symbol}/`, cost: 1 },
    ],
  };
}

export function planRefresh(requestedSymbols?: string[]): {
  symbols: string[];
  rejected: string[];
  plans: RefreshPlan[];
  estimatedCost: number;
} {
  const requested = (requestedSymbols ?? [...RECORDED_SYMBOLS]).map((s) => s.toUpperCase());
  const symbols = requested.filter((s) => (RECORDED_SYMBOLS as readonly string[]).includes(s) && isKnownSymbol(s));
  const rejected = requested.filter((s) => !symbols.includes(s));
  const plans = symbols.map(planFor);
  const estimatedCost = plans.reduce((sum, p) => sum + p.calls.reduce((s, c) => s + c.cost, 0), 0);
  return { symbols, rejected, plans, estimatedCost };
}

export async function executeRefresh(
  apiKey: string,
  symbols: string[],
): Promise<Array<{ symbol: string; sources: string[] }>> {
  const date = new Date().toISOString().slice(0, 10);
  const results: Array<{ symbol: string; sources: string[] }> = [];
  try {
    for (const symbol of symbols) {
      const sources: string[] = [];
      const broker = await fetchSectors(`/v2/broker-summary/${symbol}/`, { top: 1 }, { ttl: "broker", cost: 2, apiKey });
      const flow = await fetchSectors(`/v2/foreign-flow/${symbol}/`, {}, { ttl: "daily", cost: 1, apiKey });
      const stamp = `catalyst/refresh/${date}/${symbol}.json`;
      await gcsPutJson(CACHE_BUCKET, stamp, {
        symbol,
        refreshedAt: new Date().toISOString(),
        broker: { source: broker.source, data: broker.data },
        flow: { source: flow.source, data: flow.data },
      });
      sources.push(stamp, `ledger:catalyst/_ledger/${date}.jsonl`);
      results.push({ symbol, sources });
    }
  } catch (error) {
    // Carry per-symbol partials so callers can report what landed before
    // the failure (e.g. a mid-run budget cap), as the old inline loop did.
    (error as Error & { partialResults?: Array<{ symbol: string; sources: string[] }> }).partialResults = results;
    throw error;
  }
  return results;
}

export { BudgetExceededError };
