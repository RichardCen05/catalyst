/**
 * Runtime settings persisted in GCS — operator toggles the UI can flip
 * without a redeploy.
 *
 * Refresh gate tri-state for `SECTORS_REFRESH_ENABLED`:
 *   - `"true"`  → refresh forced ON (source `"env"`, UI toggle reports 409);
 *   - `"false"` → refresh forced OFF, operator kill-switch wins over the UI;
 *   - unset     → the GCS flag below decides (default off).
 *
 * Layout in the cache bucket (default `katalis-recorded`):
 *   `catalyst/config/settings.json` → `{ sectorsRefreshEnabled, updatedAt }`
 */
import { gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";
const SETTINGS_PATH = "catalyst/config/settings.json";

export interface RuntimeSettings {
  sectorsRefreshEnabled: boolean;
  updatedAt: string;
}

export type RefreshSource = "env" | "settings";

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const stored = await gcsGetJson<Partial<RuntimeSettings>>(BUCKET, SETTINGS_PATH).catch(() => null);
  return {
    sectorsRefreshEnabled: stored?.data?.sectorsRefreshEnabled === true,
    updatedAt: typeof stored?.data?.updatedAt === "string" ? stored.data.updatedAt : "",
  };
}

export async function saveRuntimeSettings(patch: { sectorsRefreshEnabled: boolean }): Promise<RuntimeSettings> {
  const existing = await gcsGetJson<Partial<RuntimeSettings>>(BUCKET, SETTINGS_PATH).catch(() => null);
  const next: RuntimeSettings = {
    sectorsRefreshEnabled: patch.sectorsRefreshEnabled,
    updatedAt: new Date().toISOString(),
  };
  await gcsPutJson(BUCKET, SETTINGS_PATH, next, existing ? { ifGenerationMatch: existing.generation } : { ifGenerationMatch: "0" });
  return next;
}

/** Resolve whether a Sectors refresh may run. GCS-unreachable reads fail closed (off). */
export async function isRefreshEnabled(): Promise<{ enabled: boolean; source: RefreshSource }> {
  const env = process.env.SECTORS_REFRESH_ENABLED;
  if (env === "true") return { enabled: true, source: "env" };
  if (env === "false") return { enabled: false, source: "env" };
  const settings = await getRuntimeSettings().catch(() => ({ sectorsRefreshEnabled: false, updatedAt: "" }));
  return { enabled: settings.sectorsRefreshEnabled, source: "settings" };
}

/** True when the operator pinned the gate via env — the UI toggle must not pretend it can override it. */
export function isRefreshPinnedByEnv(): boolean {
  return process.env.SECTORS_REFRESH_ENABLED === "true" || process.env.SECTORS_REFRESH_ENABLED === "false";
}
