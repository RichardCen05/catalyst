/**
 * Internal web-watch triage backfill — triage what is already pending.
 *
 * The sweep triages every new candidate on the way in (`enqueue`). This route
 * applies the same rules to the backlog that arrived before triage existed.
 *
 * Dry-run by default: it reports how many pending items each rule would
 * archive, with sampled titles and reasons, and writes nothing. Only a body
 * of `{ "apply": true }` writes, through the same generation-guarded
 * `saveQueue` every other queue write uses. Archived items stay in the queue
 * file and can be restored from Pantau; nothing is accepted here.
 *
 * Auth: `INTERNAL_CRON_SECRET` bearer, same as `check-sources`
 * (`lib/internal-auth.ts`).
 */

import { NextResponse } from "next/server";
import { checkInternalAuth } from "@/lib/internal-auth";
import { backfillTriage, gcsQueueStore, normalizeQueue, saveQueue, type BackfillReport } from "@/lib/web-watch/queue";
import { applySeedDeclarations, gcsRegistryStore, listSources, saveRegistry } from "@/lib/web-watch/registry";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";

export const runtime = "nodejs";
export const dynamic = "force-dynamic";

export async function POST(request: Request) {
  const auth = checkInternalAuth(request);
  if (!auth.ok) return NextResponse.json({ error: auth.error }, { status: auth.status });
  let body: { apply?: unknown } = {};
  try {
    body = await request.json();
  } catch {
    body = {};
  }
  const apply = body.apply === true;
  const nowIso = new Date().toISOString();
  try {
    // Triage reads declared symbols and regions off the registry; a registry
    // seeded before those fields existed gets them here, as the sweep would.
    if (apply) await saveRegistry(gcsRegistryStore, (file) => applySeedDeclarations(file, SEED_SOURCES)).catch(() => null);
    const sources = await listSources(gcsRegistryStore);
    const declared = sources.map((source) => ({ ...source, ...SEED_SOURCES.find((seed) => seed.id === source.id) }));
    let report: BackfillReport | null = null;
    if (apply) {
      await saveQueue(gcsQueueStore, (queue) => {
        const result = backfillTriage(queue, { sources: declared }, nowIso);
        report = result.report;
        return result.next;
      });
    } else {
      const loaded = await gcsQueueStore.load();
      report = backfillTriage(normalizeQueue(loaded?.data), { sources: declared }, nowIso).report;
    }
    return NextResponse.json({ applied: apply, report });
  } catch (error) {
    return NextResponse.json({ error: error instanceof Error ? error.message : "triage-failed" }, { status: 500 });
  }
}
