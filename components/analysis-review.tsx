"use client";

import { FormEvent, useState } from "react";
import { useCatalystStore } from "@/lib/store";
import type { PillarKey, SymbolCode, UserInsight } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { IconCheck, IconGate, IconNote, IconVerified } from "@/components/ui/icons";

const categoryLabels: Record<UserInsight["category"], string> = {
  "data-error": "Data terlihat keliru",
  "missing-context": "Konteks belum masuk",
  "alternative-interpretation": "Interpretasi alternatif",
};

const pillarLabels: Record<PillarKey, string> = {
  concentration: "Konsentrasi",
  volume: "Volume",
  momentum: "Momentum",
  catalyst: "Katalis",
};

const statusLabels: Record<UserInsight["status"], string> = {
  pending: "menunggu",
  incorporated: "diperiksa",
  dismissed: "diabaikan",
};

export function AnalysisReview({ symbol }: { symbol: SymbolCode }) {
  const { insights, recordInsight } = useCatalystStore();
  const [note, setNote] = useState("");
  const [category, setCategory] = useState<UserInsight["category"]>("missing-context");
  const [pillar, setPillar] = useState<PillarKey>("catalyst");
  const [sourceUrl, setSourceUrl] = useState("");
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState(false);
  const error = touched && note.trim().length < 8 ? "Jelaskan koreksi sedikitnya 8 karakter agar dapat diuji." : "";
  const sourceError = sourceUrl && !/^https:\/\//i.test(sourceUrl) ? "Gunakan URL HTTPS agar referensi dapat dibuka dengan aman." : "";
  const symbolInsights = insights.filter((insight) => insight.symbol === symbol);

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (note.trim().length < 8 || sourceError) return;
    recordInsight({ symbol, pillar, category, note: note.trim(), sourceUrl: sourceUrl.trim() || undefined });
    setNote("");
    setSourceUrl("");
    setTouched(false);
    setSaved(true);
  };

  return (
    <Panel>
      <PanelHeader title="Koreksi analisis ini" />
      <div className="p-4">
        <div className="flex gap-2 rounded-lg border border-primary/20 bg-primary/7 p-3 text-xs leading-5 text-muted-foreground">
          <ShieldCheck aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <p>Catatan Anda menjadi hipotesis terbuka. Koreksi tidak mengubah angka, rumus, sumber, atau hasil bukti sebelum diperiksa.</p>
        </div>
        <form onSubmit={submit} className="mt-4 space-y-3">
          <div className="grid gap-3 sm:grid-cols-2">
            <label className="text-xs font-medium">Jenis masukan<select value={category} onChange={(event) => setCategory(event.target.value as UserInsight["category"])} className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">{(Object.keys(categoryLabels) as UserInsight["category"][]).map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}</select></label>
            <label className="text-xs font-medium">Pilar terkait<select value={pillar} onChange={(event) => setPillar(event.target.value as PillarKey)} className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">{(Object.keys(pillarLabels) as PillarKey[]).map((item) => <option key={item} value={item}>{pillarLabels[item]}</option>)}</select></label>
          </div>
          <label htmlFor={`analysis-note-${symbol}`} className="block text-xs font-medium">Apa yang keliru atau belum dipertimbangkan?</label>
          <textarea id={`analysis-note-${symbol}`} maxLength={800} value={note} onChange={(event) => { setNote(event.target.value); setSaved(false); }} onBlur={() => setTouched(true)} aria-describedby={`analysis-note-help-${symbol} ${error ? `analysis-note-error-${symbol}` : ""}`} rows={4} placeholder="Contoh: jalur rupiah belum membedakan kontrak dalam USD dan IDR..." className="w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25" />
          <label htmlFor={`analysis-source-${symbol}`} className="block text-xs font-medium">Referensi pendukung (opsional)<input id={`analysis-source-${symbol}`} type="url" value={sourceUrl} onChange={(event) => { setSourceUrl(event.target.value); setSaved(false); }} placeholder="https://..." aria-describedby={sourceError ? `analysis-source-error-${symbol}` : undefined} className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25" /></label>
          <div id={`analysis-note-help-${symbol}`} className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground"><span>Maksimum 800 karakter. Tersimpan lokal.</span><span className="font-mono">{note.length}/800</span></div>
          {error ? <p id={`analysis-note-error-${symbol}`} role="alert" className="text-xs text-danger">{error}</p> : null}
          {sourceError ? <p id={`analysis-source-error-${symbol}`} role="alert" className="text-xs text-danger">{sourceError}</p> : null}
          <div className="flex flex-wrap items-center gap-3"><Button type="submit" disabled={note.trim().length < 8 || Boolean(sourceError)}><IconNote aria-hidden="true" className="size-4" />Kirim untuk verifikasi</Button>{saved ? <p role="status" className="inline-flex items-center gap-1.5 text-xs text-positive"><IconCheck aria-hidden="true" className="size-4" />Tersimpan sebagai hipotesis terbuka</p> : null}</div>
        </form>
        {symbolInsights.length ? <div className="mt-4 border-t border-border pt-4"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{symbolInsights.length} catatan pada {symbol}</p><div className="mt-2 space-y-2">{symbolInsights.slice(0, 2).map((insight) => <article key={insight.id} className="rounded-lg border border-border bg-background p-3"><div className="flex flex-wrap items-center gap-2"><span className="rounded border border-attention/30 bg-attention/8 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{statusLabels[insight.status]}</span><span className="text-[11px] text-muted-foreground">{pillarLabels[insight.pillar ?? "catalyst"]}</span></div><p className="mt-2 text-xs leading-5">{insight.note}</p></article>)}</div></div> : null}
      </div>
    </Panel>
  );
}
