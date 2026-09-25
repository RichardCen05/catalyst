import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

/**
 * The provider seam exists so a quota wall at one vendor is an env change.
 * These cover what that promise rests on: the right provider is selected, a
 * non-Google 429 still closes the day's gate, and a model id is never guessed
 * for a provider that would not recognise it.
 */
describe("getLlmProvider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it("defaults to gemini when LLM_PROVIDER is unset", async () => {
    delete process.env.LLM_PROVIDER;
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    expect(getLlmProvider().id).toBe("gemini");
  });

  it("selects the openai-compatible provider by name", async () => {
    process.env.LLM_PROVIDER = "openai-compatible";
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    expect(getLlmProvider().id).toBe("openai-compatible");
  });

  it("names the known providers when asked for one that does not exist", async () => {
    process.env.LLM_PROVIDER = "hal9000";
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    expect(() => getLlmProvider()).toThrow(/hal9000[\s\S]*gemini, openai-compatible/);
  });

  it("refuses an openai-compatible call with no base URL configured", async () => {
    process.env.LLM_PROVIDER = "openai-compatible";
    delete process.env.LLM_BASE_URL;
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(
      getLlmProvider().generate({ model: "m", systemInstruction: "s", contents: "c", schema: {}, maxOutputTokens: 16 }),
    ).rejects.toThrow(/LLM_BASE_URL/);
  });

  it("refuses an openai-compatible call with no key configured", async () => {
    process.env.LLM_PROVIDER = "openai-compatible";
    process.env.LLM_BASE_URL = "https://example.invalid/v1";
    delete process.env.LLM_API_KEY;
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(
      getLlmProvider().generate({ model: "m", systemInstruction: "s", contents: "c", schema: {}, maxOutputTokens: 16 }),
    ).rejects.toThrow(/LLM_API_KEY/);
  });
});

describe("the openai-compatible provider", () => {
  const originalEnv = { ...process.env };
  const request = { model: "m", systemInstruction: "s", contents: "c", schema: {}, maxOutputTokens: 16 };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.LLM_PROVIDER = "openai-compatible";
    process.env.LLM_BASE_URL = "https://example.invalid/v1";
    process.env.LLM_API_KEY = "test-key";
  });
  afterEach(() => {
    process.env = originalEnv;
    vi.restoreAllMocks();
  });

  function stubFetch(status: number, body: unknown) {
    const fetchMock = vi.fn().mockResolvedValue({
      ok: status < 400,
      status,
      statusText: `HTTP ${status}`,
      json: async () => body,
    });
    vi.stubGlobal("fetch", fetchMock);
    return fetchMock;
  }

  it("asks for a strict json_schema and returns the content", async () => {
    const fetchMock = stubFetch(200, { choices: [{ message: { content: '{"ok":true}' }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(getLlmProvider().generate(request)).resolves.toBe('{"ok":true}');
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(fetchMock.mock.calls[0][0]).toBe("https://example.invalid/v1/chat/completions");
    expect(body.response_format).toMatchObject({ type: "json_schema", json_schema: { strict: true } });
    expect(body.messages).toEqual([
      { role: "system", content: "s" },
      { role: "user", content: "c" },
    ]);
  });

  it("sends no reasoning field unless one is asked for", async () => {
    // Every vendor behind this provider does not have the field, and a
    // strict one answers 400 to a key it does not know.
    delete process.env.LLM_REASONING;
    const fetchMock = stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await getLlmProvider().generate(request);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body)).not.toHaveProperty("reasoning");
  });

  it("turns thinking off when asked to", async () => {
    process.env.LLM_REASONING = "off";
    const fetchMock = stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await getLlmProvider().generate(request);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).reasoning).toEqual({ enabled: false });
  });

  it("passes an effort through by name", async () => {
    process.env.LLM_REASONING = "low";
    const fetchMock = stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await getLlmProvider().generate(request);
    expect(JSON.parse(fetchMock.mock.calls[0][1].body).reasoning).toEqual({ effort: "low" });
  });

  /** DeepSeek-style gateways ignore `reasoning` and read `thinking`. */
  it("turns thinking off in the thinking shape when the gateway reads that field", async () => {
    process.env.LLM_REASONING = "off";
    process.env.LLM_REASONING_FIELD = "thinking";
    const fetchMock = stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await getLlmProvider().generate(request);
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.thinking).toEqual({ type: "disabled" });
    expect(body).not.toHaveProperty("reasoning");
  });

  it("names the accepted field shapes", async () => {
    process.env.LLM_REASONING = "off";
    process.env.LLM_REASONING_FIELD = "think";
    stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(getLlmProvider().generate(request)).rejects.toThrow(/reasoning, thinking/);
  });

  /** A gateway that drops json_schema answers in prose; the schema then has
   *  to travel in the system instruction under json_object. */
  it("carries the schema in the system instruction in prompt mode", async () => {
    process.env.LLM_SCHEMA_MODE = "prompt";
    const fetchMock = stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    const schema = { type: "object", properties: { sentence: { type: "string" } }, required: ["sentence"] };
    await getLlmProvider().generate({ ...request, schema });
    const body = JSON.parse(fetchMock.mock.calls[0][1].body);
    expect(body.response_format).toEqual({ type: "json_object" });
    expect(body.messages[0].role).toBe("system");
    expect(body.messages[0].content.startsWith("s\n\n")).toBe(true);
    expect(body.messages[0].content).toContain(JSON.stringify(schema));
    expect(body.messages[1]).toEqual({ role: "user", content: "c" });
  });

  it("names the accepted schema modes", async () => {
    process.env.LLM_SCHEMA_MODE = "loose";
    stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(getLlmProvider().generate(request)).rejects.toThrow(/strict, prompt/);
  });

  it("names the accepted values rather than sending a typo to the vendor", async () => {
    process.env.LLM_REASONING = "medium-ish";
    stubFetch(200, { choices: [{ message: { content: "{}" }, finish_reason: "stop" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(getLlmProvider().generate(request)).rejects.toThrow(/off, low, medium, high/);
  });

  it("carries the status so a 429 is recognised as a rate limit", async () => {
    stubFetch(429, { error: { message: "rate-limited upstream" } });
    const [{ getLlmProvider }, { isRateLimitError }] = await Promise.all([
      import("@/lib/agent/llm/providers"),
      import("@/lib/agent/llm/budget"),
    ]);
    const error = await getLlmProvider().generate(request).catch((thrown) => thrown);
    expect((error as { status: number }).status).toBe(429);
    expect(isRateLimitError(error)).toBe(true);
  });

  /** OpenRouter answers 200 with the refusal in the body; a gate that only
   *  reads response.status would treat it as a successful empty answer. */
  it("treats an error object inside a 200 body as a refusal", async () => {
    stubFetch(200, { error: { message: "only available on agentic harnesses", code: 403 } });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(getLlmProvider().generate(request)).rejects.toThrow(/403.*agentic harnesses/);
  });

  it("names truncation rather than letting it surface as a parse error", async () => {
    stubFetch(200, { choices: [{ message: { content: '{"ok":' }, finish_reason: "length" }] });
    const { getLlmProvider } = await import("@/lib/agent/llm/providers");
    await expect(getLlmProvider().generate(request)).rejects.toThrow(/finish_reason=length/);
  });
});

describe("model resolution", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    for (const key of ["LLM_PROVIDER", "LLM_MODEL", "LLM_MODEL_CHEAP", "GEMINI_MODEL", "GEMINI_MODEL_CHEAP"]) {
      delete process.env[key];
    }
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it("falls back to the Gemini defaults while the provider is Gemini", async () => {
    const { strongModel, cheapModel } = await import("@/lib/agent/llm/models");
    expect(strongModel()).toBe("gemini-3.8-flash");
    expect(cheapModel()).toBe("gemini-3.5-flash-lite");
  });

  it("still honours the existing GEMINI_MODEL names", async () => {
    process.env.GEMINI_MODEL = "gemini-from-env";
    process.env.GEMINI_MODEL_CHEAP = "gemini-cheap-from-env";
    const { strongModel, cheapModel } = await import("@/lib/agent/llm/models");
    expect(strongModel()).toBe("gemini-from-env");
    expect(cheapModel()).toBe("gemini-cheap-from-env");
  });

  it("prefers the provider-neutral names over the Gemini ones", async () => {
    process.env.GEMINI_MODEL = "gemini-from-env";
    process.env.LLM_MODEL = "vendor/model";
    const { strongModel } = await import("@/lib/agent/llm/models");
    expect(strongModel()).toBe("vendor/model");
  });

  /** A Gemini id sent to another vendor fails at request time with a vendor
   *  error; refusing here fails at the first call with a readable one. */
  it("refuses to guess a model id for a non-Gemini provider", async () => {
    process.env.LLM_PROVIDER = "openai-compatible";
    const { strongModel } = await import("@/lib/agent/llm/models");
    expect(() => strongModel()).toThrow(/requires LLM_MODEL/);
  });

  it("runs one model for both jobs when no cheap tier is named", async () => {
    process.env.LLM_PROVIDER = "openai-compatible";
    process.env.LLM_MODEL = "vendor/model";
    const { cheapModel } = await import("@/lib/agent/llm/models");
    expect(cheapModel()).toBe("vendor/model");
  });
});

/**
 * A deployment switching away from Gemini still carries GEMINI_MODEL and
 * GEMINI_MODEL_CHEAP. Reading either one under another provider sends a
 * Gemini id to a vendor that answers 404.
 */
describe("model resolution ignores the Gemini names under another provider", () => {
  const originalEnv = { ...process.env };

  beforeEach(() => {
    vi.resetModules();
    process.env = { ...originalEnv };
    process.env.LLM_PROVIDER = "openai-compatible";
    process.env.GEMINI_MODEL = "gemini-3.8-flash";
    process.env.GEMINI_MODEL_CHEAP = "gemini-3.5-flash-lite";
    delete process.env.LLM_MODEL;
    delete process.env.LLM_MODEL_CHEAP;
  });
  afterEach(() => {
    process.env = originalEnv;
  });

  it("refuses rather than inheriting GEMINI_MODEL", async () => {
    const { strongModel } = await import("@/lib/agent/llm/models");
    expect(() => strongModel()).toThrow(/requires LLM_MODEL/);
  });

  it("does not let GEMINI_MODEL_CHEAP become the draft model", async () => {
    process.env.LLM_MODEL = "vendor/model";
    const { cheapModel } = await import("@/lib/agent/llm/models");
    expect(cheapModel()).toBe("vendor/model");
  });
});
