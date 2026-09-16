/**
 * Internal Sectors refresh — bounded, flag-gated, dry-run by default.
 *
 * This is the deliberate live-wiring point for `lib/data/sectors-client.ts`
 * (shared with the UI toggle at `POST /api/settings/refresh` via
 * `lib/data/sectors-refresh.ts` — one bounded code path either way).
 * Nothing calls Sectors unless ALL of these hold:
 *   1. the refresh gate is on: `SECTORS_REFRESH_ENABLED=true` forces it on,
 *      `=false` forces it off, unset follows the Pengaturan UI toggle
 *      (GCS flag, default off — recorded bundle serves until enabled),
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
import { BudgetExceededError, executeRefresh, planRefresh } from "@/lib/data/sectors-refresh";
import { isRefreshEnabled } from "@/lib/settings";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authError(request: Request): { status: 401 | 503; error: string } | null {
  const result = checkInternalAuth(request);
  return result.ok ? null : { status: result.status, error: result.error };
}

export async function POST(request: Request) {
  const denied = authError(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  const gate = await isRefreshEnabled();
  if (!gate.enabled) {
    return NextResponse.json(
      { error: "refresh-disabled", hint: "Nyalakan sakelar refresh di Pengaturan (atau SECTORS_REFRESH_ENABLED=true) plus SECTORS_API_KEY. Recorded bundle keeps serving." },
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
  const { symbols, rejected, plans, estimatedCost } = planRefresh(body.symbols);

  // Planning costs nothing and needs no key — live spend starts below.
  if (dryRun) return NextResponse.json({ dryRun: true, plans, estimatedCost, rejected });
  if (!apiKey) return NextResponse.json({ error: "missing-api-key" }, { status: 403 });

  try {
    const results = await executeRefresh(apiKey, symbols);
    return NextResponse.json({ dryRun: false, results, rejected });
  } catch (error) {
    const partial = (error as Error & { partialResults?: Array<{ symbol: string; sources: string[] }> }).partialResults ?? [];
    if (error instanceof BudgetExceededError) {
      return NextResponse.json({ error: "budget-exceeded", results: partial, rejected }, { status: 429 });
    }
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "refresh-failed", results: partial, rejected },
      { status: 500 },
    );
  }
}
