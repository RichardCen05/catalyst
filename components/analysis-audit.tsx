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
              <Dialog.Title className="editorial text-2xl">Audit analisis {symbol}</Dialog.Title>
              <Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">Periksa jejak, sumber, dan batas bukti tanpa memenuhi layar utama.</Dialog.Description>
            </div>
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup audit"><X aria-hidden="true" className="size-4" /></Button></Dialog.Close>
          </div>

          <dl className="mt-5 grid border-y border-border sm:grid-cols-3 sm:divide-x sm:divide-border">
            <div className="py-3 sm:px-3 sm:first:pl-0"><dt className="text-xs text-muted-foreground">Hipotesis diuji</dt><dd className="mt-1 font-mono text-lg font-semibold">{traces.length}</dd></div>
            <div className="border-t border-border py-3 sm:border-t-0 sm:px-3"><dt className="text-xs text-muted-foreground">Sumber terhubung</dt><dd className="mt-1 flex items-center gap-1.5 font-mono text-lg font-semibold"><Database aria-hidden="true" className="size-4 text-primary" />{sourceCount}</dd></div>
            <div className="border-t border-border py-3 sm:border-t-0 sm:px-3"><dt className="text-xs text-muted-foreground">Pemeriksaan aktif</dt><dd className="mt-1 flex items-center gap-1.5 text-sm font-semibold text-positive"><CheckCircle2 aria-hidden="true" className="size-4" />3 · sumber, konflik, bahasa</dd></div>
          </dl>

          <div className="mt-4"><AgentTrace traces={traces} /></div>

          <section className="mt-4 rounded-xl border border-border bg-background" aria-labelledby="missing-evidence-title">
            <div className="border-b border-border px-4 py-3"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-attention">Berhenti saat bukti kurang</p><h2 id="missing-evidence-title" className="mt-1 text-base font-semibold">Belum diperiksa</h2></div>
            <ul className="divide-y divide-border px-4">{missingEvidence.map((item) => <li key={item} className="flex gap-2 py-3 text-sm leading-6 text-muted-foreground"><AlertTriangle aria-hidden="true" className="mt-1 size-3.5 shrink-0 text-attention" />{item}</li>)}</ul>
          </section>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
