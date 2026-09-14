import { describe, expect, it } from "vitest";
import {
  CHAIN_NODE_HEIGHT,
  CHAIN_NODE_WIDTH,
  CHAIN_ROW_PITCH,
  connectedIds,
  layoutChainPositions,
} from "@/lib/agent/chain-layout";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";
import type { CausalNode } from "@/lib/types";

function node(id: string, kind: CausalNode["kind"]): Pick<CausalNode, "id" | "kind"> {
  return { id, kind };
}

describe("layoutChainPositions", () => {
  it("keeps semantic column order left to right", () => {
    const { positions } = layoutChainPositions([
      node("c", "company"),
      node("m", "mechanism"),
      node("s", "source"),
      node("o", "business-impact"),
    ]);
    const x = (id: string) => positions.get(id)!.x;
    expect(x("s")).toBeLessThan(x("m"));
    expect(x("m")).toBeLessThan(x("c"));
    expect(x("c")).toBeLessThan(x("o"));
  });

  it("never overlaps cards within a column, however many sources", () => {
    const nodes = [
      ...Array.from({ length: 6 }, (_, i) => node(`s${i}`, "source")),
      ...Array.from({ length: 6 }, (_, i) => node(`m${i}`, "mechanism")),
      node("c", "company"),
      ...Array.from({ length: 3 }, (_, i) => node(`o${i}`, "business-impact")),
    ];
    const { positions } = layoutChainPositions(nodes);
    expect(positions.size).toBe(nodes.length);
    const byX = new Map<number, number[]>();
    for (const { x, y } of positions.values()) {
      if (!byX.has(x)) byX.set(x, []);
      byX.get(x)!.push(y);
    }
    for (const ys of byX.values()) {
      const sorted = [...ys].sort((a, b) => a - b);
      for (let i = 1; i < sorted.length; i += 1) {
        expect(sorted[i] - sorted[i - 1]).toBeGreaterThanOrEqual(CHAIN_ROW_PITCH);
      }
    }
    // Pitch fits the card it separates.
    expect(CHAIN_ROW_PITCH).toBeGreaterThan(CHAIN_NODE_HEIGHT);
    expect(CHAIN_NODE_WIDTH).toBe(210);
  });

  it("centers shorter columns against the tallest one", () => {
    const { positions } = layoutChainPositions([node("s0", "source"), node("s1", "source"), node("c", "company")]);
    const companyY = positions.get("c")!.y;
    const sourceYs = [positions.get("s0")!.y, positions.get("s1")!.y].sort((a, b) => a - b);
    expect(companyY).toBeGreaterThan(sourceYs[0]);
    expect(companyY).toBeLessThan(sourceYs[1]);
  });
});

describe("connectedIds", () => {
  const edges = [
    { from: "s1", to: "m1" },
    { from: "m1", to: "c" },
    { from: "s2", to: "m2" },
    { from: "m2", to: "c" },
    { from: "c", to: "o" },
  ];

  it("walks upstream and downstream from a mechanism, not the whole graph", () => {
    // Directional: s2/m2 stay dim because no directed path runs through m1.
    expect([...connectedIds(edges, ["m1"])].sort()).toEqual(["c", "m1", "o", "s1"]);
  });

  it("reaches the whole chain from the company node — it is the meeting point", () => {
    expect(connectedIds(edges, ["c"]).size).toBe(6);
  });

  it("a source lights its own downstream only", () => {
    expect([...connectedIds(edges, ["s2"])].sort()).toEqual(["c", "m2", "o", "s2"]);
  });
});

describe("causal graph visibility bound", () => {
  it("shows at most six sources and reports the hidden remainder honestly", async () => {
    const graph = await agentEngine.buildCausalGraph("ANTM", demoProfiles[0], { scope: "market", minRelevance: 0 });
    const sources = graph?.nodes.filter((node) => node.kind === "source") ?? [];
    expect(sources.length).toBeLessThanOrEqual(6);
    expect(graph?.hiddenRelationshipCount).toBeGreaterThanOrEqual(0);
    // Hypotheses stay at three even when the graph is wider.
    expect((graph?.competingHypotheses.length ?? 0)).toBeLessThanOrEqual(3);
  });
});
