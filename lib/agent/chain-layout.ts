/**
 * Chain layout math — pure, no React Flow.
 *
 * Semantic columns left-to-right (Sumber → Mekanisme → Emiten → Dampak),
 * each column stacked with a fixed pitch so cards never overlap no matter
 * how many sources the engine lets through. Column order is a guarantee
 * here; a generic DAG layout (Dagre) does not promise it, which is why the
 * chain does not use one.
 */

import type { CausalNode } from "@/lib/types";

export const CHAIN_NODE_WIDTH = 210;
export const CHAIN_NODE_HEIGHT = 140;
export const CHAIN_ROW_PITCH = 164;
const CHAIN_COLUMN_GAP = 130;

type ChainKind = CausalNode["kind"];

const COLUMN_ORDER: ChainKind[] = ["source", "mechanism", "company", "observation", "business-impact"];

export function layoutChainPositions(nodes: Array<Pick<CausalNode, "id" | "kind">>): {
  positions: Map<string, { x: number; y: number }>;
  height: number;
} {
  const columns = new Map<ChainKind, Array<string>>();
  for (const kind of COLUMN_ORDER) columns.set(kind, []);
  for (const node of nodes) {
    const kind: ChainKind = COLUMN_ORDER.includes(node.kind) ? node.kind : "observation";
    columns.get(kind)!.push(node.id);
  }
  // "observation" is the legacy bucket; it shares the rightmost column with
  // business impacts.
  const right = [...(columns.get("business-impact") ?? []), ...(columns.get("observation") ?? [])];
  const drawn = [
    { kind: "source", ids: columns.get("source") ?? [] },
    { kind: "mechanism", ids: columns.get("mechanism") ?? [] },
    { kind: "company", ids: columns.get("company") ?? [] },
    { kind: "observation", ids: right },
  ].filter((col) => col.ids.length > 0);

  const maxRows = Math.max(...drawn.map((col) => col.ids.length), 1);
  const positions = new Map<string, { x: number; y: number }>();
  drawn.forEach((col, colIndex) => {
    const x = colIndex * (CHAIN_NODE_WIDTH + CHAIN_COLUMN_GAP);
    const topOffset = ((maxRows - col.ids.length) / 2) * CHAIN_ROW_PITCH;
    col.ids.forEach((id, row) => {
      positions.set(id, { x, y: topOffset + row * CHAIN_ROW_PITCH });
    });
  });
  return { positions, height: maxRows * CHAIN_ROW_PITCH };
}

/** Nodes on the selected path: ancestors (reverse) plus descendants (forward)
 *  of every start id. Directional on purpose — an undirected walk would light
 *  the whole chain through the company node, since every path meets there,
 *  and highlighting everything highlights nothing. */
export function connectedIds(edges: Array<{ from: string; to: string }>, starts: string[]): Set<string> {
  const forward = new Map<string, Set<string>>();
  const backward = new Map<string, Set<string>>();
  const link = (map: Map<string, Set<string>>, a: string, b: string) => {
    if (!map.has(a)) map.set(a, new Set());
    map.get(a)!.add(b);
  };
  for (const edge of edges) {
    link(forward, edge.from, edge.to);
    link(backward, edge.to, edge.from);
  }
  const walk = (map: Map<string, Set<string>>): Set<string> => {
    const seen = new Set<string>(starts);
    const queue = [...starts];
    while (queue.length) {
      const current = queue.pop()!;
      for (const next of map.get(current) ?? []) {
        if (!seen.has(next)) {
          seen.add(next);
          queue.push(next);
        }
      }
    }
    return seen;
  };
  const seen = walk(forward);
  for (const id of walk(backward)) seen.add(id);
  return seen;
}
