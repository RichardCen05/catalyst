"use client";

import { useState } from "react";
import { Check, ChevronDown, Circle } from "lucide-react";
import { buildInvestmentMemo } from "@/lib/memo";
import { deriveMonitorTriggers } from "@/lib/monitor";
import { useCatalystStore } from "@/lib/store";
import { displayFigure, withStop } from "@/lib/utils";
import type { ResearchCase, SymbolCode } from "@/lib/types";

// Verdict, audit trail, monitor queue and memo export. These were the parts of
// the removed summary tab that are not repeated anywhere else; they live in the
// review tab now, next to the decision they belong to.

export function CaseAuditDetails({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const caseStatuses = useCatalystStore((state) => state.caseStatuses);
  const status = caseStatuses[symbol] ?? researchCase.status;
  // Approved rules first, then the rows the thresholds pushed to the front of
  // the trace. The list is capped, so an approved rule behind three threshold
  // rows would be the one a reader who approved it never sees.
  const trace = [...researchCase.priority.ruleTrace]
    .sort((left, right) => Number(Boolean(right.approved)) - Number(Boolean(left.approved)))
    .slice(0, 3);
  return (
    <details className="group mb-4 overflow-hidden rounded-lg border border-border bg-surface">
      <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">Lihat rincian audit<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary>
      <div className="grid gap-6 border-t border-border bg-background p-4 sm:p-5 lg:grid-cols-2">
        <section><h3 className="text-xs font-semibold">Aturan yang memengaruhi urutan</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{trace.map((item) => <li key={item.id}><strong className="text-foreground">{displayFigure(withStop(item.rule))}</strong> {displayFigure(item.effect)}</li>)}</ul></section>
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
    <section aria-label="Antrean pantauan" className="mb-4 overflow-hidden rounded-lg border border-border bg-surface px-4 py-4 sm:px-5">
      <p className="text-xs text-muted-foreground font-medium">Antrean pantauan · {triggers.length} pemicu menunggu rekaman baru</p>
      <ul className="mt-3 space-y-2">
        {triggers.map((trigger) => (
          <li key={trigger.id} className="rounded-lg border border-border bg-background p-3 text-xs leading-5">
            <strong className="block text-sm">{trigger.label}</strong>
            <span className="mt-1 block text-muted-foreground">{trigger.condition}</span>
            <span className="mt-1 block text-xs text-muted-foreground">Menunggu · {trigger.source}</span>
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
      `Data ${researchCase.asOf} · penutupan sesi, bukan saran transaksi.`,
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
    <div className="flex flex-wrap items-center gap-2">
      <button type="button" onClick={shareSummary} className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{shared ? "Ringkasan tersalin" : "Salin ringkasan"}</button>
      <button type="button" onClick={shareMemo} className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">{memoShared ? "Memo tersalin" : "Salin memo"}</button>
      <button type="button" onClick={downloadMemo} className="inline-flex min-h-9 items-center rounded-lg px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-foreground">Unduh .md</button>
    </div>
  );
}
