/**
 * Runtime settings persisted in GCS — operator toggles the UI can flip
 * without a redeploy.
 *
 * Refresh gate tri-state for `SECTORS_REFRESH_ENABLED`:
 *   - `"true"`  → refresh forced ON (source `"env"`, UI toggle reports 409);
 *   - `"false"` → refresh forced OFF, operator kill-switch wins over the UI;
 *   - unset     → the GCS flag below decides (default off).
 *
 * Web-watch auto-decide gate (accept and reject without a person), same
 * tri-state for `WEB_WATCH_AUTO_DECIDE`: `"false"` is the operator
 * kill-switch, `"true"` forces it on, unset lets the Pantau switch decide.
 * It replaced the auto-accept gate, so the older `WEB_WATCH_AUTO_ACCEPT` env
 * and `webWatchAutoAccept` flag still count when the new ones are absent.
 * Unlike refresh it defaults ON: only an explicit `false` (someone switched
 * it off) turns it off, so a file written before either flag existed, or
 * none at all, means deciding.
 *
 * Layout in the cache bucket (default `katalis-recorded`):
 *   `catalyst/config/settings.json` → `{ sectorsRefreshEnabled, webWatchAutoAccept, webWatchAutoDecide?, updatedAt }`
 */
import { gcsGetJson, gcsPutJson } from "@/lib/gcp/gcs";

const BUCKET = process.env.GCS_CACHE_BUCKET || "katalis-recorded";
const SETTINGS_PATH = "catalyst/config/settings.json";

export interface RuntimeSettings {
  sectorsRefreshEnabled: boolean;
  /** Older auto-accept flag. Read as the fallback for `webWatchAutoDecide`;
   *  no longer written by the Pantau switch. */
  webWatchAutoAccept: boolean;
  /** The auto-decide switch. Absent in files written before it existed. */
  webWatchAutoDecide?: boolean;
  updatedAt: string;
}

export type RefreshSource = "env" | "settings";

export async function getRuntimeSettings(): Promise<RuntimeSettings> {
  const stored = await gcsGetJson<Partial<RuntimeSettings>>(BUCKET, SETTINGS_PATH).catch(() => null);
  return {
    sectorsRefreshEnabled: stored?.data?.sectorsRefreshEnabled === true,
    webWatchAutoAccept: stored?.data?.webWatchAutoAccept !== false,
    ...(typeof stored?.data?.webWatchAutoDecide === "boolean" ? { webWatchAutoDecide: stored.data.webWatchAutoDecide } : {}),
    updatedAt: typeof stored?.data?.updatedAt === "string" ? stored.data.updatedAt : "",
  };
}

/** Change one flag and keep the others as stored. A file written before a
 *  flag existed reads that flag at its default. */
export async function saveRuntimeSettings(patch: Partial<Omit<RuntimeSettings, "updatedAt">>): Promise<RuntimeSettings> {
  const existing = await gcsGetJson<Partial<RuntimeSettings>>(BUCKET, SETTINGS_PATH).catch(() => null);
  const decide = patch.webWatchAutoDecide ?? existing?.data?.webWatchAutoDecide;
  const next: RuntimeSettings = {
    sectorsRefreshEnabled: patch.sectorsRefreshEnabled ?? existing?.data?.sectorsRefreshEnabled === true,
    webWatchAutoAccept: patch.webWatchAutoAccept ?? existing?.data?.webWatchAutoAccept !== false,
    ...(typeof decide === "boolean" ? { webWatchAutoDecide: decide } : {}),
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

const flag = (value: string | undefined): boolean | null => (value === "true" ? true : value === "false" ? false : null);

/**
 * Resolve whether web-watch may accept or reject pending items without a
 * person. Order: `WEB_WATCH_AUTO_DECIDE`, then the older
 * `WEB_WATCH_AUTO_ACCEPT` (an operator pin wins over any stored flag), then
 * the stored `webWatchAutoDecide`, then the stored `webWatchAutoAccept`, then
 * on. An unreadable settings file reads as the default too: the decide route
 * that would act on it writes to the same bucket, so if GCS is down nothing
 * is decided either way.
 */
export async function isAutoDecideEnabled(): Promise<{ enabled: boolean; source: RefreshSource }> {
  const env = flag(process.env.WEB_WATCH_AUTO_DECIDE) ?? flag(process.env.WEB_WATCH_AUTO_ACCEPT);
  if (env !== null) return { enabled: env, source: "env" };
  const settings = await getRuntimeSettings().catch(() => null);
  return { enabled: settings?.webWatchAutoDecide ?? settings?.webWatchAutoAccept ?? true, source: "settings" };
}

/** True when either env pins the gate; the Pantau switch cannot override it. */
export function isAutoDecidePinnedByEnv(): boolean {
  return flag(process.env.WEB_WATCH_AUTO_DECIDE) !== null || flag(process.env.WEB_WATCH_AUTO_ACCEPT) !== null;
}
