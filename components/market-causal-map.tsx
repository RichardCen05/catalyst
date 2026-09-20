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
import { layoutMarketGraph, marketNodeSize } from "@/lib/agent/market-layout";
import { collapseSources, sourceGroupKey, symbolSubgraph } from "@/lib/agent/market-graph";
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
  IconClose,
  IconCompanies,
  IconDocument,
  IconExpand,
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
  onExpand: (key: string) => void;
};
type MapFlowNode = Node<MapNodeData, "market">;

function MarketNode({ data }: NodeProps<Node<MapNodeData, "market">>) {
  const node = data.causal;
  const company = node.kind === "company";
  const Icon = company ? IconCompanies : node.kind === "mechanism" ? IconGraph : sourceIcons[node.sourceType ?? "market"];
  const terminal = node.kind === "observation" || node.kind === "business-impact";
  const group = sourceGroupKey(node);
  const size = marketNodeSize(node.kind);

  if (company) {
    return (
      <div
        style={size}
        className={cn(
          "overflow-hidden rounded-xl border-2 border-primary bg-surface shadow-sm ring-4 ring-primary/12 transition-opacity",
          data.dimmed && "opacity-20",
        )}
      >
        <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-primary" />
        <button
          type="button"
          onClick={() => data.onSelect(node.id)}
          className="flex h-full w-full cursor-pointer flex-col justify-center rounded-[inherit] px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
        >
          <span className="flex items-center gap-2">
            <span className="grid size-5 shrink-0 place-items-center rounded bg-primary/12 text-primary">
              <Icon aria-hidden="true" className="size-3" />
            </span>
            <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Emiten</span>
          </span>
          <span className="mt-1 block font-mono text-base font-semibold leading-5 tracking-tight">{node.label}</span>
          <span className="block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Titik penghubung</span>
        </button>
        <Handle type="source" position={Position.Right} className="!size-2 !border-0 !bg-primary" />
      </div>
    );
  }

  return (
    <div
      style={size}
      className={cn(
        "overflow-hidden rounded-xl border bg-surface shadow-sm transition-opacity",
        node.kind === "source" ? "border-attention/45" : "border-border",
        data.hub && "border-attention ring-2 ring-attention/25",
        group && "border-dashed",
        data.dimmed && "opacity-20",
      )}
    >
      {node.kind !== "source" ? <Handle type="target" position={Position.Left} className="!size-2 !border-0 !bg-primary" /> : null}
      <button
        type="button"
        onClick={() => (group ? data.onExpand(group) : data.onSelect(node.id))}
        className="flex h-full w-full cursor-pointer flex-col rounded-[inherit] px-2.5 py-2 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"
      >
        <span className="flex items-center gap-1.5">
          <span className="grid size-5 shrink-0 place-items-center rounded bg-primary/10 text-primary">
            <Icon aria-hidden="true" className="size-3" />
          </span>
          <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{uiLabel(node.kind)}</span>
          {group ? (
            <span className="ml-auto inline-flex items-center gap-1 rounded-full border border-border bg-muted px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-muted-foreground">
              <IconExpand aria-hidden="true" className="size-2.5" />+{node.groupedSourceIds!.length - 1} sumber
            </span>
          ) : data.hub ? (
            <span className="ml-auto rounded-full border border-attention/50 bg-attention/12 px-1.5 py-0.5 font-mono text-[8px] uppercase tracking-wider text-attention-foreground">
              {node.symbols.length} emiten
            </span>
          ) : null}
        </span>
        <span className="mt-1 line-clamp-2 block text-[12px] font-semibold leading-[1.3]">{node.label}</span>
        <span className="mt-auto flex items-center gap-1.5 font-mono text-[9px] text-muted-foreground">
          <span className="truncate">{node.symbols.join(" · ")}</span>
          {node.relevance ? <span className="ml-auto shrink-0">{node.relevance}</span> : null}
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

/** Below this a card's headline stops being readable and the board is a
 *  diagram of grey slabs. The map holds this floor even when the whole board
 *  no longer fits, and pans instead. */
const MIN_READABLE_ZOOM = 0.5;

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
  // Edge labels appear only on the selected or hovered edge: with forty cards
  // on one canvas, a label on every edge covers the cards it describes.
  const [hoveredEdgeId, setHoveredEdgeId] = useState<string | null>(null);
  /** Channels whose recordings are drawn one by one rather than folded into a
   *  stand-in card. Empty by default — that is what makes the board fit. */
  const [expanded, setExpanded] = useState<ReadonlySet<string>>(() => new Set());
  const flowRef = useRef<ReactFlowInstance<MapFlowNode, Edge> | null>(null);
  const canvasRef = useRef<HTMLDivElement | null>(null);

  const view = useMemo(() => collapseSources(graph, expanded), [graph, expanded]);
  const layout = useMemo(() => layoutMarketGraph(view), [view]);
  const { positions } = layout;

  const selected = view.nodes.find((node) => node.id === selectedId) ?? null;
  const selectedEdge = view.edges.find((edge) => edge.id === selectedEdgeId) ?? null;

  /** One highlight rule, three inputs, in priority order: a picked edge, a
   *  picked node, then the focused issuer. Without it a click and a focus can
   *  each claim the canvas and the dimming contradicts itself. */
  const highlighted = useMemo(() => {
    if (selectedEdge) return connectedIds(view.edges, [selectedEdge.from, selectedEdge.to]);
    if (selectedId && view.nodes.some((node) => node.id === selectedId)) return connectedIds(view.edges, [selectedId]);
    if (focus) return symbolSubgraph(view, focus);
    return null;
  }, [view, selectedId, selectedEdge, focus]);

  /**
   * Show the whole board, never a slice of it.
   *
   * With the source column folded and wrapped the board is roughly as wide as
   * it is tall, so both axes fit and a reader never has to scroll to find out
   * what else is on it. The legibility floor is the one thing that outranks
   * fitting: on a phone, or with every channel expanded, the board wins and
   * the canvas pans rather than shrinking the cards past reading.
   */
  const fit = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas || layout.width <= 0 || canvas.clientWidth <= 0) return null;
    const zoom = Math.min(
      1.05,
      Math.max(MIN_READABLE_ZOOM, Math.min(canvas.clientWidth / layout.width, canvas.clientHeight / layout.height)),
    );
    return {
      zoom,
      x: Math.max(0, (canvas.clientWidth - layout.width * zoom) / 2),
      y: Math.max(0, (canvas.clientHeight - layout.height * zoom) / 2),
    };
  }, [layout.width, layout.height]);

  /**
   * Apply the framing on the next frame and without an animation.
   *
   * React Flow animates a viewport change with a d3 transition on the zoom
   * pane, and the re-render that follows the state change behind every caller
   * here re-binds that pane and drops the transition mid-flight — the board
   * would simply not move. One frame later the render has settled and an
   * instant set always lands.
   */
  const frameBoard = useCallback(() => {
    const flow = flowRef.current;
    const at = fit();
    if (!flow || !at) return false;
    requestAnimationFrame(() => flow.setViewport(at));
    return true;
  }, [fit]);

  /** Sideways panning is only useful once the board is wider than the canvas,
   *  which happens when the floor bites. Otherwise the wheel reads the board
   *  like a document. */
  const [freePan, setFreePan] = useState(false);

  // Re-frame whenever the board or the canvas changes shape: expanding a
  // channel widens the board, and the sidebar or the window can change the
  // canvas under it. `onInit` alone is not enough — it fires before the grid
  // has settled its column, so the canvas can still measure zero there.
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;
    const apply = () => {
      const at = fit();
      if (!at) return;
      setFreePan(layout.width * at.zoom > canvas.clientWidth + 1);
      frameBoard();
    };
    apply();
    if (typeof ResizeObserver === "undefined") return;
    const observer = new ResizeObserver(apply);
    observer.observe(canvas);
    return () => observer.disconnect();
  }, [fit, frameBoard, layout.width]);

  const closeInspector = useCallback(() => { setSelectedId(null); setSelectedEdgeId(null); }, []);

  const toggleExpand = useCallback((key: string) => {
    closeInspector();
    setExpanded((current) => {
      const next = new Set(current);
      if (!next.delete(key)) next.add(key);
      return next;
    });
  }, [closeInspector]);

  /** A drag ends with a click on the card that was under the pointer the
   *  whole time, so the browser fires it as an ordinary click. Without this
   *  guard every drag would also open that card's detail panel. */
  const draggedAt = useRef(0);
  const selectNode = useCallback((id: string) => {
    if (Date.now() - draggedAt.current < 200) return;
    setSelectedId(id);
    setSelectedEdgeId(null);
  }, []);

  const hubIds = useMemo(() => new Set(view.hubNodeIds), [view.hubNodeIds]);
  const sharedIds = useMemo(() => new Set(view.sharedSourceIds), [view.sharedSourceIds]);

  /**
   * Card positions live in React Flow's own state so they can be dragged.
   *
   * A laid-out board is a starting point, not a verdict: an analyst reading
   * one path wants to pull its cards clear of the others, and a layout that
   * snapped back on the next render would make that impossible. So the layout
   * seeds this state and the drag owns it from then on, until "Susun ulang"
   * puts every card back where the layout wants it.
   */
  const baseNodes = useMemo<MapFlowNode[]>(() => view.nodes.map((node) => ({
    id: node.id,
    type: "market" as const,
    position: positions.get(node.id) ?? { x: 0, y: 0 },
    ...marketNodeSize(node.kind),
    data: {
      causal: node,
      hub: hubIds.has(node.id),
      dimmed: false,
      onSelect: selectNode,
      onExpand: toggleExpand,
    },
    connectable: false,
    focusable: false,
    ariaLabel: `${uiLabel(node.kind)}: ${node.label} (${node.symbols.join(", ")})`,
  })), [view.nodes, positions, hubIds, selectNode, toggleExpand]);

  const [nodeState, setNodeState, onNodesChange] = useNodesState<MapFlowNode>(baseNodes);
  useEffect(() => { setNodeState(baseNodes); }, [baseNodes, setNodeState]);
  const resetLayout = useCallback(() => { setNodeState(baseNodes); frameBoard(); }, [baseNodes, setNodeState, frameBoard]);

  // Dimming is derived, never stored: writing it back into node state on every
  // hover would overwrite the positions a drag just produced.
  const nodes = useMemo(
    () => nodeState.map((node) => {
      const dimmed = highlighted ? !highlighted.has(node.id) : false;
      return node.data.dimmed === dimmed ? node : { ...node, data: { ...node.data, dimmed } };
    }),
    [nodeState, highlighted],
  );

  const edges = useMemo(() => view.edges.map((edge): Edge => {
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
      markerEnd: { type: MarkerType.ArrowClosed, color: stroke, width: 14, height: 14 },
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
      labelBgPadding: [6, 3] as [number, number],
      labelBgBorderRadius: 4,
      animated: active,
      zIndex: active ? 2 : shared ? 1 : 0,
    };
  }), [view.edges, highlighted, selectedEdgeId, hoveredEdgeId, hubIds, sharedIds]);

  const foldedCount = view.nodes.reduce((count, node) => count + Math.max(0, (node.groupedSourceIds?.length ?? 1) - 1), 0);

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
          Dipakai lebih dari satu emiten
        </span>
        <span>Kartu bisa digeser</span>
      </div>

      <div className="flex flex-wrap items-center gap-2 border-b border-border px-4 py-3" role="group" aria-label="Fokus emiten">
        <span className="mr-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Fokus</span>
        <button
          type="button"
          onClick={() => { setFocus(null); closeInspector(); }}
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
            run through, hubs included. The board itself does not move — all of
            it is on screen already. */}
        {view.symbols.map((symbol) => (
          <button
            key={symbol}
            type="button"
            onClick={() => { setFocus(symbol); closeInspector(); }}
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
        {expanded.size > 0 ? (
          <button
            type="button"
            onClick={() => { setExpanded(new Set()); closeInspector(); }}
            className="min-h-8 cursor-pointer rounded-full border border-primary/40 bg-primary/10 px-3 font-mono text-[11px] text-primary transition-colors hover:bg-primary/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
          >
            Ringkas sumber
          </button>
        ) : foldedCount > 0 ? (
          <span className="font-mono text-[10px] leading-4 text-muted-foreground">
            {foldedCount} sumber terlipat — klik kartu bergaris putus untuk membukanya
          </span>
        ) : null}
      </div>

      {view.skipped.length ? (
        <p className="border-b border-border bg-muted px-4 py-2 text-xs leading-5 text-muted-foreground">
          Tidak digambar: {view.skipped.map((item) => `${item.symbol} (${item.reason.toLowerCase().replace(/\.$/, "")})`).join("; ")}.
        </p>
      ) : null}
      {view.hiddenRelationshipCount > 0 ? (
        <p className="border-b border-border bg-muted px-4 py-2 text-xs text-muted-foreground">
          {view.hiddenRelationshipCount} hubungan di bawah ambang relevansi tidak digambar — turunkan ambang di atas.
        </p>
      ) : null}

      <div
        ref={canvasRef}
        className={cn("relative h-[min(76dvh,720px)] w-full transition-opacity", reloading && "opacity-50")}
        aria-label="Peta sebab akibat seluruh kasus"
      >
        <ReactFlow
          nodes={nodes}
          edges={edges}
          onNodesChange={onNodesChange}
          nodeTypes={nodeTypes}
          onInit={(instance) => { flowRef.current = instance as ReactFlowInstance<MapFlowNode, Edge>; frameBoard(); }}
          minZoom={0.08}
          maxZoom={1.5}
          nodesConnectable={false}
          onNodeDragStart={() => { draggedAt.current = Date.now(); }}
          onNodeDrag={() => { draggedAt.current = Date.now(); }}
          onNodeDragStop={() => { draggedAt.current = Date.now(); }}
          // The board is framed whole, so the wheel is only needed when the
          // legibility floor makes it wider than the canvas. Zooming on the
          // wheel instead would undo that framing on the first flick.
          zoomOnScroll={false}
          zoomOnDoubleClick={false}
          panOnScroll
          panOnScrollMode={freePan ? PanOnScrollMode.Free : PanOnScrollMode.Vertical}
          // No onNodeClick: the card's own button fills the node and already
          // handles both actions. Wiring it here as well fired the handler
          // twice for one click, which toggled a folded card open and shut
          // again in the same gesture.
          onEdgeClick={(_, edge) => { setSelectedEdgeId(edge.id); setSelectedId(null); }}
          onEdgeMouseEnter={(_, edge) => setHoveredEdgeId(edge.id)}
          onEdgeMouseLeave={() => setHoveredEdgeId(null)}
          onPaneClick={closeInspector}
        >
          <Background gap={20} size={1} color="var(--chart-grid)" />
          {/* A minimap of a board that is entirely on screen is a smaller
              copy of what the reader is already looking at. It appears only
              once the legibility floor pushes the board past the canvas. */}
          {freePan ? (
            <MiniMap
              pannable
              zoomable
              nodeColor={minimapColor}
              nodeStrokeWidth={3}
              maskColor="color-mix(in srgb, var(--background) 78%, transparent)"
              className="!bottom-3 !left-3 !m-0 !hidden !h-24 !w-36 overflow-hidden rounded-lg !border !border-border !bg-surface sm:!block"
            />
          ) : null}
          <Controls showInteractive={false} showFitView={false} position="top-left" />
        </ReactFlow>

        {/* The inspector is docked inside the canvas rather than stacked under
            it. Below the board it was a second scroll: you clicked a card at
            the top of the canvas and then had to leave the map to read what
            you had clicked. */}
        {selected || selectedEdge ? (
          <aside
            aria-label="Detail terpilih"
            aria-live="polite"
            className="absolute inset-y-0 right-0 z-10 flex w-[min(100%,360px)] flex-col border-l border-border bg-surface/98 shadow-2xl backdrop-blur"
          >
            <div className="flex items-center gap-2 border-b border-border px-4 py-2">
              <span className="font-mono text-[10px] uppercase tracking-wider text-primary">
                {selectedEdge ? "Hubungan" : uiLabel(selected!.kind)}
              </span>
              <button
                type="button"
                onClick={closeInspector}
                aria-label="Tutup detail"
                className="ml-auto grid size-7 cursor-pointer place-items-center rounded-md text-muted-foreground transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
              >
                <IconClose aria-hidden="true" className="size-4" />
              </button>
            </div>
            <div className="min-h-0 flex-1 overflow-y-auto p-4">
              {selectedEdge
                ? <EdgeDetail graph={view} edge={selectedEdge} />
                : <NodeDetail graph={view} selected={selected!} onExpand={toggleExpand} />}
            </div>
          </aside>
        ) : null}
      </div>

      <div className="flex flex-wrap items-center gap-x-3 gap-y-2 border-t border-border px-4 py-3">
        <span className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Buka kasus</span>
        {view.symbols.map((symbol) => (
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

function EdgeDetail({ graph, edge }: { graph: MarketCausalGraph; edge: MarketCausalGraph["edges"][number] }) {
  const from = graph.nodes.find((node) => node.id === edge.from)?.label;
  const to = graph.nodes.find((node) => node.id === edge.to)?.label;
  const span = edge.citations[0]?.span;
  const sourceEvent = span ? eventById.get(span.documentId) : undefined;

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{edge.symbol}</span>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(edge.confidence).toLowerCase()}</span>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Jeda {edge.lag}</span>
        <StatusBadge status={edge.direction} />
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-5">{from} → {to}</h3>
      <dl className="mt-3 grid gap-3 text-xs leading-5">
        <div><dt className="font-semibold">Eksposur</dt><dd className="mt-0.5 text-muted-foreground">{edge.exposure}</dd></div>
        <div><dt className="font-semibold">Indikator yang dicari</dt><dd className="mt-0.5 text-muted-foreground">{edge.expectedObservable}</dd></div>
        <div><dt className="font-semibold">Penjelasan lain</dt><dd className="mt-0.5 text-muted-foreground">{edge.alternativeExplanation}</dd></div>
        <div><dt className="font-semibold">Batal jika</dt><dd className="mt-0.5 text-muted-foreground">{edge.falsificationCondition}</dd></div>
        <div><dt className="font-semibold">Dasar keyakinan</dt><dd className="mt-0.5 text-muted-foreground">{edge.confidenceBasis}</dd></div>
        <div>
          <dt className="font-semibold">Dampak bisnis</dt>
          <dd className="mt-0.5 text-muted-foreground">
            {edge.businessImpactDimension ? <span className="font-mono text-primary">{uiLabel(edge.businessImpactDimension)}</span> : null}
            <span className="mt-0.5 block">{edge.businessImpactImplication}</span>
          </dd>
        </div>
      </dl>
      <div className="mt-4 flex flex-wrap gap-2">
        <CitationDialog citations={edge.citations} label="Bukti hubungan" />
        <AskAgentButton
          context={{
            label: `${edge.symbol} · hubungan`,
            question: `Jelaskan hubungan ${from} ke ${to} untuk ${edge.symbol}.`,
            symbol: edge.symbol,
          }}
          label="Uji lewat asisten"
        />
      </div>
      {span ? (
        <div className="mt-3">
          <p className="text-xs font-medium">{sourceEvent?.title ?? "Sumber terlapor"}</p>
          <SourceText span={span} body={sourceEvent?.body ?? null} />
        </div>
      ) : (
        <p className="mt-3 text-xs leading-5 text-muted-foreground">Klaim hubungan ini tidak tertaut ke kalimat sumber — perlakukan sebagai hipotesis, bukan kutipan.</p>
      )}
    </>
  );
}

function NodeDetail({
  graph,
  selected,
  onExpand,
}: {
  graph: MarketCausalGraph;
  selected: MarketCausalNode;
  onExpand: (key: string) => void;
}) {
  const coverage = selected.symbols.map((symbol) => graph.coverage[symbol]).filter(Boolean);
  const incomplete = selected.symbols.filter((symbol) => graph.coverage[symbol] && !graph.coverage[symbol].analyzed);
  const group = sourceGroupKey(selected);

  return (
    <>
      <div className="flex flex-wrap items-center gap-1.5">
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Keyakinan {uiLabel(selected.confidence).toLowerCase()}</span>
        <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">{selected.lag}</span>
        {selected.symbols.length > 1 ? (
          <span className="rounded border border-attention/50 bg-attention/10 px-1.5 py-0.5 font-mono text-[9px] text-attention-foreground">
            Dipakai {selected.symbols.length} emiten
          </span>
        ) : null}
      </div>
      <h3 className="mt-2 text-sm font-semibold leading-5">{selected.label}</h3>
      <p className="mt-1 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{uiLabel(selected.basis)}</p>
      <p className="mt-2 whitespace-pre-line text-xs leading-5 text-muted-foreground">{selected.detail}</p>

      {group ? (
        <button
          type="button"
          onClick={() => onExpand(group)}
          className="mt-3 inline-flex min-h-8 cursor-pointer items-center gap-1.5 rounded-full border border-primary/40 bg-primary/10 px-3 font-mono text-[11px] text-primary transition-colors hover:bg-primary/16 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <IconExpand aria-hidden="true" className="size-3" />
          Gambar {selected.groupedSourceIds!.length} sumber ini
        </button>
      ) : null}

      <dl className="mt-3 grid gap-3 text-xs leading-5">
        <div>
          <dt className="font-semibold">Bukti pendukung</dt>
          <dd className="mt-0.5 text-muted-foreground">
            {selected.basis === "Aggregation point" ? selected.detail : `Relevansi ${selected.relevance ?? "—"}/100 pada jalur ${selected.label}.`}
          </dd>
        </div>
        <div><dt className="font-semibold">Bukti penyangkal</dt><dd className="mt-0.5 text-muted-foreground">{selected.counterEvidence}</dd></div>
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
      </div>
    </>
  );
}
