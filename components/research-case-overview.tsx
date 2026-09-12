"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Circle, GitBranch, RotateCcw, Save, X } from "lucide-react";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";

export function ResearchCaseOverview({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const caseMandates = useCatalystStore((state) => state.caseMandates);
  const caseStatuses = useCatalystStore((state) => state.caseStatuses);
  const setCaseMandate = useCatalystStore((state) => state.setCaseMandate);
  const setCaseStatus = useCatalystStore((state) => state.setCaseStatus);
  const playbook = useCatalystStore((state) => state.playbook);
  const insights = useCatalystStore((state) => state.insights);
  const [saved, setSaved] = useState(false);
  const mandate = caseMandates[symbol] ?? researchCase.mandate;
  const status = caseStatuses[symbol] ?? researchCase.status;

  const playbookContext = useMemo(() => {
    const containsSymbol = (value: string) => value.toUpperCase().includes(symbol);
    return {
      comparables: playbook.preferredComparables[symbol] ?? [],
      exposures: playbook.knownExposures.filter(containsSymbol),
      assumptions: playbook.thesisAssumptions.filter(containsSymbol),
      falsifiers: playbook.falsifiers.filter(containsSymbol),
    };
  }, [playbook, symbol]);
  const caseNotes = insights.filter((item) => item.symbol === symbol && item.status !== "dismissed");

  const saveMandate = () => {
    setCaseMandate(symbol, mandate.trim() || researchCase.mandate);
    setSaved(true);
  };

  return (
    <Panel className="mb-4 overflow-hidden" data-tour="research-case">
      <PanelHeader
        eyebrow={researchCase.caseId}
        title="Research mandate & lifecycle"
        action={<span className={`rounded-full border px-2.5 py-1 font-mono text-[10px] uppercase tracking-wider ${status === "closed" ? "border-positive/35 bg-positive/10 text-positive" : "border-primary/35 bg-primary/10 text-primary"}`}>Case {status}</span>}
      />
      <div className="grid gap-4 p-4 xl:grid-cols-[minmax(0,1.25fr)_minmax(280px,0.75fr)]">
        <div>
          <label htmlFor={`mandate-${symbol}`} className="text-xs font-medium">Research mandate</label>
          <textarea id={`mandate-${symbol}`} value={mandate} onChange={(event) => { setCaseMandate(symbol, event.target.value); setSaved(false); }} rows={3} className="mt-2 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={saveMandate}><Save aria-hidden="true" className="size-3.5" />Simpan mandate</Button>
            {saved ? <span className="inline-flex items-center gap-1 text-xs text-positive" role="status"><Check aria-hidden="true" className="size-3.5" />Mandate tersimpan</span> : null}
          </div>
        </div>
        <div className="rounded-lg border border-border bg-background p-3">
          <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Trigger</p>
          <h3 className="mt-1 text-sm font-semibold leading-5">{researchCase.trigger.title}</h3>
          <p className="mt-1 line-clamp-2 text-xs leading-5 text-muted-foreground">{researchCase.trigger.detail}</p>
          <div className="mt-3 flex flex-wrap gap-1.5 font-mono text-[9px] uppercase tracking-wider">
            <span className="rounded border border-primary/30 px-2 py-1 text-primary">{researchCase.priority.novelty}</span>
            <span className="rounded border border-attention/30 px-2 py-1 text-attention-foreground">{researchCase.priority.materiality} materiality</span>
            <span className="rounded border border-border px-2 py-1 text-muted-foreground">{researchCase.priority.uncertainty} uncertainty</span>
          </div>
        </div>
      </div>

      <ol aria-label="Agent lifecycle" className="grid gap-px border-y border-border bg-border sm:grid-cols-5">
        {researchCase.lifecycle.map((step, index) => {
          const complete = status === "closed" || step.state === "complete";
          return <li key={step.key} className="flex min-h-14 items-center gap-2 bg-background px-3"><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${complete ? "border-positive/40 bg-positive/10 text-positive" : "border-primary/40 bg-primary/10 text-primary"}`}>{complete ? <Check aria-hidden="true" className="size-3" /> : <Circle aria-hidden="true" className="size-2.5 fill-current" />}</span><span><span className="block font-mono text-[9px] text-muted-foreground">0{index + 1}</span><span className="block text-[11px] font-medium">{step.label}</span></span></li>;
        })}
      </ol>

      <div className="grid gap-3 p-4 md:grid-cols-3">
        <article className="rounded-lg border border-border bg-background p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Working thesis</p><p className="mt-2 text-sm leading-6">{researchCase.thesis}</p></article>
        <article className="rounded-lg border border-border bg-background p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-attention-foreground">Key challenge</p><p className="mt-2 text-sm leading-6">{researchCase.contradictions[0] ?? researchCase.counterEvidence[0]}</p></article>
        <article className="rounded-lg border border-border bg-background p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Primary causal path</p><p className="mt-2 text-sm leading-6">{researchCase.primaryCausalPath}</p><Link href={`/impact?case=${symbol}`} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary"><GitBranch aria-hidden="true" className="size-3.5" />Uji chain</Link></article>
      </div>

      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">Buka case file lengkap<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary>
        <div className="grid gap-4 border-t border-border p-4 lg:grid-cols-2">
          <section><h3 className="text-xs font-semibold">Source plan & clarification gate</h3><p className="mt-2 rounded border border-border bg-surface p-2 text-xs leading-5 text-muted-foreground">{researchCase.clarificationGate}</p><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground"><li>— Prioritas Anda: {playbook.trustedSources[0] ?? "Belum ada trusted source."}</li>{researchCase.sourcePlan.slice(0, 3).map((item) => <li key={item}>— {item}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Unresolved questions</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.unresolvedQuestions.slice(0, 4).map((item) => <li key={item}>— {item}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Counter-evidence & user notes</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.counterEvidence.slice(0, 2).map((item) => <li key={item}>— {item}</li>)}{caseNotes.map((item) => <li key={item.id} className="text-attention-foreground">— Catatan user ({item.status}): {item.note}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Playbook context</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">Comparables: {playbookContext.comparables.join(" · ") || "Belum ditulis"}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{playbook.materialityRules[0] ?? "Materiality rule belum ditulis."}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{playbookContext.exposures[0] ?? "Known exposure belum ditulis untuk emiten ini."}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{playbookContext.falsifiers[0] ?? "Falsifier belum ditulis untuk emiten ini."}</p><Link href="/playbook" className="mt-2 inline-flex min-h-9 items-center text-xs font-medium text-primary">Edit Investor Research Playbook</Link></section>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3"><p className="text-xs text-muted-foreground">Menutup case menyimpan keputusan riset; bukti dan catatan tetap dapat diaudit.</p>{status === "closed" ? <Button variant="secondary" size="sm" onClick={() => setCaseStatus(symbol, "open")}><RotateCcw aria-hidden="true" className="size-3.5" />Buka kembali case</Button> : <Button variant="secondary" size="sm" onClick={() => setCaseStatus(symbol, "closed")}><X aria-hidden="true" className="size-3.5" />Tandai case selesai</Button>}</div>
    </Panel>
  );
}
