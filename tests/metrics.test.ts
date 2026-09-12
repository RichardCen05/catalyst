import { describe, expect, it } from "vitest";
import {
  calculateConcentration,
  calculateMomentum,
  calculateVolumeSignal,
  detectFlowContradiction,
} from "@/lib/agent/metrics";

describe("four-pillar calculators", () => {
  it("calculates buyer concentration from a worked broker example", () => {
    const result = calculateConcentration(
      [50, 30, 20],
      { netForeign: 8, totalMarketValue: 100 },
      { freeFloatShares: 1_000, referencePrice: 1_000 },
    );

    expect(result.topBuyerShare).toBe(0.5);
    expect(result.hhi).toBe(0.38);
    expect(result.effectiveBuyers).toBeCloseTo(2.6316, 4);
    expect(result.foreignShare).toBe(0.08);
    expect(result.floatAbsorbed).toBe(0.0001);
  });

  it("classifies an outlier volume against a stable median baseline", () => {
    const result = calculateVolumeSignal(
      [100, 98, 101, 99, 102, 97, 103, 100, 99, 101, 98, 102],
      160,
      50,
    );

    expect(result.status).toBe("Extreme");
    expect(result.robustZ).toBeGreaterThan(10);
  });

  it("returns insufficient data when liquidity is below the gate", () => {
    const result = calculateVolumeSignal([100, 99, 101, 98, 102], 120, 4);
    expect(result.status).toBe("Insufficient Data");
  });

  it("classifies price strength after removing market beta", () => {
    const result = calculateMomentum(0.08, 0.02, 1.2, 0.03);
    expect(result.residual).toBeCloseTo(0.056, 6);
    expect(result.status).toBe("Idiosyncratic");
  });

  it("flags broker origin and aggregate foreign flow disagreement", () => {
    expect(detectFlowContradiction(0.7, -12)).toBe(true);
    expect(detectFlowContradiction(0.3, -12)).toBe(false);
  });
});
