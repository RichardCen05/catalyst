import { describe, expect, it } from "vitest";
import { scoreCorpus } from "@/lib/agent/retrieval/score";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { demoProfiles } from "@/lib/data/fixtures";
import type { RequestContext } from "@/lib/agent/retrieval/types";

const base: RequestContext = { profile: demoProfiles[0], history: [] };

describe("scoreCorpus", () => {
  it("menemukan peta sebab akibat untuk pertanyaan yang diajukan dari dasbor", () => {
    // Pertanyaan pada tangkapan layar yang memicu pekerjaan ini. Dijawab
    // dengan penolakan karena tidak menyebut satu pun kode emiten.
    const ranked = scoreCorpus("jelaskan semua kasus dalam satu jalur", { ...base, view: "dashboard" });
    expect(ranked.length).toBeGreaterThan(0);
    expect(ranked.slice(0, 3).some((row) => row.entry.view === "impact" || row.entry.id === "view:cases")).toBe(true);
  });

  it("menempatkan kasus emiten yang disebut di atas kasus emiten lain", () => {
    const ranked = scoreCorpus("kenapa ANTM masuk daftar", base);
    const antm = ranked.findIndex((row) => row.entry.id === "case:ANTM");
    const pgas = ranked.findIndex((row) => row.entry.id === "case:PGAS");
    expect(antm).toBeGreaterThanOrEqual(0);
    expect(antm).toBeLessThan(pgas === -1 ? Number.MAX_SAFE_INTEGER : pgas);
  });

  it("tidak mengembalikan apa pun untuk pertanyaan yang tidak menyebut hal terekam", () => {
    expect(scoreCorpus("asdfgh qwerty zxcvb", base)).toHaveLength(0);
  });

  it("boost halaman mengurutkan ulang, tidak pernah mengecualikan", () => {
    // Pembaca di halaman peta sebab akibat tetap harus bisa bertanya tentang
    // satu emiten, dan sebaliknya.
    const fromImpact = scoreCorpus("kenapa ANTM masuk daftar", { ...base, view: "impact" });
    expect(fromImpact.some((row) => row.entry.id === "case:ANTM")).toBe(true);

    const fromCase = scoreCorpus("mekanisme apa saja di peta sebab akibat", { ...base, view: "case" });
    expect(fromCase.some((row) => row.entry.view === "impact")).toBe(true);
  });

  it("boost halaman menaikkan peringkat ketika pembaca ada di halaman itu", () => {
    const question = "mekanisme jalur dampak";
    const neutral = scoreCorpus(question, base).find((row) => row.entry.id === "view:impact");
    const onImpact = scoreCorpus(question, { ...base, view: "impact" }).find((row) => row.entry.id === "view:impact");
    expect(neutral).toBeDefined();
    expect(onImpact!.score).toBeGreaterThan(neutral!.score);
  });

  it("mengurutkan menurun", () => {
    const ranked = scoreCorpus("konsentrasi broker ANTM", base);
    for (let index = 1; index < ranked.length; index += 1) {
      expect(ranked[index - 1].score).toBeGreaterThanOrEqual(ranked[index].score);
    }
  });

  it("tidak pernah mengembalikan entri di bawah ambang entri", () => {
    for (const row of scoreCorpus("konsentrasi broker ANTM", base)) {
      expect(row.score, row.entry.id).toBeGreaterThanOrEqual(DEFAULT_THRESHOLDS.retrievalScoreFloor);
    }
  });

  it("menemukan ambang ketika pembaca menanyakan namanya", () => {
    const ranked = scoreCorpus("berapa ambang konsentrasi", base);
    expect(ranked.some((row) => row.entry.kind === "threshold")).toBe(true);
  });
});
