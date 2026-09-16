import { describe, expect, it } from "vitest";
import { DEFAULT_THRESHOLDS, relevanceFloorFor, resolveThresholds } from "@/lib/agent/thresholds";
import { playbookSchema } from "@/lib/schemas";
import { defaultPlaybook } from "@/lib/store";

const basePlaybook = {
  preferredComparables: {},
  materialityRules: [],
  knownExposures: [],
  thesisAssumptions: [],
  trustedSources: [],
  falsifiers: [],
};

describe("resolveThresholds", () => {
  it("resolves defaults when playbook absent", () => {
    expect(resolveThresholds(undefined)).toEqual({ ...DEFAULT_THRESHOLDS });
    expect(resolveThresholds(null)).toEqual({ ...DEFAULT_THRESHOLDS });
    expect(relevanceFloorFor(undefined)).toBe(85);
  });

  it("keeps other defaults on partial override", () => {
    const resolved = resolveThresholds({ relevanceFloor: 90, thresholds: { concentrationFloor: 0.3 } });
    expect(resolved.concentrationFloor).toBe(0.3);
    expect(resolved.volumeZFloor).toBe(DEFAULT_THRESHOLDS.volumeZFloor);
    expect(resolved.relevanceFloor).toBe(90);
  });

  it("is safe for a persisted v3 snapshot with no thresholds", () => {
    // Simulasi snapshot zustand v3: playbook tanpa field thresholds.
    const v3 = structuredClone(defaultPlaybook) as unknown as Record<string, unknown>;
    delete (v3 as { thresholds?: unknown }).thresholds;
    const resolved = resolveThresholds(v3 as unknown as Parameters<typeof resolveThresholds>[0]);
    expect(resolved.concentrationFloor).toBe(DEFAULT_THRESHOLDS.concentrationFloor);
    expect(resolved.volumeZFloor).toBe(2.5);
    expect(resolved.volumeExtremeFloor).toBe(5);
  });

  it("rejects out-of-bound values via schema (400, bukan silent clamp)", () => {
    const bad = playbookSchema.safeParse({
      ...basePlaybook,
      thresholds: { concentrationFloor: 2, volumeZFloor: -1 },
    });
    expect(bad.success).toBe(false);
    const badVolume = playbookSchema.safeParse({
      ...basePlaybook,
      thresholds: { volumeExtremeFloor: 99 },
    });
    expect(badVolume.success).toBe(false);
  });

  it("accepts a partial thresholds object and preserves the field", () => {
    const good = playbookSchema.safeParse({
      ...basePlaybook,
      thresholds: { concentrationFloor: 0.3 },
    });
    expect(good.success).toBe(true);
    if (good.success) {
      expect(good.data.thresholds?.concentrationFloor).toBe(0.3);
    }
  });
});
