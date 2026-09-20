import { describe, expect, it } from "vitest";
import { digestFor } from "@/lib/data/recording-digest";
import { citations } from "@/lib/data/fixtures";
import { brokerEvidence, priceSeries } from "@/lib/data/market.generated";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

/**
 * The card now states figures, so the digest is a claim like any other.
 * Every number it prints has to be the recording's own, and every sentence
 * has to follow from them — a readout that rounds the wrong way or calls a
 * net sell a net buy is worse than the column list it replaced.
 */
describe("ringkasan isi rekaman", () => {
  it("data harian menyebut jendela, nilai terakhir, dan rasio volume dari rekaman", () => {
    const digest = digestFor(citations.daily("ANTM"));
    const series = priceSeries.ANTM;
    const last = series[series.length - 1];
    expect(digest).toBeDefined();
    expect(digest?.scope).toContain(`${series.length} sesi bursa`);
    expect(digest?.values.find((entry) => entry.label === "Volume terakhir")?.value).toContain(
      new Intl.NumberFormat("id-ID").format(last.volume),
    );
    // The comparison window is the sessions before the last one, which is
    // what the app's own volume score uses.
    expect(digest?.context.find((entry) => entry.label === "Sesi pembanding")?.value).toBe(`${series.length - 1} sesi`);
  });

  it("arus asing menyebut arah dari tanda nilainya, bukan dari kalimat tetap", () => {
    const digest = digestFor(citations.foreign("ANTM"));
    const net = brokerEvidence.ANTM.netForeign;
    expect(digest?.context.find((entry) => entry.label === "Arah arus asing")?.value).toBe(net >= 0 ? "bersih beli" : "bersih jual");
    expect(digest?.values.find((entry) => entry.label === "Arus asing bersih")?.value.startsWith("−")).toBe(net < 0);
    // The bound travels with the measurements, so whoever writes the sentence
    // cannot quietly drop it.
    expect(digest?.context.some((entry) => entry.label === "Batas arti rekaman")).toBe(true);
  });

  it("ringkasan broker memakai porsi pembeli terbesar terhadap kelompok yang dibaca", () => {
    const digest = digestFor(citations.broker("ANTM"));
    const buyers = brokerEvidence.ANTM.buyers.map((participant) => participant.buyIdr ?? participant.value);
    const expected = (Math.max(...buyers) / buyers.reduce((sum, value) => sum + value, 0)) * 100;
    // Stated as rupiah out of a hundred, and read against the app's own
    // concentration floor rather than against a fresh opinion.
    expect(digest?.context.find((entry) => entry.label === "Porsi yang sama dalam rupiah")?.value)
      .toBe(`Rp ${expected.toFixed(2).replace(".", ",")} dari tiap Rp 100`);
    expect(digest?.context.find((entry) => entry.label === "Ambang aliran terpusat Catalyst")?.value)
      .toBe(`${(DEFAULT_THRESHOLDS.concentrationFloor * 100).toFixed(0)}%`);
    expect(digest?.context.find((entry) => entry.label === "Posisi terhadap ambang")?.value)
      .toBe(expected / 100 >= DEFAULT_THRESHOLDS.concentrationFloor ? "di atas ambang" : "di bawah ambang");
  });

  it("keterbukaan tanpa rekaman mengatakannya, bukan mengarang nol transaksi", () => {
    const digest = digestFor(citations.filing("ANTM"));
    expect(digest?.scope).toContain("Tidak ada keterbukaan");
    expect(digest?.values).toHaveLength(0);
  });

  it("tidak ada kalimat tafsir yang ditulis tangan di sini", () => {
    // The panel's two sentences are written from these measurements at
    // request time. A verdict hard-coded per feed would drift the moment a
    // threshold moves, and nothing would fail when it did — so the digest
    // carries labelled values only, never a finished sentence.
    const every = [
      citations.daily("ANTM"),
      citations.ihsg,
      citations.foreign("ANTM"),
      citations.broker("ANTM"),
      citations.overview("ANTM"),
      citations.financial("ANTM"),
      citations.filing("ANTM"),
    ];
    for (const citation of every) {
      const digest = digestFor(citation);
      expect(digest, citation.id).toBeDefined();
      expect(digest?.context.length, citation.id).toBeGreaterThan(0);
      for (const entry of [...(digest?.values ?? []), ...(digest?.context ?? [])]) {
        // A sentence is prose; a measurement is a label and a value. Anything
        // long enough to end in a full stop is a verdict in disguise.
        expect(entry.value.split(/\s+/).length, `${citation.id}/${entry.label}`).toBeLessThan(16);
      }
    }
  });

  it("feed tanpa rekaman per emiten tidak memaksakan ringkasan", () => {
    // The broker registry is a market-wide list; this app keeps no per-symbol
    // recording of it, so the card shows only what it can support.
    expect(digestFor(citations.registry)).toBeUndefined();
    expect(digestFor(citations.news("news-1"))).toBeUndefined();
  });
});
