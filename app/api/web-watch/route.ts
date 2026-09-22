import { NextResponse } from "next/server";
import { webWatchReviewSchema } from "@/lib/schemas";
import { listSources, gcsRegistryStore } from "@/lib/web-watch/registry";
import {
  BAND_SCORE,
  decide,
  ensureOverlay,
  gcsQueueStore,
  listKnownSymbols,
  ReviewError,
  saveQueue,
  setOverlayForTests,
} from "@/lib/web-watch/queue";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — everything the Pantau page needs: source health, the pending queue,
 * accepted events, and the symbol universe for mapping.
 */
export async function GET() {
  try {
    await ensureOverlay().catch(() => []);
    const [sources, queue] = await Promise.all([
      listSources(gcsRegistryStore).catch(() => []),
      gcsQueueStore.load().then((r) => r?.data ?? null).catch(() => null),
    ]);
    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        enabled: s.enabled,
        lastStatus: s.lastStatus,
        lastError: s.lastError,
        lastCheckedAt: s.lastCheckedAt,
        lastChangedAt: s.lastChangedAt,
        checks: s.checks,
        changes: s.changes,
      })),
      pending: queue?.pending ?? [],
      accepted: queue?.accepted ?? [],
      decidedCount: queue ? Object.keys(queue.decided).length : 0,
      symbols: listKnownSymbols(),
      bands: BAND_SCORE,
    });
  } catch (error) {
    return NextResponse.json(
      { unavailable: true, error: error instanceof Error ? error.message : "gcs-unavailable" },
      { status: 200 },
    );
  }
}

/**
 * POST — accept (with reviewer-mapped impacts) or dismiss a candidate.
 * Accepted events join the queue's `accepted` list and the engine overlay;
 * the engine itself is untouched.
 *
 * Open to anyone who can reach the service: reviewing costs no Sectors credit
 * and never called the provider, so the bearer that used to sit here only
 * stood between a reader and the queue. The deployed URL is public, so an
 * accept from here is not attributable to a person — the queue records the
 * decision, not who made it.
 */
export async function POST(request: Request) {
  let body: unknown;
  try {
    body = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  const parsed = webWatchReviewSchema.safeParse(body);
  if (!parsed.success) {
    return NextResponse.json({ error: "Masukan review tidak valid", details: parsed.error.flatten() }, { status: 400 });
  }
  const nowIso = new Date().toISOString();
  try {
    const next = await saveQueue(gcsQueueStore, (queue) =>
      decide(queue, parsed.data.candidateId, parsed.data, nowIso),
    );
    // Push freshly accepted events straight into this instance's overlay so
    // the next analysis on the same instance sees them before the TTL lapses.
    setOverlayForTests(next.accepted);
    const decision = next.decided[parsed.data.candidateId];
    return NextResponse.json({
      ok: true,
      status: decision.status,
      pending: next.pending.length,
      accepted: next.accepted.length,
    });
  } catch (error) {
    if (error instanceof ReviewError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: "Gagal menyimpan keputusan review" }, { status: 500 });
  }
}
