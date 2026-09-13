import { createHash } from "node:crypto";
import { gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";

export function cacheKeyFor(parts: string[]): string {
  return createHash("sha256").update(parts.join("\0")).digest("hex");
}

export async function getCached<T>(key: string): Promise<T | null> {
  try {
    const result = await gcsGetJson<T>(BUCKET, `catalyst/llm/${key}.json`);
    return result?.data ?? null;
  } catch {
    return null;
  }
}

export async function setCached<T>(key: string, value: T): Promise<void> {
  try {
    await gcsPutJson(BUCKET, `catalyst/llm/${key}.json`, value);
  } catch {
    // Cache is optimization, not correctness requirement.
  }
}
