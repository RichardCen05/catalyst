/**
 * Internal web-watch trigger — the Cloud Scheduler target.
 *
 * Cloud Scheduler (Asia/Jakarta, weekdays after close):
 *   gcloud scheduler jobs create http catalyst-web-watch \
 *     --schedule="30 17 * * 1-5" --time-zone="Asia/Jakarta" \
 *     --uri="https://<service>/api/internal/check-sources" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer ${INTERNAL_CRON_SECRET}" \
 *     --message-body='{}'
 *
 * Auth: when INTERNAL_CRON_SECRET is set, the Bearer token must match.
 * When unset (local dev), the route runs open — same rule as the memory
 * route's degrade-to-local behavior, but for a scheduler instead of a user.
 */

import { NextResponse } from "next/server";
import { checkSource } from "@/lib/web-watch/check";
import { enqueue, ensureOverlay, gcsQueueStore, saveQueue, setOverlayForTests } from "@/lib/web-watch/queue";
import { gcsRegistryStore, listSources, saveRegistry } from "@/lib/web-watch/registry";
import { newSourceState } from "@/lib/web-watch/types";
import { gcsReviewStore } from "@/lib/web-watch/review";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { watchAll } from "@/lib/web-watch/watch-all";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authorized(request: Request): boolean {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (!secret) return true;
  return request.headers.get("authorization") === `Bearer ${secret}`;
}

async function seedIfEmpty(): Promise<{ seeded: number }> {
  // Top-up, not just first-boot: additive by id, so a raced seed run can
  // never delete sources — it only fills the gaps, keeping live state.
  const file = await saveRegistry(gcsRegistryStore, (current) => {
    const next = { ...current, sources: { ...current.sources } };
    for (const source of SEED_SOURCES) {
      if (!next.sources[source.id] && !Object.values(next.sources).some((s) => s.url === source.url)) {
        next.sources[source.id] = newSourceState(source);
      }
    }
    return next;
  }).catch(() => null);
  return { seeded: file ? Object.keys(file.sources).length : 0 };
}

export async function GET(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  try {
    const sources = await listSources(gcsRegistryStore);
    const latest = await gcsReviewStore.getLatestCheck().catch(() => null);
    return NextResponse.json({
      sources: sources.map((s) => ({
        id: s.id,
        label: s.label,
        kind: s.kind,
        enabled: s.enabled,
        lastStatus: s.lastStatus,
        lastError: s.lastError,
        lastCheckedAt: s.lastCheckedAt,
        checks: s.checks,
        changes: s.changes,
      })),
      latest,
    });
  } catch (error) {
    return NextResponse.json(
      { unavailable: true, error: error instanceof Error ? error.message : "gcs-unavailable" },
      { status: 200 },
    );
  }
}

export async function POST(request: Request) {
  if (!authorized(request)) return NextResponse.json({ error: "unauthorized" }, { status: 401 });
  let body: { force?: boolean; sourceId?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const store = gcsRegistryStore;
  const date = new Date().toISOString().slice(0, 10);
  try {
    await seedIfEmpty();
    if (body.sourceId) {
      const result = await checkSource(body.sourceId, { store }, body.force ?? true);
      for (const candidate of result.candidates ?? []) {
        await gcsReviewStore.saveCandidate(date, candidate);
      }
      if (result.candidates?.length) {
        await saveQueue(gcsQueueStore, (queue) => enqueue(queue, result.candidates ?? [])).catch(() => undefined);
      }
      await ensureOverlay().catch(() => []);
      return NextResponse.json(result);
    }
    const output = await watchAll({ store, review: gcsReviewStore, queue: gcsQueueStore }, body.force ?? false);
    const accepted = await ensureOverlay().catch(() => []);
    setOverlayForTests(accepted);
    return NextResponse.json(output);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "check-failed" },
      { status: 500 },
    );
  }
}
