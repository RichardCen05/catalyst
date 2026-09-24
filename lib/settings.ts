/**
 * Runtime settings persisted in GCS — operator toggles the UI can flip
 * without a redeploy.
 *
 * Refresh gate tri-state for `SECTORS_REFRESH_ENABLED`:
 *   - `"true"`  → refresh forced ON (source `"env"`, UI toggle reports 409);
 *   - `"false"` → refresh forced OFF, operator kill-switch wins over the UI;
 *   - unset     → the GCS flag below decides (default off).
 *
 * Web-watch auto-accept gate, same tri-state for `WEB_WATCH_AUTO_ACCEPT`:
 * `"false"` is the operator kill-switch, `"true"` forces it on, unset lets
 * the Pantau switch decide (default off).
 *
 * Layout in the cache bucket (default `katalis-recorded`):
 *   `catalyst/config/settings.json` → `{ sectorsRefreshEnabled, webWatchAutoAccept, updatedAt }`
 */
import { gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";
const SETTINGS_PATH = "catalyst/config/settings.json";

export interface RuntimeSettings {
  sectorsRefreshEnabled: boolean;
  webWatchAutoAccept: boolean;
  updatedAt: string;
}

export type RefreshSource = "env" | "settings";

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const stored = await gcsGetJson<Partial<RuntimeSettings>>(BUCKET, SETTINGS_PATH).catch(() => null);
  return {
    sectorsRefreshEnabled: stored?.data?.sectorsRefreshEnabled === true,
    webWatchAutoAccept: stored?.data?.webWatchAutoAccept === true,
    updatedAt: typeof stored?.data?.updatedAt === "string" ? stored.data.updatedAt : "",
  };
}

/** Change one flag and keep the others as stored. A file written before a
 *  flag existed reads that flag as off. */
export async function saveRuntimeSettings(patch: Partial<Omit<RuntimeSettings, "updatedAt">>): Promise<RuntimeSettings> {
  const existing = await gcsGetJson<Partial<RuntimeSettings>>(BUCKET, SETTINGS_PATH).catch(() => null);
  const next: RuntimeSettings = {
    sectorsRefreshEnabled: patch.sectorsRefreshEnabled ?? existing?.data?.sectorsRefreshEnabled === true,
    webWatchAutoAccept: patch.webWatchAutoAccept ?? existing?.data?.webWatchAutoAccept === true,
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
  const settings = await getRuntimeSettings().catch(() => null);
  return { enabled: settings?.sectorsRefreshEnabled ?? false, source: "settings" };
}

/** True when the operator pinned the gate via env — the UI toggle must not pretend it can override it. */
export function isRefreshPinnedByEnv(): boolean {
  return process.env.SECTORS_REFRESH_ENABLED === "true" || process.env.SECTORS_REFRESH_ENABLED === "false";
}

/** Resolve whether web-watch may accept verified proposals without a person.
 *  GCS-unreachable reads fail closed (off). */
export async function isAutoAcceptEnabled(): Promise<{ enabled: boolean; source: RefreshSource }> {
  const env = process.env.WEB_WATCH_AUTO_ACCEPT;
  if (env === "true") return { enabled: true, source: "env" };
  if (env === "false") return { enabled: false, source: "env" };
  const settings = await getRuntimeSettings().catch(() => null);
  return { enabled: settings?.webWatchAutoAccept ?? false, source: "settings" };
}

export function isAutoAcceptPinnedByEnv(): boolean {
  return process.env.WEB_WATCH_AUTO_ACCEPT === "true" || process.env.WEB_WATCH_AUTO_ACCEPT === "false";
}
