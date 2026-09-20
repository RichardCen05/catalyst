"use client";

import Link from "next/link";
import { useState } from "react";
import { ArrowRight, Check, ChevronDown, Circle, GitBranch, PauseCircle } from "lucide-react";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { primarySymbol } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import { buildInvestmentMemo } from "@/lib/memo";
import { deriveMonitorTriggers } from "@/lib/monitor";
import { dispositionLabel, uiLabel } from "@/lib/ui-labels";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

export function ResearchCaseOverview({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const caseStatuses = useCatalystStore((state) => state.caseStatuses);
  const recordInsight = useCatalystStore((state) => state.recordInsight);
  const [shared, setShared] = useState(false);
  const [memoShared, setMemoShared] = useState(false);
  const [tracked, setTracked] = useState(false);
  const triggers = deriveMonitorTriggers(researchCase);
  const status = caseStatuses[symbol] ?? researchCase.status;
  const caseNotes = researchCase.userNotes;
  const focusLocked = researchCase.clarification.required;

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

  const trackObservable = () => {
    recordInsight({
      symbol,
      category: "missing-context",
      note: `Pantau: ${researchCase.researchDisposition.monitorObservable} Buka kembali bila: ${researchCase.researchDisposition.reopenWhen}`,
    });
    setTracked(true);
  };

  return (
    <Panel className="overflow-hidden">
      <PanelHeader title="Pertanyaan riset" action={<span className={`rounded border px-2 py-1 font-mono text-[10px] uppercase tracking-wider ${status === "closed" ? "border-positive/35 bg-positive/10 text-positive" : "border-primary/35 bg-primary/10 text-primary"}`}>{status === "closed" ? "Kasus selesai" : "Kasus terbuka"}</span>} />

      <section aria-label="Tindakan riset" className="grid gap-4 border-b border-border bg-primary/6 px-4 py-4 sm:px-5 lg:grid-cols-[minmax(0,0.8fr)_minmax(0,1.2fr)]">
        <div>
          <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Tindakan riset</p>
          <div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="editorial text-2xl">{dispositionLabel(researchCase.researchDisposition.kind)}</h2>{focusLocked ? <span className="rounded border border-attention/35 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">Sementara</span> : null}</div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{researchCase.researchDisposition.reason}</p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2">
          <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Pantau <span className="font-normal text-muted-foreground">· opsional, bisa nanti</span></dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.monitorObservable}<button type="button" onClick={trackObservable} className="mt-2 inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">{tracked ? "Sudah masuk antrean pantauan" : "Jadikan item pantauan"}</button></dd></div>
          <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Buka kembali jika</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.reopenWhen}</dd></div>
        </dl>
      </section>

      <nav aria-label="Langkah riset" className="border-b border-border bg-background px-4 py-3 sm:px-5">
        <ol className="flex flex-col gap-2 text-xs sm:flex-row sm:items-center sm:gap-5">
          <li className="flex items-center gap-2"><span aria-hidden="true" className={`grid size-5 place-items-center rounded-full border font-mono text-[10px] ${focusLocked ? "border-primary/50 bg-primary/10 text-primary" : "border-positive/40 text-positive"}`}>{focusLocked ? "1" : <Check className="size-3" />}</span><span className={focusLocked ? "font-semibold" : "text-muted-foreground"}>1 · Pilih fokus {focusLocked ? "(sekarang)" : "(selesai)"}</span></li>
          <li className="flex items-center gap-2"><span aria-hidden="true" className={`grid size-5 place-items-center rounded-full border font-mono text-[10px] ${focusLocked ? "border-border text-muted-foreground" : "border-primary/50 bg-primary/10 text-primary"}`}>2</span><span className={focusLocked ? "text-muted-foreground" : "font-semibold"}>2 · Periksa Pasar → Bisnis</span></li>
          <li className="flex items-center gap-2"><span aria-hidden="true" className="grid size-5 place-items-center rounded-full border border-border font-mono text-[10px] text-muted-foreground">3</span><span className="text-muted-foreground">3 · Putuskan di Tinjau</span></li>
        </ol>
      </nav>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <div>
          <p className="text-xs font-medium">Pertanyaan yang diuji <span className="font-normal text-muted-foreground">· otomatis, tidak perlu diisi</span></p>
          <p className="mt-2 rounded-[8px] border border-border bg-muted/40 p-3 text-sm leading-6">{researchCase.mandate}</p>
        </div>
        <section className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0" aria-labelledby="case-trigger-title">
          <p className="font-mono text-[10px] text-muted-foreground">PEMICU · {researchCase.caseId}</p>
          <h3 id="case-trigger-title" className="mt-2 text-sm font-semibold leading-5">{researchCase.trigger.title}</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{researchCase.materialChange.baseline}</p>
        </section>
      </div>

      <CaseFocusGate researchCase={researchCase} symbol={symbol} className="border-t border-border" />

      {focusLocked ? <section aria-label="Rencana analisis" className="border-t border-border bg-background px-4 py-5 opacity-70 sm:px-5">
        <p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Langkah 2 · terkunci</p>
        <p className="mt-2 max-w-2xl text-sm leading-6 text-muted-foreground">Rencana analisis, tab Pasar, dan tab Bisnis terbuka setelah Anda memilih satu fokus di Langkah 1.</p>
      </section> : <section aria-label="Rencana analisis" className="border-t border-border bg-background px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-2xl"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Langkah 2 · rencana analisis</p><span className="rounded border border-primary/35 bg-primary/8 px-2 py-0.5 font-mono text-[10px] text-primary">Fokus · {uiLabel(researchCase.researchPlan.focus)}</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{researchCase.researchPlan.rationale}</p></div></div>
        <div className="mt-5 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border lg:grid-cols-3">
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Hipotesis</h3><ol className="mt-3 space-y-2">{researchCase.researchPlan.hypothesisTree.slice(0, 3).map((item, index) => <li key={item.id} className="flex gap-2 text-xs leading-5"><span className="font-mono text-primary">{index + 1}</span><span>{item.claim}</span></li>)}</ol></section>
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Sumber utama</h3><ol className="mt-3 space-y-2">{researchCase.sourcePlan.slice(0, 3).map((item, index) => <li key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="font-mono text-primary">{index + 1}</span>{item}</li>)}</ol></section>
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Indikator</h3><ul className="mt-3 space-y-2">{researchCase.researchPlan.observables.slice(0, 3).map((item) => <li key={`${item.dimension}-${item.metric}`} className="text-xs leading-5 text-muted-foreground"><strong className="text-foreground">{uiLabel(item.dimension)}</strong><span className="block">{item.metric}</span></li>)}</ul></section>
        </div>
        <div className="mt-4 flex flex-col gap-2 sm:flex-row sm:items-center">
          <Link href={`/cases/${symbol}?tab=market`} className="inline-flex min-h-9 items-center gap-2 rounded-[6px] bg-brand px-3 text-xs font-medium text-brand-foreground transition-colors hover:bg-brand/88 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Lanjut ke Pasar · periksa bukti<ArrowRight aria-hidden="true" className="size-3.5" /></Link>
          <Link href={`/cases/${symbol}?tab=business`} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Lewati ke Bisnis · Langkah 2</Link>
          <Link href={`/impact?company=${symbol}`} data-tour-action={symbol === primarySymbol ? "open-impact" : undefined} className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary"><GitBranch aria-hidden="true" className="size-3.5" />Buka peta sebab akibat (opsional)</Link>
        </div>
      </section>}

      <details className="group border-t border-border">
        <summary className="flex min-h-12 cursor-pointer list-none items-center px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5">Lihat rincian audit<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary>
        <div className="grid gap-6 border-t border-border bg-background p-4 sm:p-5 lg:grid-cols-2">
          <section><h3 className="text-xs font-semibold">Aturan yang memengaruhi urutan</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.priority.ruleTrace.slice(0, 3).map((item) => <li key={item.id}><strong className="text-foreground">{item.rule}</strong>. {item.effect}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Hal yang belum terjawab</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.unresolvedQuestions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Bukti penyangkal dan catatan</h3><ul className="mt-2 space-y-2 text-xs leading-5 text-muted-foreground">{researchCase.counterEvidence.slice(0, 2).map((item) => <li key={item}>{item}</li>)}{caseNotes.map((item) => <li key={item.id} className="text-attention-foreground">Catatan Anda: {item.note}</li>)}</ul></section>
          <section><h3 className="text-xs font-semibold">Tahap kasus</h3><ol className="mt-2 space-y-2">{researchCase.lifecycle.map((step) => { const complete = status === "closed" || step.state === "complete"; return <li key={step.key} className="flex items-center gap-2 text-xs"><span className={`grid size-5 place-items-center rounded-full border ${complete ? "border-positive/40 text-positive" : "border-primary/40 text-primary"}`}>{complete ? <Check aria-hidden="true" className="size-3" /> : <Circle aria-hidden="true" className="size-2.5" />}</span>{step.label}</li>; })}</ol></section>
        </div>
      </details>

      <section aria-label="Antrean pantauan" className="border-t border-border px-4 py-4 sm:px-5">
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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"><p className="text-xs text-muted-foreground">Langkah 3 · catat hasil setelah Pasar dan Bisnis selesai.</p><div className="flex flex-wrap items-center gap-2"><Link href={`/cases/${symbol}?tab=review#case-resolution`} className="inline-flex min-h-9 items-center rounded-[6px] border border-border bg-surface px-3 text-xs font-medium hover:bg-muted">Buka Tinjau & putuskan</Link><button type="button" onClick={shareSummary} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary">{shared ? "Ringkasan tersalin" : "Salin ringkasan"}</button><button type="button" onClick={shareMemo} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary">{memoShared ? "Memo tersalin" : "Salin memo"}</button><button type="button" onClick={downloadMemo} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-muted-foreground hover:bg-muted hover:text-primary">Unduh .md</button></div></div>
    </Panel>
  );
}

/** The focus gate is the one part of the case overview the tabbed workspace
 *  still needs: Pasar and Bisnis stay locked until a focus is chosen, so it
 *  renders above the tabs there and inside the panel here. */
export function CaseFocusGate({ researchCase, symbol, className }: { researchCase: ResearchCase; symbol: SymbolCode; className?: string }) {
  const setCaseClarification = useCatalystStore((state) => state.setCaseClarification);
  const clearCaseClarification = useCatalystStore((state) => state.clearCaseClarification);
  const focusLocked = researchCase.clarification.required;

  return (
    <section id="clarification-gate" aria-label="Penentuan fokus" className={cn("scroll-mt-24 px-4 py-4 sm:px-5", focusLocked ? "bg-attention/6" : "bg-positive/5", className)}>
      {focusLocked ? <div>
          <div className="flex items-start gap-3"><PauseCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-attention" /><div><p className="font-mono text-[10px] uppercase tracking-wider text-attention-foreground">Langkah 1 · klik satu kartu untuk mulai</p><h2 className="mt-1 text-sm font-semibold">Hasil bisnis mana yang ingin diuji?</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{researchCase.clarification.reason} Pilihan ini menentukan indikator di tab Pasar dan Bisnis.</p></div></div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{researchCase.clarification.options.map((option, index) => <button key={option.id} type="button" onClick={() => setCaseClarification(symbol, option.id)} data-tour-action={symbol === primarySymbol && index === 0 ? "resolve-clarification" : undefined} className="cursor-pointer rounded-[8px] border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">{uiLabel(option.label)}</span><strong className="mt-1 block text-sm leading-5">{option.question}</strong><span className="mt-2 block text-xs leading-5 text-muted-foreground">Sumber: {option.sourceConsequence}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Indikator: {option.observable}</span></button>)}</div>
          <p className="mt-3 text-xs leading-5 text-muted-foreground">Sesudah pilih: lanjut ke <strong className="text-foreground">Langkah 2 · tab Pasar</strong>, lalu Bisnis, lalu Tinjau.</p>
        </div> : <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-wider text-positive">Langkah 1 selesai · fokus sudah dipilih</p><p className="mt-1 text-sm font-medium">{researchCase.clarification.reason}</p></div><button type="button" onClick={() => clearCaseClarification(symbol)} className="min-h-9 self-start rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Ubah fokus</button></div>}
    </section>
  );
}
