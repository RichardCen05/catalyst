import { describe, expect, it, vi } from "vitest";
import { parseMandateWithLlm, type MandatePlan } from "@/lib/agent/llm/mandate";

describe("parseMandateWithLlm", () => {
  it("returns the model's structured plan unchanged when it is well-formed", async () => {
    const modelOutput: MandatePlan = {
      focus: "margin",
      rationale: "Mandate mengutamakan margin.",
      hypothesisTree: [{ id: "ANTM-plan-primary", claim: "Trigger mengubah margin ANTM.", test: "Cari perubahan margin.", state: "primary" }],
      observables: [{ dimension: "margin", metric: "Gross margin, operating margin, spread, or cost per unit", expectedChange: "Naik", window: "1-10 sesi" }],
    };
    const call = vi.fn().mockResolvedValue(modelOutput);
    const result = await parseMandateWithLlm({ symbol: "ANTM", mandate: "uji margin ANTM" }, call);
    expect(result).toEqual(modelOutput);
    expect(call).toHaveBeenCalledOnce();
  });

  it("rejects a focus value outside the six known dimensions", async () => {
    const call = vi.fn().mockResolvedValue({ focus: "hype", rationale: "x", hypothesisTree: [], observables: [] });
    await expect(parseMandateWithLlm({ symbol: "ANTM", mandate: "x" }, call)).rejects.toThrow(/focus/);
  });

  it("rejects an empty hypothesisTree", async () => {
    const call = vi.fn().mockResolvedValue({ focus: "margin", rationale: "x", hypothesisTree: [], observables: [] });
    await expect(parseMandateWithLlm({ symbol: "ANTM", mandate: "x" }, call)).rejects.toThrow(/hypothesisTree/);
  });
});
