"use client";

import Link from "next/link";
import { FormEvent, useState } from "react";
import { Archive, Check, RotateCcw } from "lucide-react";
import type { CaseResolution, ResearchCase, SymbolCode } from "@/lib/types";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { shownDisposition } from "@/lib/case-disposition";
import { dispositionLabel } from "@/lib/ui-labels";

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
    <section id="case-resolution" role="region" aria-label="Hasil kasus" className="overflow-hidden rounded-lg border border-border bg-background">
      <header className="flex items-start justify-between gap-3 border-b border-border px-4 py-4">
        <div><h2 className="editorial text-base">Hasil kasus</h2><p className="mt-1 text-sm text-muted-foreground">Catat keputusan dan pelajaran yang dapat dipakai pada kasus berikutnya.</p></div>
        <span className={`inline-flex h-6 shrink-0 items-center rounded-lg border px-2 text-xs font-medium ${status === "closed" ? "border-foreground text-foreground" : "border-border text-muted-foreground"}`}>{status === "closed" ? "Selesai" : "Terbuka"}</span>
      </header>

      {status === "closed" && stored ? (
        <div className="p-4">
          {savedNow ? <p role="status" className="mb-4 inline-flex items-center gap-1.5 text-xs text-positive"><Check aria-hidden="true" className="size-3.5" />Hasil tersimpan. Usulan aturan menunggu persetujuan.</p> : null}
          <dl className="grid gap-px overflow-hidden rounded-lg border border-border bg-border md:grid-cols-2">
            <div className="bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Hasil</dt><dd className="mt-1 text-sm font-semibold capitalize">{stored.outcome === "supported" ? "Mendukung" : stored.outcome === "challenged" ? "Terbantahkan" : "Masih terbuka"}</dd></div>
            <div className="bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Tindakan riset</dt><dd className="mt-1 text-sm font-semibold">{dispositionLabel(shownDisposition(researchCase.researchDisposition.kind, stored))}</dd></div>
            <div className="bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Hipotesis akhir</dt><dd className="mt-1 text-sm leading-6">{stored.finalHypothesis}</dd></div>
            <div className="bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Bukti yang membatalkan</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{stored.falsifiedBy || "Belum ada bukti pembatal yang dicatat."}</dd></div>
            <div className="bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Asumsi yang keliru</dt><dd className="mt-1 text-sm leading-6 text-muted-foreground">{stored.wrongAssumption || "Belum ada asumsi keliru yang dicatat."}</dd></div>
            <div className="bg-background p-3"><dt className="text-xs font-medium text-muted-foreground">Aturan yang dapat dipakai ulang</dt><dd className="mt-1 text-sm leading-6">{stored.reusableRule}</dd></div>
          </dl>
          <div className="mt-4 flex flex-wrap items-center gap-2"><Button variant="secondary" size="sm" onClick={() => { setCaseStatus(symbol, "open"); setSavedNow(false); }}><RotateCcw aria-hidden="true" className="size-3.5" />Buka kembali kasus</Button><Link href="/ai-learning?section=tinjauan" className="inline-flex min-h-9 items-center rounded-lg px-2 text-sm font-medium underline underline-offset-2">Tinjau usulan aturan</Link></div>
        </div>
      ) : (
        <form onSubmit={submit} className="p-4">
          <div className="grid gap-4 md:grid-cols-2">
            <label className="text-xs font-medium">Hasil pemeriksaan<select aria-label="Hasil pemeriksaan" value={form.outcome} onChange={(event) => setForm((current) => ({ ...current, outcome: event.target.value as CaseResolution["outcome"] }))} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"><option value="supported">Mendukung</option><option value="challenged">Terbantahkan</option><option value="open">Masih terbuka</option></select></label>
            <label className="text-xs font-medium">Tindakan riset<select aria-label="Tindakan riset" value={form.disposition} onChange={(event) => setForm((current) => ({ ...current, disposition: event.target.value as CaseResolution["disposition"] }))} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-foreground"><option value="escalate">Lanjutkan riset</option><option value="monitor">Pantau indikator</option><option value="dismiss">Abaikan pemicu</option></select></label>
            <label className="text-xs font-medium">Hipotesis akhir<textarea aria-label="Hipotesis akhir" rows={3} value={form.finalHypothesis} onChange={(event) => update("finalHypothesis", event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-foreground" /></label>
            <label className="text-xs font-medium">Bukti yang membatalkan<textarea aria-label="Bukti yang membatalkan" rows={3} value={form.falsifiedBy} onChange={(event) => update("falsifiedBy", event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-foreground" /></label>
            <label className="text-xs font-medium">Asumsi yang keliru<textarea aria-label="Asumsi yang keliru" rows={3} value={form.wrongAssumption} onChange={(event) => update("wrongAssumption", event.target.value)} className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-foreground" /></label>
            <label className="text-xs font-medium">Aturan yang dapat dipakai ulang<textarea aria-label="Aturan yang dapat dipakai ulang" rows={3} value={form.reusableRule} onChange={(event) => update("reusableRule", event.target.value)} placeholder="Aturan yang berguna untuk kasus serupa berikutnya..." className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background p-3 text-sm leading-6 outline-none focus:border-foreground" /></label>
          </div>
          <div className="mt-4 flex flex-wrap items-center gap-3"><Button type="submit" disabled={!valid}><Archive aria-hidden="true" className="size-4" />Simpan hasil dan tutup kasus</Button><p className="text-xs text-muted-foreground">Aturan baru hanya menjadi usulan dan tidak dipakai tanpa persetujuan.</p></div>
        </form>
      )}
    </section>
  );
}
