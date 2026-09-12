"use client";

import { useState } from "react";
import { ArrowRight, Scale } from "lucide-react";
import type { CausalGraph } from "@/lib/types";
import { AskAgentButton } from "@/components/ask-agent-button";
import { CitationDialog } from "@/components/citation-dialog";
import { cn } from "@/lib/utils";

export function CompetingHypotheses({ graph }: { graph: CausalGraph }) {
  const [selectedId, setSelectedId] = useState(graph.competingHypotheses[0]?.id);
  const selected = graph.competingHypotheses.find((item) => item.id === selectedId) ?? graph.competingHypotheses[0];
  if (!selected) return null;

  return (
    <section role="region" aria-label={`Competing hypotheses for ${graph.targetObservable}`} className="mb-4 overflow-hidden rounded-[12px] border border-border bg-surface">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-end sm:justify-between sm:px-5">
        <div className="max-w-2xl"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Competing-hypothesis test</p><h2 className="editorial mt-1 text-2xl">What best explains {graph.targetObservable.toLowerCase()}?</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{graph.competingHypotheses.length} explanations compete for the same observable.</p></div>
        <span className="inline-flex min-h-9 items-center gap-2 self-start rounded-md border border-border px-3 font-mono text-[10px] text-muted-foreground"><Scale aria-hidden="true" className="size-3.5 text-primary" />One observable, several causes</span>
      </header>

      <div className="grid lg:grid-cols-[minmax(250px,0.72fr)_minmax(0,1.28fr)]">
        <ol className="divide-y divide-border border-b border-border lg:border-b-0 lg:border-r">
          {graph.competingHypotheses.map((item) => {
            const active = selected.id === item.id;
            return <li key={item.id}><button type="button" onClick={() => setSelectedId(item.id)} data-tour-action={item.rank === 2 && graph.targetSymbol === "ANTM" ? "competing-hypothesis-2" : undefined} aria-pressed={active} aria-label={`Rank ${item.rank} · ${item.status} · ${item.claim}`} className={cn("grid min-h-20 w-full cursor-pointer grid-cols-[30px_minmax(0,1fr)_16px] items-start gap-3 px-4 py-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active ? "bg-primary/8" : "hover:bg-muted/60")}><span className={cn("grid size-[30px] place-items-center rounded-full border font-mono text-xs", active ? "border-primary/50 text-primary" : "border-border text-muted-foreground")}>{item.rank}</span><span><strong className="line-clamp-2 text-xs font-medium leading-5">{item.claim}</strong><span className="mt-1 block font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{item.status} · {item.confidence}</span></span><ArrowRight aria-hidden="true" className={cn("mt-1 size-4", active ? "text-primary" : "text-muted-foreground")} /></button></li>;
          })}
        </ol>

        <article role="region" aria-label="Selected competing hypothesis" className="p-4 sm:p-5">
          <div className="flex flex-wrap items-center gap-2"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">Rank {selected.rank}</span><span className="rounded border border-border px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{selected.status}</span></div>
          <h3 className="mt-3 max-w-2xl text-base font-semibold leading-6">{selected.claim}</h3>
          <dl className="mt-5 grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-3">
            <div className="bg-background p-3"><dt className="text-xs font-medium">Supporting evidence</dt><dd className="mt-2 text-xs leading-5 text-muted-foreground">{selected.supportingEvidence}</dd></div>
            <div className="bg-background p-3"><dt className="text-xs font-medium">Counter-evidence</dt><dd className="mt-2 text-xs leading-5 text-muted-foreground">{selected.counterEvidence}</dd></div>
            <div className="bg-background p-3"><dt className="text-xs font-medium">Discriminator</dt><dd className="mt-2 text-xs leading-5 text-muted-foreground">{selected.discriminator}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap gap-2"><CitationDialog citations={selected.citations} label="Bukti hipotesis" /><AskAgentButton context={{ label: `${graph.targetSymbol} · competing hypothesis ${selected.rank}`, question: `Uji hipotesis ${selected.claim} terhadap counter-evidence dan discriminator.`, symbol: graph.targetSymbol }} label="Challenge hypothesis" tourAction={graph.targetSymbol === "ANTM" ? "challenge-hypothesis" : undefined} /></div>
        </article>
      </div>
    </section>
  );
}
