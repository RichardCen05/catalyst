/**
 * Merge every watchlist chain into one graph.
 *
 * The per-issuer chain in lib/agent/engine.ts answers "what moved ANTM". The
 * dashboard asks the wider question — what is moving the whole book — and an
 * answer that draws six chains side by side does not answer it. Six parallel
 * rows look like six unrelated charts that happen to share a page, which is
 * the opposite of what the board is for.
 *
 * So the merge collapses on every axis where two chains are making the same
 * claim, not only on recordings:
 *
 * - **Sources collapse by recording.** `source-${event.id}` is already stable
 *   across symbols, so one print linked to ADRO and PTBA is one card with two
 *   outgoing paths, never two identical cards in separate trees.
 * - **Mechanisms collapse by transmission channel.** The engine names them
 *   `mechanism-${event.id}-${symbol}`, one per source per issuer, which is why
 *   the board used to have twenty-six mechanism cards saying six things. They
 *   are keyed on the channel label here instead, so "realisasi harga" is one
 *   hub that every commodity print feeds and that fans out to every issuer
 *   whose margin runs through it. The hub is the shape of the board: the
 *   recordings are many, the channels they act through are few.
 * - **Business impacts collapse by dimension.** `business-impact-margin` is
 *   the same test wherever it is run, so the issuers converge into it rather
 *   than each carrying a private copy.
 * - **Co-movement is dropped.** Those nodes are correlation questions aimed at
 *   a single target, answered on the per-issuer chain where the falsification
 *   condition is in view. Carried here they would read as issuer-to-issuer
 *   causation and would break the semantic column order the layout needs.
 *
 * What a hub does **not** do is join two issuers' evidence. Every edge keeps
 * the symbol it was built for, so a path through a hub is only ever read one
 * issuer at a time: ADRO's coal print reaches ADRO, and the focus control and
 * the highlight walk both trace that single path. A hub says these issuers
 * are exposed through the same channel, which the recordings do say; it never
 * says one issuer's source reached another's margin.
 *
 * Nothing is invented. A source reaches two symbols because the recording
 * links it to both, never because the issuers share a sector or a commodity.
 */

import { agentEngine } from "@/lib/agent/engine";
import { coverageInfo, events } from "@/lib/data/fixtures";
import type {
  AnalysisContext,
  CausalGraph,
  Citation,
  MarketCausalEdge,
  MarketCausalGraph,
  MarketCausalNode,
  SymbolCode,
  UserProfile,
} from "@/lib/types";

/** Channel labels are prose ("realisasi harga", "kas dan saham beredar"), so
 *  they are slugged before they become an id. */
function slug(label: string): string {
  return label.toLowerCase().normalize("NFKD").replace(/[^a-z0-9]+/g, "-").replace(/^-|-$/g, "");
}

/**
 * The id a node takes on the merged board.
 *
 * Sources and business impacts already carry ids that mean the same thing in
 * every chain. Mechanisms do not — theirs name the event and the issuer that
 * produced them — so they are re-keyed on the channel they describe, which is
 * the whole reason the merged board has hubs rather than six parallel rows.
 */
function mergedId(node: CausalGraph["nodes"][number]): string {
  return node.kind === "mechanism" ? `mechanism-${slug(node.label)}` : node.id;
}

function mergeCitations(into: Citation[], from: Citation[]): Citation[] {
  const seen = new Set(into.map((citation) => citation.id));
  return [...into, ...from.filter((citation) => !seen.has(citation.id) && seen.add(citation.id))];
}

/**
 * Recordings the provider links to more than one of these issuers.
 *
 * These are the only edges that make the merged graph more than six chains
 * side by side, and the per-issuer source bound does not know that: ADRO
 * carries seven linked recordings and the coal print ranks seventh, so the
 * one node joining ADRO to PTBA is the first thing a bound of six throws
 * away. Naming them here keeps them ahead of the bound on both sides.
 */
function sharedEventIds(symbols: SymbolCode[]): string[] {
  const inScope = new Set<string>(symbols);
  return events
    .filter((event) => new Set(event.impactLinks.filter((link) => inScope.has(link.symbol)).map((link) => link.symbol)).size > 1)
    .map((event) => event.id);
}

/** Source cards per issuer on the merged canvas. Higher than the chain's six:
 *  the dashboard is the whole book, and the cards past the sixth are what the
 *  hubs are built out of. */
const MARKET_MAX_SOURCES = 8;

export async function buildMarketGraph(
  symbols: SymbolCode[],
  profile: UserProfile,
  options: { minRelevance: number; context?: (symbol: SymbolCode) => AnalysisContext | undefined },
): Promise<MarketCausalGraph> {
  const prioritizeEventIds = sharedEventIds(symbols);
  const results = await Promise.all(
    symbols.map(async (symbol): Promise<[SymbolCode, CausalGraph | null]> => [
      symbol,
      await agentEngine.buildCausalGraph(symbol, profile, {
        scope: "market",
        minRelevance: options.minRelevance,
        context: options.context?.(symbol),
        maxSources: MARKET_MAX_SOURCES,
        prioritizeEventIds,
      }),
    ]),
  );

  const nodes = new Map<string, MarketCausalNode>();
  const edgeByPath = new Map<string, MarketCausalEdge>();
  const coverage: MarketCausalGraph["coverage"] = {};
  const skipped: MarketCausalGraph["skipped"] = [];
  const drawn: SymbolCode[] = [];
  let hiddenRelationshipCount = 0;
  let asOf = "";

  for (const [symbol, graph] of results) {
    if (!graph) {
      const info = coverageInfo[symbol];
      skipped.push({
        symbol,
        reason: info?.linkedEvents === 0
          ? "Belum ada sumber terekam yang tertaut ke emiten ini."
          : "Rekaman emiten ini belum cukup untuk membentuk rantai.",
      });
      continue;
    }
    drawn.push(symbol);
    coverage[symbol] = graph.coverage;
    hiddenRelationshipCount += graph.hiddenRelationshipCount;
    if (graph.asOf > asOf) asOf = graph.asOf;

    // Co-movement lives on the per-issuer chain, not here — see the header.
    const dropped = new Set(
      graph.nodes.filter((node) => node.basis === "Observed correlation").map((node) => node.id),
    );

    const idMap = new Map<string, string>();
    for (const node of graph.nodes) {
      if (dropped.has(node.id)) continue;
      const id = mergedId(node);
      idMap.set(node.id, id);
      const existing = nodes.get(id);
      if (existing) {
        // Same recording or same channel, another issuer. Keep the first
        // card's wording and record that the path now fans out; the evidence
        // behind it accumulates rather than being overwritten.
        if (!existing.symbols.includes(symbol)) existing.symbols.push(symbol);
        existing.citations = mergeCitations(existing.citations, node.citations);
        existing.relevance = Math.max(existing.relevance ?? 0, node.relevance ?? 0);
        continue;
      }
      nodes.set(id, { ...node, id, symbols: [symbol] });
    }

    for (const edge of graph.edges) {
      if (dropped.has(edge.from) || dropped.has(edge.to)) continue;
      const from = idMap.get(edge.from) ?? edge.from;
      const to = idMap.get(edge.to) ?? edge.to;
      // Collapsing mechanisms can leave one issuer with several identical
      // hub → issuer edges, one per recording that used the channel. They are
      // the same claim drawn on top of itself, so the strongest one stands
      // and the rest would only thicken the line.
      const key = `${symbol}::${from}::${to}`;
      const existing = edgeByPath.get(key);
      if (existing && existing.relevance >= edge.relevance) continue;
      edgeByPath.set(key, { ...edge, id: `${symbol}::${edge.id}`, from, to, symbol });
    }
  }

  const all = [...nodes.values()];
  const sharedSourceIds = all.filter((node) => node.kind === "source" && node.symbols.length > 1).map((node) => node.id);
  const hubNodeIds = all.filter((node) => node.symbols.length > 1).map((node) => node.id);

  return {
    symbols: drawn,
    nodes: all,
    edges: [...edgeByPath.values()],
    sharedSourceIds,
    hubNodeIds,
    hiddenRelationshipCount,
    skipped,
    asOf,
    coverage,
  };
}

/** Nodes and edges reachable from a symbol's company node, in both
 *  directions — the same walk the per-issuer chain uses, applied to one
 *  issuer inside the merged graph. A hub belongs to every issuer that runs
 *  through it, so focusing one issuer keeps its hubs lit and drops the
 *  recordings that reach them through somebody else. */
export function symbolSubgraph(graph: MarketCausalGraph, symbol: SymbolCode): Set<string> {
  const keep = new Set<string>();
  for (const edge of graph.edges) if (edge.symbol === symbol) { keep.add(edge.from); keep.add(edge.to); }
  for (const node of graph.nodes) if (node.symbols.includes(symbol) && node.kind === "company") keep.add(node.id);
  return keep;
}
