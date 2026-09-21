import { describe, expect, it } from "vitest";
import { answerCacheKey } from "@/lib/agent/retrieval/answer-cache";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";

describe("answerCacheKey", () => {
  it("stabil untuk masukan yang sama", () => {
    expect(answerCacheKey("kenapa ANTM", "bundel A", "m")).toBe(answerCacheKey("kenapa ANTM", "bundel A", "m"));
  });

  it("berbeda ketika bundelnya berbeda, jadi dua daftar pantauan tidak pernah berbagi jawaban", () => {
    // Ini yang menutup kebocoran lintas profil secara konstruksi: daftar
    // pantauan berbeda menghasilkan bundel berbeda, jadi kuncinya berbeda.
    expect(answerCacheKey("kenapa ANTM", "bundel A", "m"))
      .not.toBe(answerCacheKey("kenapa ANTM", "bundel B", "m"));
  });

  it("berbeda ketika modelnya berbeda", () => {
    expect(answerCacheKey("kenapa ANTM", "bundel A", "lite"))
      .not.toBe(answerCacheKey("kenapa ANTM", "bundel A", "flash"));
  });

  it("mengabaikan huruf besar dan spasi berlebih pada pertanyaan", () => {
    expect(answerCacheKey("Kenapa   ANTM", "b", "m")).toBe(answerCacheKey("kenapa antm", "b", "m"));
  });

  it("berbeda ketika pertanyaannya berbeda walau bundelnya sama", () => {
    expect(answerCacheKey("kenapa ANTM", "b", "m")).not.toBe(answerCacheKey("apa itu HHI", "b", "m"));
  });
});

describe("memo analisis", () => {
  it("mengembalikan kasus yang setara untuk permintaan berulang", async () => {
    const profile = demoProfiles[0];
    const first = await agentEngine.analyzeCompany("ANTM", profile);
    const second = await agentEngine.analyzeCompany("ANTM", profile);
    expect(first).not.toBeNull();
    expect(second?.company.symbol).toBe(first?.company.symbol);
    expect(second?.pillars.length).toBe(first?.pillars.length);
  });

  it("tidak mencampur dua emiten", async () => {
    const profile = demoProfiles[0];
    const antm = await agentEngine.analyzeCompany("ANTM", profile);
    const pgas = await agentEngine.analyzeCompany("PGAS", profile);
    expect(antm?.company.symbol).toBe("ANTM");
    expect(pgas?.company.symbol).toBe("PGAS");
  });

  it("menyimpan null tanpa membangun ulang emiten tanpa kasus lengkap", async () => {
    const profile = demoProfiles[0];
    const first = await agentEngine.analyzeCompany("BBCA", profile);
    const second = await agentEngine.analyzeCompany("BBCA", profile);
    expect(first).toBe(second);
  });
});
