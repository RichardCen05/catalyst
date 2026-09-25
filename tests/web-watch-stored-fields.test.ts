import { afterEach, describe, expect, it } from "vitest";
import { buildWebWatchBundle } from "@/lib/agent/retrieval/context/web-watch";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { titleFromUrl } from "@/lib/web-watch/fetching";
import { emptyQueue, normalizeQueue, setOverlayForTests } from "@/lib/web-watch/queue";
import { isoTimestamp, repairStoredEvent } from "@/lib/web-watch/stored-fields";
import type { MarketEvent } from "@/lib/types";

const MIN_WORDS = resolveThresholds().webWatchHeadlineMinWords;
const URL = "https://www.bi.go.id/id/publikasi/ruang-media/news-release/Pages/sp_2819226.aspx";
/** A headline with exactly as many words as the threshold asks for. */
const HEADLINE = Array.from({ length: MIN_WORDS }, (_, i) => `kata${i}`).join(" ");

function stored(overrides: Partial<MarketEvent> & { titleSource?: string } = {}): MarketEvent {
  return {
    id: "web-bi-1",
    title: titleFromUrl(URL),
    summary: "Ringkasan.",
    body: `${HEADLINE}\n\nTurn on more accessible mode\n\nIsi siaran pers.`,
    category: "policy",
    sourceType: "policy",
    publishedAt: "2026-09-22T10:30:35.646Z",
    asOf: "2026-09-22T10:30:35.646Z",
    sector: "Market",
    impactLinks: [],
    citations: [{ id: "c", provider: "bi.go.id", endpoint: "web-watch", field: "body", asOf: "2026-09-22T10:30:35.646Z", label: "BI", url: URL, urlLabel: "Buka sumber asal", access: "direct" }],
    ...overrides,
  };
}

afterEach(() => setOverlayForTests([]));

describe("isoTimestamp", () => {
  it("reads an RFC 822 feed date as ISO and leaves ISO untouched", () => {
    expect(isoTimestamp("Wed, 23 Sep 2026 16:09:01 +0700")).toBe("2026-09-23T09:09:01.000Z");
    expect(isoTimestamp("2026-09-10T09:00:00Z")).toBe("2026-09-10T09:00:00Z");
  });

  it("answers null for what it cannot read", () => {
    expect(isoTimestamp("bukan tanggal")).toBeNull();
    expect(isoTimestamp(null)).toBeNull();
    expect(isoTimestamp("")).toBeNull();
  });
});

describe("repairStoredEvent", () => {
  it("gives a filename title the page's own headline from the body", () => {
    const repaired = repairStoredEvent(stored(), MIN_WORDS) as MarketEvent & { titleSource?: string };
    expect(repaired.title).toBe(HEADLINE);
    expect(repaired.titleSource).toBe("body");
    expect(repaired.id).toBe("web-bi-1");
  });

  it("keeps the filename when the first line is too short to be a headline", () => {
    const short = stored({ body: "Menu\n\nIsi." });
    expect(repairStoredEvent(short, MIN_WORDS).title).toBe(titleFromUrl(URL));
  });

  it("never touches a title a feed or the body supplied", () => {
    const fromFeed = stored({ title: titleFromUrl(URL), titleSource: "feed" } as Partial<MarketEvent>);
    expect(repairStoredEvent(fromFeed, MIN_WORDS)).toBe(fromFeed);
    const written = stored({ title: "Judul yang ditulis orang" });
    expect(repairStoredEvent(written, MIN_WORDS)).toBe(written);
  });

  it("reads a stored RFC 822 date as ISO, and returns the same object when nothing needs repair", () => {
    const rfc = stored({ title: "Judul", publishedAt: "Wed, 23 Sep 2026 17:20:00 +0700" });
    expect(repairStoredEvent(rfc, MIN_WORDS).publishedAt).toBe("2026-09-23T10:20:00.000Z");
    const clean = stored({ title: "Judul" });
    expect(repairStoredEvent(clean, MIN_WORDS)).toBe(clean);
  });

  it("is applied to every stored section when the queue is read", () => {
    const rfc = "Wed, 23 Sep 2026 17:20:00 +0700";
    const queue = normalizeQueue({
      ...structuredClone(emptyQueue),
      pending: [stored({ publishedAt: rfc })],
      accepted: [stored({ id: "web-bi-2" })],
      archived: { "web-bi-3": { event: stored({ id: "web-bi-3" }), rule: "duplicate", reason: "r", at: "2026-09-22T10:30:35.646Z" } },
      decided: {
        "web-bi-4": {
          candidateId: "web-bi-4",
          status: "accepted",
          decidedAt: "2026-09-24T07:10:19.384Z",
          reason: "otomatis",
          auto: { event: stored({ id: "web-bi-4" }), match: { symbols: [], matchedBy: [], at: "2026-09-24T07:10:19.384Z" }, proposal: { impacts: [], model: "m", verifiedAt: "2026-09-24T07:10:19.384Z" } },
        },
      },
    });
    expect(queue.pending[0]).toMatchObject({ title: HEADLINE, publishedAt: "2026-09-23T10:20:00.000Z" });
    expect(queue.accepted[0].title).toBe(HEADLINE);
    expect(queue.archived["web-bi-3"].event.title).toBe(HEADLINE);
    expect(queue.decided["web-bi-4"].auto?.event.title).toBe(HEADLINE);
  });
});

describe("when the screen last ran", () => {
  it("normalizeQueue keeps lastScreenAt and leaves it absent until a run", () => {
    expect(normalizeQueue(structuredClone(emptyQueue)).lastScreenAt).toBeUndefined();
    expect(normalizeQueue({ ...structuredClone(emptyQueue), lastScreenAt: "2026-09-25T15:00:00.000Z" }).lastScreenAt).toBe("2026-09-25T15:00:00.000Z");
  });

  it("the Pantau bundle says the screen never ran instead of promising a nightly run", async () => {
    setOverlayForTests([]);
    const never = await buildWebWatchBundle();
    expect(never.body).toContain("Penyaring belum pernah berjalan");
    expect(never.body).not.toContain("Setiap malam");

    setOverlayForTests([], { lastScreenAt: "2026-09-25T15:00:00.000Z" });
    const ran = await buildWebWatchBundle();
    expect(ran.body).toContain("Penyaringan terakhir diterapkan pada 2026-09-25");
    expect(ran.body).not.toContain("belum pernah berjalan");
  });
});
