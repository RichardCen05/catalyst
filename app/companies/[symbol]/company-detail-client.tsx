"use client";

import Link from "next/link";
import { AlertTriangle, ArrowLeft, Bot, Check, ChevronDown, ChevronRight, Clock3, GitBranch, HelpCircle, TableProperties, ThumbsDown, ThumbsUp } from "lucide-react";
import { agentEngine } from "@/lib/agent/engine";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { formatAsOf, formatCurrency } from "@/lib/utils";
import { AgentTrace } from "@/components/agent-trace";
import { AnalysisReview } from "@/components/analysis-review";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceCard } from "@/components/evidence-card";
import { PriceChart } from "@/components/price-chart";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

export function CompanyDetailClient({ symbol }: { symbol: SymbolCode }) {
  const { profile, recordFeedback, setCopilotOpen } = useCatalystStore();
  const company = companies.find((item) => item.symbol === symbol)!;
  const analysis = agentEngine.analyzeCompany(symbol, profile);

  if (!analysis) return (
    <div>
      <Link href="/companies" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft aria-hidden="true" className="size-4" />Kembali ke Companies</Link>
      <Panel className="overflow-hidden"><div className="border-b border-border p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="font-mono text-xs text-primary">IDX · {company.sector}</p><h1 className="mt-2 text-2xl font-semibold">{company.symbol} <span className="text-muted-foreground">{company.name}</span></h1></div><StatusBadge status="Insufficient Evidence" /></div></div><div className="p-8 text-center sm:p-14"><HelpCircle aria-hidden="true" className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Analisis empat pilar belum tersedia</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Snapshot perusahaan ada, tetapi fixture broker, foreign flow, free float, dan baseline harian belum lengkap. Catalyst tidak membuat angka pengganti.</p><div className="mt-6 flex justify-center"><CitationDialog citations={company.citations} label="Periksa snapshot" /></div></div></Panel>
    </div>
  );

  return (
    <div>
      <div className="mb-4 flex flex-wrap items-center justify-between gap-3"><Link href="/companies" className="inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowLeft aria-hidden="true" className="size-4" />Companies</Link><div className="flex w-full max-w-full flex-wrap gap-2 sm:w-auto"><Link href={`/impact?company=${symbol}`} className="inline-flex min-h-9 cursor-pointer items-center gap-2 rounded-lg border border-border bg-transparent px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GitBranch aria-hidden="true" className="size-3.5" />Lihat causal chain</Link><CitationDialog citations={analysis.sources} /><Button variant="secondary" size="sm" onClick={() => setCopilotOpen(true)} className="xl:hidden"><Bot aria-hidden="true" className="size-3.5" />Tanya agent</Button></div></div>

      <header className="mb-4 rounded-xl border border-border bg-surface p-4 shadow-panel sm:p-5">
        <div className="flex flex-col gap-4 sm:flex-row sm:items-start sm:justify-between"><div><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs text-primary">IDX:{company.symbol}</span><span className="text-xs text-muted-foreground">{company.sector} · {company.subsector}</span></div><h1 className="mt-2 text-2xl font-semibold sm:text-3xl">{company.name}</h1><p className="mt-2 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><Clock3 aria-hidden="true" className="size-3" />asOf {formatAsOf(analysis.asOf)} WIB</p></div><div className="sm:text-right"><p className="font-mono text-2xl font-semibold tabular-nums">{formatCurrency(company.price).replace("Rp", "Rp ")}</p><p className={`mt-1 font-mono text-sm ${company.changePct >= 0 ? "text-positive" : "text-danger"}`}>{company.changePct >= 0 ? "+" : ""}{company.changePct.toFixed(1)}% · fixture</p><div className="mt-2"><StatusBadge status={analysis.evidenceState} /></div></div></div>
        <div className="mt-5 grid gap-3 border-t border-border pt-4 lg:grid-cols-[minmax(0,1fr)_auto]"><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Evidence summary</p><p className="mt-1 text-sm leading-6">{analysis.thesis}</p></div><div className="flex items-center gap-2 rounded-lg border border-primary/20 bg-primary/8 px-3 py-2 font-mono text-[10px] uppercase tracking-wider text-primary"><Check aria-hidden="true" className="size-3.5" />No combined score</div></div>
      </header>

      <PriceChart data={analysis.priceSeries} symbol={symbol} />

      <section aria-labelledby="pillars-title" className="mt-4"><div className="mb-3 flex items-end justify-between gap-3"><div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Personalized order</p><h2 id="pillars-title" className="mt-1 text-lg font-semibold">Empat pilar bukti</h2></div><Link href="/agent" className="inline-flex min-h-9 items-center gap-1 text-xs text-primary">Ubah urutan<ChevronRight aria-hidden="true" className="size-3.5" /></Link></div><div className="grid gap-3 md:grid-cols-2">{analysis.pillars.map((pillar, index) => <EvidenceCard key={pillar.key} pillar={pillar} index={index} />)}</div></section>

      <Panel className="mt-4">
        <details className="group">
          <summary className="flex min-h-16 cursor-pointer list-none items-center gap-3 px-4 py-3 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><TableProperties aria-hidden="true" className="size-4.5" /></span><div className="min-w-0 flex-1"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Financial context · Sectors fixture</p><h2 className="mt-0.5 text-sm font-semibold">Input laporan keuangan yang dipakai untuk menguji jalur</h2></div><span className="hidden text-xs text-muted-foreground sm:block">Pendukung, bukan pilar kelima</span><ChevronDown aria-hidden="true" className="size-4 text-muted-foreground transition-transform group-open:rotate-180" /></summary>
          <div className="border-t border-border p-4"><div className="grid gap-3 md:grid-cols-3">{analysis.financialContext.map((item) => <article key={item.label} className="rounded-lg border border-border bg-background p-3"><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-1 font-mono text-lg font-semibold">{item.value}</p><p className="mt-1 font-mono text-[10px] text-primary">{item.period}</p><p className="mt-3 text-xs leading-5 text-muted-foreground">{item.interpretation}</p></article>)}</div><div className="mt-4"><CitationDialog citations={analysis.financialContext.flatMap((item) => item.citations)} label="Periksa field keuangan" /></div></div>
        </details>
      </Panel>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <AgentTrace traces={analysis.hypotheses} />
        <Panel>
          <PanelHeader eyebrow="Fail closed" title="Belum diperiksa" />
          <ul className="divide-y divide-border px-4">{analysis.missingEvidence.map((item) => <li key={item} className="flex gap-2 py-3 text-sm leading-6 text-muted-foreground"><AlertTriangle aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-attention" />{item}</li>)}</ul>
          <div className="border-t border-border p-4"><p className="text-xs leading-5 text-muted-foreground">Kekosongan data tidak diisi dengan estimasi tersembunyi.</p></div>
        </Panel>
      </div>

      <div className="mt-4"><AnalysisReview symbol={symbol} /></div>

      <Panel className="mt-4">
        <PanelHeader eyebrow="Personal memory" title="Apakah susunan ini membantu?" />
        <div className="flex flex-col gap-3 p-4 sm:flex-row sm:items-center sm:justify-between"><p className="max-w-2xl text-sm leading-6 text-muted-foreground">Feedback mengubah ranking, urutan, atau kedalaman pada kunjungan berikutnya. Angka, formula, sumber, dan safety gate tetap.</p><div className="flex gap-2"><Button variant="secondary" size="sm" onClick={() => recordFeedback({ symbol, action: "useful" })}><ThumbsUp aria-hidden="true" className="size-3.5" />Berguna</Button><Button variant="secondary" size="sm" onClick={() => recordFeedback({ symbol, action: "not-useful" })}><ThumbsDown aria-hidden="true" className="size-3.5" />Kurangi</Button></div></div>
      </Panel>
    </div>
  );
}
