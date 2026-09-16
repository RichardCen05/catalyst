import { describe, expect, it, vi } from "vitest";
import { assessExposureWithLlm, RELEVANCE_BAND_SCORE, type ExposureAssessment } from "@/lib/agent/llm/exposure";

describe("assessExposureWithLlm", () => {
  const baseInput = {
    symbol: "ADRO" as const,
    eventTitle: "Harga batu bara turun 8% di bawah ekspektasi kuartal",
    eventSummary: "Harga acuan batu bara Newcastle turun ke level terendah sejak 2023.",
    eventTags: ["Commodities", "Bearish"],
    segments: [{ segment: "Sales of Coal", share: 0.554 }],
  };

  it("maps the model's relevanceBand to the fixed score table", async () => {
    const call = vi.fn().mockResolvedValue({
      path: "Sales of Coal (55% pendapatan ADRO) → realisasi harga → margin",
      direction: "Adverse",
      relevanceBand: "high",
      rationale: "Harga batu bara turun langsung menekan pendapatan segmen Sales of Coal ADRO.",
    } satisfies ExposureAssessment);
    const result = await assessExposureWithLlm(baseInput, call);
    expect(result.relevanceBand).toBe("high");
    expect(RELEVANCE_BAND_SCORE[result.relevanceBand]).toBe(90);
    expect(result.direction).toBe("Adverse");
  });

  it("carries the model's short card label through", async () => {
    const call = vi.fn().mockResolvedValue({
      path: "Sales of Coal (55% pendapatan ADRO) → realisasi harga → margin",
      label: "Harga batu bara ke margin",
      direction: "Adverse",
      relevanceBand: "high",
      rationale: "Harga batu bara turun langsung menekan pendapatan segmen Sales of Coal ADRO.",
    } satisfies ExposureAssessment);
    const result = await assessExposureWithLlm(baseInput, call);
    expect(result.label).toBe("Harga batu bara ke margin");
  });

  it("rejects a direction outside the five known values", async () => {
    const call = vi.fn().mockResolvedValue({ path: "x", direction: "Bullish", relevanceBand: "high", rationale: "x" });
    await expect(assessExposureWithLlm(baseInput, call)).rejects.toThrow(/direction/);
  });

  it("rejects a relevanceBand outside high/medium/low", async () => {
    const call = vi.fn().mockResolvedValue({ path: "x", direction: "Mixed", relevanceBand: "extreme", rationale: "x" });
    await expect(assessExposureWithLlm(baseInput, call)).rejects.toThrow(/relevanceBand/);
  });

  it("never asks for or returns a bare numeric relevance field", async () => {
    const call = vi.fn().mockResolvedValue({ path: "x", direction: "Mixed", relevanceBand: "medium", rationale: "x" });
    const result = await assessExposureWithLlm(baseInput, call);
    expect(result).not.toHaveProperty("relevance");
    expect(typeof result.relevanceBand).toBe("string");
  });
});
