import Link from "next/link";
import { GitBranch } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { primarySymbol, WINDOW_SESSIONS } from "@/lib/data/fixtures";
import type { PillarKey, ResearchCase, SymbolCode } from "@/lib/types";
import { AnalysisReview } from "@/components/analysis-review";
import { CaseAuditDetails, CaseDisposition, CaseMemoActions, CaseMonitorQueue } from "@/components/case-verdict";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceCard } from "@/components/evidence-card";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

export type ResearchCaseTab = "market" | "business" | "review";

const tabLabels: Array<{ value: ResearchCaseTab; label: string }> = [
  { value: "market", label: "Pasar" },
  { value: "business", label: "Bisnis" },
  { value: "review", label: "Tinjau" },
];

export function ResearchCaseWorkspace({ analysis, symbol }: {
  analysis: ResearchCase;
  symbol: SymbolCode;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ResearchCaseTab | null;
  const activeTab = tabLabels.some((tab) => tab.value === requestedTab) ? requestedTab as ResearchCaseTab : "market";
  const marketPillars = analysis.pillars.filter((item) => item.key !== "catalyst");
  const requestedPillar = searchParams.get("pillar") as PillarKey | null;
  const activePillar = marketPillars.some((item) => item.key === requestedPillar) ? requestedPillar : marketPillars[0]?.key;
  const marketPillar = marketPillars.find((item) => item.key === activePillar) ?? marketPillars[0];
  const catalystPillar = analysis.pillars.find((item) => item.key === "catalyst");

  return (
    <div>
      <section aria-label="Pertanyaan yang diuji" className="mb-6 overflow-hidden rounded-[12px] border border-border bg-surface px-4 py-4 sm:px-5">
        <p className="text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Pertanyaan yang diuji</span> · {analysis.mandate}</p>
      </section>

      <nav aria-label="Bagian kasus" className="sticky top-14 z-30 mb-6 -mx-4 overflow-x-auto border-y border-border bg-background/96 px-4 backdrop-blur sm:-mx-7 sm:px-7 xl:top-0 xl:mx-0 xl:rounded-[10px] xl:border xl:bg-surface xl:px-2">
        <div role="tablist" aria-label="Bagian kasus" className="flex min-w-max">
          {tabLabels.map((tab) => {
            const active = activeTab === tab.value;
            return <Link key={tab.value} id={`case-tab-${tab.value}`} data-tour-action={tab.value === "market" && symbol === primarySymbol ? "open-market" : tab.value === "business" && symbol === primarySymbol ? "open-business" : undefined} role="tab" aria-selected={active} aria-controls={`case-panel-${tab.value}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=${tab.value}`} className={cn("relative flex min-h-12 items-center px-3 text-[13px] font-medium text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5", active && "text-foreground after:absolute after:inset-x-3 after:bottom-0 after:h-0.5 after:bg-brand sm:after:inset-x-5")}>{tab.label}</Link>;
          })}
        </div>
      </nav>

      <section id={`case-panel-${activeTab}`} role="tabpanel" aria-labelledby={`case-tab-${activeTab}`} tabIndex={0} className="focus:outline-none">
        {activeTab === "market" && marketPillar ? <section aria-labelledby="market-confirmation-title">
          <header className="mb-5 max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Langkah 1 · tanda pasar</p><h2 id="market-confirmation-title" className="editorial mt-1 text-2xl sm:text-[28px]">Konfirmasi pasar</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Periksa apakah konsentrasi, volume, dan momentum ikut berubah. Bagian ini belum menjelaskan penyebabnya.</p><Link href={`/impact?company=${symbol}`} data-tour-action={symbol === primarySymbol ? "open-impact" : undefined} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[6px] border border-primary/35 bg-primary/8 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GitBranch aria-hidden="true" className="size-4" />Buka peta sebab akibat</Link></header> 
          <div role="tablist" aria-label="Pemeriksaan pasar" className="mb-4 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-3">{marketPillars.map((item) => { const active = item.key === marketPillar.key; return <Link key={item.key} role="tab" aria-selected={active} aria-controls={`pillar-panel-${item.key}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=market&pillar=${item.key}`} className={cn("min-w-0 bg-surface px-3 py-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active ? "bg-muted text-foreground" : "text-muted-foreground hover:bg-surface-raised")}><span className="block truncate text-sm font-medium">{item.label}</span><span className={cn("mt-1 block truncate font-mono text-[10px]", active && "text-primary")}>{uiLabel(item.status)}</span></Link>; })}</div>
          <div id={`pillar-panel-${marketPillar.key}`} role="tabpanel" tabIndex={0} className="focus:outline-none"><EvidenceCard pillar={marketPillar} symbol={symbol} /></div>
          <p className="mt-3 text-xs text-muted-foreground">Jejak bukti {WINDOW_SESSIONS} hari sekarang ada di <Link href="/" className="text-primary hover:underline">dashboard</Link>, mode grafik.</p>
        </section> : null}

        {activeTab === "business" && catalystPillar ? <section aria-labelledby="business-transmission-title" data-tour="business-transmission">
          <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between"><div className="max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Langkah 2 · dampak bisnis</p><h2 id="business-transmission-title" className="editorial mt-1 text-2xl sm:text-[28px]">Dampak ke bisnis</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">Periksa apakah pemicu dapat mencapai operasi atau keuangan emiten.</p></div><Link href={`/impact?company=${symbol}`} data-tour-action={symbol === primarySymbol ? "open-impact" : undefined} className="inline-flex min-h-10 shrink-0 items-center gap-2 rounded-[6px] border border-primary/35 bg-primary/8 px-3 text-sm font-medium text-primary transition-colors hover:bg-primary/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><GitBranch aria-hidden="true" className="size-4" />Buka peta sebab akibat</Link></header>
          <EvidenceCard pillar={catalystPillar} symbol={symbol} trailing={<CitationDialog citations={analysis.financialContext.flatMap((item) => item.citations)} label="Periksa data keuangan" />} />
        </section> : null}

        {activeTab === "review" ? <div>
          <AnalysisReview symbol={symbol} />
        </div> : null}
      </section>
    </div>
  );
}