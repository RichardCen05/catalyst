import Link from "next/link";
import { AlertTriangle, ChevronDown, GitBranch } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { MarketEvent, PillarKey, ResearchCase, SymbolCode } from "@/lib/types";
import { WINDOW_SESSIONS } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import { AnalysisAudit } from "@/components/analysis-audit";
import { AnalysisReview } from "@/components/analysis-review";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceCard } from "@/components/evidence-card";
import { PriceChart } from "@/components/price-chart";
import { SignalHistory } from "@/components/signal-history";
import { ResearchCaseOverview } from "@/components/research-case-overview";
import { CaseResolutionPanel } from "@/components/case-resolution";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

export type ResearchCaseTab = "case" | "market" | "business" | "review";

const tabLabels: Array<{ value: ResearchCaseTab; label: string }> = [
  { value: "case", label: "Ringkasan" },
  { value: "market", label: "Pasar" },
  { value: "business", label: "Bisnis" },
  { value: "review", label: "Tinjau" },
];

export function ResearchCaseWorkspace({ analysis, symbol, relatedEvents }: {
  analysis: ResearchCase;
  symbol: SymbolCode;
  relatedEvents: MarketEvent[];
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ResearchCaseTab | null;
  const activeTab = tabLabels.some((tab) => tab.value === requestedTab) ? requestedTab as ResearchCaseTab : "case";
  const marketPillars = analysis.pillars.filter((item) => item.key !== "catalyst");
  const requestedPillar = searchParams.get("pillar") as PillarKey | null;
  const activePillar = marketPillars.some((item) => item.key === requestedPillar) ? requestedPillar : marketPillars[0]?.key;
  const marketPillar = marketPillars.find((item) => item.key === activePillar) ?? marketPillars[0];
  const catalystPillar = analysis.pillars.find((item) => item.key === "catalyst");
  const playbook = useCatalystStore((state) => state.playbook);
  const sectorReturn = analysis.pillars.find((item) => item.key === "momentum")?.metrics.find((metric) => metric.label === "Imbal hasil sektor")?.value;
  const comparables = playbook.preferredComparables[symbol] ?? [];
  const focusDimension = analysis.researchPlan.focus;
  const focusLabels: Record<string, string[]> = {
    pricing: ["revenue", "realisasi harga", "price", "pendapatan"],
    margin: ["margin", "spread", "biaya"],
    volume: ["volume", "produksi", "utilisasi", "throughput"],
    "cash-flow": ["cash flow", "arus kas", "casa", "working capital"],
    "balance-sheet": ["debt", "utang", "equity", "neraca", "likuiditas"],
    valuation: ["valuasi", "valuation", "multiple", "qoq", "yoy"],
  };
  const focusKeywords = focusLabels[focusDimension] ?? [];
  const isFocusRow = (label: string) => focusKeywords.some((keyword) => label.toLowerCase().includes(keyword));

  return (
    <div>
      <nav aria-label="Bagian kasus" className="sticky top-14 z-30 mb-6 -mx-4 overflow-x-auto border-y border-border bg-background/96 px-4 backdrop-blur sm:-mx-7 sm:px-7 xl:top-0 xl:mx-0 xl:rounded-[10px] xl:border xl:bg-surface xl:px-2">
        <div role="tablist" aria-label="Bagian kasus" className="flex min-w-max">
          {tabLabels.map((tab) => {
            const active = activeTab === tab.value;
            return <Link key={tab.value} id={`case-tab-${tab.value}`} data-tour-action={tab.value === "market" && symbol === "ANTM" ? "open-market" : tab.value === "business" && symbol === "ANTM" ? "open-business" : undefined} role="tab" aria-selected={active} aria-controls={`case-panel-${tab.value}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=${tab.value}`} className={cn("relative flex min-h-12 items-center px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5", active && "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand sm:after:inset-x-5")}>{tab.label}</Link>;
          })}
        </div>
      </nav>

      <section id={`case-panel-${activeTab}`} role="tabpanel" aria-labelledby={`case-tab-${activeTab}`} tabIndex={0} className="focus:outline-none">
        {activeTab === "case" ? <ResearchCaseOverview researchCase={analysis} symbol={symbol} /> : null}

        {activeTab === "market" && marketPillar ? <section aria-labelledby="market-confirmation-title">
          <header className="mb-5 max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Langkah 1 · tanda pasar</p><h2 id="market-confirmation-title" className="editorial mt-1 text-2xl sm:text-[28px]">Konfirmasi pasar</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Periksa apakah konsentrasi, volume, dan momentum ikut berubah. Bagian ini belum menjelaskan penyebabnya.</p></header>
          <div role="tablist" aria-label="Pemeriksaan pasar" className="mb-4 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-3">{marketPillars.map((item) => { const active = item.key === marketPillar.key; return <Link key={item.key} role="tab" aria-selected={active} aria-controls={`pillar-panel-${item.key}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=market&pillar=${item.key}`} className={cn("min-w-0 bg-surface px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-surface-raised")}><span className="block truncate text-sm font-medium">{item.label}</span><span className={cn("mt-1 block truncate font-mono text-[10px]", active && "text-primary")}>{uiLabel(item.status)}</span></Link>; })}</div>
          <div id={`pillar-panel-${marketPillar.key}`} role="tabpanel" tabIndex={0} className="focus:outline-none"><EvidenceCard pillar={marketPillar} symbol={symbol} /></div>
          <SignalHistory stability={analysis.signalStability} />
          <section aria-label="Banding sektor" className="mt-4 flex flex-wrap items-center gap-x-4 gap-y-2 rounded-[10px] border border-border bg-surface px-4 py-3 text-xs"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">Banding sektor</span>{sectorReturn ? <span className="text-muted-foreground">Sektor: <strong className="font-mono text-foreground">{sectorReturn}</strong></span> : null}{comparables.length ? <span className="text-muted-foreground">Pembanding: {comparables.map((item, index) => <span key={item}><Link href={`/cases/${item}`} className="font-mono text-primary hover:underline">{item}</Link>{index < comparables.length - 1 ? " · " : ""}</span>)}</span> : <span className="text-muted-foreground">Belum ada pembanding pilihan — atur di <Link href="/playbook" className="text-primary hover:underline">aturan riset</Link>.</span>}</section>
          <details className="group mt-4 rounded-[10px] border border-border bg-surface"><summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary">Buka timeline {WINDOW_SESSIONS} hari<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary><div className="border-t border-border p-3"><PriceChart data={analysis.priceSeries} symbol={symbol} events={relatedEvents} /></div></details>
        </section> : null}

        {activeTab === "business" && catalystPillar ? <section aria-labelledby="business-transmission-title" data-tour="business-transmission">
          <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Langkah 2 · dampak bisnis</p><h2 id="business-transmission-title" className="editorial mt-1 text-2xl sm:text-[28px]">Dampak ke bisnis</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Periksa apakah pemicu dapat mencapai operasi atau keuangan emiten.</p></div><Link href={`/impact?company=${symbol}`} data-tour-action={symbol === "ANTM" ? "open-impact" : undefined} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[6px] border border-primary/35 bg-primary/8 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GitBranch aria-hidden="true" className="size-4" />Buka peta sebab akibat</Link></header>
          <EvidenceCard pillar={catalystPillar} symbol={symbol} />
          <section aria-labelledby="business-impact-title" className="mt-4 overflow-hidden rounded-[12px] border border-border bg-surface">
            <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"><div className="max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Uji dampak bisnis</p><h3 id="business-impact-title" className="editorial mt-1 text-2xl">Di mana dampak harus terlihat?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Dampak harus terlihat pada operasi atau keuangan, bukan hanya harga pasar.</p></div><CitationDialog citations={analysis.financialContext.flatMap((item) => item.citations)} label="Periksa data keuangan" /></header>
            <div className="grid gap-px bg-border md:grid-cols-2">{analysis.businessImpact.map((item) => <article key={item.dimension} className="bg-surface p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-primary">{item.label}</p></div><span className={cn("rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-wider", item.status === "Primary test" ? "border-primary/40 bg-primary/10 text-primary" : item.status === "Supporting" ? "border-positive/30 text-positive" : "border-border text-muted-foreground")}>{uiLabel(item.status)}</span></div><dl className="mt-4 space-y-3 text-xs leading-5"><div><dt className="font-medium">Cara kerja</dt><dd className="mt-1 text-muted-foreground">{item.mechanism}</dd></div><div><dt className="font-medium">Indikator yang dicari</dt><dd className="mt-1 text-muted-foreground">{item.observable}</dd></div><div><dt className="font-medium">Arti untuk riset</dt><dd className="mt-1 text-muted-foreground">{item.implication}</dd></div></dl></article>)}</div>
            <details className="group border-t border-border"><summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary sm:px-5">Lihat data keuangan yang dipakai</summary><dl className="divide-y divide-border border-t border-border bg-background">{analysis.financialContext.map((item) => <div key={item.label} className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(160px,0.7fr)_minmax(120px,0.45fr)_minmax(0,1.5fr)] sm:items-start sm:px-5"><dt className="text-sm font-medium">{item.label}{isFocusRow(item.label) ? <span className="ml-2 rounded border border-primary/40 bg-primary/10 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-primary">Fokus</span> : null}<span className="mt-1 block font-mono text-[10px] font-normal text-primary">{item.period}</span></dt><dd className="font-mono text-lg font-semibold tabular-nums">{item.value}</dd><dd className="text-sm leading-6 text-muted-foreground">{item.interpretation}</dd></div>)}</dl></details>
          </section>
        </section> : null}

        {activeTab === "review" ? <div><CaseResolutionPanel researchCase={analysis} symbol={symbol} /><section className="mb-4 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Audit kasus"><div className="flex min-w-0 items-start gap-3"><AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0 text-attention" /><div><h2 className="text-sm font-semibold">Audit dan batas bukti</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{analysis.missingEvidence.length} batas data, {analysis.hypotheses.length} hipotesis, {analysis.sources.length} sumber.</p></div></div><AnalysisAudit symbol={symbol} traces={analysis.hypotheses} missingEvidence={analysis.missingEvidence} sourceCount={analysis.sources.length} /></section><AnalysisReview symbol={symbol} /></div> : null}
      </section>
    </div>
  );
}
