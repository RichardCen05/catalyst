/**
 * Server-side memory persistence in GCS, keyed by an anonymous cookie id.
 *
 * This does not implement the client-facing `MemoryStore` interface in
 * lib/types.ts — that interface is synchronous and reads/writes the zustand
 * store directly (`useCatalystStore.getState()`), which only exists in the
 * browser. A network-backed store cannot be synchronous. This module backs
 * `/api/memory` instead; the browser keeps writing to localStorage via
 * zustand `persist` as the optimistic cache (plan P4 point 4), and a small
 * client-side sync layer (components/memory-sync.tsx) calls this API.
 *
 * Reuses the existing `katalis-recorded` bucket under a `catalyst/` prefix
 * rather than creating a new bucket — one GCP object instead of two.
 */
import { gcsGetJson, gcsPutJson, GcsPreconditionFailed } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_MEMORY_BUCKET || "katalis-recorded";

function objectPath(uid: string): string {
  return `catalyst/memory/${uid}.json`;
}

export async function loadMemory(uid: string): Promise<Record<string, unknown> | null> {
  const result = await gcsGetJson<Record<string, unknown>>(BUCKET, objectPath(uid));
  return result?.data ?? null;
}

/** Merge `patch` on top of whatever is stored, with one read-merge-retry on a concurrent write. */
export async function saveMemory(uid: string, patch: Record<string, unknown>): Promise<Record<string, unknown>> {
  const path = objectPath(uid);
  const existing = await gcsGetJson<Record<string, unknown>>(BUCKET, path);
  const merged = { ...(existing?.data ?? {}), ...patch };
  try {
    await gcsPutJson(BUCKET, path, merged, { ifGenerationMatch: existing?.generation ?? "0" });
    return merged;
  } catch (error) {
    if (!(error instanceof GcsPreconditionFailed)) throw error;
    const retryBase = await gcsGetJson<Record<string, unknown>>(BUCKET, path);
    const retryMerged = { ...(retryBase?.data ?? {}), ...patch };
    await gcsPutJson(BUCKET, path, retryMerged, { ifGenerationMatch: retryBase?.generation });
    return retryMerged;
  }
}
