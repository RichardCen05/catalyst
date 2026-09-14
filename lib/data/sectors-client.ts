/**
 * Cache-first Sectors API client.
 *
 * Wired ONLY through `POST /api/internal/refresh-sectors`, which is
 * flag-gated (`SECTORS_REFRESH_ENABLED=true`), key-required, Bearer-guarded,
 * dry-run by default, and bounded to already-recorded symbols. The app still
 * serves entirely from the bundled `lib/data/market.generated.ts`; refresh
 * output lands in GCS for human review + regen, never overwriting the bundle
 * at runtime. Sectors credit is a non-renewable grant — the ledger, daily
 * budget, and rate limiter below are the guardrails, not suggestions.
 *
 * Order: in-process memory -> GCS (`katalis-recorded`, reused rather than a
 * new bucket) -> live Sectors API, only on a cache miss and only if the
 * daily ledger has budget left.
 */
import { companies } from "@/lib/data/fixtures";
import { gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";
const DAILY_BUDGET = Number(process.env.SECTORS_DAILY_BUDGET || 25);
const RATE_WINDOW_MS = 30_000;
const RATE_LIMIT = 25;
const MIN_CALL_SPACING_MS = 1_500;

export type TtlClass = "forever" | "identity" | "daily" | "broker" | "news";

const TTL_MS: Record<TtlClass, number> = {
  forever: Infinity,
  identity: 30 * 24 * 60 * 60 * 1000,
  daily: 18 * 60 * 60 * 1000,
  broker: 24 * 60 * 60 * 1000,
  news: 30 * 60 * 1000,
};

const processCache = new Map<string, { value: unknown; expiresAt: number }>();
const recentCallTimestamps: number[] = [];
let lastCallAt = 0;

function cacheKey(path: string, params: Record<string, string | number | undefined>): string {
  const sorted = Object.entries(params).filter(([, v]) => v !== undefined).sort(([a], [b]) => a.localeCompare(b));
  return `${path}?${sorted.map(([k, v]) => `${k}=${v}`).join("&")}`;
}

export function isKnownSymbol(symbol: string): boolean {
  return companies.some((company) => company.symbol === symbol.toUpperCase());
}

async function ledgerPath(date: string): Promise<string> {
  return `catalyst/_ledger/${date}.jsonl`;
}

async function todaySpend(date: string): Promise<number> {
  const existing = await gcsGetJson<string>(BUCKET, await ledgerPath(date)).catch(() => null);
  if (!existing) return 0;
  const text = typeof existing.data === "string" ? existing.data : "";
  return text.split("\n").filter(Boolean).reduce((sum, line) => {
    try {
      return sum + (JSON.parse(line).cost ?? 0);
    } catch {
      return sum;
    }
  }, 0);
}

async function appendLedger(date: string, entry: { path: string; cost: number; at: string }): Promise<void> {
  const key = await ledgerPath(date);
  const existing = await gcsGetJson<string>(BUCKET, key).catch(() => null);
  const text = (typeof existing?.data === "string" ? existing.data : "") + `${JSON.stringify(entry)}\n`;
  await gcsPutJson(BUCKET, key, text, existing ? { ifGenerationMatch: existing.generation } : { ifGenerationMatch: "0" });
}

function enforceRateLimit(): void {
  const now = Date.now();
  while (recentCallTimestamps.length && now - recentCallTimestamps[0] > RATE_WINDOW_MS) recentCallTimestamps.shift();
  if (recentCallTimestamps.length >= RATE_LIMIT) throw new Error("Sectors rate limit reached (25 calls / 30s)");
  if (now - lastCallAt < MIN_CALL_SPACING_MS) throw new Error("Sectors call spacing violated (min 1.5s)");
}

export class BudgetExceededError extends Error {
  constructor() {
    super("Sectors daily credit budget reached — serving stale cache instead");
  }
}

/**
 * Cache-first fetch. `cost` is the credit price of this exact call (see
 * research/docs/api for the table — defaults matter, e.g. an unfiltered
 * `sections` param can be 8x a scoped one).
 */
export async function fetchSectors<T>(
  path: string,
  params: Record<string, string | number | undefined>,
  options: { ttl: TtlClass; cost: number; apiKey: string },
): Promise<{ data: T; source: "memory" | "gcs" | "live" }> {
  const key = cacheKey(path, params);
  const now = Date.now();

  const inMemory = processCache.get(key);
  if (inMemory && inMemory.expiresAt > now) return { data: inMemory.value as T, source: "memory" };

  const cached = await gcsGetJson<{ value: T; cachedAt: number }>(BUCKET, `catalyst/sectors/${encodeURIComponent(key)}.json`).catch(() => null);
  const ttlMs = TTL_MS[options.ttl];
  if (cached && now - cached.data.cachedAt < ttlMs) {
    processCache.set(key, { value: cached.data.value, expiresAt: now + Math.min(ttlMs, 5 * 60 * 1000) });
    return { data: cached.data.value, source: "gcs" };
  }

  const date = new Date().toISOString().slice(0, 10);
  const spent = await todaySpend(date);
  if (spent + options.cost > DAILY_BUDGET) {
    if (cached) return { data: cached.data.value, source: "gcs" };
    throw new BudgetExceededError();
  }

  enforceRateLimit();
  const url = new URL(`https://api.sectors.app${path}`);
  Object.entries(params).forEach(([k, v]) => { if (v !== undefined) url.searchParams.set(k, String(v)); });
  recentCallTimestamps.push(now);
  lastCallAt = now;
  const response = await fetch(url, { headers: { Authorization: options.apiKey } });
  if (!response.ok) throw new Error(`Sectors API ${response.status} on ${path}`);
  const data = (await response.json()) as T;

  await appendLedger(date, { path, cost: options.cost, at: new Date().toISOString() });
  await gcsPutJson(BUCKET, `catalyst/sectors/${encodeURIComponent(key)}.json`, { value: data, cachedAt: now });
  processCache.set(key, { value: data, expiresAt: now + Math.min(ttlMs, 5 * 60 * 1000) });
  return { data, source: "live" };
}
