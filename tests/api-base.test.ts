import { afterEach, describe, expect, it, vi } from "vitest";

afterEach(() => {
  vi.unstubAllEnvs();
  vi.resetModules();
});

describe("apiUrl split contract", () => {
  it("stays same-origin relative when the base is empty (Cloud Run UI, local)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "");
    const { apiUrl } = await import("@/lib/api-base");
    expect(apiUrl("/api/chat")).toBe("/api/chat");
  });

  it("prefixes the Cloud Run API origin and trims trailing slashes (Vercel UI)", async () => {
    vi.stubEnv("NEXT_PUBLIC_API_BASE_URL", "https://catalyst-api-xyz.run.app///");
    const { apiUrl } = await import("@/lib/api-base");
    expect(apiUrl("/api/chat")).toBe("https://catalyst-api-xyz.run.app/api/chat");
    expect(apiUrl("/api/memory")).toBe("https://catalyst-api-xyz.run.app/api/memory");
  });
});

describe("api CORS middleware", () => {
  const preflight = (origin?: string) =>
    new Request("https://catalyst-api-xyz.run.app/api/chat", {
      method: "OPTIONS",
      ...(origin ? { headers: { Origin: origin } } : {}),
    });

  it("answers preflight with the allowlisted Vercel origin", async () => {
    vi.stubEnv("API_CORS_ORIGIN", "https://catalyst.vercel.app");
    const { middleware } = await import("@/middleware");
    const response = middleware(preflight("https://catalyst.vercel.app"));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBe("https://catalyst.vercel.app");
  });

  it("refuses preflight from unknown origins (no ACAO header)", async () => {
    vi.stubEnv("API_CORS_ORIGIN", "https://catalyst.vercel.app");
    const { middleware } = await import("@/middleware");
    const response = middleware(preflight("https://evil.example"));
    expect(response.status).toBe(204);
    expect(response.headers.get("Access-Control-Allow-Origin")).toBeNull();
  });
});