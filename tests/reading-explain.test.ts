import { describe, expect, it } from "vitest";
import { explainReadingWithLlm } from "@/lib/agent/llm/reading-explain";
import { digestFor } from "@/lib/data/recording-digest";
import { citations } from "@/lib/data/fixtures";

/**
 * The two sentences on an evidence card are provenance, so the guards around
 * them are the feature. A model that invents a percentage, names an emiten in
 * a line cached for every emiten, or turns a reading into a recommendation
 * has made the panel less trustworthy than the bare figures it sits on.
 */
const digest = digestFor(citations.foreign("ANTM"));
if (!digest) throw new Error("fixture digest missing for /v2/foreign-flow/");

const input = { endpoint: "/v2/foreign-flow/{symbol}/", fieldGloss: "tanggal, arus asing bersih harian", digest };

const stub = (takeaway: string, why: string) => async () => ({ takeaway, why }) as never;

const GOOD_WHY = "Arah uang asing sering dipakai sebagai alasan membeli, jadi ukurannya perlu terlihat sebelum dipakai memutuskan.";

describe("kalimat tafsir bacaan", () => {
  it("meneruskan cakupan, nilai, dan pembanding ke model", async () => {
    let contents = "";
    await explainReadingWithLlm(input, (async (params: { contents: string }) => {
      contents = params.contents;
      return { takeaway: "Sebagian kecil perpindahan uang berasal dari pembelian asing yang tidak diimbangi penjualan.", why: GOOD_WHY };
    }) as never);
    expect(contents).toContain(digest.scope);
    expect(contents).toContain("Arah arus asing");
    // The bound on what the feed can say travels too, so the model is not
    // left to decide how far the reading reaches.
    expect(contents).toContain("Batas arti rekaman");
  });

  it("menolak angka yang tidak ada pada bahan", async () => {
    await expect(explainReadingWithLlm(input, stub("Arus asing menyumbang 47% dari transaksi.", GOOD_WHY) as never))
      .rejects.toThrow(/rejected/);
  });

  it("menolak saran transaksi", async () => {
    await expect(explainReadingWithLlm(input, stub("Pembelian asing masih tersebar.", "Sebaiknya beli saat asing masuk agar tidak tertinggal momentum.") as never))
      .rejects.toThrow(/saran transaksi/);
  });

  it("menolak kalimat yang menyebut satu emiten", async () => {
    await expect(explainReadingWithLlm(input, stub("Pembelian asing pada ANTM tidak diimbangi penjualan.", GOOD_WHY) as never))
      .rejects.toThrow(/menyebut satu emiten/);
  });

  it("menolak kalimat yang bercerita soal pipa datanya", async () => {
    await expect(explainReadingWithLlm(input, stub("Endpoint ini mengembalikan arus asing harian.", GOOD_WHY) as never))
      .rejects.toThrow(/pipa/);
  });

  it("menerima kalimat yang hanya memakai angka dari bahan", async () => {
    // The figure comes from the digest, not from a literal: it is a ratio of
    // two recorded sums, so it moves on every data refresh. Typing it here
    // meant this test failed the day the window advanced — reporting a stale
    // test as a broken guard.
    const perHundred = digest.context.find((item) => item.label === "Porsi yang sama dalam rupiah")?.value;
    if (!perHundred) throw new Error("digest is missing the per-hundred reading this test is about");
    const drafted = await explainReadingWithLlm(
      input,
      stub(`  Sekitar ${perHundred} yang berpindah tangan adalah pembelian asing yang tidak diimbangi penjualan; rekaman ini tidak menyebut siapa pembelinya.  `, GOOD_WHY) as never,
    );
    expect(drafted.takeaway.startsWith(`Sekitar ${perHundred}`)).toBe(true);
    expect(drafted.why).toBe(GOOD_WHY);
  });
});
