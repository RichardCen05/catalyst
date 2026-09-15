import { afterEach, describe, expect, it, vi } from "vitest";

/** Pentest Rec 4 (vuln-0002, CWE-319): the GCP metadata token endpoint must
 *  stay HTTPS. An `http://` URL would send the service-account token in
 *  cleartext. This pins the scheme and the `Metadata-Flavor` header. */

describe("GCS metadata transport", () => {
  afterEach(() => {
    vi.unstubAllGlobals();
  });

  it("uses an https metadata token URL (no http downgrade)", async () => {
    const { METADATA_TOKEN_URL } = await import("@/lib/gcp/gcs");
    expect(METADATA_TOKEN_URL.startsWith("https://")).toBe(true);
    expect(METADATA_TOKEN_URL).not.toContain("http://");
    expect(METADATA_TOKEN_URL).toContain("metadata.google.internal");
  });

  it("fetches the token over https with the Metadata-Flavor header", async () => {
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

    expect(seen.length).toBeGreaterThan(0);
    for (const url of seen) expect(url.startsWith("https://")).toBe(true);
    const tokenCall = fetchMock.mock.calls.find(([url]) =>
      String(url).includes("metadata.google.internal"),
    );
    expect(tokenCall?.[1]).toMatchObject({ headers: { "Metadata-Flavor": "Google" } });
  });
});
