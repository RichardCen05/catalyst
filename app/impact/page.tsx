"use client";

import Link from "next/link";
import { Suspense, useEffect, useState } from "react";
import { useRouter, useSearchParams } from "next/navigation";
import { agentEngine } from "@/lib/agent/engine";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { CausalGraph, ResearchCase, SymbolCode } from "@/lib/types";
import { dispositionLabel } from "@/lib/ui-labels";
import { CausalChain } from "@/components/causal-chain";
import { CompetingHypotheses } from "@/components/competing-hypotheses";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { IconArrowRight, IconAttention, IconBranch } from "@/components/ui/icons";

function ImpactWorkspace() {
  const router = useRouter();
  const searchParams = useSearchParams();
  const { profile, playbook, caseMandates, caseClarifications, caseResolutions, insights, setCaseClarification } = useCatalystStore();
  const available = companies.filter((company) => company.analyzed && profile.watchlist.includes(company.symbol));
  const requested = (searchParams.get("company") ?? searchParams.get("case"))?.toUpperCase() as SymbolCode | undefined;
  const symbol = available.some((company) => company.symbol === requested) ? requested! : available[0]?.symbol ?? "ANTM";
  const context = {
    mandate: caseMandates[symbol],
    clarificationChoice: caseClarifications[symbol],
    playbook,
    userInsights: insights,
    resolution: caseResolutions[symbol],
  };
  const [analysis, setAnalysis] = useState<ResearchCase | null | undefined>(undefined);
  const [graph, setGraph] = useState<CausalGraph | null | undefined>(undefined);
  // Relevance floor for the chain: lower shows more of the graph (up to the
  // engine's visibility cap), higher thins it to the strongest paths.
  // Relevance floor for the chain: lower shows more of the graph (up to the
  // engine's visibility cap), higher thins it to the strongest paths.
  const [minRelevance, setMinRelevance] = useState(60);
  const [reloading, setReloading] = useState(false);
  const refresh = () => {
    setReloading(true);
    const fresh = {
      mandate: caseMandates[symbol],
      clarificationChoice: useCatalystStore.getState().caseClarifications[symbol],
      playbook: useCatalystStore.getState().playbook,
      userInsights: useCatalystStore.getState().insights,
      resolution: caseResolutions[symbol],
    };
    agentEngine.analyzeCompany(symbol, useCatalystStore.getState().profile, fresh).then((result) => { setAnalysis(result); });
    agentEngine.buildCausalGraph(symbol, useCatalystStore.getState().profile, { scope: "market", minRelevance, context: fresh }).then((result) => { setGraph(result); setReloading(false); });
  };
  useEffect(() => {
    let cancelled = false;
    agentEngine.analyzeCompany(symbol, profile, context).then((result) => { if (!cancelled) setAnalysis(result); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);
  useEffect(() => {
    let cancelled = false;
    // The previous graph stays visible while the new threshold loads, with a
    // badge saying so — otherwise the filter looks broken for a beat.
    // (reloading is set from the select handler, not here: setState inside
    // an effect would cascade renders.)
    agentEngine.buildCausalGraph(symbol, profile, { scope: "market", minRelevance, context }).then((result) => { if (!cancelled) { setGraph(result); setReloading(false); } });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, minRelevance]);

  if (analysis === undefined || graph === undefined) {
    return (
      <div className="mx-auto max-w-[1240px]">
        <Panel className="h-72 animate-pulse bg-muted" aria-label="Memuat peta sebab akibat" />
      </div>
    );
  }

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        eyebrow="Ruang uji sebab akibat"
        title="Apa yang mendorong perubahan ini?"
        description="Bandingkan beberapa penyebab, lacak jalurnya ke emiten, lalu tentukan tindakan riset."
        action={<label className="block text-xs font-medium text-muted-foreground">Emiten<select aria-label="Pilih emiten" value={symbol} onChange={(event) => router.push(`/impact?company=${event.target.value}`)} className="mt-1 block h-10 min-w-36 rounded-[6px] border border-border bg-surface px-3 font-mono text-sm text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">{available.map((company) => <option key={company.symbol} value={company.symbol}>{company.symbol}</option>)}</select></label>}
      />

      {!analysis || !graph ? <Panel className="p-8 text-center"><IconBranch aria-hidden="true" className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 font-semibold">Data belum cukup</h2><p className="mt-1 text-sm text-muted-foreground">Belum ada jalur sebab akibat yang dapat diuji untuk emiten ini.</p></Panel> : analysis.clarification.required ? <Panel className="p-5 sm:p-6"><IconAttention aria-hidden="true" className="size-5 text-attention" /><h2 className="mt-3 text-lg font-semibold">Tentukan fokus kasus di sini</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">{analysis.clarification.reason}</p><div className="mt-4 grid gap-2 md:grid-cols-2">{analysis.clarification.options.map((option) => <button key={option.id} type="button" onClick={() => { setCaseClarification(symbol, option.id); refresh(); }} className="cursor-pointer rounded-[8px] border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><strong className="block text-sm leading-5">{option.question}</strong><span className="mt-2 block text-xs leading-5 text-muted-foreground">Sumber: {option.sourceConsequence}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Indikator: {option.observable}</span></button>)}</div><Link href={`/cases/${symbol}#clarification-gate`} className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[6px] px-3 text-sm font-medium text-primary hover:bg-primary/10">Atau buka kasus {symbol}<IconArrowRight aria-hidden="true" className="size-4" /></Link></Panel> : <div className="space-y-4">
        <div className="flex flex-wrap items-center gap-3 rounded-[12px] border border-border bg-surface px-4 py-3">
          <label className="flex items-center gap-2 text-xs font-medium text-muted-foreground">Ambang relevansi
            <select aria-label="Ambang relevansi rantai" value={minRelevance} onChange={(event) => { setReloading(true); setMinRelevance(Number(event.target.value)); }} className="h-9 rounded-[6px] border border-border bg-surface px-2 font-mono text-xs text-foreground outline-none focus:border-primary">
              <option value={40}>≥ 40 · lebar</option>
              <option value={60}>≥ 60 · standar</option>
              <option value={75}>≥ 75 · kuat</option>
              <option value={90}>≥ 90 · terkuat</option>
            </select>
          </label>
          <p className="text-xs text-muted-foreground">{reloading ? "Memuat ulang rantai…" : graph.hiddenRelationshipCount > 0 ? `${graph.hiddenRelationshipCount} hubungan di bawah ambang.` : "Semua hubungan yang lolos ditampilkan."}</p>
        </div>
        <CompetingHypotheses graph={graph} />
        <CausalChain graph={graph} />

        <details className="group overflow-hidden rounded-[12px] border border-primary/35 bg-primary/7">
          <summary data-tour-action={symbol === "ANTM" ? "show-next-action" : undefined} className="flex min-h-14 cursor-pointer list-none items-center gap-3 px-4 py-3 font-semibold focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"><span className="grid size-8 place-items-center rounded-[6px] bg-brand text-white"><IconArrowRight aria-hidden="true" className="size-4" /></span><span>Lihat tindakan riset</span><span className="ml-auto font-mono text-[10px] text-primary">{dispositionLabel(analysis.researchDisposition.kind)}</span></summary>
          <div className="grid gap-4 border-t border-primary/25 p-4 sm:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)] sm:p-5">
            <div><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Tindakan untuk {symbol}</p><h2 className="editorial mt-1 text-2xl">{dispositionLabel(analysis.researchDisposition.kind)}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{analysis.researchDisposition.reason}</p></div>
            <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2"><div className="bg-surface p-3"><dt className="text-xs font-medium">Pantau</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{analysis.researchDisposition.monitorObservable}</dd></div><div className="bg-surface p-3"><dt className="text-xs font-medium">Buka kembali jika</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{analysis.researchDisposition.reopenWhen}</dd></div></dl>
            <div className="flex flex-col gap-3 border-t border-border pt-4 sm:col-span-2 sm:flex-row sm:items-center sm:justify-between"><p className="text-xs leading-5 text-muted-foreground">Ini tindakan riset, bukan saran transaksi.</p><Link href={`/cases/${symbol}?tab=review#case-resolution`} className="inline-flex min-h-10 items-center gap-2 self-start rounded-[6px] border border-border px-3 text-sm font-medium text-primary hover:bg-muted">Catat hasil kasus<IconArrowRight aria-hidden="true" className="size-4" /></Link></div>
          </div>
        </details>
      </div>}
    </div>
  );
}

export default function ImpactPage() {
  return <Suspense fallback={<Panel className="mx-auto h-72 max-w-[1240px] animate-pulse bg-muted" aria-label="Memuat peta sebab akibat" />}><ImpactWorkspace /></Suspense>;
}
