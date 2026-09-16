import { describe, expect, it } from "vitest";
import { applySeedDeclarations, type RegistryFile } from "@/lib/web-watch/registry";
import { newSourceState, type WatchedSource } from "@/lib/web-watch/types";

const seed = (over: Partial<WatchedSource> = {}): WatchedSource => ({
  id: "src-bmkg-forecast-sample",
  url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.01.1001",
  label: "BMKG — prakiraan cuaca per wilayah (NONAKTIF)",
  kind: "document",
  enabled: false,
  checkIntervalHours: 12,
  category: "weather",
  sourceType: "weather",
  ...over,
});

const registryWith = (state: Partial<ReturnType<typeof newSourceState>>): RegistryFile => {
  const base = { ...newSourceState(seed({ enabled: true, label: "BMKG — prakiraan (aktif)" })), ...state };
  return { version: 1, sources: { [base.id]: base } };
};

describe("applySeedDeclarations", () => {
  it("turns off a source the seed file has since disabled", () => {
    const next = applySeedDeclarations(registryWith({ checks: 3, changes: 3 }), [seed()]);
    expect(next.sources["src-bmkg-forecast-sample"].enabled).toBe(false);
  });

  it("keeps the observed state while re-applying the declaration", () => {
    const next = applySeedDeclarations(
      registryWith({ checks: 3, changes: 3, lastTextSha: "abc", lastCheckedAt: "2026-09-16T03:21:47Z", lastStatus: "changed" }),
      [seed({ checkIntervalHours: 24 })],
    );
    const state = next.sources["src-bmkg-forecast-sample"];
    expect(state.checks).toBe(3);
    expect(state.changes).toBe(3);
    expect(state.lastTextSha).toBe("abc");
    expect(state.lastCheckedAt).toBe("2026-09-16T03:21:47Z");
    expect(state.checkIntervalHours).toBe(24);
    expect(state.label).toBe("BMKG — prakiraan cuaca per wilayah (NONAKTIF)");
  });

  it("adds a seed the registry has never seen", () => {
    const next = applySeedDeclarations({ version: 1, sources: {} }, [seed({ id: "src-new", url: "https://example.test/x" })]);
    expect(next.sources["src-new"].lastStatus).toBe("never");
    expect(Object.keys(next.sources)).toHaveLength(1);
  });

  it("matches an existing entry by url so a renamed id does not duplicate it", () => {
    const next = applySeedDeclarations(registryWith({ checks: 2 }), [seed({ id: "src-bmkg-forecast-renamed" })]);
    expect(Object.keys(next.sources)).toEqual(["src-bmkg-forecast-sample"]);
    expect(next.sources["src-bmkg-forecast-sample"].enabled).toBe(false);
    expect(next.sources["src-bmkg-forecast-sample"].checks).toBe(2);
  });

  it("never drops a source the seed file no longer lists", () => {
    const next = applySeedDeclarations(registryWith({ checks: 1 }), []);
    expect(Object.keys(next.sources)).toEqual(["src-bmkg-forecast-sample"]);
  });
});
