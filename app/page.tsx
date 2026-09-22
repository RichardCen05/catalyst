"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMarketGraph } from "@/lib/agent/market-graph";
import { companies, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { MarketCausalGraph, SymbolCode } from "@/lib/types";
import { cn, formatAsOf } from "@/lib/utils";
import { CitationDialog } from "@/components/citation-dialog";
import { DashboardTimeline } from "@/components/dashboard-timeline";
import { SymbolMultiselect } from "@/components/symbol-multiselect";
import { MarketCausalMap } from "@/components/market-causal-map";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { IconArrowRight, IconBranch, IconChart, IconClock, IconGraph } from "@/components/ui/icons";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import Link from "next/link";

type DashboardView = "node" | "chart";

const viewTabs: Array<{ value: DashboardView; label: string; Icon: typeof IconGraph }> = [
  { value: "node", label: "Peta Sebab Akibat", Icon: IconGraph },
  { value: "chart", label: "Grafik Indeks", Icon: IconChart },
];

export default function DashboardPage() {
  const { profile, playbook, insights, caseStatuses, caseResolutions } = useCatalystStore();
  // Relevance floor for the whole board: lower draws more of the recorded
  // links, higher thins it to the strongest paths. Same semantics as the
  // per-issuer chain so the two views can be compared.
  const [minRelevance, setMinRelevance] = useState<number>(DEFAULT_THRESHOLDS.chainRelevanceFloor);
  const [view, setView] = useState<DashboardView>("node");
  const [selected, setSelected] = useState<SymbolCode[]>([]);
  const [graph, setGraph] = useState<MarketCausalGraph | undefined>(undefined);
  const [reloading, setReloading] = useState(false);

  const openSymbols = useMemo(
    () => profile.watchlist.filter((symbol) => caseStatuses[symbol] !== "closed"),
    [profile.watchlist, caseStatuses],
  );
  const activeSymbols = useMemo(
    () => (selected.length ? openSymbols.filter((symbol) => selected.includes(symbol)) : openSymbols),
    [openSymbols, selected],
  );
  const symbolKey = activeSymbols.join(",");

  useEffect(() => {
    let cancelled = false;
    void buildMarketGraph(activeSymbols, profile, {
      minRelevance,
      context: (symbol: SymbolCode) => ({
        mandate: undefined,
        playbook,
        userInsights: insights,
        resolution: caseResolutions[symbol],
      }),
    }).then((result) => {
      if (cancelled) return;
      setGraph(result);
      setReloading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey, profile, minRelevance, playbook, insights, caseResolutions]);

  const [stalenessDays] = useState(() => Math.max(0, Math.round((Date.now() - new Date(DATA_AS_OF).getTime()) / 86_400_000)));

  const citations = useMemo(
    () => [
      ...events.filter((event) => event.impactLinks.some((link) => activeSymbols.includes(link.symbol))).flatMap((event) => event.citations),
      ...companies.flatMap((company) => company.citations),
    ],
    [activeSymbols],
  );

  const header = (
    <PageHeader
      eyebrow="Riset saham komoditas IDX"
      title="Dashboard Pantauan"
      description="Peta sebab akibat seluruh emiten, sumber berita, hipotesis mekanisme, hingga dampak bisnis."
    />
  );

  const modeSwitch = (
    <div role="tablist" aria-label="Mode tampilan papan" className="mb-4 inline-flex gap-1 rounded-[8px] border border-border bg-surface p-1">
      {viewTabs.map((tab) => {
        const active = view === tab.value;
        return (
          <button
            key={tab.value}
            type="button"
            role="tab"
            aria-selected={active}
            onClick={() => setView(tab.value)}
            className={cn(
              "inline-flex min-h-9 items-center gap-2 rounded-[6px] px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "bg-primary/10 text-primary" : "text-muted-foreground hover:bg-muted hover:text-foreground",
            )}
          >
            <tab.Icon aria-hidden="true" className="size-4" />{tab.label}
          </button>
        );
      })}
    </div>
  );

  const picker = openSymbols.length
    ? <SymbolMultiselect options={openSymbols} selected={selected} onChange={setSelected} label="Emiten" />
    : null;

  if (view === "chart") {
    return (
      <div>
        {header}
        {modeSwitch}
        {picker}
        <DashboardTimeline symbols={activeSymbols} />
      </div>
    );
  }

  if (graph === undefined) {
    return (
      <div>
        {header}
        {modeSwitch}
        {picker}
        <Panel className="h-[560px] animate-pulse bg-muted" aria-label="Memuat peta sebab akibat" />
      </div>
    );
  }

  return (
    <div>
      {header}
      {modeSwitch}
      {picker}

      {/* ALUR ANALISIS bar with Sumber button trailing */}
      <div className="mb-3 flex flex-wrap items-center gap-x-3 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs">
        <span className="font-mono uppercase tracking-wider text-muted-foreground">Alur Analisis:</span>
        <span className="text-muted-foreground">Sumber → Mekanisme → Emiten → Dampak Bisnis</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <IconClock aria-hidden="true" className="size-3" />{formatAsOf(DATA_AS_OF)} WIB
        </span>
        <CitationDialog citations={citations} label="Sumber" />
      </div>

      <p className="mb-4 text-xs text-muted-foreground">(Klik kartu atau garis hubung untuk penjelasan lebih lanjut dan bukti)</p>

      {graph.symbols.length === 0 ? (
        <Panel className="p-8 text-center">
          <IconBranch aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Belum ada kasus terbuka</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tambahkan emiten ke daftar pantauan, atau buka kembali kasus yang sudah ditutup.</p>
          <Link href="/cases" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[6px] border border-border px-3 text-sm font-medium text-primary hover:bg-muted">
            Semua kasus<IconArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Panel>
      ) : (
        <MarketCausalMap
          key={`${symbolKey}:${minRelevance}`}
          graph={graph}
          reloading={reloading}
          toolbar={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="meta text-muted-foreground">Peta sebab akibat</p>
                <h2 className="editorial text-[17px] text-foreground">Semua kasus dalam satu jalur</h2>
              </div>
              <label className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
                Ambang relevansi
                <select
                  aria-label="Ambang relevansi peta"
                  value={minRelevance}
                  onChange={(event) => { setReloading(true); setMinRelevance(Number(event.target.value)); }}
                  className="h-9 rounded-[6px] border border-border bg-surface px-2 font-mono text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                >
                  <option value={40}>≥ 40 · lebar</option>
                  <option value={60}>≥ 60 · standar</option>
                  <option value={75}>≥ 75 · kuat</option>
                  <option value={90}>≥ 90 · terkuat</option>
                </select>
              </label>
              <Link href="/impact" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">
                Uji satu emiten<IconArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          }
        />
      )}
    </div>
  );
}