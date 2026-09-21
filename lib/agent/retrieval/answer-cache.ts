import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";
import { DATA_AS_OF } from "@/lib/data/fixtures";
import { normalizeQuery } from "@/lib/agent/query";

/**
 * Keyed on the material, not on the reader.
 *
 * A profile fingerprint is near-unique per reader, so a cache keyed that way
 * writes on nearly every question and reads on nearly none — paying for object
 * storage that serves nothing back.
 *
 * Hashing the bundle text collapses the key space to genuinely distinct
 * material, and closes the cross-profile leak class by construction rather
 * than by care: two watchlists that produce different bundles produce
 * different keys, and two that produce the same bundle are asking about the
 * same content, where sharing an answer is correct by definition.
 *
 * `DATA_AS_OF` rides in the key so a recordings refresh orphans old entries
 * instead of serving figures the app no longer holds. Invalidation is
 * structural; there is no TTL to get wrong.
 */
export function answerCacheKey(question: string, bundleText: string, model: string): string {
  return cacheKeyFor(["copilot-answer-v1", normalizeQuery(question), bundleText, DATA_AS_OF, model]);
}

export const readAnswerCache = (key: string) => getCached<{ text: string }>(key);
export const writeAnswerCache = (key: string, value: { text: string }) => setCached(key, value);
