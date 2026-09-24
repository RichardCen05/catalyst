import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gcs from "@/lib/gcp/gcs";
import { getRuntimeSettings, isAutoAcceptEnabled, isRefreshEnabled, isRefreshPinnedByEnv, saveRuntimeSettings } from "@/lib/settings";
import { planRefresh } from "@/lib/data/sectors-refresh";

vi.mock("@/lib/gcp/gcs", () => ({
  gcsGetJson: vi.fn(),
  gcsPutJson: vi.fn(),
}));

const ENV_KEY = "SECTORS_REFRESH_ENABLED";
// Snapshot at import time so parallel test files cannot leak env into each other.
const savedEnv = process.env[ENV_KEY];

beforeEach(() => {
  vi.resetAllMocks();
  if (savedEnv === undefined) delete process.env[ENV_KEY];
  else process.env[ENV_KEY] = savedEnv;
});

describe("isRefreshPinnedByEnv", () => {
  it("is true only for explicit true/false", () => {
    process.env[ENV_KEY] = "true";
    expect(isRefreshPinnedByEnv()).toBe(true);
    process.env[ENV_KEY] = "false";
    expect(isRefreshPinnedByEnv()).toBe(true);
    delete process.env[ENV_KEY];
    expect(isRefreshPinnedByEnv()).toBe(false);
  });
});

describe("isRefreshEnabled", () => {
  it("env true forces on without touching GCS", async () => {
    process.env[ENV_KEY] = "true";
    await expect(isRefreshEnabled()).resolves.toEqual({ enabled: true, source: "env" });
    expect(gcs.gcsGetJson).not.toHaveBeenCalled();
  });

  it("env false forces off without touching GCS", async () => {
    process.env[ENV_KEY] = "false";
    await expect(isRefreshEnabled()).resolves.toEqual({ enabled: false, source: "env" });
    expect(gcs.gcsGetJson).not.toHaveBeenCalled();
  });

  it("unset env follows the GCS flag, default off", async () => {
    delete process.env[ENV_KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce({ data: { sectorsRefreshEnabled: true, updatedAt: "t" }, generation: "1" });
    await expect(isRefreshEnabled()).resolves.toEqual({ enabled: true, source: "settings" });
    expect(gcs.gcsGetJson).toHaveBeenCalledWith("katalis-recorded", "catalyst/config/settings.json");
  });

  it("fails closed when GCS is unreachable", async () => {
    delete process.env[ENV_KEY];
    vi.mocked(gcs.gcsGetJson).mockRejectedValueOnce(new Error("network"));
    await expect(isRefreshEnabled()).resolves.toEqual({ enabled: false, source: "settings" });
  });
});

describe("getRuntimeSettings / saveRuntimeSettings", () => {
  it("returns defaults on a 404", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce(null);
    await expect(getRuntimeSettings()).resolves.toEqual({ sectorsRefreshEnabled: false, webWatchAutoAccept: false, updatedAt: "" });
  });

  it("changing one flag keeps the other as stored", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce({ data: { sectorsRefreshEnabled: true, updatedAt: "t" }, generation: "3" });
    vi.mocked(gcs.gcsPutJson).mockResolvedValueOnce({ generation: "4" });
    const saved = await saveRuntimeSettings({ webWatchAutoAccept: true });
    expect(saved).toMatchObject({ sectorsRefreshEnabled: true, webWatchAutoAccept: true });
    expect(gcs.gcsPutJson).toHaveBeenCalledWith("katalis-recorded", "catalyst/config/settings.json", saved, { ifGenerationMatch: "3" });
  });

  it("writes with a create precondition on first save", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce(null);
    vi.mocked(gcs.gcsPutJson).mockResolvedValueOnce({ generation: "7" });
    const saved = await saveRuntimeSettings({ sectorsRefreshEnabled: true });
    expect(saved.sectorsRefreshEnabled).toBe(true);
    expect(gcs.gcsPutJson).toHaveBeenCalledWith(
      "katalis-recorded",
      "catalyst/config/settings.json",
      saved,
      { ifGenerationMatch: "0" },
    );
  });
});

describe("isAutoAcceptEnabled", () => {
  const KEY = "WEB_WATCH_AUTO_ACCEPT";
  const saved = process.env[KEY];
  const reset = () => {
    if (saved === undefined) delete process.env[KEY];
    else process.env[KEY] = saved;
  };

  it("is off by default, including a file written before the flag existed", async () => {
    delete process.env[KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce({ data: { sectorsRefreshEnabled: true, updatedAt: "t" }, generation: "1" });
    await expect(isAutoAcceptEnabled()).resolves.toEqual({ enabled: false, source: "settings" });
    reset();
  });

  it("follows the stored flag, and the env kill-switch wins", async () => {
    delete process.env[KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce({ data: { webWatchAutoAccept: true, updatedAt: "t" }, generation: "1" });
    await expect(isAutoAcceptEnabled()).resolves.toEqual({ enabled: true, source: "settings" });
    process.env[KEY] = "false";
    await expect(isAutoAcceptEnabled()).resolves.toEqual({ enabled: false, source: "env" });
    reset();
  });

  it("fails closed when GCS is unreachable", async () => {
    delete process.env[KEY];
    vi.mocked(gcs.gcsGetJson).mockRejectedValueOnce(new Error("network"));
    await expect(isAutoAcceptEnabled()).resolves.toEqual({ enabled: false, source: "settings" });
    reset();
  });
});

describe("planRefresh", () => {
  it("plans the six recorded symbols at 18 credits and rejects the rest", () => {
    const { symbols, rejected, plans, estimatedCost } = planRefresh(["antm", "FOO", "goto"]);
    expect(symbols).toEqual(["ANTM", "GOTO"]);
    expect(rejected).toEqual(["FOO"]);
    expect(plans).toHaveLength(2);
    expect(planRefresh().estimatedCost).toBe(18);
    expect(estimatedCost).toBe(6);
  });
});

describe("settings refresh API", () => {
  it("GET reports gate state and zero-spend plan", async () => {
    delete process.env[ENV_KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({ data: { sectorsRefreshEnabled: true, updatedAt: "t" }, generation: "1" });
    const { GET } = await import("@/app/api/settings/refresh/route");
    const response = await GET();
    const body = (await response.json()) as Record<string, unknown>;
    expect(body).toMatchObject({ enabled: true, source: "settings", estimatedCost: 18, budget: 25 });
    expect(body).toHaveProperty("plans");
  });

  it("POST toggle persists the flag and POST run dry-run plans without spend", async () => {
    delete process.env[ENV_KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({ data: {}, generation: "1" });
    vi.mocked(gcs.gcsPutJson).mockResolvedValue({ generation: "2" });
    const { POST } = await import("@/app/api/settings/refresh/route");
    const toggled = await POST(new Request("http://localhost/api/settings/refresh", {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    }));
    expect(await toggled.json()).toMatchObject({ enabled: true, source: "settings" });

    // The mocked PUT does not change the mocked GET — simulate the stored flag.
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({ data: { sectorsRefreshEnabled: true }, generation: "2" });
    const preview = await POST(new Request("http://localhost/api/settings/refresh", {
      method: "POST",
      body: JSON.stringify({ run: true }),
    }));
    const previewBody = (await preview.json()) as Record<string, unknown>;
    expect(previewBody).toMatchObject({ dryRun: true, estimatedCost: 18 });
  });

  it("POST toggle returns 409 when pinned by env", async () => {
    process.env[ENV_KEY] = "false";
    const { POST } = await import("@/app/api/settings/refresh/route");
    const response = await POST(new Request("http://localhost/api/settings/refresh", {
      method: "POST",
      body: JSON.stringify({ enabled: true }),
    }));
    expect(response.status).toBe(409);
  });

  it("POST run refuses live execution while the gate is off", async () => {
    delete process.env[ENV_KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({ data: { sectorsRefreshEnabled: false }, generation: "1" });
    const { POST } = await import("@/app/api/settings/refresh/route");
    const response = await POST(new Request("http://localhost/api/settings/refresh", {
      method: "POST",
      body: JSON.stringify({ run: true, dryRun: false }),
    }));
    expect(response.status).toBe(403);
  });
});
