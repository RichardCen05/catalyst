import { describe, expect, it } from "vitest";
import { resolveFollowUp } from "@/lib/agent/retrieval/follow-up";
import { answerCacheKey } from "@/lib/agent/retrieval/answer-cache";
import { demoProfiles } from "@/lib/data/fixtures";
import type { HistoryTurn } from "@/lib/agent/retrieval/types";

const [first, second] = demoProfiles[0].watchlist;

/** Giliran asisten yang membawa daftar simbol, seperti jawaban daftar. */
const listed: HistoryTurn[] = [
  { role: "user", text: "kasus apa saja yang aktif" },
  { role: "assistant", text: "Dua kasus aktif.", symbols: [first, second] },
];
const single: HistoryTurn[] = [
  { role: "user", text: "kenapa masuk daftar" },
  { role: "assistant", text: "Satu kasus.", symbols: [first] },
];

describe("penyelesai anafora", () => {
  it("menunjuk simbol berikutnya untuk 'yang satunya'", () => {
    const out = resolveFollowUp("yang satunya?", listed);
    expect(out.anaphoric).toBe(true);
    expect(out.resolved).toBe(true);
    expect(out.symbol).toBe(second);
    expect(out.question).toContain(second);
  });

  it("menunjuk indeks yang disebut untuk 'yang pertama'", () => {
    expect(resolveFollowUp("yang pertama tadi kenapa", listed).symbol).toBe(first);
    expect(resolveFollowUp("yang kedua kenapa", listed).symbol).toBe(second);
  });

  it("menyelesaikan 'itu' hanya ketika calonnya satu", () => {
    expect(resolveFollowUp("kenapa itu penting", single).symbol).toBe(first);
    const many = resolveFollowUp("kenapa itu penting", listed);
    expect(many.anaphoric).toBe(true);
    expect(many.resolved).toBe(false);
    expect(many.symbol).toBeUndefined();
  });

  it("tidak menebak ketika tidak ada calon sama sekali", () => {
    const out = resolveFollowUp("yang satunya?", []);
    expect(out.anaphoric).toBe(true);
    expect(out.resolved).toBe(false);
  });

  it("tidak menyentuh pertanyaan yang sudah menyebut emitennya", () => {
    const out = resolveFollowUp(`kenapa ${second} masuk daftar`, listed);
    expect(out.anaphoric).toBe(false);
    expect(out.resolved).toBe(false);
    expect(out.question).toBe(`kenapa ${second} masuk daftar`);
  });

  it("tidak menganggap kata biasa sebagai penunjuk tanpa daftar sebelumnya", () => {
    // "pilar pertama" pada giliran pertama adalah pertanyaan biasa, bukan
    // penunjuk. Menjadikannya menu akan menghapus jawaban yang sah.
    const out = resolveFollowUp("apa pilar pertama", []);
    expect(out.anaphoric).toBe(false);
  });

  it("membaca daftar dari giliran asisten terakhir yang membawa simbol", () => {
    const later: HistoryTurn[] = [
      ...listed,
      { role: "user", text: "oke" },
      { role: "assistant", text: "Menu kemampuan." },
    ];
    expect(resolveFollowUp("yang satunya?", later).symbol).toBe(second);
  });
});

describe("kelayakan cache pertanyaan lanjutan", () => {
  it("memberi kunci yang sama pada dua percakapan yang sampai ke pertanyaan yang sama", () => {
    // Dulu setiap giliran lanjutan menolak cache, dengan alasan yang benar:
    // maknanya bergantung pada giliran yang tidak ikut ke dalam kunci.
    // Setelah penunjuk diselesaikan, pertanyaannya berdiri sendiri.
    const viaList = resolveFollowUp("yang satunya?", listed);
    const viaOrdinal = resolveFollowUp("yang kedua kenapa", listed);
    expect(viaList.resolved && viaOrdinal.resolved).toBe(true);
    expect(viaList.symbol).toBe(viaOrdinal.symbol);
    const material = "materi yang sama";
    expect(answerCacheKey(viaList.question, material, "m"))
      .not.toBe(answerCacheKey(viaOrdinal.question, material, "m"));
    // Pertanyaan yang benar-benar sama berbagi kunci, apa pun jalannya.
    expect(answerCacheKey(viaList.question, material, "m"))
      .toBe(answerCacheKey(resolveFollowUp("yang satunya?", listed).question, material, "m"));
  });

  it("menandai penunjuk yang gagal sebagai tidak layak cache", () => {
    const failed = resolveFollowUp("yang satunya?", []);
    expect(failed.anaphoric && !failed.resolved).toBe(true);
  });
});
