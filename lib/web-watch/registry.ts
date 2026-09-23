/**
 * The watch registry — which addresses are watched, and what each check saw.
 *
 * Port of the registry half of ReguLens `sources.py`. Firestore is replaced
 * with a single GCS JSON object (`catalyst/web-watch/registry.json` in the
 * cache bucket). The Firestore transaction in `_claim()` becomes a GCS
 * generation-guarded write (`ifGenerationMatch`): the loser of a race gets
 * `GcsPreconditionFailed` and reports `busy` instead of double-ingesting.
 *
 * The store is injected so tests run against memory, never GCS.
 */

import { GcsPreconditionFailed, gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";
import { newSourceState, type WatchedSource, type WatchedSourceState } from "@/lib/web-watch/types";

export const REGISTRY_PATH = "catalyst/web-watch/registry.json";
const MAX_SOURCES = 200;

export interface RegistryFile {
  version: 1;
  sources: Record<string, WatchedSourceState>;
}

export interface RegistryStore {
  load(): Promise<{ data: RegistryFile; generation: string } | null>;
  save(data: RegistryFile, options: { ifGenerationMatch?: string }): Promise<void>;
}

export function bucket(): string {
  return process.env.GCS_CACHE_BUCKET || "katalis-recorded";
}

export const gcsRegistryStore: RegistryStore = {
  async load() {
    return gcsGetJson<RegistryFile>(bucket(), REGISTRY_PATH);
  },
  async save(data, options) {
    await gcsPutJson(bucket(), REGISTRY_PATH, data, options);
  },
};

export function memoryRegistryStore(initial?: RegistryFile): RegistryStore & { generation: string } {
  let file: RegistryFile = initial ?? { version: 1, sources: {} };
  let generation = "0";
  let counter = 0;
  return {
    get generation() {
      return generation;
    },
    async load() {
      return { data: structuredClone(file), generation };
    },
    async save(data, options) {
      if (options.ifGenerationMatch !== undefined && options.ifGenerationMatch !== generation) {
        throw new GcsPreconditionFailed();
      }
      file = structuredClone(data);
      counter += 1;
      generation = String(counter);
    },
  };
}

export async function listSources(store: RegistryStore): Promise<WatchedSourceState[]> {
  const loaded = await store.load().catch(() => null);
  const sources = Object.values(loaded?.data.sources ?? {});
  sources.sort((a, b) => Number(a.enabled) - Number(b.enabled) || a.label.localeCompare(b.label));
  return sources.slice(0, MAX_SOURCES);
}

/** Register an address. An already-watched URL is returned as-is — two rows
 *  for one URL would double every check and every ingestion. */
export async function addSource(
  store: RegistryStore,
  source: WatchedSource,
): Promise<{ state: WatchedSourceState; created: boolean }> {
  const loaded = await store.load().catch(() => null);
  const file: RegistryFile = loaded?.data ?? { version: 1, sources: {} };
  const existing = Object.values(file.sources).find((s) => s.url === source.url);
  if (existing) return { state: existing, created: false };
  const state = newSourceState(source);
  const next: RegistryFile = { version: 1, sources: { ...file.sources, [state.id]: state } };
  await store.save(next, loaded ? { ifGenerationMatch: loaded.generation } : { ifGenerationMatch: "0" });
  return { state, created: true };
}

/**
 * Re-apply the declaration half of every seed to an existing registry.
 *
 * Declarations (enabled, label, interval, category) live in `seeds.ts`;
 * observed state (shas, counters, lock, last check) lives in the registry and
 * is never touched here. Seeding used to skip any id it had already written,
 * so flipping a seed to `enabled: false` never reached a deployed registry —
 * `src-bmkg-forecast-sample` kept being fetched for days after the seed said
 * NONAKTIF. Nothing mutates `enabled` at runtime, so the seed file is the
 * single source of truth and re-applying it is safe.
 */
export function applySeedDeclarations(file: RegistryFile, seeds: WatchedSource[]): RegistryFile {
  const sources = { ...file.sources };
  for (const seed of seeds) {
    const existing = sources[seed.id] ?? Object.values(sources).find((s) => s.url === seed.url);
    if (!existing) {
      sources[seed.id] = newSourceState(seed);
      continue;
    }
    sources[existing.id] = {
      ...existing,
      url: seed.url,
      label: seed.label,
      kind: seed.kind,
      enabled: seed.enabled,
      checkIntervalHours: seed.checkIntervalHours,
      linkPattern: seed.linkPattern,
      category: seed.category,
      sourceType: seed.sourceType,
      symbols: seed.symbols,
      region: seed.region,
    };
  }
  return { version: 1, sources };
}

export interface Claim {
  state: WatchedSourceState;
  file: RegistryFile;
  generation: string;
}

/** Generation-guarded read-merge-write with one retry. Seeding and releases
 *  share it so a scheduler retry racing an in-flight sweep cannot clobber
 *  source state (losing `lastTextSha` would double-ingest on the next run). */
export async function saveRegistry(
  store: RegistryStore,
  mutate: (file: RegistryFile) => RegistryFile,
): Promise<RegistryFile> {
  const loaded = await store.load().catch(() => null);
  const base: RegistryFile = loaded?.data ?? { version: 1, sources: {} };
  try {
    const next = mutate(structuredClone(base));
    await store.save(next, loaded ? { ifGenerationMatch: loaded.generation } : { ifGenerationMatch: "0" });
    return next;
  } catch (error) {
    if (!(error instanceof GcsPreconditionFailed)) throw error;
    const retry = await store.load().catch(() => null);
    const retryBase: RegistryFile = retry?.data ?? { version: 1, sources: {} };
    const next = mutate(structuredClone(retryBase));
    await store.save(next, retry ? { ifGenerationMatch: retry.generation } : { ifGenerationMatch: "0" });
    return next;
  }
}

/** Take the check lock for one source, atomically. A nightly sweep plus a
 *  user pressing "check now" is not exotic — two reads of one address would
 *  both see "no stored hash" and both ingest, so the claim is a
 *  generation-guarded write rather than a read followed by a write. */
export async function claim(store: RegistryStore, sourceId: string, nowMs: number = Date.now()): Promise<Claim | null> {
  for (let attempt = 0; attempt < 2; attempt += 1) {
    const loaded = await store.load().catch(() => null);
    if (!loaded) return null;
    const state = loaded.data.sources[sourceId];
    if (!state) return null;
    if (isLocked(state, nowMs)) return null;
    const locked: WatchedSourceState = { ...state, checkLockAt: new Date(nowMs).toISOString() };
    const file: RegistryFile = {
      version: 1,
      sources: { ...loaded.data.sources, [sourceId]: locked },
    };
    try {
      await store.save(file, { ifGenerationMatch: loaded.generation });
      return { state: locked, file, generation: loaded.generation };
    } catch (error) {
      if (error instanceof GcsPreconditionFailed) continue;
      throw error;
    }
  }
  return null;
}

/** Release whatever a check concluded. The release always writes — a crashed
 *  check must never strand a source. Retried without the guard so the state
 *  cannot be lost to a concurrent edit. */
export async function release(
  store: RegistryStore,
  sourceId: string,
  updates: Partial<WatchedSourceState>,
): Promise<void> {
  for (let attempt = 0; attempt < 3; attempt += 1) {
    const loaded = await store.load().catch(() => null);
    const file: RegistryFile = loaded?.data ?? { version: 1, sources: {} };
    const current = file.sources[sourceId];
    if (!current) return;
    const next: RegistryFile = {
      version: 1,
      sources: { ...file.sources, [sourceId]: { ...current, ...updates, checkLockAt: null } },
    };
    try {
      await store.save(next, loaded ? { ifGenerationMatch: loaded.generation } : { ifGenerationMatch: "0" });
      return;
    } catch (error) {
      if (error instanceof GcsPreconditionFailed) continue;
      throw error;
    }
  }
}

const LOCK_MS = Number(process.env.WEB_WATCH_LOCK_SECONDS || 600) * 1000;

/** Is another check already running? A lock older than the configured
 *  lifetime belongs to a process that died, and is ignored rather than
 *  stranding the source forever. */
export function isLocked(state: WatchedSourceState, nowMs: number = Date.now()): boolean {
  if (!state.checkLockAt) return false;
  return nowMs - Date.parse(state.checkLockAt) < LOCK_MS;
}
