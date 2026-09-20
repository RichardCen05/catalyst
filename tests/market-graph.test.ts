import { describe, expect, it } from "vitest";
import { buildMarketGraph, symbolSubgraph } from "@/lib/agent/market-graph";
import { layoutMarketGraph, marketNodeSize } from "@/lib/agent/market-layout";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles, events } from "@/lib/data/fixtures";
import type { SymbolCode } from "@/lib/types";

const profile = { ...demoProfiles[0], hasOnboarded: true };
const watchlist = profile.watchlist;

/** The one recording in the bundle linked to two watchlist issuers. */
const SHARED_EVENT_ID = "commodity-coal-2025-12-15";

describe("buildMarketGraph", () => {
  it("draws every watchlist chain on one graph", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    expect(graph.symbols).toEqual(watchlist);
    expect(graph.skipped).toEqual([]);
    for (const symbol of watchlist) {
      expect(graph.nodes.some((node) => node.id === `company-${symbol}`)).toBe(true);
    }
  });

  it("collapses a source recorded against two issuers into one node that fans out", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const shared = graph.nodes.filter((node) => node.id === `source-${SHARED_EVENT_ID}`);
    expect(shared).toHaveLength(1);
    expect([...shared[0].symbols].sort()).toEqual(["ADRO", "PTBA"]);
    expect(graph.sharedSourceIds).toContain(shared[0].id);

    // One outgoing edge per issuer, each attributable to its own chain.
    const out = graph.edges.filter((edge) => edge.from === shared[0].id);
    expect([...new Set(out.map((edge) => edge.symbol))].sort()).toEqual(["ADRO", "PTBA"]);
  });

  it("collapses mechanisms into one hub per transmission channel", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const mechanisms = graph.nodes.filter((node) => node.kind === "mechanism");

    // One card per channel, not one per recording per issuer: without this the
    // board is six parallel rows that happen to say the same six words.
    expect(new Set(mechanisms.map((node) => node.label.toLowerCase())).size).toBe(mechanisms.length);
    expect(mechanisms.length).toBeLessThan(graph.nodes.filter((node) => node.kind === "source").length);

    // And the collapse is what joins the chains: at least one channel carries
    // issuers that share no recording at all.
    const hubs = mechanisms.filter((node) => node.symbols.length > 1);
    expect(hubs.length).toBeGreaterThan(0);
    for (const hub of hubs) expect(graph.hubNodeIds).toContain(hub.id);
  });

  it("collapses business impacts by dimension so issuers converge into one test", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const impacts = graph.nodes.filter((node) => node.kind === "business-impact");
    expect(impacts.length).toBeGreaterThan(0);
    expect(new Set(impacts.map((node) => node.id)).size).toBe(impacts.length);
    for (const impact of impacts) expect(impact.id.startsWith("business-impact-")).toBe(true);

    // Each issuer that reaches a test reaches it by its own edge, so a shared
    // test never merges two issuers' evidence.
    for (const impact of impacts) {
      const into = graph.edges.filter((edge) => edge.to === impact.id);
      expect([...new Set(into.map((edge) => edge.symbol))].sort()).toEqual([...impact.symbols].sort());
    }
  });

  it("keeps every edge attributable to one issuer on both ends", async () => {
    // This is what makes a hub honest. A card can belong to four issuers, but
    // a path through it is only ever read one issuer at a time — an edge whose
    // endpoint does not carry its symbol would be exactly the cross-wiring
    // ("ANTM's gold print reached PTBA's margin") that merging risks.
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const byId = new Map(graph.nodes.map((node) => [node.id, node]));
    for (const edge of graph.edges) {
      expect(byId.get(edge.from)!.symbols).toContain(edge.symbol);
      expect(byId.get(edge.to)!.symbols).toContain(edge.symbol);
    }
  });

  it("draws one edge per issuer per path, however many recordings used it", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const keys = graph.edges.map((edge) => `${edge.symbol}::${edge.from}::${edge.to}`);
    expect(new Set(keys).size).toBe(keys.length);
  });

  it("keeps a shared recording ahead of the per-chain source bound", async () => {
    // ADRO carries seven linked recordings and the shared coal print ranks
    // last by relevance, so the single-issuer chain's bound of six drops it —
    // and with it the only recording linking two chains. Guard the ordering,
    // not just the outcome.
    const chain = await agentEngine.buildCausalGraph("ADRO", profile, { scope: "market", minRelevance: 60 });
    expect(chain!.nodes.some((node) => node.id === `source-${SHARED_EVENT_ID}`)).toBe(false);

    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    expect(graph.nodes.some((node) => node.id === `source-${SHARED_EVENT_ID}`)).toBe(true);
  });

  it("leaves co-movement to the single-issuer chain", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    expect(graph.nodes.some((node) => node.basis === "Observed correlation")).toBe(false);
    expect(graph.edges.some((edge) => edge.basis === "Observed correlation")).toBe(false);
  });

  it("invents no links: every source's symbols come from a recorded impact link", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const eventById = new Map(events.map((event) => [event.id, event]));
    for (const node of graph.nodes.filter((item) => item.kind === "source")) {
      const event = eventById.get(node.id.slice("source-".length));
      expect(event).toBeDefined();
      const linked = new Set(event!.impactLinks.map((link) => link.symbol));
      for (const symbol of node.symbols) expect(linked.has(symbol)).toBe(true);
    }
  });

  it("names a symbol it could not draw instead of dropping it silently", async () => {
    // A stored profile can outlive the bundle that justified it: the symbol
    // is still on the watchlist, the recordings behind it are gone. The board
    // must say which issuer it left out, not quietly draw five of six.
    const stale = "ZZZZ" as SymbolCode;
    const graph = await buildMarketGraph([...watchlist, stale], profile, { minRelevance: 60 });
    expect(graph.symbols).toEqual(watchlist);
    expect(graph.skipped.map((item) => item.symbol)).toEqual([stale]);
    expect(graph.skipped[0].reason).toMatch(/\S/);
    expect(graph.nodes.some((node) => node.symbols.includes(stale))).toBe(false);
  });

  it("scopes a subgraph to one issuer, hubs and shared sources included", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const adro = symbolSubgraph(graph, "ADRO");
    expect(adro.has("company-ADRO")).toBe(true);
    expect(adro.has("company-PTBA")).toBe(false);
    expect(adro.has(`source-${SHARED_EVENT_ID}`)).toBe(true);

    // A hub ADRO runs through stays lit; a recording that only reaches it
    // through another issuer does not.
    const hub = graph.nodes.find((node) => node.kind === "mechanism" && node.symbols.includes("ADRO"))!;
    expect(adro.has(hub.id)).toBe(true);
    const foreign = graph.nodes.find((node) => node.kind === "source" && !node.symbols.includes("ADRO"))!;
    expect(adro.has(foreign.id)).toBe(false);
  });
});

describe("layoutMarketGraph", () => {
  it("holds the four semantic columns whatever the ranker does", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const { positions } = layoutMarketGraph(graph);
    expect(positions.size).toBe(graph.nodes.length);

    const columnOf = (kind: string) => {
      const xs = graph.nodes.filter((node) => node.kind === kind).map((node) => positions.get(node.id)!.x);
      expect(new Set(xs).size).toBe(1);
      return xs[0];
    };
    expect(columnOf("source")).toBeLessThan(columnOf("mechanism"));
    expect(columnOf("mechanism")).toBeLessThan(columnOf("company"));
    expect(columnOf("company")).toBeLessThan(columnOf("business-impact"));
  });

  it("never overlaps two cards", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const { positions } = layoutMarketGraph(graph);
    const boxes = graph.nodes.map((node) => ({ ...positions.get(node.id)!, ...marketNodeSize(node.kind) }));
    for (let i = 0; i < boxes.length; i += 1) {
      for (let j = i + 1; j < boxes.length; j += 1) {
        const a = boxes[i];
        const b = boxes[j];
        const overlaps = a.x < b.x + b.width && b.x < a.x + a.width && a.y < b.y + b.height && b.y < a.y + a.height;
        expect(overlaps).toBe(false);
      }
    }
  });

  it("keeps every card inside the board it reports", async () => {
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const layout = layoutMarketGraph(graph);
    for (const node of graph.nodes) {
      const at = layout.positions.get(node.id)!;
      const size = marketNodeSize(node.kind);
      expect(at.y).toBeGreaterThanOrEqual(0);
      expect(at.y + size.height).toBeLessThanOrEqual(layout.height);
      expect(at.x + size.width).toBeLessThanOrEqual(layout.width);
    }
    expect(layout.columnSpan.width).toBe(layout.width);
  });

  it("puts a hub beside the issuers it feeds, not at one end of the column", async () => {
    // A channel four issuers run through belongs between them; pushed to the
    // top or the bottom of its column it drags four edges across every other
    // row on the board. This is the whole reason row order is handed to a
    // crossing-minimising ranker instead of being written by hand.
    const graph = await buildMarketGraph(watchlist, profile, { minRelevance: 60 });
    const { positions } = layoutMarketGraph(graph);
    const hub = graph.nodes
      .filter((node) => node.kind === "mechanism")
      .sort((a, b) => b.symbols.length - a.symbols.length)[0];
    expect(hub.symbols.length).toBeGreaterThan(1);

    const centre = positions.get(hub.id)!.y + marketNodeSize(hub.kind).height / 2;
    const fed = hub.symbols.map((symbol) => {
      const at = positions.get(`company-${symbol}`)!;
      return at.y + marketNodeSize("company").height / 2;
    });
    expect(centre).toBeGreaterThanOrEqual(Math.min(...fed) - marketNodeSize(hub.kind).height);
    expect(centre).toBeLessThanOrEqual(Math.max(...fed) + marketNodeSize(hub.kind).height);
  });
});
