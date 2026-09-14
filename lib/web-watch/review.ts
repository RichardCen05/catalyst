/**
 * Review queue — where candidates wait for a human.
 *
 * Layout in the cache bucket (default `katalis-recorded`):
 *
 *   catalyst/web-watch/registry.json                 source states
 *   catalyst/web-watch/checks/<run-id>.json          one file per sweep
 *   catalyst/web-watch/checks/latest.json            pointer to the last run
 *   catalyst/web-watch/candidates/<YYYY-MM-DD>/<id>.json   one per candidate
 *
 * One file per run (never read-merge-write a shared log) so concurrent runs
 * cannot clobber each other. Candidate ids are deterministic
 * (`web-<source>-<hash>`), so a re-run overwrites the same object instead of
 * duplicating the queue.
 */

import { gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";
import type { MarketEvent } from "@/lib/types";
import { bucket } from "@/lib/web-watch/registry";
import type { WatchAllResult } from "@/lib/web-watch/types";

export const CHECKS_PREFIX = "catalyst/web-watch/checks";
export const CANDIDATES_PREFIX = "catalyst/web-watch/candidates";

export interface ReviewStore {
  saveCandidate(date: string, candidate: MarketEvent): Promise<void>;
  saveCheck(runId: string, result: WatchAllResult): Promise<void>;
  getLatestCheck(): Promise<WatchAllResult | null>;
}

export const gcsReviewStore: ReviewStore = {
  async saveCandidate(date, candidate) {
    const path = `${CANDIDATES_PREFIX}/${date}/${candidate.id}.json`;
    try {
      await gcsPutJson(bucket(), path, candidate, { ifGenerationMatch: "0" });
    } catch {
      // Deterministic id already queued — overwrite with the fresher read.
      await gcsPutJson(bucket(), path, candidate);
    }
  },
  async saveCheck(runId, result) {
    await gcsPutJson(bucket(), `${CHECKS_PREFIX}/${runId}.json`, result);
    await gcsPutJson(bucket(), `${CHECKS_PREFIX}/latest.json`, { runId, checkedAt: result.checkedAt, summary: result.summary });
  },
  async getLatestCheck() {
    const pointer = await gcsGetJson<{ runId: string }>(bucket(), `${CHECKS_PREFIX}/latest.json`).catch(() => null);
    if (!pointer) return null;
    const run = await gcsGetJson<WatchAllResult>(bucket(), `${CHECKS_PREFIX}/${pointer.data.runId}.json`).catch(() => null);
    return run?.data ?? null;
  },
};

export function memoryReviewStore(): ReviewStore & {
  candidates: Map<string, MarketEvent>;
  checks: Map<string, WatchAllResult>;
  latest: WatchAllResult | null;
} {
  const candidates = new Map<string, MarketEvent>();
  const checks = new Map<string, WatchAllResult>();
  const store = {
    candidates,
    checks,
    latest: null as WatchAllResult | null,
    async saveCandidate(_date: string, candidate: MarketEvent) {
      candidates.set(candidate.id, candidate);
    },
    async saveCheck(runId: string, result: WatchAllResult) {
      checks.set(runId, result);
      store.latest = result;
    },
    async getLatestCheck() {
      return store.latest;
    },
  };
  return store;
}
