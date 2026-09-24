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
import { applyDrafts, draftProposals, type DraftOptions } from "@/lib/web-watch/proposals";
import { autoAccept, enqueue, normalizeQueue, saveQueue, type QueueStore } from "@/lib/web-watch/queue";
import { isAutoAcceptEnabled } from "@/lib/settings";
import { listSources } from "@/lib/web-watch/registry";
import type { ReviewStore } from "@/lib/web-watch/review";
import { isDue, type CheckResult, type WatchAllResult, type WatchSummary } from "@/lib/web-watch/types";

export interface WatchAllDeps extends CheckDeps {
  review: ReviewStore;
  queue: QueueStore;
  /** Model seam and clock for the drafting pass; tests stub the call. */
  draft?: DraftOptions;
  /** Whether the auto-accept switch is on; tests pass it instead of reading
   *  the stored setting. */
  autoAcceptEnabled?: () => Promise<boolean>;
}

/**
 * Accept the verified proposals the rules allow, when the switch is on.
 * Runs after drafting so this sweep's own proposals are eligible.
 * Best-effort: a failure leaves everything in review and never fails the
 * sweep. Returns how many were accepted, or null when the switch is off.
 */
export async function autoAcceptPending(
  queue: QueueStore,
  nowIso: string,
  enabled: () => Promise<boolean> = async () => (await isAutoAcceptEnabled()).enabled,
): Promise<{ accepted: number } | null> {
  try {
    if (!(await enabled())) return null;
    let accepted: string[] = [];
    await saveQueue(queue, (current) => {
      const result = autoAccept(current, nowIso);
      accepted = result.accepted;
      return result.next;
    });
    return { accepted: accepted.length };
  } catch (error) {
    console.warn(`[web-watch] auto-accept: ${(error instanceof Error ? error.message : String(error)).slice(0, 300)}`);
    return null;
  }
}

/**
 * Draft proposals for whatever is pending without one, then merge them into
 * the queue as it stands. Runs inside the request, under its own call cap and
 * time budget, rather than after the response: Cloud Run throttles CPU once a
 * response is sent, and the scheduler job only needs the sweep to finish.
 * Best-effort — a failure here never fails the sweep.
 */
export async function draftPending(queue: QueueStore, options: DraftOptions = {}) {
  try {
    const loaded = await queue.load();
    const { outcomes, report } = await draftProposals(normalizeQueue(loaded?.data), options);
    if (outcomes.length) await saveQueue(queue, (current) => applyDrafts(current, outcomes));
    return report;
  } catch (error) {
    console.warn(`[llm-fallback] triage drafting: ${(error instanceof Error ? error.message : String(error)).slice(0, 300)}`);
    return null;
  }
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
  // Fresh candidates go through triage into the review queue; already-decided
  // and already-archived ids never return.
  const fresh = results.flatMap((r) => r.candidates ?? []);
  if (fresh.length) {
    await saveQueue(deps.queue, (queue) => enqueue(queue, fresh, { sources }, nowIso)).catch(() => undefined);
  }
  // Drafting also picks up earlier candidates a closed budget left untried,
  // so it runs whether or not this sweep found anything new.
  const drafts = await draftPending(deps.queue, { nowIso, ...deps.draft });
  const auto = await autoAcceptPending(deps.queue, nowIso, deps.autoAcceptEnabled);
  return { ...output, ...(drafts ? { drafts } : {}), ...(auto ? { autoAccepted: auto.accepted } : {}) };
}
