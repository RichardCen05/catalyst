"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { agentEngine } from "@/lib/agent/engine";
import { fuzzyIncludes } from "@/lib/text/fuzzy";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { CaseResolution, SymbolCode, AnalysisCase } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconArrowRight, IconCheck, IconClose, IconCompanies, IconExternal, IconNote, IconSearch, IconTrash } from "@/components/ui/icons";
import { cn } from "@/lib/utils";
import { dispositionLabel, uiLabel } from "@/lib/ui-labels";

type CaseHubView = "active" | "picker" | "audit";

const views: Array<{ value: CaseHubView; label: string }> = [
  { value: "active", label: "Kasus aktif" },
  { value: "picker", label: "Bandingkan emiten" },
  { value: "audit", label: "Audit" },
];

function ResearchCasesContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view") as CaseHubView | null;
  const activeView = views.some((item) => item.value === requested) ? requested as CaseHubView : "active";
  const { profile, playbook, caseMandates, caseClarifications, caseStatuses, caseResolutions, insights, ruleProposals, setInsightStatus, setRuleProposalStatus, removeInsight } = useCatalystStore();
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
    void Promise.all(profile.watchlist.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], clarificationChoice: caseClarifications[symbol], playbook, userInsights: insights, resolution: caseResolutions[symbol] }))).then((results) => { if (!cancelled) setCases(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profile.watchlist.join(","), caseMandates, caseClarifications, playbook, insights, caseResolutions]);
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
    void Promise.all(activeSymbols.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], clarificationChoice: caseClarifications[symbol], playbook }))).then((results) => { if (!cancelled) setCompared(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbols.join(",")]);
  const resolutions = Object.entries(caseResolutions).filter((entry): entry is [SymbolCode, CaseResolution] => Boolean(entry[1]));

  const selectSlot = (index: number, symbol: SymbolCode) => { setSelected((current) => current.map((item, itemIndex) => (itemIndex === index ? symbol : item))); setQuery(""); setOpenSlot(null); };
  const removeSlot = (index: number) => setSelected((current) => current.map((item, itemIndex) => (itemIndex === index ? undefined : item)));

  const compareRows: Array<{ label: string; render: (item: AnalysisCase) => ReactNode }> = [
    { label: "Status bukti", render: (item) => <StatusBadge status={item.evidenceState} /> },
    { label: "Uji bisnis utama", render: (item) => item.businessImpact.find((impact) => impact.status === "Primary test")?.label ?? "—" },
    { label: "Konsentrasi (HHI)", render: (item) => item.pillars.find((pillar) => pillar.key === "concentration")?.metrics.find((metric) => metric.label === "HHI")?.value ?? "—" },
    { label: "Volume (skor z)", render: (item) => item.pillars.find((pillar) => pillar.key === "volume")?.metrics.find((metric) => metric.label === "Skor z tahan pencilan")?.value ?? "—" },
    { label: "Residual vs IHSG", render: (item) => item.pillars.find((pillar) => pillar.key === "momentum")?.metrics.find((metric) => metric.label === "Residual setelah beta")?.value ?? "—" },
    { label: "Imbal hasil sektor", render: (item) => item.pillars.find((pillar) => pillar.key === "momentum")?.metrics.find((metric) => metric.label === "Imbal hasil sektor")?.value ?? "—" },
    { label: "Materialitas", render: (item) => `${uiLabel(item.priority.materiality)} · ${item.priority.reason}` },
    { label: "Tantangan utama", render: (item) => item.counterEvidence[0] },
  ];

  return (
    <div data-tour="research-cases">
      <PageHeader eyebrow="Kasus riset" title="Periksa satu perubahan penting" description="Setiap kasus menghubungkan pemicu, bukti pasar, dampak bisnis, dan tindakan riset." />

      <nav aria-label="Bagian kasus" className="mb-4 flex min-w-0 overflow-x-auto border-b border-border">
        {views.map((item) => <Link key={item.value} href={item.value === "active" ? "/cases" : `/cases?view=${item.value}`} aria-current={activeView === item.value ? "page" : undefined} className={cn("relative flex min-h-11 shrink-0 items-center px-4 text-xs font-medium text-muted-foreground", activeView === item.value && "text-foreground after:absolute after:inset-x-4 after:bottom-0 after:h-0.5 after:bg-brand")}>{item.label}{item.value === "audit" && insights.filter((entry) => entry.status === "pending").length ? <span className="ml-2 rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] text-attention-foreground">{insights.filter((entry) => entry.status === "pending").length}</span> : null}</Link>)}
      </nav>

      {activeView === "active" ? <Panel>
        <div className="divide-y divide-border">
          {cases.map((analysis) => {
            const status = caseStatuses[analysis.company.symbol] ?? analysis.status;
            const openCount = analysis.unresolvedQuestions.length;
            return <Link key={analysis.company.symbol} href={`/cases/${analysis.company.symbol}`} className="grid min-h-28 gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center"><span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><IconCompanies aria-hidden="true" className="size-4.5" /></span><span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="font-mono text-sm">{analysis.company.symbol}</strong><span className="text-sm font-medium">{analysis.trigger.title}</span><span className="rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{uiLabel(analysis.priority.materiality)}</span><span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", status === "closed" ? "border-positive/30 text-positive" : "border-border text-muted-foreground")}>{status === "closed" ? "Selesai" : "Terbuka"}</span>{status !== "closed" && openCount ? <span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{openCount} pertanyaan terbuka</span> : null}</span><span className="mt-1 line-clamp-1 block text-xs leading-5 text-muted-foreground">{analysis.materialChange.baseline}</span><span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-primary">Tindakan · {dispositionLabel(analysis.researchDisposition.kind)}</span></span><span className="flex items-center gap-3"><StatusBadge status={analysis.evidenceState} /><IconArrowRight aria-hidden="true" className="size-4 text-primary" /></span></Link>;
          })}
        </div>
      </Panel> : null}

      {activeView === "picker" ? <div>
        <Panel className="overflow-hidden">
          <div className="border-b border-border p-4">
            <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Perbandingan</p>
            <h2 className="editorial mt-1 text-2xl">Bandingkan bukti, bukan skor</h2>
            <p className="mt-1 text-xs text-muted-foreground">Klik kolom emiten di bawah untuk menambah atau mengganti hingga tiga emiten.</p>
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
                          className="h-9 w-full rounded-md border border-primary bg-surface pl-8 pr-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring/25"
                        />
                      </label>
                      {query.trim() ? <div className="absolute z-10 mt-1 max-h-56 w-56 overflow-y-auto rounded-lg border border-border bg-surface text-left shadow-lg">
                        {searchMatches.length ? searchMatches.map((company) => <button key={company.symbol} type="button" onMouseDown={(event) => event.preventDefault()} onClick={() => selectSlot(index, company.symbol)} className="flex w-full items-center gap-2 px-3 py-2 text-left text-xs hover:bg-muted/50"><span className="font-mono font-semibold text-primary">{company.symbol}</span><span className="truncate text-muted-foreground">{company.name}</span></button>) : <p className="px-3 py-2 text-[11px] text-muted-foreground">Tidak ada emiten cocok.</p>}
                      </div> : null}
                    </div> : symbol ? <div className="flex items-center gap-1.5">
                      <button type="button" onClick={() => { setOpenSlot(index); setQuery(""); }} className="font-mono text-sm font-semibold text-primary hover:underline">{symbol}</button>
                      <button type="button" onClick={() => removeSlot(index)} aria-label={`Hapus ${symbol} dari perbandingan`} className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><IconClose aria-hidden="true" className="size-3" /></button>
                    </div> : <button type="button" onClick={() => { setOpenSlot(index); setQuery(""); }} className="inline-flex items-center gap-1.5 font-mono text-[11px] uppercase tracking-wider text-muted-foreground hover:text-primary"><IconSearch aria-hidden="true" className="size-3" />Tambah emiten</button>}
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

      {activeView === "audit" ? <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Panel>
          <div className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Antrean pemeriksaan</p><h2 className="editorial mt-1 text-2xl">Koreksi yang perlu diperiksa</h2></div>
          {insights.length ? <div className="divide-y divide-border">{insights.map((insight) => <article key={insight.id} className="p-4"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{insight.symbol}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{insight.pillar ? uiLabel(insight.pillar) : "Umum"}</span><span className="rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{insight.status === "pending" ? "menunggu" : insight.status === "incorporated" ? "diperiksa" : "diabaikan"}</span></div><p className="mt-2 text-sm leading-6">{insight.note}</p>{insight.sourceUrl ? <a href={insight.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline">Buka referensi pengguna<IconExternal aria-hidden="true" className="size-3.5" /></a> : null}<div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => setInsightStatus(insight.id, insight.status === "pending" ? "incorporated" : "pending")}>{insight.status === "pending" ? "Tandai sudah diperiksa" : "Kembalikan ke antrean"}</Button><Button variant="ghost" size="sm" onClick={() => setInsightStatus(insight.id, "dismissed")}>Abaikan</Button><Button variant="ghost" size="icon" onClick={() => removeInsight(insight.id)} aria-label={`Hapus catatan ${insight.symbol}`} className="ml-auto text-danger"><IconTrash aria-hidden="true" className="size-4" /></Button></div></article>)}</div> : <div className="p-6 text-sm text-muted-foreground">Tidak ada koreksi yang menunggu pemeriksaan.</div>}
        </Panel>

        <div className="space-y-4">
          <Panel><div className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Usulan dari asisten</p><h2 className="editorial mt-1 text-2xl">Usulan aturan</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Hasil kasus tidak otomatis mengubah aturan riset. Anda harus menerima atau menolak usulan.</p></div>{ruleProposals.length ? <div className="divide-y divide-border">{ruleProposals.map((proposal) => <article key={proposal.id} className="p-4"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{proposal.symbol}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{proposal.kind === "materiality" ? "materialitas" : "kondisi pembatal"}</span><span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", proposal.status === "accepted" ? "border-positive/30 text-positive" : proposal.status === "rejected" ? "border-danger/30 text-danger" : "border-attention/30 text-attention-foreground")}>{proposal.status === "accepted" ? "diterima" : proposal.status === "rejected" ? "ditolak" : "menunggu"}</span></div><p className="mt-2 text-sm leading-6">{proposal.rule}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Bukti: {proposal.evidence}</p>{proposal.status === "pending" ? <div className="mt-3 flex gap-2"><Button size="sm" onClick={() => setRuleProposalStatus(proposal.id, "accepted")}><IconCheck aria-hidden="true" className="size-3.5" />Terima aturan</Button><Button variant="ghost" size="sm" onClick={() => setRuleProposalStatus(proposal.id, "rejected")}><IconClose aria-hidden="true" className="size-3.5" />Tolak</Button></div> : null}</article>)}</div> : <div className="p-5 text-sm leading-6 text-muted-foreground">Tutup kasus dengan pelajaran yang dapat dipakai ulang. Catalyst hanya akan mengusulkan aturan.</div>}</Panel>
          <Panel><div className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Pelajaran kasus</p><h2 className="editorial mt-1 text-2xl">Memori hasil</h2></div>{resolutions.length ? <div className="divide-y divide-border">{resolutions.map(([symbol, resolution]) => <article key={symbol} className="p-4"><div className="flex items-center gap-2"><IconCheck aria-hidden="true" className="size-4 text-positive" /><span className="font-mono text-xs font-semibold">{symbol}</span><span className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{resolution.outcome === "supported" ? "mendukung" : resolution.outcome === "challenged" ? "terbantahkan" : "terbuka"}</span></div><p className="mt-2 text-sm leading-6">{resolution.reusableRule}</p><Link href={`/cases/${symbol}?tab=review`} className="mt-2 inline-flex min-h-8 items-center text-xs font-medium text-primary">Buka hasil</Link></article>)}</div> : <div className="p-5 text-sm leading-6 text-muted-foreground">Tutup kasus untuk membangun memori riset yang dapat dipakai ulang.</div>}</Panel>
          <Panel className="p-4"><IconNote aria-hidden="true" className="size-5 text-primary" /><h2 className="mt-3 text-sm font-semibold">Penilaian riset tetap terbuka</h2><p className="mt-1 text-xs leading-5 text-muted-foreground">Pembanding, materialitas, eksposur, sumber, dan kondisi pembatal tersimpan dalam aturan riset.</p><Link href="/playbook" className="mt-3 inline-flex min-h-9 items-center text-xs font-medium text-primary">Buka aturan riset</Link></Panel>
        </div>
      </div> : null}
    </div>
  );
}

export default function ResearchCasesPage() {
  return <Suspense fallback={<Panel className="h-72 animate-pulse bg-muted" aria-label="Memuat kasus" />}><ResearchCasesContent /></Suspense>;
}
