"use client";

import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Clock3, FileText, MessageSquareWarning, Radio } from "lucide-react";
import { agentEngine } from "@/lib/agent/engine";
import { citations as fixtureCitations, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { formatAsOf } from "@/lib/utils";
import { CitationDialog } from "@/components/citation-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

export default function DashboardPage() {
  const { profile, insights, feedback, playbook, caseMandates, caseClarifications, caseStatuses, caseResolutions } = useCatalystStore();
  const rank = (symbol: SymbolCode) =>
    insights.filter((item) => item.symbol === symbol && item.status === "pending").length * 100
    + feedback.filter((item) => item.symbol === symbol && (item.action === "useful" || item.action === "show-more")).length * 10
    - feedback.filter((item) => item.symbol === symbol && (item.action === "not-useful" || item.action === "show-less")).length * 10
    + playbook.knownExposures.filter((item) => item.toUpperCase().includes(symbol)).length * 20
    + playbook.falsifiers.filter((item) => item.toUpperCase().includes(symbol)).length * 15;
  const cases = [...profile.watchlist]
    .filter((symbol) => caseStatuses[symbol] !== "closed")
    .sort((first, second) => rank(second) - rank(first))
    .map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], clarificationChoice: caseClarifications[symbol], playbook, userInsights: insights, resolution: caseResolutions[symbol] }))
    .filter((item) => item !== null)
    .slice(0, 4);
  const watchEvents = events
    .map((event) => ({ ...event, impactLinks: event.impactLinks.filter((link) => profile.watchlist.includes(link.symbol)) }))
    .filter((event) => event.impactLinks.length > 0)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);
  const pending = insights.filter((item) => item.status === "pending");
  const citations = [...cases.flatMap((item) => item.sources), fixtureCitations.market];

  return (
    <div>
      <PageHeader eyebrow="Commodity-sensitive IDX research desk" title="Apa yang berubah—dan apakah material?" description="Untuk investor event-driven yang memantau miners dan energy names terhadap komoditas, FX, cuaca, volume operasi, dan regulasi." action={<CitationDialog citations={citations} label="Sumber" />} />

      <section className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs" aria-label="Status pembaruan">
        <span className="inline-flex items-center gap-2 font-medium"><Radio aria-hidden="true" className="size-4 text-primary" />{cases.length} perubahan perlu dibaca</span>
        <span className="text-muted-foreground"><strong className="font-mono text-danger">1</strong> konflik terbuka</span>
        <span className="text-muted-foreground"><strong className="font-mono text-attention-foreground">{pending.length}</strong> catatan menunggu</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><Clock3 aria-hidden="true" className="size-3" />{formatAsOf(DATA_AS_OF)} WIB</span>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.75fr)]">
        <Panel data-tour="today-delta">
          <PanelHeader eyebrow="Since last check" title="Berubah sejak pemeriksaan terakhir" action={<Link href="/cases" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Semua case<ArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="divide-y divide-border">
            {cases.map((analysis) => {
              const conflict = analysis.evidenceState === "Mixed Evidence";
              const Icon = conflict ? AlertTriangle : FileText;
              const openNotes = pending.filter((item) => item.symbol === analysis.company.symbol).length;
              return <Link key={analysis.company.symbol} href={`/cases/${analysis.company.symbol}`} data-tour-action={analysis.company.symbol === "ANTM" ? "open-antm-case" : undefined} className="group grid gap-3 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-start"><span className={`grid size-9 place-items-center rounded-lg ${conflict ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}><Icon aria-hidden="true" className="size-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{analysis.company.symbol}</span><span className="text-sm font-medium">{analysis.materialChange.whatChanged.replace(`${analysis.company.symbol}: `, "")}</span>{openNotes ? <span className="inline-flex items-center gap-1 rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] text-attention-foreground"><MessageSquareWarning aria-hidden="true" className="size-3" />{openNotes} catatan</span> : null}</div><dl className="mt-2 space-y-1 text-xs leading-5"><div className="flex gap-2"><dt className="w-[58px] shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary">Baseline</dt><dd className="line-clamp-1 text-muted-foreground">{analysis.materialChange.baseline}</dd></div><div className="flex gap-2"><dt className="w-[58px] shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary">Why now</dt><dd className="line-clamp-1 text-muted-foreground">{analysis.materialChange.whyMaterial}</dd></div><div className="flex gap-2"><dt className="w-[58px] shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary">Rule</dt><dd className="line-clamp-1 text-muted-foreground">{analysis.materialChange.rule}</dd></div></dl><p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-primary">Disposition · {analysis.researchDisposition.label}</p></div><StatusBadge status={analysis.evidenceState} /></Link>;
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Latest inputs" title="Peristiwa terbaru" action={<Link href="/cases" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Cases<ArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="divide-y divide-border">{watchEvents.map((event) => { const target = event.impactLinks[0]?.symbol ?? "ANTM"; const targetAnalysis = agentEngine.analyzeCompany(target, profile, { mandate: caseMandates[target], clarificationChoice: caseClarifications[target], playbook, userInsights: insights, resolution: caseResolutions[target] }); const href = targetAnalysis?.clarification.required ? `/cases/${target}#clarification-gate` : `/cases/${target}?tab=hypotheses&event=${event.id}`; return <Link key={event.id} href={href} className="block px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-wider text-primary">{event.sourceType}</span><span className="font-mono text-[9px] text-muted-foreground">{formatAsOf(event.publishedAt)}</span></div><h3 className="mt-1.5 text-sm font-semibold leading-5">{event.title}</h3><p className="mt-1 text-xs text-muted-foreground">{event.impactLinks.map((link) => link.symbol).join(" · ")}</p></Link>; })}</div>
        </Panel>
      </div>

      <section className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="ask-agent-title"><div><h2 id="ask-agent-title" className="font-semibold">Ada perubahan yang ingin diuji?</h2><p className="mt-1 text-sm text-muted-foreground">Copilot membaca fixture, sumber, dan catatan terbuka dalam konteks watchlist.</p></div><Link href="/copilot" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Bot aria-hidden="true" className="size-4" />Tanya agent</Link></section>
    </div>
  );
}
