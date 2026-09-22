import { afterEach, describe, expect, it, vi } from "vitest";

/** The GCE/Cloud Run metadata server is HTTP-only on the link-local host
 *  `metadata.google.internal`. An `https://` URL there does not fail loudly —
 *  it makes every GCS-backed feature (memory sync, web-watch registry and
 *  queue) degrade to "unavailable", because each caller swallows the error.
 *  These tests pin the host and the `Metadata-Flavor: Google` header, which is
 *  the control that actually guards the endpoint: the request never leaves the
 *  VM, and callers that cannot set custom headers (browsers, plain SSRF) are
 *  rejected by the metadata server. Storage API calls stay on https. */

describe("GCS metadata transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("points at the link-local metadata host over http (no https upgrade)", async () => {
    const { METADATA_TOKEN_URL } = await import("@/lib/gcp/gcs");
    const url = new URL(METADATA_TOKEN_URL);
    expect(url.protocol).toBe("http:");
    expect(url.hostname).toBe("metadata.google.internal");
    expect(url.pathname).toBe("/computeMetadata/v1/instance/service-accounts/default/token");
  });

  it("sends Metadata-Flavor: Google on the token fetch and https for storage", async () => {
    const seen: string[] = [];
    const fetchMock = vi.fn(async (url: string, _init?: unknown) => {
      void _init;
      seen.push(String(url));
      if (String(url).includes("metadata.google.internal")) {
        return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
      }
      if (String(url).includes("/storage/v1/b/")) {
        return new Response(JSON.stringify({ generation: "1" }), { status: 200 });
      }
      return new Response(JSON.stringify({ hello: 1 }), { status: 200 });
    });
    vi.stubGlobal("fetch", fetchMock);

    const { gcsGetJson } = await import("@/lib/gcp/gcs");
    await gcsGetJson("bucket", "path");

    const tokenCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("metadata.google.internal"),
    );
    expect(tokenCall?.[1]).toMatchObject({ headers: { "Metadata-Flavor": "Google" } });

    const storageCalls = seen.filter((url) => !url.includes("metadata.google.internal"));
    expect(storageCalls.length).toBeGreaterThan(0);
    for (const url of storageCalls) expect(url.startsWith("https://")).toBe(true);
  });
});

/**
 * Failure injection for the memory persistence path (G1–G5).
 *
 * These drive the REAL transport (`lib/gcp/gcs.ts`), the REAL merge layer
 * (`lib/memory/gcs-memory.ts`) and the REAL route (`app/api/memory/route.ts`)
 * with only `fetch` stubbed, so each verdict describes the shipped code, not
 * a mock of it.
 */
interface GcsFaults {
  metaStatus?: number;
  mediaStatus?: number;
  uploadStatus?: number[];
  hangMedia?: boolean;
}

function stubGcsStore(initial: Record<string, unknown> = {}, faults: GcsFaults = {}) {
  const objects = new Map<string, { data: unknown; generation: number }>(
    Object.entries(initial).map(([path, data]) => [path, { data, generation: 1 }]),
  );
  const seenPaths: string[] = [];
  let uploads = 0;
  const fetchMock = vi.fn(async (url: string, init?: { method?: string; body?: string }) => {
    const raw = String(url);
    if (raw.includes("metadata.google.internal")) {
      return new Response(JSON.stringify({ access_token: "tok", expires_in: 3600 }), { status: 200 });
    }
    const parsed = new URL(raw);
    // Upload endpoint: /upload/storage/v1/b/<bucket>/o?name=<path>
    if (raw.includes("/upload/storage/v1/b/")) {
      const path = parsed.searchParams.get("name") ?? "";
      seenPaths.push(path);
      const forced = faults.uploadStatus?.[uploads];
      uploads += 1;
      if (forced !== undefined && forced !== 200) return new Response("{}", { status: forced });
      const slot = objects.get(path);
      const ifMatch = parsed.searchParams.get("ifGenerationMatch");
      if (ifMatch !== null && ifMatch !== "0" && slot && ifMatch !== String(slot.generation)) {
        return new Response("{}", { status: 412 });
      }
      if (ifMatch === "0" && slot) return new Response("{}", { status: 412 });
      const next = (slot?.generation ?? 0) + 1;
      objects.set(path, { data: JSON.parse(init?.body ?? "null"), generation: next });
      return new Response(JSON.stringify({ generation: String(next) }), { status: 200 });
    }
    // Metadata / media endpoints: /storage/v1/b/<bucket>/o/<enc path>[?alt=media]
    const objectPath = decodeURIComponent(parsed.pathname.split("/o/")[1] ?? "");
    seenPaths.push(objectPath);
    if (parsed.searchParams.get("alt") === "media") {
      if (faults.hangMedia) return new Promise<Response>(() => {});
      if (faults.mediaStatus !== undefined && faults.mediaStatus !== 200) {
        return new Response("{}", { status: faults.mediaStatus });
      }
      const slot = objects.get(objectPath);
      if (!slot) return new Response("{}", { status: 404 });
      return new Response(JSON.stringify(slot.data), { status: 200 });
    }
    if (faults.metaStatus !== undefined && faults.metaStatus !== 200 && faults.metaStatus !== 404) {
      return new Response("{}", { status: faults.metaStatus });
    }
    const slot = objects.get(objectPath);
    if (!slot) return new Response("{}", { status: 404 });
    return new Response(JSON.stringify({ generation: String(slot.generation) }), { status: 200 });
  });
  vi.stubGlobal("fetch", fetchMock);
  return { objects, seenPaths, fetchMock };
}

const UID_A = "123e4567-e89b-12d3-a456-426614174000";
const memoryPath = (uid: string) => `catalyst/memory/${uid}.json`;
const getRoute = (cookie: string) =>
  new Request("http://localhost/api/memory", { headers: { cookie } });

describe("memory transport failure injection (G1-G5)", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("G1: GCS 500 on read degrades to {unavailable:true}, never throws into the client", async () => {
    stubGcsStore({}, { metaStatus: 500 });
    const { loadMemory } = await import("@/lib/memory/gcs-memory");
    await expect(loadMemory(UID_A)).rejects.toThrow("GCS metadata GET failed: 500");
    const { GET } = await import("@/app/api/memory/route");
    const response = await GET(getRoute(`catalyst_uid=${UID_A}`));
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ data: {}, unavailable: true });
  });

  it("G2: GCS 403 is flagged unavailable server-side, but the client cannot tell it from empty", async () => {
    stubGcsStore({}, { metaStatus: 403 });
    const { GET } = await import("@/app/api/memory/route");
    const denied = await GET(getRoute(`catalyst_uid=${UID_A}`));
    expect(await denied.json()).toEqual({ data: {}, unavailable: true });

    // Empty memory (404) carries NO flag — the server distinguishes, ...
    stubGcsStore({});
    const empty = await GET(getRoute(`catalyst_uid=${UID_A}`));
    expect(await empty.json()).toEqual({ data: {} });

    // ... but components/memory-sync.tsx:30-32 reads only body.data and never
    // branches on `unavailable`, so the browser treats both identically.
  });

  it("G3: every GCS fetch carries an abort signal, so a hang ends well before Cloud Run's 300s", async () => {
    const { fetchMock } = stubGcsStore({ [memoryPath(UID_A)]: { profile: { id: "x" } } }, { hangMedia: true });
    const { GCS_REQUEST_TIMEOUT_MS } = await import("@/lib/gcp/gcs");
    // docs/DEPLOY.md pins the Cloud Run request timeout at 300s. Anything at or
    // above that is not a timeout, it is the same hang with extra steps.
    expect(GCS_REQUEST_TIMEOUT_MS).toBeLessThan(300_000);

    const { loadMemory } = await import("@/lib/memory/gcs-memory");
    const settled = await Promise.race([
      loadMemory(UID_A).then(() => "settled" as const, () => "settled" as const),
      new Promise((resolve) => setTimeout(() => resolve("pending" as const), 150)),
    ]);
    // Still pending at 150ms — the bound is the timeout, not this tick.
    expect(settled).toBe("pending");

    // Before the fix no call passed a signal at all, so nothing could end it.
    for (const call of fetchMock.mock.calls) {
      expect((call[1] as { signal?: unknown } | undefined)?.signal).toBeDefined();
    }
  });

  it("A4: both swallowed GCS failures are logged before the route answers 200", async () => {
    const errors: unknown[][] = [];
    const spy = vi.spyOn(console, "error").mockImplementation((...args: unknown[]) => void errors.push(args));
    try {
      stubGcsStore({}, { metaStatus: 500 });
      const { GET, POST } = await import("@/app/api/memory/route");
      await GET(getRoute(`catalyst_uid=${UID_A}`));
      expect(errors.length).toBe(1);

      stubGcsStore({ [memoryPath(UID_A)]: { feedback: [] } }, { uploadStatus: [500] });
      await POST(
        new Request("http://localhost/api/memory", {
          method: "POST",
          headers: { "Content-Type": "application/json", cookie: `catalyst_uid=${UID_A}` },
          body: JSON.stringify({ feedback: [] }),
        }),
      );
      expect(errors.length).toBe(2);
      // The uid is the whole identity here, so it must never appear in a log line.
      expect(JSON.stringify(errors)).not.toContain(UID_A);
      expect(JSON.stringify(errors)).toContain("memory");
    } finally {
      spy.mockRestore();
    }
  });

  it("G4: gcsPutJson non-precondition error propagates out of saveMemory (route turns it into unavailable)", async () => {
    stubGcsStore({ [memoryPath(UID_A)]: { feedback: [] } }, { uploadStatus: [500] });
    const { saveMemory } = await import("@/lib/memory/gcs-memory");
    await expect(saveMemory(UID_A, { feedback: [1] })).rejects.toThrow("GCS PUT failed: 500");
    stubGcsStore({ [memoryPath(UID_A)]: { feedback: [] } }, { uploadStatus: [500] });
    const { POST } = await import("@/app/api/memory/route");
    const response = await POST(
      new Request("http://localhost/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: `catalyst_uid=${UID_A}` },
        // Muatan yang sah menurut skema: yang diuji di sini adalah jalur
        // kegagalan GCS, dan sejak allowlist keras berlaku, body yang
        // berbentuk salah ditolak 400 sebelum sampai ke sana.
        body: JSON.stringify({ caseStatuses: {} }),
      }),
    );
    expect(response.status).toBe(200);
    expect(await response.json()).toEqual({ unavailable: true });
  });

  it("G5: a second precondition collision is NOT retried — the write is dropped as unavailable", async () => {
    stubGcsStore({ [memoryPath(UID_A)]: { feedback: [] } }, { uploadStatus: [412, 412] });
    const { saveMemory } = await import("@/lib/memory/gcs-memory");
    const { GcsPreconditionFailed } = await import("@/lib/gcp/gcs");
    await expect(saveMemory(UID_A, { feedback: [1] })).rejects.toBeInstanceOf(GcsPreconditionFailed);
    stubGcsStore({ [memoryPath(UID_A)]: { feedback: [] } }, { uploadStatus: [412, 412] });
    const { POST } = await import("@/app/api/memory/route");
    const response = await POST(
      new Request("http://localhost/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: `catalyst_uid=${UID_A}` },
        // Muatan yang sah menurut skema: yang diuji di sini adalah jalur
        // kegagalan GCS, dan sejak allowlist keras berlaku, body yang
        // berbentuk salah ditolak 400 sebelum sampai ke sana.
        body: JSON.stringify({ caseStatuses: {} }),
      }),
    );
    expect(await response.json()).toEqual({ unavailable: true });
  });

  it("G17: every GCS object path stays inside catalyst/memory/<36-char-uid>.json", async () => {
    const { seenPaths } = stubGcsStore({});
    const { GET, POST } = await import("@/app/api/memory/route");
    await GET(getRoute("catalyst_uid=../../etc/passwd.................."));
    await GET(getRoute("catalyst_uid=%2e%2e%2fetc%2fpasswd............."));
    const traversal = await GET(getRoute("catalyst_uid=not-a-uid"));
    // Unparseable cookie mints a fresh randomUUID, never the attacker string.
    const setCookie = traversal.headers.get("set-cookie") ?? "";
    expect(setCookie).toContain("catalyst_uid=");
    expect(setCookie).not.toContain("not-a-uid");
    await POST(
      new Request("http://localhost/api/memory", {
        method: "POST",
        headers: { "Content-Type": "application/json", cookie: `catalyst_uid=${UID_A}` },
        body: JSON.stringify({ feedback: [], holdings: {} }),
      }),
    );
    expect(seenPaths.length).toBeGreaterThan(0);
    for (const path of seenPaths) {
      expect(path).toMatch(/^catalyst\/memory\/[0-9a-f-]{36}\.json$/);
    }
  });
});
