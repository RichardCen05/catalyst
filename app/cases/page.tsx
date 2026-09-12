"use client";

import { Suspense, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { ArrowRight, BookOpenCheck, BriefcaseBusiness, ClipboardCheck, ExternalLink, Search, Trash2 } from "lucide-react";
import { agentEngine } from "@/lib/agent/engine";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { CaseResolution, SymbolCode } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn, formatCurrency } from "@/lib/utils";

type CaseHubView = "active" | "picker" | "audit";

const views: Array<{ value: CaseHubView; label: string }> = [
  { value: "active", label: "Active cases" },
  { value: "picker", label: "Case picker" },
  { value: "audit", label: "Audit" },
];

function ResearchCasesContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view") as CaseHubView | null;
  const activeView = views.some((item) => item.value === requested) ? requested as CaseHubView : "active";
  const { profile, playbook, caseMandates, caseStatuses, caseResolutions, insights, setInsightStatus, removeInsight } = useCatalystStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SymbolCode[]>(() => (searchParams.get("compare") ?? "")
    .split(",")
    .map((item) => item.toUpperCase() as SymbolCode)
    .filter((symbol) => companies.some((company) => company.symbol === symbol && company.analyzed))
    .slice(0, 3));
  const cases = profile.watchlist
    .map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], playbook, userInsights: insights, resolution: caseResolutions[symbol] }))
    .filter((item) => item !== null);
  const filteredCompanies = useMemo(() => {
    const value = query.trim().toLowerCase();
    return companies.filter((company) => !value || `${company.symbol} ${company.name} ${company.sector}`.toLowerCase().includes(value));
  }, [query]);
  const compared = selected.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], playbook })).filter((item) => item !== null);
  const resolutions = Object.entries(caseResolutions).filter((entry): entry is [SymbolCode, CaseResolution] => Boolean(entry[1]));

  const toggleCompare = (symbol: SymbolCode) => setSelected((current) => current.includes(symbol)
    ? current.filter((item) => item !== symbol)
    : current.length < 3 ? [...current, symbol] : current);

  return (
    <div data-tour="research-cases">
      <PageHeader eyebrow="Research Cases" title="Investigate material change" description="For discretionary event-driven IDX investors reviewing a 10–30 name watchlist. Open a case, compare an explanation, then preserve the lesson." />

      <nav aria-label="Research Case hub" className="mb-4 flex min-w-0 overflow-x-auto border-b border-border">
        {views.map((item) => <Link key={item.value} href={item.value === "active" ? "/cases" : `/cases?view=${item.value}`} aria-current={activeView === item.value ? "page" : undefined} className={cn("relative flex min-h-11 shrink-0 items-center px-4 text-xs font-medium text-muted-foreground", activeView === item.value && "text-foreground after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-brand")}>{item.label}{item.value === "audit" && insights.filter((entry) => entry.status === "pending").length ? <span className="ml-2 rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] text-attention-foreground">{insights.filter((entry) => entry.status === "pending").length}</span> : null}</Link>)}
      </nav>

      {activeView === "active" ? <Panel>
        <div className="divide-y divide-border">
          {cases.map((analysis) => {
            const status = caseStatuses[analysis.company.symbol] ?? analysis.status;
            return <Link key={analysis.company.symbol} href={`/cases/${analysis.company.symbol}`} className="grid min-h-28 gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><BriefcaseBusiness aria-hidden="true" className="size-4.5" /></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="font-mono text-sm">{analysis.company.symbol}</strong><span className="text-sm font-medium">{analysis.trigger.title}</span><span className="rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{analysis.priority.materiality}</span><span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", status === "closed" ? "border-positive/30 text-positive" : "border-border text-muted-foreground")}>{status}</span></span><span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{analysis.thesis}</span>{analysis.priority.ruleTrace[0] ? <span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-primary">Rule · {analysis.priority.ruleTrace[0].rule}</span> : null}</span><span className="flex items-center gap-3"><StatusBadge status={analysis.evidenceState} /><ArrowRight aria-hidden="true" className="size-4 text-primary" /></span></Link>;
          })}
        </div>
      </Panel> : null}

      {activeView === "picker" ? <div>
        <Panel className="overflow-hidden">
          <div className="border-b border-border p-4"><label className="relative block max-w-lg"><Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Search company or sector</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Search ticker, company, or sector" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" /></label><p className="mt-2 text-xs text-muted-foreground">Open one case or select 2–3 analyzed companies for an inline evidence comparison.</p></div>
          <div className="divide-y divide-border">{filteredCompanies.map((company) => <div key={company.symbol} className="grid gap-3 px-4 py-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center"><input type="checkbox" checked={selected.includes(company.symbol)} onChange={() => toggleCompare(company.symbol)} disabled={!company.analyzed || (!selected.includes(company.symbol) && selected.length >= 3)} aria-label={`Select ${company.symbol} for inline comparison`} className="size-4 cursor-pointer accent-[var(--primary)]" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold text-primary">{company.symbol}</span><span className="text-sm font-medium">{company.name}</span><span className="font-mono text-[9px] text-muted-foreground">{company.sector}</span></div><p className="mt-1 text-xs text-muted-foreground">{company.analyzed ? company.summary : "Snapshot available; full Research Case has not been prepared."}</p></div><div className="flex items-center gap-3"><span className="font-mono text-xs">{formatCurrency(company.price).replace("Rp", "Rp ")}</span>{company.analyzed ? <Link href={`/cases/${company.symbol}`} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Open case</Link> : <span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Snapshot only</span>}</div></div>)}</div>
        </Panel>

        {compared.length >= 2 ? <section aria-labelledby="inline-compare-title" className="mt-4 overflow-hidden rounded-[12px] border border-border bg-surface"><header className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Inline comparison</p><h2 id="inline-compare-title" className="editorial mt-1 text-2xl">Compare explanations, not scores</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="border-b border-border bg-background"><tr><th className="px-4 py-3">Test</th>{compared.map((item) => <th key={item.company.symbol} className="px-4 py-3 font-mono text-primary">{item.company.symbol}</th>)}</tr></thead><tbody className="divide-y divide-border"><tr><th className="px-4 py-3 font-medium">Evidence state</th>{compared.map((item) => <td key={item.company.symbol} className="px-4 py-3"><StatusBadge status={item.evidenceState} /></td>)}</tr><tr><th className="px-4 py-3 font-medium">Primary business test</th>{compared.map((item) => <td key={item.company.symbol} className="px-4 py-3">{item.businessImpact.find((impact) => impact.status === "Primary test")?.label}</td>)}</tr><tr><th className="px-4 py-3 font-medium">Main challenge</th>{compared.map((item) => <td key={item.company.symbol} className="px-4 py-3 leading-5 text-muted-foreground">{item.counterEvidence[0]}</td>)}</tr></tbody></table></div></section> : null}
      </div> : null}

      {activeView === "audit" ? <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Panel>
          <div className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Human review queue</p><h2 className="editorial mt-1 text-2xl">Corrections to verify</h2></div>
          {insights.length ? <div className="divide-y divide-border">{insights.map((insight) => <article key={insight.id} className="p-4"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{insight.symbol}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{insight.pillar ?? "general"}</span><span className="rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{insight.status}</span></div><p className="mt-2 text-sm leading-6">{insight.note}</p>{insight.sourceUrl ? <a href={insight.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline">Open user reference<ExternalLink aria-hidden="true" className="size-3" /></a> : null}<div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => setInsightStatus(insight.id, insight.status === "pending" ? "incorporated" : "pending")}>{insight.status === "pending" ? "Mark verified" : "Return to queue"}</Button><Button variant="ghost" size="sm" onClick={() => setInsightStatus(insight.id, "dismissed")}>Dismiss</Button><Button variant="ghost" size="icon" onClick={() => removeInsight(insight.id)} aria-label={`Delete note ${insight.symbol}`} className="ml-auto text-danger"><Trash2 aria-hidden="true" className="size-4" /></Button></div></article>)}</div> : <div className="p-6 text-sm text-muted-foreground">No correction is waiting for verification.</div>}
        </Panel>

        <div className="space-y-4">
          <Panel><div className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Closed-case lessons</p><h2 className="editorial mt-1 text-2xl">Resolution memory</h2></div>{resolutions.length ? <div className="divide-y divide-border">{resolutions.map(([symbol, resolution]) => <article key={symbol} className="p-4"><div className="flex items-center gap-2"><ClipboardCheck aria-hidden="true" className="size-4 text-positive" /><span className="font-mono text-xs font-semibold">{symbol}</span><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{resolution.outcome}</span></div><p className="mt-2 text-sm leading-6">{resolution.reusableRule}</p><Link href={`/cases/${symbol}?tab=review`} className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-primary">Open resolution</Link></article>)}</div> : <div className="p-5 text-sm leading-6 text-muted-foreground">Close a case with a resolution to build reusable research memory.</div>}</Panel>
          <Panel className="p-4"><BookOpenCheck aria-hidden="true" className="size-5 text-primary" /><h2 className="mt-3 text-sm font-semibold">Research judgment remains explicit</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Comparables, materiality, exposure, trusted sources, and falsifiers live in one Playbook.</p><Link href="/playbook" className="mt-3 inline-flex min-h-9 items-center text-xs font-medium text-primary">Open Investor Research Playbook</Link></Panel>
        </div>
      </div> : null}
    </div>
  );
}

export default function ResearchCasesPage() {
  return <Suspense fallback={<Panel className="h-72 animate-pulse bg-muted" aria-label="Loading Research Cases" />}><ResearchCasesContent /></Suspense>;
}
