import { afterEach, describe, expect, it, vi } from "vitest";

/**
 * The server backup of a reader's memory, end to end (P3).
 *
 * The round trip is driven through the REAL pieces: the zustand `persist`
 * snapshot, `app/api/memory/route.ts`, `lib/memory/gcs-memory.ts` and the real
 * GCS transport with only `fetch` stubbed, then back through the shared
 * hydration parser. What a reader gets back after a localStorage wipe is
 * whatever these tests say it is.
 */

const UID = "123e4567-e89b-12d3-a456-426614174000";
const STORAGE_KEY = "catalyst:v1";
const memoryPath = (uid: string) => `catalyst/memory/${uid}.json`;

function stubLocalStorage(blobs: Record<string, string> = {}) {
  const map = new Map(Object.entries(blobs));
  const storage = {
    getItem: (key: string) => map.get(key) ?? null,
    setItem: (key: string, value: string) => void map.set(key, String(value)),
    removeItem: (key: string) => void map.delete(key),
    clear: () => map.clear(),
    key: (index: number) => [...map.keys()][index] ?? null,
    get length() {
      return map.size;
    },
  };
  vi.stubGlobal("window", { localStorage: storage });
  return map;
}

/** Minimal in-memory GCS: metadata, media and upload, generation-checked. */
function stubGcsStore(initial: Record<string, unknown> = {}) {
  const objects = new Map<string, { data: unknown; generation: number }>(
    Object.entries(initial).map(([path, data]) => [path, { data, generation: 1 }]),
  );
  const fetchMock = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const raw = String(url);
    if (raw.includes("metadata.google.internal")) {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
    }
    const parsed = new URL(raw);
    if (raw.includes("/upload/storage/v1/b/")) {
      const path = parsed.searchParams.get("name") ?? "";
      const slot = objects.get(path);
      const ifMatch = parsed.searchParams.get("ifGenerationMatch");
      if (ifMatch === "0" && slot) return new Response("{}", { status: 412 });
      if (ifMatch !== null && ifMatch !== "0" && slot && ifMatch !== String(slot.generation)) {
        return new Response("{}", { status: 412 });
      }
      const next = (slot?.generation ?? 0) + 1;
      objects.set(path, { data: JSON.parse(init?.body ?? "null"), generation: next });
      return new Response(JSON.stringify({ generation: String(next) }), { status: 200 });
    }
    const objectPath = decodeURIComponent(parsed.pathname.split("/o/")[1] ?? "");
    const slot = objects.get(objectPath);
    if (parsed.searchParams.get("alt") === "media") {
      if (!slot) return new Response("{}", { status: 404 });
      return new Response(JSON.stringify(slot.data), { status: 200 });
    }
    if (!slot) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify({ generation: String(slot.generation) }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { objects, fetchMock };
}

const post = (body: string) =>
  new Request("http://localhost/api/memory", {
    method: "POST",
    headers: { "Content-Type": "application/json", cookie: `catalyst_uid=${UID}` },
    body,
  });
const get = () => new Request("http://localhost/api/memory", { headers: { cookie: `catalyst_uid=${UID}` } });

/** Drive the real store far enough that every persisted key carries a value. */
async function snapshotFromStore(): Promise<Record<string, unknown>> {
  const map = stubLocalStorage();
  const { useCatalystStore } = await import("@/lib/store");
  const store = useCatalystStore.getState();
  store.completeOnboarding();
  store.setCaseMandate("ANTM", "Uji ulang tesis arus asing sebelum rilis kuartalan.");
  store.setCaseStatus("ANTM", "open");
  store.saveCaseResolution("ANTM", {
    outcome: "challenged",
    disposition: "monitor",
    finalHypothesis: "Arus asing tidak menjelaskan kenaikan.",
    falsifiedBy: "Volume domestik naik lebih dulu.",
    wrongAssumption: "Asing memimpin harga.",
    reusableRule: "Periksa volume domestik sebelum menyalahkan arus asing.",
  });
  store.setHolding("ANTM", { shares: 100, avgCost: 1500 });
  // A tunable the playbook schema used to omit: it was stripped in silence on
  // the way to GCS and again at hydration, so the reader's setting reverted
  // with no error anywhere. The equality check below is what keeps it stored.
  store.setThreshold("chainRelevanceFloor", 70);
  store.recordFeedback({ action: "useful", symbol: "ANTM", targetId: "pillar-volume", targetLabel: "Volume" });
  store.recordInsight({ symbol: "ANTM", category: "data-error", note: "Angka volume tampak tertukar." });
  // persist writes synchronously on each set()
  const raw = map.get(STORAGE_KEY);
  expect(raw).toBeDefined();
  return (JSON.parse(raw as string) as { state: Record<string, unknown> }).state;
}

describe("memory snapshot allowlist (P3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("every persisted store key has a schema, and no transient panel state is persisted", async () => {
    vi.resetModules();
    const state = await snapshotFromStore();
    const { memoryPatchFieldSchemas } = await import("@/lib/schemas");
    const persisted = Object.keys(state).sort();
    // A store field added without its schema would be dropped silently on the
    // way to GCS. This is the check that makes that a failing test instead.
    expect(persisted).toEqual(Object.keys(memoryPatchFieldSchemas).sort());
    for (const transient of ["copilotOpen", "copilotContext", "tourOpen"]) {
      expect(persisted).not.toContain(transient);
    }
  });
});

describe("memory round trip: store → POST → GCS → GET → hydrate", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("returns every supported key unchanged, and stamps the snapshot version", async () => {
    vi.resetModules();
    const state = await snapshotFromStore();
    const { objects } = stubGcsStore();
    const { GET, POST } = await import("@/app/api/memory/route");

    const written = await POST(post(JSON.stringify(state)));
    expect(written.status).toBe(200);

    const stored = objects.get(memoryPath(UID))?.data as Record<string, unknown>;
    const { MEMORY_SNAPSHOT_VERSION, memoryPatchFieldSchemas } = await import("@/lib/schemas");
    // Without a version in the object, hydration cannot know which shape it is
    // reading, and the migration below would be a guess.
    expect(stored.version).toBe(MEMORY_SNAPSHOT_VERSION);

    const read = await GET(get());
    const body = (await read.json()) as { data: Record<string, unknown> };
    const { parseMemorySnapshot } = await import("@/lib/memory/snapshot");
    const hydrated = parseMemorySnapshot(body.data);
    expect(hydrated).not.toBeNull();
    for (const key of Object.keys(memoryPatchFieldSchemas)) {
      if (key === "playbook") continue;
      expect(hydrated?.[key]).toEqual(state[key]);
    }
    // The one documented difference: the migration backfills `thresholds` so
    // resolveThresholds fills the defaults per key. Nothing is lost.
    const playbook = state.playbook as Record<string, unknown>;
    expect(hydrated?.playbook).toEqual({ ...playbook, thresholds: playbook.thresholds ?? {} });
    expect((hydrated?.playbook as { thresholds: Record<string, number> }).thresholds.chainRelevanceFloor).toBe(70);
  });

  it("drops a key with no schema instead of forwarding it to the bucket", async () => {
    vi.resetModules();
    const state = await snapshotFromStore();
    const { objects } = stubGcsStore();
    const { POST } = await import("@/app/api/memory/route");
    await POST(post(JSON.stringify({ ...state, copilotOpen: true, tourOpen: true, souvenir: { anything: 1 } })));
    const stored = objects.get(memoryPath(UID))?.data as Record<string, unknown>;
    expect(stored.souvenir).toBeUndefined();
    expect(stored.copilotOpen).toBeUndefined();
    expect(stored.tourOpen).toBeUndefined();
  });

  it("refuses a body with no recognisable key rather than storing a bare version stamp", async () => {
    vi.resetModules();
    const { objects } = stubGcsStore();
    const { POST } = await import("@/app/api/memory/route");
    const response = await POST(post(JSON.stringify({ copilotOpen: true, souvenir: 1 })));
    expect(response.status).toBe(400);
    expect(objects.get(memoryPath(UID))).toBeUndefined();
  });

  it("rejects a wrong-shaped key with 400 and writes nothing", async () => {
    vi.resetModules();
    const state = await snapshotFromStore();
    const { objects } = stubGcsStore();
    const { POST } = await import("@/app/api/memory/route");
    const response = await POST(post(JSON.stringify({ ...state, caseStatuses: { ANTM: "menyala" } })));
    expect(response.status).toBe(400);
    expect((await response.json()).field).toBe("caseStatuses");
    expect(objects.get(memoryPath(UID))).toBeUndefined();
  });

  it("rejects a body over the size threshold and writes nothing", async () => {
    vi.resetModules();
    const { DEFAULT_THRESHOLDS } = await import("@/lib/agent/thresholds");
    const { objects } = stubGcsStore();
    const { POST } = await import("@/app/api/memory/route");
    const filler = "x".repeat(DEFAULT_THRESHOLDS.memoryPatchMaxBytes + 1);
    const response = await POST(post(JSON.stringify({ caseMandates: { ANTM: filler } })));
    expect(response.status).toBe(413);
    expect(objects.get(memoryPath(UID))).toBeUndefined();
  });
});

describe("hydration parser (P3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("discards the whole snapshot when one key fails, rather than hydrating half of it", async () => {
    vi.resetModules();
    const state = await snapshotFromStore();
    const { parseMemorySnapshot } = await import("@/lib/memory/snapshot");
    expect(parseMemorySnapshot({ ...state, insights: "bukan array" })).toBeNull();
    expect(parseMemorySnapshot(null)).toBeNull();
  });

  it("runs the store migration, so an older snapshot gains the fields it never had", async () => {
    vi.resetModules();
    const state = await snapshotFromStore();
    const { parseMemorySnapshot } = await import("@/lib/memory/snapshot");
    const legacy = { ...state } as Record<string, unknown>;
    delete legacy.holdings;
    delete legacy.caseResolutions;
    delete legacy.ruleProposals;
    const hydrated = parseMemorySnapshot(legacy);
    expect(hydrated?.holdings).toEqual({});
    expect(hydrated?.caseResolutions).toEqual({});
    expect(hydrated?.ruleProposals).toEqual([]);
  });
});

describe("persisted shape version (P3)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
    vi.resetModules();
  });

  it("a snapshot from before partialize does not reopen the tour", async () => {
    vi.resetModules();
    const { MEMORY_SNAPSHOT_VERSION } = await import("@/lib/schemas");
    // Written by the build that still persisted panel state. Marked with the
    // version that build used, which is the previous one: had the version not
    // been bumped with `partialize`, zustand would skip `migrate` and `merge`
    // would spread `tourOpen: true` over the fresh default.
    const legacy = {
      state: { profile: { id: "flow-first", hasOnboarded: true }, copilotOpen: true, tourOpen: true },
      version: MEMORY_SNAPSHOT_VERSION - 1,
    };
    stubLocalStorage({ [STORAGE_KEY]: JSON.stringify(legacy) });
    const { useCatalystStore } = await import("@/lib/store");
    for (let i = 0; i < 50 && !useCatalystStore.getState().profile.hasOnboarded; i++) {
      await new Promise((resolve) => setTimeout(resolve, 20));
    }
    const state = useCatalystStore.getState();
    expect(state.profile.hasOnboarded).toBe(true);
    expect(state.tourOpen).toBe(false);
    expect(state.copilotOpen).toBe(false);
  });

  it("rejects an oversized body that declares no Content-Length", async () => {
    vi.resetModules();
    const { DEFAULT_THRESHOLDS } = await import("@/lib/agent/thresholds");
    const { objects } = stubGcsStore();
    const { POST } = await import("@/app/api/memory/route");
    const chunk = new TextEncoder().encode("x".repeat(64 * 1024));
    let sent = 0;
    // A streamed body carries no Content-Length, so the header check cannot
    // see it. The read itself is what has to stop.
    const stream = new ReadableStream<Uint8Array>({
      pull(controller) {
        if (sent > DEFAULT_THRESHOLDS.memoryPatchMaxBytes * 2) {
          controller.close();
          return;
        }
        sent += chunk.byteLength;
        controller.enqueue(chunk);
      },
    });
    const request = new Request("http://localhost/api/memory", {
      method: "POST",
      headers: { "Content-Type": "application/json", cookie: `catalyst_uid=${UID}` },
      body: stream,
      // @ts-expect-error — undici requires this for a streamed request body.
      duplex: "half",
    });
    const response = await POST(request);
    expect(response.status).toBe(413);
    expect(objects.get(memoryPath(UID))).toBeUndefined();
    // Cancelled early: the whole body was never pulled into this process.
    expect(sent).toBeLessThanOrEqual(DEFAULT_THRESHOLDS.memoryPatchMaxBytes + chunk.byteLength * 2);
  });
});
