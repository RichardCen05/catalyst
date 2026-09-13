"use client";

import { useMemo, useState } from "react";
import dagre from "@dagrejs/dagre";
import {
  Background,
  Handle,
  MarkerType,
  MiniMap,
  Position,
  ReactFlow,
  type Edge,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { CausalGraph, CausalNode, ImpactDirection } from "@/lib/types";
import { events } from "@/lib/data/fixtures";
import { AskAgentButton } from "@/components/ask-agent-button";
import { CitationDialog } from "@/components/citation-dialog";
import { SourceText } from "@/components/source-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconCompanies, IconDocument, IconGauge, IconGraph, IconPolicy, IconSource, IconWeather } from "@/components/ui/icons";
import { uiLabel } from "@/lib/ui-labels";

const NODE_WIDTH = 210;
const NODE_HEIGHT = 96;

type ChainNodeData = { causal: CausalNode; onSelect: (id: string) => void };
type ChainFlowNode = Node<ChainNodeData, "chain">;

const sourceIcons = {
  weather: IconWeather,
  macro: IconPolicy,
  commodity: IconGauge,
  filing: IconDocument,
  sectors: IconSource,
  policy: IconPolicy,
  market: IconSource,
  financial: IconDocument,
};

const kindLabels: Record<CausalNode["kind"], string> = {
  source: "Sumber",
  mechanism: "Mekanisme",
  company: "Emiten",
  observation: "Observasi",
  "business-impact": "Dampak bisnis",
};

function ChainNode({ data }: NodeProps<ChainFlowNode>) {
  const node = data.causal;
  const Icon = node.kind === "company" ? IconCompanies : node.kind === "mechanism" ? IconGraph : sourceIcons[node.sourceType ?? "market"];
  const terminal = node.kind === "observation" || node.kind === "business-impact";
  return (
    <div className={`w-[210px] rounded-xl border bg-surface shadow-panel ${node.kind === "company" ? "border-primary ring-2 ring-primary/15" : node.kind === "source" ? "border-attention/40" : "border-border"}`}>
      {node.kind !== "source" ? <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-primary" /> : null}
      <button type="button" onClick={() => data.onSelect(node.id)} className="w-full cursor-pointer rounded-[inherit] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-3.5" /></span><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{uiLabel(node.kind)}</span></span><span className="mt-2 line-clamp-3 block text-xs font-semibold leading-5">{node.label}</span><span className="mt-2 block font-mono text-[9px] text-muted-foreground">{uiLabel(node.basis)}{node.relevance ? ` · ${node.relevance}/100` : ""}</span></button>
      {!terminal ? <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-primary" /> : null}
    </div>
  );
}

const nodeTypes = { chain: ChainNode };

/* Edge hues sit between the light and dark palettes so one value reads on
   bone and on ink. Non-text, so they are held to the same restraint as the
   pastels rather than to a contrast ratio. */
const edgeColor: Record<ImpactDirection, string> = {
  Supported: "var(--positive)",
  Adverse: "var(--danger)",
  Mixed: "var(--attention)",
  Unrelated: "var(--muted-foreground)",
  Unverified: "var(--muted-foreground)",
};

const eventById = new Map(events.map((event) => [event.id, event]));

export function CausalChain({ graph }: { graph: CausalGraph }) {
  const [selectedId, setSelectedId] = useState(`company-${graph.targetSymbol}`);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId);
  const selectedEdgeSpan = selectedEdge?.citations[0]?.span;
  const selectedEdgeSourceEvent = selectedEdgeSpan ? eventById.get(selectedEdgeSpan.documentId) : undefined;
  const { nodes, edges } = useMemo(() => {
    const groups = {
      source: graph.nodes.filter((node) => node.kind === "source"),
      mechanism: graph.nodes.filter((node) => node.kind === "mechanism"),
      company: graph.nodes.filter((node) => node.kind === "company"),
      observation: graph.nodes.filter((node) => node.kind === "observation" || node.kind === "business-impact"),
    };
    const x = { source: 0, mechanism: 290, company: 590, observation: 890 };
    const maxRows = Math.max(groups.source.length, groups.observation.length, 1);
    const flowNodes: ChainFlowNode[] = (Object.keys(groups) as Array<keyof typeof groups>).flatMap((kind) => groups[kind].map((node, index) => {
      const rowCount = groups[kind].length;
      const centeredY = (index + (maxRows - rowCount) / 2) * 132;
      return {
        id: node.id,
        type: "chain" as const,
        position: { x: x[kind] - NODE_WIDTH / 2, y: centeredY - NODE_HEIGHT / 2 },
        data: { causal: node, onSelect: (id) => { setSelectedId(id); setSelectedEdgeId(null); } },
        draggable: false,
        connectable: false,
        focusable: false,
        ariaLabel: `${uiLabel(node.kind)}: ${node.label}`,
      };
    }));
    const flowEdges: Edge[] = graph.edges.map((edge) => ({
      id: edge.id,
      source: edge.from,
      target: edge.to,
      type: "smoothstep",
      label: edge.basis === "Observed correlation" ? "teramati" : `${uiLabel(edge.confidence).toLowerCase()} · ${edge.relevance}`,
      markerEnd: { type: MarkerType.ArrowClosed, color: edgeColor[edge.direction] },
      style: { stroke: edgeColor[edge.direction], strokeWidth: edge.relevance >= 85 ? 2.4 : 1.5, opacity: 0.78 },
      labelStyle: { fill: "var(--foreground)", fontSize: 9, fontFamily: "var(--font-mono)" },
      labelBgStyle: { fill: "var(--surface)", fillOpacity: 0.92 },
      animated: selectedEdgeId === edge.id,
    }));
    return { nodes: flowNodes, edges: flowEdges };
  }, [graph, selectedEdgeId]);

  return (
    <div data-tour="causal-chain" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-[10px] text-muted-foreground"><span className="font-mono uppercase tracking-wider text-primary">Pilih titik atau garis untuk memeriksa</span><span>Sumber</span><span aria-hidden="true">→</span><span>Mekanisme</span><span aria-hidden="true">→</span><span>Emiten</span><span aria-hidden="true">→</span><span>Dampak bisnis</span></div>
      <div className="h-[540px] w-full" aria-label={`Rangkaian sebab akibat ${graph.targetSymbol}`}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.38} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} onNodeClick={(_, node) => { setSelectedId(node.id); setSelectedEdgeId(null); }} onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)}>
          <Background gap={20} size={1} color="var(--chart-grid)" />
        </ReactFlow>
      </div>
      {selectedEdge ? <section aria-label="Detail hubungan terpilih" className="border-t border-primary/30 bg-primary/5 p-4" aria-live="polite"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">Syarat pembatalan</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(selectedEdge.confidence).toLowerCase()}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Jeda {selectedEdge.lag}</span><StatusBadge status={selectedEdge.direction} /></div><h3 className="mt-2 font-semibold">{graph.nodes.find((node) => node.id === selectedEdge.from)?.label} → {graph.nodes.find((node) => node.id === selectedEdge.to)?.label}</h3><dl className="mt-4 grid gap-3 text-xs leading-5 md:grid-cols-2 xl:grid-cols-3"><div><dt className="font-semibold">Eksposur</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.exposure}</dd></div><div><dt className="font-semibold">Indikator yang dicari</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.expectedObservable}</dd></div><div><dt className="font-semibold">Dampak bisnis</dt><dd className="mt-1 text-muted-foreground"><span className="font-mono text-primary">{uiLabel(selectedEdge.businessImpactDimension)}</span><span className="mt-1 block">{selectedEdge.businessImpactImplication}</span></dd></div><div><dt className="font-semibold">Penjelasan lain</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.alternativeExplanation}</dd></div><div><dt className="font-semibold">Batal jika</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.falsificationCondition}</dd></div><div><dt className="font-semibold">Dasar keyakinan</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.confidenceBasis}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><CitationDialog citations={selectedEdge.citations} label="Bukti hubungan" /><AskAgentButton context={{ label: `${graph.targetSymbol} · syarat pembatalan`, question: `Uji hubungan ${selectedEdge.exposure}, indikator, penjelasan lain, dan kondisi pembatalnya.`, symbol: graph.targetSymbol }} label="Tanya hubungan ini" /></div></section> : <section aria-label="Detail titik terpilih" className="border-t border-border bg-background p-4" aria-live="polite"><div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">{uiLabel(selected.basis)}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(selected.confidence).toLowerCase()}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{selected.lag}</span>{selected.direction ? <StatusBadge status={selected.direction} /> : null}</div><h3 id="selected-chain-node" className="mt-2 font-semibold">{selected.label}</h3><p className="mt-1 max-w-3xl text-sm leading-6 text-muted-foreground">{selected.detail}</p><p className="mt-2 max-w-3xl text-xs leading-5 text-attention-foreground"><strong>Bukti penyangkal:</strong> {selected.counterEvidence}</p></div><div className="flex flex-wrap gap-2"><CitationDialog citations={selected.citations} label="Bukti titik" /><AskAgentButton context={{ label: `${graph.targetSymbol} · ${selected.label}`, question: `Uji jalur ${selected.label} untuk ${graph.targetSymbol}, termasuk bukti penyangkal.`, symbol: graph.targetSymbol }} label="Tanya jalur ini" /></div></div></section>}
      <details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">Buka daftar hubungan</summary><div className="overflow-x-auto border-t border-border"><table className="w-full min-w-[860px] text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Dari</th><th className="px-4 py-2 font-medium">Ke</th><th className="px-4 py-2 font-medium">Dasar</th><th className="px-4 py-2 font-medium">Arah</th><th className="px-4 py-2 font-medium">Relevansi</th><th className="px-4 py-2 font-medium">Syarat</th></tr></thead><tbody className="divide-y divide-border">{graph.edges.map((edge) => { const from = graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from; const to = graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to; return <tr key={edge.id}><td className="px-4 py-2.5">{from}</td><td className="px-4 py-2.5">{to}</td><td className="px-4 py-2.5">{uiLabel(edge.basis)}</td><td className="px-4 py-2.5"><StatusBadge status={edge.direction} /></td><td className="px-4 py-2.5 font-mono">{edge.relevance}/100</td><td className="px-4 py-2.5"><button type="button" onClick={() => setSelectedEdgeId(edge.id)} className="min-h-9 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Periksa hubungan ${from} ke ${to}`}>Periksa</button></td></tr>; })}</tbody></table></div></details>
    </div>
  );
}
