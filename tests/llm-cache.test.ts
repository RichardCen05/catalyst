import { describe, expect, it, vi } from "vitest";
import * as gcs from "@/lib/gcp/gcs";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";

vi.mock("@/lib/gcp/gcs", () => ({
  gcsGetJson: vi.fn(),
  gcsPutJson: vi.fn(),
}));

describe("cacheKeyFor", () => {
  it("is a stable sha256 of its parts, order-sensitive", () => {
    const a = cacheKeyFor(["ANTM", "mandate-hash-1"]);
    const b = cacheKeyFor(["ANTM", "mandate-hash-1"]);
    const c = cacheKeyFor(["mandate-hash-1", "ANTM"]);
    expect(a).toBe(b);
    expect(a).not.toBe(c);
    expect(a).toMatch(/^[0-9a-f]{64}$/);
  });
});

describe("getCached / setCached", () => {
  it("returns null on a cache miss without throwing", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce(null);
    expect(await getCached("some-key")).toBeNull();
  });

  it("returns null (not throw) if GCS is unreachable", async () => {
    vi.mocked(gcs.gcsGetJson).mockRejectedValueOnce(new Error("network"));
    expect(await getCached("some-key")).toBeNull();
  });

  it("returns the cached value on a hit", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValueOnce({ data: { hello: "world" }, generation: "1" });
    expect(await getCached("some-key")).toEqual({ hello: "world" });
  });

  it("writes through gcsPutJson and swallows write failures", async () => {
    vi.mocked(gcs.gcsPutJson).mockRejectedValueOnce(new Error("network"));
    await expect(setCached("some-key", { hello: "world" })).resolves.toBeUndefined();
    expect(gcs.gcsPutJson).toHaveBeenCalledWith("katalis-recorded", "catalyst/llm/some-key.json", { hello: "world" });
  });
});
