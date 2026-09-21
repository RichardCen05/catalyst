"use client";

import { PauseCircle } from "lucide-react";
import { primarySymbol } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { uiLabel } from "@/lib/ui-labels";

// The focus choice used to live inside a summary tab. It is the one decision a
// reader must make before the evidence tabs mean anything, so it now sits above
// the tab bar: full cards until a focus is picked, one line afterwards.
export function CaseFocusGate({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const setCaseClarification = useCatalystStore((state) => state.setCaseClarification);
  const clearCaseClarification = useCatalystStore((state) => state.clearCaseClarification);
  const focusLocked = researchCase.clarification.required;

  return (
    <section id="clarification-gate" aria-label="Penentuan fokus" className={`scroll-mt-24 mb-6 overflow-hidden rounded-[12px] border px-4 py-4 sm:px-5 ${focusLocked ? "border-attention/35 bg-attention/6" : "border-border bg-surface"}`}>
      <p className="text-xs leading-5 text-muted-foreground"><span className="font-medium text-foreground">Pertanyaan yang diuji</span> · {researchCase.mandate}</p>
      {focusLocked ? <div className="mt-4 border-t border-border pt-4">
        <div className="flex items-start gap-3"><PauseCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-attention" /><div><p className="font-mono text-[10px] uppercase tracking-wider text-attention-foreground">Klik satu kartu untuk mulai</p><h2 className="mt-1 text-sm font-semibold">Hasil bisnis mana yang ingin diuji?</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{researchCase.clarification.reason} Pilihan ini menentukan indikator di tab Pasar dan Bisnis.</p></div></div>
        <div className="mt-4 grid gap-2 md:grid-cols-2">{researchCase.clarification.options.map((option, index) => <button key={option.id} type="button" onClick={() => setCaseClarification(symbol, option.id)} data-tour-action={symbol === primarySymbol && index === 0 ? "resolve-clarification" : undefined} className="cursor-pointer rounded-[8px] border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">{uiLabel(option.label)}</span><strong className="mt-1 block text-sm leading-5">{option.question}</strong><span className="mt-2 block text-xs leading-5 text-muted-foreground">Sumber: {option.sourceConsequence}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Indikator: {option.observable}</span></button>)}</div>
      </div> : <div className="mt-3 flex flex-col gap-2 border-t border-border pt-3 sm:flex-row sm:items-center sm:justify-between">
        <div className="min-w-0"><p className="font-mono text-[10px] uppercase tracking-wider text-positive">Fokus sudah dipilih</p><p className="mt-1 text-sm font-medium">{researchCase.clarification.reason}</p></div>
        <button type="button" onClick={() => clearCaseClarification(symbol)} className="min-h-9 self-start rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Ubah fokus</button>
      </div>}
    </section>
  );
}
