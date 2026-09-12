"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { agentEngine } from "@/lib/agent/engine";
import { companies, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { CausalGraph, MarketEvent, SymbolCode } from "@/lib/types";
import { CausalChain } from "@/components/causal-chain";
import { CitationDialog } from "@/components/citation-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconBranch, IconEmpty, IconFilter, IconSliders, IconWatch } from "@/components/ui/icons";
import { cn, formatAsOf } from "@/lib/utils";

const sourceLabels: Record<MarketEvent["sourceType"] | "all", string> = {
  all: "Semua sumber",
  sectors: "Sectors news",
  filing: "Filing",
  macro: "Makro",
  commodity: "Komoditas",
  weather: "Cuaca",
  policy: "Kebijakan",
};

const selectClass = "h-11 w-full cursor-pointer appearance-none rounded-[6px] border border-border bg-surface pl-10 pr-3 text-[13px] outline-none transition-colors focus:border-foreground/40 focus:ring-2 focus:ring-ring/25";

function filterSource(graph: CausalGraph, sourceType: keyof typeof sourceLabels): CausalGraph {
  if (sourceType === "all") return graph;
  const sourceIds = new Set(graph.nodes.filter((node) => node.kind === "source" && node.sourceType === sourceType).map((node) => node.id));
  const mechanismIds = new Set(graph.edges.filter((edge) => sourceIds.has(edge.from)).map((edge) => edge.to));
  const keptIds = new Set(graph.nodes.filter((node) => node.kind === "company" || node.kind === "observation").map((node) => node.id));
  sourceIds.forEach((id) => keptIds.add(id));
  mechanismIds.forEach((id) => keptIds.add(id));
  return {
    ...graph,
    nodes: graph.nodes.filter((node) => keptIds.has(node.id)),
    edges: graph.edges.filter((edge) => keptIds.has(edge.from) && keptIds.has(edge.to)),
    hiddenRelationshipCount: graph.hiddenRelationshipCount + graph.nodes.filter((node) => node.kind === "source" && node.sourceType !== sourceType).length,
  };
}

function ImpactContent() {
  const searchParams = useSearchParams();
  const profile = useCatalystStore((state) => state.profile);
  const eventParam = events.find((event) => event.id === searchParams.get("event"));
  const companyParam = searchParams.get("company")?.toUpperCase() as SymbolCode | undefined;
  const requestedSymbol = companies.some((company) => company.symbol === companyParam && company.analyzed)
    ? companyParam
    : eventParam?.impactLinks.find((link) => profile.watchlist.includes(link.symbol))?.symbol;
  const [scope, setScope] = useState<"watchlist" | "market">("watchlist");
  const [symbol, setSymbol] = useState<SymbolCode>(requestedSymbol ?? profile.watchlist.find((item) => companies.some((company) => company.symbol === item && company.analyzed)) ?? "ANTM");
  const [minimum, setMinimum] = useState(70);
  const [sourceType, setSourceType] = useState<keyof typeof sourceLabels>("all");
  const availableCompanies = useMemo(() => companies.filter((company) => company.analyzed && (scope === "market" || profile.watchlist.includes(company.symbol))), [profile.watchlist, scope]);
  const activeSymbol = availableCompanies.some((company) => company.symbol === symbol) ? symbol : availableCompanies[0]?.symbol ?? symbol;
  const baseGraph = useMemo(() => agentEngine.buildCausalGraph(activeSymbol, profile, { scope, minRelevance: minimum }), [activeSymbol, minimum, profile, scope]);
  const graph = useMemo(() => baseGraph ? filterSource(baseGraph, sourceType) : null, [baseGraph, sourceType]);
  const relatedEvents = events.filter((event) => {
    const link = event.impactLinks.find((item) => item.symbol === activeSymbol);
    return link && link.relevance >= minimum && (sourceType === "all" || event.sourceType === sourceType);
  });

  return (
    <div className="mx-auto max-w-[1320px]">
      <PageHeader
        eyebrow="Causal impact explorer"
        title="Lacak sebab, mekanisme, dan bukti"
        description="Peta dimulai dari perusahaan lalu memperlihatkan sumber yang relevan: Sectors, filing, komoditas, makro, kebijakan, dan cuaca. Hubungan tanpa jalur eksplisit tidak ditambahkan."
        action={graph ? <CitationDialog citations={graph.nodes.flatMap((node) => node.citations)} label="Ledger seluruh chain" /> : null}
      />

      <div className="mb-6">
        <div className="grid gap-3 md:grid-cols-[1fr_1.2fr_1fr_auto]">
          <fieldset className="flex min-h-11 items-center gap-1 rounded-[6px] border border-border bg-surface p-1">
            <legend className="sr-only">Cakupan perusahaan</legend>
            {(["watchlist", "market"] as const).map((item) => (
              <button key={item} onClick={() => setScope(item)} aria-pressed={scope === item} className={cn("min-h-9 flex-1 cursor-pointer rounded-[4px] px-3 text-[12px] capitalize transition-colors duration-200 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", scope === item ? "bg-foreground font-medium text-background" : "text-muted-foreground hover:text-foreground")}>{item}</button>
            ))}
          </fieldset>
          <label className="relative">
            <span className="sr-only">Pilih emiten</span>
            <IconBranch className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select value={activeSymbol} onChange={(event) => setSymbol(event.target.value as SymbolCode)} className={selectClass}>
              {availableCompanies.map((company) => <option key={company.symbol} value={company.symbol}>{company.symbol} · {company.name}</option>)}
            </select>
          </label>
          <label className="relative">
            <span className="sr-only">Filter sumber</span>
            <IconFilter className="pointer-events-none absolute left-3.5 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
            <select value={sourceType} onChange={(event) => setSourceType(event.target.value as keyof typeof sourceLabels)} className={selectClass}>
              {(Object.keys(sourceLabels) as Array<keyof typeof sourceLabels>).map((item) => <option key={item} value={item}>{sourceLabels[item]}</option>)}
            </select>
          </label>
          <label className="flex min-h-11 items-center gap-2 rounded-[6px] border border-border bg-surface px-3.5 text-[12px] text-muted-foreground">
            <IconSliders className="size-4 shrink-0" />
            <span>Min.</span>
            <select value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} aria-label="Relevansi minimum" className="h-9 cursor-pointer bg-transparent font-mono text-foreground outline-none">
              <option value={80}>80</option>
              <option value={70}>70</option>
              <option value={60}>60</option>
              <option value={0}>Semua</option>
            </select>
          </label>
        </div>

        <div className="mt-3 flex flex-col gap-2 text-[12px] leading-[1.6] text-muted-foreground sm:flex-row sm:items-center sm:justify-between">
          <p className="flex items-start gap-2"><IconWatch className="mt-0.5 size-3.5 shrink-0" />Default menyembunyikan jalur ber-relevansi rendah agar chain tetap terbaca.</p>
          {graph?.hiddenRelationshipCount
            ? <button onClick={() => { setMinimum(0); setSourceType("all"); }} className="min-h-9 cursor-pointer self-start rounded-[6px] px-2 font-medium text-foreground underline decoration-border underline-offset-4 transition-colors hover:decoration-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tampilkan {graph.hiddenRelationshipCount} hubungan tersembunyi</button>
            : <span className="meta text-positive">Semua hubungan pada filter tampil</span>}
        </div>
      </div>

      {graph ? (
        <CausalChain key={`${activeSymbol}-${minimum}-${sourceType}`} graph={graph} />
      ) : (
        <Panel className="px-6 py-16 text-center">
          <IconEmpty className="mx-auto size-6 text-muted-foreground" />
          <h2 className="editorial mt-5 text-[21px]">Belum ada chain pada scope ini</h2>
          <p className="mt-2 text-[13px] text-muted-foreground">Pilih market atau emiten lain. Catalyst tidak membuat hubungan pengganti.</p>
        </Panel>
      )}

      <Reveal className="mt-6">
        <Panel>
          <PanelHeader eyebrow="Source queue" title={`Input yang terhubung ke ${activeSymbol}`} />
          {relatedEvents.length ? (
            <div className="cascade grid gap-px bg-border md:grid-cols-2">
              {relatedEvents.map((event) => {
                const link = event.impactLinks.find((item) => item.symbol === activeSymbol)!;
                return (
                  <article key={event.id} className="bg-surface px-5 py-5">
                    <div className="flex flex-wrap items-center gap-2">
                      <span className="meta text-muted-foreground">{event.sourceType}</span>
                      <StatusBadge status={link.direction} />
                      <span className="ml-auto font-mono text-[10px] tabular-nums text-muted-foreground">{link.relevance}/100</span>
                    </div>
                    <h3 className="mt-3 text-[13.5px] font-medium leading-[1.5]">{event.title}</h3>
                    <p className="mt-2.5 text-[12.5px] leading-[1.65] text-muted-foreground">{link.path}</p>
                    <div className="mt-4 flex items-center justify-between gap-3">
                      <span className="meta text-muted-foreground">{formatAsOf(event.publishedAt)} WIB</span>
                      <CitationDialog citations={event.citations} label="Buka sumber" />
                    </div>
                  </article>
                );
              })}
            </div>
          ) : (
            <p className="px-6 py-12 text-center text-[13px] text-muted-foreground">Tidak ada sumber pada filter ini.</p>
          )}
        </Panel>
      </Reveal>
    </div>
  );
}

export default function ImpactPage() {
  return <Suspense fallback={<Panel className="h-96 animate-pulse" aria-label="Memuat causal impact explorer" />}><ImpactContent /></Suspense>;
}
