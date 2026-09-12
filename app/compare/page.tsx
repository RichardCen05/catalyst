"use client";

import Link from "next/link";
import { Suspense, useMemo } from "react";
import { useSearchParams } from "next/navigation";
import { ArrowLeft, ExternalLink, GitCompareArrows } from "lucide-react";
import { agentEngine } from "@/lib/agent/engine";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { PillarKey, SymbolCode } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { AskAgentButton } from "@/components/ask-agent-button";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

const pillarLabels: Record<PillarKey, string> = { concentration: "Konsentrasi", volume: "Volume", momentum: "Momentum", catalyst: "Katalis" };

function CompareContent() {
  const params = useSearchParams();
  const profile = useCatalystStore((state) => state.profile);
  const symbols = useMemo(() => {
    const requested = (params.get("symbols") ?? "ANTM,BBCA").split(",").map((item) => item.toUpperCase()) as SymbolCode[];
    return [...new Set(requested)].filter((symbol) => companies.some((company) => company.symbol === symbol && company.analyzed)).slice(0, 4);
  }, [params]);
  const analyses = symbols.map((symbol) => agentEngine.analyzeCompany(symbol, profile)).filter((item) => item !== null);

  return <div>
    <Link href="/companies" className="mb-4 inline-flex min-h-10 items-center gap-2 rounded-md text-sm text-muted-foreground hover:text-primary"><ArrowLeft aria-hidden="true" className="size-4" />Companies</Link>
    <PageHeader eyebrow="Comparison workbench" title="Perbandingan bukti" description="Status, konflik, dan metrik dibaca berdampingan. Tidak ada skor gabungan." />
    {analyses.length >= 2 ? <div className="mb-3 flex justify-end"><AskAgentButton context={{ label: `Perbandingan ${symbols.join(" · ")}`, question: `Bandingkan empat pilar ${symbols.join(" dan ")} tanpa skor gabungan.` }} label="Tanya perbandingan" /></div> : null}
    {analyses.length >= 2 ? <div className="overflow-x-auto rounded-xl border border-border bg-surface shadow-panel"><table className="w-full min-w-[760px] text-left text-sm"><caption className="sr-only">Perbandingan empat pilar</caption><thead className="border-b border-border bg-surface-raised"><tr><th className="w-44 px-4 py-3 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Bukti</th>{analyses.map((analysis) => <th key={analysis.company.symbol} scope="col" className="px-4 py-3"><Link href={`/companies/${analysis.company.symbol}`} className="inline-flex items-center gap-2 font-mono text-primary">{analysis.company.symbol}<ExternalLink aria-hidden="true" className="size-3.5" /></Link><span className="mt-1 block text-xs font-normal text-muted-foreground">{analysis.company.name}</span></th>)}</tr></thead><tbody className="divide-y divide-border"><tr><th scope="row" className="px-4 py-3 text-xs font-medium">Kesimpulan bukti</th>{analyses.map((analysis) => <td key={analysis.company.symbol} className="px-4 py-3"><StatusBadge status={analysis.evidenceState} /><p className="mt-2 text-xs leading-5 text-muted-foreground">{analysis.thesis}</p></td>)}</tr>{(Object.keys(pillarLabels) as PillarKey[]).map((pillarKey) => <tr key={pillarKey}><th scope="row" className="px-4 py-3 text-xs font-medium">{pillarLabels[pillarKey]}</th>{analyses.map((analysis) => { const pillar = analysis.pillars.find((item) => item.key === pillarKey)!; return <td key={analysis.company.symbol} className="px-4 py-3 align-top"><p className="font-mono text-xs font-semibold text-primary">{pillar.status}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{pillar.metrics[0]?.label}: <span className="font-mono text-foreground">{pillar.metrics[0]?.value}</span></p>{pillar.conflict ? <p className="mt-2 text-xs leading-5 text-danger">{pillar.conflict}</p> : null}</td>; })}</tr>)}</tbody></table></div> : <Panel className="p-8 text-center"><GitCompareArrows aria-hidden="true" className="mx-auto size-7 text-muted-foreground" /><h2 className="mt-3 font-semibold">Pilih sedikitnya dua emiten</h2><Link href="/companies" className="mt-4 inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-sm font-semibold text-primary-foreground">Kembali memilih</Link></Panel>}
  </div>;
}

export default function ComparePage() {
  return <Suspense fallback={<Panel className="h-80 animate-pulse bg-muted" aria-label="Memuat perbandingan" />}><CompareContent /></Suspense>;
}
