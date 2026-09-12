import Link from "next/link";
import { AlertTriangle } from "lucide-react";
import { useSearchParams } from "next/navigation";
import type { MarketEvent, PillarKey, ResearchCase, SymbolCode } from "@/lib/types";
import { AnalysisAudit } from "@/components/analysis-audit";
import { AnalysisReview } from "@/components/analysis-review";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceCard } from "@/components/evidence-card";
import { PriceChart } from "@/components/price-chart";
import { ResearchCaseOverview } from "@/components/research-case-overview";
import { CaseResolutionPanel } from "@/components/case-resolution";
import { cn } from "@/lib/utils";

export type ResearchCaseTab = "case" | "evidence" | "timeline" | "business" | "review";

const tabLabels: Array<{ value: ResearchCaseTab; label: string }> = [
  { value: "case", label: "Case" },
  { value: "evidence", label: "Evidence 4" },
  { value: "timeline", label: "Timeline 3" },
  { value: "business", label: "Business impact" },
  { value: "review", label: "Review" },
];

export function ResearchCaseWorkspace({
  analysis,
  symbol,
  relatedEvents,
}: {
  analysis: ResearchCase;
  symbol: SymbolCode;
  relatedEvents: MarketEvent[];
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ResearchCaseTab | null;
  const activeTab = tabLabels.some((tab) => tab.value === requestedTab) ? requestedTab as ResearchCaseTab : "case";
  const requestedPillar = searchParams.get("pillar") as PillarKey | null;
  const activePillar = analysis.pillars.some((item) => item.key === requestedPillar) ? requestedPillar as PillarKey : undefined;
  const pillar = analysis.pillars.find((item) => item.key === activePillar) ?? analysis.pillars[0];

  return (
    <div>
      <nav aria-label="Bagian Research Case" className="sticky top-14 z-30 mb-6 -mx-4 overflow-x-auto border-y border-border bg-background/96 px-4 backdrop-blur sm:-mx-7 sm:px-7 xl:top-0 xl:mx-0 xl:rounded-[10px] xl:border xl:bg-surface xl:px-2">
        <div role="tablist" aria-label="Bagian Research Case" className="flex min-w-max">
          {tabLabels.map((tab) => {
            const active = activeTab === tab.value;
            return (
              <Link
                key={tab.value}
                id={`case-tab-${tab.value}`}
                data-tour-action={tab.value === "evidence" && symbol === "ANTM" ? "open-evidence" : undefined}
                role="tab"
                aria-selected={active}
                aria-controls={`case-panel-${tab.value}`}
                tabIndex={active ? 0 : -1}
                href={`/cases/${symbol}?tab=${tab.value}`}
                className={cn(
                  "relative flex min-h-12 items-center px-2 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-4",
                  active && "text-foreground after:absolute after:inset-x-2 after:bottom-0 after:h-0.5 after:bg-brand sm:after:inset-x-4",
                )}
              >
                {tab.label}
              </Link>
            );
          })}
        </div>
      </nav>

      <section id={`case-panel-${activeTab}`} role="tabpanel" aria-labelledby={`case-tab-${activeTab}`} tabIndex={0} className="focus:outline-none">
        {activeTab === "case" ? <ResearchCaseOverview researchCase={analysis} symbol={symbol} /> : null}

        {activeTab === "evidence" ? (
          <section aria-labelledby="pillars-title">
            <header className="mb-5 max-w-2xl">
              <h2 id="pillars-title" className="editorial text-2xl sm:text-[28px]">Empat protokol uji</h2>
              <p className="mt-2 text-sm leading-6 text-muted-foreground">Satu pilar ditampilkan per waktu. Setiap tab memuat klaim, bukti penyangkal, rumus, dan sumber.</p>
            </header>
            <div role="tablist" aria-label="Pilar analisis" className="mb-4 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-4">
              {analysis.pillars.map((item) => {
                const active = item.key === pillar.key;
                return (
                  <Link
                    key={item.key}
                    role="tab"
                    aria-selected={active}
                    aria-controls={`pillar-panel-${item.key}`}
                    tabIndex={active ? 0 : -1}
                    href={`/cases/${symbol}?tab=evidence&pillar=${item.key}`}
                    className={cn("min-w-0 bg-surface px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-surface-raised")}
                  >
                    <span className="block truncate text-sm font-medium">{item.label}</span>
                    <span className={cn("mt-1 block truncate font-mono text-[10px]", active && "text-primary")}>{item.status}</span>
                  </Link>
                );
              })}
            </div>
            <div id={`pillar-panel-${pillar.key}`} role="tabpanel" tabIndex={0} className="focus:outline-none">
              <EvidenceCard pillar={pillar} symbol={symbol} />
            </div>
          </section>
        ) : null}

        {activeTab === "timeline" ? <PriceChart data={analysis.priceSeries} symbol={symbol} events={relatedEvents} /> : null}

        {activeTab === "business" ? (
          <section aria-labelledby="business-impact-title" className="overflow-hidden rounded-[12px] border border-border bg-surface">
            <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
              <div className="max-w-2xl">
                <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Cross-pillar protocol</p>
                <h2 id="business-impact-title" className="editorial mt-1 text-2xl">Business Impact Test</h2>
                <p className="mt-2 text-sm leading-6 text-muted-foreground">Setiap jalur harus mencapai satu outcome bisnis yang dapat diamati. Hubungan yang berhenti pada harga atau sentimen tetap open.</p>
              </div>
              <CitationDialog citations={analysis.financialContext.flatMap((item) => item.citations)} label="Periksa field keuangan" />
            </header>
            <div className="grid gap-px bg-border md:grid-cols-2">
              {analysis.businessImpact.map((item) => (
                <article key={item.dimension} className="bg-surface p-4 sm:p-5">
                  <div className="flex items-start justify-between gap-3"><div><p className="font-mono text-[10px] text-primary">{item.dimension}</p><h3 className="mt-1 text-sm font-semibold">{item.label}</h3></div><span className={cn("rounded border px-2 py-1 font-mono text-[9px] uppercase tracking-wider", item.status === "Primary test" ? "border-primary/40 bg-primary/10 text-primary" : item.status === "Supporting" ? "border-positive/30 text-positive" : "border-border text-muted-foreground")}>{item.status}</span></div>
                  <dl className="mt-4 space-y-3 text-xs leading-5"><div><dt className="font-medium">Mechanism</dt><dd className="mt-1 text-muted-foreground">{item.mechanism}</dd></div><div><dt className="font-medium">Expected observable</dt><dd className="mt-1 text-muted-foreground">{item.observable}</dd></div><div><dt className="font-medium">Research implication</dt><dd className="mt-1 text-muted-foreground">{item.implication}</dd></div></dl>
                </article>
              ))}
            </div>
            <details className="group border-t border-border"><summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary sm:px-5">Financial inputs used by this test</summary><dl className="divide-y divide-border border-t border-border bg-background">{analysis.financialContext.map((item) => <div key={item.label} className="grid gap-2 px-4 py-4 sm:grid-cols-[minmax(160px,0.7fr)_minmax(120px,0.45fr)_minmax(0,1.5fr)] sm:items-start sm:px-5"><dt className="text-sm font-medium">{item.label}<span className="mt-1 block font-mono text-[10px] font-normal text-primary">{item.period}</span></dt><dd className="font-mono text-lg font-semibold tabular-nums">{item.value}</dd><dd className="text-sm leading-6 text-muted-foreground">{item.interpretation}</dd></div>)}</dl></details>
          </section>
        ) : null}

        {activeTab === "review" ? (
          <div>
            <CaseResolutionPanel researchCase={analysis} symbol={symbol} />
            <section className="mb-4 flex flex-col gap-3 border-y border-border py-4 sm:flex-row sm:items-center sm:justify-between" aria-label="Audit case">
              <div className="flex min-w-0 items-start gap-3">
                <AlertTriangle aria-hidden="true" className="mt-1 size-4 shrink-0 text-attention" />
                <div><h2 className="text-sm font-semibold">Audit dan batas bukti</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">{analysis.missingEvidence.length} batas data, {analysis.hypotheses.length} hipotesis, {analysis.sources.length} sumber.</p></div>
              </div>
              <AnalysisAudit symbol={symbol} traces={analysis.hypotheses} missingEvidence={analysis.missingEvidence} sourceCount={analysis.sources.length} />
            </section>
            <AnalysisReview symbol={symbol} />
          </div>
        ) : null}
      </section>
    </div>
  );
}
