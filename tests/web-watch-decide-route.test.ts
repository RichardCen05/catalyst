import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import * as gcs from "@/lib/gcp/gcs";
import { companies, priceSeries } from "@/lib/data/fixtures";
import { emptyQueue, normalizeQueue, QUEUE_PATH, type ReviewQueue, type TriageMatch, type TriageProposal } from "@/lib/web-watch/queue";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { HYPOTHESES, relevanceHypothesis } from "@/lib/web-watch/hypotheses";
import type { MarketEvent, SymbolCode } from "@/lib/types";

vi.mock("@/lib/gcp/gcs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gcp/gcs")>()),
  gcsGetJson: vi.fn(),
  gcsPutJson: vi.fn(),
}));

const SECRET = "decide-secret";
const NOW = "2026-09-24T10:00:00.000Z";
const [A] = companies.map((c) => c.symbol) as [SymbolCode];

function event(id: string, publishedAt = NOW): MarketEvent {
  return {
    id,
    title: `Berita ${id}`,
    summary: "Ringkasan.",
    body: "Isi berita.",
    category: "company",
    sourceType: "macro",
    publishedAt,
    asOf: publishedAt,
    sector: "Market",
    impactLinks: [],
    citations: [{ id: "c", provider: "contoh.id", endpoint: "web-watch", field: "body", asOf: NOW, label: "Contoh", url: "https://x", urlLabel: "Buka sumber asal", access: "direct" }],
  };
}

const match: TriageMatch = { symbols: [A], matchedBy: [{ symbol: A, by: "symbol", term: A }], at: NOW };
const proposal: TriageProposal = {
  impacts: [{ symbol: A, direction: "Adverse", band: "high", path: `Harga naik → biaya ${A} naik → margin`, rationale: "Teks menyebut biaya." }],
  model: "test",
  verifiedAt: NOW,
};

function storedQueue(): ReviewQueue {
  const queue = normalizeQueue(structuredClone(emptyQueue));
  queue.pending = [event("web-a"), event("web-b"), event("web-c")];
  queue.matches = { "web-a": match, "web-b": match, "web-c": match };
  queue.proposals = { "web-a": proposal };
  return queue;
}

/** GCS by path: the queue file, the settings file, nothing else. */
function serve(settings: Record<string, unknown> | null, queue: ReviewQueue | null = storedQueue()) {
  vi.mocked(gcs.gcsGetJson).mockImplementation(async (_bucket: string, path: string) => {
    if (path === QUEUE_PATH) return queue ? { data: structuredClone(queue), generation: "7" } : null;
    if (path.endsWith("settings.json")) return settings ? { data: settings, generation: "1" } : null;
    return null;
  });
  vi.mocked(gcs.gcsPutJson).mockResolvedValue({ generation: "8" });
}

const request = (method: "GET" | "POST", body?: unknown, auth = `Bearer ${SECRET}`) =>
  new Request("http://localhost/api/internal/web-watch-decide", {
    method,
    headers: auth ? { authorization: auth } : {},
    ...(body === undefined ? {} : { body: typeof body === "string" ? body : JSON.stringify(body) }),
  });

const VERDICTS = [
  { candidateId: "web-a", verdict: "accept", reason: "bersih" },
  { candidateId: "web-b", verdict: "reject", check: "rumor", reason: "rumor: hanya sumber anonim", span: "kabarnya", score: 0.95 },
  { candidateId: "web-c", verdict: "residual", reason: "NLI ragu" },
];

const ENV_KEYS = ["WEB_WATCH_AUTO_DECIDE", "WEB_WATCH_AUTO_ACCEPT"];

beforeEach(() => {
  vi.resetAllMocks();
  vi.stubEnv("INTERNAL_CRON_SECRET", SECRET);
  for (const key of ENV_KEYS) vi.stubEnv(key, "");
});

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("/api/internal/web-watch-decide", () => {
  it("refuses GET and POST without the bearer, and reads nothing", async () => {
    serve({});
    const { GET, POST } = await import("@/app/api/internal/web-watch-decide/route");
    expect((await GET(request("GET", undefined, ""))).status).toBe(401);
    expect((await POST(request("POST", { verdicts: VERDICTS }, "Bearer wrong"))).status).toBe(401);
    expect(gcs.gcsGetJson).not.toHaveBeenCalled();
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });

  it("GET lists what the screen needs for each pending item", async () => {
    serve({});
    const { GET } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await GET(request("GET"))).json();
    expect(body.items).toHaveLength(3);
    expect(body.items[0]).toMatchObject({ id: "web-a", title: "Berita web-a", body: "Isi berita.", symbols: [A], hasProposal: true, noAuto: false });
    expect(body.items[1].hasProposal).toBe(false);
  });

  it("writes nothing while the switch is off", async () => {
    serve({ webWatchAutoDecide: false });
    const { POST } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await POST(request("POST", { verdicts: VERDICTS, apply: true }))).json();
    expect(body).toMatchObject({ applied: false, disabled: true });
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });

  it("dry-runs by default: reports counts and writes nothing", async () => {
    serve({});
    const { POST } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await POST(request("POST", { verdicts: VERDICTS }))).json();
    expect(body.applied).toBe(false);
    expect(body.report.counts).toEqual({ accepted: 1, rejected: 1, residual: 1, skipped: 0 });
    expect(body.report.rejected[0]).toMatchObject({ id: "web-b", title: "Berita web-b", why: "rumor: rumor: hanya sumber anonim" });
    expect(body.report.residual[0]).toMatchObject({ id: "web-c", why: "NLI ragu" });
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });

  it("applies through one guarded write", async () => {
    serve({});
    const { POST } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await POST(request("POST", { verdicts: VERDICTS, apply: true }))).json();
    expect(body.applied).toBe(true);
    expect(gcs.gcsPutJson).toHaveBeenCalledTimes(1);
    const [, path, written, options] = vi.mocked(gcs.gcsPutJson).mock.calls[0];
    expect(path).toBe(QUEUE_PATH);
    expect(options).toEqual({ ifGenerationMatch: "7" });
    const queue = written as ReviewQueue;
    expect(queue.pending.map((e) => e.id)).toEqual(["web-c"]);
    expect(queue.decided["web-a"].auto).toBeDefined();
    expect(queue.decided["web-b"]).toMatchObject({ status: "dismissed", autoReject: { check: "rumor", span: "kabarnya", score: 0.95 } });
    expect(queue.matches["web-c"].residual?.reason).toBe("NLI ragu");
    // The applied run is what Pantau and the assistant read as "the screen ran".
    expect(queue.lastScreenAt).toEqual(expect.any(String));
  });

  it("rejects an unknown verdict, a reject without a check, bad JSON, and too many verdicts", async () => {
    serve({});
    const { POST } = await import("@/app/api/internal/web-watch-decide/route");
    expect((await POST(request("POST", { verdicts: [{ candidateId: "web-a", verdict: "maybe", reason: "x" }] }))).status).toBe(400);
    expect((await POST(request("POST", { verdicts: [{ candidateId: "web-b", verdict: "reject", reason: "x" }] }))).status).toBe(400);
    expect((await POST(request("POST", "{not json"))).status).toBe(400);
    const many = Array.from({ length: 201 }, (_, i) => ({ candidateId: `web-${i}`, verdict: "residual", reason: "x" }));
    expect((await POST(request("POST", { verdicts: many }))).status).toBe(400);
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });

  it("an empty verdict list reports zeros", async () => {
    serve({});
    const { POST } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await POST(request("POST", { verdicts: [] }))).json();
    expect(body.report.counts).toEqual({ accepted: 0, rejected: 0, residual: 0, skipped: 0 });
  });

  it("rejects an item whose closing figure contradicts the recordings, over a posted accept", async () => {
    const [last] = Object.values(priceSeries).flatMap((rows) => rows.slice(-1));
    const [y, m, d] = last.date.split("-");
    const wrong = Math.round(last.ihsg * 1.2).toLocaleString("id-ID");
    const queue = storedQueue();
    queue.pending[0] = { ...queue.pending[0], body: `IHSG ditutup melemah ke level ${wrong} pada perdagangan (${Number(d)}/${Number(m)}/${y}).` };
    serve({}, queue);
    const { POST } = await import("@/app/api/internal/web-watch-decide/route");
    const dry = await (await POST(request("POST", { verdicts: VERDICTS }))).json();
    expect(dry.figures.counts.contradicted).toBe(1);
    expect(dry.figures.contradicted[0]).toMatchObject({ id: "web-a" });
    expect(dry.figures.contradicted[0].why[0]).toContain(wrong);
    expect(dry.report.counts).toEqual({ accepted: 0, rejected: 2, residual: 1, skipped: 0 });

    const body = await (await POST(request("POST", { verdicts: VERDICTS, apply: true }))).json();
    expect(body.applied).toBe(true);
    const written = vi.mocked(gcs.gcsPutJson).mock.calls[0][2] as ReviewQueue;
    expect(written.decided["web-a"]).toMatchObject({ status: "dismissed", autoReject: { check: "figure" } });
    expect(written.decided["web-a"].reason).toContain(wrong);
  });

  it("GET says where each headline came from, recognising old URL titles", async () => {
    const queue = storedQueue();
    queue.pending[0] = { ...queue.pending[0], titleSource: "body" } as ReviewQueue["pending"][number];
    queue.pending[1] = {
      ...queue.pending[1],
      title: "sp 2819226.aspx",
      citations: [{ ...queue.pending[1].citations[0], url: "https://www.bi.go.id/id/Pages/sp_2819226.aspx" }],
    };
    serve({}, queue);
    const { GET } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await GET(request("GET"))).json();
    expect(body.items.map((i: { titleSource: string | null }) => i.titleSource)).toEqual(["body", "url", null]);
  });

  it("GET hands the screen prose windows, rendered hypotheses, the source language and the thresholds", async () => {
    const t = resolveThresholds();
    const prose = "Perseroan menyampaikan laporan tahunan kepada bursa dan menjelaskan rencana belanja modal tahun depan.";
    const queue = storedQueue();
    queue.pending[0] = { ...queue.pending[0], body: `Beranda\nMenu\nKontak kami\n${prose}` };
    queue.pending[1] = { ...queue.pending[1], id: "web-src-eia-energy-abc", body: prose };
    queue.matches["web-src-eia-energy-abc"] = match;
    serve({}, queue);
    const { GET } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await GET(request("GET"))).json();
    const [first, english] = body.items;
    expect(first.windows).toEqual([{ text: prose, start: first.body.indexOf(prose) }]);
    expect(first.lang).toBe("id");
    expect(first.hypotheses).toMatchObject({ rumor: HYPOTHESES.rumor.id, official: HYPOTHESES.official.id, substance: HYPOTHESES.substance.id, title: "Berita web-a" });
    expect(first.hypotheses.relevance).toEqual([{ symbol: A, hypothesis: relevanceHypothesis(A, "id") }]);
    expect(english.lang).toBe("en");
    expect(english.hypotheses.rumor).toBe(HYPOTHESES.rumor.en);
    expect(body.thresholds).toEqual({
      decideMinConfidence: t.webWatchDecideMinConfidence,
      strictFloor: t.webWatchNliStrictFloor,
      calibrationMinLabels: t.webWatchCalibrationMinLabels,
      residualMaxShare: t.webWatchResidualMaxShare,
    });
  });

  it("GET leaves no title hypothesis for a headline cut from the address", async () => {
    const queue = storedQueue();
    queue.pending[0] = {
      ...queue.pending[0],
      title: "sp 2819226.aspx",
      citations: [{ ...queue.pending[0].citations[0], url: "https://www.bi.go.id/id/Pages/sp_2819226.aspx" }],
    };
    serve({}, queue);
    const { GET } = await import("@/app/api/internal/web-watch-decide/route");
    const body = await (await GET(request("GET"))).json();
    expect(body.items[0].hypotheses.title).toBeNull();
  });

  it("answers 500 and writes nothing when GCS is unavailable", async () => {
    vi.mocked(gcs.gcsGetJson).mockImplementation(async (_bucket: string, path: string) => {
      if (path === QUEUE_PATH) throw new Error("gcs down");
      return null;
    });
    const { POST } = await import("@/app/api/internal/web-watch-decide/route");
    const response = await POST(request("POST", { verdicts: VERDICTS, apply: true }));
    expect(response.status).toBe(500);
    expect(gcs.gcsPutJson).not.toHaveBeenCalled();
  });
});
