"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { agentEngine } from "@/lib/agent/engine";
import { citations as fixtureCitations, companies, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode, AnalysisCase } from "@/lib/types";
import { formatAsOf } from "@/lib/utils";
import { dispositionLabel, uiLabel } from "@/lib/ui-labels";
import { holdingExposure, holdingWeight, portfolioRankScore } from "@/lib/portfolio";
import { CitationDialog } from "@/components/citation-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconArrowRight, IconAttention, IconClock, IconCopilot, IconDocument, IconNote, IconSignal } from "@/components/ui/icons";

export default function DashboardPage() {
  const { profile, insights, feedback, playbook, holdings, caseMandates, caseClarifications, caseStatuses, caseResolutions } = useCatalystStore();
  const [triage, setTriage] = useState<"all" | "owned" | "conflict">("all");
  const prices: Partial<Record<SymbolCode, number>> = Object.fromEntries(
    companies.map((company) => [company.symbol, company.price]),
  ) as Partial<Record<SymbolCode, number>>;
  const [analyses, setAnalyses] = useState<Record<string, AnalysisCase>>({});
  const rank = (symbol: SymbolCode) => {
    const base = insights.filter((item) => item.symbol === symbol && item.status === "pending").length * 100
      + feedback.filter((item) => item.symbol === symbol && (item.action === "useful" || item.action === "show-more")).length * 10
      - feedback.filter((item) => item.symbol === symbol && (item.action === "not-useful" || item.action === "show-less")).length * 10
      + playbook.knownExposures.filter((item) => item.toUpperCase().includes(symbol)).length * 20
      + playbook.falsifiers.filter((item) => item.toUpperCase().includes(symbol)).length * 15;
    // Portfolio weight lifts open positions without inventing market data:
    // exposure comes from user-entered holdings × recorded close price.
    const holding = holdings[symbol];
    if (!holding) return base;
    const weight = holdingWeight(symbol, holdings, prices);
    const materiality = analyses[symbol]?.priority.materiality ?? "Medium";
    return base + portfolioRankScore(materiality, weight) * 10;
  };
  const cases = [...profile.watchlist]
    .filter((symbol) => caseStatuses[symbol] !== "closed")
    .sort((first, second) => rank(second) - rank(first));
  useEffect(() => {
    let cancelled = false;
    const targets = [...new Set([...cases, ...events.flatMap((event) => event.impactLinks.map((link) => link.symbol)).filter((symbol) => profile.watchlist.includes(symbol)).slice(0, 3)])];
    void Promise.all(targets.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], clarificationChoice: caseClarifications[symbol], playbook, userInsights: insights, resolution: caseResolutions[symbol] }))).then((results) => {
      if (cancelled) return;
      const next: Record<string, AnalysisCase> = {};
      targets.forEach((symbol, index) => { const result = results[index]; if (result) next[symbol] = result; });
      setAnalyses(next);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profile.watchlist.join(","), Object.keys(caseStatuses).join(","), caseMandates, caseClarifications, playbook, insights, caseResolutions]);
  const openCases = cases.map((symbol) => analyses[symbol]).filter((item) => item !== undefined)
    .filter((item) => triage === "all" || (triage === "owned" ? profile.owned.includes(item.company.symbol) : item.contradictions.length > 0));
  const watchEvents = events
    .map((event) => ({ ...event, impactLinks: event.impactLinks.filter((link) => profile.watchlist.includes(link.symbol)) }))
    .filter((event) => event.impactLinks.length > 0)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);
  const pending = insights.filter((item) => item.status === "pending");
  const conflictCount = openCases.filter((item) => item.contradictions.length > 0).length;
  const citations = [...openCases.flatMap((item) => item.sources), fixtureCitations.market];

  const asOfDate = new Date(DATA_AS_OF);
  const [stalenessDays] = useState(() => Math.max(0, Math.round((Date.now() - new Date(DATA_AS_OF).getTime()) / 86_400_000)));
  const ledger = [
    { label: "Kasus terverifikasi", value: String(openCases.length), detail: "dari watchlist aktif" },
    { label: "Peristiwa terkait", value: String(watchEvents.length), detail: "setelah filter profil" },
    { label: "Emiten terekam", value: String(companies.length), detail: `${new Set(companies.map((company) => company.sector)).size} sektor IDX` },
    { label: "Data as of", value: asOfDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }), detail: `${asOfDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })} WIB` },
  ];

  return (
    <div>
      <PageHeader eyebrow="Riset saham komoditas IDX" title="Apa yang berubah dan apakah penting?" description="Perubahan penting pada saham pantauan Anda, beserta pembanding dan alasan untuk memeriksanya." action={<CitationDialog citations={citations} label="Sumber" />} />

      <section className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs" aria-label="Status pembaruan">
        <span className="inline-flex items-center gap-2 font-medium"><IconSignal aria-hidden="true" className="size-4 text-primary" />{openCases.length} perubahan perlu diperiksa</span>
        <span className="text-muted-foreground"><strong className="font-mono text-danger">{conflictCount}</strong> konflik terbuka</span>
        <span className="text-muted-foreground"><strong className="font-mono text-attention-foreground">{pending.length}</strong> catatan menunggu</span>
        <span className="text-muted-foreground">Rekaman {stalenessDays} hari lalu — bukan pasar live</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><IconClock aria-hidden="true" className="size-3" />{formatAsOf(DATA_AS_OF)} WIB</span>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.75fr)]">
        <Panel data-tour="today-delta">
          <PanelHeader eyebrow="Sejak pemeriksaan terakhir" title="Perubahan yang perlu diperiksa" action={<Link href="/cases" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Semua kasus<IconArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="flex flex-wrap gap-2 border-b border-border px-4 py-3" role="group" aria-label="Filter triase">
            {(["all", "owned", "conflict"] as const).map((value) => (
              <button key={value} type="button" onClick={() => setTriage(value)} aria-pressed={triage === value} className={`min-h-9 rounded-lg border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring ${triage === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>
                {value === "all" ? "Semua" : value === "owned" ? "Dimiliki" : "Konflik"}
              </button>
            ))}
          </div>
          <div className="divide-y divide-border">
            {openCases.map((analysis) => {
              const conflict = analysis.evidenceState === "Mixed Evidence";
              const Icon = conflict ? IconAttention : IconDocument;
              const openNotes = pending.filter((item) => item.symbol === analysis.company.symbol).length;
              const exposure = holdingExposure(holdings[analysis.company.symbol], analysis.company.price);
              return <Link key={analysis.company.symbol} href={`/cases/${analysis.company.symbol}`} data-tour-action={analysis.company.symbol === "ANTM" ? "open-antm-case" : undefined} className="group grid gap-3 px-4 py-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-start"><span className={`grid size-9 place-items-center rounded-lg ${conflict ? "bg-danger/10 text-danger" : "bg-primary/10 text-primary"}`}><Icon aria-hidden="true" className="size-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{analysis.company.symbol}</span>{profile.owned.includes(analysis.company.symbol) ? <span className="rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">Dimiliki</span> : null}{exposure > 0 ? <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] text-muted-foreground">Eksposur Rp{(exposure / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M</span> : null}<span className="text-sm font-medium">{analysis.materialChange.whatChanged.replace(`${analysis.company.symbol}: `, "")}</span>{openNotes ? <span className="inline-flex items-center gap-1 rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] text-attention-foreground"><IconNote aria-hidden="true" className="size-3" />{openNotes} catatan</span> : null}</div><dl className="mt-2 space-y-1 text-xs leading-5"><div className="flex gap-2"><dt className="w-[70px] shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary">Pembanding</dt><dd className="line-clamp-1 text-muted-foreground">{analysis.materialChange.baseline}</dd></div><div className="flex gap-2"><dt className="w-[70px] shrink-0 font-mono text-[9px] uppercase tracking-wider text-primary">Alasan</dt><dd className="line-clamp-1 text-muted-foreground">{analysis.materialChange.whyMaterial}</dd></div></dl><p className="mt-2 font-mono text-[9px] uppercase tracking-wider text-primary">Tindakan riset · {dispositionLabel(analysis.researchDisposition.kind)}</p></div><StatusBadge status={analysis.evidenceState} /></Link>;
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Pemicu terbaru" title="Peristiwa untuk daftar pantauan" action={<Link href="/impact" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Sebab akibat<IconArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="divide-y divide-border">{watchEvents.map((event) => { const target = event.impactLinks[0]?.symbol ?? "ANTM"; const href = analyses[target]?.clarification.required ? `/cases/${target}#clarification-gate` : `/impact?company=${target}&event=${event.id}`; return <Link key={event.id} href={href} className="block px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-wider text-primary">{uiLabel(event.sourceType)}</span><span className="font-mono text-[9px] text-muted-foreground">{formatAsOf(event.publishedAt)}</span></div><h3 className="mt-1.5 text-sm font-semibold leading-5">{event.title}</h3><p className="mt-1 text-xs text-muted-foreground">{event.impactLinks.map((link) => link.symbol).join(" · ")}</p></Link>; })}</div>
        </Panel>
      </div>

      <section className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="ask-agent-title"><div><h2 id="ask-agent-title" className="font-semibold">Ada perubahan yang ingin diuji?</h2><p className="mt-1 text-sm text-muted-foreground">Asisten membaca rekaman {asOfDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}, sumber, dan catatan dalam konteks daftar pantauan.</p></div><Link href="/copilot" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><IconCopilot aria-hidden="true" className="size-4" />Tanya asisten</Link></section>
    </div>
  );
}
