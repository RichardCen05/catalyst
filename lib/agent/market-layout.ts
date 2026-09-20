/**
 * Layout for the merged market graph — pure, no React Flow.
 *
 * The per-issuer chain (lib/agent/chain-layout.ts) stacks each semantic column
 * in recording order, which is correct there: four columns, at most six rows,
 * nothing to untangle. The merged board is a different problem. Twenty-five
 * recordings converge into a handful of transmission channels, those channels
 * fan back out to six issuers, and the issuers converge again into a few
 * business tests — so the question is not which column a card belongs to but
 * which row inside it, where a bad answer means edges crossing the board.
 *
 * Two jobs, split:
 *
 * - **Columns are ours.** x comes from the node's kind, so sumber → mekanisme
 *   → emiten → dampak bisnis is a guarantee and not an emergent property of
 *   somebody's ranker. The legend above the canvas names those four columns;
 *   a layout that could reorder them would make the legend a lie.
 * - **Rows are Dagre's.** Ordering within a rank to minimise crossings is the
 *   one genuinely hard part here, and it is what a DAG layout is for. Ranks
 *   coincide with columns by construction — every edge runs one column to the
 *   right — so taking only y from Dagre keeps its crossing minimisation
 *   without letting it move a card out of its column.
 *
 * Co-movement is excluded upstream (lib/agent/market-graph.ts) and the split
 * depends on it: an issuer-to-issuer edge spans zero columns, which would
 * push a company card into the business-impact rank and leave its row
 * meaningless.
 */

import dagre from "@dagrejs/dagre";
import type { MarketCausalGraph, MarketCausalNode } from "@/lib/types";

export const MARKET_NODE_WIDTH = 228;
export const MARKET_NODE_HEIGHT = 118;
/** The issuer card is the one the eye should land on. It is drawn narrower
 *  than its inputs and centred in its column, which reads as a waist in the
 *  board — everything converges there and fans out again. */
export const MARKET_COMPANY_WIDTH = 188;
export const MARKET_COMPANY_HEIGHT = 104;

const COLUMN_GAP = 150;
const ROW_GAP = 22;
const MARGIN = 28;

const COLUMN_ORDER = ["source", "mechanism", "company", "business-impact"] as const;
type Column = (typeof COLUMN_ORDER)[number];

/** Anything the engine adds later that is not one of the four columns lands
 *  in the rightmost one rather than falling off the board. */
function columnOf(kind: MarketCausalNode["kind"]): Column {
  return (COLUMN_ORDER as readonly string[]).includes(kind) ? (kind as Column) : "business-impact";
}

function columnX(column: Column): number {
  const index = COLUMN_ORDER.indexOf(column);
  const left = MARGIN + index * (MARKET_NODE_WIDTH + COLUMN_GAP);
  return column === "company" ? left + (MARKET_NODE_WIDTH - MARKET_COMPANY_WIDTH) / 2 : left;
}

export function marketNodeSize(kind: MarketCausalNode["kind"]): { width: number; height: number } {
  return kind === "company"
    ? { width: MARKET_COMPANY_WIDTH, height: MARKET_COMPANY_HEIGHT }
    : { width: MARKET_NODE_WIDTH, height: MARKET_NODE_HEIGHT };
}

export interface MarketLayout {
  positions: Map<string, { x: number; y: number }>;
  width: number;
  height: number;
  /** Left edge and span of the four columns — the map frames this rather than
   *  the whole board, which is much taller. */
  columnSpan: { x: number; width: number };
}

export function layoutMarketGraph(graph: Pick<MarketCausalGraph, "nodes" | "edges">): MarketLayout {
  const g = new dagre.graphlib.Graph({ multigraph: true });
  g.setGraph({
    rankdir: "LR",
    ranksep: COLUMN_GAP,
    nodesep: ROW_GAP,
    // Separation between a rank's own layers; only matters where dagre
    // inserts a dummy node for a long edge, which hubs and shared sources do.
    edgesep: 18,
    marginx: MARGIN,
    marginy: MARGIN,
    ranker: "network-simplex",
  });
  g.setDefaultEdgeLabel(() => ({}));

  for (const node of graph.nodes) g.setNode(node.id, marketNodeSize(node.kind));
  for (const edge of graph.edges) {
    if (!g.hasNode(edge.from) || !g.hasNode(edge.to)) continue;
    // Multigraph, and the edge is named: several issuers run the same
    // (from, to) pair through a hub, and an unnamed edge would collapse them
    // into one, taking their pull on the ordering with it. Weight by
    // relevance so the strongest path is the straightest one on the board.
    g.setEdge(edge.from, edge.to, { weight: Math.max(1, Math.round(edge.relevance / 20)) }, edge.id);
  }

  dagre.layout(g);

  const positions = new Map<string, { x: number; y: number }>();
  let bottom = 0;
  for (const node of graph.nodes) {
    const laid = g.node(node.id) as { y: number; height: number } | undefined;
    const size = marketNodeSize(node.kind);
    // Dagre reports centres; React Flow positions top-left corners. Its x is
    // discarded on purpose — the column is the node's kind, not its rank.
    const y = laid ? laid.y - laid.height / 2 : bottom + ROW_GAP;
    positions.set(node.id, { x: columnX(columnOf(node.kind)), y });
    bottom = Math.max(bottom, y + size.height);
  }

  const width = columnX("business-impact") + MARKET_NODE_WIDTH + MARGIN;
  return { positions, width, height: bottom + MARGIN, columnSpan: { x: 0, width } };
}
