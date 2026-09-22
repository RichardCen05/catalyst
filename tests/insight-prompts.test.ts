import { describe, expect, it } from "vitest";
import { buildInsightPrompts } from "@/lib/agent/assistant";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import type { UserInsight } from "@/lib/types";

function note(symbol: string, id: string, status: UserInsight["status"] = "pending"): UserInsight {
  return {
    id,
    symbol: symbol as UserInsight["symbol"],
    category: "missing-context",
    note: "catatan pembaca yang cukup panjang",
    status,
    createdAt: new Date("2026-09-11T00:00:00.000Z").toISOString(),
    reviewHistory: [],
  };
}

describe("buildInsightPrompts", () => {
  it("menawarkan satu chip per emiten, bukan satu per catatan", () => {
    // Dua catatan terbuka pada satu emiten menanyakan hal yang sama. Versi
    // lama memetakan catatan, jadi teks chip-nya identik — dan teks itu
    // adalah key-nya, sehingga React menerima dua anak dengan key sama.
    const prompts = buildInsightPrompts([note("ANTM", "a"), note("ANTM", "b")], DEFAULT_THRESHOLDS.copilotInsightPrompts);
    expect(prompts).toEqual(["Periksa ulang catatan saya untuk ANTM."]);
    expect(new Set(prompts).size).toBe(prompts.length);
  });

  it("hanya menghitung catatan yang masih terbuka", () => {
    const prompts = buildInsightPrompts([note("ANTM", "a", "incorporated"), note("PGAS", "b")], DEFAULT_THRESHOLDS.copilotInsightPrompts);
    expect(prompts).toEqual(["Periksa ulang catatan saya untuk PGAS."]);
  });

  it("berhenti pada batas jumlah chip", () => {
    const notes = ["ANTM", "PGAS", "BBCA", "TLKM"].map((symbol, index) => note(symbol, `n${index}`));
    expect(buildInsightPrompts(notes, DEFAULT_THRESHOLDS.copilotInsightPrompts)).toHaveLength(DEFAULT_THRESHOLDS.copilotInsightPrompts);
  });
});
