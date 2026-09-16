import { describe, expect, it } from "vitest";
import { mechanismLabelFor } from "@/lib/agent/engine";

describe("mechanismLabelFor", () => {
  it("prefers the label the model wrote", () => {
    expect(mechanismLabelFor("Arus asing ke likuiditas", "Kalimat panjang tanpa panah.", "flows"))
      .toBe("Arus asing ke likuiditas");
  });

  it("strips trailing punctuation from the model label", () => {
    expect(mechanismLabelFor("Harga emas ke margin.", "x", "commodity")).toBe("Harga emas ke margin");
  });

  it("falls back to the middle leg of an arrow-shaped path", () => {
    expect(mechanismLabelFor(undefined, "Harga komoditas → realisasi harga → margin", "commodity"))
      .toBe("realisasi harga");
  });

  it("falls back to a category label when the path is an LLM sentence", () => {
    const sentence = "Kenaikan harga acuan emas global meningkatkan harga jual rata-rata produk ANTM.";
    expect(mechanismLabelFor(undefined, sentence, "commodity")).toBe("Harga komoditas ke margin");
    expect(mechanismLabelFor("", sentence, "weather")).toBe("Cuaca ke volume operasi");
  });

  it("never returns the old generic placeholder for a known category", () => {
    const categories = ["company", "commodity", "rates", "currency", "policy", "weather", "flows", "sentiment"] as const;
    for (const category of categories) {
      expect(mechanismLabelFor(undefined, "kalimat tanpa panah", category)).not.toBe("Jalur eksposur");
    }
  });

  it("clips a long label at a word boundary", () => {
    const long = "Gangguan cuaca laut menahan jadwal pengapalan konsentrat dan menekan volume penjualan kuartal berikutnya";
    const result = mechanismLabelFor(long, "x", "weather");
    expect(result.length).toBeLessThanOrEqual(61);
    expect(result.endsWith("…")).toBe(true);
    expect(result).not.toMatch(/\s…$/);
  });
});
