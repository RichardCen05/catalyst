import { describe, expect, it, vi, beforeEach, afterEach } from "vitest";

describe("agentMode", () => {
  const originalEnv = { ...process.env };
  beforeEach(() => { vi.resetModules(); process.env = { ...originalEnv }; });
  afterEach(() => { process.env = originalEnv; });

  it("defaults to deterministic when AGENT_MODE is unset", async () => {
    delete process.env.AGENT_MODE;
    const { agentMode } = await import("@/lib/agent/mode");
    expect(agentMode()).toBe("deterministic");
  });

  it("returns llm only for the exact string 'llm'", async () => {
    process.env.AGENT_MODE = "llm";
    const { agentMode } = await import("@/lib/agent/mode");
    expect(agentMode()).toBe("llm");
  });

  it("treats any other value as deterministic, fail-closed", async () => {
    process.env.AGENT_MODE = "LLM";
    const { agentMode } = await import("@/lib/agent/mode");
    expect(agentMode()).toBe("deterministic");
  });
});
