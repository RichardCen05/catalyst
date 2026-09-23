"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { agentEngine } from "@/lib/agent/engine";
import { fuzzyIncludes } from "@/lib/text/fuzzy";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode, AnalysisCase } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriceChange } from "@/components/ui/price-change";
import { IconArrowRight, IconClose, IconSearch } from "@/components/ui/icons";
import { TickerAvatar } from "@/components/ui/ticker-avatar";
import { cn, displayFigure, formatCurrency } from "@/lib/utils";
import { dispositionLabel, uiLabel } from "@/lib/ui-labels";
import { orderByFeedback } from "@/lib/learning";

type CaseHubView = "active" | "picker";

const views: Array<{ value: CaseHubView; label: string }> = [
  { value: "active", label: "Analisis aktif" },
  { value: "picker", label: "Perbandingan emiten" },
];

function ResearchCasesContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view") as CaseHubView | null;
  // Koreksi pengguna, usulan aturan, dan memori hasil hidup di AI Learning —
  // itu memori yang diajarkan pembaca, bukan kasus yang sedang diperiksa.
  const activeView: CaseHubView = views.some((item) => item.value === requested) ? requested as CaseHubView : "active";
  const { profile, playbook, caseStatuses, caseResolutions, insights, feedback, preferences } = useCatalystStore();
  const [query, setQuery] = useState("");
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [selected, setSelected] = useState<Array<SymbolCode | undefined>>(() => {
    const valid = (searchParams.get("compare") ?? "")
      .split(",")
      .map((item) => item.trim().toUpperCase() as SymbolCode)
      .filter((symbol) => companies.some((company) => company.symbol === symbol && company.analyzed))
      .slice(0, 3);
    return [0, 1, 2].map((index) => valid[index]);
  });
  const [cases, setCases] = useState<AnalysisCase[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(profile.watchlist.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: undefined, playbook, userInsights: insights, resolution: caseResolutions[symbol] }))).then((results) => { if (!cancelled) setCases(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profile.watchlist.join(","), playbook, insights, caseResolutions]);
  const activeSymbols = useMemo(() => selected.filter((symbol): symbol is SymbolCode => Boolean(symbol)), [selected]);
  const searchMatches = useMemo(() => {
    const value = query.trim().toLowerCase();
    if (!value || openSlot === null) return [];
    const others = selected.filter((_, index) => index !== openSlot);
    return companies.filter((company) => company.analyzed && !others.includes(company.symbol) && fuzzyIncludes(`${company.symbol} ${company.name} ${company.sector}`, value)).slice(0, 8);
  }, [query, selected, openSlot]);
  const [compared, setCompared] = useState<AnalysisCase[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(activeSymbols.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: undefined, playbook }))).then((results) => { if (!cancelled) setCompared(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbols.join(",")]);
  // The only effect feedback has: evidence marked useful lifts that issuer's
  // case, evidence marked irrelevant sinks it. Nothing about the case itself
  // changes — this is the claim lib/learning.ts makes to the reader.
  const orderedCases = useMemo(
    () => orderByFeedback(cases, feedback, preferences, (item) => item.company.symbol),
    [cases, feedback, preferences],
  );

  const selectSlot = (index: number, symbol: SymbolCode) => { setSelected((current) => current.map((item, itemIndex) => (itemIndex === index ? symbol : item))); setQuery(""); setOpenSlot(null); };
  const removeSlot = (index: number) => setSelected((current) => current.map((item, itemIndex) => (itemIndex === index ? undefined : item)));

  const figureOf = (item: AnalysisCase, pillar: string, label: string) => {
    const value = item.pillars.find((entry) => entry.key === pillar)?.metrics.find((metric) => metric.label === label)?.value;
    return value ? displayFigure(value) : "—";
  };

  const compareRows: Array<{ label: string; render: (item: AnalysisCase) => ReactNode }> = [
    { label: "Harga saham", render: (item) => <span className="flex items-center gap-2"><span className="font-mono tabular-nums">{formatCurrency(item.company.price)}</span><PriceChange value={item.company.changePct} className="text-xs" /></span> },
    { label: "Status bukti", render: (item) => <StatusBadge status={item.evidenceState} /> },
    { label: "Uji bisnis utama", render: (item) => item.businessImpact.find((impact) => impact.status === "Primary test")?.label ?? "—" },
    { label: "Konsentrasi (HHI)", render: (item) => figureOf(item, "concentration", "HHI") },
    { label: "Volume (skor z)", render: (item) => figureOf(item, "volume", "Skor z tahan pencilan") },
    { label: "Residual vs IHSG", render: (item) => figureOf(item, "momentum", "Residual setelah beta") },
    { label: "Imbal hasil sektor", render: (item) => figureOf(item, "momentum", "Imbal hasil sektor") },
    { label: "Materialitas", render: (item) => `${uiLabel(item.priority.materiality)} · ${item.priority.reason}` },
    { label: "Tantangan utama", render: (item) => item.counterEvidence[0] },
  ];

  return (
    <div data-tour="research-cases">
      <PageHeader title="Riset & Analisis" description="Perubahan yang perlu diperiksa. Setiap kasus menghubungkan pemicu, bukti pasar, dampak bisnis, dan tindakan riset." />

      <nav aria-label="Bagian kasus" className="mb-6 flex min-w-0 gap-6 overflow-x-auto border-b border-border">
        {views.map((item) => <Link key={item.value} href={item.value === "active" ? "/cases" : `/cases?view=${item.value}`} aria-current={activeView === item.value ? "page" : undefined} className={cn("relative -mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-subtle-foreground transition-colors hover:text-foreground", activeView === item.value && "border-foreground text-foreground")}>{item.label}</Link>)}
      </nav>

      {activeView === "active" ? <div className="overflow-hidden rounded-lg border border-border">
        <div aria-hidden="true" className="hidden grid-cols-[200px_minmax(0,1fr)_120px_150px_140px_110px_20px] gap-4 border-b border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid"><span>Emiten</span><span>Pemicu</span><span>Materialitas</span><span>Status bukti</span><span>Tindakan</span><span className="text-right">Harga</span><span /></div>
        <ul className="divide-y divide-border">
          {orderedCases.map((analysis) => {
            const status = caseStatuses[analysis.company.symbol] ?? analysis.status;
            const materiality = uiLabel(analysis.priority.materiality);
            return <li key={analysis.company.symbol}><Link href={`/cases/${analysis.company.symbol}`} className="grid gap-3 px-4 py-4 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[200px_minmax(0,1fr)_120px_150px_140px_110px_20px] lg:items-start lg:gap-4">
              <span className="min-w-0"><strong className="block text-base font-semibold">{analysis.company.symbol}</strong><span className="block truncate text-xs text-subtle-foreground">{analysis.company.name}</span></span>
              <span className="min-w-0"><span className="block text-sm font-medium">{analysis.trigger.title}</span><span className="mt-1 line-clamp-2 block text-xs text-subtle-foreground">{analysis.materialChange.baseline}</span></span>
              <span className="flex flex-wrap gap-1.5"><span className={cn("inline-flex h-6 items-center rounded-lg border px-2 text-xs font-medium", analysis.priority.materiality === "High" ? "border-foreground" : "border-border text-muted-foreground")}>{materiality}</span>{status === "closed" ? <span className="inline-flex h-6 items-center rounded-lg border border-border px-2 text-xs font-medium text-muted-foreground">Selesai</span> : null}</span>
              <span><StatusBadge status={analysis.evidenceState} /></span>
              <span className="text-sm font-medium">{dispositionLabel(analysis.researchDisposition.kind)}</span>
              <span className="flex items-center gap-2 lg:flex-col lg:items-end lg:gap-0.5"><span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(analysis.company.price)}</span><PriceChange value={analysis.company.changePct} className="text-xs" /></span>
              <IconArrowRight aria-hidden="true" className="hidden size-4 self-center text-subtle-foreground lg:block" />
            </Link></li>;
          })}
        </ul>
      </div> : null}

      {activeView === "picker" ? <div>
        <Panel className="overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="editorial text-xl">Bandingkan bukti, bukan skor</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih kolom emiten untuk menambah atau mengganti, hingga tiga emiten berkasus lengkap.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] table-fixed text-left text-xs">
              <colgroup><col className="w-40" />{selected.map((_, index) => <col key={index} className="w-[calc((100%-10rem)/3)]" />)}</colgroup>
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 align-bottom">Pemeriksaan</th>
                  {selected.map((symbol, index) => <th key={index} className="px-4 py-3 align-bottom font-normal">
                    {openSlot === index ? <div className="relative">
                      <label className="relative block">
                        <IconSearch aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
                        <span className="sr-only">Cari emiten untuk kolom {index + 1}</span>
                        <input
                          autoFocus
                          value={query}
                          onChange={(event) => setQuery(event.target.value)}
                          onBlur={() => setOpenSlot(null)}
                          placeholder="Cari emiten"
                          className="h-9 w-full rounded-lg border border-primary bg-surface pl-8 pr-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring/25"
                        />
                      </label>
                      {query.trim() ? <div className="absolute z-10 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-border bg-surface text-left shadow-lg">
                        {searchMatches.length ? searchMatches.map((company) => <button key={company.symbol} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectSlot(index, company.symbol)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"><TickerAvatar symbol={company.symbol} size="sm" /><span className="font-mono font-semibold text-primary">{company.symbol}</span><span className="truncate text-muted-foreground">{company.name}</span></button>) : <p className="px-3 py-2 text-xs text-muted-foreground">Tidak ada emiten cocok.</p>}
                      </div> : null}
                    </div> : symbol ? <div className="flex items-center gap-1.5">
                      <TickerAvatar symbol={symbol} size="sm" />
                      <button type="button" onClick={() => { setOpenSlot(index); setQuery(""); }} className="font-mono text-sm font-semibold text-primary hover:underline">{symbol}</button>
                      <button type="button" onClick={() => removeSlot(index)} aria-label={`Hapus ${symbol} dari perbandingan`} className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><IconClose aria-hidden="true" className="size-3" /></button>
                    </div> : <button type="button" onClick={() => { setOpenSlot(index); setQuery(""); }} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"><IconSearch aria-hidden="true" className="size-3" />Tambah emiten</button>}
                  </th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compareRows.map((row) => <tr key={row.label}>
                  <th className="px-4 py-3 align-top font-medium">{row.label}</th>
                  {selected.map((symbol, index) => {
                    const item = symbol ? compared.find((entry) => entry.company.symbol === symbol) : undefined;
                    return <td key={index} className="px-4 py-3 align-top">{item ? row.render(item) : <span className="text-muted-foreground">—</span>}</td>;
                  })}
                </tr>)}
              </tbody>
            </table>
          </div>
        </Panel>
      </div> : null}
    </div>
  );
}

export default function ResearchCasesPage() {
  return <Suspense fallback={<Panel className="h-72 shimmer" aria-label="Memuat kasus" />}><ResearchCasesContent /></Suspense>;
}