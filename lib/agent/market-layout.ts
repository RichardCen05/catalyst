/**
 * Layout for the merged market graph — pure, no React Flow.
 *
 * The per-issuer chain (lib/agent/chain-layout.ts) stacks each semantic column
 * in recording order, which is correct there: four columns, at most six rows,
 * nothing to untangle. The merged board is a different problem. Recordings
 * converge into a handful of transmission channels, those channels fan back
 * out to six issuers, and the issuers converge again into a few business
 * tests — so the question is not which column a card belongs to but which row
 * inside it, where a bad answer means edges crossing the board.
 *
 * Three jobs, split:
 *
 * - **Columns are ours.** A card's column is its kind, so sumber → mekanisme
 *   → emiten → dampak bisnis is a guarantee and not an emergent property of
 *   somebody's ranker. The legend above the canvas names those four columns;
 *   a layout that could reorder them would make the legend a lie.
 * - **Row order is a barycentre sweep.** Ordering within a layer to minimise
 *   crossings is the one genuinely hard part here, and the barycentre method
 *   is the standard answer: a card sits opposite the average position of the
 *   cards it connects to, swept forward and back until it settles. A general
 *   DAG layout does this too, but it insists on owning the coordinates as
 *   well, and handing it a board whose source column folds and wraps produced
 *   a geometry it could not resolve.
 * - **Rows are ours again.** Given the order, cards are placed on a fixed
 *   pitch and each column is centred against the tallest one, which is what
 *   makes the board read as four aligned columns rather than four drifting
 *   ones.
 *
 * The source column wraps. It is the only column that can hold twenty-five
 * cards, and stacked in one strip it made the board four times taller than
 * the canvas — every reading began with a scroll, and the shape the merge
 * exists to show was never visible at once. Wrapping spends the canvas's
 * spare width instead: past `MAX_COLUMN_ROWS` the column continues in a
 * second strip to its right, which costs a little horizontal room the board
 * has and saves the vertical room it does not.
 *
 * Co-movement is excluded upstream (lib/agent/market-graph.ts) and the column
 * rule depends on it: an issuer-to-issuer edge spans zero columns, which
 * would leave both ends in the same column with nothing to order them by.
 */

import type { MarketCausalGraph, MarketCausalNode } from "@/lib/types";

export const MARKET_NODE_WIDTH = 216;
export const MARKET_NODE_HEIGHT = 96;
/** The issuer card is the one the eye should land on. It is drawn narrower
 *  than its inputs and centred in its column, which reads as a waist in the
 *  board — everything converges there and fans out again. */
export const MARKET_COMPANY_WIDTH = 176;
export const MARKET_COMPANY_HEIGHT = 84;

/**
 * Past this many cards a column continues in a new strip to its right.
 *
 * Eight is not arbitrary. The canvas is about 1.7 times wider than it is tall,
 * so the board reaches its largest readable zoom when it has roughly that
 * shape too, and a column of nine sources against eight channels made it
 * taller than wide. Wrapping the ninth card spends width the board was not
 * using and buys back the row that was setting its height.
 */
export const MAX_COLUMN_ROWS = 8;

const COLUMN_GAP = 118;
const STRIP_GAP = 20;
const ROW_GAP = 18;
const ROW_PITCH = MARKET_NODE_HEIGHT + ROW_GAP;
const MARGIN = 26;

const COLUMN_ORDER = ["source", "mechanism", "company", "business-impact"] as const;
type Column = (typeof COLUMN_ORDER)[number];

/** Anything the engine adds later that is not one of the four columns lands
 *  in the rightmost one rather than falling off the board. */
function columnOf(kind: MarketCausalNode["kind"]): Column {
  return (COLUMN_ORDER as readonly string[]).includes(kind) ? (kind as Column) : "business-impact";
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
  /** Rows in the tallest column — what the board's height is made of. */
  rows: number;
}

/** How many forward/backward passes the barycentre sweep runs. Four is past
 *  the point where this board stops changing; the sweep is monotone enough
 *  that more only costs time. */
const SWEEPS = 4;

/**
 * Order every column so the edges between them cross as little as possible.
 *
 * Each pass walks the columns forward, placing a card opposite the mean
 * position of its inputs, then walks back placing it opposite the mean of its
 * outputs. A card with no neighbour on the side being swept keeps the place it
 * already had, which is what stops an isolated card from drifting to the top
 * on every pass.
 */
function orderedColumns(graph: Pick<MarketCausalGraph, "nodes" | "edges">): Map<Column, MarketCausalNode[]> {
  const columns = new Map<Column, MarketCausalNode[]>();
  for (const column of COLUMN_ORDER) columns.set(column, []);
  for (const node of graph.nodes) columns.get(columnOf(node.kind))!.push(node);

  // A stable seed: strongest first, then by id. Without one the sweep's
  // starting point would be the order the merge happened to produce, and the
  // board would reshuffle for reasons a reader cannot see.
  for (const [, list] of columns) {
    list.sort((a, b) => (b.relevance ?? 0) - (a.relevance ?? 0) || a.id.localeCompare(b.id));
  }

  const inputs = new Map<string, string[]>();
  const outputs = new Map<string, string[]>();
  for (const edge of graph.edges) {
    inputs.set(edge.to, [...(inputs.get(edge.to) ?? []), edge.from]);
    outputs.set(edge.from, [...(outputs.get(edge.from) ?? []), edge.to]);
  }

  const rank = new Map<string, number>();
  const reindex = () => {
    for (const [, list] of columns) list.forEach((node, index) => rank.set(node.id, index));
  };
  reindex();

  const sweep = (column: Column, neighbours: Map<string, string[]>) => {
    const list = columns.get(column)!;
    const barycentre = new Map<string, number>();
    list.forEach((node, index) => {
      const near = (neighbours.get(node.id) ?? []).map((id) => rank.get(id)).filter((at): at is number => at !== undefined);
      barycentre.set(node.id, near.length ? near.reduce((sum, at) => sum + at, 0) / near.length : index);
    });
    list.sort((a, b) => barycentre.get(a.id)! - barycentre.get(b.id)! || a.id.localeCompare(b.id));
    reindex();
  };

  for (let pass = 0; pass < SWEEPS; pass += 1) {
    for (let i = 1; i < COLUMN_ORDER.length; i += 1) sweep(COLUMN_ORDER[i], inputs);
    for (let i = COLUMN_ORDER.length - 2; i >= 0; i -= 1) sweep(COLUMN_ORDER[i], outputs);
  }
  return columns;
}

export function layoutMarketGraph(graph: Pick<MarketCausalGraph, "nodes" | "edges">): MarketLayout {
  const columns = orderedColumns(graph);

  // Strips per column, and therefore the board's row count. Only the source
  // column ever needs more than one, but the rule is written once so a future
  // column that grows does not silently run off the bottom.
  const strips = new Map<Column, MarketCausalNode[][]>();
  let rows = 1;
  for (const column of COLUMN_ORDER) {
    const list = columns.get(column) ?? [];
    const count = Math.max(1, Math.ceil(list.length / MAX_COLUMN_ROWS));
    const perStrip = Math.ceil(list.length / count);
    const chunks: MarketCausalNode[][] = [];
    for (let i = 0; i < count; i += 1) chunks.push(list.slice(i * perStrip, (i + 1) * perStrip));
    strips.set(column, chunks);
    rows = Math.max(rows, ...chunks.map((chunk) => chunk.length));
  }

  const positions = new Map<string, { x: number; y: number }>();
  const boardHeight = rows * ROW_PITCH - ROW_GAP;
  let x = MARGIN;
  for (const column of COLUMN_ORDER) {
    for (const chunk of strips.get(column) ?? []) {
      // Centre each strip against the tallest column, so a two-card business
      // impact column sits beside the middle of the board rather than at its
      // ceiling.
      const top = MARGIN + (boardHeight - (chunk.length * ROW_PITCH - ROW_GAP)) / 2;
      chunk.forEach((node, row) => {
        const size = marketNodeSize(node.kind);
        positions.set(node.id, { x: x + (MARKET_NODE_WIDTH - size.width) / 2, y: top + row * ROW_PITCH });
      });
      x += MARKET_NODE_WIDTH + STRIP_GAP;
    }
    x += COLUMN_GAP - STRIP_GAP;
  }

  return {
    positions,
    width: x - COLUMN_GAP + MARGIN,
    height: boardHeight + MARGIN * 2,
    rows,
  };
}
