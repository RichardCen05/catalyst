import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { safeLanguage } from "@/lib/agent/gates";
import { resolveFollowUp } from "@/lib/agent/retrieval/follow-up";
import { unrecordedTickers } from "@/lib/agent/unknown-symbols";
import { chatRequestSchema } from "@/lib/schemas";
import { demoProfiles } from "@/lib/data/fixtures";
import { SYMBOL_CODES } from "@/lib/data/symbols.generated";

const profile = demoProfiles[0];
const ask = (question: string, extra: Record<string, unknown> = {}) =>
  agentEngine.answerFollowUp({ question, profile, ...extra } as Parameters<typeof agentEngine.answerFollowUp>[0]);

/**
 * What a question is allowed to get back.
 *
 * Every case here was a live answer the deployed service gave on 2026-09-23:
 * a ticker nobody recorded returned 200 with a fabricated entry id, a request
 * for next month's price was answered with this month's revenue, and a
 * question about a minute was answered with a daily figure. A sentence that
 * reads well is not evidence; the assertions below name the material.
 */
describe("apa yang boleh dijawab", () => {
  describe("kode emiten diperiksa di tepi", () => {
    const body = (extra: Record<string, unknown>) => ({ question: "apa isi kasus ini", profile, ...extra });

    it("menolak kode yang tidak ada pada rekaman", () => {
      // `XXXX` lolos panjang 4-5 dan membuat `case:XXXX`, lalu jawabannya
      // ditulis tentang emiten lain yang kebetulan berperingkat berikutnya.
      expect(chatRequestSchema.safeParse(body({ contextSymbol: "XXXX" })).success).toBe(false);
      expect(chatRequestSchema.safeParse(body({ contextSymbol: "ZZZZZ" })).success).toBe(false);
      expect(chatRequestSchema.safeParse(body({ contextSymbol: "GARU" })).success).toBe(false);
    });

    it("menerima kode yang terekam", () => {
      expect(chatRequestSchema.safeParse(body({ contextSymbol: "ANTM" })).success).toBe(true);
      expect(chatRequestSchema.safeParse(body({ contextSymbol: "antm" })).success).toBe(true);
    });

    it("menolak daftar pantauan berisi kode karangan", () => {
      const parsed = chatRequestSchema.safeParse({
        question: "apa isi dashboard",
        profile: { ...profile, watchlist: [...profile.watchlist, "XXXX"] },
      });
      expect(parsed.success).toBe(false);
    });
  });

  describe("permintaan yang tidak bisa dijawab rekaman", () => {
    const refusal = (question: string) => safeLanguage(question);

    it("menolak saran transaksi", () => {
      expect(refusal("sebaiknya saya beli ANTM sekarang atau tidak").kind).toBe("advice");
      expect(refusal("portofolio saya sebaiknya dialokasikan berapa persen ke energi").kind).toBe("advice");
    });

    it("menolak perkiraan harga dan peristiwa yang belum terjadi", () => {
      expect(refusal("target harga ANTM bulan depan berapa").kind).toBe("forecast");
      expect(refusal("prediksi IHSG minggu depan").kind).toBe("forecast");
      expect(refusal("apakah saham ini akan naik").kind).toBe("forecast");
      expect(refusal("kapan ANTM akan mengumumkan dividen berikutnya").kind).toBe("forecast");
    });

    it("mengatakan resolusi intrahari tidak direkam", () => {
      const verdict = refusal("berapa volume intraday ANTM jam 10 pagi tadi");
      expect(verdict.kind).toBe("absent");
      expect(verdict.text).toContain("harian");
    });

    it("tidak menolak pertanyaan tentang panel yang memang ada", () => {
      // Halaman AI Learning mencetak "Ringkasan prediksi", dan metode
      // mencetak "Data intrahari belum tersedia". Menolak kata-kata itu
      // berarti menolak aplikasi menjelaskan layarnya sendiri.
      expect(refusal("apa isi ringkasan prediksi").refused).toBe(false);
      expect(refusal("konteks apa yang belum masuk").refused).toBe(false);
      expect(refusal("berapa nilai beli broker teratas ANTM").refused).toBe(false);
    });

    it("melaporkan kekosongan data sebagai data yang belum ada, bukan sebagai penolakan kebijakan", async () => {
      const answer = await ask("berapa volume intraday ANTM jam 10 pagi tadi");
      expect(answer.refused).toBe(true);
      expect(answer.intent).toBe("missing");
    });
  });

  describe("nama yang tidak terekam", () => {
    it("menemukan kode berbentuk ticker yang tidak ada di registri", () => {
      expect(unrecordedTickers("kenapa GARUDA masuk peta sebab akibat")).toEqual(["GARUDA"]);
      expect(unrecordedTickers("kenapa TESLA ada di dashboard")).toEqual(["TESLA"]);
    });

    it("tidak salah menuduh kata besar yang bukan ticker", () => {
      expect(unrecordedTickers("APA ISI DASHBOARD")).toEqual([]);
      expect(unrecordedTickers("berapa imbal hasil IHSG")).toEqual([]);
      expect(unrecordedTickers("kenapa ANTM masuk daftar")).toEqual([]);
      expect(unrecordedTickers("apa hasil RUPS ADRO")).toEqual([]);
    });

    it("menyebut namanya lalu mengatakan rekaman tidak memuatnya", async () => {
      const answer = await ask("kenapa GARUDA masuk peta sebab akibat");
      expect(answer.intent).toBe("missing");
      expect(answer.text).toContain("GARUDA");
      expect(answer.text).toContain("tidak terekam");
      expect(answer.text).toContain(String(SYMBOL_CODES.length));
    });
  });

  describe("kata ganti tanpa rujukan", () => {
    it("menghitung kata ganti sebagai penunjuk meski belum ada giliran sebelumnya", () => {
      const resolved = resolveFollowUp("kenapa dia naik", []);
      expect(resolved.anaphoric).toBe(true);
      expect(resolved.resolved).toBe(false);
    });

    it("bertanya balik alih-alih menjawab tentang entri mana pun", async () => {
      const answer = await ask("kenapa dia naik");
      expect(answer.intent).toBe("clarify");
    });

    it("memakai rujukan ketika giliran sebelumnya menyebut satu emiten", () => {
      const resolved = resolveFollowUp("kenapa itu penting", [
        { role: "user", text: "kenapa ANTM masuk daftar" },
        { role: "assistant", text: "ANTM masuk karena arus asing neto tercatat.", symbols: ["ANTM"] },
      ]);
      expect(resolved.resolved).toBe(true);
      expect(resolved.symbol).toBe("ANTM");
    });
  });

  describe("halaman yang disebut pertanyaan", () => {
    it("menjawab tentang dashboard walau pembaca sedang di halaman lain", async () => {
      // Kasus yang paling sering salah: dari /impact, "apa isi dashboard"
      // dijawab dengan lonjakan liputan BBCA/BBRI/BMRI/BUKA/TLKM, karena
      // peristiwa itu milik halaman tempat pembaca berdiri dan menang pada
      // seri kata. Halaman yang disebut mengalahkan halaman yang ditempati.
      const answer = await ask("apa isi dashboard", { view: "impact" });
      expect((answer.entryIds ?? [])[0]).toBe("view:dashboard");
    });

    it("bertahan pada satu ketukan yang salah", async () => {
      const answer = await ask("apa isi dashbord", { view: "impact" });
      expect(answer.entryIds ?? []).toContain("view:dashboard");
    });

    it("tetap menjawab tentang peta sebab akibat dari dashboard", async () => {
      const answer = await ask("apa isi peta sebab akibat", { view: "dashboard" });
      expect(answer.entryIds ?? []).toContain("view:impact");
    });
  });

  describe("ambang berlaku untuk seluruh aplikasi", () => {
    it("menjawab nilai ambang alih-alih menanyakan kasus mana", async () => {
      const answer = await ask("berapa ambang relevansi rantai yang dipakai");
      expect(answer.intent).not.toBe("clarify");
      // Grounded in material that is actually about the cut-off — the table
      // entry itself, or the panel on screen that names it.
      expect((answer.entryIds ?? []).some((id) => id.startsWith("threshold:") || id.includes("ambang"))).toBe(true);
    });
  });
});
