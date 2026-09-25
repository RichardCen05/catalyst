"use client";

import { useCallback, useMemo, useState } from "react";
import {
  Background,
  BaseEdge,
  Controls,
  Handle,
  MarkerType,
  Position,
  ReactFlow,
  getSmoothStepPath,
  type Edge,
  type EdgeProps,
  type Node,
  type NodeProps,
} from "@xyflow/react";
import type { CausalGraph, CausalNode, ImpactDirection } from "@/lib/types";
import { CHAIN_NODE_HEIGHT, CHAIN_NODE_WIDTH, connectedIds, layoutChainPositions } from "@/lib/agent/chain-layout";
import { AskAgentButton } from "@/components/ask-agent-button";
import { CitationDialog } from "@/components/citation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";
import { EventMarkers } from "@/components/event-markers";
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
      className={`h-[140px] w-[210px] overflow-hidden rounded-lg border bg-surface shadow-panel transition-opacity ${node.kind === "company" ? "border-primary ring-2 ring-primary/15" : node.kind === "source" ? "border-attention/40" : "border-border"} ${data.dimmed ? "opacity-25" : ""}`}
    >
      {node.kind !== "source" ? <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-primary" /> : null}
      <button type="button" onClick={(event) => { event.stopPropagation(); data.onSelect(node.id); }} className="w-full cursor-pointer rounded-[inherit] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="flex items-center gap-2"><span className="grid size-7 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><Icon aria-hidden="true" className="size-3.5" /></span><span className=" text-xs text-muted-foreground">{uiLabel(node.kind)}</span></span><span className="mt-2 line-clamp-3 block text-xs font-semibold leading-5">{node.label}</span><span className="mt-2 block font-mono text-xs text-muted-foreground">{uiLabel(node.basis)}{node.relevance ? ` · ${node.relevance}/100` : ""}</span></button>
      {!terminal ? <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-primary" /> : null}
    </div>
  );
}

const nodeTypes = { chain: ChainNode };

type ChainEdgeData = { labelLeg: "source" | "target" | "middle" };
type ChainFlowEdge = Edge<ChainEdgeData, "chain">;

/** A step edge bends at the midpoint between its cards. Edges that converge
 *  on one card share the trunk and the last leg; edges that fan out of one
 *  card share the first leg. A label on a shared stretch covers the lines and
 *  arrowheads of its neighbours, so it sits on the leg only this edge draws. */
function ChainEdge({ sourceX, sourceY, targetX, targetY, sourcePosition, targetPosition, data, label, ...rest }: EdgeProps<ChainFlowEdge>) {
  const [path, middleX, middleY] = getSmoothStepPath({ sourceX, sourceY, sourcePosition, targetX, targetY, targetPosition });
  const bendX = (sourceX + targetX) / 2;
  const leg = data?.labelLeg ?? "middle";
  const labelX = leg === "source" ? (sourceX + bendX) / 2 : leg === "target" ? (bendX + targetX) / 2 : middleX;
  const labelY = leg === "source" ? sourceY : leg === "target" ? targetY : middleY;
  return <BaseEdge path={path} labelX={labelX} labelY={labelY} label={label} markerEnd={rest.markerEnd} style={rest.style} labelStyle={rest.labelStyle} labelBgStyle={rest.labelBgStyle} labelBgPadding={rest.labelBgPadding} labelBgBorderRadius={rest.labelBgBorderRadius} interactionWidth={rest.interactionWidth} />;
}

const edgeTypes = { chain: ChainEdge };

/* Edge greys come from the theme tokens, so one map reads in both themes. */
const edgeColor: Record<ImpactDirection, string> = {
  Supported: "var(--foreground)",
  Adverse: "var(--foreground)",
  Mixed: "var(--muted-foreground)",
  Unrelated: "var(--border-strong)",
  Unverified: "var(--border-strong)",
};

/** Greyscale has no red for "berlawanan", so direction is told by the line:
 *  solid supports, long dash opposes, short dash is not yet verified. */
const edgeDash: Partial<Record<ImpactDirection, string>> = {
  Adverse: "6 4",
  Unrelated: "2 4",
  Unverified: "2 4",
};

export function CausalChain({ graph }: { graph: CausalGraph }) {
  // Nothing selected means nothing dimmed; the detail panel then reads the
  // company card, where every path meets.
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Label text grows once the user zooms in — projector-legible on demand,
  // compact by default.
  const [zoom, setZoom] = useState(1);
  const selected = graph.nodes.find((node) => node.id === selectedId) ?? graph.nodes.find((node) => node.id === `company-${graph.targetSymbol}`) ?? graph.nodes[0];
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId);
  // A second click on the same card or line clears it, as does a click on
  // the empty canvas.
  const toggleNode = useCallback((id: string) => { setSelectedEdgeId(null); setSelectedId((current) => (current === id ? null : id)); }, []);
  const toggleEdge = (id: string) => { setSelectedEdgeId((current) => (current === id ? null : id)); };
  const clearSelection = () => { setSelectedId(null); setSelectedEdgeId(null); };

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
        // Cards have a fixed size. Without `measured`, React Flow treats every
        // rebuilt node as new, drops its handle positions and hides its edges
        // until it re-measures — the edges then remount and their fade-in
        // replays, so every hover or click made the lines blink.
        width: CHAIN_NODE_WIDTH,
        height: CHAIN_NODE_HEIGHT,
        measured: { width: CHAIN_NODE_WIDTH, height: CHAIN_NODE_HEIGHT },
        data: { causal: node, dimmed: highlighted ? !highlighted.has(node.id) : false, onSelect: toggleNode },
        draggable: false,
        connectable: false,
        focusable: false,
        ariaLabel: `${uiLabel(node.kind)}: ${node.label}`,
      };
    });
    const incoming = new Map<string, number>();
    const outgoing = new Map<string, number>();
    for (const edge of graph.edges) {
      incoming.set(edge.to, (incoming.get(edge.to) ?? 0) + 1);
      outgoing.set(edge.from, (outgoing.get(edge.from) ?? 0) + 1);
    }
    const flowEdges: ChainFlowEdge[] = graph.edges.map((edge) => {
      const active = selectedEdgeId === edge.id;
      const labelLeg = (incoming.get(edge.to) ?? 0) > 1 ? "source" : (outgoing.get(edge.from) ?? 0) > 1 ? "target" : "middle";
      const dimmed = highlighted ? !(highlighted.has(edge.from) && highlighted.has(edge.to)) : false;
      // Task 8: co-movement (Observed correlation) tidak pernah seberat hipotesis
      // kausal — abu-abu putus-putus, bukan warna arah.
      const isComove = edge.basis === "Observed correlation";
      return {
        id: edge.id,
        source: edge.from,
        target: edge.to,
        type: "chain" as const,
        data: { labelLeg },
        label: isComove ? "teramati" : `${uiLabel(edge.confidence).toLowerCase()} · ${edge.relevance}`,
        markerEnd: { type: MarkerType.ArrowClosed, color: isComove ? "var(--muted-foreground)" : edgeColor[edge.direction] },
        style: isComove
          ? { stroke: "var(--muted-foreground)", strokeWidth: active ? 2 : 1.2, strokeDasharray: "6 5", opacity: dimmed ? 0.15 : 0.6 }
          : { stroke: edgeColor[edge.direction], strokeDasharray: edgeDash[edge.direction], strokeWidth: active ? 2.8 : 1.2 + (Math.min(Math.max(edge.relevance, 0), 100) / 100) * 1.6, opacity: dimmed ? 0.15 : 0.78 },
        labelStyle: { fill: "var(--foreground)", fontSize: zoom >= 1 ? 11 : 9, fontFamily: "var(--font-mono)" },
        labelBgStyle: { fill: "var(--surface)", fillOpacity: 0.92 },
        animated: active && !isComove,
      };
    });
    return { nodes: flowNodes, edges: flowEdges };
  }, [graph, highlighted, selectedEdgeId, zoom, toggleNode]);

  return (
    <div data-tour="causal-chain" className="overflow-hidden rounded-lg border border-border bg-surface">
      <div className="flex flex-wrap items-center gap-x-5 gap-y-2 border-b border-border px-4 py-3 text-xs text-muted-foreground"><span className="font-medium text-foreground">Pilih titik atau garis untuk memeriksa</span><span>Sumber</span><span aria-hidden="true">→</span><span>Mekanisme</span><span aria-hidden="true">→</span><span>Emiten</span>{graph.coverage.analyzed ? <><span aria-hidden="true">→</span><span>Dampak bisnis</span></> : null}</div>
      {graph.coverage.analyzed ? null : (
        <p className="border-b border-border bg-attention/10 px-4 py-2 text-xs leading-5 text-muted-foreground">
          Data {graph.coverage.missing.join(", ")} untuk {graph.targetSymbol} belum terekam. Peta menunjukkan sumber dan mekanisme sampai emiten; dampak ke kinerja bisnis belum dapat diuji.
        </p>
      )}
      {graph.hiddenRelationshipCount > 0 ? (
        <p className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
          {graph.hiddenRelationshipCount} hubungan di bawah ambang relevansi tidak digambar — turunkan ambang di atas atau baca semuanya di daftar hubungan bawah.
        </p>
      ) : null}
      <div role="group" className="map-in h-[560px] w-full" aria-label={`Rangkaian sebab akibat ${graph.targetSymbol}`}>
        <ReactFlow nodes={nodes} edges={edges} nodeTypes={nodeTypes} edgeTypes={edgeTypes} fitView fitViewOptions={{ padding: 0.16 }} minZoom={0.3} maxZoom={1.5} nodesDraggable={false} nodesConnectable={false} onMove={(_, viewport) => setZoom(viewport.zoom)} onNodeClick={(_, node) => toggleNode(node.id)} onEdgeClick={(_, edge) => toggleEdge(edge.id)} onPaneClick={clearSelection}>
          <Background gap={20} size={1} color="var(--chart-grid)" />
          <Controls showInteractive={false} />
        </ReactFlow>
      </div>
      <section aria-label="Detail titik terpilih" className="border-t border-border bg-background p-4" aria-live="polite">
        <div className="flex flex-wrap items-center gap-2">
          <span className="text-xs text-muted-foreground font-medium">{uiLabel(selected.kind)}</span>
          {selected.kind === "company" ? null : (
            <>
              <span className="rounded-lg border border-border px-1.5 py-0.5 text-xs text-muted-foreground">Keyakinan {uiLabel(selected.confidence).toLowerCase()}</span>
              <span className="rounded-lg border border-border px-1.5 py-0.5 text-xs text-muted-foreground">Jeda {selected.lag}</span>
            </>
          )}
        </div>
        <h3 className="mt-2 font-semibold">{uiLabel(selected.basis)}</h3>
        <p className="mt-1 text-sm font-medium">{selected.label}</p>
        <EventMarkers markers={selected.markers} className="mt-1 block" />
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.detail}</p>
        <dl className="mt-3 grid gap-3 text-xs leading-5 md:grid-cols-2">
          <div><dt className="font-semibold">Bukti pendukung</dt><dd className="mt-1 text-muted-foreground">{selected.supportingEvidence ?? `Relevansi ${selected.relevance ?? "—"}/100 pada jalur ${selected.label}.`}</dd></div>
          <div><dt className="font-semibold">Bukti penyangkal</dt><dd className="mt-1 text-muted-foreground">{selected.counterEvidence}</dd></div>
        </dl>
        <div className="mt-4 flex flex-wrap gap-2">
          <CitationDialog citations={selected.citations} label="Bukti titik" />
          <AskAgentButton context={{ label: `${graph.targetSymbol} · ${selected.label}`, question: `Jelaskan jalur ${selected.label} untuk ${graph.targetSymbol}.`, symbol: graph.targetSymbol }} label="Tanya jalur ini" />
        </div>
      </section>
      <details className="border-t border-border"><summary className="flex min-h-11 cursor-pointer items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">Buka daftar hubungan</summary><div className="overflow-x-auto border-t border-border"><table className="w-full min-w-[860px] text-left text-xs"><thead className="bg-muted text-muted-foreground"><tr><th className="px-4 py-2 font-medium">Dari</th><th className="px-4 py-2 font-medium">Ke</th><th className="px-4 py-2 font-medium">Dasar</th><th className="px-4 py-2 font-medium">Arah</th><th className="px-4 py-2 font-medium">Relevansi</th></tr></thead><tbody className="divide-y divide-border">{graph.edges.map((edge) => { const from = graph.nodes.find((node) => node.id === edge.from)?.label ?? edge.from; const to = graph.nodes.find((node) => node.id === edge.to)?.label ?? edge.to; return <tr key={edge.id}><td className="px-4 py-2.5">{from}</td><td className="px-4 py-2.5">{to}</td><td className="px-4 py-2.5">{uiLabel(edge.basis)}</td><td className="px-4 py-2.5"><StatusBadge status={edge.direction} /></td><td className="px-4 py-2.5 font-mono">{edge.relevance}/100</td></tr>; })}</tbody></table></div></details>
    </div>
  );
}
