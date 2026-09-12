import Link from "next/link";
import { AlertTriangle, ChevronDown, PauseCircle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { CausalGraph, MarketEvent, PillarKey, ResearchCase, SymbolCode } from "@/lib/types";
import { AnalysisAudit } from "@/components/analysis-audit";
import { AnalysisReview } from "@/components/analysis-review";
import { CausalChain } from "@/components/causal-chain";
import { CitationDialog } from "@/components/citation-dialog";
import { CompetingHypotheses } from "@/components/competing-hypotheses";
import { EvidenceCard } from "@/components/evidence-card";
import { PriceChart } from "@/components/price-chart";
import { ResearchCaseOverview } from "@/components/research-case-overview";
import { CaseResolutionPanel } from "@/components/case-resolution";
import { cn } from "@/lib/utils";

export type ResearchCaseTab = "case" | "market" | "business" | "hypotheses" | "review";

const tabLabels: Array<{ value: ResearchCaseTab; label: string }> = [
  { value: "case", label: "Case" },
  { value: "market", label: "Market confirmation 3" },
  { value: "business", label: "Business transmission" },
  { value: "hypotheses", label: "Hypotheses" },
  { value: "review", label: "Review" },
];

export function ResearchCaseWorkspace({ analysis, symbol, relatedEvents, causalGraph }: {
  analysis: ResearchCase;
  symbol: SymbolCode;
  relatedEvents: MarketEvent[];
  causalGraph: CausalGraph | null;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ResearchCaseTab | null;
  const activeTab = tabLabels.some((tab) => tab.value === requestedTab) ? requestedTab as ResearchCaseTab : "case";
  const marketPillars = analysis.pillars.filter((item) => item.key !== "catalyst");
  const requestedPillar = searchParams.get("pillar") as PillarKey | null;
  const activePillar = marketPillars.some((item) => item.key === requestedPillar) ? requestedPillar : marketPillars[0]?.key;
  const marketPillar = marketPillars.find((item) => item.key === activePillar) ?? marketPillars[0];
  const catalystPillar = analysis.pillars.find((item) => item.key === "catalyst");

  return (
    <div>
      <nav aria-label="Bagian Research Case" className="sticky top-14 z-30 mb-6 -mx-4 overflow-x-auto border-y border-border bg-background/96 px-4 backdrop-blur sm:-mx-7 sm:px-7 xl:top-0 xl:mx-0 xl:rounded-[10px] xl:border xl:bg-surface xl:px-2">
        <div role="tablist" aria-label="Bagian Research Case" className="flex min-w-max">
          {tabLabels.map((tab) => {
            const active = activeTab === tab.value;
            return <Link key={tab.value} id={`case-tab-${tab.value}`} data-tour-action={tab.value === "market" && symbol === "ANTM" ? "open-market" : tab.value === "business" && symbol === "ANTM" ? "open-business" : tab.value === "hypotheses" && symbol === "ANTM" ? "open-hypotheses" : undefined} role="tab" aria-selected={active} aria-controls={`case-panel-${tab.value}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=${tab.value}`} className={cn("relative flex min-h-12 items-center px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4", active && "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-brand sm:after:inset-x-4")}>{tab.label}</Link>;
          })}
        </div>
      </nav>

      <section id={`case-panel-${activeTab}`} role="tabpanel" aria-labelledby={`case-tab-${activeTab}`} tabIndex={0} className="focus:outline-none">
        {activeTab === "case" ? <ResearchCaseOverview researchCase={analysis} symbol={symbol} /> : null}

        {activeTab === "market" && marketPillar ? <section aria-labelledby="market-confirmation-title">
          <header className="mb-5 max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Layer 01 · observed market behavior</p><h2 id="market-confirmation-title" className="editorial mt-1 text-2xl sm:text-[28px]">Market Confirmation</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Konsentrasi, Volume, dan Momentum menguji apakah perubahan benar-benar terlihat di pasar. Lapisan ini tidak menjelaskan sebab bisnis.</p></header>
          <div role="tablist" aria-label="Market confirmation tests" className="mb-4 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-3">{marketPillars.map((item) => { const active = item.key === marketPillar.key; return <Link key={item.key} role="tab" aria-selected={active} aria-controls={`pillar-panel-${item.key}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=market&pillar=${item.key}`} className={cn("min-w-0 bg-surface px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-surface-raised")}><span className="block truncate text-sm font-medium">{item.label}</span><span className={cn("mt-1 block truncate font-mono text-[10px]", active && "text-primary")}>{item.status}</span></Link>; })}</div>
          <div id={`pillar-panel-${marketPillar.key}`} role="tabpanel" tabIndex={0} className="focus:outline-none"><EvidenceCard pillar={marketPillar} symbol={symbol} /></div>
          <details className="group mt-4 rounded-[10px] border border-border bg-surface"><summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary">Buka timeline 45 hari<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary><div className="border-t border-border p-3"><PriceChart data={analysis.priceSeries} symbol={symbol} events={relatedEvents} /></div></details>
        </section> : null}

        {activeTab === "business" && catalystPillar ? <section aria-labelledby="business-transmission-title" data-tour="business-transmission">
          <header className="mb-5 max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Layer 02 · company transmission</p><h2 id="business-transmission-title" className="editorial mt-1 text-2xl sm:text-[28px]">Business Transmission</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Katalis baru material bila melewati exposure perusahaan dan mencapai observable operasional atau keuangan.</p></header>
          <EvidenceCard pillar={catalystPillar} symbol={symbol} />
          <section aria-labelledby="business-impact-title" className="mt-4 overflow-hidden rounded-[12px] border border-border bg-surface">
            <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5"><div className="max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Business impact test</p><h3 id="business-impact-title" className="editorial mt-1 text-2xl">Where must the effect land?</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">Hubungan yang berhenti pada harga pasar atau sentimen tetap open.</p></div><CitationDialog citations={analysis.financialContext.flatMap((item) => item.citations)} label="Periksa field keuangan" /></header>
            <div className="grid gap-px bg-border md:grid-cols-2">{analysis.businessImpact.map((item) => <article key={item.dimension} className="bg-surface p-4 sm:p-5"><div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-primary">{item.dimension}</p><h4 className="mt-1 text-sm font-semibold">{item.label}</h4></div><span className={cn("rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-wider", item.status === "Primary test" ? "border-primary/40 bg-primary/10 text-primary" : item.status === "Supporting" ? "border-positive/30 text-positive" : "border-border text-muted-foreground")}>{item.status}</span></div><dl className="mt-4 space-y-3 text-xs leading-5"><div><dt className="font-medium">Mechanism</dt><dd className="mt-1 text-muted-foreground">{item.mechanism}</dd></div><div><dt className="font-medium">Expected observable</dt><dd className="mt-1 text-muted-foreground">{item.observable}</dd></div><div><dt className="font-medium">Research implication</dt><dd className="mt-1 text-muted-foreground">{item.implication}</dd></div></dl></article>)}</div>
            <details className="group border-t border-border"><summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary sm:px-5">Financial inputs used by this test</summary><dl className="divide-y divide-border border-t border-border bg-background">{analysis.financialContext.map((item) => <div key={item.label} className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(160px,0.7fr)_minmax(120px,0.45fr)_minmax(0,1.5fr)] sm:items-start sm:px-5"><dt className="text-sm font-medium">{item.label}<span className="mt-1 block font-mono text-[10px] font-normal text-primary">{item.period}</span></dt><dd className="font-mono text-lg font-semibold tabular-nums">{item.value}</dd><dd className="text-sm leading-6 text-muted-foreground">{item.interpretation}</dd></div>)}</dl></details>
          </section>
        </section> : null}

        {activeTab === "hypotheses" ? analysis.clarification.required ? <section className="rounded-[12px] border border-attention/30 bg-attention/7 p-5"><PauseCircle aria-hidden="true" className="size-5 text-attention" /><h2 className="mt-3 text-lg font-semibold">Clarify the mandate first</h2><p className="mt-1 max-w-2xl text-sm leading-6 text-muted-foreground">Competing causes tidak diranking sebelum outcome bisnis dipilih. Kembali ke tab Case dan pilih satu clarification branch.</p><Link href={`/cases/${symbol}`} className="mt-4 inline-flex min-h-10 items-center rounded-md px-3 text-sm font-medium text-primary hover:bg-primary/10">Kembali ke clarification gate</Link></section> : causalGraph ? <div className="space-y-4"><CompetingHypotheses graph={causalGraph} /><CausalChain graph={causalGraph} /></div> : null : null}

        {activeTab === "review" ? <div><CaseResolutionPanel researchCase={analysis} symbol={symbol} /><section className="mb-4 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Audit case"><div className="flex min-w-0 items-start gap-3"><AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0 text-attention" /><div><h2 className="text-sm font-semibold">Audit dan batas bukti</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{analysis.missingEvidence.length} batas data, {analysis.hypotheses.length} hipotesis, {analysis.sources.length} sumber.</p></div></div><AnalysisAudit symbol={symbol} traces={analysis.hypotheses} missingEvidence={analysis.missingEvidence} sourceCount={analysis.sources.length} /></section><AnalysisReview symbol={symbol} /></div> : null}
      </section>
    </div>
  );
}
