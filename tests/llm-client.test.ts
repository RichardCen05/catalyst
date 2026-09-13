import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("getGenAiClient", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });

  afterEach(() => {
    process.env = originalEnv;
  });

  it("throws a clear error when no credentials are configured", async () => {
    delete process.env.GOOGLE_API_KEY;
    delete process.env.GOOGLE_GENAI_USE_ENTERPRISE;
    const { getGenAiClient } = await import("@/lib/agent/llm/client");
    expect(() => getGenAiClient()).toThrow(/GOOGLE_API_KEY/);
  });

  it("constructs a Developer API client when GOOGLE_API_KEY is set", async () => {
    process.env.GOOGLE_API_KEY = "test-key";
    const { getGenAiClient } = await import("@/lib/agent/llm/client");
    expect(() => getGenAiClient()).not.toThrow();
  });
});
