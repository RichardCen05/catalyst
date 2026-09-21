import { describe, expect, it } from "vitest";
import { writeTodayFactWithLlm } from "@/lib/agent/llm/today-fact";
import { digestFor } from "@/lib/data/recording-digest";
import { citations } from "@/lib/data/fixtures";

/**
 * The launcher speaks before anybody has asked it anything, so its one line is
 * the least supervised sentence in the app: nobody opened a panel to see it and
 * nobody clicked a citation beside it. The guards are therefore the feature. A
 * model that invents a figure, names a second emiten, explains a cause the
 * recording never recorded, or turns a greeting into a recommendation must
 * leave the bubble saying nothing rather than saying that.
 */
const digest = digestFor(citations.daily("ANTM"));
if (!digest) throw new Error("fixture digest missing for /v2/daily/");

const input = { symbol: "ANTM", digest };

const stub = (fact: string) => (async () => ({ fact })) as never;

/** Figures that really are in the daily digest for this emiten. */
const CLOSE = digest.values[0].value;
const RATIO = digest.context[0].value;

describe("sapaan fakta hari ini", () => {
  it("meneruskan kode emiten, cakupan, nilai, dan pembanding ke model", async () => {
    let contents = "";
    await writeTodayFactWithLlm(input, (async (params: { contents: string }) => {
      contents = params.contents;
      return { fact: `Hari ini ANTM ditutup ${CLOSE}, volumenya ${RATIO} median sesi pembanding.` };
    }) as never);
    expect(contents).toContain("Kode emiten: ANTM");
    expect(contents).toContain(digest.scope);
    expect(contents).toContain(CLOSE);
    // The bound on what the recording can say travels with the figures, so the
    // model is never asked to fill that gap from its own knowledge.
    expect(contents).toContain("Batas arti rekaman");
  });

  it("menerima kalimat yang hanya memakai angka dari rekaman", async () => {
    const written = await writeTodayFactWithLlm(input, stub(`Hai, ANTM ditutup ${CLOSE} pada sesi terakhir rekaman.`));
    expect(written.fact).toContain("ANTM");
    expect(written.fact).toContain(CLOSE);
  });

  it("menolak angka yang tidak ada pada rekaman", async () => {
    await expect(writeTodayFactWithLlm(input, stub("Hari ini ANTM naik 42% sejak awal jendela."))).rejects.toThrow(/42/);
  });

  it("menolak kalimat tanpa kode emiten yang diminta", async () => {
    await expect(writeTodayFactWithLlm(input, stub(`Emiten ini ditutup ${CLOSE} pada sesi terakhir.`))).rejects.toThrow(/tidak menyebut ANTM/);
  });

  it("menolak kalimat yang menyeret emiten lain", async () => {
    await expect(writeTodayFactWithLlm(input, stub(`ANTM ditutup ${CLOSE}, sementara PGAS ikut ramai.`))).rejects.toThrow(/emiten lain/);
  });

  it("menolak saran transaksi", async () => {
    await expect(writeTodayFactWithLlm(input, stub(`ANTM ditutup ${CLOSE}, target harga berikutnya menarik.`))).rejects.toThrow(/saran transaksi/);
  });

  it("menolak sebab yang tidak direkam", async () => {
    await expect(writeTodayFactWithLlm(input, stub(`ANTM ditutup ${CLOSE} karena permintaan emas melonjak.`))).rejects.toThrow(/sebab/);
  });

  it("menolak kalimat yang menyebut pipa", async () => {
    await expect(writeTodayFactWithLlm(input, stub(`Endpoint harian ANTM mencatat penutupan ${CLOSE}.`))).rejects.toThrow(/pipa/);
  });

  it("menolak kalimat yang terlalu panjang untuk gelembungnya", async () => {
    const padding = Array.from({ length: 30 }, () => "sesi").join(" ");
    await expect(writeTodayFactWithLlm(input, stub(`ANTM ditutup ${CLOSE} ${padding}`))).rejects.toThrow(/lebih panjang/);
  });

  it("menolak kalimat kosong", async () => {
    await expect(writeTodayFactWithLlm(input, stub("   "))).rejects.toThrow(/kosong/);
  });
});
