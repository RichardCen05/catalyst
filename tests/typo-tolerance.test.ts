import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { companies, demoProfiles } from "@/lib/data/fixtures";
import { answerableFigures, matchFigure } from "@/lib/agent/explain";
import { findSymbolsRobust } from "@/lib/agent/query";
import { fuzzyIncludes, phraseMatches } from "@/lib/text/fuzzy";
import { extractNumerals } from "@/lib/agent/llm/verify";

const profile = demoProfiles[0];
const ask = (question: string) => agentEngine.answerFollowUp({ question, profile, contextSymbol: "ANTM" });

async function figures() {
  const analysis = await agentEngine.analyzeCompany("ANTM", profile);
  if (!analysis) throw new Error("ANTM case is recorded");
  return answerableFigures(analysis);
}

describe("satu huruf salah tidak menghapus jawaban", () => {
  // The reported failure, verbatim: one missing letter in "peserta" and one
  // in "menghitungnya" turned the explanation into the "belum jelas angka
  // mana" menu, about a figure printed on the same screen.
  it("menjawab pertanyaan dengan typo persis seperti yang dilaporkan", async () => {
    const answer = await ask("dari mana sumber pesert efektif dan bagaimana cara menghitungnua");
    expect(answer.text).not.toMatch(/Belum jelas angka mana/);
    expect(answer.text).toContain("Peserta efektif");
    expect(answer.text).toContain("Cara hitung:");
  });

  it("pertanyaan yang salah eja berat tetap sampai ke angkanya", async () => {
    for (const [question, expected] of [
      ["dari mna sumbr pserta efektif", "Peserta efektif"],
      ["jelasin porsi pesrta teratas dong", "Porsi peserta teratas"],
      ["cara hitng saham publik terserab gmn", "Saham publik terserap"],
      ["where dos free flaot come frm", "Saham publik terserap"],
      ["wat is skor z tahn pencilan", "Skor z tahan pencilan"],
      ["imbal hsil 3 hri itu apa", "Imbal hasil 3 hari"],
      ["brp volume terbru nya", "Volume terbaru"],
      ["residual setelh beta artiny apa", "Residual setelah beta"],
      ["prubahan harga harin brp", "Perubahan harga harian"],
    ] as const) {
      const answer = await ask(question);
      expect(answer.text, question).not.toMatch(/Belum jelas angka mana|tidak ada informasi/i);
      expect(answer.text, question).toContain(expected);
    }
  });

  it("intent tetap benar walau kata kuncinya salah eja", async () => {
    for (const [question, intent] of [
      ["knapa ANTM masuk daftar", "why-listed"],
      ["data apa yg blum diperiksa", "missing"],
      ["brita terbaru ANTM apa dampaknya", "event-impact"],
      ["sumbr dta kamu apa aja", "provenance"],
    ] as const) {
      expect((await ask(question)).intent, question).toBe(intent);
    }
  });

  // A pillar name covers four figures, so it must never outrank a metric
  // name the reader misspelled.
  it("nama pilar kalah dari label angka yang salah eja", async () => {
    const list = await figures();
    expect(matchFigure(list, "brp volume terbru nya", extractNumerals)?.metric.label).toBe("Volume terbaru");
  });

  // Where the label puts its spaces is this app's choice, not something the
  // reader can be expected to reproduce.
  it("spasi di tempat lain tetap menemukan angkanya", async () => {
    for (const [question, expected] of [
      ["pesertaefektif", "Peserta efektif"],
      ["sahampublik terserap", "Saham publik terserap"],
      ["imbalhasil 3 hari", "Imbal hasil 3 hari"],
      ["imbal hasil3hari", "Imbal hasil 3 hari"],
    ] as const) {
      expect((await ask(question)).text, question).toContain(expected);
    }
  });

  it("pertanyaan di luar rekaman tetap ditolak, bukan ditebak", async () => {
    for (const question of ["asdkjh qweoiu", "resep nasi goreng", "cuaca besok gimana"]) {
      expect((await ask(question)).intent, question).toBe("unknown");
    }
  });

  it("urutan kata tidak mengubah jawaban", () => {
    expect(phraseMatches("imbal hasil 3 hari itu apa", "apa itu")).toBe(true);
  });

  it("frasa pendek tetap dicocokkan persis", () => {
    // One edit away from "hhi" is a different term, not a typo worth guessing.
    expect(phraseMatches("apa itu hh", "hhi")).toBe(false);
    expect(phraseMatches("apa itu beta", "beta")).toBe(true);
  });

  it("kata yang tidak mirip tetap tidak cocok", async () => {
    const list = await figures();
    expect(matchFigure(list, "bagaimana cuaca hari ini", extractNumerals)).toBeUndefined();
  });
});

describe("kotak pencarian memaafkan typo yang sama", () => {
  const symbols = companies.map((company) => company.symbol);

  it("kode dan nama emiten yang salah eja tetap ditemukan", () => {
    expect(findSymbolsRobust("kenapa antmm naik", symbols)).toContain("ANTM");
    expect(findSymbolsRobust("berita bukalapk", symbols)).toContain("BUKA");
    expect(findSymbolsRobust("aneka tamban gimana", symbols)).toContain("ANTM");
  });

  it("emiten yang tidak disebut tidak ikut terbawa", () => {
    expect(findSymbolsRobust("bagaimana cuaca hari ini", symbols)).toEqual([]);
    expect(findSymbolsRobust("kenapa antmm naik", symbols)).not.toContain("AMRT");
  });

  it("filter daftar menerima awalan dan salah ketik", () => {
    expect(fuzzyIncludes("ANTM Aneka Tambang Basic Materials", "ant")).toBe(true);
    expect(fuzzyIncludes("ANTM Aneka Tambang Basic Materials", "tambag")).toBe(true);
    expect(fuzzyIncludes("ANTM Aneka Tambang Basic Materials", "bukalapak")).toBe(false);
  });
});
