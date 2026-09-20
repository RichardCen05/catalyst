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
    expect(digest?.takeaway).toContain(`${series.length - 1} sesi sebelumnya`);
  });

  it("arus asing menyimpulkan arah dari tanda nilainya, bukan dari kalimat tetap", () => {
    const digest = digestFor(citations.foreign("ANTM"));
    const net = brokerEvidence.ANTM.netForeign;
    expect(digest?.takeaway).toContain(net >= 0 ? "pembelian asing yang tidak diimbangi" : "penjualan asing yang tidak diimbangi");
    // The reader is told what the figure does not settle, not just what it is.
    expect(digest?.takeaway).toContain("tidak menyebut siapa pembelinya");
    expect(digest?.values.find((entry) => entry.label === "Arus asing bersih")?.value.startsWith("−")).toBe(net < 0);
  });

  it("ringkasan broker memakai porsi pembeli terbesar terhadap kelompok yang dibaca", () => {
    const digest = digestFor(citations.broker("ANTM"));
    const buyers = brokerEvidence.ANTM.buyers.map((participant) => participant.buyIdr ?? participant.value);
    const expected = (Math.max(...buyers) / buyers.reduce((sum, value) => sum + value, 0)) * 100;
    // Stated as rupiah out of a hundred, and read against the app's own
    // concentration floor rather than left for the reader to judge.
    expect(digest?.takeaway).toContain(`Rp ${expected.toFixed(2).replace(".", ",")}`);
    expect(digest?.takeaway).toContain(expected / 100 >= DEFAULT_THRESHOLDS.concentrationFloor ? "Di atas ambang" : "Di bawah ambang");
  });

  it("keterbukaan tanpa rekaman mengatakannya, bukan mengarang nol transaksi", () => {
    const digest = digestFor(citations.filing("ANTM"));
    expect(digest?.scope).toContain("Tidak ada keterbukaan");
    expect(digest?.values).toHaveLength(0);
  });

  it("setiap ringkasan menyebut kenapa bacaannya penting, bukan hanya artinya", () => {
    // Knowing that foreign buying was 3% of turnover is not a reason to read
    // the card. Each digest has to say what the reading decides or what
    // mistake it prevents, or the panel is back to reciting arithmetic.
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
      expect(digest?.why, citation.id).toBeDefined();
      expect(digest?.why.length, citation.id).toBeGreaterThan(40);
      expect(digest?.why, citation.id).not.toBe(digest?.takeaway);
    }
  });

  it("feed tanpa rekaman per emiten tidak memaksakan ringkasan", () => {
    // The broker registry is a market-wide list; this app keeps no per-symbol
    // recording of it, so the card shows only what it can support.
    expect(digestFor(citations.registry)).toBeUndefined();
    expect(digestFor(citations.news("news-1"))).toBeUndefined();
  });
});
