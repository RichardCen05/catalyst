"use client";

import { Suspense, useMemo, useState } from "react";
import { useSearchParams } from "next/navigation";
import { Eye, Filter, GitBranch, SearchX, SlidersHorizontal } from "lucide-react";
import { agentEngine } from "@/lib/agent/engine";
import { companies, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { CausalGraph, MarketEvent, SymbolCode } from "@/lib/types";
import { CausalChain } from "@/components/causal-chain";
import { CitationDialog } from "@/components/citation-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
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
  const companyParam = (searchParams.get("case") ?? searchParams.get("company"))?.toUpperCase() as SymbolCode | undefined;
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
    <div>
      <PageHeader eyebrow="Causal impact explorer" title="Lacak sebab, mekanisme, dan bukti" description="Tiga jalur terkuat tampil lebih dulu. Label membedakan input terlapor, hipotesis kausal, dan korelasi observasi." action={graph ? <CitationDialog citations={graph.nodes.flatMap((node) => node.citations)} label="Ledger seluruh chain" /> : null} />

      <Panel className="mb-4 p-3">
        <div className="grid gap-3 md:grid-cols-[1fr_1fr_1fr_auto]">
          <fieldset className="flex min-h-11 items-center gap-1 rounded-lg border border-border bg-background p-1"><legend className="sr-only">Cakupan perusahaan</legend>{(["watchlist", "market"] as const).map((item) => <button key={item} onClick={() => setScope(item)} aria-pressed={scope === item} className={cn("min-h-9 flex-1 cursor-pointer rounded-md px-3 text-xs font-medium capitalize transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", scope === item ? "bg-primary text-primary-foreground" : "text-muted-foreground hover:bg-muted")}>{item}</button>)}</fieldset>
          <label className="relative"><span className="sr-only">Pilih emiten</span><GitBranch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><select value={activeSymbol} onChange={(event) => setSymbol(event.target.value as SymbolCode)} className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">{availableCompanies.map((company) => <option key={company.symbol} value={company.symbol}>{company.symbol} · {company.name}</option>)}</select></label>
          <label className="relative"><span className="sr-only">Filter sumber</span><Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><select value={sourceType} onChange={(event) => setSourceType(event.target.value as keyof typeof sourceLabels)} className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">{(Object.keys(sourceLabels) as Array<keyof typeof sourceLabels>).map((item) => <option key={item} value={item}>{sourceLabels[item]}</option>)}</select></label>
          <label className="flex min-h-11 items-center gap-2 rounded-lg border border-border bg-background px-3 text-xs text-muted-foreground"><SlidersHorizontal aria-hidden="true" className="size-4" /><span>Min.</span><select value={minimum} onChange={(event) => setMinimum(Number(event.target.value))} aria-label="Relevansi minimum" className="h-9 cursor-pointer bg-transparent font-mono text-foreground outline-none"><option value={80}>80</option><option value={70}>70</option><option value={60}>60</option><option value={0}>Semua</option></select></label>
        </div>
        <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground sm:flex-row sm:items-center sm:justify-between"><p><Eye aria-hidden="true" className="mr-1.5 inline size-3.5 text-primary" />Default membatasi tiga jalur agar chain tetap terbaca.</p>{graph?.hiddenRelationshipCount ? <button onClick={() => { setMinimum(0); setSourceType("all"); }} className="min-h-9 cursor-pointer self-start rounded-md px-2 font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Longgarkan filter · {graph.hiddenRelationshipCount} jalur tersisa</button> : <span className="font-mono text-[10px] text-positive">Semua jalur pada filter tampil</span>}</div>
      </Panel>

      {graph ? <CausalChain key={`${activeSymbol}-${minimum}-${sourceType}`} graph={graph} /> : <Panel className="p-10 text-center"><SearchX aria-hidden="true" className="mx-auto size-7 text-muted-foreground" /><h2 className="mt-3 font-semibold">Belum ada chain pada scope ini</h2><p className="mt-1 text-sm text-muted-foreground">Pilih market atau emiten lain. Catalyst tidak membuat hubungan pengganti.</p></Panel>}

      <details className="mt-4 rounded-xl border border-border bg-surface shadow-panel"><summary className="flex min-h-14 cursor-pointer items-center px-4 text-sm font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">Daftar input terhubung · {relatedEvents.length}</summary>{relatedEvents.length ? <div className="grid gap-3 border-t border-border p-4 md:grid-cols-2">{relatedEvents.map((event) => { const link = event.impactLinks.find((item) => item.symbol === activeSymbol)!; return <article key={event.id} className="rounded-lg border border-border bg-background p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">{event.sourceType}</span><StatusBadge status={link.direction} /><span className="ml-auto font-mono text-[9px] text-muted-foreground">{link.relevance}/100</span></div><h3 className="mt-2 text-sm font-semibold leading-5">{event.title}</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{link.path}</p><div className="mt-3 flex items-center justify-between gap-2"><span className="font-mono text-[9px] text-muted-foreground">{formatAsOf(event.publishedAt)} WIB</span><CitationDialog citations={event.citations} label="Buka sumber" /></div></article>; })}</div> : <div className="border-t border-border p-6 text-center text-sm text-muted-foreground">Tidak ada sumber pada filter ini.</div>}</details>
    </div>
  );
}

export default function ImpactPage() {
  return <Suspense fallback={<Panel className="h-96 animate-pulse bg-muted" aria-label="Memuat causal impact explorer" />}><ImpactContent /></Suspense>;
}
