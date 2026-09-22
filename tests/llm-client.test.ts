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

/** The ceiling lives at the single choke point every model call passes
 *  through, so a 429 arriving mid-call is converted once, here, rather than
 *  at each of the three call sites. */
describe("generateStructured", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.GOOGLE_API_KEY = "test-key";
    delete process.env.LLM_DAILY_CALL_BUDGET;
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  const params = { model: "gemini-3.5-flash", systemInstruction: "sys", contents: "hi", schema: {} };

  it("turns a 429 from the model into a rate-limit refusal and closes the gate", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    const generateContent = vi.fn().mockRejectedValue(Object.assign(new Error("RESOURCE_EXHAUSTED"), { status: 429 }));
    vi.doMock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent }; } }));
    const noteLlmRateLimited = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/agent/llm/budget", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/agent/llm/budget")>()),
      noteLlmRateLimited,
    }));

    const { generateStructured } = await import("@/lib/agent/llm/client");
    await expect(generateStructured(params)).rejects.toMatchObject({ name: "LlmBudgetError", reason: "rate-limit" });
    expect(noteLlmRateLimited).toHaveBeenCalledOnce();
  });

  it("leaves a non-429 failure untouched so the real reason still reaches the log", async () => {
    const generateContent = vi.fn().mockRejectedValue(new Error("403 PERMISSION_DENIED"));
    vi.doMock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent }; } }));

    const { generateStructured } = await import("@/lib/agent/llm/client");
    await expect(generateStructured(params)).rejects.toThrow(/403 PERMISSION_DENIED/);
  });

  it("names a truncated response instead of failing on the cut-off JSON", async () => {
    const generateContent = vi.fn().mockResolvedValue({
      candidates: [{ finishReason: "MAX_TOKENS" }],
      text: '{"text": "Berdasarkan ringkasan bukti yang',
    });
    vi.doMock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent }; } }));

    const { generateStructured } = await import("@/lib/agent/llm/client");
    await expect(generateStructured(params)).rejects.toThrow(/MAX_TOKENS/);
  });

  it("leaves room for reasoning tokens alongside the answer", async () => {
    const generateContent = vi.fn().mockResolvedValue({ candidates: [{ finishReason: "STOP" }], text: '{"ok":true}' });
    vi.doMock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent }; } }));

    const { generateStructured } = await import("@/lib/agent/llm/client");
    await generateStructured(params);
    expect(generateContent.mock.calls[0][0].config.maxOutputTokens).toBe(2048);
  });

  it("refuses before the request leaves once the day is over budget", async () => {
    process.env.LLM_DAILY_CALL_BUDGET = "1";
    const generateContent = vi.fn();
    vi.doMock("@google/genai", () => ({ GoogleGenAI: class { models = { generateContent }; } }));
    vi.doMock("@/lib/agent/llm/budget", async (importOriginal) => {
      const actual = await importOriginal<typeof import("@/lib/agent/llm/budget")>();
      return { ...actual, reserveLlmCall: async () => { throw new actual.LlmBudgetError("budget", "Daily model call budget reached (1/1)"); } };
    });

    const { generateStructured } = await import("@/lib/agent/llm/client");
    await expect(generateStructured(params)).rejects.toMatchObject({ reason: "budget" });
    expect(generateContent).not.toHaveBeenCalled();
  });
});

/** Several OpenAI-compatible models fence their JSON. Dropping the panel to
 *  the deterministic path over the packaging of an otherwise valid answer
 *  would be a regression the reader cannot see the cause of. */
describe("generateStructured across providers", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    // The cases above leave module mocks registered; resetModules alone keeps
    // them, so the budget seam would still be the stub that always refuses.
    vi.doUnmock("@/lib/agent/llm/budget");
    vi.doUnmock("@google/genai");
    process.env = { ...originalEnv };
    delete process.env.LLM_DAILY_CALL_BUDGET;
    process.env.LLM_PROVIDER = "openai-compatible";
    process.env.LLM_BASE_URL = "https://example.invalid/v1";
    process.env.LLM_API_KEY = "test-key";
  });

  afterEach(() => {
    process.env = originalEnv;
    vi.unstubAllGlobals();
    vi.restoreAllMocks();
  });

  it("parses a fenced answer from an openai-compatible provider", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({
        ok: true,
        status: 200,
        statusText: "OK",
        json: async () => ({ choices: [{ message: { content: '```json\n{"sentence":"halo"}\n```' }, finish_reason: "stop" }] }),
      }),
    );
    const { generateStructured } = await import("@/lib/agent/llm/client");
    await expect(
      generateStructured({ model: "vendor/model", systemInstruction: "sys", contents: "hi", schema: {} }),
    ).resolves.toEqual({ sentence: "halo" });
  });

  it("closes the day's gate on a 429 from a non-Google provider", async () => {
    vi.spyOn(console, "warn").mockImplementation(() => {});
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue({ ok: false, status: 429, statusText: "Too Many Requests", json: async () => ({}) }),
    );
    const noteLlmRateLimited = vi.fn().mockResolvedValue(undefined);
    vi.doMock("@/lib/agent/llm/budget", async (importOriginal) => ({
      ...(await importOriginal<typeof import("@/lib/agent/llm/budget")>()),
      noteLlmRateLimited,
    }));
    const { generateStructured } = await import("@/lib/agent/llm/client");
    await expect(
      generateStructured({ model: "vendor/model", systemInstruction: "sys", contents: "hi", schema: {} }),
    ).rejects.toMatchObject({ name: "LlmBudgetError", reason: "rate-limit" });
    expect(noteLlmRateLimited).toHaveBeenCalled();
  });
});
