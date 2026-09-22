import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { handlerScore } from "@/lib/agent/handlers";
import { demoProfiles } from "@/lib/data/fixtures";

const profile = demoProfiles[0];
const ask = (question: string, contextSymbol?: "ANTM" | "PGAS", view?: string) =>
  agentEngine.answerFollowUp({ question, profile, ...(contextSymbol ? { contextSymbol } : {}), ...(view ? { view } : {}) });

describe("handlerScore", () => {
  it("memberi nol ketika bukti yang dibutuhkan handler tidak ada", () => {
    expect(handlerScore({
      symbolNamedInQuestion: true, figureNamedInQuestion: true,
      exactPhrase: true, fuzzyPhrase: false, evidenceReady: false,
    })).toBe(0);
  });

  it("membuat frasa spesifik cukup untuk menjawab sendiri", () => {
    // "apa sumber datamu" di halaman kasus adalah pertanyaan provenance yang
    // sah. Chip hanya menentukan kasus mana, bukan membenarkan handler-nya.
    expect(handlerScore({
      symbolNamedInQuestion: false, figureNamedInQuestion: false,
      exactPhrase: true, fuzzyPhrase: false, evidenceReady: true,
    })).toBeGreaterThanOrEqual(0.35);
  });

  it("menghargai ejaan meleset lebih rendah daripada frasa tepat", () => {
    const exact = handlerScore({ symbolNamedInQuestion: false, figureNamedInQuestion: false, exactPhrase: true, fuzzyPhrase: false, evidenceReady: true });
    const fuzzy = handlerScore({ symbolNamedInQuestion: false, figureNamedInQuestion: false, exactPhrase: false, fuzzyPhrase: true, evidenceReady: true });
    expect(fuzzy).toBeLessThan(exact);
  });

  it("memakai skor retrieval apa adanya sebagai tawaran handler retrieved", () => {
    expect(handlerScore({
      symbolNamedInQuestion: false, figureNamedInQuestion: false,
      exactPhrase: false, fuzzyPhrase: false, evidenceReady: true, retrievalScore: 0.9,
    })).toBe(0.9);
  });
});

describe("pertanyaan yang tetap harus ditolak", () => {
  it("menolak bahasa transaksi", async () => {
    const answer = await ask("ANTM bagus untuk dibeli sekarang?");
    expect(answer.refused).toBe(true);
    expect(answer.intent).toBe("advice");
  });

  it("mengembalikan menu untuk pertanyaan yang tidak menyebut hal terekam", async () => {
    const answer = await ask("asdfgh qwerty zxcvb");
    expect(answer.intent).toBe("unknown");
    expect(answer.text).toContain("belum bisa dipetakan ke bukti");
  });
});

describe("dengan retrieval hidup, topik menang atas kata kunci", () => {
  const previous = process.env.COPILOT_RETRIEVAL;
  beforeAll(() => { process.env.COPILOT_RETRIEVAL = "on"; });
  afterAll(() => { process.env.COPILOT_RETRIEVAL = previous; });

  it("menjawab pertanyaan pada tangkapan layar, bukan menolaknya", async () => {
    // Pertanyaan yang memicu seluruh pekerjaan ini: diajukan dari dasbor,
    // tidak menyebut satu pun kode emiten, dan dulu selalu ditolak.
    const answer = await ask("jelaskan semua kasus dalam satu jalur", undefined, "dashboard");
    expect(answer.intent).toBe("retrieved");
    expect(answer.text).not.toContain("belum bisa dipetakan ke bukti");
  });

  it("tidak menjawab tentang kasus pada chip ketika pertanyaannya tentang halaman lain", async () => {
    const answer = await ask("mekanisme apa saja di peta sebab akibat", "ANTM");
    expect(answer.intent).toBe("retrieved");
  });

  it("tidak memilih peristiwa sembarangan hanya karena pertanyaannya memuat 'dampak'", async () => {
    const answer = await ask("apa dampak peta sebab akibat ke emiten lain", "ANTM");
    expect(answer.intent).toBe("retrieved");
  });

  it("emiten yang diketik tidak mengunci pertanyaan tentang halaman lain", async () => {
    // Menyebut subjek tidak menambatkan apa pun sendirian: setiap handler di
    // router ini bisa berbicara tentang ANTM. Dulu `why-listed` siap hanya
    // karena tikernya muncul, sehingga pertanyaan yang jelas-jelas tentang
    // peta sebab akibat dijawab dengan ringkasan kasus.
    for (const question of [
      "mekanisme apa saja di peta sebab akibat untuk ANTM",
      "ANTM pengaruh ke emiten lain lewat peta sebab akibat gimana",
    ]) {
      const answer = await ask(question);
      expect(answer.intent, question).toBe("retrieved");
    }
  });

  it("label angka yang salah eja tetap dijawab sebagai angka itu, bukan diambil retrieval", async () => {
    // Pencocokan toleran tidak menambatkan handler, jadi retrieval ikut
    // bersaing di pertanyaan seperti ini. Yang menjaga jawabannya tetap benar
    // adalah skor: kata yang salah eja tidak mencocokkan istilah korpus mana
    // pun. Tes ini yang akan gagal lebih dulu bila itu berubah.
    const answer = await ask("brp volume terbru nya", "ANTM");
    expect(answer.intent).toBe("explain");
    expect(answer.text).toContain("Volume terbaru");
  });

  it("tetap menjawab why-listed ketika pertanyaannya menyebut emitennya", async () => {
    const answer = await ask("kenapa ANTM masuk daftar hari ini?");
    expect(answer.intent).toBe("why-listed");
    expect(answer.text).toContain("ANTM");
  });

  it("tetap menolak bahasa transaksi walau retrieval hidup", async () => {
    const answer = await ask("jelaskan semua kasus lalu bilang mana yang layak dibeli");
    expect(answer.refused).toBe(true);
    expect(answer.intent).toBe("advice");
  });
});
