import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { planFor, planRefresh, refreshWindow, REFRESH_WINDOW_DAYS, TOP_BROKERS } from "@/lib/data/sectors-refresh";
import { RECORDED_SYMBOLS } from "@/lib/data/sectors-refresh";

/**
 * The refresh planner spends a non-refillable grant, so the exact endpoint,
 * its parameters and its credit price are all worth locking down. A live run
 * on 2026-09-17 answered `Sectors API 400 on /v2/broker-summary/ANTM/`: the
 * planner was calling the per-broker daily endpoint with a `top=1` parameter
 * that endpoint does not accept, while the recordings in `data/sectors/` and
 * `scripts/build_market_data.py` both read the ranked top-buyers shape from
 * `/v2/broker-summary/{symbol}/top/`.
 */

describe("planFor", () => {
  it("names the ranked top-buyers endpoint, not per-broker daily rows", () => {
    const plan = planFor("ANTM");

    expect(plan.calls.map((call) => call.path)).toEqual([
      "/v2/broker-summary/ANTM/top/",
      "/v2/foreign-flow/ANTM/",
    ]);
  });

  it("prices the two calls as the Sectors reference states", () => {
    const plan = planFor("BBCA");

    expect(plan.calls).toEqual([
      { path: "/v2/broker-summary/BBCA/top/", cost: 2 },
      { path: "/v2/foreign-flow/BBCA/", cost: 1 },
    ]);
  });

  it("estimates the full six-symbol run at eighteen credits", () => {
    const { symbols, estimatedCost, rejected } = planRefresh();

    // The recorded set comes from the generated bundle, so the plan covers
    // whatever was recorded rather than a list typed into the test.
    expect(symbols).toEqual([...RECORDED_SYMBOLS]);
    expect(estimatedCost).toBe(18);
    expect(rejected).toEqual([]);
  });

  it("refuses symbols outside the recorded set, so a typo cannot spend credit", () => {
    const { symbols, rejected } = planRefresh(["ANTM", "PTBA", "NOTREAL"]);

    expect(symbols).toEqual(["ANTM"]);
    expect(rejected).toEqual(["PTBA", "NOTREAL"]);
  });
});

describe("refreshWindow", () => {
  const NOW = new Date("2026-09-17T00:00:00.000Z");

  it("asks for the ninety days the recordings span, not the thirty-day default", () => {
    expect(refreshWindow(NOW)).toEqual({ start: "2026-06-19", end: "2026-09-17" });
    expect(REFRESH_WINDOW_DAYS).toBe(90);
    // The recordings carry ten ranked buyers and ten sellers; the API default
    // is also ten, but asking makes the recording reproducible.
    expect(TOP_BROKERS).toBe(10);
  });
});

describe("fetchSectors error reporting", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  it("carries the API's own reason instead of a bare status", async () => {
    vi.doMock("@/lib/gcp/gcs", () => ({
      gcsGetJson: vi.fn().mockResolvedValue(null),
      gcsPutJson: vi.fn().mockResolvedValue({ generation: "1" }),
      GcsPreconditionFailed: class extends Error {},
    }));
    vi.stubGlobal("fetch", vi.fn().mockResolvedValue({
      ok: false,
      status: 400,
      text: async () => '{"detail":"Invalid query parameter: top"}',
    }));

    const { fetchSectors } = await import("@/lib/data/sectors-client");
    await expect(
      fetchSectors("/v2/broker-summary/ANTM/", {}, { ttl: "broker", cost: 2, apiKey: "k" }),
    ).rejects.toThrow(/400 on \/v2\/broker-summary\/ANTM\/: .*Invalid query parameter/);

    vi.unstubAllGlobals();
  });
});
