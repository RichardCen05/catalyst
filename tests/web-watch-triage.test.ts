import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import {
  backfillTriage,
  decide,
  emptyQueue,
  enqueue,
  memoryQueueStore,
  normalizeQueue,
  restore,
  saveQueue,
  type ReviewQueue,
} from "@/lib/web-watch/queue";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { proseChars, sourceFor, triage, triageAll, type TriageContext } from "@/lib/web-watch/triage";
import type { MarketEvent } from "@/lib/types";

const PROSE =
  "Pemerintah menyiapkan aturan baru yang akan berlaku mulai tahun depan bagi seluruh pelaku usaha di sektor terkait. " +
  "Kebijakan itu disebut akan mengubah cara perusahaan menghitung biaya dan menyusun rencana produksi mereka tahun ini.";

let counter = 0;
function event(over: Partial<MarketEvent> & { source?: string } = {}): MarketEvent {
  counter += 1;
  const { source = "src-cnbc-news", ...rest } = over;
  return {
    id: `web-${source}-${counter.toString(16).padStart(8, "0")}`,
    title: `Berita ${counter}`,
    summary: "Ringkasan.",
    body: `${PROSE} Nomor ${counter}.`,
    category: "policy",
    sourceType: "macro",
    publishedAt: "2026-09-23T00:00:00.000Z",
    asOf: "2026-09-23T00:00:00.000Z",
    sector: "Market",
    impactLinks: [],
    citations: [],
    ...rest,
  };
}

const ctx = (over: Partial<TriageContext> = {}): TriageContext => ({ sources: SEED_SOURCES, seen: [], ...over });

function forecastBody(steps: Array<{ tp?: number; ws?: number; weather?: number }>, kotkab = "Kolaka"): string {
  return JSON.stringify({
    lokasi: { provinsi: "Sulawesi Tenggara", kotkab, kecamatan: "Pomalaa", desa: "Pomalaa" },
    data: [{ cuaca: [steps.map((step, i) => ({ local_datetime: `2026-09-23 ${10 + i}:00:00`, weather_desc: "Berawan", ...step }))] }],
  });
}

function quakeBody(magnitude: string, wilayah: string, dirasakan = ""): string {
  return JSON.stringify({
    Infogempa: { gempa: { Tanggal: "23 Sep 2026", Jam: "09:02:44 WIB", Magnitude: magnitude, Kedalaman: "10 km", Wilayah: wilayah, Dirasakan: dirasakan } },
  });
}

describe("triage rule 1: duplicate", () => {
  it("archives a candidate whose title repeats one already pending", () => {
    const first = event({ title: "PTBA Kehilangan Potensi Laba" });
    const copy = event({ title: "PTBA kehilangan  potensi laba!", source: "src-cnbc-market" });
    const result = triage(copy, ctx({ seen: [{ event: first, where: "pending" }] }));
    expect(result).toMatchObject({ verdict: "archive", rule: "duplicate" });
    if (result.verdict === "archive") expect(result.reason).toContain("PTBA Kehilangan Potensi Laba");
  });

  it("archives a candidate whose body repeats an archived one", () => {
    const first = event({ title: "Judul lama" });
    const copy = event({ title: "Judul baru", body: first.body });
    expect(triage(copy, ctx({ seen: [{ event: first, where: "archived" }] }))).toMatchObject({ verdict: "archive", rule: "duplicate" });
  });

  it("keeps the older of two copies in one batch", () => {
    const older = event({ title: "Harga timah naik", body: `${PROSE} TINS.` });
    const newer = event({ title: "Harga timah naik", body: `${PROSE} TINS lagi.` });
    const [a, b] = triageAll([older, newer], ctx());
    expect(a.result.verdict).toBe("review");
    expect(b.result).toMatchObject({ verdict: "archive", rule: "duplicate" });
  });

  it("does not call two forecasts for one site duplicates just because the derived title repeats", () => {
    const heavy = forecastBody([{ tp: 25, ws: 5, weather: 63 }]);
    const earlier = event({ source: "src-bmkg-forecast-pomalaa", title: "Prakiraan cuaca Pomalaa, Pomalaa, Kolaka", body: forecastBody([{ tp: 0, ws: 5, weather: 1 }]) });
    const later = event({ source: "src-bmkg-forecast-pomalaa", title: "Prakiraan cuaca Pomalaa, Pomalaa, Kolaka", body: heavy });
    const result = triage(later, ctx({ seen: [{ event: earlier, where: "pending" }] }));
    expect(result).toMatchObject({ verdict: "review", symbols: ["ANTM"] });
  });
});

describe("triage rule 2: empty extract", () => {
  it("archives a JS-rendered navigation skeleton", () => {
    const skeleton = event({
      title: "BMKG",
      body: "Tentang BMKG Struktur Organisasi Profil Visi Misi Cuaca Iklim Kualitas Udara Gempabumi Tsunami Publikasi Layanan Kontak Beranda Peringatan Dini Cuaca Prakiraan Cuaca Maritim Penerbangan",
      source: "src-bmkg-warning",
    });
    const result = triage(skeleton, ctx());
    expect(result).toMatchObject({ verdict: "archive", rule: "empty-extract" });
  });

  it("measures prose by whole sentences, not raw length", () => {
    expect(proseChars("Menu Beranda Profil Kontak Layanan Publikasi", 8)).toBe(0);
    expect(proseChars(PROSE, 8)).toBeGreaterThan(DEFAULT_THRESHOLDS.webWatchProseMinChars);
  });
});

describe("triage rule 3: touches something watched", () => {
  it("archives general news that names no registry emiten and whose source declares none", () => {
    const result = triage(event({ title: "Mobil China Makin Gencar" }), ctx());
    expect(result).toMatchObject({ verdict: "archive", rule: "no-watched-match" });
    if (result.verdict === "archive") expect(result.reason).toContain("CNBC Indonesia");
  });

  it("matches a ticker written in capitals", () => {
    const result = triage(event({ body: `${PROSE} Saham GOTO ikut bergerak.` }), ctx());
    expect(result).toMatchObject({ verdict: "review", symbols: ["GOTO"] });
  });

  it("matches a registry name with an Indonesian enclitic attached", () => {
    const result = triage(event({ body: `${PROSE} Produksi timahnya turun tajam.` }), ctx());
    expect(result.verdict).toBe("review");
    if (result.verdict === "review") expect(result.symbols).toContain("TINS");
  });

  it("does not read the ordinary word 'buka' as the ticker BUKA", () => {
    const result = triage(event({ body: `${PROSE} Pasar buka lebih awal hari ini.` }), ctx());
    expect(result).toMatchObject({ verdict: "archive", rule: "no-watched-match" });
  });

  it("does not read a lowercase acronym-shaped word as a registry acronym", () => {
    // `bri` and `pgn` are derived acronyms; only the capitalised form is a name.
    const lower = triage(event({ body: `${PROSE} Kata bri dan pgn di sini bukan nama.` }), ctx());
    expect(lower).toMatchObject({ verdict: "archive", rule: "no-watched-match" });
    const upper = triage(event({ body: `${PROSE} Kredit BRI tumbuh.` }), ctx());
    expect(upper).toMatchObject({ verdict: "review", symbols: ["BBRI"] });
  });

  it("drops an alias the queue uses as an ordinary word, once there is enough queue to judge", () => {
    const asiaNews = (n: number) => event({ title: `Kawasan ${n}`, body: `${PROSE} Pertumbuhan di Asia melambat ${n}.` });
    const seen = Array.from({ length: DEFAULT_THRESHOLDS.webWatchAliasMinCorpus }, (_, n) => ({ event: asiaNews(n), where: "pending" as const }));
    const probe = asiaNews(999);
    expect(triage(probe, ctx({ seen }))).toMatchObject({ verdict: "archive", rule: "no-watched-match" });
    // Too little queue to tell a word from a name: the alias still counts.
    expect(triage(probe, ctx()).verdict).toBe("review");
  });

  it("sends every item from a source that declares emiten to review, with the source as evidence", () => {
    const result = triage(event({ source: "src-gapki", title: "Harga CPO di lelang" }), ctx());
    expect(result).toMatchObject({ verdict: "review" });
    if (result.verdict === "review") {
      expect(result.symbols).toEqual(expect.arrayContaining(["ICBP", "MYOR", "AMRT"]));
      expect(result.matchedBy.some((e) => e.by === "source")).toBe(true);
    }
  });
});

describe("triage rule 4: weather below warning", () => {
  it("archives an ordinary mine-site forecast and says what it read", () => {
    const result = triage(event({ source: "src-bmkg-forecast-pomalaa", body: forecastBody([{ tp: 0.8, ws: 17, weather: 3 }, { tp: 0, ws: 20.9, weather: 1 }]) }), ctx());
    expect(result).toMatchObject({ verdict: "archive", rule: "weather-below-warning" });
    if (result.verdict === "archive") {
      expect(result.reason).toContain("2 langkah");
      expect(result.reason).toContain("20,9 km/jam");
    }
  });

  it("keeps a forecast with a heavy-rain step, mapped to the site's declared emiten", () => {
    const result = triage(
      event({ source: "src-bmkg-forecast-pomalaa", body: forecastBody([{ tp: 0, ws: 5, weather: 1 }, { tp: DEFAULT_THRESHOLDS.webWatchRainMmPerStep, ws: 5, weather: 61 }]) }),
      ctx(),
    );
    expect(result).toMatchObject({ verdict: "review", symbols: ["ANTM"] });
  });

  it("keeps a quake whose felt area names a watched region", () => {
    const result = triage(
      event({ source: "src-bmkg-quake", body: quakeBody(String(DEFAULT_THRESHOLDS.webWatchQuakeMinMagnitude), "Pusat gempa di darat 20 km Barat Daya Kolaka", "III Kab. Kolaka") }),
      ctx(),
    );
    expect(result).toMatchObject({ verdict: "review", symbols: ["ANTM"] });
    if (result.verdict === "review") expect(result.matchedBy[0]).toMatchObject({ by: "region", term: "Kolaka" });
  });

  it("archives a quake nowhere near a watched region, and says the match was by text", () => {
    const result = triage(event({ source: "src-bmkg-quake", body: quakeBody("4.7", "Pusat gempa berada di laut 48 km utara Ruteng-Manggarai", "II - III Kab. Manggarai") }), ctx());
    expect(result).toMatchObject({ verdict: "archive", rule: "weather-below-warning" });
    if (result.verdict === "archive") {
      expect(result.reason).toContain("Ruteng-Manggarai");
      expect(result.reason).toContain("registri tidak menyimpan koordinat");
    }
  });

  it("archives a small quake even in a watched region", () => {
    const result = triage(event({ source: "src-bmkg-quake", body: quakeBody("3.1", "Pusat gempa 12 km Timur Luwu Timur") }), ctx());
    expect(result).toMatchObject({ verdict: "archive", rule: "weather-below-warning" });
  });

  it("always reviews a large quake, even where no watched region is named", () => {
    const result = triage(event({ source: "src-bmkg-quake", body: quakeBody(String(DEFAULT_THRESHOLDS.webWatchQuakeAlwaysReviewMagnitude), "Pusat gempa di laut 80 km Selatan Pulau Buru") }), ctx());
    expect(result).toMatchObject({ verdict: "review", symbols: [] });
  });

  it("never archives an unrecognised JSON payload on the weather rule", () => {
    const result = triage(event({ source: "src-bmkg-forecast-pomalaa", body: JSON.stringify({ something: "else" }) }), ctx());
    expect(result.verdict === "archive" && result.rule === "weather-below-warning").toBe(false);
  });
});

describe("sourceFor", () => {
  it("picks the longest registered id that prefixes the candidate id", () => {
    const sources = [{ ...SEED_SOURCES[0], id: "src-bmkg-forecast" }, { ...SEED_SOURCES[0], id: "src-bmkg-forecast-pomalaa" }];
    expect(sourceFor("web-src-bmkg-forecast-pomalaa-abc123", sources)?.id).toBe("src-bmkg-forecast-pomalaa");
  });
});

describe("queue with triage", () => {
  const legacy = { pending: [], accepted: [], decided: {} } as unknown as ReviewQueue;

  it("loads a queue file written before triage", async () => {
    expect(normalizeQueue(legacy)).toEqual(emptyQueue);
    const store = memoryQueueStore(legacy);
    const saved = await saveQueue(store, (queue) => enqueue(queue, [event({ title: "Mobil China" })], { sources: SEED_SOURCES }, "2026-09-24T00:00:00.000Z"));
    expect(Object.keys(saved.archived)).toHaveLength(1);
    expect(saved.pending).toHaveLength(0);
  });

  it("archives with the rule and reason, and never re-enqueues an archived id", () => {
    const noise = event({ title: "Paus Leo Berulang Tahun" });
    const once = enqueue(emptyQueue, [noise], { sources: SEED_SOURCES }, "2026-09-24T00:00:00.000Z");
    expect(once.archived[noise.id]).toMatchObject({ rule: "no-watched-match", at: "2026-09-24T00:00:00.000Z" });
    const twice = enqueue(once, [noise], { sources: SEED_SOURCES }, "2026-09-24T12:00:00.000Z");
    expect(twice).toBe(once);
  });

  it("records what matched for items sent to review", () => {
    const news = event({ body: `${PROSE} PTBA menanggung beban DMO.` });
    const next = enqueue(emptyQueue, [news], { sources: SEED_SOURCES }, "2026-09-24T00:00:00.000Z");
    expect(next.pending.map((e) => e.id)).toEqual([news.id]);
    expect(next.matches[news.id].symbols).toEqual(["PTBA"]);
  });

  it("restores an archived item to review, and backfill leaves a restored item alone", () => {
    const noise = event({ title: "Jamie Dimon Prediksi AI" });
    const archived = enqueue(emptyQueue, [noise], { sources: SEED_SOURCES }, "2026-09-24T00:00:00.000Z");
    const restored = restore(archived, noise.id, "2026-09-24T01:00:00.000Z");
    expect(restored.pending.map((e) => e.id)).toEqual([noise.id]);
    expect(restored.archived[noise.id]).toBeUndefined();
    expect(restored.restored[noise.id]).toMatchObject({ rule: "no-watched-match", restoredAt: "2026-09-24T01:00:00.000Z" });
    const { next, report } = backfillTriage(restored, { sources: SEED_SOURCES }, "2026-09-24T02:00:00.000Z");
    expect(next.pending.map((e) => e.id)).toEqual([noise.id]);
    expect(report.archived).toBe(0);
  });

  it("decide keeps the triage sections intact", () => {
    const news = event({ body: `${PROSE} TLKM menaikkan belanja modal.` });
    const noise = event({ title: "Momen Paus Leo" });
    const queued = enqueue(emptyQueue, [news, noise], { sources: SEED_SOURCES }, "2026-09-24T00:00:00.000Z");
    const next = decide(queued, news.id, { action: "dismiss", reason: "Tidak material." }, "2026-09-24T01:00:00.000Z");
    expect(next.archived[noise.id]).toBeDefined();
    expect(next.matches[news.id]).toBeUndefined();
  });

  it("backfill reports per-rule counts and samples, and keeps the older of two copies", () => {
    const older = event({ title: "Harga batu bara acuan naik", body: `${PROSE} ADRO.` });
    const newer = event({ title: "Harga batu bara acuan naik", body: `${PROSE} ADRO, lagi.` });
    const noise = event({ title: "Trump dan Iran" });
    const queue: ReviewQueue = { ...emptyQueue, pending: [noise, newer, older] };
    const { next, report } = backfillTriage(queue, { sources: SEED_SOURCES }, "2026-09-24T00:00:00.000Z");
    expect(report.pendingBefore).toBe(3);
    expect(report.pendingAfter).toBe(1);
    expect(report.perRule.duplicate.count).toBe(1);
    expect(report.perRule["no-watched-match"].samples[0].title).toBe("Trump dan Iran");
    expect(next.pending.map((e) => e.id)).toEqual([older.id]);
    // Pure: the input queue is untouched.
    expect(queue.pending).toHaveLength(3);
  });
});
