export type AgentMode = "deterministic" | "llm";

export function agentMode(): AgentMode {
  return process.env.AGENT_MODE === "llm" ? "llm" : "deterministic";
}
