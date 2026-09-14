import { describe, expect, it } from "vitest";
import {
  BAND_SCORE,
  decide,
  emptyQueue,
  enqueue,
  getOverlayEvents,
  memoryQueueStore,
  saveQueue,
  setOverlayForTests,
  type ReviewQueue,
} from "@/lib/web-watch/queue";
import { fixtureMarketDataProvider, fixtureNewsProvider } from "@/lib/data/providers";
import type { MarketEvent } from "@/lib/types";

function candidate(id: string): MarketEvent {
  return {
    id,
    title: `Kandidat ${id}`,
    summary: "Ringkasan kandidat dari pantauan web.",
    body: "Isi lengkap kandidat dari pantauan web untuk sitasi.",
    category: "policy",
    sourceType: "policy",
    publishedAt: "2026-09-14T00:00:00.000Z",
    asOf: "2026-09-14T00:00:00.000Z",
    sector: "Market",
    impactLinks: [],
    citations: [
      {
        id: `web-${id}`,
        provider: "ojk.go.id",
        endpoint: "web-watch",
        field: "body",
        asOf: "2026-09-14T00:00:00.000Z",
        label: "OJK — siaran pers",
        url: "https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/Pages/X.aspx",
        urlLabel: "Buka sumber asal",
        access: "direct",
      },
    ],
  };
}

describe("enqueue", () => {
  it("never resurrects decided candidates", () => {
    const decided: ReviewQueue = {
      ...emptyQueue,
      decided: { "web-a": { candidateId: "web-a", status: "dismissed", decidedAt: "2026-09-14T00:00:00.000Z", reason: "duplikat" } },
    };
    const next = enqueue(decided, [candidate("web-a"), candidate("web-b")]);
    expect(next.pending.map((e) => e.id)).toEqual(["web-b"]);
  });
});

describe("decide", () => {
  const queued: ReviewQueue = { ...emptyQueue, pending: [candidate("web-1")] };

  it("accept maps reviewer impacts with band scores, never computed ones", () => {
    const next = decide(
      queued,
      "web-1",
      {
        action: "accept",
        impacts: [{ symbol: "BBCA", direction: "Supported", band: "high", path: "Aturan OJK → biaya kepatuhan BBCA → margin" }],
        reason: "Aturan baru, material untuk bank.",
      },
      "2026-09-14T01:00:00.000Z",
    );
    expect(next.pending).toHaveLength(0);
    expect(next.accepted).toHaveLength(1);
    expect(next.accepted[0].impactLinks).toMatchObject([
      { symbol: "BBCA", direction: "Supported", relevance: BAND_SCORE.high },
    ]);
    expect(next.accepted[0].impactLinks[0].rationale).toContain("reviewer web-watch");
  });

  it("rejects unknown symbols, duplicate symbols, and missing paths", () => {
    expect(() =>
      decide(queued, "web-1", { action: "accept", impacts: [{ symbol: "FAKE", direction: "Supported", band: "low", path: "jalur yang cukup panjang" }] }, "2026-09-14T01:00:00.000Z"),
    ).toThrowError(/tidak dikenal/);
    expect(() =>
      decide(queued, "web-1", { action: "accept", impacts: [] }, "2026-09-14T01:00:00.000Z"),
    ).toThrowError(/minimal satu emiten/);
    expect(() =>
      decide(queued, "web-1", { action: "dismiss", reason: "" }, "2026-09-14T01:00:00.000Z"),
    ).toThrowError(/wajib diisi/);
  });

  it("dismiss removes from pending and records the reason", () => {
    const next = decide(queued, "web-1", { action: "dismiss", reason: "Tidak material." }, "2026-09-14T01:00:00.000Z");
    expect(next.pending).toHaveLength(0);
    expect(next.accepted).toHaveLength(0);
    expect(next.decided["web-1"]).toMatchObject({ status: "dismissed", reason: "Tidak material." });
  });
});

describe("saveQueue + overlay + providers", () => {
  it("persists decisions and exposes accepted events to the engine", async () => {
    const store = memoryQueueStore();
    const saved = await saveQueue(store, (queue) => enqueue(queue, [candidate("web-9")]));
    expect(saved.pending).toHaveLength(1);
    const decided = await saveQueue(store, (queue) =>
      decide(queue, "web-9", {
        action: "accept",
        impacts: [{ symbol: "PGAS", direction: "Adverse", band: "medium", path: "Aturan harga gas → realisasi harga PGAS → margin" }],
      }, "2026-09-14T02:00:00.000Z"),
    );
    expect(decided.accepted).toHaveLength(1);

    setOverlayForTests(decided.accepted);
    expect(getOverlayEvents().map((e) => e.id)).toEqual(["web-9"]);
    expect(fixtureNewsProvider.getEvent("web-9")?.title).toBe("Kandidat web-9");
    expect(fixtureMarketDataProvider.getCompanyEvents("PGAS").some((e) => e.id === "web-9")).toBe(true);
    expect(fixtureMarketDataProvider.getCompanyEvents("BBCA").some((e) => e.id === "web-9")).toBe(false);
    setOverlayForTests([]);
  });
});
