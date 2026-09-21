import { events } from "@/lib/data/fixtures";
import { mechanismLabelFor } from "@/lib/agent/mechanism-label";
import { normalizeQuery } from "@/lib/agent/query";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";
import type { SymbolCode } from "@/lib/types";

export interface CausalNode {
  slug: string;
  label: string;
  owners: SymbolCode[];
  eventIds: string[];
}

/**
 * One corpus node per mechanism the recordings draw.
 *
 * The impact page draws one card per mechanism label; the corpus carries one
 * searchable entry per label so a question naming a mechanism ("jalur
 * realisasi harga") lands on the node instead of the whole map. Labels come
 * from the same `mechanismLabelFor` the map draws, never re-typed, so the
 * two cannot drift apart. Like everything else in the corpus, nodes are
 * derived from the recordings: a new event that introduces a mechanism adds
 * a node with no list to maintain.
 */
export function listCausalNodes(): CausalNode[] {
  const grouped = new Map<string, { owners: Set<SymbolCode>; eventIds: Set<string> }>();
  for (const event of events) {
    for (const link of event.impactLinks) {
      const label = mechanismLabelFor(undefined, link.path, event.category);
      const node = grouped.get(label) ?? { owners: new Set<SymbolCode>(), eventIds: new Set<string>() };
      node.owners.add(link.symbol);
      node.eventIds.add(event.id);
      grouped.set(label, node);
    }
  }
  const slugs = new Set<string>();
  return [...grouped.entries()].map(([label, node]) => {
    const stem = normalizeQuery(label).replace(/\s+/g, "-") || "node";
    let slug = stem;
    let attempt = 2;
    while (slugs.has(slug)) slug = `${stem}-${attempt++}`;
    slugs.add(slug);
    return {
      slug,
      label,
      owners: [...node.owners],
      eventIds: [...node.eventIds],
    };
  });
}

/** One mechanism, the emiten it touches, and the events that drew it. */
export async function buildCausalNodeBundle(slug: string): Promise<ContextBundle> {
  const node = listCausalNodes().find((item) => item.slug === slug);
  if (!node) {
    return {
      id: `causal-node:${slug}`, kind: "causal-node", title: slug,
      body: "Jalur ini tidak ada pada rekaman.", figures: [], citations: [], symbols: [],
    };
  }
  const nodeEvents = events.filter((event) => node.eventIds.includes(event.id));
  const body = [
    `Mekanisme "${node.label}" menyentuh ${node.owners.length} emiten: ${node.owners.join(", ")}.`,
    `Terekam pada ${nodeEvents.length} peristiwa:`,
    ...nodeEvents.slice(0, 8).map((event) => `- ${event.title}`),
  ].join("\n");
  return {
    id: `causal-node:${node.slug}`,
    kind: "causal-node",
    title: `Jalur ${node.label}`,
    body,
    figures: extractNumerals(body),
    citations: [...new Map(nodeEvents.flatMap((event) => event.citations).map((citation) => [citation.id, citation])).values()].slice(0, 12),
    symbols: node.owners,
  };
}
