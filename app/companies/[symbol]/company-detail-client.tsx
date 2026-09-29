"use client";

import Link from "next/link";
import { useState, useEffect } from "react";
import { agentEngine } from "@/lib/agent/engine";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { formatAsOf, formatCurrency } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";
import { materialityNote } from "@/lib/materiality-note";
import { CitationDialog } from "@/components/citation-dialog";
import { ResearchCaseWorkspace } from "@/components/research-case-workspace";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { PriceChange } from "@/components/ui/price-change";
import { IconArrowLeft, IconClock, IconUnknown } from "@/components/ui/icons";

export function CompanyDetailClient({ symbol }: { symbol: SymbolCode }) {
  const { profile, playbook, caseResolutions, insights } = useCatalystStore();
  const company = companies.find((item) => item.symbol === symbol)!;
  const [analysis, setAnalysis] = useState<ResearchCase | null | undefined>(undefined);
  const resolution = caseResolutions[symbol];
  useEffect(() => {
    let cancelled = false;
    agentEngine.analyzeCompany(symbol, profile, {
      // Pertanyaan selalu bawaan engine — input manual dihapus.
      mandate: undefined,
      playbook,
      userInsights: insights,
      resolution,
    }).then((result) => { if (!cancelled) setAnalysis(result); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbol, profile, playbook, insights, resolution]);

  if (analysis === undefined) return (
    <div>
      <Panel className="h-72 shimmer" aria-label="Memuat kasus" />
    </div>
  );

  if (!analysis) return (
    <div>
      <Link href="/cases" className="mb-5 inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconArrowLeft aria-hidden="true" className="size-4" />Kembali ke Riset &amp; Analisis</Link>
      <Panel className="overflow-hidden"><div className="border-b border-border p-5"><div className="flex flex-wrap items-start justify-between gap-4"><div><p className="text-xs text-muted-foreground">{uiLabel(company.sector)}</p><h1 className="editorial mt-2 text-[28px]">{company.symbol} <span className="text-muted-foreground">{company.name}</span></h1></div><StatusBadge status="Insufficient Evidence" /></div></div><div className="p-8 text-center sm:p-14"><IconUnknown aria-hidden="true" className="mx-auto size-8 text-muted-foreground" /><h2 className="mt-4 text-lg font-semibold">Kasus belum tersedia</h2><p className="mx-auto mt-2 max-w-lg text-sm leading-6 text-muted-foreground">Data perusahaan ada, tetapi data broker, arus asing, saham publik, dan pembanding harian belum lengkap. Catalyst tidak membuat angka pengganti.</p><div className="mt-6 flex justify-center"><CitationDialog citations={company.citations} label="Periksa data" /></div></div></Panel>
    </div>
  );

  return (
    <div>
      <div className="mb-5 flex flex-wrap items-center justify-between gap-3"><Link href="/cases" className="inline-flex min-h-10 items-center gap-2 rounded-lg text-sm text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconArrowLeft aria-hidden="true" className="size-4" />Riset &amp; Analisis</Link><div className="flex flex-wrap gap-2"><CitationDialog citations={analysis.sources} label="Sumber" /></div></div>

      <header className="mb-6">
        <div className="flex flex-col gap-5 sm:flex-row sm:items-end sm:justify-between">
          <div className="min-w-0"><div className="flex flex-wrap items-baseline gap-x-3 gap-y-1"><h1 className="editorial text-[28px]">{company.symbol}</h1><p className="text-base text-muted-foreground">{company.name}</p></div><div className="mt-2 flex flex-wrap items-center gap-x-3 gap-y-2"><StatusBadge status={analysis.evidenceState} /><span aria-hidden="true" className="text-border-strong">|</span><span className="text-sm text-muted-foreground">{uiLabel(company.subsector) && uiLabel(company.subsector) !== uiLabel(company.sector) ? `${uiLabel(company.sector)} · ${uiLabel(company.subsector)}` : uiLabel(company.sector)}</span><span aria-hidden="true" className="hidden text-border-strong sm:inline">|</span><span className="inline-flex h-6 items-center rounded-lg border border-foreground px-2 text-xs font-medium">Materialitas {uiLabel(analysis.priority.materiality).toLowerCase()}</span>{materialityNote(analysis.priority) ? <span className="text-xs text-attention-foreground">{materialityNote(analysis.priority)}</span> : null}</div></div>
          <div className="shrink-0 sm:text-right"><p className="font-mono text-[28px] font-medium leading-9 tabular-nums">{formatCurrency(company.price).replace("Rp", "Rp ")}</p><p className="mt-1 flex items-center gap-2 sm:justify-end"><PriceChange value={company.changePct} /><span className="flex items-center gap-1 text-xs text-subtle-foreground"><IconClock aria-hidden="true" className="size-3" />Penutupan {formatAsOf(analysis.asOf)} WIB</span></p></div>
        </div>
      </header>

      <ResearchCaseWorkspace analysis={analysis} symbol={symbol} />
    </div>
  );
}