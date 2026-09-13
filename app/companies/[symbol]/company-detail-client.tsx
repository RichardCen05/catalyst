"use client";

import Link from "next/link";
import { Suspense, useState, useEffect } from "react";
import { agentEngine } from "@/lib/agent/engine";
import { companies, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { formatAsOf, formatCurrency } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";
import { AnalysisAudit } from "@/components/analysis-audit";
import { AnalysisReview } from "@/components/analysis-review";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceCard } from "@/components/evidence-card";
import { PriceChart } from "@/components/price-chart";
import { ResearchCaseOverview } from "@/components/research-case-overview";
import { ResearchCaseWorkspace } from "@/components/research-case-workspace";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconArrowLeft, IconAttention, IconBranch, IconCaretDown, IconCaretRight, IconClock, IconCopilot, IconTable, IconUnknown } from "@/components/ui/icons";

export function CompanyDetailClient({ symbol, workspaceTabs = false }: { symbol: SymbolCode; workspaceTabs?: boolean }) {
  const { profile, playbook, caseMandates, caseClarifications, caseResolutions, insights, openCopilot } = useCatalystStore();
  const company = companies.find((item) => item.symbol === symbol)!;
  const [analysis, setAnalysis] = useState<ResearchCase | null | undefined>(undefined);
  useEffect(() => {
    let cancelled = false;
    agentEngine.analyzeCompany(symbol, profile, {
      mandate: caseMandates[symbol],
      clarificationChoice: caseClarifications[symbol],
      playbook,
      userInsights: insights,
      resolution: caseResolutions[symbol],
    }).then((result) => { if (!cancelled) setAnalysis(result); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol]);
  const relatedEvents = events.filter((event) => event.impactLinks.some((link) => link.symbol === symbol));

  if (analysis === undefined) return (
    <div>
      <Panel className="h-72 animate-pulse bg-muted" aria-label="Memuat kasus" />
    </div>
  );

  if (!analysis) return (
    <div>
      <Link href="/cases" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconArrowLeft aria-hidden="true" className="size-4" />Kembali ke Kasus</Link>
      <Panel className="overflow-hidden"><div className="border-b border-border p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-primary">IDX · {uiLabel(company.sector)}</p><h1 className="mt-2 text-2xl font-semibold">{company.symbol} <span className="text-muted-foreground">{company.name}</span></h1></div><StatusBadge status="Insufficient Evidence" /></div></div><div className="p-8 text-center sm:p-14"><IconUnknown aria-hidden="true" className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Analisis belum tersedia</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Data perusahaan ada, tetapi data broker, arus asing, saham publik, dan pembanding harian belum lengkap. Catalyst tidak membuat angka pengganti.</p><div className="mt-6 flex justify-center"><CitationDialog citations={company.citations} label="Periksa data" /></div></div></Panel>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Link href="/cases" className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconArrowLeft aria-hidden="true" className="size-4" />Kasus</Link><div className="flex w-full max-w-full flex-wrap gap-2 sm:w-auto"><Link href={analysis.clarification.required ? `/cases/${symbol}#clarification-gate` : `/impact?company=${symbol}`} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-[6px] border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconBranch aria-hidden="true" className="size-3.5" />{analysis.clarification.required ? "Tentukan fokus" : "Sebab akibat"}</Link><CitationDialog citations={analysis.sources} label={workspaceTabs ? "Sumber" : "Periksa sumber"} /><Button variant="secondary" size="sm" onClick={() => openCopilot({ label: `Kasus · ${symbol}`, question: `Lanjutkan pemeriksaan perubahan ${symbol} dari pertanyaan riset dan hal yang belum terjawab.`, symbol })}><IconCopilot aria-hidden="true" className="size-3.5" />{workspaceTabs ? "Asisten" : "Lanjutkan di asisten"}</Button></div></div>

      <header className="mb-6 border-b border-border pb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-start sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-center gap-2 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><span className="text-primary">IDX:{company.symbol}</span><span>{uiLabel(company.sector)}</span><span aria-hidden="true">/</span><span>{uiLabel(company.subsector)}</span></div><h1 className="editorial mt-3 text-[30px] sm:text-[38px]">Kasus {company.symbol}</h1><p className="mt-1 text-sm text-muted-foreground">{company.name}</p><p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><IconClock aria-hidden="true" className="size-3" />Data per {formatAsOf(analysis.asOf)} WIB</p></div>
          <div className="shrink-0 sm:text-right"><p className="font-mono text-2xl font-semibold tabular-nums">{formatCurrency(company.price).replace("Rp", "Rp ")}</p><p className={`mt-1 font-mono text-sm ${company.changePct >= 0 ? "text-positive" : "text-danger"}`}>{company.changePct >= 0 ? "+" : ""}{company.changePct.toFixed(1)}% · simulasi</p><div className="mt-2"><StatusBadge status={analysis.evidenceState} /></div></div>
        </div>
        <p className="mt-5 max-w-3xl text-sm leading-6 text-foreground">{analysis.thesis}</p>
      </header>

      {workspaceTabs ? <ResearchCaseWorkspace analysis={analysis} symbol={symbol} relatedEvents={relatedEvents} /> : <>
      <ResearchCaseOverview researchCase={analysis} symbol={symbol} />

      <PriceChart data={analysis.priceSeries} symbol={symbol} events={relatedEvents} />

      <section aria-labelledby="pillars-title" className="mt-4"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Uji hipotesis</p><h2 id="pillars-title" className="mt-1 text-lg font-semibold">Empat pemeriksaan</h2></div><Link href="/playbook" className="inline-flex min-h-9 items-center gap-1 text-xs text-primary">Buka aturan riset<IconCaretRight aria-hidden="true" className="size-3.5" /></Link></div><div className="grid gap-3 md:grid-cols-2">{analysis.pillars.map((pillar) => <EvidenceCard key={pillar.key} pillar={pillar} symbol={symbol} />)}</div></section>

      <Panel className="mt-4">
        <details className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><IconTable aria-hidden="true" className="size-4.5" /></span><div className="min-w-0 flex-1"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Data keuangan · simulasi Sectors</p><h2 className="mt-0.5 text-sm font-semibold">Data laporan keuangan yang dipakai untuk menguji jalur</h2></div><span className="hidden text-xs text-muted-foreground sm:block">Data pendukung</span><IconCaretDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-4"><div className="grid gap-3 md:grid-cols-3">{analysis.financialContext.map((item) => <article key={item.label} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-mono text-lg font-semibold">{item.value}</p><p className="mt-1 font-mono text-[10px] text-primary">{item.period}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{item.interpretation}</p></article>)}</div><div className="mt-4"><CitationDialog citations={analysis.financialContext.flatMap((item) => item.citations)} label="Periksa field keuangan" /></div></div>
        </details>
      </Panel>

      <Panel className="mt-4"><div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><div className="flex min-w-0 items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-attention/10 text-attention"><IconAttention aria-hidden="true" className="size-4" /></span><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-attention">Audit tersedia</p><p className="mt-1 text-sm font-medium">{analysis.missingEvidence.length} batas data · {analysis.hypotheses.length} hipotesis · {analysis.sources.length} sumber</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Rincian teknis disimpan di sini agar analisis utama tetap ringkas.</p></div></div><AnalysisAudit symbol={symbol} traces={analysis.hypotheses} missingEvidence={analysis.missingEvidence} sourceCount={analysis.sources.length} /></div></Panel>

      <div className="mt-4"><AnalysisReview symbol={symbol} /></div>
      </>}

    </div>
  );
}
