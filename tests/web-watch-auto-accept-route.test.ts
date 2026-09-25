import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gcs from "@/lib/gcp/gcs";

vi.mock("@/lib/gcp/gcs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gcp/gcs")>()),
  gcsGetJson: vi.fn(),
  gcsPutJson: vi.fn(),
}));

const KEY = "WEB_WATCH_AUTO_ACCEPT";
const DECIDE_KEY = "WEB_WATCH_AUTO_DECIDE";
const savedEnv = process.env[KEY];
const savedDecide = process.env[DECIDE_KEY];

beforeEach(() => {
  vi.resetAllMocks();
  if (savedEnv === undefined) delete process.env[KEY];
  else process.env[KEY] = savedEnv;
  if (savedDecide === undefined) delete process.env[DECIDE_KEY];
  else process.env[DECIDE_KEY] = savedDecide;
});

const post = (body: unknown) =>
  new Request("http://localhost/api/web-watch", { method: "POST", body: JSON.stringify(body) });

describe("web-watch API auto-accept actions", () => {
  it("set-auto-accept stores the auto-decide flag and keeps the others", async () => {
    delete process.env[KEY];
    delete process.env[DECIDE_KEY];
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({ data: { sectorsRefreshEnabled: true, updatedAt: "t" }, generation: "5" });
    vi.mocked(gcs.gcsPutJson).mockResolvedValue({ generation: "6" });
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(post({ action: "set-auto-accept", enabled: false }));
    expect(await response.json()).toMatchObject({ ok: true, enabled: false });
    expect(vi.mocked(gcs.gcsPutJson).mock.calls[0][2]).toMatchObject({ sectorsRefreshEnabled: true, webWatchAutoAccept: true, webWatchAutoDecide: false });
  });

  it("set-auto-accept answers 409 when the operator pinned it", async () => {
    process.env[KEY] = "false";
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(post({ action: "set-auto-accept", enabled: true }));
    expect(response.status).toBe(409);
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });

  it("restore is no longer an action: archiving is final", async () => {
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(post({ action: "restore", candidateId: "x" }));
    expect(response.status).toBe(400);
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

  it("GET separates residual items and lists auto rejects without an action", async () => {
    const citation = { id: "c", provider: "contoh.id", endpoint: "web-watch", field: "body", asOf: "t", label: "Contoh", url: "https://x/r", urlLabel: "Buka", access: "direct" };
    const pendingEvent = (id: string) => ({ id, title: `Judul ${id}`, summary: "s", category: "company", sourceType: "macro", publishedAt: "2026-09-24T00:00:00.000Z", asOf: "t", sector: "Market", impactLinks: [], citations: [citation] });
    vi.mocked(gcs.gcsGetJson).mockImplementation(async (_bucket: string, path: string) => {
      if (!path.includes("queue")) return null;
      return {
        data: {
          pending: [pendingEvent("r1"), pendingEvent("u1")],
          accepted: [],
          matches: { r1: { symbols: [], matchedBy: [], at: "t", residual: { at: "2026-09-24T15:00:00.000Z", reason: "NLI ragu: relevansi" } }, u1: { symbols: [], matchedBy: [], at: "t" } },
          decided: {
            x1: { candidateId: "x1", status: "dismissed", decidedAt: "2026-09-24T15:00:00.000Z", reason: "rumor", autoReject: { check: "rumor", span: "kabarnya", score: 0.98, at: "2026-09-24T15:00:00.000Z", title: "Judul x1", url: "https://x/1" } },
            h1: { candidateId: "h1", status: "dismissed", decidedAt: "2026-09-24T14:00:00.000Z", reason: "manual" },
          },
        },
        generation: "1",
      };
    });
    const { GET } = await import("@/app/api/web-watch/route");
    const body = await (await GET()).json();
    expect(body.residual).toEqual([{ id: "r1", reason: "NLI ragu: relevansi", at: "2026-09-24T15:00:00.000Z" }]);
    expect(body.autoRejected).toEqual([
      { id: "x1", title: "Judul x1", url: "https://x/1", decidedAt: "2026-09-24T15:00:00.000Z", check: "rumor", span: "kabarnya", score: 0.98, reason: "rumor" },
    ]);
    expect(body.pending.map((e: { id: string }) => e.id)).toEqual(["r1", "u1"]);
  });

  it("a person's dismiss of a residual item is saved as a calibration label", async () => {
    const citation = { id: "c", provider: "contoh.id", endpoint: "web-watch", field: "body", asOf: "t", label: "Contoh", url: "https://x/r", urlLabel: "Buka", access: "direct" };
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({
      data: {
        pending: [{ id: "r1", title: "Judul", summary: "s", category: "company", sourceType: "macro", publishedAt: "t", asOf: "t", sector: "Market", impactLinks: [], citations: [citation] }],
        accepted: [],
        matches: { r1: { symbols: [], matchedBy: [], at: "t", residual: { at: "t", reason: "NLI ragu" } } },
        decided: {},
      },
      generation: "1",
    });
    vi.mocked(gcs.gcsPutJson).mockResolvedValue({ generation: "2" });
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(post({ action: "dismiss", candidateId: "r1", reason: "Bukan berita pasar sama sekali." }));
    expect(response.status).toBe(200);
    const saved = vi.mocked(gcs.gcsPutJson).mock.calls[0][2] as { decided: Record<string, { fromResidual?: boolean; status: string }> };
    expect(saved.decided.r1).toMatchObject({ status: "dismissed", fromResidual: true });
  });
});
