"use client";

import { Suspense, useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { agentEngine } from "@/lib/agent/engine";
import { companies, coverageInfo } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { CaseResolution, SymbolCode, AnalysisCase } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { IconArrowRight, IconCheck, IconClose, IconCompanies, IconExternal, IconNote, IconSearch, IconTrash } from "@/components/ui/icons";
import { cn, formatCurrency } from "@/lib/utils";
import { dispositionLabel, uiLabel } from "@/lib/ui-labels";

type CaseHubView = "active" | "picker" | "audit";

const views: Array<{ value: CaseHubView; label: string }> = [
  { value: "active", label: "Kasus aktif" },
  { value: "picker", label: "Pilih emiten" },
  { value: "audit", label: "Audit" },
];

function ResearchCasesContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view") as CaseHubView | null;
  const activeView = views.some((item) => item.value === requested) ? requested as CaseHubView : "active";
  const { profile, playbook, caseMandates, caseClarifications, caseStatuses, caseResolutions, insights, ruleProposals, setInsightStatus, setRuleProposalStatus, removeInsight } = useCatalystStore();
  const [query, setQuery] = useState("");
  const [selected, setSelected] = useState<SymbolCode[]>(() => (searchParams.get("compare") ?? "")
    .split(",")
    .map((item) => item.toUpperCase() as SymbolCode)
    .filter((symbol) => companies.some((company) => company.symbol === symbol && company.analyzed))
    .slice(0, 3));
  const [cases, setCases] = useState<AnalysisCase[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(profile.watchlist.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], clarificationChoice: caseClarifications[symbol], playbook, userInsights: insights, resolution: caseResolutions[symbol] }))).then((results) => { if (!cancelled) setCases(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profile.watchlist.join(","), caseMandates, caseClarifications, playbook, insights, caseResolutions]);
  const filteredCompanies = useMemo(() => {
    const value = query.trim().toLowerCase();
    return companies.filter((company) => !value || `${company.symbol} ${company.name} ${company.sector}`.toLowerCase().includes(value));
  }, [query]);
  const [compared, setCompared] = useState<AnalysisCase[]>([]);
  useEffect(() => {
    let cancelled = false;
    if (!selected.length) return () => { cancelled = true; };
    void Promise.all(selected.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: caseMandates[symbol], clarificationChoice: caseClarifications[symbol], playbook }))).then((results) => { if (!cancelled) setCompared(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [selected.join(",")]);
  const visibleCompared = compared.filter((item) => selected.includes(item.company.symbol));
  const resolutions = Object.entries(caseResolutions).filter((entry): entry is [SymbolCode, CaseResolution] => Boolean(entry[1]));

  const toggleCompare = (symbol: SymbolCode) => setSelected((current) => current.includes(symbol)
    ? current.filter((item) => item !== symbol)
    : current.length < 3 ? [...current, symbol] : current);

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
          <div className="border-b border-border p-4"><label className="relative block max-w-lg"><IconSearch aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><span className="sr-only">Cari emiten atau sektor</span><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode, nama, atau sektor" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" /></label><p className="mt-2 text-xs text-muted-foreground">Buka satu kasus atau pilih dua hingga tiga emiten untuk dibandingkan.</p></div>
          <div className="divide-y divide-border">{filteredCompanies.map((company) => <div key={company.symbol} className="grid gap-3 px-4 py-3 sm:grid-cols-[32px_minmax(0,1fr)_auto] sm:items-center"><input type="checkbox" checked={selected.includes(company.symbol)} onChange={() => toggleCompare(company.symbol)} disabled={!company.analyzed || (!selected.includes(company.symbol) && selected.length >= 3)} aria-label={`Pilih ${company.symbol} untuk dibandingkan`} className="size-4 cursor-pointer accent-[var(--primary)]" /><div className="min-w-0"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-sm font-semibold text-primary">{company.symbol}</span><span className="text-sm font-medium">{company.name}</span><span className="font-mono text-[9px] text-muted-foreground">{uiLabel(company.sector)}</span></div><p className="mt-1 text-xs text-muted-foreground">{company.analyzed ? company.summary : `Data ringkas tersedia (${coverageInfo[company.symbol]?.linkedEvents ?? 0} peristiwa, ${coverageInfo[company.symbol]?.financialRows ?? 0} baris keuangan). Kasus lengkap butuh: ${(coverageInfo[company.symbol]?.missing ?? []).join(", ") || "—"}.`}</p></div><div className="flex items-center gap-3"><span className="font-mono text-xs">{formatCurrency(company.price).replace("Rp", "Rp ")}</span>{company.analyzed ? <Link href={`/cases/${company.symbol}`} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Buka kasus</Link> : <Link href="/method" className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground hover:text-primary" title={`Menunggu rekaman: ${(coverageInfo[company.symbol]?.missing ?? []).join(", ")}`}>Data ringkas</Link>}</div></div>)}</div>
        </Panel>

        {visibleCompared.length >= 2 ? <section aria-labelledby="inline-compare-title" className="mt-4 overflow-hidden rounded-[12px] border border-border bg-surface"><header className="border-b border-border p-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Perbandingan</p><h2 id="inline-compare-title" className="editorial mt-1 text-2xl">Bandingkan bukti, bukan skor</h2></header><div className="overflow-x-auto"><table className="w-full min-w-[680px] text-left text-xs"><thead className="border-b border-border bg-background"><tr><th className="px-4 py-3">Pemeriksaan</th>{visibleCompared.map((item) => <th key={item.company.symbol} className="px-4 py-3 font-mono text-primary">{item.company.symbol}</th>)}</tr></thead><tbody className="divide-y divide-border"><tr><th className="px-4 py-3 font-medium">Status bukti</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3"><StatusBadge status={item.evidenceState} /></td>)}</tr><tr><th className="px-4 py-3 font-medium">Uji bisnis utama</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3">{item.businessImpact.find((impact) => impact.status === "Primary test")?.label}</td>)}</tr><tr><th className="px-4 py-3 font-medium">Konsentrasi (HHI)</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3 font-mono">{item.pillars.find((pillar) => pillar.key === "concentration")?.metrics.find((metric) => metric.label === "HHI")?.value ?? "—"}</td>)}</tr><tr><th className="px-4 py-3 font-medium">Volume (skor z)</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3 font-mono">{item.pillars.find((pillar) => pillar.key === "volume")?.metrics.find((metric) => metric.label === "Skor z tahan pencilan")?.value ?? "—"}</td>)}</tr><tr><th className="px-4 py-3 font-medium">Residual vs IHSG</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3 font-mono">{item.pillars.find((pillar) => pillar.key === "momentum")?.metrics.find((metric) => metric.label === "Residual setelah beta")?.value ?? "—"}</td>)}</tr><tr><th className="px-4 py-3 font-medium">Imbal hasil sektor</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3 font-mono">{item.pillars.find((pillar) => pillar.key === "momentum")?.metrics.find((metric) => metric.label === "Imbal hasil sektor")?.value ?? "—"}</td>)}</tr><tr><th className="px-4 py-3 font-medium">Materialitas</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3">{uiLabel(item.priority.materiality)} · {item.priority.reason}</td>)}</tr><tr><th className="px-4 py-3 font-medium">Tantangan utama</th>{visibleCompared.map((item) => <td key={item.company.symbol} className="px-4 py-3 leading-5 text-muted-foreground">{item.counterEvidence[0]}</td>)}</tr></tbody></table></div></section> : null}
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
