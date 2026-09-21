import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS, THRESHOLD_PROVENANCE } from "@/lib/agent/thresholds";

const ADDED = [
  "handlerScoreFloor",
  "retrievalTopK",
  "retrievalScoreFloor",
  "retrievalContextCharCap",
  "copilotHistoryTurns",
  "retrievalMemoMaxEntries",
] as const;

describe("ambang lapisan retrieval", () => {
  it("mendefinisikan setiap nilai yang dibaca lapisan retrieval", () => {
    for (const key of ADDED) {
      expect(DEFAULT_THRESHOLDS[key], key).toBeTypeOf("number");
      expect(DEFAULT_THRESHOLDS[key], key).toBeGreaterThan(0);
    }
  });

  it("mencatat asal setiap nilai, supaya tidak ada angka yang datang tanpa penjelasan", () => {
    for (const key of ADDED) {
      expect(THRESHOLD_PROVENANCE[key], key).toBeDefined();
    }
  });

  it("menempatkan ambang entri di bawah ambang handler", () => {
    // Satu entri boleh lolos dengan skor lebih rendah daripada yang dibutuhkan
    // sebuah handler untuk menjawab: entri dikumpulkan dulu, baru gabungannya
    // dinilai. Kalau urutannya terbalik, retrieval tidak pernah punya bahan.
    expect(DEFAULT_THRESHOLDS.retrievalScoreFloor).toBeLessThan(DEFAULT_THRESHOLDS.handlerScoreFloor);
  });

  it("memberi topK ruang lebih dari satu entri", () => {
    expect(DEFAULT_THRESHOLDS.retrievalTopK).toBeGreaterThan(1);
  });
});
