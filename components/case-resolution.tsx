"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Archive, Check, RotateCcw } from "lucide-react";
import type { CaseResolution, ResearchCase, SymbolCode } from "@/lib/types";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

export function CaseResolutionPanel({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const stored = useCatalystStore((state) => state.caseResolutions[symbol]);
  const status = useCatalystStore((state) => state.caseStatuses[symbol] ?? researchCase.status);
  const saveCaseResolution = useCatalystStore((state) => state.saveCaseResolution);
  const setCaseStatus = useCatalystStore((state) => state.setCaseStatus);
  const [savedNow, setSavedNow] = useState(false);
  const [form, setForm] = useState<Omit<CaseResolution, "resolvedAt">>({
    outcome: stored?.outcome ?? "open",
    disposition: stored?.disposition ?? researchCase.researchDisposition.kind,
    finalHypothesis: stored?.finalHypothesis ?? researchCase.thesis,
    falsifiedBy: stored?.falsifiedBy ?? researchCase.counterEvidence[0] ?? "",
    wrongAssumption: stored?.wrongAssumption ?? "",
    reusableRule: stored?.reusableRule ?? "",
  });
  const update = (key: keyof typeof form, value: string) => setForm((current) => ({ ...current, [key]: value }));
  const valid = form.finalHypothesis.trim().length >= 8 && form.reusableRule.trim().length >= 8;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    if (!valid) return;
    saveCaseResolution(symbol, {
      ...form,
      finalHypothesis: form.finalHypothesis.trim(),
      falsifiedBy: form.falsifiedBy.trim(),
      wrongAssumption: form.wrongAssumption.trim(),
      reusableRule: form.reusableRule.trim(),
    });
    setSavedNow(true);
  };

  return (
    <section id="case-resolution" role="region" aria-label="Case Resolution" className="mb-4 overflow-hidden rounded-[12px] border border-border bg-surface">
      <header className="flex flex-col gap-3 border-b border-border px-4 py-4 sm:flex-row sm:items-start sm:justify-between sm:px-5">
        <div><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Institutional memory</p><h2 className="editorial mt-1 text-2xl">Case Resolution</h2><p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Close the investigation with a reusable lesson. A resolution records what survived, what failed, and what the next case should remember.</p></div>
        <span className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${status === "closed" ? "border-positive/35 bg-positive/10 text-positive" : "border-primary/35 bg-primary/10 text-primary"}`}>Case {status}</span>
      </header>

      {status === "closed" && stored ? (
        <div className="p-4 sm:p-5">
          {savedNow ? <p role="status" className="mb-4 inline-flex items-center gap-1.5 text-xs text-positive"><Check aria-hidden="true" className="size-3.5" />Resolution saved · rule proposal waiting for approval</p> : null}
          <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2">
            <div className="bg-background p-3"><dt className="font-mono text-[10px] uppercase tracking-wider text-primary">Outcome</dt><dd className="mt-1 text-sm font-semibold capitalize">{stored.outcome}</dd></div>
            <div className="bg-background p-3"><dt className="font-mono text-[10px] uppercase tracking-wider text-primary">Research disposition</dt><dd className="mt-1 text-sm font-semibold capitalize">{stored.disposition ?? researchCase.researchDisposition.kind}</dd></div>
            <div className="bg-background p-3 sm:col-span-2"><dt className="font-mono text-[10px] uppercase tracking-wider text-primary">Final hypothesis</dt><dd className="mt-1 text-sm leading-6">{stored.finalHypothesis}</dd></div>
            <div className="bg-background p-3"><dt className="font-mono text-[10px] uppercase tracking-wider text-primary">Evidence that falsified it</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{stored.falsifiedBy || "No falsifying evidence recorded."}</dd></div>
            <div className="bg-background p-3"><dt className="font-mono text-[10px] uppercase tracking-wider text-primary">Wrong assumption</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{stored.wrongAssumption || "No wrong assumption recorded."}</dd></div>
            <div className="bg-background p-3 sm:col-span-2"><dt className="font-mono text-[10px] uppercase tracking-wider text-primary">Reusable rule</dt><dd className="mt-1 text-sm leading-6">{stored.reusableRule}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="secondary" size="sm" onClick={() => { setCaseStatus(symbol, "open"); setSavedNow(false); }}><RotateCcw aria-hidden="true" className="size-3.5" />Buka kembali case</Button><Link href="/cases?view=audit" className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Open resolution memory</Link></div>
        </div>
      ) : (
        <form onSubmit={submit} className="p-4 sm:p-5">
          <div className="grid gap-4 sm:grid-cols-2">
            <label className="text-xs font-medium">Resolution outcome<select aria-label="Resolution outcome" value={form.outcome} onChange={(event) => setForm((current) => ({ ...current, outcome: event.target.value as CaseResolution["outcome"] }))} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"><option value="supported">Supported</option><option value="challenged">Challenged</option><option value="open">Still open</option></select></label>
            <label className="text-xs font-medium">Research disposition<select aria-label="Research disposition" value={form.disposition} onChange={(event) => setForm((current) => ({ ...current, disposition: event.target.value as CaseResolution["disposition"] }))} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary"><option value="escalate">Escalate research</option><option value="monitor">Monitor observable</option><option value="dismiss">Dismiss trigger</option></select></label>
            <label className="text-xs font-medium">Final hypothesis<textarea aria-label="Final hypothesis" rows={3} value={form.finalHypothesis} onChange={(event) => update("finalHypothesis", event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary" /></label>
            <label className="text-xs font-medium">Evidence that falsified it<textarea aria-label="Evidence that falsified it" rows={3} value={form.falsifiedBy} onChange={(event) => update("falsifiedBy", event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary" /></label>
            <label className="text-xs font-medium">Wrong assumption<textarea aria-label="Wrong assumption" rows={3} value={form.wrongAssumption} onChange={(event) => update("wrongAssumption", event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary" /></label>
            <label className="text-xs font-medium sm:col-span-2">Reusable rule<textarea aria-label="Reusable rule" rows={3} value={form.reusableRule} onChange={(event) => update("reusableRule", event.target.value)} placeholder="A rule worth applying to the next similar case..." className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary" /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="submit" disabled={!valid}><Archive aria-hidden="true" className="size-4" />Simpan resolution dan tutup case</Button><p className="text-xs text-muted-foreground">Reusable rule becomes a proposal. It never changes the Playbook without approval.</p></div>
        </form>
      )}
    </section>
  );
}
