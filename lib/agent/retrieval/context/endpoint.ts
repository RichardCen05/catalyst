import { knownEndpointClaims } from "@/lib/data/endpoint-registry";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/**
 * One corpus entry per feed the app cites.
 *
 * The claim registry in `endpoint-registry.ts` is what the app is allowed to
 * describe; these entries make the same registry searchable, so "dari mana
 * angka broker ANT M" can reach the feed instead of falling to the menu. The
 * key is the registry's own (`template + field`), looked up verbatim — never
 * parsed, never re-typed — so a new feed adds an entry with nothing to keep
 * in sync.
 */
export function listEndpointKeys(): string[] {
  return [...knownEndpointClaims().keys()];
}

/** What one feed holds: its provider, address, and columns. */
export async function buildEndpointBundle(key: string): Promise<ContextBundle> {
  const claim = knownEndpointClaims().get(key);
  if (!claim) {
    return {
      id: `endpoint:${key}`, kind: "endpoint", title: key,
      body: "Sumber ini tidak ada pada rekaman.", figures: [], citations: [], symbols: [],
    };
  }
  const body = [
    `Sumber "${claim.label}" dari ${claim.provider}.`,
    `Alamat rekaman ${claim.endpoint}, kolom ${claim.field}.`,
  ].join("\n");
  return {
    id: `endpoint:${key}`,
    kind: "endpoint",
    title: claim.label,
    body,
    figures: extractNumerals(body),
    citations: [claim],
    symbols: [],
  };
}
