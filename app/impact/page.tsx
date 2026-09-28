"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { agentEngine } from "@/lib/agent/engine";
import { companies, events, primarySymbol } from "@/lib/data/fixtures";
import { getSharedShocks } from "@/lib/agent/lag-validate";
import { shownDisposition } from "@/lib/case-disposition";
import { defaultImpactSymbol } from "@/lib/impact-symbol";
import { useCatalystStore } from "@/lib/store";
import type { CausalGraph, ResearchCase, SymbolCode } from "@/lib/types";
import { dispositionLabel } from "@/lib/ui-labels";
import { CausalChain } from "@/components/causal-chain";
import { CompetingHypotheses } from "@/components/competing-hypotheses";
import { PageHeader } from "@/components/page-header";
import { NextStep } from "@/components/next-step";
import { Panel } from "@/components/ui/panel";
import { TickerAvatar } from "@/components/ui/ticker-avatar";
import { IconArrowRight, IconBranch, IconCaretDown } from "@/components/ui/icons";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

function ImpactWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, playbook, caseResolutions, insights } = useCatalystStore();
  // Partially recorded symbols belong here too: they carry a price series and
  // linked sources, so the chain can be drawn as far as the recordings go. The
  // option label says which ones stop short of a business outcome.
  const available = companies.filter((company) => profile.watchlist.includes(company.symbol));
  const requested = (searchParams.get("company") ?? searchParams.get("case"))?.toUpperCase() as SymbolCode | undefined;
  // Default follows the registry — first watchlist emiten with a case — never a typed ticker.
  const symbol = defaultImpactSymbol(profile.watchlist, requested);
  const [analysis, setAnalysis] = useState<ResearchCase | null | undefined>(undefined);
  const [graph, setGraph] = useState<CausalGraph | null | undefined>(undefined);
  // Relevance floor for the chain: lower shows more of the graph (up to the
  // engine's visibility cap), higher thins it to the strongest paths.
  const [minRelevance, setMinRelevance] = useState<number>(DEFAULT_THRESHOLDS.chainRelevanceFloor);
  const [reloading, setReloading] = useState(false);
  const [emitenOpen, setEmitenOpen] = useState(false);
  const resolution = caseResolutions[symbol];
  const sharedShocks = getSharedShocks(events, profile.watchlist);
  const context = {
    mandate: undefined,
    playbook,
    userInsights: insights,
    resolution,
  };
  useEffect(() => {
    let cancelled = false;
    agentEngine.analyzeCompany(symbol, profile, context).then((result) => { if (!cancelled) setAnalysis(result); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, profile, playbook, insights, resolution]);
  useEffect(() => {
    let cancelled = false;
    // The previous graph stays visible while the new threshold loads, with a
    // badge saying so — otherwise the filter looks broken for a beat.
    // (reloading is set from the select handler, not here: setState inside
    // an effect would cascade renders.)
    agentEngine.buildCausalGraph(symbol, profile, { scope: "market", minRelevance, context }).then((result) => { if (!cancelled) { setGraph(result); setReloading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, profile, minRelevance, playbook, insights, resolution]);

  if (analysis === undefined || graph === undefined) {
    return (
      <div>
        <Panel className="h-72 shimmer" aria-label="Memuat peta sebab akibat" />
      </div>
    );
  }

  return (
    <div>
      <PageHeader
        title="Sebab akibat"
        description="Bandingkan penyebab yang mungkin, lalu telusuri jalurnya sampai indikator bisnis."
      />

      <div className="mb-4 flex flex-wrap items-center justify-between gap-3 rounded-lg border border-border bg-surface px-4 py-3">
        <div className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Emiten
          <div className="relative">
            <button
              type="button"
              onClick={() => setEmitenOpen((open) => !open)}
              onBlur={() => setEmitenOpen(false)}
              aria-haspopup="listbox"
              aria-expanded={emitenOpen}
              className="flex h-9 min-w-36 items-center gap-2 rounded-lg border border-border-strong bg-background px-3 text-sm font-medium text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
            >
              <TickerAvatar symbol={symbol} size="sm" />
              <span>{symbol}</span>
              <IconCaretDown aria-hidden="true" className="ml-auto size-3.5 text-muted-foreground" />
            </button>
            {emitenOpen ? <ul role="listbox" aria-label="Pilih emiten" className="absolute right-0 z-10 mt-1 max-h-56 w-44 overflow-y-auto rounded-lg border border-border bg-surface py-1 shadow-lg">
              {available.map((company) => <li key={company.symbol}>
                <button
                  type="button"
                  role="option"
                  aria-selected={company.symbol === symbol}
                  onMouseDown={(event) => event.preventDefault()}
                  onClick={() => { setEmitenOpen(false); router.push(`/impact?company=${company.symbol}`); }}
                  className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"
                >
                  <TickerAvatar symbol={company.symbol} size="sm" />
                  <span className="font-mono font-semibold text-primary">{company.symbol}</span>
                </button>
              </li>)}
            </ul> : null}
          </div>
        </div>
        {graph ? <>
          <p className="text-xs text-muted-foreground">{reloading ? "Memuat ulang rantai…" : graph.hiddenRelationshipCount > 0 ? `${graph.hiddenRelationshipCount} hubungan di bawah ambang.` : "Semua hubungan yang lolos ditampilkan."}</p>
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Ambang relevansi
            <select aria-label="Ambang relevansi rantai" value={minRelevance} onChange={(event) => { setReloading(true); setMinRelevance(Number(event.target.value)); }} className="h-9 rounded-lg border border-border bg-surface px-2 font-mono text-xs text-foreground outline-none focus:border-primary">
              <option value={40}>≥ 40 · lebar</option>
              <option value={60}>≥ 60 · standar</option>
              <option value={75}>≥ 75 · kuat</option>
              <option value={90}>≥ 90 · terkuat</option>
            </select>
          </label>
        </> : null}
      </div>

      {!graph ? <Panel className="p-8 text-center"><IconBranch aria-hidden="true" className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 font-semibold">Data belum cukup</h2><p className="mt-1 text-sm text-muted-foreground">Belum ada jalur sebab akibat yang dapat diuji untuk emiten ini.</p></Panel> : <div className="space-y-4">
        {sharedShocks.length > 1 ? <section aria-label="Guncangan bersama" className="rounded-lg border border-border bg-surface px-4 py-3"><p className="text-xs text-muted-foreground font-medium">Guncangan bersama pantauan</p><ul className="mt-2 space-y-1 text-xs leading-5 text-muted-foreground">{sharedShocks.slice(0, 4).map((event) => <li key={event.id}><strong className="text-foreground">{event.title}</strong> — {event.impactLinks.filter((link) => profile.watchlist.includes(link.symbol)).map((link) => link.symbol).join(" · ")}</li>)}</ul></section> : null}
        {analysis?.timing ? (() => {
          const check = analysis.timing;
          return check ? <p className="rounded-lg border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted-foreground"><span className="text-xs text-muted-foreground font-medium">Uji waktu · </span>{check.note} Puncak volume {check.spikeDate}.</p> : null;
        })() : null}
        <CompetingHypotheses graph={graph} />
        <CausalChain graph={graph} />

        {analysis ? <details className="group overflow-hidden rounded-lg border border-border bg-background">
          <summary data-tour-action={symbol === primarySymbol ? "show-next-action" : undefined} className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"><span>Lihat tindakan riset</span><span className="ml-auto text-sm font-medium text-muted-foreground">{dispositionLabel(shownDisposition(analysis.researchDisposition.kind, resolution))}</span><IconArrowRight aria-hidden="true" className="size-4 text-subtle-foreground transition-transform group-open:rotate-90" /></summary>
          <div className="grid gap-4 border-t border-border p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:p-5">
            <div><p className="text-xs text-muted-foreground font-medium">Tindakan untuk {symbol}</p><h2 className="editorial mt-1 text-xl">{dispositionLabel(shownDisposition(analysis.researchDisposition.kind, resolution))}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{analysis.researchDisposition.reason}</p></div>
            <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border sm:grid-cols-2"><div className="bg-surface p-3"><dt className="text-xs font-medium">Pantau</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{analysis.researchDisposition.monitorObservable}</dd></div><div className="bg-surface p-3"><dt className="text-xs font-medium">Buka kembali jika</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{analysis.researchDisposition.reopenWhen}</dd></div></dl>
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">Ini tindakan riset, bukan saran transaksi.</p><Link href={`/cases/${symbol}?tab=review#case-resolution`} className="inline-flex min-h-10 items-center gap-2 self-start rounded-lg border border-border px-3 text-sm font-medium text-primary hover:bg-muted">Catat hasil kasus<IconArrowRight aria-hidden="true" className="size-4" /></Link></div>
          </div>
        </details> : null}
      </div>}
      {analysis ? <NextStep title={`Kembali ke kasus ${symbol}`} description="Jalur sebab akibat sudah terbaca. Bawa temuannya ke langkah 3 Keputusan untuk menentukan tindakan riset." href={`/cases/${symbol}?tab=review`} action={`Buka Keputusan ${symbol}`} secondary={{ href: `/cases/${symbol}?tab=business`, label: "Langkah 2 Bisnis" }} /> : <NextStep title="Pilih kasus yang lengkap" description={`Rekaman ${symbol} belum cukup untuk membuka kasus. Kasus dengan bukti lengkap ada di Riset & Analisis.`} href="/cases" action="Buka Riset & Analisis" />}
    </div>
  );
}

export default function ImpactPage() {
  return <Suspense fallback={<Panel className="h-72 shimmer" aria-label="Memuat peta sebab akibat" />}><ImpactWorkspace /></Suspense>;
}