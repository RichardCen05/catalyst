import { describe, expect, it } from "vitest";
import { enforceCitations, safeLanguage } from "@/lib/agent/gates";
import type { PillarResult } from "@/lib/types";

describe("agent output gates", () => {
  it("rejects a metric without provider, endpoint, field, and asOf", () => {
    const pillar = {
      key: "volume",
      label: "Volume",
      status: "Elevated",
      summary: "Aktivitas berada di atas baseline.",
      protocol: {
        claim: "Aktivitas menyimpang dari baseline.",
        supportingEvidence: "Robust z 3.2.",
        challengingEvidence: "Penyebab belum diisolasi.",
        insufficientWhen: "Baseline tidak tersedia.",
        nextQuestion: "Apakah perubahan bertahan?",
      },
      metrics: [{ label: "Robust z", value: "3.2", citations: [] }],
      citations: [],
    } satisfies PillarResult;

    expect(() => enforceCitations([pillar])).toThrow("Citation gate");
  });

  it("refuses transaction advice and keeps the response evidence-based", () => {
    const answer = safeLanguage("apakah saya harus beli ANTM sekarang?");
    expect(answer.refused).toBe(true);
    expect(answer.text).toContain("tidak menilai tindakan transaksi");
    expect(answer.text.toLowerCase()).not.toContain("target price");
  });
});
