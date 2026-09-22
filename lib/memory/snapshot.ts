/**
 * The one shape a stored memory snapshot passes through, on either hydration
 * path.
 *
 * Two of them exist: zustand `persist` reads localStorage, and `MemorySync`
 * reads the GCS backup. Only the first used to run a migration, and the GCS
 * object carried no version at all, so a snapshot written by an older build
 * could be `setState()`-ed into the store in its old shape. Both now call
 * `migrateMemorySnapshot`, and the backup path additionally validates every
 * key before anything reaches the store.
 *
 * Deliberately free of React and zustand: `app/api/memory/route.ts` is server
 * code, and importing `lib/store.ts` there would build a browser store on
 * import.
 */
import { memoryPatchFieldSchemas } from "@/lib/schemas";

type Snapshot = Record<string, unknown>;

/** The keys a snapshot may carry, in the order their schemas are declared. */
export const MEMORY_SNAPSHOT_KEYS = Object.keys(memoryPatchFieldSchemas) as (keyof typeof memoryPatchFieldSchemas)[];

/**
 * Backfill the fields a given snapshot predates.
 *
 * Version-blind on purpose: it fills by key, so one pass covers every older
 * shape without a chain of per-version steps to keep in sync.
 */
export function migrateMemorySnapshot(persisted: unknown): Snapshot | null {
  if (!persisted || typeof persisted !== "object") return null;
  const stored = persisted as Snapshot;
  // v4 → v5: the panel and tour flags stopped being persisted. A snapshot
  // written before that still carries them, and `merge` would spread a stale
  // `tourOpen: true` over the fresh default — reopening a reader into a tour
  // they had already closed. Dropped here so the older snapshot converges on
  // the new shape instead of overriding it.
  const { copilotOpen: _open, copilotContext: _context, tourOpen: _tour, ...carried } = stored;
  void _open; void _context; void _tour;
  const out: Snapshot = {
    ...carried,
    holdings: stored.holdings ?? {},
    caseMandates: stored.caseMandates ?? {},
    caseStatuses: stored.caseStatuses ?? {},
    caseResolutions: stored.caseResolutions ?? {},
    ruleProposals: stored.ruleProposals ?? [],
    insights: stored.insights ?? [],
    feedback: stored.feedback ?? [],
  };
  // v3 → v4: thresholds diperkenalkan; snapshot lama tidak punya field ini.
  // Isi objek kosong agar resolveThresholds mengisi default per kunci (C7).
  const playbook = out.playbook as Snapshot | undefined;
  if (playbook) out.playbook = { ...playbook, thresholds: playbook.thresholds ?? {} };
  return out;
}

/**
 * Migrate, then check every key, then hand back what is safe to hydrate.
 *
 * All or nothing: one key that fails discards the snapshot. Half a snapshot is
 * worse than none — the reader would see a profile restored next to a playbook
 * that was silently dropped, with nothing on screen saying so.
 *
 * Returns only the allowlisted keys, so a `version` stamp, a field from a
 * newer build, or anything else that reached the bucket cannot ride into the
 * store on this path.
 */
export function parseMemorySnapshot(remote: unknown): Snapshot | null {
  const migrated = migrateMemorySnapshot(remote);
  if (!migrated) return null;
  const out: Snapshot = {};
  for (const key of MEMORY_SNAPSHOT_KEYS) {
    const value = migrated[key];
    if (value === undefined) continue;
    const parsed = memoryPatchFieldSchemas[key].safeParse(value);
    if (!parsed.success) return null;
    out[key] = parsed.data;
  }
  return out;
}
