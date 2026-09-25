import { describe, expect, it } from "vitest";
import { isKnownSymbolCode } from "@/lib/web-watch/queue";
import { applySeedDeclarations, listSources, memoryRegistryStore, type RegistryFile } from "@/lib/web-watch/registry";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
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

describe("declared symbols and region", () => {
  it("re-applies symbols and region from the seed onto an entry written before the fields existed", () => {
    // The shape production held before this field: no `symbols`, no `region`.
    const legacy = registryWith({ checks: 4, lastTextSha: "def" });
    expect(legacy.sources["src-bmkg-forecast-sample"]).not.toHaveProperty("symbols");
    const next = applySeedDeclarations(legacy, [seed({ symbols: ["ANTM"], region: "Kolaka" })]);
    const state = next.sources["src-bmkg-forecast-sample"];
    expect(state.symbols).toEqual(["ANTM"]);
    expect(state.region).toBe("Kolaka");
    expect(state.checks).toBe(4);
    expect(state.lastTextSha).toBe("def");
  });

  it("loads a legacy registry file with no declared symbols", async () => {
    const store = memoryRegistryStore(registryWith({ checks: 1 }));
    const [source] = await listSources(store);
    expect(source.id).toBe("src-bmkg-forecast-sample");
    expect(source.symbols ?? []).toEqual([]);
  });

  it("declares only symbols the registry knows", () => {
    for (const source of SEED_SOURCES) {
      for (const symbol of source.symbols ?? []) expect(isKnownSymbolCode(symbol), `${source.id} → ${symbol}`).toBe(true);
    }
  });

  it("names every declared region in the source's own label", () => {
    // The region is read off the address the person registered, not typed
    // from memory: the label quotes the place BMKG answered with.
    const withRegion = SEED_SOURCES.filter((source) => source.region);
    expect(withRegion.length).toBeGreaterThan(0);
    for (const source of withRegion) expect(source.label, source.id).toContain(source.region);
  });
});

describe("declared language", () => {
  it("re-applies lang from the seed onto an entry written before the field existed", () => {
    const legacy = registryWith({ checks: 2 });
    expect(legacy.sources["src-bmkg-forecast-sample"]).not.toHaveProperty("lang");
    const next = applySeedDeclarations(legacy, [seed({ lang: "en" })]);
    expect(next.sources["src-bmkg-forecast-sample"].lang).toBe("en");
    expect(next.sources["src-bmkg-forecast-sample"].checks).toBe(2);
  });

  it("declares a language on every seed", () => {
    for (const source of SEED_SOURCES) expect(["id", "en"], source.id).toContain(source.lang);
  });
});
