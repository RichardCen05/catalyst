"use client";

import Link from "next/link";
import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import {
  Background,
  Controls,
  Handle,
  MarkerType,
  MiniMap,
  PanOnScrollMode,
  Position,
  ReactFlow,
  useNodesState,
  type Edge,
  type Node,
  type NodeProps,
  type ReactFlowInstance,
} from "@xyflow/react";
import type { ImpactDirection, MarketCausalGraph, MarketCausalNode, SymbolCode } from "@/lib/types";
import {
  MARKET_COMPANY_HEIGHT,
  MARKET_COMPANY_WIDTH,
  MARKET_NODE_HEIGHT,
  MARKET_NODE_WIDTH,
  layoutMarketGraph,
  marketNodeSize,
} from "@/lib/agent/market-layout";
import { symbolSubgraph } from "@/lib/agent/market-graph";
import { connectedIds } from "@/lib/agent/chain-layout";
import { events } from "@/lib/data/fixtures";
import { uiLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";
import { AskAgentButton } from "@/components/ask-agent-button";
import { CitationDialog } from "@/components/citation-dialog";
import { SourceText } from "@/components/source-text";
import { StatusBadge } from "@/components/ui/status-badge";
import {
  IconArrowRight,
  IconCompanies,
  IconDocument,
  IconGauge,
  IconGraph,
  IconPolicy,
  IconSource,
  IconWeather,
} from "@/components/ui/icons";

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

/* Same hues as the single-issuer chain: values chosen to read on bone and on
   ink without a second palette. Non-text, so they answer to the restraint
   rule rather than to a contrast ratio. */
const edgeColor: Record<ImpactDirection, string> = {
  Supported: "var(--positive)",
  Adverse: "var(--danger)",
  Mixed: "var(--attention)",
  Unrelated: "var(--muted-foreground)",
  Unverified: "var(--muted-foreground)",
};

type MapNodeData = {
  causal: MarketCausalNode;
  dimmed: boolean;
  /** A card more than one issuer runs through — a shared recording, a
   *  transmission channel, or a business test they converge into. */
  hub: boolean;
  onSelect: (id: string) => void;
};
type MapFlowNode = Node<MapNodeData, "market">;

function MarketNode({ data }: NodeProps<Node<MapNodeData, "market">>) {
  const node = data.causal;
  const company = node.kind === "company";
  const Icon = company ? IconCompanies : node.kind === "mechanism" ? IconGraph : sourceIcons[node.sourceType ?? "market"];
  const terminal = node.kind === "observation" || node.kind === "business-impact";

  if (company) {
    return (
      <div
        style={{ width: MARKET_COMPANY_WIDTH, height: MARKET_COMPANY_HEIGHT }}
        className={cn(
          "overflow-hidden rounded-xl border-2 border-primary bg-surface shadow-sm ring-4 ring-primary/12 transition-opacity",
          data.dimmed && "opacity-20",
        )}
      >
        <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-primary" />
        <button
          type="button"
          onClick={() => data.onSelect(node.id)}
          className="flex h-full w-full cursor-pointer flex-col rounded-[inherit] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2">
            <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/12 text-primary">
              <Icon aria-hidden="true" className="size-3.5" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Emiten</span>
          </span>
          <span className="mt-1 block font-mono text-lg font-semibold leading-6 tracking-tight">{node.label}</span>
          <span className="mt-auto block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">
            Titik penghubung
          </span>
        </button>
        <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-primary" />
      </div>
    );
  }

  return (
    <div
      style={{ width: MARKET_NODE_WIDTH, height: MARKET_NODE_HEIGHT }}
      className={cn(
        "overflow-hidden rounded-xl border bg-surface shadow-sm transition-opacity",
        node.kind === "source" ? "border-attention/45" : "border-border",
        data.hub && "border-attention ring-2 ring-attention/25",
        data.dimmed && "opacity-20",
      )}
    >
      {node.kind !== "source" ? <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-primary" /> : null}
      <button
        type="button"
        onClick={() => data.onSelect(node.id)}
        className="flex h-full w-full cursor-pointer flex-col rounded-[inherit] p-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex items-center gap-2">
          <span className="grid size-6 shrink-0 place-items-center rounded-md bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="size-3.5" />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{uiLabel(node.kind)}</span>
          {data.hub ? (
            <span className="ml-auto rounded-full border border-attention/50 bg-attention/12 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-attention-foreground">
              {node.symbols.length} emiten
            </span>
          ) : null}
        </span>
        <span className="mt-1.5 line-clamp-3 block text-xs font-semibold leading-[1.35]">{node.label}</span>
        <span className="mt-auto flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
          <span className="truncate">{node.symbols.join(" · ")}</span>
          {node.relevance ? <span className="ml-auto shrink-0">{node.relevance}/100</span> : null}
        </span>
      </button>
      {!terminal ? <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-primary" /> : null}
    </div>
  );
}

const nodeTypes = { market: MarketNode };

const minimapColor = (node: MapFlowNode): string =>
  node.data.causal.kind === "company"
    ? "var(--primary)"
    : node.data.hub
      ? "var(--attention)"
      : "var(--muted-foreground)";

const eventById = new Map(events.map((event) => [event.id, event]));

/** Below this, a card's three-line headline stops being readable and the
 *  board is a diagram of grey slabs. The map holds this floor even when the
 *  columns no longer fit across, and pans sideways instead. */
const MIN_READABLE_ZOOM = 0.52;

/**
 * Focus, selection and viewport are mount state on purpose.
 *
 * Changing the relevance threshold or the watchlist rebuilds the graph under a
 * viewport that was framed for the old one, and a selection can point at a
 * card that no longer exists. Rather than reconcile that in an effect, the
 * caller keys this component on the identity that matters (watchlist +
 * threshold) so a rebuild remounts it and the framing runs again.
 */
export function MarketCausalMap({
  graph,
  reloading,
  toolbar,
}: {
  graph: MarketCausalGraph;
  reloading?: boolean;
  toolbar?: React.ReactNode;
}) {
  const [focus, setFocus] = useState<SymbolCode | null>(null);
  const [selectedId, setSelectedId] = useState<string | null>(null);
  const [selectedEdgeId, setSelectedEdgeId] = useState<string | null>(null);
  // Edge labels appear only on the selected or hovered edge: with sixty nodes
  // on one canvas, a label on every edge covers the cards it describes.
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  const flowRef = useRef<ReactFlowInstance<MapFlowNode, Edge> | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const layout = useMemo(() => layoutMarketGraph(graph), [graph]);
  const { positions } = layout;

  const selected = graph.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdge = graph.edges.find((edge) => edge.id === selectedEdgeId) ?? null;
  const selectedEdgeSpan = selectedEdge?.citations[0]?.span;
  const selectedEdgeSourceEvent = selectedEdgeSpan ? eventById.get(selectedEdgeSpan.documentId) : undefined;

  /** One highlight rule, three inputs, in priority order: a picked edge, a
   *  picked node, then the focused issuer. Without it a click and a focus can
   *  each claim the canvas and the dimming contradicts itself. */
  const highlighted = useMemo(() => {
    if (selectedEdge) return connectedIds(graph.edges, [selectedEdge.from, selectedEdge.to]);
    if (selectedId && graph.nodes.some((node) => node.id === selectedId)) return connectedIds(graph.edges, [selectedId]);
    if (focus) return symbolSubgraph(graph, focus);
    return null;
  }, [graph, selectedId, selectedEdge, focus]);

  /**
   * Zoom to fit the four columns across, never the whole board down.
   *
   * The board is much taller than it is wide — twenty-five recordings stacked
   * in one column — so fitting both axes lands near 0.2 zoom, where every card is
   * an unreadable grey slab. Framing the column span instead lands near 0.8,
   * which is legible, and the board reads the way a long document does: the
   * full width, scrolled. The minimap and the zoom-out control still give the
   * bird's-eye view.
   */
  const widthZoom = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || layout.width <= 0 || canvas.clientWidth <= 0) return null;
    return Math.min(1.05, Math.max(MIN_READABLE_ZOOM, canvas.clientWidth / layout.width));
  }, [layout.width]);

  /**
   * Frame the columns with `top` (a board-space y) at the top of the canvas.
   *
   * Applied on the next frame and without an animation, because every caller
   * is a click that also changes React state. React Flow animates a viewport
   * change with a d3 transition on the zoom pane, and the re-render that
   * follows the state change re-binds that pane and drops the transition
   * mid-flight — the board would simply not move. One frame later the render
   * has settled and an instant set always lands.
   */
  const frameAt = useCallback((top: number) => {
    const flow = flowRef.current;
    const zoom = widthZoom();
    if (!flow || zoom === null) return false;
    requestAnimationFrame(() => flow.setViewport({ x: 0, y: -top * zoom, zoom }));
    return true;
  }, [widthZoom]);

  /**
   * Frame once the canvas has a width.
   *
   * `onInit` fires before the grid has settled its column, so the canvas can
   * still measure zero there — and a zero width silently clamps the zoom to
   * its floor, which is what made the board open at 0.3 with every card
   * illegible. Observing the element instead frames on the first real
   * measurement and re-frames when the sidebar or the window changes it,
   * keeping the whole column span in view at any breakpoint.
   */
  const framedWidth = useRef(0);
  // Below the readable floor the columns no longer fit across, so the board
  // has to be pannable sideways as well — on a phone it is read by moving
  // along one path, not by squinting at four columns at once.
  const [freePan, setFreePan] = useState(false);
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas || typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(() => {
      const width = canvas.clientWidth;
      if (width <= 0) return;
      setFreePan(width / layout.width < MIN_READABLE_ZOOM);
      if (width === framedWidth.current) return;
      const flow = flowRef.current;
      // Keep the reader where they were: re-frame around the board-space row
      // currently at the top of the canvas, not back at the first row.
      const current = flow?.getViewport();
      const top = current && current.zoom > 0 && framedWidth.current > 0 ? -current.y / current.zoom : 0;
      if (frameAt(top)) framedWidth.current = width;
    });
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [frameAt, layout.width]);

  /** Put a board-space y in the middle of the canvas instead of at its top —
   *  what "show me this" means when the thing has inputs above it and outputs
   *  below. */
  const frameCentre = useCallback((centre: number) => {
    const canvas = canvasRef.current;
    const zoom = widthZoom();
    if (!canvas || zoom === null) return false;
    return frameAt(Math.max(0, centre - canvas.clientHeight / zoom / 2));
  }, [frameAt, widthZoom]);

  const fitTo = useCallback((ids: string[]) => {
    const flow = flowRef.current;
    if (!flow || ids.length === 0) return;
    requestAnimationFrame(() => flow.fitView({ nodes: ids.map((id) => ({ id })), padding: 0.18, maxZoom: 1 }));
  }, []);

  const focusSymbol = useCallback((symbol: SymbolCode | null) => {
    setFocus(symbol);
    setSelectedId(null);
    setSelectedEdgeId(null);
    if (!symbol) {
      frameAt(0);
      return;
    }
    // Centre the issuer card and dim everything it does not run through. On a
    // merged board an issuer's recordings are spread down the source column
    // rather than gathered in one block, so there is no "its rows" to scroll
    // to — the company card is the one place its paths all meet, and the
    // dimming is what separates them from the rest.
    const company = positions.get(`company-${symbol}`);
    if (company && frameCentre(company.y + MARKET_COMPANY_HEIGHT / 2)) return;
    fitTo([...symbolSubgraph(graph, symbol)]);
  }, [fitTo, frameAt, frameCentre, graph, positions]);

  const hubIds = useMemo(() => new Set(graph.hubNodeIds), [graph.hubNodeIds]);
  const sharedIds = useMemo(() => new Set(graph.sharedSourceIds), [graph.sharedSourceIds]);

  /** A drag ends with a click on the card that was under the pointer the
   *  whole time, so the browser fires it as an ordinary click. Without this
   *  guard every drag would also open that card's detail panel. */
  const draggedAt = useRef(0);
  const selectNode = useCallback((id: string) => {
    if (Date.now() - draggedAt.current < 200) return;
    setSelectedId(id);
    setSelectedEdgeId(null);
  }, []);

  /**
   * Card positions live in React Flow's own state so they can be dragged.
   *
   * A laid-out board is a starting point, not a verdict: an analyst reading
   * one path wants to pull its cards clear of the others, and a layout that
   * snapped back on the next render would make that impossible. So the layout
   * seeds this state and the drag owns it from then on, until "Susun ulang"
   * puts every card back where the layout wants it.
   */
  const baseNodes = useMemo<MapFlowNode[]>(() => graph.nodes.map((node) => ({
    id: node.id,
    type: "market" as const,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    ...marketNodeSize(node.kind),
    data: {
      causal: node,
      hub: hubIds.has(node.id),
      dimmed: false,
      onSelect: selectNode,
    },
    connectable: false,
    focusable: false,
    ariaLabel: `${uiLabel(node.kind)}: ${node.label} (${node.symbols.join(", ")})`,
  })), [graph.nodes, positions, hubIds, selectNode]);

  const [nodeState, setNodeState, onNodesChange] = useNodesState<MapFlowNode>(baseNodes);
  const resetLayout = useCallback(() => setNodeState(baseNodes), [baseNodes, setNodeState]);
  useEffect(() => { setNodeState(baseNodes); }, [baseNodes, setNodeState]);

  // Dimming is derived, never stored: writing it back into node state on every
  // hover would overwrite the positions a drag just produced.
  const nodes = useMemo(
    () => (highlighted
      ? nodeState.map((node) => (node.data.dimmed === !highlighted.has(node.id)
        ? node
        : { ...node, data: { ...node.data, dimmed: !highlighted.has(node.id) } }))
      : nodeState.map((node) => (node.data.dimmed ? { ...node, data: { ...node.data, dimmed: false } } : node))),
    [nodeState, highlighted],
  );

  const edges = useMemo(() => graph.edges.map((edge): Edge => {
    const active = selectedEdgeId === edge.id;
    const labelled = active || hoveredEdgeId === edge.id;
    const dimmed = highlighted ? !(highlighted.has(edge.from) && highlighted.has(edge.to)) : false;
    // An edge into or out of a hub is the board's whole argument — many
    // recordings, few channels, six issuers — so it is drawn heavier than a
    // line that only ever concerned one company. Colour stays with the
    // direction of the claim: nearly every edge touches a hub, so colouring
    // those too would repaint the whole board one hue and throw away the
    // mendukung / berlawanan reading. Only a shared recording, which is rare
    // enough to stay a signal, takes the accent.
    const fanOut = hubIds.has(edge.from) || hubIds.has(edge.to);
    const shared = sharedIds.has(edge.from);
    const stroke = shared ? "var(--attention)" : edgeColor[edge.direction];
    const weight = 0.9 + (Math.min(Math.max(edge.relevance, 0), 100) / 100) * 1.1;
    return {
      id: edge.id,
      source: edge.from,
      target: edge.to,
      // Bezier, not orthogonal. Smoothstep routes every edge down the same
      // corridor between two columns, so a hub feeding six issuers drew six
      // lines stacked on one vertical — indistinguishable, and impossible to
      // follow. A curve leaves its handle at its own angle and separates
      // immediately.
      type: "default",
      // A hairline is hard to hover at 0.75 zoom; the hit area is widened
      // without widening the ink.
      interactionWidth: 20,
      label: labelled ? `${edge.symbol} · ${uiLabel(edge.confidence).toLowerCase()} · ${edge.relevance}` : "",
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 16, height: 16 },
      style: {
        stroke,
        strokeWidth: active ? 2.6 : shared ? weight + 0.8 : fanOut ? weight + 0.3 : weight,
        // Lines are the densest thing on the board, so they sit back from the
        // cards they connect: enough to trace one, not enough to compete with
        // the text. A picked or hovered line comes forward on its own.
        opacity: dimmed ? 0.08 : active ? 1 : shared ? 0.95 : fanOut ? 0.55 : 0.4,
      },
      labelStyle: { fill: "var(--foreground)", fontSize: 11, fontFamily: "var(--font-mono)" },
      labelBgStyle: { fill: "var(--surface)", fillOpacity: 0.94 },
      labelBgPadding: [6, 3],
      labelBgBorderRadius: 4,
      animated: active,
      zIndex: active ? 2 : shared ? 1 : 0,
    };
  }), [graph.edges, highlighted, selectedEdgeId, hoveredEdgeId, hubIds, sharedIds]);

  const sharedSources = graph.nodes.filter((node) => sharedIds.has(node.id));

  return (
    <section data-tour="market-map" className="overflow-hidden rounded-[12px] border border-border bg-surface">
      {toolbar}

      <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-2.5 text-[10px] text-muted-foreground">
        <span className="font-mono uppercase tracking-wider text-primary">Alur</span>
        <span>Sumber</span><span aria-hidden="true">→</span>
        <span>Mekanisme</span><span aria-hidden="true">→</span>
        <span>Emiten</span><span aria-hidden="true">→</span>
        <span>Dampak bisnis</span>
        <span className="ml-auto inline-flex items-center gap-1.5">
          <span aria-hidden="true" className="inline-block size-2 rounded-full bg-attention" />
          Sumber dipakai lebih dari satu emiten
        </span>
        <span>Kartu bisa digeser · &ldquo;Susun ulang&rdquo; mengembalikannya</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3" role="group" aria-label="Fokus emiten">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Fokus</span>
        <button
          type="button"
          onClick={() => focusSymbol(null)}
          aria-pressed={focus === null}
          className={cn(
            "min-h-8 cursor-pointer rounded-full border px-3 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
            focus === null ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
          )}
        >
          Semua
        </button>
        {/* Focus is how one issuer's path is read out of a board where every
            card can belong to several: it dims everything the issuer does not
            run through, hubs included. */}
        {graph.symbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => focusSymbol(symbol)}
            aria-pressed={focus === symbol}
            className={cn(
              "min-h-8 cursor-pointer rounded-full border px-3 font-mono text-[11px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              focus === symbol ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:bg-muted",
            )}
          >
            {symbol}
          </button>
        ))}
        <button
          type="button"
          onClick={resetLayout}
          className="min-h-8 cursor-pointer rounded-full border border-border px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          Susun ulang
        </button>
        {sharedSources.length ? (
          <button
            type="button"
            onClick={() => {
              setFocus(null);
              setSelectedEdgeId(null);
              setSelectedId(null);
              // Centre the shared prints at the board's own scale. Fitting
              // them on both axes would zoom past that scale and cut off the
              // issuers they fan into, which are the reason to look.
              const tops = sharedSources.map((node) => positions.get(node.id)?.y ?? Infinity).filter(Number.isFinite);
              const centre = tops.length ? (Math.min(...tops) + Math.max(...tops)) / 2 + MARKET_NODE_HEIGHT / 2 : Infinity;
              if (!Number.isFinite(centre) || !frameCentre(centre)) {
                fitTo(sharedSources.map((node) => node.id));
              }
            }}
            className="ml-auto inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-attention/45 bg-attention/10 px-3 font-mono text-[11px] text-attention-foreground transition-colors hover:bg-attention/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {sharedSources.length} pemicu bersama
            <IconArrowRight aria-hidden="true" className="size-3" />
          </button>
        ) : null}
      </div>

      {graph.skipped.length ? (
        <p className="border-b border-border bg-muted px-4 py-2 text-xs leading-5 text-muted-foreground">
          Tidak digambar: {graph.skipped.map((item) => `${item.symbol} (${item.reason.toLowerCase().replace(/\.$/, "")})`).join("; ")}.
        </p>
      ) : null}
      {graph.hiddenRelationshipCount > 0 ? (
        <p className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
          {graph.hiddenRelationshipCount} hubungan di bawah ambang relevansi tidak digambar — turunkan ambang di atas.
        </p>
      ) : null}

      <div
        ref={canvasRef}
        className={cn("relative h-[min(78dvh,760px)] w-full transition-opacity", reloading && "opacity-50")}
        aria-label="Peta sebab akibat seluruh kasus"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => { flowRef.current = instance as ReactFlowInstance<MapFlowNode, Edge>; frameAt(0); }}
          minZoom={0.08}
          maxZoom={1.5}
          nodesConnectable={false}
          onNodeDragStart={() => { draggedAt.current = Date.now(); }}
          onNodeDrag={() => { draggedAt.current = Date.now(); }}
          onNodeDragStop={() => { draggedAt.current = Date.now(); }}
          // The board is framed to its column width and read downwards, so the
          // wheel scrolls it like a document. Zooming on the wheel instead
          // would undo that framing on the first flick and put the columns at
          // a different scale than the headings above them promise; the zoom
          // controls and pinch still change scale deliberately.
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          panOnScroll
          panOnScrollMode={freePan ? PanOnScrollMode.Free : PanOnScrollMode.Vertical}
          onNodeClick={(_, node) => selectNode(node.id)}
          onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedId(null); }}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          onPaneClick={() => { setSelectedId(null); setSelectedEdgeId(null); }}
        >
          <Background gap={20} size={1} color="var(--chart-grid)" />
          {/* The board is several times taller than it is wide, so the default
              mask covers most of the minimap. Tokened here — the untinted
              default reads as a grey slab on the dark theme. */}
          <MiniMap
            pannable
            zoomable
            nodeColor={minimapColor}
            nodeStrokeWidth={3}
            maskColor="color-mix(in srgb, var(--background) 78%, transparent)"
            className="!bottom-4 !right-4 !m-0 !hidden !h-44 !w-28 overflow-hidden rounded-lg !border !border-border !bg-surface sm:!block"
          />
          {/* Top-right: bottom-left is the first column, where the zoom
              buttons sat on top of a source card. Fit-view is left out on
              purpose — it fits both axes,
              which on a board this tall is the illegible 0.2 zoom the framing
              exists to avoid; the "Semua" chip is the reset. */}
          <Controls showInteractive={false} showFitView={false} position="top-right" />
        </ReactFlow>
      </div>

      <MapDetail
        graph={graph}
        selected={selected}
        onFocusSymbol={focusSymbol}
      />

      {selectedEdge ? (
        <section aria-label="Detail hubungan terpilih" className="border-t border-primary/30 bg-primary/5 p-4" aria-live="polite">
          <div className="flex flex-wrap items-center gap-2">
            <span className="font-mono text-[10px] uppercase tracking-wider text-primary">Syarat pembatalan · {selectedEdge.symbol}</span>
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(selectedEdge.confidence).toLowerCase()}</span>
            <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Jeda {selectedEdge.lag}</span>
            <StatusBadge status={selectedEdge.direction} />
          </div>
          <h3 className="mt-2 font-semibold">
            {graph.nodes.find((node) => node.id === selectedEdge.from)?.label} → {graph.nodes.find((node) => node.id === selectedEdge.to)?.label}
          </h3>
          <dl className="mt-4 grid gap-3 text-xs leading-5 md:grid-cols-2 xl:grid-cols-3">
            <div><dt className="font-semibold">Eksposur</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.exposure}</dd></div>
            <div><dt className="font-semibold">Indikator yang dicari</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.expectedObservable}</dd></div>
            <div><dt className="font-semibold">Penjelasan lain</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.alternativeExplanation}</dd></div>
            <div><dt className="font-semibold">Batal jika</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.falsificationCondition}</dd></div>
            <div><dt className="font-semibold">Dasar keyakinan</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.confidenceBasis}</dd></div>
            <div><dt className="font-semibold">Dampak bisnis</dt><dd className="mt-1 text-muted-foreground">{selectedEdge.businessImpactDimension ? <span className="font-mono text-primary">{uiLabel(selectedEdge.businessImpactDimension)}</span> : null}<span className="mt-1 block">{selectedEdge.businessImpactImplication}</span></dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2">
            <CitationDialog citations={selectedEdge.citations} label="Bukti hubungan" />
            <AskAgentButton
              context={{
                label: `${selectedEdge.symbol} · hubungan`,
                question: `Jelaskan hubungan ${graph.nodes.find((node) => node.id === selectedEdge.from)?.label} ke ${graph.nodes.find((node) => node.id === selectedEdge.to)?.label} untuk ${selectedEdge.symbol}.`,
                symbol: selectedEdge.symbol,
              }}
              label="Uji lewat asisten"
            />
          </div>
          {selectedEdgeSpan ? (
            <div className="mt-3">
              <p className="text-xs font-medium">{selectedEdgeSourceEvent?.title ?? "Sumber terlapor"}</p>
              <SourceText span={selectedEdgeSpan} body={selectedEdgeSourceEvent?.body ?? null} />
            </div>
          ) : (
            <p className="mt-3 text-xs text-muted-foreground">Klaim hubungan ini tidak tertaut ke kalimat sumber — perlakukan sebagai hipotesis, bukan kutipan.</p>
          )}
        </section>
      ) : null}

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Buka kasus</span>
        {graph.symbols.map((symbol) => (
          <Link
            key={symbol}
            href={`/cases/${symbol}`}
            data-tour-action={symbol === "ANTM" ? "open-antm-case" : undefined}
            className="inline-flex min-h-8 items-center gap-1 rounded-full border border-border px-3 font-mono text-[11px] text-primary transition-colors hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            {symbol}
            <IconArrowRight aria-hidden="true" className="size-3" />
          </Link>
        ))}
      </div>
    </section>
  );
}

function MapDetail({
  graph,
  selected,
  onFocusSymbol,
}: {
  graph: MarketCausalGraph;
  selected: MarketCausalNode | null;
  onFocusSymbol: (symbol: SymbolCode) => void;
}) {
  if (!selected) {
    return (
      <section className="border-t border-border bg-background px-4 py-5" aria-live="polite">
        <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Belum ada titik dipilih</p>
        <p className="mt-1.5 max-w-2xl text-sm leading-6 text-muted-foreground">
          Pilih satu kartu untuk membaca dasar, bukti penyangkal, dan sitasinya — atau pilih satu garis untuk melihat syarat yang membatalkan hubungan itu.
        </p>
      </section>
    );
  }

  const coverage = selected.symbols.map((symbol) => graph.coverage[symbol]).filter(Boolean);
  const incomplete = selected.symbols.filter((symbol) => graph.coverage[symbol] && !graph.coverage[symbol].analyzed);

  return (
    <section aria-label="Detail titik terpilih" className="border-t border-border bg-background p-4" aria-live="polite">
      <div className="flex flex-wrap items-center gap-2">
        <span className="font-mono text-[10px] uppercase tracking-wider text-primary">{uiLabel(selected.kind)}</span>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(selected.confidence).toLowerCase()}</span>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{selected.lag}</span>
        {selected.symbols.length > 1 ? (
          <span className="rounded border border-attention/50 bg-attention/10 px-1.5 py-0.5 font-mono text-[9px] text-attention-foreground">
            Dipakai {selected.symbols.length} emiten
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 font-semibold">{uiLabel(selected.basis)}</h3>
      <p className="mt-1 text-sm font-medium">{selected.label}</p>
      <p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.detail}</p>

      <dl className="mt-3 grid gap-3 text-xs leading-5 md:grid-cols-2">
        <div>
          <dt className="font-semibold">Bukti pendukung</dt>
          <dd className="mt-1 text-muted-foreground">
            {selected.basis === "Aggregation point" ? selected.detail : `Relevansi ${selected.relevance ?? "—"}/100 pada jalur ${selected.label}.`}
          </dd>
        </div>
        <div><dt className="font-semibold">Bukti penyangkal</dt><dd className="mt-1 text-muted-foreground">{selected.counterEvidence}</dd></div>
      </dl>

      {incomplete.length && coverage.length ? (
        <p className="mt-3 rounded-[8px] border border-attention/30 bg-attention/8 px-3 py-2 text-xs leading-5 text-muted-foreground">
          Rantai {incomplete.join(", ")} berhenti di emiten — {[...new Set(incomplete.flatMap((symbol) => graph.coverage[symbol].missing))].join(", ")} belum terekam, jadi dampak bisnisnya belum dapat diuji.
        </p>
      ) : null}

      <div className="mt-4 flex flex-wrap items-center gap-2">
        <CitationDialog citations={selected.citations} label="Bukti titik" />
        <AskAgentButton
          context={{
            label: `${selected.symbols.join(" · ")} · ${selected.label}`,
            question: `Jelaskan jalur ${selected.label} untuk ${selected.symbols.join(", ")}.`,
            symbol: selected.symbols[0],
          }}
          label="Tanya jalur ini"
        />
        {selected.symbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => onFocusSymbol(symbol)}
            className="inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-full border border-border px-3 font-mono text-[11px] text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Lihat rantai {symbol}
          </button>
        ))}
      </div>
    </section>
  );
}
