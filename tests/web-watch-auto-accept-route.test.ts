import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gcs from "@/lib/gcp/gcs";

vi.mock("@/lib/gcp/gcs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gcp/gcs")>()),
  gcsGetJson: vi.fn(),
  gcsPutJson: vi.fn(),
}));

const KEY = "WEB_WATCH_AUTO_ACCEPT";
const savedEnv = process.env[KEY];

beforeEach(() => {
  vi.resetAllMocks();
  if (savedEnv === undefined) delete process.env[KEY];
  else process.env[KEY] = savedEnv;
});

const post = (body: unknown) =>
  new Request("http://localhost/api/web-watch", { method: "POST", body: JSON.stringify(body) });

describe("web-watch API auto-accept actions", () => {
  it("set-auto-accept stores the flag and keeps the refresh flag", async () => {
    delete process.env[KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({ data: { sectorsRefreshEnabled: true, updatedAt: "t" }, generation: "5" });
    vi.mocked(gcs.gcsPutJson).mockResolvedValue({ generation: "6" });
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(post({ action: "set-auto-accept", enabled: true }));
    expect(await response.json()).toMatchObject({ ok: true, enabled: true });
    expect(vi.mocked(gcs.gcsPutJson).mock.calls[0][2]).toMatchObject({ sectorsRefreshEnabled: true, webWatchAutoAccept: true });
  });

  it("set-auto-accept answers 409 when the operator pinned it", async () => {
    process.env[KEY] = "false";
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(post({ action: "set-auto-accept", enabled: true }));
    expect(response.status).toBe(409);
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });

  it("revert-auto refuses an item that was not auto-accepted", async () => {
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({
      data: { pending: [], accepted: [], decided: { x: { candidateId: "x", status: "accepted", decidedAt: "t", reason: "" } } },
      generation: "1",
    });
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(post({ action: "revert-auto", candidateId: "x" }));
    expect(response.status).toBe(422);
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });
});
