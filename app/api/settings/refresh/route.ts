import { NextResponse } from "next/server";
import { refreshRunSchema, refreshToggleSchema } from "@/lib/schemas";
import { getRuntimeSettings, isRefreshEnabled, isRefreshPinnedByEnv, saveRuntimeSettings } from "@/lib/settings";
import { BudgetExceededError, executeRefresh, planRefresh } from "@/lib/data/sectors-refresh";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * UI-facing Sectors refresh control (Pengaturan drawer). Same anonymous
 * posture as the other UI APIs (`/api/memory`, `/api/web-watch`): no
 * sign-in, no Bearer secret in the browser.
 *
 * Spend guardrails are unchanged: bounded to already-recorded symbols,
 * dry-run by default, daily credit budget + ledger in `sectors-client`,
 * output to GCS for human review (the bundled data file is never
 * overwritten at runtime). Flipping the switch on only *allows* refresh
 * runs; each live run still goes through the budget check.
 *
 * GET  → `{ enabled, source, plans, estimatedCost, budget }`
 * POST `{ enabled: boolean }` → flips the runtime flag (409 when the
 *        operator pinned the gate via `SECTORS_REFRESH_ENABLED` env).
 * POST `{ run: true, dryRun?: boolean, symbols?: string[] }` → plans
 *        (default, zero spend) or executes a live refresh when enabled.
 */
export async function GET() {
  try {
    const [gate, settings] = await Promise.all([isRefreshEnabled(), getRuntimeSettings().catch(() => null)]);
    const { plans, estimatedCost } = planRefresh();
    return NextResponse.json({
      enabled: gate.enabled,
      source: gate.source,
      pinnedByEnv: isRefreshPinnedByEnv(),
      updatedAt: settings?.updatedAt ?? "",
      plans,
      estimatedCost,
      budget: Number(process.env.SECTORS_DAILY_BUDGET || 25),
    });
  } catch {
    return NextResponse.json({ unavailable: true }, { status: 200 });
  }
}

export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }

  const toggle = refreshToggleSchema.safeParse(body);
  if (toggle.success) {
    if (isRefreshPinnedByEnv()) {
      const gate = await isRefreshEnabled();
      return NextResponse.json(
        { error: "env-override", hint: "Gate dikunci operator via SECTORS_REFRESH_ENABLED; sakelar UI tidak berlaku.", enabled: gate.enabled, source: gate.source },
        { status: 409 },
      );
    }
    try {
      const saved = await saveRuntimeSettings({ sectorsRefreshEnabled: toggle.data.enabled });
      return NextResponse.json({ enabled: saved.sectorsRefreshEnabled, source: "settings", updatedAt: saved.updatedAt });
    } catch {
      return NextResponse.json({ unavailable: true }, { status: 200 });
    }
  }

  const run = refreshRunSchema.safeParse(body);
  if (!run.success) {
    return NextResponse.json({ error: "Masukan tidak valid", details: run.error.flatten() }, { status: 400 });
  }
  const gate = await isRefreshEnabled();
  if (!gate.enabled) {
    return NextResponse.json(
      { error: "refresh-disabled", hint: "Nyalakan dulu sakelar refresh di Pengaturan." },
      { status: 403 },
    );
  }
  const apiKey = process.env.SECTORS_API_KEY;
  const { symbols, rejected, plans, estimatedCost } = planRefresh(run.data.symbols);
  const dryRun = run.data.dryRun ?? true;
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
