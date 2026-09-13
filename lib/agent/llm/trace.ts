export interface TraceEntry {
  requestId: string;
  step: "plan" | "tool-call" | "re-query" | "verify";
  detail: string;
  at: string;
}

const traces = new Map<string, TraceEntry[]>();

export function recordTrace(entry: TraceEntry): void {
  const list = traces.get(entry.requestId) ?? [];
  list.push(entry);
  traces.set(entry.requestId, list);
}

export function getTrace(requestId: string): TraceEntry[] {
  return traces.get(requestId) ?? [];
}
