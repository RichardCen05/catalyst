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
