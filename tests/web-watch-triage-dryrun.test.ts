/**
 * Triage dry-run over a local copy of the production queue.
 *
 * Skipped unless `WEB_WATCH_QUEUE_FILE` names a queue.json on disk. It reads
 * that file, triages its pending list exactly as `POST
 * /api/internal/web-watch-triage` would, and prints the report. It never
 * reads or writes GCS. To measure against production:
 *
 *   gcloud storage cp gs://katalis-recorded/catalyst/web-watch/queue.json /tmp/queue.json
 *   WEB_WATCH_QUEUE_FILE=/tmp/queue.json npx vitest run tests/web-watch-triage-dryrun.test.ts
 *
 * Set `WEB_WATCH_TRIAGE_REPORT` to a path to also write the report as JSON.
 * Set `WEB_WATCH_DRAFT=live` (with a model key in the environment) to also
 * run the drafting pass over what triage kept — real model calls, capped by
 * the per-sweep threshold, still nothing written anywhere but the report.
 */
import { readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { backfillTriage, normalizeQueue } from "@/lib/web-watch/queue";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { triageAll } from "@/lib/web-watch/triage";
import { draftProposals } from "@/lib/web-watch/proposals";

const file = process.env.WEB_WATCH_QUEUE_FILE;

describe.skipIf(!file)("web-watch triage dry-run", () => {
  it("reports what triage would archive from the given queue, writing nothing", { timeout: 300_000 }, async () => {
    const queue = normalizeQueue(JSON.parse(readFileSync(file as string, "utf8")));
    const { next, report } = backfillTriage(queue, { sources: SEED_SOURCES }, new Date().toISOString());
    // The defect this measures: an item a human accepted that triage would
    // have archived had it arrived today. Each accepted event is judged as a
    // fresh candidate against everything else the queue holds.
    const acceptedWouldArchive = queue.accepted.flatMap((event) => {
      const seen = queue.accepted.filter((other) => other.id !== event.id).map((other) => ({ event: other, where: "accepted" as const }));
      const [{ result }] = triageAll([event], { sources: SEED_SOURCES, seen });
      return result.verdict === "archive" ? [{ title: event.title, rule: result.rule, reason: result.reason }] : [];
    });
    const review = next.pending.map((event) => ({
      title: event.title,
      matchedBy: (next.matches[event.id]?.matchedBy ?? []).map((e) => `${e.symbol}:${e.by}:${e.term}`),
    }));
    const drafts = process.env.WEB_WATCH_DRAFT === "live" ? await draftProposals(next, { force: true }) : null;
    const proposals = drafts?.outcomes
      .filter((outcome) => outcome.proposal)
      .map((outcome) => ({ title: next.pending.find((e) => e.id === outcome.id)?.title, impacts: outcome.proposal?.impacts }));
    const output = { ...report, acceptedWouldArchive, reviewAll: review, drafts: drafts ? { ...drafts.report, proposals } : null };
    if (process.env.WEB_WATCH_TRIAGE_REPORT) writeFileSync(process.env.WEB_WATCH_TRIAGE_REPORT, JSON.stringify(output, null, 2));
    console.log(JSON.stringify(report, null, 2));
    expect(report.pendingBefore).toBe(queue.pending.length);
  });
});
