"use client";

import Link from "next/link";
import { useState } from "react";
import { Check, ChevronDown, Circle, GitBranch, PauseCircle, Save } from "lucide-react";
import type { ResearchCase, SymbolCode } from "@/lib/types";
import { useCatalystStore } from "@/lib/store";
import { buildInvestmentMemo } from "@/lib/memo";
import { deriveMonitorTriggers } from "@/lib/monitor";
import { dispositionLabel, uiLabel } from "@/lib/ui-labels";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";

export function ResearchCaseOverview({ researchCase, symbol }: { researchCase: ResearchCase; symbol: SymbolCode }) {
  const caseMandates = useCatalystStore((state) => state.caseMandates);
  const caseStatuses = useCatalystStore((state) => state.caseStatuses);
  const setCaseMandate = useCatalystStore((state) => state.setCaseMandate);
  const setCaseClarification = useCatalystStore((state) => state.setCaseClarification);
  const recordInsight = useCatalystStore((state) => state.recordInsight);
  const [saved, setSaved] = useState(false);
  const [shared, setShared] = useState(false);
  const [memoShared, setMemoShared] = useState(false);
  const [tracked, setTracked] = useState(false);
  const triggers = deriveMonitorTriggers(researchCase);
  const mandate = caseMandates[symbol] ?? researchCase.mandate;
  const status = caseStatuses[symbol] ?? researchCase.status;
  const caseNotes = researchCase.userNotes;

  const saveMandate = () => {
    setCaseMandate(symbol, mandate.trim() || researchCase.mandate);
    setSaved(true);
  };

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
          <div className="mt-1 flex flex-wrap items-center gap-2"><h2 className="editorial text-2xl">{dispositionLabel(researchCase.researchDisposition.kind)}</h2>{researchCase.clarification.required ? <span className="rounded border border-attention/35 px-2 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">Sementara</span> : null}</div>
          <p className="mt-2 max-w-xl text-sm leading-6 text-muted-foreground">{researchCase.researchDisposition.reason}</p>
        </div>
        <dl className="grid gap-px overflow-hidden rounded-[8px] border border-border bg-border sm:grid-cols-2">
          <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Pantau</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.monitorObservable}<button type="button" onClick={trackObservable} className="mt-2 inline-flex min-h-8 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">{tracked ? "Sudah masuk antrean pantauan" : "Jadikan item pantauan"}</button></dd></div>
          <div className="bg-surface p-3"><dt className="text-[11px] font-medium">Buka kembali jika</dt><dd className="mt-1 text-xs leading-5 text-muted-foreground">{researchCase.researchDisposition.reopenWhen}</dd></div>
        </dl>
      </section>

      <div className="grid gap-5 p-4 sm:p-5 lg:grid-cols-[minmax(0,1.25fr)_minmax(260px,0.75fr)]">
        <div>
          <label htmlFor={`mandate-${symbol}`} className="text-xs font-medium">Apa yang ingin dibuktikan?</label>
          <textarea id={`mandate-${symbol}`} value={mandate} onChange={(event) => { setCaseMandate(symbol, event.target.value); setSaved(false); }} rows={3} className="mt-2 w-full resize-y rounded-[8px] border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-primary focus:ring-2 focus:ring-ring/25" />
          <div className="mt-2 flex flex-wrap items-center gap-2"><Button size="sm" onClick={saveMandate}><Save aria-hidden="true" className="size-3.5" />Simpan dan susun ulang</Button>{saved ? <span className="inline-flex items-center gap-1 text-xs text-positive" role="status"><Check aria-hidden="true" className="size-3.5" />Pertanyaan tersimpan</span> : null}</div>
        </div>
        <section className="border-t border-border pt-4 lg:border-l lg:border-t-0 lg:pl-5 lg:pt-0" aria-labelledby="case-trigger-title">
          <p className="font-mono text-[10px] text-muted-foreground">PEMICU · {researchCase.caseId}</p>
          <h3 id="case-trigger-title" className="mt-2 text-sm font-semibold leading-5">{researchCase.trigger.title}</h3>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{researchCase.materialChange.baseline}</p>
        </section>
      </div>

      <section id="clarification-gate" aria-label="Penentuan fokus" className={`scroll-mt-24 border-t border-border px-4 py-4 sm:px-5 ${researchCase.clarification.required ? "bg-attention/6" : "bg-positive/5"}`}>
        {researchCase.clarification.required ? <div>
          <div className="flex items-start gap-3"><PauseCircle aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-attention" /><div><p className="font-mono text-[10px] uppercase tracking-wider text-attention-foreground">Pilih fokus sebelum lanjut</p><h2 className="mt-1 text-sm font-semibold">Hasil bisnis mana yang ingin diuji?</h2><p className="mt-1 max-w-2xl text-xs leading-5 text-muted-foreground">{researchCase.clarification.reason}</p></div></div>
          <div className="mt-4 grid gap-2 md:grid-cols-2">{researchCase.clarification.options.map((option, index) => <button key={option.id} type="button" onClick={() => setCaseClarification(symbol, option.id)} data-tour-action={symbol === "ANTM" && index === 0 ? "resolve-clarification" : undefined} className="cursor-pointer rounded-[8px] border border-border bg-surface p-3 text-left transition-colors hover:border-primary/50 hover:bg-primary/6 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-mono text-[10px] uppercase tracking-wider text-primary">{uiLabel(option.label)}</span><strong className="mt-1 block text-sm leading-5">{option.question}</strong><span className="mt-2 block text-xs leading-5 text-muted-foreground">Sumber: {option.sourceConsequence}</span><span className="mt-1 block text-xs leading-5 text-muted-foreground">Indikator: {option.observable}</span></button>)}</div>
        </div> : <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:justify-between"><div><p className="font-mono text-[10px] uppercase tracking-wider text-positive">Fokus sudah dipilih</p><p className="mt-1 text-sm font-medium">{researchCase.clarification.reason}</p></div><button type="button" onClick={() => setCaseMandate(symbol, mandate)} className="min-h-9 self-start rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Ubah fokus</button></div>}
      </section>

      {!researchCase.clarification.required ? <section aria-label="Rencana analisis" className="border-t border-border bg-background px-4 py-5 sm:px-5">
        <div className="flex flex-col gap-3 sm:flex-row sm:items-start sm:justify-between"><div className="max-w-2xl"><div className="flex flex-wrap items-center gap-2"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Rencana analisis</p><span className="rounded border border-primary/35 bg-primary/8 px-2 py-0.5 font-mono text-[10px] text-primary">Fokus · {uiLabel(researchCase.researchPlan.focus)}</span></div><p className="mt-2 text-sm leading-6 text-muted-foreground">{researchCase.researchPlan.rationale}</p></div><Link href={`/impact?company=${symbol}`} data-tour-action={symbol === "ANTM" ? "open-impact" : undefined} className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-medium text-primary"><GitBranch aria-hidden="true" className="size-3.5" />Buka sebab akibat</Link></div>
        <div className="mt-5 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border lg:grid-cols-3">
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Hipotesis</h3><ol className="mt-3 space-y-2">{researchCase.researchPlan.hypothesisTree.slice(0, 3).map((item, index) => <li key={item.id} className="flex gap-2 text-xs leading-5"><span className="font-mono text-primary">{index + 1}</span><span>{item.claim}</span></li>)}</ol></section>
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Sumber utama</h3><ol className="mt-3 space-y-2">{researchCase.sourcePlan.slice(0, 3).map((item, index) => <li key={item} className="flex gap-2 text-xs leading-5 text-muted-foreground"><span className="font-mono text-primary">{index + 1}</span>{item}</li>)}</ol></section>
          <section className="bg-surface p-4"><h3 className="text-xs font-semibold">Indikator</h3><ul className="mt-3 space-y-2">{researchCase.researchPlan.observables.slice(0, 3).map((item) => <li key={`${item.dimension}-${item.metric}`} className="text-xs leading-5 text-muted-foreground"><strong className="text-foreground">{uiLabel(item.dimension)}</strong><span className="block">{item.metric}</span></li>)}</ul></section>
        </div>
      </section> : null}

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

      <div className="flex flex-wrap items-center justify-between gap-3 border-t border-border px-4 py-3 sm:px-5"><p className="text-xs text-muted-foreground">Catat hasil setelah riset selesai.</p><div className="flex flex-wrap items-center gap-2"><button type="button" onClick={shareSummary} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">{shared ? "Ringkasan tersalin" : "Salin ringkasan riset"}</button><button type="button" onClick={shareMemo} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">{memoShared ? "Memo tersalin" : "Salin memo riset"}</button><button type="button" onClick={downloadMemo} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Unduh memo .md</button><Link href={`/cases/${symbol}?tab=review#case-resolution`} className="inline-flex min-h-9 items-center rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">Buka Tinjau</Link></div></div>
    </Panel>
  );
}
