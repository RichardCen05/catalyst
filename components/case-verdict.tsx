"use client";

import { useState } from "react";
import { Check, ChevronDown, Circle } from "lucide-react";
import { buildInvestmentMemo } from "@/lib/memo";
import { deriveMonitorTriggers } from "@/lib/monitor";
import { useCatalystStore } from "@/lib/store";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { dispositionLabel } from "@/lib/ui-labels";

// Verdict, audit trail, monitor queue and memo export. These were the parts of
// the removed summary tab that are not repeated anywhere else; they live in the
// review tab now, next to the decision they belong to.

export function CaseDisposition({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const recordInsight = useCatalystStore((state) => state.recordInsight);
  const [tracked, setTracked] = useState(false);
  const focusLocked = researchCase.clarification.required;

  const trackObservable = () => {
    recordInsight({
      symbol,
      category: "missing-context",
      note: `Pantau: ${researchCase.researchDisposition.monitorObservable} Buka kembali bila: ${researchCase.researchDisposition.reopenWhen}`,
    });
    setTracked(true);
  };

  return (
    <section aria-label="Tindakan riset" className="mb-4 grid gap-4 overflow-hidden rounded-[12px] border border-border bg-primary/6 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
      <div>
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Tindakan riset</p>
        <div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="editorial text-2xl">{dispositionLabel(researchCase.researchDisposition.kind)}</h2>{focusLocked ? <span className="rounded border border-attention/35 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">Sementara</span> : null}</div>
        <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{researchCase.researchDisposition.reason}</p>
        <p className="mt-3 font-mono text-[10px] text-muted-foreground">PEMICU · {researchCase.caseId}</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground"><strong className="font-medium text-foreground">{researchCase.trigger.title}</strong> — {researchCase.materialChange.baseline}</p>
      </div>
      <dl className="grid gap-px self-start overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2">
        <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Pantau <span className="font-normal text-muted-foreground">· opsional, bisa nanti</span></dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.monitorObservable}<button type="button" onClick={trackObservable} className="mt-2 inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">{tracked ? "Sudah masuk antrean pantauan" : "Jadikan item pantauan"}</button></dd></div>
        <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Buka kembali jika</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.reopenWhen}</dd></div>
      </dl>
    </section>
  );
}

export function CaseAuditDetails({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const caseStatuses = useCatalystStore((state) => state.caseStatuses);
  const status = caseStatuses[symbol] ?? researchCase.status;
  return (
    <details className="group mb-4 overflow-hidden rounded-[12px] border border-border bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">Lihat rincian audit<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary>
      <div className="grid gap-6 border-t border-border bg-background p-4 sm:p-5 lg:grid-cols-2">
        <section><h3 className="text-xs font-semibold">Aturan yang memengaruhi urutan</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.priority.ruleTrace.slice(0, 3).map((item) => <li key={item.id}><strong className="text-foreground">{item.rule}</strong>. {item.effect}</li>)}</ul></section>
        <section><h3 className="text-xs font-semibold">Hal yang belum terjawab</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.unresolvedQuestions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></section>
        <section><h3 className="text-xs font-semibold">Bukti penyangkal dan catatan</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.counterEvidence.slice(0, 2).map((item) => <li key={item}>{item}</li>)}{researchCase.userNotes.map((item) => <li key={item.id} className="text-attention-foreground">Catatan Anda: {item.note}</li>)}</ul></section>
        <section><h3 className="text-xs font-semibold">Tahap kasus</h3><ol className="mt-2 space-y-2">{researchCase.lifecycle.map((step) => { const complete = status === "closed" || step.state === "complete"; return <li key={step.key} className="flex items-center gap-2 text-xs"><span className={`grid size-5 place-items-center rounded-full border ${complete ? "border-positive/40 text-positive" : "border-primary/40 text-primary"}`}>{complete ? <Check aria-hidden="true" className="size-3" /> : <Circle aria-hidden="true" className="size-2.5" />}</span>{step.label}</li>; })}</ol></section>
      </div>
    </details>
  );
}

export function CaseMonitorQueue({ researchCase }: { researchCase: ResearchCase }) {
  const triggers = deriveMonitorTriggers(researchCase);
  return (
    <section aria-label="Antrean pantauan" className="mb-4 overflow-hidden rounded-[12px] border border-border bg-surface px-4 py-4 sm:px-5">
      <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Antrean pantauan · {triggers.length} pemicu menunggu rekaman baru</p>
      <ul className="mt-3 space-y-2">
        {triggers.map((trigger) => (
          <li key={trigger.id} className="rounded-[8px] border border-border bg-background p-3 text-xs leading-5">
            <strong className="block text-[13px]">{trigger.label}</strong>
            <span className="mt-1 block text-muted-foreground">{trigger.condition}</span>
            <span className="mt-1 block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Menunggu · {trigger.source}</span>
          </li>
        ))}
      </ul>
    </section>
  );
}

export function CaseMemoActions({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const [shared, setShared] = useState(false);
  const [memoShared, setMemoShared] = useState(false);

  const shareSummary = async () => {
    const text = [
      `${symbol} · ${researchCase.trigger.title}`,
      `Pembanding: ${researchCase.materialChange.baseline}`,
      `Alasan material: ${researchCase.materialChange.whyMaterial}`,
      `Tindakan riset: ${researchCase.researchDisposition.label} — ${researchCase.researchDisposition.reason}`,
      `Pantau: ${researchCase.researchDisposition.monitorObservable}`,
      `Buka kembali bila: ${researchCase.researchDisposition.reopenWhen}`,
      `Rekaman ${researchCase.asOf} · bukan pasar live.`,
    ].join("\n");
    try {
      await navigator.clipboard.writeText(text);
      setShared(true);
    } catch {
      setShared(false);
    }
  };

  const shareMemo = async () => {
    try {
      await navigator.clipboard.writeText(buildInvestmentMemo(researchCase));
      setMemoShared(true);
    } catch {
      setMemoShared(false);
    }
  };

  const downloadMemo = () => {
    const blob = new Blob([buildInvestmentMemo(researchCase)], { type: "text/markdown;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const anchor = document.createElement("a");
    anchor.href = url;
    anchor.download = `memo-${symbol}-${researchCase.asOf.slice(0, 10)}.md`;
    anchor.click();
    URL.revokeObjectURL(url);
  };

  return (
    <div className="mt-4 flex flex-wrap items-center gap-2 border-t border-border pt-4">
      <button type="button" onClick={shareSummary} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary">{shared ? "Ringkasan tersalin" : "Salin ringkasan"}</button>
      <button type="button" onClick={shareMemo} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary">{memoShared ? "Memo tersalin" : "Salin memo"}</button>
      <button type="button" onClick={downloadMemo} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary">Unduh .md</button>
    </div>
  );
}
