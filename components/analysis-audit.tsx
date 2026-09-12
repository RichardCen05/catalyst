"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { AlertTriangle, CheckCircle2, ClipboardCheck, Database, X } from "lucide-react";
import type { HypothesisTrace, SymbolCode } from "@/lib/types";
import { AgentTrace } from "@/components/agent-trace";
import { Button } from "@/components/ui/button";

type AnalysisAuditProps = {
  symbol: SymbolCode;
  traces: HypothesisTrace[];
  missingEvidence: string[];
  sourceCount: number;
};

export function AnalysisAudit({ symbol, traces, missingEvidence, sourceCount }: AnalysisAuditProps) {
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm"><ClipboardCheck aria-hidden="true" className="size-3.5" />Buka audit</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-100 w-[min(100vw,620px)] overflow-y-auto border-l border-border bg-surface p-4 shadow-2xl focus:outline-none sm:p-6">
          <div className="flex items-start gap-3">
            <div className="min-w-0 flex-1">
              <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Fixture-only audit</p>
              <Dialog.Title className="mt-1 text-xl font-semibold">Audit analisis {symbol}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">Periksa trace, gate, sumber, dan batas bukti tanpa memenuhi layar utama.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup audit"><X aria-hidden="true" className="size-4" /></Button></Dialog.Close>
          </div>

          <div className="mt-5 grid gap-2 sm:grid-cols-3">
            <div className="rounded-lg border border-border bg-background p-3"><p className="font-mono text-lg font-semibold">{traces.length}</p><p className="mt-1 text-xs text-muted-foreground">Hipotesis diuji</p></div>
            <div className="rounded-lg border border-border bg-background p-3"><p className="flex items-center gap-1.5 font-mono text-lg font-semibold"><Database aria-hidden="true" className="size-4 text-primary" />{sourceCount}</p><p className="mt-1 text-xs text-muted-foreground">Sumber terhubung</p></div>
            <div className="rounded-lg border border-border bg-background p-3"><p className="flex items-center gap-1.5 text-sm font-semibold text-positive"><CheckCircle2 aria-hidden="true" className="size-4" />3 gate aktif</p><p className="mt-1 text-xs text-muted-foreground">Citation, conflict, language</p></div>
          </div>

          <div className="mt-4"><AgentTrace traces={traces} /></div>

          <section className="mt-4 rounded-xl border border-border bg-background" aria-labelledby="missing-evidence-title">
            <div className="border-b border-border px-4 py-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-attention">Fail closed</p><h2 id="missing-evidence-title" className="mt-1 text-base font-semibold">Belum diperiksa</h2></div>
            <ul className="divide-y divide-border px-4">{missingEvidence.map((item) => <li key={item} className="flex gap-2 py-3 text-sm leading-6 text-muted-foreground"><AlertTriangle aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-attention" />{item}</li>)}</ul>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
