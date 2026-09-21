import { events, companies } from "@/lib/data/fixtures";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";
import type { SymbolCode } from "@/lib/types";

/**
 * The causal map, described rather than drawn.
 *
 * This is the page a reader is looking at when they ask how everything joins
 * up, and until now the assistant could not see it at all. The counts are
 * computed over every recorded event, not over a sample, so a question about
 * "semua" can be answered without overclaiming.
 *
 * Mechanism labels come from the engine's own `mechanismLabelFor`, so the
 * sentence names the same mechanism the map draws. The engine is imported
 * inside the function to keep the retrieval layer free of a load-time cycle.
 */
export async function buildImpactBundle(): Promise<ContextBundle> {
  const { mechanismLabelFor } = await import("@/lib/agent/engine");

  const mechanisms = new Map<string, Set<SymbolCode>>();
  const touched = new Set<SymbolCode>();
  let linkCount = 0;

  for (const event of events) {
    for (const link of event.impactLinks) {
      linkCount += 1;
      touched.add(link.symbol);
      const label = mechanismLabelFor(undefined, link.path, event.category);
      const owners = mechanisms.get(label) ?? new Set<SymbolCode>();
      owners.add(link.symbol);
      mechanisms.set(label, owners);
    }
  }

  const ranked = [...mechanisms.entries()].sort((first, second) => second[1].size - first[1].size);
  const body = [
    `Peta sebab akibat menghubungkan sumber ke mekanisme ke emiten ke dampak bisnis.`,
    `Rekaman ini memuat ${events.length} peristiwa dengan ${linkCount} jalur dampak, menyentuh ${touched.size} dari ${companies.length} emiten.`,
    `Mekanisme yang tercatat, dengan jumlah emiten yang disentuh masing-masing:`,
    ...ranked.map(([label, owners]) => `- ${label}: ${owners.size} emiten (${[...owners].join(", ")})`),
  ].join("\n");

  return {
    id: "view:impact",
    kind: "view",
    title: "Peta sebab akibat",
    body,
    figures: extractNumerals(body),
    // Every mechanism counted here comes from a recorded event's impact
    // links, so the event citations travel with the count.
    citations: [...new Map(events.flatMap((event) => event.citations).map((citation) => [citation.id, citation])).values()].slice(0, 12),
    symbols: [...touched],
  };
}
