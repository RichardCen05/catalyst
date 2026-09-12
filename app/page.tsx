"use client";

import Link from "next/link";
import { agentEngine } from "@/lib/agent/engine";
import { citations as fixtureCitations, companies, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import { formatAsOf, formatNumber } from "@/lib/utils";
import { CitationDialog } from "@/components/citation-dialog";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { Reveal } from "@/components/ui/reveal";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconArrowRight, IconCopilot, IconGate, IconSignal, IconSource, IconWatch } from "@/components/ui/icons";

export default function DashboardPage() {
  const { profile, insights, feedback } = useCatalystStore();
  const rankedWatchlist = [...profile.watchlist].sort((first, second) => {
    const rank = (symbol: (typeof profile.watchlist)[number]) =>
      insights.filter((item) => item.symbol === symbol && item.status === "pending").length * 100
      + feedback.filter((item) => item.symbol === symbol && (item.action === "useful" || item.action === "show-more")).length * 10
      - feedback.filter((item) => item.symbol === symbol && (item.action === "not-useful" || item.action === "show-less")).length * 10;
    return rank(second) - rank(first);
  });
  const cases = rankedWatchlist
    .map((symbol) => agentEngine.analyzeCompany(symbol, profile))
    .filter((item) => item !== null)
    .slice(0, 4);
  const watchEvents = events
    .map((event) => ({ ...event, impactLinks: event.impactLinks.filter((link) => profile.watchlist.includes(link.symbol)) }))
    .filter((event) => event.impactLinks.length > 0)
    .sort((a, b) => Math.max(...b.impactLinks.map((link) => link.relevance)) - Math.max(...a.impactLinks.map((link) => link.relevance)))
    .slice(0, 4);
  const citations = [...cases.flatMap((item) => item.sources), fixtureCitations.market];

  const ledger = [
    { label: "Kasus terverifikasi", value: String(cases.length), detail: "dari watchlist aktif" },
    { label: "Peristiwa terkait", value: String(watchEvents.length), detail: "setelah filter profil" },
    { label: "Emiten fixture", value: String(companies.length), detail: "enam sektor IDX" },
    { label: "Data as of", value: "16:15", detail: "11 Sep 2026 WIB" },
  ];

  return (
    <div className="mx-auto max-w-[1180px]">
      <PageHeader
        eyebrow="Today · antrean riset pribadi"
        title={`Selamat datang, ${profile.name}`}
        description={`Watchlist ${profile.watchlist.length} emiten · horizon ${profile.config.horizon} · urutan awal ${profile.config.pillarOrder[0]}. Data dan verdict tetap sama untuk semua profil.`}
        action={<CitationDialog citations={citations} label="Sumber hari ini" />}
      />

      <Reveal>
        <dl className="grid grid-cols-2 border-y border-border lg:grid-cols-4">
          {ledger.map((item, index) => (
            <div key={item.label} className={`px-1 py-5 sm:px-5 ${index % 2 === 0 ? "border-r border-border" : ""} lg:border-r lg:last:border-r-0 ${index < 2 ? "border-b border-border lg:border-b-0" : ""} ${index === 0 ? "sm:pl-0" : ""}`}>
              <dt className="meta text-muted-foreground">{item.label}</dt>
              <dd className="mt-3 font-mono text-[28px] font-light leading-none tabular-nums">{item.value}</dd>
              <dd className="mt-2.5 text-[12px] text-muted-foreground">{item.detail}</dd>
            </div>
          ))}
        </dl>
      </Reveal>

      <Reveal index={1} className="mt-10">
        <section aria-labelledby="ask-agent-title" className="flex flex-col gap-6 rounded-[12px] border border-border bg-surface px-6 py-7 sm:flex-row sm:items-center sm:justify-between sm:px-8">
          <div className="min-w-0 max-w-xl">
            <p className="meta text-muted-foreground">Copilot</p>
            <h2 id="ask-agent-title" className="editorial mt-2.5 text-[24px]">Percepat riset lewat Copilot</h2>
            <p className="mt-2.5 text-[13.5px] leading-[1.65] text-muted-foreground">Cari alasan sebuah ticker muncul, bandingkan bukti, atau telusuri dampak berita, cuaca, dan kebijakan.</p>
          </div>
          <Link href="/copilot" className="inline-flex min-h-11 shrink-0 cursor-pointer items-center justify-center gap-2 rounded-[6px] bg-primary px-5 text-[13px] font-medium text-primary-foreground transition-[background-color,transform] duration-200 hover:bg-primary/88 active:scale-[0.98] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring focus-visible:ring-offset-2 focus-visible:ring-offset-background">
            <IconCopilot className="size-4" />
            Tanya agent
            <IconArrowRight className="size-4" />
          </Link>
        </section>
      </Reveal>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1.5fr)_minmax(300px,0.85fr)]">
        <Reveal>
          <Panel className="h-full">
            <PanelHeader
              eyebrow="Watchlist · prioritas review"
              title="Kasus yang perlu dibaca"
              action={<Link href="/companies" className="inline-flex min-h-9 shrink-0 cursor-pointer items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Semua emiten<IconArrowRight className="size-3.5" /></Link>}
            />
            <div className="divide-y divide-border">
              {cases.map((analysis, index) => (
                <Link
                  key={analysis.company.symbol}
                  href={`/companies/${analysis.company.symbol}`}
                  className="group grid min-h-24 cursor-pointer gap-3 px-5 py-4 transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[28px_minmax(0,1fr)_auto] sm:items-center sm:gap-5"
                >
                  <span className="font-mono text-[11px] tabular-nums text-muted-foreground">{String(index + 1).padStart(2, "0")}</span>
                  <span className="min-w-0">
                    <span className="flex flex-wrap items-baseline gap-2.5">
                      <span className="font-mono text-[14px] font-medium">{analysis.company.symbol}</span>
                      <span className="text-[12px] text-muted-foreground">{analysis.company.name}</span>
                    </span>
                    <span className="mt-1.5 line-clamp-2 block text-[12.5px] leading-[1.6] text-muted-foreground">{analysis.thesis}</span>
                  </span>
                  <span className="flex items-center gap-3 sm:block sm:text-right">
                    <StatusBadge status={analysis.evidenceState} />
                    <span className="meta mt-2 block text-muted-foreground">{analysis.pillars[0].label} first</span>
                  </span>
                </Link>
              ))}
              {cases.length === 0 ? <p className="px-5 py-12 text-center text-[13px] text-muted-foreground">Watchlist belum memiliki kasus analisis lengkap.</p> : null}
            </div>
          </Panel>
        </Reveal>

        <Reveal index={1}>
          <Panel className="h-full">
            <PanelHeader eyebrow="Market fixture" title="Kondisi umum" />
            <dl className="grid grid-cols-2">
              {[
                { label: "IHSG fixture", value: "7.324", note: "+0,42% · supportive", tone: "positive" as const },
                { label: "Breadth", value: "312 / 284", note: "naik / turun", tone: "muted" as const },
                { label: "Foreign flow", value: "+1,2T", note: "agregat fixture", tone: "muted" as const },
                { label: "Volume ratio", value: "1,18×", note: "di atas median", tone: "attention" as const },
              ].map((item, index) => (
                <div key={item.label} className={`px-5 py-4 ${index % 2 === 0 ? "border-r border-border" : ""} ${index < 2 ? "border-b border-border" : ""}`}>
                  <dt className="text-[11px] text-muted-foreground">{item.label}</dt>
                  <dd className="mt-2 font-mono text-[19px] font-light tabular-nums">{item.value}</dd>
                  <dd className={`mt-1.5 text-[11px] ${item.tone === "positive" ? "text-positive" : item.tone === "attention" ? "text-attention" : "text-muted-foreground"}`}>{item.note}</dd>
                </div>
              ))}
            </dl>
            <div className="border-t border-border px-5 py-5">
              <p className="text-[12px] leading-[1.65] text-muted-foreground">Snapshot umum memberi konteks. Ia tidak menjadi skor daya tarik gabungan atau menggantikan empat pilar per perusahaan.</p>
              <p className="meta mt-4 text-muted-foreground">{formatAsOf(DATA_AS_OF)} WIB</p>
            </div>
          </Panel>
        </Reveal>
      </div>

      <div className="mt-6 grid gap-6 lg:grid-cols-[minmax(0,1fr)_340px]">
        <Reveal>
          <Panel className="h-full">
            <PanelHeader
              eyebrow="Event radar"
              title="Dampak ke watchlist"
              action={<Link href="/impact" className="inline-flex min-h-9 shrink-0 items-center gap-1.5 whitespace-nowrap rounded-[6px] px-2 text-[12px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Buka peta<IconArrowRight className="size-3.5" /></Link>}
            />
            <div className="cascade grid gap-px bg-border md:grid-cols-2">
              {watchEvents.map((event) => (
                <Link key={event.id} href={`/impact?event=${event.id}`} className="cursor-pointer bg-surface px-5 py-4 transition-colors hover:bg-muted/45 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                  <span className="flex items-center justify-between gap-2">
                    <span className="meta text-muted-foreground">{event.category}</span>
                    <span className="meta text-muted-foreground opacity-70">{event.sourceType}</span>
                  </span>
                  <h3 className="mt-2.5 text-[13px] font-medium leading-[1.5]">{event.title}</h3>
                  <span className="mt-3.5 flex flex-wrap gap-1.5">
                    {event.impactLinks.map((link) => (
                      <span key={link.symbol} className="rounded-full bg-muted px-2 py-0.5 font-mono text-[10px] text-muted-foreground">{link.symbol} · {link.direction}</span>
                    ))}
                  </span>
                </Link>
              ))}
            </div>
          </Panel>
        </Reveal>

        <Reveal index={1}>
          <Panel className="h-full">
            <PanelHeader eyebrow="Agent health" title="Semua gate aktif" />
            <ul className="divide-y divide-border">
              {[
                { label: "Citation gate", detail: `${formatNumber(new Set(citations.map((item) => item.id)).size)} sumber unik`, icon: IconSource },
                { label: "Contradiction gate", detail: "1 konflik terbuka", icon: IconWatch },
                { label: "Language gate", detail: "advisory diblokir", icon: IconGate },
                { label: "Planner", detail: "3-6 hipotesis", icon: IconCopilot },
              ].map((item) => (
                <li key={item.label} className="flex items-center gap-3.5 px-5 py-3.5">
                  <item.icon className="size-4 shrink-0 text-muted-foreground" />
                  <span className="min-w-0 flex-1">
                    <span className="block text-[13px] font-medium">{item.label}</span>
                    <span className="meta mt-1 block text-muted-foreground">{item.detail}</span>
                  </span>
                  <IconSignal className="size-3.5 shrink-0 text-positive" />
                </li>
              ))}
            </ul>
          </Panel>
        </Reveal>
      </div>
    </div>
  );
}
