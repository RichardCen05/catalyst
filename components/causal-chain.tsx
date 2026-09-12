"use client";

import { useMemo, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import { Building2, CloudRain, Database, FileText, Gauge, Landmark, Network } from "lucide-react";
import type { CausalGraph, CausalNode, ImpactDirection } from "@/lib/types";
import { CitationDialog } from "@/components/citation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

type ChainNodeData = { causal: CausalNode; onSelect: (id: string) => void };
type ChainFlowNode = Node<ChainNodeData, "chain">;

const sourceIcons = {
  weather: CloudRain,
  macro: Landmark,
  commodity: Gauge,
  filing: FileText,
  sectors: Database,
  policy: Landmark,
  market: Database,
  financial: FileText,
};

function ChainNode({ data }: NodeProps<ChainFlowNode>) {
  const node = data.causal;
  const Icon = node.kind === "company" ? Building2 : node.kind === "mechanism" ? Network : sourceIcons[node.sourceType ?? "market"];
  return (
    <div className={`w-[210px] rounded-xl border bg-surface shadow-panel ${node.kind === "company" ? "border-primary ring-2 ring-primary/15" : node.kind === "source" ? "border-attention/40" : "border-border"}`}>
      {node.kind !== "source" ? <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-primary" /> : null}
      <button type="button" onClick={() => data.onSelect(node.id)} className="w-full cursor-pointer rounded-[inherit] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-3.5" /></span><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{node.kind}</span></span><span className="mt-2 line-clamp-3 block text-xs font-semibold leading-5">{node.label}</span>{node.relevance ? <span className="mt-2 block font-mono text-[9px] text-muted-foreground">relevansi {node.relevance}/100</span> : null}</button>
      {node.kind !== "observation" ? <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-primary" /> : null}
    </div>
  );
}

const nodeTypes = { chain: ChainNode };

const edgeColor: Record<ImpactDirection, string> = {
  Supported: "#22c55e",
  Adverse: "#ef5350",
  Mixed: "#f59e0b",
  Unrelated: "#94a3b8",
  Unverified: "#94a3b8",
};

export function CausalChain({ graph }: { graph: CausalGraph }) {
  const [selectedId, setSelectedId] = useState(`company-${graph.targetSymbol}`);
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];
  const { nodes, edges } = useMemo(() => {
    const groups = {
      source: graph.nodes.filter((node) => node.kind === "source"),
      mechanism: graph.nodes.filter((node) => node.kind === "mechanism"),
      company: graph.nodes.filter((node) => node.kind === "company"),
      observation: graph.nodes.filter((node) => node.kind === "observation"),
    };
    const x = { source: 0, mechanism: 290, company: 590, observation: 890 };
    const maxRows = Math.max(groups.source.length, groups.observation.length, 1);
    const flowNodes: ChainFlowNode[] = (Object.keys(groups) as Array<keyof typeof groups>).flatMap((kind) => groups[kind].map((node, index) => {
      const rowCount = groups[kind].length;
      const centeredY = (index + (maxRows - rowCount) / 2) * 132;
      return {
        id: node.id,
        type: "chain",
        position: { x: x[kind], y: centeredY },
        data: { causal: node, onSelect: setSelectedId },
        draggable: false,
        connectable: false,
        focusable: false,
        ariaLabel: `${node.kind}: ${node.label}`,
      };
    }));
    const flowEdges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "smoothstep",
      label: edge.label === "observed" ? "bukti" : `${edge.direction} · ${edge.relevance}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor[edge.direction] },
      style: { stroke: edgeColor[edge.direction], strokeWidth: edge.relevance >= 85 ? 2.4 : 1.5, opacity: 0.78 },
      labelStyle: { fill: "var(--foreground)", fontSize: 9, fontFamily: "var(--font-mono)" },
      labelBgStyle: { fill: "var(--surface)", fillOpacity: 0.92 },
    }));
    return { nodes: flowNodes, edges: flowEdges };
  }, [graph]);

  return (
    <div className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-[10px] text-muted-foreground"><span className="font-mono uppercase tracking-wider text-primary">Klik node untuk memeriksa</span><span>Sumber</span><span aria-hidden="true">→</span><span>Mekanisme</span><span aria-hidden="true">→</span><span>Emiten</span><span aria-hidden="true">→</span><span>Observasi 4 pilar</span></div>
      <div className="h-[540px] w-full" aria-label={`Causal chain ${graph.targetSymbol}`}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.38} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} onNodeClick={(_, node) => setSelectedId(node.id)}>
          <Background gap={20} size={1} color="var(--chart-grid)" />
          <Controls showInteractive={false} />
          <MiniMap className="!hidden sm:!block" pannable zoomable nodeColor="var(--primary)" maskColor="color-mix(in srgb, var(--background) 76%, transparent)" />
        </ReactFlow>
      </div>
      <section className="border-t border-border bg-background p-4" aria-live="polite" aria-labelledby="selected-chain-node"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">Node terpilih · {selected.kind}</span>{selected.direction ? <StatusBadge status={selected.direction} /> : null}</div><h3 id="selected-chain-node" className="mt-2 font-semibold">{selected.label}</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{selected.detail}</p></div><CitationDialog citations={selected.citations} label="Bukti node" /></div></section>
      <details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">Buka daftar hubungan aksesibel</summary><div className="overflow-x-auto border-t border-border"><table className="w-full min-w-[620px] text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Dari</th><th className="px-4 py-2 font-medium">Ke</th><th className="px-4 py-2 font-medium">Arah</th><th className="px-4 py-2 font-medium">Relevansi</th></tr></thead><tbody className="divide-y divide-border">{graph.edges.map((edge) => <tr key={edge.id}><td className="px-4 py-2.5">{graph.nodes.find((node) => node.id === edge.from)?.label}</td><td className="px-4 py-2.5">{graph.nodes.find((node) => node.id === edge.to)?.label}</td><td className="px-4 py-2.5"><StatusBadge status={edge.direction} /></td><td className="px-4 py-2.5 font-mono">{edge.relevance}/100</td></tr>)}</tbody></table></div></details>
    </div>
  );
}
