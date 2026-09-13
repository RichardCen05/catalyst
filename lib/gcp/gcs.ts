/**
 * Minimal Google Cloud Storage JSON API client over plain `fetch`.
 *
 * No `@google-cloud/storage` dependency — Catalyst's dependency rule allows
 * only `@google/genai` and a graph-layout library. On Cloud Run the runtime
 * service account's token is available from the metadata server with zero
 * extra packages, so a REST client covers exactly the two calls (get/put)
 * this app needs.
 *
 * There is no local fallback: outside Cloud Run (or a machine with
 * `gcloud auth application-default login` wired to the same metadata
 * endpoint shape) these calls fail closed, and callers must treat that as
 * "GCS unavailable" rather than an error to surface to the user.
 */

const METADATA_TOKEN_URL =
  "http://metadata.google.internal/computeMetadata/v1/instance/service-accounts/default/token";

let cachedToken: { value: string; expiresAt: number } | null = null;

async function getAccessToken(): Promise<string> {
  if (cachedToken && cachedToken.expiresAt > Date.now() + 30_000) return cachedToken.value;
  const response = await fetch(METADATA_TOKEN_URL, { headers: { "Metadata-Flavor": "Google" } });
  if (!response.ok) throw new Error(`metadata token fetch failed: ${response.status}`);
  const body = (await response.json()) as { access_token: string; expires_in: number };
  cachedToken = { value: body.access_token, expiresAt: Date.now() + body.expires_in * 1000 };
  return cachedToken.value;
}

export class GcsPreconditionFailed extends Error {
  constructor() {
    super("GCS precondition failed (generation mismatch)");
  }
}

export interface GcsObject<T> {
  data: T;
  generation: string;
}

/** Read one JSON object. Returns null on 404. Throws on any other failure — callers decide how to degrade. */
export async function gcsGetJson<T>(bucket: string, objectPath: string): Promise<GcsObject<T> | null> {
  const token = await getAccessToken();
  const metaUrl = `https://storage.googleapis.com/storage/v1/b/${bucket}/o/${encodeURIComponent(objectPath)}`;
  const metaResponse = await fetch(metaUrl, { headers: { Authorization: `Bearer ${token}` } });
  if (metaResponse.status === 404) return null;
  if (!metaResponse.ok) throw new Error(`GCS metadata GET failed: ${metaResponse.status}`);
  const meta = (await metaResponse.json()) as { generation: string };

  const mediaResponse = await fetch(`${metaUrl}?alt=media`, { headers: { Authorization: `Bearer ${token}` } });
  if (!mediaResponse.ok) throw new Error(`GCS media GET failed: ${mediaResponse.status}`);
  return { data: (await mediaResponse.json()) as T, generation: meta.generation };
}

/**
 * Write one JSON object. Pass `ifGenerationMatch` to guard against a
 * concurrent writer — `"0"` means "only create, fail if it already exists".
 * Throws `GcsPreconditionFailed` on a 412 so the caller can read-merge-retry.
 */
export async function gcsPutJson(
  bucket: string,
  objectPath: string,
  data: unknown,
  options?: { ifGenerationMatch?: string },
): Promise<{ generation: string }> {
  const token = await getAccessToken();
  const params = new URLSearchParams({ uploadType: "media", name: objectPath });
  if (options?.ifGenerationMatch !== undefined) params.set("ifGenerationMatch", options.ifGenerationMatch);
  const response = await fetch(`https://storage.googleapis.com/upload/storage/v1/b/${bucket}/o?${params}`, {
    method: "POST",
    headers: { Authorization: `Bearer ${token}`, "Content-Type": "application/json" },
    body: JSON.stringify(data),
  });
  if (response.status === 412) throw new GcsPreconditionFailed();
  if (!response.ok) throw new Error(`GCS PUT failed: ${response.status}`);
  const body = (await response.json()) as { generation: string };
  return { generation: body.generation };
}
