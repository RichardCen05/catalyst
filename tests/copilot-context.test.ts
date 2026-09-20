import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";
import { resolveContext, symbolFromRoute } from "@/lib/agent/route-context";

const profile = demoProfiles[0];
const ask = (question: string, contextSymbol?: "ANTM" | "PGAS") =>
  agentEngine.answerFollowUp({ question, profile, ...(contextSymbol ? { contextSymbol } : {}) });

describe("konteks diturunkan dari rute", () => {
  it("membaca emiten dari halaman kasus dan halaman emiten", () => {
    expect(symbolFromRoute("/cases/ANTM")).toBe("ANTM");
    expect(symbolFromRoute("/cases/antm")).toBe("ANTM");
    expect(symbolFromRoute("/companies/PGAS")).toBe("PGAS");
  });

  it("membaca emiten dari query yang dipakai /impact dan /compare", () => {
    expect(symbolFromRoute("/impact", "company=ANTM")).toBe("ANTM");
    expect(symbolFromRoute("/impact", "case=PGAS")).toBe("PGAS");
    // Only the first of a comparison. One context symbol, one case.
    expect(symbolFromRoute("/compare", "symbols=ANTM%2CBBCA")).toBe("ANTM");
    expect(symbolFromRoute("/cases", "compare=PGAS,ANTM")).toBe("PGAS");
  });

  it("tidak menebak emiten dari rute yang tidak menyebutnya", () => {
    expect(symbolFromRoute("/")).toBeUndefined();
    expect(symbolFromRoute("/pantau")).toBeUndefined();
    expect(symbolFromRoute("/cases/XXXX")).toBeUndefined();
    expect(symbolFromRoute("/impact", "company=XXXX")).toBeUndefined();
    expect(symbolFromRoute("/impact", "company=%E0%A4%A")).toBeUndefined();
  });
});

describe("pilihan pembaca mengalahkan rute", () => {
  it("rute dipakai hanya ketika pembaca belum memilih apa pun", () => {
    expect(resolveContext(null, "ANTM")).toEqual({ label: "ANTM", question: "", symbol: "ANTM" });
    expect(resolveContext(null, null)).toBeNull();
  });

  it("kasus dari picker bertahan saat pembaca pindah halaman", () => {
    const picked = { label: "PGAS", question: "", symbol: "PGAS" as const };
    expect(resolveContext(picked, "ANTM")).toEqual(picked);
  });

  it('"Tanpa kasus" adalah pilihan, bukan konteks kosong', () => {
    const none = { label: "Tanpa kasus", question: "" };
    expect(resolveContext(none, "ANTM")).toEqual(none);
    expect(resolveContext(none, "ANTM")?.symbol).toBeUndefined();
  });
});

describe("konteks yang dipilih mengarahkan jawaban", () => {
  it("emiten dari picker dipakai ketika pertanyaan tidak menyebut emiten", async () => {
    const answer = await ask("kenapa emiten ini masuk daftar hari ini?", "PGAS");
    expect(answer.relatedSymbols).toEqual(["PGAS"]);
    expect(answer.text).toContain("PGAS");
  });
});

describe("pertanyaan menarik konteks ke emiten yang dijawab", () => {
  it("melaporkan emiten yang disebut pertanyaan, bukan yang ada di chip", async () => {
    const answer = await ask("PGAS hhi brp", "ANTM");
    // The engine already answers about PGAS; without this the chip kept
    // saying ANTM next to a PGAS answer.
    expect(answer.questionSymbol).toBe("PGAS");
    expect(answer.relatedSymbols).toEqual(["PGAS"]);
  });

  it("tidak melaporkan emiten ketika pertanyaan tidak menyebut satu pun", async () => {
    const answer = await ask("apa itu HHI", "ANTM");
    expect(answer.questionSymbol).toBeUndefined();
    expect(answer.relatedSymbols).toEqual(["ANTM"]);
  });
});

describe("pertanyaan tanpa kasus ditanyakan balik, bukan ditebak", () => {
  it("menanyakan kasus mana ketika pertanyaan menyebut angka tetapi tidak menyebut emiten", async () => {
    const answer = await ask("hhi berapa");
    expect(answer.intent).toBe("clarify");
    expect(answer.refused).toBe(false);
    expect(answer.text).toContain("Kasus mana");
    expect(answer.clarification?.question).toBe("hhi berapa");
    expect(answer.clarification?.choices).toEqual(profile.watchlist.slice(0, 6));
    // Nothing invented while the case is unresolved.
    expect(answer.citations).toEqual([]);
    expect(answer.relatedSymbols).toEqual([]);
    expect(answer.text).not.toMatch(/\d+,\d+%/);
  });

  it("pilihan pembaca mengirim ulang pertanyaan asli dengan emiten terpasang", async () => {
    const clarify = await ask("hhi berapa");
    const resent = await ask(clarify.clarification!.question, "ANTM");
    expect(resent.intent).toBe("explain");
    expect(resent.text).toContain("HHI");
    expect(resent.citations.length).toBeGreaterThan(0);
  });

  it("pertanyaan angka polos tidak dijawab dari peristiwa yang kebetulan cocok", async () => {
    // Live regression: "berapa nilai hhi nya" without a case reached the event
    // branch — `namedFigure` needs an analysis to outrank a loosely matched
    // event, and there is none — and the rewrite layer answered from that
    // event's figures with "Nilai HHI tidak tersedia".
    for (const question of ["berapa nilai hhi nya", "porsi asing berapa", "volume terbaru brp"]) {
      const answer = await ask(question);
      expect(answer.intent, question).toBe("clarify");
      expect(answer.citations, question).toEqual([]);
      expect(answer.text, question).not.toMatch(/tidak tersedia/i);
    }
  });

  it("pertanyaan yang memang tentang peristiwa tetap dijawab sebagai peristiwa", async () => {
    const answer = await ask("apa dampak berita itu ke pantauan saya");
    expect(answer.intent).toBe("event-impact");
  });

  it("omong kosong tetap mendapat daftar kemampuan, bukan pertanyaan balik", async () => {
    // The clarifying turn replaces a guess, not the refusal. A question that
    // named nothing recognisable has no case to pick.
    const answer = await ask("xyz qwerty zzzz");
    expect(answer.intent).toBe("unknown");
    expect(answer.text).toContain("belum bisa dipetakan ke bukti");
  });
});
