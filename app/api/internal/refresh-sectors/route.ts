/**
 * Internal Sectors refresh — bounded, flag-gated, dry-run by default.
 *
 * This is the deliberate live-wiring point for `lib/data/sectors-client.ts`.
 * Nothing calls Sectors unless ALL of these hold:
 *   1. `SECTORS_REFRESH_ENABLED=true` (default off — recorded bundle serves),
 *   2. `SECTORS_API_KEY` is set (server-only env, never NEXT_PUBLIC_),
 *   3. the request passes the same Bearer guard as check-sources, and
 *   4. the body sets `dryRun: false` explicitly (default true = zero spend).
 *
 * Scope is bounded to symbols that already have a bundled recording, so a
 * refresh can never invent coverage: broker-summary top + foreign-flow per
 * symbol. Raw responses land in GCS under `catalyst/refresh/<date>/` for a
 * human to download into `data/sectors/` and re-run
 * `scripts/build_market_data.py`. The bundled generated file is never
 * overwritten at runtime. Spend is tracked in the client's GCS ledger and
 * capped by `SECTORS_DAILY_BUDGET`.
 */

import { NextResponse } from "next/server";
import { checkInternalAuth } from "@/lib/internal-auth";
import { BudgetExceededError, fetchSectors, isKnownSymbol } from "@/lib/data/sectors-client";
import { gcsPutJson } from "@/lib/gcp/gcs";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

const RECORDED_SYMBOLS = ["ANTM", "BBCA", "BBRI", "TLKM", "GOTO", "PGAS"] as const;
const CACHE_BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";

function authError(request: Request): { status: 401 | 503; error: string } | null {
  const result = checkInternalAuth(request);
  return result.ok ? null : { status: result.status, error: result.error };
}

interface RefreshPlan {
  symbol: string;
  calls: Array<{ path: string; cost: number }>;
}

function planFor(symbol: string): RefreshPlan {
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

export async function POST(request: Request) {
  const denied = authError(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  if (process.env.SECTORS_REFRESH_ENABLED !== "true") {
    return NextResponse.json(
      { error: "refresh-disabled", hint: "Set SECTORS_REFRESH_ENABLED=true plus SECTORS_API_KEY to enable. Recorded bundle keeps serving." },
      { status: 403 },
    );
  }
  const apiKey = process.env.SECTORS_API_KEY;
  let body: { symbols?: string[]; dryRun?: boolean } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const dryRun = body.dryRun ?? true;
  const requested = (body.symbols ?? [...RECORDED_SYMBOLS]).map((s) => s.toUpperCase());
  const symbols = requested.filter((s) => (RECORDED_SYMBOLS as readonly string[]).includes(s) && isKnownSymbol(s));
  const rejected = requested.filter((s) => !symbols.includes(s));
  const plans = symbols.map(planFor);
  const estimatedCost = plans.reduce((sum, p) => sum + p.calls.reduce((s, c) => s + c.cost, 0), 0);

  // Planning costs nothing and needs no key — live spend starts below.
  if (dryRun) return NextResponse.json({ dryRun: true, plans, estimatedCost, rejected });
  if (!apiKey) return NextResponse.json({ error: "missing-api-key" }, { status: 403 });

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
    if (error instanceof BudgetExceededError) {
      return NextResponse.json({ error: "budget-exceeded", results, rejected }, { status: 429 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "refresh-failed", results, rejected },
      { status: 500 },
    );
  }
  return NextResponse.json({ dryRun: false, results, rejected });
}
