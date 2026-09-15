import { afterEach, describe, expect, it, vi } from "vitest";
import { checkInternalAuth } from "@/lib/internal-auth";

/** Pentest Rec 3: `INTERNAL_CRON_SECRET` must gate `/api/internal/*` in
 *  production. Missing secret fails closed (503) outside local dev instead
 *  of serving scheduler endpoints open. */

const SECRET = "test-secret-123";

function requestWith(auth?: string): Request {
  return new Request("http://localhost/api/internal/check-sources", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });
}

describe("checkInternalAuth", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("requires the Bearer token when the secret is set", () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", SECRET);
    expect(checkInternalAuth(requestWith(`Bearer ${SECRET}`))).toEqual({ ok: true });
    const denied = checkInternalAuth(requestWith("Bearer wrong"));
    expect(denied.ok).toBe(false);
    if (!denied.ok) expect(denied.status).toBe(401);
    const missing = checkInternalAuth(requestWith());
    expect(missing.ok).toBe(false);
    if (!missing.ok) expect(missing.status).toBe(401);
  });

  it("fails closed (503) in production when the secret is missing", () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "production");
    const result = checkInternalAuth(requestWith());
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.status).toBe(503);
      expect(result.error).toBe("internal-auth-misconfigured");
    }
  });

  it("fails closed on Cloud Run (K_SERVICE) even if NODE_ENV is not production", () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", "");
    vi.stubEnv("NODE_ENV", "test");
    vi.stubEnv("K_SERVICE", "catalyst");
    const result = checkInternalAuth(requestWith());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("stays open for local dev when the secret is missing", () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", "");
    vi.stubEnv("K_SERVICE", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(checkInternalAuth(requestWith())).toEqual({ ok: true });
  });
});

describe("internal routes enforce the guard", () => {
  afterEach(() => {
    vi.unstubAllEnvs();
  });

  it("check-sources POST returns 503 in production without a secret", async () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", "");
    vi.stubEnv("K_SERVICE", "");
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("@/app/api/internal/check-sources/route");
    const response = await POST(requestWith());
    expect(response.status).toBe(503);
    expect((await response.json()).error).toBe("internal-auth-misconfigured");
  });

  it("check-sources POST returns 401 on a wrong token when the secret is set", async () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", SECRET);
    const { POST } = await import("@/app/api/internal/check-sources/route");
    const response = await POST(requestWith("Bearer wrong"));
    expect(response.status).toBe(401);
  });

  it("refresh-sectors POST returns 503 in production without a secret", async () => {
    vi.stubEnv("INTERNAL_CRON_SECRET", "");
    vi.stubEnv("K_SERVICE", "");
    vi.stubEnv("NODE_ENV", "production");
    const { POST } = await import("@/app/api/internal/refresh-sectors/route");
    const response = await POST(requestWith());
    expect(response.status).toBe(503);
  });
});
