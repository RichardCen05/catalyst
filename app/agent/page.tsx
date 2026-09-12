"use client";

import { ArrowDown, ArrowUp, Check, ExternalLink, Eye, MessageSquareWarning, RotateCcw, ShieldCheck, SlidersHorizontal, ToggleLeft, ToggleRight, Trash2 } from "lucide-react";
import { demoProfiles } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { AnswerDepth, Horizon, PillarKey } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { cn } from "@/lib/utils";

const pillarLabels: Record<PillarKey, string> = { concentration: "Konsentrasi", volume: "Volume", momentum: "Momentum", catalyst: "Katalis" };
const horizonLabels: Record<Horizon, string> = { event: "Event · 1-3 hari", swing: "Swing · 1-4 minggu", position: "Position · 1-3 bulan" };
const depthLabels: Record<AnswerDepth, string> = { compact: "Ringkas", standard: "Standar", forensic: "Forensik" };

export default function AgentPage() {
  const { profile, preferences, feedback, insights, setDemoProfile, setHorizon, setDepth, setPillarOrder, togglePreference, setInsightStatus, removeInsight, resetMemory } = useCatalystStore();
  const move = (index: number, direction: -1 | 1) => {
    const next = [...profile.config.pillarOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPillarOrder(next);
  };
  const confirmReset = () => { if (window.confirm("Hapus semua feedback dan kembalikan preferensi awal?")) resetMemory(); };

  return (
    <div>
      <PageHeader eyebrow="Agent studio" title="Atur prioritas, bukan kebenaran" description="Konfigurasi mengubah ranking, urutan, kedalaman, dan quick prompt. Kalkulator, sumber, ambang, konflik, dan language gate tidak berubah." />
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.2fr)_minmax(300px,0.8fr)]">
        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="Human review queue" title={`${insights.filter((item) => item.status === "pending").length} hipotesis menunggu verifikasi`} />
            {insights.length ? <div className="divide-y divide-border">{insights.map((insight) => <article key={insight.id} className="p-4"><div className="flex items-start gap-3"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-attention/10 text-attention-foreground"><MessageSquareWarning aria-hidden="true" className="size-4" /></span><div className="min-w-0 flex-1"><div className="flex flex-wrap items-center gap-2"><span className="font-mono text-xs font-semibold">{insight.symbol}</span><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{insight.pillar ?? "general"}</span><span className="rounded border border-attention/30 bg-attention/8 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{insight.status}</span></div><p className="mt-2 text-sm leading-6">{insight.note}</p>{insight.sourceUrl ? <a href={insight.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline">Buka referensi user<ExternalLink aria-hidden="true" className="size-3" /></a> : null}<p className="mt-2 text-xs leading-5 text-muted-foreground">Catatan user · belum menjadi bukti pasar · {(insight.reviewHistory?.length ?? 1)} perubahan status</p></div></div><div className="mt-3 flex flex-wrap gap-2"><Button variant="secondary" size="sm" onClick={() => setInsightStatus(insight.id, insight.status === "pending" ? "incorporated" : "pending")}>{insight.status === "pending" ? "Tandai sudah diuji" : "Kembalikan ke antrean"}</Button><Button variant="ghost" size="sm" onClick={() => setInsightStatus(insight.id, "dismissed")} disabled={insight.status === "dismissed"}>Abaikan</Button><Button variant="ghost" size="icon" onClick={() => removeInsight(insight.id)} aria-label={`Hapus catatan ${insight.symbol}`} className="ml-auto text-danger"><Trash2 aria-hidden="true" className="size-4" /></Button></div></article>)}</div> : <div className="p-6 text-center text-sm leading-6 text-muted-foreground">Belum ada koreksi. Tambahkan komentar dari halaman analisis perusahaan.</div>}
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Demo profiles" title="Bandingkan dua cara membaca" />
            <div className="grid gap-3 p-4 sm:grid-cols-2">{demoProfiles.map((item) => <button key={item.id} onClick={() => setDemoProfile(item.id)} aria-pressed={profile.id === item.id} className={cn("min-h-32 cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", profile.id === item.id ? "border-primary bg-primary/9" : "border-border bg-background hover:bg-muted")}><div className="flex items-center justify-between"><span className="font-semibold">{item.name}</span>{profile.id === item.id ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}</div><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.description}</p><p className="mt-3 font-mono text-[10px] uppercase tracking-wider text-primary">{pillarLabels[item.config.pillarOrder[0]]} first</p></button>)}</div>
            <div className="border-t border-border px-4 py-3 text-xs leading-5 text-muted-foreground"><Eye aria-hidden="true" className="mr-1.5 inline size-3.5 text-positive" />Buka ANTM dengan kedua profil. Nilai metrik dan verdict sama; urutan empat pilar berubah.</div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Evidence order" title="Urutan empat pilar" />
            <div className="space-y-2 p-4">{profile.config.pillarOrder.map((pillar, index) => <div key={pillar} className="flex items-center gap-3 rounded-lg border border-border bg-background p-2"><span className="grid size-8 place-items-center rounded-md bg-primary/10 font-mono text-xs font-semibold text-primary">{index + 1}</span><span className="flex-1 text-sm font-medium">{pillarLabels[pillar]}</span><Button variant="ghost" size="icon" disabled={index === 0} onClick={() => move(index, -1)} aria-label={`Naikkan ${pillarLabels[pillar]}`}><ArrowUp aria-hidden="true" className="size-4" /></Button><Button variant="ghost" size="icon" disabled={index === 3} onClick={() => move(index, 1)} aria-label={`Turunkan ${pillarLabels[pillar]}`}><ArrowDown aria-hidden="true" className="size-4" /></Button></div>)}</div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Response controls" title="Horizon dan kedalaman" />
            <div className="grid gap-5 p-4 sm:grid-cols-2"><fieldset><legend className="mb-2 text-sm font-medium">Horizon</legend><div className="space-y-2">{(Object.keys(horizonLabels) as Horizon[]).map((item) => <button key={item} onClick={() => setHorizon(item)} aria-pressed={profile.config.horizon === item} className={cn("min-h-11 w-full cursor-pointer rounded-lg border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", profile.config.horizon === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted")}>{horizonLabels[item]}</button>)}</div></fieldset><fieldset><legend className="mb-2 text-sm font-medium">Kedalaman</legend><div className="space-y-2">{(Object.keys(depthLabels) as AnswerDepth[]).map((item) => <button key={item} onClick={() => setDepth(item)} aria-pressed={profile.config.depth === item} className={cn("min-h-11 w-full cursor-pointer rounded-lg border px-3 text-left text-sm transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", profile.config.depth === item ? "border-primary bg-primary/10 text-primary" : "border-border bg-background hover:bg-muted")}>{depthLabels[item]}</button>)}</div></fieldset></div>
          </Panel>
        </div>

        <div className="space-y-4">
          <Panel>
            <PanelHeader eyebrow="Learned memory" title={`${preferences.filter((item) => item.active).length} preferensi aktif`} />
            <div className="divide-y divide-border">{preferences.map((item) => <div key={item.id} className="flex gap-3 p-4"><button onClick={() => togglePreference(item.id)} aria-pressed={item.active} aria-label={`${item.active ? "Matikan" : "Aktifkan"} ${item.label}`} className="grid size-11 shrink-0 cursor-pointer place-items-center rounded-lg text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">{item.active ? <ToggleRight aria-hidden="true" className="size-6" /> : <ToggleLeft aria-hidden="true" className="size-6 text-muted-foreground" />}</button><div><div className="flex flex-wrap items-center gap-2"><p className="text-sm font-medium">{item.label}</p><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{item.source}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.explanation}</p></div></div>)}</div>
            <div className="border-t border-border p-4"><Button variant="danger" className="w-full" onClick={confirmReset}><RotateCcw aria-hidden="true" className="size-4" />Reset memori</Button><p className="mt-2 text-center font-mono text-[10px] text-muted-foreground">{feedback.length} feedback · {insights.length} catatan tersimpan di browser ini</p></div>
          </Panel>

          <Panel>
            <PanelHeader eyebrow="Immutable gates" title="Tidak dapat dilatih ulang" />
            <div className="space-y-3 p-4">{["Angka dan formula", "Metadata citation", "Ambang analisis", "Status kontradiksi", "Pembatas bahasa"].map((item) => <div key={item} className="flex items-center gap-3 text-sm"><span className="grid size-7 place-items-center rounded-md bg-positive/10 text-positive"><ShieldCheck aria-hidden="true" className="size-3.5" /></span>{item}</div>)}</div>
          </Panel>

          <Panel className="p-4"><div className="flex gap-3"><SlidersHorizontal aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-attention" /><div><h2 className="font-semibold">Yang berubah sekarang</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">{pillarLabels[profile.config.pillarOrder[0]]} tampil pertama, horizon {horizonLabels[profile.config.horizon].toLowerCase()}, jawaban {depthLabels[profile.config.depth].toLowerCase()}.</p></div></div></Panel>
        </div>
      </div>
    </div>
  );
}
