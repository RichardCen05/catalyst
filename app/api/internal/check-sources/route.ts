/**
 * Internal web-watch trigger — the Cloud Scheduler target.
 *
 * STATUS: wired. Job `catalyst-web-watch` exists in `us-central1` of project
 * `ada-sectors-508410`, runs `30 17 * * 1-5` Asia/Jakarta against this route,
 * and carries the `INTERNAL_CRON_SECRET` bearer header. If that job is ever
 * deleted or paused, stop calling the sweep "scheduled" in UI copy and docs.
 *
 * The command that created it (Asia/Jakarta, weekdays after close):
 *   gcloud scheduler jobs create http catalyst-web-watch \
 *     --schedule="30 17 * * 1-5" --time-zone="Asia/Jakarta" \
 *     --uri="https://<service>/api/internal/check-sources" \
 *     --http-method=POST \
 *     --headers="Authorization=Bearer ${INTERNAL_CRON_SECRET}" \
 *     --message-body='{}'
 *
 * Auth: when INTERNAL_CRON_SECRET is set, the Bearer token must match.
 * When unset, the route runs open ONLY in local dev — in production
 * (NODE_ENV=production or Cloud Run) it fails closed with 503 so a missing
 * secret is loud instead of open. See `lib/internal-auth.ts`.
 */

import { NextResponse } from "next/server";
import { checkInternalAuth } from "@/lib/internal-auth";
import { checkSource } from "@/lib/web-watch/check";
import { enqueue, ensureOverlay, gcsQueueStore, getOverlayStats, saveQueue, setOverlayForTests } from "@/lib/web-watch/queue";
import { applySeedDeclarations, gcsRegistryStore, listSources, saveRegistry } from "@/lib/web-watch/registry";
import { gcsReviewStore } from "@/lib/web-watch/review";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { draftPending, watchAll } from "@/lib/web-watch/watch-all";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

function authError(request: Request): { status: 401 | 503; error: string } | null {
  const result = checkInternalAuth(request);
  return result.ok ? null : { status: result.status, error: result.error };
}

async function seedAndSyncSources(): Promise<{ seeded: number }> {
  // Top-up, not just first-boot: additive by id, so a raced seed run can
  // never delete sources — it only fills the gaps and re-applies the seed
  // declarations (enabled, label, interval) over the observed state.
  const file = await saveRegistry(gcsRegistryStore, (current) =>
    applySeedDeclarations(current, SEED_SOURCES),
  ).catch(() => null);
  return { seeded: file ? Object.keys(file.sources).length : 0 };
}

export async function GET(request: Request) {
  const denied = authError(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
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
  const denied = authError(request);
  if (denied) return NextResponse.json({ error: denied.error }, { status: denied.status });
  let body: { force?: boolean; sourceId?: string } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const store = gcsRegistryStore;
  const date = new Date().toISOString().slice(0, 10);
  try {
    await seedAndSyncSources();
    if (body.sourceId) {
      const result = await checkSource(body.sourceId, { store }, body.force ?? true);
      for (const candidate of result.candidates ?? []) {
        await gcsReviewStore.saveCandidate(date, candidate);
      }
      if (result.candidates?.length) {
        const sources = await listSources(store);
        await saveQueue(gcsQueueStore, (queue) => enqueue(queue, result.candidates ?? [], { sources })).catch(() => undefined);
        await draftPending(gcsQueueStore);
      }
      await ensureOverlay().catch(() => []);
      return NextResponse.json(result);
    }
    const output = await watchAll({ store, review: gcsReviewStore, queue: gcsQueueStore }, body.force ?? false);
    const accepted = await ensureOverlay().catch(() => []);
    setOverlayForTests(accepted, getOverlayStats());
    return NextResponse.json(output);
  } catch (error) {
    return NextResponse.json(
      { error: error instanceof Error ? error.message : "check-failed" },
      { status: 500 },
    );
  }
}
