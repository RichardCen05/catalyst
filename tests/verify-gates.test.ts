import { describe, expect, it } from "vitest";
import { detectLanguage, verifyAnswer } from "@/lib/agent/llm/verify";
import { safeLanguage } from "@/lib/agent/gates";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

describe("detectLanguage", () => {
  it("names Indonesian and English from function words", () => {
    expect(detectLanguage("Konsentrasi ini tinggi karena tiga broker yang sama")).toBe("id");
    expect(detectLanguage("The concentration is high because the same three brokers")).toBe("en");
  });

  it("returns unknown when nothing decides it", () => {
    expect(detectLanguage("ANTM 27,5%")).toBe("unknown");
  });

  it("reads the interrogative when it is the only grammar word", () => {
    // "Kenapa ANTM masuk daftar?" carries no other function word. Without the
    // interrogative the question reads as unknown and an English draft slips
    // through verification unchallenged.
    expect(detectLanguage("Kenapa ANTM masuk daftar?")).toBe("id");
    expect(detectLanguage("Why is ANTM listed?")).toBe("en");
  });
});

describe("verifyAnswer", () => {
  const question = "Kenapa ANTM masuk daftar hari ini?";

  it("approves a grounded Indonesian answer", () => {
    const result = verifyAnswer("Konsentrasi broker ANTM mencapai 27,5% pada rekaman ini.", ["27,5%"], question);
    expect(result.approved).toBe(true);
  });

  it("rejects a numeral the evidence never carried", () => {
    const result = verifyAnswer("Konsentrasi broker mencapai 91,4% pada rekaman ini.", ["27,5%"], question);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("91,4%");
  });

  it("rejects advisory phrasing the numeral rule cannot see", () => {
    const result = verifyAnswer("Konsentrasi ini tinggi, sebaiknya beli sekarang.", [], question);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("advisory");
  });

  it("rejects an English answer to an Indonesian question", () => {
    const result = verifyAnswer("The concentration is high because the same brokers repeat.", [], question);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("language");
  });

  it("allows an English answer to an English question", () => {
    const result = verifyAnswer("The concentration is high because the same brokers repeat.", [], "Why is ANTM listed today?");
    expect(result.approved).toBe(true);
  });

  it("approves an answer exactly at the sentence cap and rejects one past it", () => {
    const words = ["pertama", "kedua", "ketiga", "keempat", "kelima"];
    const at = words.slice(0, DEFAULT_THRESHOLDS.answerMaxSentences)
      .map((word) => `Kalimat ${word} menyebut konsentrasi pada rekaman.`).join(" ");
    expect(verifyAnswer(at, ["27,5%"], question).approved).toBe(true);

    const past = `${at} Kalimat kelima masih ada di draf.`;
    const result = verifyAnswer(past, ["27,5%"], question);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("sentences");
  });
});

describe("safeLanguage mengenali bentuk berimbuhan", () => {
  it("menolak ajakan transaksi dalam bentuk yang benar-benar dipakai orang", () => {
    for (const question of [
      "ANTM bagus untuk dibeli sekarang?",
      "apakah saya harus membeli ANTM",
      "sebaiknya dijual atau ditahan",
      "kapan waktu menjual PGAS",
      "ANTM beli sekarang?",
    ]) {
      expect(safeLanguage(question).refused, question).toBe(true);
    }
  });

  it("tidak menolak pertanyaan tentang kolom rekaman yang memuat kata transaksi", () => {
    // "nilai beli" adalah nama kolom pada rekaman broker. Pembaca yang
    // menanyakan angka di layarnya tidak sedang meminta saran.
    for (const question of [
      "berapa nilai beli broker teratas ANTM",
      "porsi nilai beli bersih asing",
      "berapa total pembelian institusi",
      "bagaimana penjualan kuartal ini",
    ]) {
      expect(safeLanguage(question).refused, question).toBe(false);
    }
  });

  it("tetap menolak ketika kata transaksi berdiri sendiri tanpa konteks kolom", () => {
    // "rasio volume jual terhadap beli" sebenarnya pertanyaan data, tetapi
    // "beli" di ujung kalimat tidak bisa dibedakan dari ajakan secara leksikal.
    // Menolak pertanyaan data masih bisa dipulihkan pembaca dengan mengganti
    // kalimat; meloloskan saran transaksi tidak.
    expect(safeLanguage("rasio volume jual terhadap beli").refused).toBe(true);
  });
});
