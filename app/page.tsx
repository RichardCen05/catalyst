"use client";

import Link from "next/link";
import { Activity, ArrowRight, Bot, Clock3, Database, Eye, MessageCircleQuestion, Newspaper, Radar, ShieldCheck } from "lucide-react";
import { agentEngine } from "@/lib/agent/engine";
import { citations as fixtureCitations, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { formatAsOf } from "@/lib/utils";
import { CitationDialog } from "@/components/citation-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";

export default function DashboardPage() {
  const { profile, insights, feedback, playbook, caseMandates, caseStatuses, caseResolutions } = useCatalystStore();
  const rank = (symbol: SymbolCode) =>
    insights.filter((item) => item.symbol === symbol && item.status === "pending").length * 100
    + feedback.filter((item) => item.symbol === symbol && (item.action === "useful" || item.action === "show-more")).length * 10
    - feedback.filter((item) => item.symbol === symbol && (item.action === "not-useful" || item.action === "show-less")).length * 10
    + playbook.knownExposures.filter((item) => item.toUpperCase().includes(symbol)).length * 20
    + playbook.falsifiers.filter((item) => item.toUpperCase().includes(symbol)).length * 15;
  const cases = [...profile.watchlist]
    .filter((symbol) => caseStatuses[symbol] !== "closed")
    .sort((first, second) => rank(second) - rank(first))
    .map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], playbook, userInsights: insights, resolution: caseResolutions[symbol] }))
    .filter((item) => item !== null)
    .slice(0, 4);
  const watchEvents = events
    .map((event) => ({ ...event, impactLinks: event.impactLinks.filter((link) => profile.watchlist.includes(link.symbol)) }))
    .filter((event) => event.impactLinks.length > 0)
    .sort((a, b) => Date.parse(b.publishedAt) - Date.parse(a.publishedAt))
    .slice(0, 3);
  const pending = insights.filter((item) => item.status === "pending");
  const citations = [...cases.flatMap((item) => item.sources), fixtureCitations.market];

  const ledger = [
    { label: "Kasus terverifikasi", value: String(cases.length), detail: "dari watchlist aktif" },
    { label: "Peristiwa terkait", value: String(watchEvents.length), detail: "setelah filter profil" },
    { label: "Emiten fixture", value: String(companies.length), detail: "enam sektor IDX" },
    { label: "Data as of", value: "16:15", detail: "11 Sep 2026 WIB" },
  ];

  return (
    <div>
      <PageHeader eyebrow="Today · personal research queue" title={`Selamat datang, ${profile.name}`} description={`Watchlist ${profile.watchlist.length} emiten · horizon ${profile.config.horizon} · urutan awal ${profile.config.pillarOrder[0]}. Data dan verdict tetap sama untuk semua profil.`} action={<CitationDialog citations={citations} label="Sumber hari ini" />} />

      <section className="mb-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="ask-agent-title"><div className="flex min-w-0 items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-lg bg-primary text-primary-foreground"><MessageCircleQuestion aria-hidden="true" className="size-5" /></span><div><h2 id="ask-agent-title" className="font-semibold">Percepat riset lewat Copilot</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Cari alasan sebuah ticker muncul, bandingkan bukti, atau telusuri dampak berita, cuaca, dan kebijakan.</p></div></div><Link href="/copilot" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground transition-colors hover:opacity-90 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Bot aria-hidden="true" className="size-4" />Tanya agent<ArrowRight aria-hidden="true" className="size-4" /></Link></section>

      <section aria-label="Ringkasan pasar" className="grid gap-3 sm:grid-cols-2 lg:grid-cols-4">
        {[
          { label: "Kasus terverifikasi", value: String(cases.length), detail: "dari watchlist aktif", icon: ShieldCheck },
          { label: "Peristiwa terkait", value: String(watchEvents.length), detail: "setelah filter profil", icon: Newspaper },
          { label: "Emiten fixture", value: String(companies.length), detail: "enam sektor IDX", icon: Database },
          { label: "As of", value: "16:15", detail: "11 Sep 2026 WIB", icon: Clock3 },
        ].map((item) => <Panel key={item.label} className="p-4"><div className="flex items-start justify-between gap-3"><div><p className="text-xs text-muted-foreground">{item.label}</p><p className="mt-2 font-mono text-2xl font-semibold tabular-nums">{item.value}</p><p className="mt-1 text-[11px] text-muted-foreground">{item.detail}</p></div><span className="grid size-9 place-items-center rounded-lg bg-primary/10 text-primary"><item.icon aria-hidden="true" className="size-4.5" /></span></div></Panel>)}
      </section>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1.45fr)_minmax(300px,0.85fr)]">
        <Panel>
          <PanelHeader eyebrow="Watchlist · diprioritaskan dari review" title="Kasus yang perlu dibaca" action={<Link href="/companies" className="inline-flex min-h-9 cursor-pointer items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Semua emiten<ArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="divide-y divide-border">
            {cases.map((analysis, index) => <Link key={analysis.company.symbol} href={`/companies/${analysis.company.symbol}`} className="group grid min-h-24 cursor-pointer gap-3 px-4 py-3 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[44px_minmax(0,1fr)_auto] sm:items-center"><div className="grid size-10 place-items-center rounded-lg bg-primary/10 font-mono text-xs font-semibold text-primary">{String(index + 1).padStart(2, "0")}</div><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold">{analysis.company.symbol}</span><span className="text-xs text-muted-foreground">{analysis.company.name}</span></div><p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{analysis.thesis}</p></div><div className="flex items-center gap-3 sm:block sm:text-right"><StatusBadge status={analysis.evidenceState} /><p className="mt-1 font-mono text-xs text-muted-foreground">{analysis.pillars[0].label} first</p></div></Link>)}
            {cases.length === 0 ? <div className="p-8 text-center text-sm text-muted-foreground">Watchlist belum memiliki kasus analisis lengkap.</div> : null}
          </div>
        </Panel>

        <Panel>
          <PanelHeader eyebrow="Market fixture" title="Kondisi umum" />
          <div className="grid grid-cols-2 gap-px border-b border-border bg-border">
            <div className="bg-surface p-4"><p className="text-xs text-muted-foreground">IHSG fixture</p><p className="mt-2 font-mono text-xl font-semibold">7.324</p><p className="mt-1 text-xs text-positive">+0,42% · supportive</p></div>
            <div className="bg-surface p-4"><p className="text-xs text-muted-foreground">Breadth</p><p className="mt-2 font-mono text-xl font-semibold">312 / 284</p><p className="mt-1 text-xs text-muted-foreground">naik / turun</p></div>
            <div className="bg-surface p-4"><p className="text-xs text-muted-foreground">Foreign flow</p><p className="mt-2 font-mono text-xl font-semibold">+1,2T</p><p className="mt-1 text-xs text-muted-foreground">agregat fixture</p></div>
            <div className="bg-surface p-4"><p className="text-xs text-muted-foreground">Volume ratio</p><p className="mt-2 font-mono text-xl font-semibold">1,18×</p><p className="mt-1 text-xs text-attention-foreground">di atas median</p></div>
          </div>
          <div className="p-4"><div className="flex gap-2 rounded-lg border border-border bg-background p-3"><Radar aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" /><p className="text-xs leading-5 text-muted-foreground">Snapshot umum memberi konteks. Ia tidak menjadi skor daya tarik gabungan atau menggantikan empat pilar per perusahaan.</p></div><p className="mt-3 flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground"><Clock3 aria-hidden="true" className="size-3" />{formatAsOf(DATA_AS_OF)} WIB</p></div>
        </Panel>
      </div>

      <div className="mt-4 grid gap-4 lg:grid-cols-[minmax(0,1fr)_320px]">
        <Panel>
          <PanelHeader eyebrow="Event radar" title="Dampak ke watchlist" action={<Link href="/impact" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Buka peta<ArrowRight aria-hidden="true" className="size-3.5" /></Link>} />
          <div className="grid gap-3 p-4 md:grid-cols-2">
            {watchEvents.map((event) => <Link key={event.id} href={`/impact?event=${event.id}`} className="cursor-pointer rounded-lg border border-border bg-background p-3 transition-colors hover:border-primary/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-center justify-between gap-2"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">{event.category}</span><span className="font-mono text-[10px] text-muted-foreground">{event.sourceType}</span></div><h3 className="mt-2 text-sm font-semibold leading-5">{event.title}</h3><div className="mt-3 flex flex-wrap gap-1.5">{event.impactLinks.map((link) => <span key={link.symbol} className="rounded border border-border px-1.5 py-1 font-mono text-[10px]">{link.symbol} · {link.direction}</span>)}</div></Link>)}
          </div>
        </Panel>
        <Panel>
          <PanelHeader eyebrow="Agent health" title="Semua gate aktif" />
          <div className="space-y-3 p-4">
            {[{ label: "Citation gate", detail: `${formatNumber(new Set(citations.map((item) => item.id)).size)} sumber unik`, icon: Database }, { label: "Contradiction gate", detail: "1 konflik terbuka", icon: Eye }, { label: "Language gate", detail: "advisory diblokir", icon: ShieldCheck }, { label: "Planner", detail: "3-6 hipotesis", icon: Bot }].map((item) => <div key={item.label} className="flex items-center gap-3"><span className="grid size-8 place-items-center rounded-md bg-positive/10 text-positive"><item.icon aria-hidden="true" className="size-4" /></span><div><p className="text-sm font-medium">{item.label}</p><p className="font-mono text-[10px] text-muted-foreground">{item.detail}</p></div><Activity aria-hidden="true" className="ml-auto size-3.5 text-positive" /></div>)}
          </div>
        </Panel>
      </div>
    </div>
  );
}
