/**
 * Shared Sectors refresh planner + executor.
 *
 * Scope, stated plainly: this refreshes broker top buyers/sellers and daily
 * net foreign inflow for the six recorded symbols. It does NOT move
 * `DATA_AS_OF`. That timestamp comes from `WINDOW_DATES`, which
 * `scripts/build_market_data.py` derives from the daily price and IHSG
 * recordings (`v2_daily_*`, `v2_index-daily_ihsg*`) across all eighteen
 * symbols — none of which this planner fetches. Unfreezing the recorded
 * window is a larger, separately priced job; this path only keeps the flow
 * and broker legs current.
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
import { caseSymbols } from "@/lib/data/market.generated";
import { gcsPutJson } from "@/lib/gcp/gcs";

/** The symbols the bundle already covers — read from the generated recordings
 *  (`caseSymbols`), never typed here. Adding a recording extends the refresh
 *  plan on the next build with no code change. */
export const RECORDED_SYMBOLS = caseSymbols;
const CACHE_BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";

export interface RefreshPlan {
  symbol: string;
  calls: Array<{ path: string; cost: number }>;
}

/** Both recordings span 90 days, which is also the API maximum for foreign
 *  flow. Defaults are 30 days, so the window has to be asked for. */
export const REFRESH_WINDOW_DAYS = 90;

/** How many top buyers and sellers the recordings carry. */
export const TOP_BROKERS = 10;

export function refreshWindow(now: Date = new Date()): { start: string; end: string } {
  const end = new Date(now);
  const start = new Date(now);
  start.setUTCDate(start.getUTCDate() - REFRESH_WINDOW_DAYS);
  return { start: start.toISOString().slice(0, 10), end: end.toISOString().slice(0, 10) };
}

/**
 * Costs are the ones the Sectors reference states for these two endpoints:
 * the ranked top-buyers/top-sellers view is 2 credits, daily net foreign
 * inflow is 1. The GCS ledger still records actuals and
 * `SECTORS_DAILY_BUDGET` still caps total spend.
 *
 * The path matters. `/v2/broker-summary/{symbol}/` is per-broker daily rows —
 * a different endpoint, a different response shape, and 1 credit. The
 * recordings in `data/sectors/` and `scripts/build_market_data.py` both read
 * the ranked `top_buyers` / `top_sellers` shape, which comes from
 * `/v2/broker-summary/{symbol}/top/`.
 */
export function planFor(symbol: string): RefreshPlan {
  return {
    symbol,
    calls: [
      { path: `/v2/broker-summary/${symbol}/top/`, cost: 2 },
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
  const window = refreshWindow();
  const results: Array<{ symbol: string; sources: string[] }> = [];
  try {
    for (const symbol of symbols) {
      const sources: string[] = [];
      const broker = await fetchSectors(
        `/v2/broker-summary/${symbol}/top/`,
        { start: window.start, end: window.end, n_brokers: TOP_BROKERS },
        { ttl: "broker", cost: 2, apiKey },
      );
      const flow = await fetchSectors(
        `/v2/foreign-flow/${symbol}/`,
        { start: window.start, end: window.end },
        { ttl: "daily", cost: 1, apiKey },
      );
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
