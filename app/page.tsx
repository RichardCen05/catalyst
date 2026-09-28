"use client";

import { useEffect, useMemo, useState } from "react";
import { buildMarketGraph } from "@/lib/agent/market-graph";
import { companies, events, primarySymbol } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { MarketCausalGraph, SymbolCode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { CitationDialog } from "@/components/citation-dialog";
import { DashboardTimeline } from "@/components/dashboard-timeline";
import { SymbolMultiselect } from "@/components/symbol-multiselect";
import { MarketCausalMap } from "@/components/market-causal-map";
import { PageHeader } from "@/components/page-header";
import { NextStep } from "@/components/next-step";
import { Panel } from "@/components/ui/panel";
import { IconArrowRight, IconBranch, IconChart, IconGraph } from "@/components/ui/icons";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import Link from "next/link";

type DashboardView = "node" | "chart";

const viewTabs: Array<{ value: DashboardView; label: string; Icon: typeof IconGraph }> = [
  { value: "node", label: "Peta sebab akibat", Icon: IconGraph },
  { value: "chart", label: "Grafik indeks", Icon: IconChart },
];

export default function DashboardPage() {
  const { profile, playbook, insights, caseStatuses, caseResolutions, tourOpen } = useCatalystStore();
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
        resolution: (caseResolutions ?? {})[symbol],
      }),
    }).then((result) => {
      if (cancelled) return;
      setGraph(result);
      setReloading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey, profile, minRelevance, playbook, insights, caseResolutions]);


  const citations = useMemo(
    () => [
      ...events.filter((event) => event.impactLinks.some((link) => activeSymbols.includes(link.symbol))).flatMap((event) => event.citations),
      ...companies.flatMap((company) => company.citations),
    ],
    [activeSymbols],
  );

  const modeSwitch = (
    <div role="tablist" aria-label="Mode tampilan papan" className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
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
              "inline-flex min-h-9 items-center gap-2 rounded-md border px-3 text-sm font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
              active ? "border-border bg-background text-foreground" : "border-transparent text-muted-foreground hover:text-foreground",
            )}
          >
            <tab.Icon aria-hidden="true" className="size-4" />{tab.label}
          </button>
        );
      })}
    </div>
  );

  const openCases = openSymbols.filter((symbol) => companies.some((company) => company.symbol === symbol && company.analyzed));
  // The guided tour's first step opens the registry's primary case from here, so it leads when
  // open — and during the tour even when the reader closed it or left it off the watchlist.
  const firstCase = tourOpen || openCases.includes(primarySymbol) ? primarySymbol : openCases[0];
  const header = (
    <>
      <PageHeader
        title="Dashboard"
        description="Peta sebab akibat semua emiten pantauan: sumber, mekanisme, emiten, sampai dampak bisnis."
        action={modeSwitch}
      />
      {openCases.length ? <NextStep className="mb-6 mt-0" title={`${openCases.length} kasus menunggu pemeriksaan`} description={`Peta ini menunjukkan apa yang terhubung. Untuk memeriksa satu perubahan sampai ke keputusan, buka kasusnya: ${openCases.join(", ")}.`} href="/cases" action="Buka Riset & Analisis" secondary={firstCase ? { href: `/cases/${firstCase}`, label: `Buka ${firstCase}`, tourAction: firstCase === primarySymbol ? "open-case" : undefined } : undefined} /> : null}
    </>
  );

  const picker = openSymbols.length
    ? <SymbolMultiselect options={openSymbols} selected={selected} onChange={setSelected} label="Emiten" />
    : null;

  if (view === "chart") {
    return (
      <div>
        {header}
        <div className="mb-4">{picker}</div>
        <DashboardTimeline symbols={activeSymbols} />
      </div>
    );
  }

  if (graph === undefined) {
    return (
      <div>
        {header}
        <div className="mb-4">{picker}</div>
        <div className="shimmer h-[560px] rounded-lg" role="status" aria-label="Memuat peta sebab akibat" />
      </div>
    );
  }

  return (
    <div>
      {header}

      <div className="mb-3 flex flex-wrap items-center justify-between gap-3">
        {picker}
        <div className="flex flex-wrap items-center gap-2">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">
            Relevansi
            <select
              aria-label="Ambang relevansi peta"
              value={minRelevance}
              onChange={(event) => { setReloading(true); setMinRelevance(Number(event.target.value)); }}
              className="h-9 rounded-lg border border-border-strong bg-background px-2 text-sm font-medium text-foreground outline-none focus:ring-2 focus:ring-ring/25"
            >
              <option value={40}>≥ 40 · lebar</option>
              <option value={60}>≥ 60 · standar</option>
              <option value={75}>≥ 75 · kuat</option>
              <option value={90}>≥ 90 · terkuat</option>
            </select>
          </label>
          <CitationDialog citations={citations} label="Sumber" />
        </div>
      </div>
      <p className="mb-4 text-xs text-subtle-foreground">Sumber → Mekanisme → Emiten → Dampak bisnis. Pilih kartu atau garis untuk melihat penjelasan dan buktinya.</p>

      {graph.symbols.length === 0 ? (
        <Panel className="p-8 text-center">
          <IconBranch aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Belum ada kasus terbuka</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tambahkan emiten ke daftar pantauan, atau buka kembali kasus yang sudah ditutup.</p>
          <Link href="/cases" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-lg border border-border-strong px-3 text-sm font-medium hover:bg-muted">
            Buka Riset &amp; Analisis<IconArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Panel>
      ) : (
        <MarketCausalMap
          key={`${symbolKey}:${minRelevance}`}
          graph={graph}
          reloading={reloading}
        />
      )}
    </div>
  );
}