"use client";

import Link from "next/link";
import { ArrowRight, BriefcaseBusiness } from "lucide-react";
import { agentEngine } from "@/lib/agent/engine";
import { useCatalystStore } from "@/lib/store";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

export default function ResearchCasesPage() {
  const profile = useCatalystStore((state) => state.profile);
  const cases = profile.watchlist.map((symbol) => agentEngine.analyzeCompany(symbol, profile)).filter((item) => item !== null);

  return (
    <div data-tour="research-cases">
      <PageHeader eyebrow="Research Cases" title="Perubahan yang sedang diinvestigasi" description="Satu ruang kerja per trigger: thesis, empat pemeriksaan, causal path, counter-evidence, dan pertanyaan terbuka." />
      <Panel>
        <div className="divide-y divide-border">
          {cases.map((analysis) => (
            <Link key={analysis.company.symbol} href={`/cases/${analysis.company.symbol}`} className="grid min-h-24 gap-3 p-4 transition-colors hover:bg-muted/50 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:grid-cols-[40px_minmax(0,1fr)_auto] sm:items-center">
              <span className="grid size-10 place-items-center rounded-lg bg-primary/10 text-primary"><BriefcaseBusiness aria-hidden="true" className="size-4.5" /></span>
              <span className="min-w-0"><span className="flex flex-wrap items-center gap-2"><strong className="font-mono text-sm">{analysis.company.symbol}</strong><span className="text-sm font-medium">{analysis.trigger.title}</span><span className="rounded border border-attention/30 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{analysis.priority.materiality}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{analysis.priority.uncertainty} uncertainty</span></span><span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{analysis.thesis}</span></span>
              <span className="flex items-center gap-3"><StatusBadge status={analysis.evidenceState} /><ArrowRight aria-hidden="true" className="size-4 text-primary" /></span>
            </Link>
          ))}
        </div>
      </Panel>
    </div>
  );
}
