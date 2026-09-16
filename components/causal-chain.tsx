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
import type { CausalGraph, CausalNode, ImpactDirection } from "@/lib/types";
import { CHAIN_NODE_HEIGHT, CHAIN_NODE_WIDTH, connectedIds, layoutChainPositions } from "@/lib/agent/chain-layout";
import { events } from "@/lib/data/fixtures";
import { AskAgentButton } from "@/components/ask-agent-button";
import { CitationDialog } from "@/components/citation-dialog";
import { SourceText } from "@/components/source-text";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconCompanies, IconDocument, IconGauge, IconGraph, IconPolicy, IconSource, IconWeather } from "@/components/ui/icons";
import { uiLabel } from "@/lib/ui-labels";

type ChainNodeData = { causal: CausalNode; dimmed: boolean; onSelect: (id: string) => void };
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

function ChainNode({ data }: NodeProps<ChainFlowNode>) {
  const node = data.causal;
  const Icon = node.kind === "company" ? IconCompanies : node.kind === "mechanism" ? IconGraph : sourceIcons[node.sourceType ?? "market"];
  const terminal = node.kind === "observation" || node.kind === "business-impact";
  return (
    <div
      className={`h-[140px] w-[210px] overflow-hidden rounded-xl border bg-surface shadow-panel transition-opacity ${node.kind === "company" ? "border-primary ring-2 ring-primary/15" : node.kind === "source" ? "border-attention/40" : "border-border"} ${data.dimmed ? "opacity-25" : ""}`}
    >
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

const minimapColor = (node: ChainFlowNode): string =>
  node.data.causal.kind === "company"
    ? "var(--primary)"
    : node.data.causal.kind === "source"
      ? "var(--attention)"
      : "var(--muted-foreground)";

const eventById = new Map(events.map((event) => [event.id, event]));

export function CausalChain({ graph }: { graph: CausalGraph }) {
  const [selectedId, setSelectedId] = useState(`company-${graph.targetSymbol}`);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Edge labels appear only on the selected or hovered edge: with a full
  // graph, a label on every edge collides with cards (seen in review).
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  // Label text grows once the user zooms in — projector-legible on demand,
  // compact by default.
  const [zoom, setZoom] = useState(1);
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes[0];
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId);
  const selectedEdgeSpan = selectedEdge?.citations[0]?.span;
  const selectedEdgeSourceEvent = selectedEdgeSpan ? eventById.get(selectedEdgeSpan.documentId) : undefined;

  const highlighted = useMemo(() => {
    if (selectedEdge) return connectedIds(graph.edges, [selectedEdge.from, selectedEdge.to]);
    if (selectedId && graph.nodes.some((node) => node.id === selectedId)) {
      return connectedIds(graph.edges, [selectedId]);
    }
    return null;
  }, [graph, selectedId, selectedEdge]);

  const { nodes, edges } = useMemo(() => {
    const { positions } = layoutChainPositions(graph.nodes);
    const flowNodes: ChainFlowNode[] = graph.nodes.map((node) => {
      const position = positions.get(node.id) ?? { x: 0, y: 0 };
      return {
        id: node.id,
        type: "chain" as const,
        position,
        data: { causal: node, dimmed: highlighted ? !highlighted.has(node.id) : false, onSelect: (id) => { setSelectedId(id); setSelectedEdgeId(null); } },
        draggable: false,
        connectable: false,
        focusable: false,
        ariaLabel: `${uiLabel(node.kind)}: ${node.label}`,
      };
    });
    const flowEdges: Edge[] = graph.edges.map((edge) => {
      const active = selectedEdgeId === edge.id;
      const labelled = active || hoveredEdgeId === edge.id;
      const dimmed = highlighted ? !(highlighted.has(edge.from) && highlighted.has(edge.to)) : false;
      // Task 8: co-movement (Observed correlation) tidak pernah seberat hipotesis
      // kausal — abu-abu putus-putus, bukan warna arah.
      const isComove = edge.basis === "Observed correlation";
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "smoothstep",
        label: labelled ? (isComove ? "teramati" : `${uiLabel(edge.confidence).toLowerCase()} · ${edge.relevance}`) : "",
        markerEnd: { type: MarkerType.ArrowClosed, color: isComove ? "var(--muted-foreground)" : edgeColor[edge.direction] },
        style: isComove
          ? { stroke: "var(--muted-foreground)", strokeWidth: active ? 2 : 1.2, strokeDasharray: "6 5", opacity: dimmed ? 0.15 : 0.6 }
          : { stroke: edgeColor[edge.direction], strokeWidth: active ? 2.8 : 1.2 + (Math.min(Math.max(edge.relevance, 0), 100) / 100) * 1.6, opacity: dimmed ? 0.15 : 0.78 },
        labelStyle: { fill: "var(--foreground)", fontSize: zoom >= 1 ? 11 : 9, fontFamily: "var(--font-mono)" },
        labelBgStyle: { fill: "var(--surface)", fillOpacity: 0.92 },
        animated: active && !isComove,
      };
    });
    return { nodes: flowNodes, edges: flowEdges };
  }, [graph, highlighted, selectedEdgeId, hoveredEdgeId, zoom]);

  return (
    <div data-tour="causal-chain" className="overflow-hidden rounded-xl border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-[10px] text-muted-foreground"><span className="font-mono uppercase tracking-wider text-primary">Pilih titik atau garis untuk memeriksa</span><span>Sumber</span><span aria-hidden="true">→</span><span>Mekanisme</span><span aria-hidden="true">→</span><span>Emiten</span>{graph.coverage.analyzed ? <><span aria-hidden="true">→</span><span>Dampak bisnis</span></> : null}</div>
      {graph.coverage.analyzed ? null : (
        <p className="border-b border-border bg-attention/10 px-4 py-2 text-xs leading-5 text-muted-foreground">
          Rekaman {graph.targetSymbol} belum lengkap — {graph.coverage.missing.join(", ")} belum ada. Rantai berhenti di emiten: sumber dan mekanismenya terekam, dampak bisnisnya belum dapat diuji.
        </p>
      )}
      {graph.hiddenRelationshipCount > 0 ? (
        <p className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
          {graph.hiddenRelationshipCount} hubungan di bawah ambang relevansi tidak digambar — turunkan ambang di atas atau baca semuanya di daftar hubungan bawah.
        </p>
      ) : null}
      <div className="h-[560px] w-full" aria-label={`Rangkaian sebab akibat ${graph.targetSymbol}`}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.3} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} onMove={(_, viewport) => setZoom(viewport.zoom)} onNodeClick={(_, node) => { setSelectedId(node.id); setSelectedEdgeId(null); }} onEdgeClick={(_, edge) => setSelectedEdgeId(edge.id)} onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)} onEdgeMouseLeave={() => setHoveredEdgeId(null)}>
          <Background gap={20} size={1} color="var(--chart-grid)" />
          {graph.nodes.length > 7 ? <MiniMap pannable zoomable nodeColor={minimapColor} className="!bg-surface" /> : null}
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <section aria-label="Detail titik terpilih" className="border-t border-border bg-background p-4" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{uiLabel(selected.kind)}</span>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(selected.confidence).toLowerCase()}</span>
          <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{selected.lag}</span>
        </div>
        <h3 className="mt-2 font-semibold">{uiLabel(selected.basis)}</h3>
        <p className="mt-1 text-sm font-medium">{selected.label}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.detail}</p>
        <dl className="mt-3 grid gap-3 text-xs leading-5 md:grid-cols-2">
          <div><dt className="font-semibold">Bukti pendukung</dt><dd className="mt-1 text-muted-foreground">{selected.basis === "Aggregation point" ? selected.detail : `Relevansi ${selected.relevance ?? "—"}/100 pada jalur ${selected.label}.`}</dd></div>
          <div><dt className="font-semibold">Bukti penyangkal</dt><dd className="mt-1 text-muted-foreground">{selected.counterEvidence}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <CitationDialog citations={selected.citations} label="Bukti titik" />
          <AskAgentButton context={{ label: `${graph.targetSymbol} · ${selected.label}`, question: `Jelaskan jalur ${selected.label} untuk ${graph.targetSymbol}.`, symbol: graph.targetSymbol }} label="Tanya jalur ini" />
        </div>
      </section>
      {selectedEdge ? <section aria-label="Detail hubungan terpilih" className="border-t border-primary/30 bg-primary/5 p-4" aria-live="polite"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">Syarat pembatalan</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(selectedEdge.confidence).toLowerCase()}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Jeda {selectedEdge.lag}</span><StatusBadge status={selectedEdge.direction} /></div><h3 className="mt-2 font-semibold">{graph.nodes.find((node) => node.id === selectedEdge.from)?.label} → {graph.nodes.find((node) => node.id === selectedEdge.to)?.label}</h3><dl className="mt-4 grid gap-3 text-xs leading-5 md:grid-cols-2 xl:grid-cols-3"><div><dt className="font-semibold">Eksposur</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.exposure}</dd></div><div><dt className="font-semibold">Indikator yang dicari</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.expectedObservable}</dd></div><div><dt className="font-semibold">Dampak bisnis</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.businessImpactDimension ? <span className="font-mono text-primary">{uiLabel(selectedEdge.businessImpactDimension)}</span> : null}<span className="mt-1 block">{selectedEdge.businessImpactImplication}</span></dd></div><div><dt className="font-semibold">Penjelasan lain</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.alternativeExplanation}</dd></div><div><dt className="font-semibold">Batal jika</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.falsificationCondition}</dd></div><div><dt className="font-semibold">Dasar keyakinan</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.confidenceBasis}</dd></div></dl><div className="mt-4 flex flex-wrap gap-2"><CitationDialog citations={selectedEdge.citations} label="Bukti hubungan" /><AskAgentButton context={{ label: `${graph.targetSymbol} · hubungan`, question: `Jelaskan hubungan ${graph.nodes.find((node) => node.id === selectedEdge.from)?.label} ke ${graph.nodes.find((node) => node.id === selectedEdge.to)?.label}`, symbol: graph.targetSymbol }} label="Uji lewat asisten" /></div>{selectedEdgeSpan ? <div className="mt-3"><p className="text-xs font-medium">{selectedEdgeSourceEvent?.title ?? "Sumber terlapor"}</p><SourceText span={selectedEdgeSpan} body={selectedEdgeSourceEvent?.body ?? null} /></div> : <p className="mt-3 text-xs text-muted-foreground">Klaim hubungan ini tidak tertaut ke kalimat sumber — perlakukan sebagai hipotesis, bukan kutipan.</p>}</section> : null}
      <details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">Buka daftar hubungan</summary><div className="overflow-x-auto border-t border-border"><table className="w-full min-w-[860px] text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Dari</th><th className="px-4 py-2 font-medium">Ke</th><th className="px-4 py-2 font-medium">Dasar</th><th className="px-4 py-2 font-medium">Arah</th><th className="px-4 py-2 font-medium">Relevansi</th><th className="px-4 py-2 font-medium">Syarat</th></tr></thead><tbody className="divide-y divide-border">{graph.edges.map((edge) => { const from = graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from; const to = graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to; return <tr key={edge.id}><td className="px-4 py-2.5">{from}</td><td className="px-4 py-2.5">{to}</td><td className="px-4 py-2.5">{uiLabel(edge.basis)}</td><td className="px-4 py-2.5"><StatusBadge status={edge.direction} /></td><td className="px-4 py-2.5 font-mono">{edge.relevance}/100</td><td className="px-4 py-2.5"><button type="button" onClick={() => setSelectedEdgeId(edge.id)} className="min-h-9 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring" aria-label={`Periksa hubungan ${from} ke ${to}`}>Periksa</button></td></tr>; })}</tbody></table></div></details>
    </div>
  );
}
