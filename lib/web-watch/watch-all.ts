/**
 * The scheduled sweep — port of ReguLens `check_all`.
 *
 * "Due" here means a source's own check interval has elapsed, checked each
 * time the sweep runs. Cloud Scheduler job `catalyst-web-watch` runs it on
 * weekdays at 17.30 Asia/Jakarta; a manual trigger can run it any time.
 *
 * Every enabled source that is due, one at a time. Sequential on purpose:
 * the fan-out that matters happens after ingestion, in review and in the
 * engine, where it is already bounded. Firing twelve fetches at once here
 * would only make the failure modes harder to read.
 *
 * `POST /api/internal/check-sources` is the entry point Cloud Scheduler
 * hits; the local fallback (`runInBackground` / manual trigger) calls
 * `watchAll()` directly. One code path either way.
 */

import { checkSource, type CheckDeps } from "@/lib/web-watch/check";
import { enqueue, saveQueue, type QueueStore } from "@/lib/web-watch/queue";
import { listSources } from "@/lib/web-watch/registry";
import type { ReviewStore } from "@/lib/web-watch/review";
import { isDue, type CheckResult, type WatchAllResult, type WatchSummary } from "@/lib/web-watch/types";

export interface WatchAllDeps extends CheckDeps {
  review: ReviewStore;
  queue: QueueStore;
}

function count(results: CheckResult[], status: string): number {
  return results.filter((r) => r.status === status).length;
}

export async function watchAll(deps: WatchAllDeps, force = false): Promise<WatchAllResult> {
  const nowMs = deps.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();
  const sources = await listSources(deps.store);
  const results: CheckResult[] = [];

  for (const source of sources) {
    if (!source.enabled) {
      results.push({ sourceId: source.id, url: source.url, label: source.label, status: "disabled" });
      continue;
    }
    if (!force && !isDue(source, nowMs)) {
      results.push({ sourceId: source.id, url: source.url, label: source.label, status: "not_due" });
      continue;
    }
    try {
      const result = await checkSource(source.id, deps, force);
      // Candidates are persisted even though they also ride along inline —
      // the check-result file is the audit trail, the candidate objects are
      // the queue.
      for (const candidate of result.candidates ?? []) {
        await deps.review.saveCandidate(nowIso.slice(0, 10), candidate);
      }
      results.push(result);
    } catch (error) {
      // One bad source must not end the sweep.
      results.push({
        sourceId: source.id,
        url: source.url,
        label: source.label,
        status: "error",
        error: `unexpected: ${error instanceof Error ? error.name : "error"}`,
      });
    }
  }

  const summary: WatchSummary = {
    checked: results.length,
    changed: count(results, "changed"),
    unchanged: count(results, "unchanged"),
    baselined: count(results, "baselined"),
    errors: count(results, "error"),
    candidates: results.reduce((sum, r) => sum + (r.candidates?.length ?? 0), 0),
  };
  const output: WatchAllResult = { summary, results, checkedAt: nowIso };
  const runId = nowIso.replace(/[:.]/g, "-");
  await deps.review.saveCheck(runId, output);
  // Fresh candidates join the review queue; already-decided ids never return.
  const fresh = results.flatMap((r) => r.candidates ?? []);
  if (fresh.length) {
    await saveQueue(deps.queue, (queue) => enqueue(queue, fresh)).catch(() => undefined);
  }
  return output;
}
