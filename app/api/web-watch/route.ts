import { NextResponse } from "next/server";
import { RELEVANCE_BAND_SCORE } from "@/lib/agent/thresholds";
import { webWatchReviewSchema } from "@/lib/schemas";
import { listSources, gcsRegistryStore } from "@/lib/web-watch/registry";
import {
  acceptProposals,
  decide,
  ensureOverlay,
  gcsQueueStore,
  isBatchAcceptable,
  listKnownSymbols,
  overlayCounts,
  restore,
  ReviewError,
  saveQueue,
  setOverlayForTests,
  sourceHealth,
  type ReviewQueue,
} from "@/lib/web-watch/queue";
import { resolveThresholds } from "@/lib/agent/thresholds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

/**
 * GET — everything the Pantau page needs: source health, the pending queue
 * with triage matches and verified proposals, what triage archived, accepted
 * events, and the symbol universe for mapping.
 */
export async function GET() {
  try {
    await ensureOverlay().catch(() => []);
    const [sources, queue] = await Promise.all([
      listSources(gcsRegistryStore).catch(() => []),
      gcsQueueStore.load().then((r) => r?.data ?? null).catch(() => null),
    ]);
    const health = new Map((queue ? sourceHealth(queue, sources) : []).map((h) => [h.sourceId, h]));
    const archived = Object.entries(queue?.archived ?? {})
      .sort(([, a], [, b]) => b.at.localeCompare(a.at))
      .map(([id, entry]) => ({
        id,
        title: entry.event.title,
        provider: entry.event.citations[0]?.provider ?? null,
        url: entry.event.citations[0]?.url ?? null,
        rule: entry.rule,
        reason: entry.reason,
        at: entry.at,
      }));
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
        health: health.get(s.id) ?? null,
      })),
      pending: queue?.pending ?? [],
      matches: queue?.matches ?? {},
      proposals: queue?.proposals ?? {},
      batchable: Object.keys(queue?.proposals ?? {}).filter((id) => isBatchAcceptable(queue?.proposals[id])),
      archived,
      restored: queue?.restored ?? {},
      healthWindow: resolveThresholds().webWatchSourceHealthWindow,
      accepted: queue?.accepted ?? [],
      decidedCount: queue ? Object.keys(queue.decided).length : 0,
      symbols: listKnownSymbols(),
      bands: RELEVANCE_BAND_SCORE,
    });
  } catch (error) {
    return NextResponse.json(
      { unavailable: true, error: error instanceof Error ? error.message : "gcs-unavailable" },
      { status: 200 },
    );
  }
}

/**
 * POST — accept (with reviewer-mapped impacts, or a verified proposal the
 * reviewer took as-is), accept several high-band proposals at once, dismiss a
 * candidate, or restore one triage archived. Every one of these is a person
 * pressing a button; nothing here decides on its own.
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
  const input = parsed.data;
  try {
    const next = await saveQueue(gcsQueueStore, (queue): ReviewQueue => {
      if (input.action === "restore") return restore(queue, input.candidateId, nowIso);
      if (input.action === "accept-proposals") return acceptProposals(queue, input.candidateIds, nowIso);
      return decide(queue, input.candidateId, input, nowIso);
    });
    // Push freshly accepted events straight into this instance's overlay so
    // the next analysis on the same instance sees them before the TTL lapses.
    setOverlayForTests(next.accepted, overlayCounts(next));
    const status =
      input.action === "restore" ? "restored" : input.action === "accept-proposals" ? "accepted" : next.decided[input.candidateId].status;
    return NextResponse.json({
      ok: true,
      status,
      pending: next.pending.length,
      accepted: next.accepted.length,
    });
  } catch (error) {
    if (error instanceof ReviewError) return NextResponse.json({ error: error.message }, { status: 422 });
    return NextResponse.json({ error: "Gagal menyimpan keputusan review" }, { status: 500 });
  }
}
