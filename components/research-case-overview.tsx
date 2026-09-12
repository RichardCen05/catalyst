"use client";

import Link from "next/link";
import { useMemo, useState } from "react";
import { Check, ChevronDown, Circle, GitBranch, PauseCircle, Save } from "lucide-react";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";

export function ResearchCaseOverview({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const caseMandates = useCatalystStore((state) => state.caseMandates);
  const caseStatuses = useCatalystStore((state) => state.caseStatuses);
  const setCaseMandate = useCatalystStore((state) => state.setCaseMandate);
  const setCaseClarification = useCatalystStore((state) => state.setCaseClarification);
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
      falsifiers: playbook.falsifiers.filter(containsSymbol),
    };
  }, [playbook, symbol]);
  const caseNotes = insights.filter((item) => item.symbol === symbol && item.status !== "dismissed");

  const saveMandate = () => {
    setCaseMandate(symbol, mandate.trim() || researchCase.mandate);
    setSaved(true);
  };

  return (
    <Panel className="overflow-hidden">
      <PanelHeader
        title="Research mandate"
        action={<span className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${status === "closed" ? "border-positive/35 bg-positive/10 text-positive" : "border-primary/35 bg-primary/10 text-primary"}`}>Case {status}</span>}
      />

      <section aria-label="Research Disposition" className="grid gap-4 border-b border-border bg-primary/6 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Research disposition</p>
          <div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="editorial text-2xl">{researchCase.researchDisposition.label}</h2>{researchCase.clarification.required ? <span className="rounded border border-attention/35 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">Provisional</span> : null}</div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{researchCase.researchDisposition.reason}</p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2">
          <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Observable to monitor</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.monitorObservable}</dd></div>
          <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Reopen condition</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.reopenWhen}</dd></div>
        </dl>
      </section>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]" data-tour="research-mandate">
        <div>
          <label htmlFor={`mandate-${symbol}`} className="text-xs font-medium">Research mandate</label>
          <textarea id={`mandate-${symbol}`} value={mandate} onChange={(event) => { setCaseMandate(symbol, event.target.value); setSaved(false); }} rows={3} className="mt-2 w-full resize-y rounded-[8px] border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" />
          <div className="mt-2 flex flex-wrap items-center gap-2">
            <Button size="sm" onClick={saveMandate} data-tour-action={symbol === "ANTM" ? "save-mandate" : undefined}><Save aria-hidden="true" className="size-3.5" />Simpan dan susun ulang plan</Button>
            {saved ? <span className="inline-flex items-center gap-1 text-xs text-positive" role="status"><Check aria-hidden="true" className="size-3.5" />Mandate tersimpan</span> : null}
          </div>
        </div>
        <section className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0" aria-labelledby="case-trigger-title">
          <p className="font-mono text-[10px] text-muted-foreground">{researchCase.caseId}</p>
          <h3 id="case-trigger-title" className="mt-2 text-sm font-semibold leading-5">{researchCase.trigger.title}</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{researchCase.trigger.detail}</p>
          <dl className="mt-3 grid grid-cols-3 gap-2 text-[10px]"><div><dt className="text-muted-foreground">Novelty</dt><dd className="mt-0.5 font-mono text-primary">{researchCase.priority.novelty}</dd></div><div><dt className="text-muted-foreground">Materiality</dt><dd className="mt-0.5 font-mono text-attention-foreground">{researchCase.priority.materiality}</dd></div><div><dt className="text-muted-foreground">Uncertainty</dt><dd className="mt-0.5 font-mono">{researchCase.priority.uncertainty}</dd></div></dl>
        </section>
      </div>

      <section id="clarification-gate" data-tour="clarification-gate" aria-label="Clarification gate" className={`scroll-mt-24 border-t border-border px-4 py-4 sm:px-5 ${researchCase.clarification.required ? "bg-attention/6" : "bg-positive/5"}`}>
        {researchCase.clarification.required ? <div>
          <div className="flex items-start gap-3"><PauseCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-attention" /><div><p className="font-mono text-[10px] uppercase tracking-wider text-attention-foreground">Clarification required · plan paused</p><h2 className="mt-1 text-sm font-semibold">Outcome bisnis mana yang harus diuji?</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{researchCase.clarification.reason}</p></div></div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{researchCase.clarification.options.map((option, index) => <button key={option.id} type="button" onClick={() => setCaseClarification(symbol, option.id)} data-tour-action={symbol === "ANTM" && index === 0 ? "resolve-clarification" : undefined} className="cursor-pointer rounded-[8px] border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">Option {index + 1} · {option.label}</span><strong className="mt-1 block text-sm leading-5">{option.question}</strong><span className="mt-2 block text-xs leading-5 text-muted-foreground">Source plan: {option.sourceConsequence}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Observable: {option.observable}</span></button>)}</div>
        </div> : <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-wider text-positive">Clarification resolved</p><p className="mt-1 text-sm font-medium">{researchCase.clarification.reason}</p></div><button type="button" onClick={() => setCaseMandate(symbol, mandate)} className="min-h-9 self-start rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Ubah fokus</button></div>}
      </section>

      <section role="region" aria-label="Mandate-driven research plan" className="border-t border-border bg-background px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between">
          <div className="max-w-2xl">
            <div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Agent plan</p><span className="rounded border border-primary/35 bg-primary/8 px-2 py-0.5 font-mono text-[10px] text-primary">Focus · {researchCase.researchPlan.focus}</span></div>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{researchCase.researchPlan.rationale}</p>
          </div>
          <Link href={researchCase.clarification.required ? `/cases/${symbol}#clarification-gate` : `/cases/${symbol}?tab=hypotheses`} className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-medium text-primary"><GitBranch aria-hidden="true" className="size-3.5" />{researchCase.clarification.required ? "Selesaikan clarification" : "Uji hipotesis yang bersaing"}</Link>
        </div>

        {researchCase.clarification.required ? <div className="mt-5 rounded-[8px] border border-attention/30 bg-attention/7 p-4"><p className="text-sm font-medium">Plan final belum dibuat.</p><p className="mt-1 text-xs leading-5 text-muted-foreground">Pilih satu outcome pada clarification gate. Catalyst baru akan menetapkan hypothesis tree, source order, dan observable setelah pertanyaan cukup spesifik.</p></div> : <div className="mt-5 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border lg:grid-cols-[1.1fr_1fr_1fr]">
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Hypothesis tree</h3><ol className="mt-3 space-y-3">{researchCase.researchPlan.hypothesisTree.map((item, index) => <li key={item.id} className="grid grid-cols-[22px_minmax(0,1fr)] gap-2 text-xs leading-5"><span className={`grid size-[22px] place-items-center rounded-full border font-mono text-[9px] ${item.state === "primary" ? "border-primary/50 bg-primary/10 text-primary" : "border-border text-muted-foreground"}`}>{index + 1}</span><span><strong className="block font-medium text-foreground">{item.claim}</strong><span className="mt-0.5 block text-muted-foreground">{item.test}</span></span></li>)}</ol></section>
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Source plan</h3><ol className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.sourcePlan.slice(0, 4).map((item, index) => <li key={item} className="flex gap-2"><span className="font-mono text-primary">{String(index + 1).padStart(2, "0")}</span>{item}</li>)}</ol></section>
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Observable contract</h3><dl className="mt-3 space-y-3">{researchCase.researchPlan.observables.map((item) => <div key={`${item.dimension}-${item.metric}`}><dt className="font-mono text-[10px] text-primary">{item.dimension} · {item.window}</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{item.metric}. {item.expectedChange}</dd></div>)}</dl><p className="mt-4 border-t border-border pt-3 text-xs leading-5 text-attention-foreground">{researchCase.clarificationGate}</p></section>
        </div>}
      </section>

      <section role="region" aria-label="Playbook rule trace" className="border-t border-border px-4 py-4 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div><h3 className="text-xs font-semibold">Why this case ranks here</h3><p className="mt-1 text-xs leading-5 text-muted-foreground">Priority is compiled from rules you can inspect and change.</p></div><Link href="/playbook" className="inline-flex min-h-8 items-center text-xs font-medium text-primary">Edit Playbook</Link></div>
        <dl className="mt-3 divide-y divide-border border-y border-border">
          {researchCase.priority.ruleTrace.length ? researchCase.priority.ruleTrace.map((item) => <div key={item.id} className="grid gap-1 py-3 text-xs sm:grid-cols-[100px_minmax(180px,0.9fr)_minmax(0,1.1fr)] sm:gap-3"><dt className="font-mono text-[10px] uppercase tracking-wider text-primary">{item.kind}</dt><dd className="font-medium">{item.rule}</dd><dd className="leading-5 text-muted-foreground">{item.effect}</dd></div>) : <div className="py-3 text-xs text-muted-foreground">No explicit Playbook rule matched this case.</div>}
        </dl>
      </section>

      <ol aria-label="Agent lifecycle" className="grid gap-px border-y border-border bg-border sm:grid-cols-5">
        {researchCase.lifecycle.map((step) => {
          const complete = status === "closed" || step.state === "complete";
          return <li key={step.key} className="flex min-h-14 items-center gap-2 bg-background px-3"><span className={`grid size-5 shrink-0 place-items-center rounded-full border ${complete ? "border-positive/40 bg-positive/10 text-positive" : "border-primary/40 bg-primary/10 text-primary"}`}>{complete ? <Check aria-hidden="true" className="size-3" /> : <Circle aria-hidden="true" className="size-2.5 fill-current" />}</span><span className="text-[11px] font-medium">{step.label}</span></li>;
        })}
      </ol>

      <div className="grid divide-y divide-border md:grid-cols-2 md:divide-x md:divide-y-0">
        <section className="p-4 sm:p-5"><h3 className="text-xs font-semibold">Current challenge</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{researchCase.contradictions[0] ?? researchCase.counterEvidence[0]}</p></section>
        <section className="p-4 sm:p-5"><h3 className="text-xs font-semibold">Causal path</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{researchCase.primaryCausalPath}</p><Link href={`/cases/${symbol}?tab=hypotheses`} className="mt-2 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary"><GitBranch aria-hidden="true" className="size-3.5" />Periksa chain</Link></section>
      </div>

      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">Case file dan unresolved questions<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary>
        <div className="grid gap-6 border-t border-border bg-background p-4 sm:p-5 lg:grid-cols-2">
          <section><h3 className="text-xs font-semibold">Source plan</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">{researchCase.clarificationGate}</p><ul className="mt-3 space-y-2 text-xs leading-5 text-muted-foreground"><li>Prioritas Anda: {playbook.trustedSources[0] ?? "Belum ada trusted source."}</li>{researchCase.sourcePlan.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Unresolved questions</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.unresolvedQuestions.slice(0, 4).map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Counter-evidence dan catatan</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.counterEvidence.slice(0, 2).map((item) => <li key={item}>{item}</li>)}{caseNotes.map((item) => <li key={item.id} className="text-attention-foreground">Catatan user ({item.status}): {item.note}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Playbook context</h3><p className="mt-2 text-xs leading-5 text-muted-foreground">Comparables: {playbookContext.comparables.join(" · ") || "Belum ditulis"}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{playbook.materialityRules[0] ?? "Materiality rule belum ditulis."}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{playbookContext.exposures[0] ?? "Known exposure belum ditulis untuk emiten ini."}</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{playbookContext.falsifiers[0] ?? "Falsifier belum ditulis untuk emiten ini."}</p><Link href="/playbook" className="mt-2 inline-flex min-h-9 items-center text-xs font-medium text-primary">Edit research playbook</Link></section>
        </div>
      </details>

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"><p className="text-xs text-muted-foreground">Case ditutup dari tab Review setelah resolution dicatat.</p><Link href={`/cases/${symbol}?tab=review#case-resolution`} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Buka Case Resolution</Link></div>
    </Panel>
  );
}
