"use client";

import { useState, useEffect } from "react";
import Link from "next/link";
import { AlertTriangle, ArrowRight, Bot, Clock3, FileText, MessageSquareWarning, Radio, ShieldQuestion } from "lucide-react";

import { citations as fixtureCitations, companies, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { formatAsOf } from "@/lib/utils";
import { CitationDialog } from "@/components/citation-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";

type Delta = { label: string; detail: string; tone: "new" | "conflict" | "watch" };

function deltaFor(analysis: any): Delta {
  if (!analysis) return { label: "Analisis diperbarui", detail: "", tone: "watch" };
  if (analysis.contradictions.length) {
    return { label: "Konflik sumber masih terbuka", detail: analysis.contradictions[0], tone: "conflict" };
  }
  const trigger = analysis.trigger;
  const fresh = trigger.eventId
    ? Date.parse(DATA_AS_OF) - Date.parse(events.find((event) => event.id === trigger.eventId)?.publishedAt ?? DATA_AS_OF) < 3 * 86_400_000
    : false;
  return { label: fresh ? trigger.title : "Analisis diperbarui", detail: fresh ? trigger.detail : analysis.thesis, tone: fresh ? "new" : "watch" };
}

const deltaIcon = { new: FileText, conflict: AlertTriangle, watch: ShieldQuestion } as const;

export default function DashboardPage() {
  const { profile, insights, feedback, playbook, caseMandates, caseStatuses, caseResolutions } = useCatalystStore();
  const rank = (symbol: SymbolCode) =>
    insights.filter((item) => item.symbol === symbol && item.status === "pending").length * 100
    + feedback.filter((item) => item.symbol === symbol && (item.action === "useful" || item.action === "show-more")).length * 10
    - feedback.filter((item) => item.symbol === symbol && (item.action === "not-useful" || item.action === "show-less")).length * 10
    + playbook.knownExposures.filter((item) => item.toUpperCase().includes(symbol)).length * 20
    + playbook.falsifiers.filter((item) => item.toUpperCase().includes(symbol)).length * 15;
  const [cases, setCases] = useState<AnalysisCase[]>([]);
  useEffect(() => {
    const active = [...profile.watchlist].filter((s) => caseStatuses[s] !== "closed").sort((a,b) => rank(b) - rank(a)).slice(0,4);
    (async () => {
      const results = await Promise.all(active.map(async (symbol) => {
        try {
          const res = await fetch(`/api/analyze?symbol=${symbol}&profileId=${profile.id}`);
          const body = await res.json();
          return body.analysis ?? null;
        } catch { return null; }
      }));
      setCases(results.filter(Boolean) as AnalysisCase[]);
    })();
  }, [profile.id, profile.watchlist, caseStatuses]);
  const watchEvents = events
    .map((event) => ({ ...event, impactLinks: event.impactLinks.filter((link) => profile.watchlist.includes(link.symbol)) }))
    .filter((event) => event.impactLinks.length > 0)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);
  const pending = insights.filter((item) => item.status === "pending");
  const citations = [...cases.flatMap((item) => item.sources), fixtureCitations.market];

  const conflicts = cases.filter((item) => item.contradictions.length).length;
  const asOfDate = new Date(DATA_AS_OF);
  const ledger = [
    { label: "Kasus terverifikasi", value: String(cases.length), detail: "dari watchlist aktif" },
    { label: "Peristiwa terkait", value: String(watchEvents.length), detail: "setelah filter profil" },
    { label: "Emiten terekam", value: String(companies.length), detail: `${new Set(companies.map((company) => company.sector)).size} sektor IDX` },
    { label: "Data as of", value: asOfDate.toLocaleTimeString("id-ID", { hour: "2-digit", minute: "2-digit", timeZone: "Asia/Jakarta" }), detail: `${asOfDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })} WIB` },
  ];

  return (
    <div>
      <PageHeader eyebrow="Event-driven IDX research ritual" title="Apa yang berubah di watchlist?" description="For discretionary investors reviewing material change across a 10–30 name watchlist: what changed, why, and what would disprove it?" action={<CitationDialog citations={citations} label="Sumber" />} />

      <section className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs" aria-label="Status pembaruan">
        <span className="inline-flex items-center gap-2 font-medium"><Radio aria-hidden="true" className="size-4 text-primary" />{cases.length} perubahan perlu dibaca</span>
        <span className="text-muted-foreground"><strong className="font-mono text-danger">{conflicts}</strong> konflik terbuka</span>
        <span className="text-muted-foreground"><strong className="font-mono text-attention-foreground">{pending.length}</strong> catatan menunggu</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><Clock3 aria-hidden="true" className="size-3" />{formatAsOf(DATA_AS_OF)} WIB</span>
      </section>

      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.4fr)_minmax(300px,0.75fr)]">
        <Panel data-tour="today-delta">
          <PanelHeader eyebrow="Since last check" title="Berubah sejak pemeriksaan terakhir" action={<Link href="/cases" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Semua case<ArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="divide-y divide-border">
            {cases.map((analysis) => {
              const delta = deltaFor(analysis);
              const Icon = deltaIcon[delta.tone];
              const openNotes = pending.filter((item) => item.symbol === analysis.company.symbol).length;
              return <Link key={analysis.company.symbol} href={`/cases/${analysis.company.symbol}`} className="group grid min-h-24 gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[36px_minmax(0,1fr)_auto] sm:items-center"><span className={`grid size-9 place-items-center rounded-lg ${delta.tone === "conflict" ? "bg-danger/10 text-danger" : delta.tone === "new" ? "bg-primary/10 text-primary" : "bg-attention/10 text-attention-foreground"}`}><Icon aria-hidden="true" className="size-4" /></span><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{analysis.company.symbol}</span><span className="text-sm font-medium">{delta.label}</span>{openNotes ? <span className="inline-flex items-center gap-1 rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] text-attention-foreground"><MessageSquareWarning aria-hidden="true" className="size-3" />{openNotes} catatan</span> : null}</div><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{delta.detail}</p>{analysis.priority.ruleTrace[0] ? <p className="mt-1 font-mono text-[9px] uppercase tracking-wider text-primary">Rule applied · {analysis.priority.ruleTrace[0].kind}</p> : null}</div><StatusBadge status={analysis.evidenceState} /></Link>;
            })}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Latest inputs" title="Peristiwa terbaru" action={<Link href="/impact" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Impact<ArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="divide-y divide-border">{watchEvents.map((event) => <Link key={event.id} href={`/impact?event=${event.id}`} className="block px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[9px] uppercase tracking-wider text-primary">{event.sourceType}</span><span className="font-mono text-[9px] text-muted-foreground">{formatAsOf(event.publishedAt)}</span></div><h3 className="mt-1.5 text-sm font-semibold leading-5">{event.title}</h3><p className="mt-1 text-xs text-muted-foreground">{event.impactLinks.map((link) => link.symbol).join(" · ")}</p></Link>)}</div>
        </Panel>
      </div>

      <section className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="ask-agent-title"><div><h2 id="ask-agent-title" className="font-semibold">Ada perubahan yang ingin diuji?</h2><p className="mt-1 text-sm text-muted-foreground">Copilot membaca rekaman Sectors API, sumber, dan catatan terbuka dalam konteks watchlist.</p></div><Link href="/copilot" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground"><Bot aria-hidden="true" className="size-4" />Tanya agent</Link></section>
    </div>
  );
}
