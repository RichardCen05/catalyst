import { describe, expect, it } from "vitest";
import { aggregateBundle, isAggregateQuestion } from "@/lib/agent/retrieval/aggregate";
import { scoreCorpus } from "@/lib/agent/retrieval/score";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { demoProfiles } from "@/lib/data/fixtures";
import type { RequestContext } from "@/lib/agent/retrieval/types";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

describe("isAggregateQuestion", () => {
  it("mengenali pertanyaan jamak", () => {
    for (const question of [
      "jelaskan semua kasus dalam satu jalur",
      "berapa banyak emiten yang masuk",
      "mana saja yang punya kasus lengkap",
      "list all events",
      "seluruh mekanisme yang tercatat",
    ]) {
      expect(isAggregateQuestion(question), question).toBe(true);
    }
  });

  it("membiarkan pertanyaan tunggal apa adanya", () => {
    for (const question of [
      "kenapa ANTM masuk daftar",
      "dari mana angka 27,5% itu",
      "apa itu HHI",
    ]) {
      expect(isAggregateQuestion(question), question).toBe(false);
    }
  });

  it("tidak tertipu kata yang memuat penanda sebagai bagian kata lain", () => {
    // "listed" memuat "list", "allocation" memuat "all". Keduanya pertanyaan
    // tunggal, dan menjawabnya sebagai agregat akan salah jenis.
    expect(isAggregateQuestion("kenapa ANTM listed hari ini")).toBe(false);
    expect(isAggregateQuestion("what is the allocation for ANTM")).toBe(false);
  });
});

describe("aggregateBundle", () => {
  it("menghitung atas seluruh hasil yang cocok dan menyebut cakupannya", async () => {
    const question = "jelaskan semua kasus dalam satu jalur";
    const bundle = await aggregateBundle(question, scoreCorpus(question, context), context);
    expect(bundle.body).toMatch(/\d+ dari \d+/);
    expect(bundle.figures.length).toBeGreaterThan(0);
  });

  it("menaruh setiap angka yang ditulisnya ke daftar izinnya sendiri", async () => {
    const question = "berapa banyak emiten punya kasus lengkap";
    const bundle = await aggregateBundle(question, scoreCorpus(question, context), context);
    for (const numeral of extractNumerals(bundle.body)) {
      expect(bundle.figures, numeral).toContain(numeral);
    }
  });

  it("tidak pernah melewati batas karakter", async () => {
    const question = "sebutkan semua peristiwa yang terekam";
    const bundle = await aggregateBundle(question, scoreCorpus(question, context), context);
    expect(bundle.body.length).toBeLessThanOrEqual(DEFAULT_THRESHOLDS.retrievalContextCharCap + 200);
  });

  it("mengatakan ketika daftarnya dipotong, bukan diam-diam menampilkan sebagian", async () => {
    // Inti perbaikannya: klaim "semua" atas sampel adalah satu-satunya bagian
    // yang tidak bisa dilihat verifier angka.
    const question = "sebutkan semua peristiwa yang terekam";
    const ranked = scoreCorpus(question, context);
    const bundle = await aggregateBundle(question, ranked, context);
    const listedLines = bundle.body.split("\n").filter((line) => line.startsWith("- ")).length;
    if (listedLines < ranked.length) {
      expect(bundle.body).toContain("dipotong");
    }
  });
});
