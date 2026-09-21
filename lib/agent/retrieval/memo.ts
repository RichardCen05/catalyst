/**
 * A bounded cache for values derived from the recordings.
 *
 * Cloud Run instances are long-lived and these keys carry a watchlist, so an
 * unbounded module-scope Map grows for as long as one instance keeps serving
 * distinct readers. A bound turns that into a fixed cost. `Map` already
 * iterates in insertion order, so deleting and re-inserting on read is the
 * whole LRU — no list, no counters.
 *
 * `has` is separate from `get` because `null` is a real value here:
 * `buildAnalysis` returns it for the twelve symbols with no complete case, and
 * a memo that read that as "nothing stored" would rebuild them on every
 * request while appearing to work.
 */
export function lruMemo<K, V>(max: number) {
  const entries = new Map<K, V>();
  return {
    has(key: K): boolean {
      return entries.has(key);
    },
    get(key: K): V | undefined {
      if (!entries.has(key)) return undefined;
      const value = entries.get(key)!;
      entries.delete(key);
      entries.set(key, value);
      return value;
    },
    set(key: K, value: V): void {
      if (entries.has(key)) entries.delete(key);
      entries.set(key, value);
      while (entries.size > max) {
        const oldest = entries.keys().next().value as K;
        entries.delete(oldest);
      }
    },
    size(): number {
      return entries.size;
    },
  };
}
