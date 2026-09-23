import { describe, expect, it } from "vitest";
import { checkSource, hintBuckets, keywordHits, type FetchImpl } from "@/lib/web-watch/check";
import { FetchError, type Fetched } from "@/lib/web-watch/fetching";
import { addSource, claim, isLocked, listSources, memoryRegistryStore, release, saveRegistry } from "@/lib/web-watch/registry";
import { isDue, newSourceState, type WatchedSource } from "@/lib/web-watch/types";
import { watchAll } from "@/lib/web-watch/watch-all";
import { memoryQueueStore } from "@/lib/web-watch/queue";
import { memoryReviewStore } from "@/lib/web-watch/review";

const LONG = "isi berita penting tentang pasar modal Indonesia dan harga komoditas. ".repeat(12);

function fetched(html: string, overrides: Partial<Fetched> = {}): Fetched {
  return {
    url: "https://ex.id/a",
    status: 200,
    contentType: "text/html",
    raw: Buffer.from(html, "utf8"),
    etag: null,
    lastModified: null,
    notModified: false,
    ...overrides,
  };
}

const docSource: WatchedSource = {
  id: "src-doc",
  url: "https://ex.id/doc",
  label: "Dokumen",
  kind: "document",
  enabled: true,
  checkIntervalHours: 24,
  category: "policy",
  sourceType: "policy",
};

describe("isDue", () => {
  it("is due on first sight, not due before the interval, due after", () => {
    const fresh = newSourceState(docSource);
    expect(isDue(fresh)).toBe(true);
    const checked = { ...fresh, lastCheckedAt: new Date(1_000_000).toISOString() };
    expect(isDue(checked, 1_000_000 + 23 * 3_600_000)).toBe(false);
    expect(isDue(checked, 1_000_000 + 25 * 3_600_000)).toBe(true);
    expect(isDue({ ...checked, enabled: false }, 1_000_000 + 99 * 3_600_000)).toBe(false);
  });
});

describe("registry", () => {
  it("refuses a second row for the same URL", async () => {
    const store = memoryRegistryStore();
    const first = await addSource(store, docSource);
    const second = await addSource(store, { ...docSource, id: "src-other", label: "Lain" });
    expect(first.created).toBe(true);
    expect(second.created).toBe(false);
    expect(second.state.id).toBe("src-doc");
    expect(await listSources(store)).toHaveLength(1);
  });

  it("claim hands out one lock; a stale lock is ignored", async () => {
    const store = memoryRegistryStore();
    await addSource(store, docSource);
    const first = await claim(store, "src-doc", 1_000_000);
    expect(first).not.toBeNull();
    expect(await claim(store, "src-doc", 1_000_001)).toBeNull();
    expect(isLocked(first!.state, 1_000_001)).toBe(true);
    // A lock older than the lifetime belongs to a dead process.
    expect(isLocked(first!.state, 1_000_000 + 3_600_000)).toBe(false);
    expect(await claim(store, "src-doc", 1_000_000 + 3_600_000)).not.toBeNull();
  });

  it("release always clears the lock", async () => {
    const store = memoryRegistryStore();
    await addSource(store, docSource);
    await claim(store, "src-doc", 5_000);
    await release(store, "src-doc", { lastStatus: "error", lastError: "boom" });
    const sources = await listSources(store);
    expect(sources[0].checkLockAt).toBeNull();
    expect(sources[0].lastError).toBe("boom");
  });

  it("saveRegistry retries past a racing writer and keeps both changes", async () => {
    const inner = memoryRegistryStore();
    await addSource(inner, docSource);
    let raced = false;
    const racy = {
      ...inner,
      async save(data: Parameters<typeof inner.save>[0], options: Parameters<typeof inner.save>[1]) {
        if (!raced) {
          raced = true;
          // A sweep release lands between our load and our save.
          await release(inner, "src-doc", { lastStatus: "changed", lastTextSha: "abc" });
        }
        return inner.save(data, options);
      },
    };
    const next = await saveRegistry(racy, (file) => ({
      ...file,
      sources: { ...file.sources, "src-new": newSourceState({ ...docSource, id: "src-new", url: "https://ex.id/new" }) },
    }));
    expect(raced).toBe(true);
    expect(Object.keys(next.sources).sort()).toEqual(["src-doc", "src-new"]);
    expect(next.sources["src-doc"].lastTextSha).toBe("abc");
  });
});

describe("checkSource — document", () => {
  function page(body: string): string {
    return `<html><body><main><h1>Judul</h1><p>${body}</p></main></body></html>`;
  }

  it("ingests the first read, then reports same_text", async () => {
    const store = memoryRegistryStore();
    await addSource(store, docSource);
    const fetchImpl: FetchImpl = async () => fetched(page(LONG));
    const first = await checkSource("src-doc", { store, fetchImpl, nowMs: 10_000 });
    expect(first.status).toBe("changed");
    expect(first.reason).toBe("first_read");
    expect(first.candidates).toHaveLength(1);
    // No back door: candidates carry no impact links and point at the source.
    expect(first.candidates![0].impactLinks).toEqual([]);
    expect(first.candidates![0].citations[0].url).toBe("https://ex.id/a");

    const second = await checkSource("src-doc", { store, fetchImpl, nowMs: 20_000 }, true);
    expect(second.status).toBe("unchanged");
    expect(second.reason).toBe("same_text");
  });

  it("honours 304 without downloading", async () => {
    const store = memoryRegistryStore();
    await addSource(store, docSource);
    let calls = 0;
    const fetchImpl: FetchImpl = async () => {
      calls += 1;
      return calls === 1 ? fetched(page(LONG)) : fetched("", { status: 304, notModified: true, raw: Buffer.alloc(0) });
    };
    await checkSource("src-doc", { store, fetchImpl, nowMs: 1 });
    const second = await checkSource("src-doc", { store, fetchImpl, nowMs: 2 }, true);
    expect(second).toMatchObject({ status: "unchanged", reason: "not_modified" });
  });

  it("records a broken source openly instead of swallowing it", async () => {
    const store = memoryRegistryStore();
    await addSource(store, docSource);
    const fetchImpl: FetchImpl = async () => {
      throw new FetchError("Sumber menjawab 403. Alamat itu menolak pembaca otomatis.");
    };
    const result = await checkSource("src-doc", { store, fetchImpl, nowMs: 1 });
    expect(result.status).toBe("error");
    const sources = await listSources(store);
    expect(sources[0].lastStatus).toBe("error");
    expect(sources[0].lastError).toContain("403");
    expect(sources[0].checkLockAt).toBeNull();
  });

  it("reports busy when another run holds the lock", async () => {
    const store = memoryRegistryStore();
    await addSource(store, docSource);
    await claim(store, "src-doc", 100);
    const result = await checkSource("src-doc", { store, nowMs: 101 });
    expect(result.status).toBe("busy");
  });
});

describe("checkSource — feed and listing", () => {
  const feedV1 = `<?xml version="1.0"?><rss version="2.0"><channel><title>F</title>
    <item><guid>https://ex.id/n/1</guid><title>Satu</title><link>https://ex.id/n/1</link></item>
    <item><guid>https://ex.id/n/2</guid><title>Dua</title><link>https://ex.id/n/2</link></item>
  </channel></rss>`;

  const feedSource: WatchedSource = {
    id: "src-feed",
    url: "https://ex.id/feed",
    label: "Feed",
    kind: "feed",
    enabled: true,
    checkIntervalHours: 24,
    category: "company",
    sourceType: "macro",
  };

  function article(title: string): string {
    return `<html><body><main><h1>${title}</h1><p>${LONG}</p></main></body></html>`;
  }

  it("baselines the first look and ingests only what is new", async () => {
    const store = memoryRegistryStore();
    await addSource(store, feedSource);
    let feedXml = feedV1;
    const fetchImpl: FetchImpl = async (url) =>
      url === "https://ex.id/feed"
        ? fetched(feedXml, { contentType: "application/rss+xml", url })
        : fetched(article("item"), { url });

    const first = await checkSource("src-feed", { store, fetchImpl, nowMs: 1 });
    expect(first.status).toBe("baselined");
    expect(first.candidates ?? []).toHaveLength(0);

    feedXml = feedV1.replace("</channel>", `<item><guid>https://ex.id/n/3</guid><title>Tiga</title><link>https://ex.id/n/3</link></item></channel>`);
    const second = await checkSource("src-feed", { store, fetchImpl, nowMs: 2 }, true);
    expect(second.status).toBe("changed");
    expect(second.newEntries).toBe(1);
    expect(second.candidates).toHaveLength(1);
    expect(second.candidates![0].title).toBe("Tiga");
  });

  it("a listing whose pattern matches nothing fails permanently and openly", async () => {
    const store = memoryRegistryStore();
    await addSource(store, {
      id: "src-list",
      url: "https://ex.id/index",
      label: "Indeks",
      kind: "listing",
      enabled: true,
      checkIntervalHours: 24,
      linkPattern: "/tidak-ada/[^\"']+",
      category: "policy",
      sourceType: "policy",
    });
    const fetchImpl: FetchImpl = async (url) => fetched(`<html><body><a href="/ada/satu">satu</a><p>${LONG}</p></body></html>`, { url });
    const result = await checkSource("src-list", { store, fetchImpl, nowMs: 1 });
    expect(result.status).toBe("error");
    expect(result.error).toContain("pola");
  });
});

describe("watchAll", () => {
  it("sweeps sequentially, skips not-due, and persists the run", async () => {
    const store = memoryRegistryStore();
    const review = memoryReviewStore();
    const queue = memoryQueueStore();
    await addSource(store, docSource);
    await addSource(store, { ...docSource, id: "src-off", label: "Mati", url: "https://ex.id/off", enabled: false });
    const fetchImpl: FetchImpl = async (url) =>
      fetched(`<html><body><main><h1>T</h1><p>${LONG}</p></main></body></html>`, { url });

    const first = await watchAll({ store, review, queue, fetchImpl, nowMs: 1_000 });
    expect(first.summary).toMatchObject({ checked: 2, changed: 1, candidates: 1 });
    expect(review.candidates.size).toBe(1);
    expect(review.latest?.summary.changed).toBe(1);
    // The sweep enqueues through triage: this page names no registry emiten
    // and its source declares none, so it is archived with a reason rather
    // than sent to a reviewer — kept in the queue file, not dropped.
    const stored = (await queue.load())?.data;
    expect(stored?.pending).toHaveLength(0);
    expect(Object.values(stored?.archived ?? {}).map((entry) => entry.rule)).toEqual(["no-watched-match"]);

    const second = await watchAll({ store, review, queue, fetchImpl, nowMs: 2_000 });
    expect(second.results.find((r) => r.sourceId === "src-doc")?.status).toBe("not_due");
    expect(second.results.find((r) => r.sourceId === "src-off")?.status).toBe("disabled");
  });
});

describe("hintBuckets", () => {
  it("suggests review buckets without deciding anything", () => {
    const hints = hintBuckets("Smelter outage dan force majeure menunda pengapalan; RKAB terhambat.");
    expect(hints.activity).toContain("smelter");
    expect(hints.activity).toContain("force majeure");
    expect(hints.ownership).toHaveLength(0);
    expect(hints.flows).toHaveLength(0);
  });

  it("spots ownership and flows language case-insensitively", () => {
    const hints = hintBuckets("Keterbukaan Informasi Pemegang Saham: DANANTARA tambah kepemilikan; MSCI Rebalancing picu net foreign.");
    expect(hints.ownership).toContain("danantara");
    expect(hints.flows).toContain("msci");
    expect(hints.flows).toContain("net foreign");
  });

  it("stays empty on plain text", () => {
    const hints = hintBuckets("Laporan keuangan kuartal ketiga tumbuh moderat.");
    expect(hints).toMatchObject({ activity: [], ownership: [], flows: [] });
    expect(keywordHits("", ["smelter"])).toHaveLength(0);
  });
});
