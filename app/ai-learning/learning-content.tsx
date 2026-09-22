"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { ArrowRight, BrainCircuit, Check, ChevronDown, ExternalLink, FileText, Lightbulb, ListChecks, SlidersHorizontal } from "lucide-react";
import { LearningLayers } from "@/components/learning-layers";
import { PageHeader } from "@/components/page-header";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { buildLearningSnapshot, formatLearningTime, LEARNING_FILTERS, type LearningFilter, type LearningItem, type LearningStatus, type MemoryGroup } from "@/lib/learning";
import { useCatalystStore } from "@/lib/store";
import { cn } from "@/lib/utils";

const filterLabels: Record<LearningFilter, string> = {
  all: "Semua",
  feedback: "Feedback",
  insight: "Koreksi",
  resolution: "Hasil kasus",
};

const kindLabels: Record<LearningItem["kind"], string> = {
  feedback: "Feedback",
  insight: "Koreksi",
  resolution: "Hasil kasus",
};

const memoryGroups: Array<{ key: MemoryGroup; eyebrow: string; title: string; empty: string }> = [
  { key: "feedback", eyebrow: "Prioritas", title: "Feedback untuk prioritas", empty: "Belum ada feedback aktif dari kartu bukti." },
  { key: "insight", eyebrow: "Hipotesis", title: "Hipotesis pengguna", empty: "Belum ada koreksi aktif yang perlu diperiksa." },
  { key: "rule", eyebrow: "Aturan", title: "Aturan yang disetujui", empty: "Belum ada usulan aturan yang diterima." },
  { key: "explicit", eyebrow: "Pilihan pengguna", title: "Memori eksplisit", empty: "Belum ada aturan eksplisit yang disimpan." },
];

function statusClass(status: LearningStatus | "explicit"): string {
  if (status === "active" || status === "accepted") return "border-positive/35 bg-positive/10 text-positive";
  if (status === "pending") return "border-attention/35 bg-attention/10 text-attention-foreground";
  if (status === "inactive" || status === "dismissed" || status === "rejected") return "border-danger/30 bg-danger/8 text-danger";
  if (status === "explicit") return "border-primary/35 bg-primary/10 text-primary";
  return "border-border bg-muted/50 text-muted-foreground";
}

function statusText(status: LearningStatus | "explicit"): string {
  const labels: Record<LearningStatus | "explicit", string> = {
    active: "dipakai",
    inactive: "dinonaktifkan",
    pending: "menunggu",
    reviewed: "diperiksa",
    dismissed: "diabaikan",
    accepted: "diterima",
    rejected: "ditolak",
    stored: "tersimpan",
    explicit: "eksplisit",
  };
  return labels[status];
}

function updateSearch(router: ReturnType<typeof useRouter>, current: URLSearchParams, filter: LearningFilter, selected?: string) {
  const params = new URLSearchParams(current);
  if (filter === "all") params.delete("filter"); else params.set("filter", filter);
  if (selected) params.set("selected", selected); else params.delete("selected");
  const query = params.toString();
  router.replace(query ? `/ai-learning?${query}` : "/ai-learning", { scroll: false });
}

export function LearningContent({ predictionSlot }: { predictionSlot?: ReactNode }) {
  const router = useRouter();
  const searchParams = useSearchParams();
  const feedback = useCatalystStore((state) => state.feedback);
  const preferences = useCatalystStore((state) => state.preferences);
  const insights = useCatalystStore((state) => state.insights);
  const caseResolutions = useCatalystStore((state) => state.caseResolutions);
  const ruleProposals = useCatalystStore((state) => state.ruleProposals);
  const playbook = useCatalystStore((state) => state.playbook);
  const snapshot = useMemo(
    () => buildLearningSnapshot({ feedback, preferences, insights, caseResolutions, ruleProposals, playbook }),
    [feedback, preferences, insights, caseResolutions, ruleProposals, playbook],
  );
  const requestedFilter = searchParams.get("filter");
  const filter: LearningFilter = LEARNING_FILTERS.includes(requestedFilter as LearningFilter) ? requestedFilter as LearningFilter : "all";
  const visibleItems = snapshot.items.filter((item) => filter === "all" || item.kind === filter);
  const selectedId = searchParams.get("selected");
  const selected = visibleItems.find((item) => item.id === selectedId);

  return (
    <div>
      <PageHeader
        eyebrow="Memori personal"
        title="AI Learning"
        description="Lihat masukan yang Anda berikan, proses yang Catalyst jalankan, dan memori yang sedang dipakai saat menyusun riset."
      />

      <section className="mb-4 flex gap-3 rounded-[12px] border border-primary/25 bg-primary/8 p-4 text-sm leading-6" aria-label="Batas AI Learning">
        <BrainCircuit aria-hidden="true" className="mt-0.5 size-5 shrink-0 text-primary" />
        <p>Catalyst tidak melatih ulang model dari data ini. Koreksi tetap hipotesis sampai diperiksa. Pertanyaan Copilot hanya ada selama sesi dan tidak disimpan sebagai memori. Feedback mengubah urutan daftar kasus di layar Kasus; jawaban asisten menyebut seluruh pantauan Anda dalam urutan pantauan itu sendiri, jadi tidak ada baris yang naik atau hilang karena feedback.</p>
      </section>

      <LearningLayers />

      <section className="mb-4 grid gap-3 sm:grid-cols-2 xl:grid-cols-4" aria-label="Ringkasan AI Learning">
        {[
          { label: "Masukan tercatat", value: snapshot.summary.inputCount, detail: "feedback, koreksi, dan hasil kasus", icon: FileText },
          { label: "Menunggu pemeriksaan", value: snapshot.summary.pendingCount, detail: "koreksi atau usulan aturan", icon: ListChecks },
          { label: "Memori dipakai", value: snapshot.summary.activeCount, detail: "prioritas, hipotesis, dan aturan", icon: BrainCircuit },
          { label: "Memori eksplisit", value: snapshot.summary.explicitCount, detail: "aturan yang Anda tulis sendiri", icon: SlidersHorizontal },
        ].map((item) => <Panel key={item.label} className="p-4"><item.icon aria-hidden="true" className="size-4 text-primary" /><p className="mt-3 font-mono text-2xl font-semibold tabular-nums">{item.value}</p><p className="mt-1 text-sm font-medium">{item.label}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></Panel>)}
      </section>

      <div className="grid gap-4 xl:grid-cols-[minmax(0,1.15fr)_minmax(320px,0.85fr)]">
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Jejak pembelajaran" title="Riwayat masukan" />
          <div className="flex gap-2 overflow-x-auto border-b border-border px-4 py-3" role="group" aria-label="Filter riwayat masukan">
            {LEARNING_FILTERS.map((value) => <button key={value} type="button" aria-pressed={filter === value} onClick={() => updateSearch(router, new URLSearchParams(searchParams.toString()), value)} className={cn("min-h-9 shrink-0 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", filter === value ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground")}>{filterLabels[value]}</button>)}
          </div>
          {visibleItems.length ? <div className="divide-y divide-border">{visibleItems.map((item) => <button key={item.id} type="button" onClick={() => updateSearch(router, new URLSearchParams(searchParams.toString()), filter, item.id)} aria-expanded={selected?.id === item.id} className={cn("flex min-h-24 w-full items-start gap-3 p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", selected?.id === item.id && "bg-primary/6")}>
            <span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 font-mono text-[10px] font-semibold text-primary">{item.kind === "feedback" ? "FB" : item.kind === "insight" ? "KR" : "KS"}</span>
            <span className="min-w-0 flex-1"><span className="flex flex-wrap items-center gap-2"><span className="text-sm font-semibold">{item.inputLabel}</span>{item.symbol ? <span className="font-mono text-[11px] text-primary">{item.symbol}</span> : null}<span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", statusClass(item.status))}>{item.statusLabel}</span></span><span className="mt-1 line-clamp-2 block text-xs leading-5 text-muted-foreground">{item.inputDetail}</span><span className="mt-2 block font-mono text-[10px] text-muted-foreground">{kindLabels[item.kind]} · {formatLearningTime(item.createdAt)}</span></span>
            <ChevronDown aria-hidden="true" className={cn("mt-1 size-4 shrink-0 text-primary transition-transform", selected?.id === item.id && "rotate-180")} />
          </button>)}</div> : <div className="p-6 text-sm leading-6 text-muted-foreground"><p>Tidak ada {filter === "all" ? "masukan" : filterLabels[filter].toLowerCase()} yang tercatat.</p><Link href={filter === "feedback" ? "/cases" : filter === "resolution" ? "/cases?view=audit" : "/cases"} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline">{filter === "feedback" ? "Buka kartu bukti" : "Buka kasus riset"}<ArrowRight aria-hidden="true" className="size-3.5" /></Link></div>}
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Detail" title="Apa yang dipelajari" />
          {selected ? <article className="p-4" aria-label={`Detail ${selected.inputLabel}`}>
            <div className="flex flex-wrap items-center gap-2"><span className="rounded border border-border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{kindLabels[selected.kind]}</span><span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", statusClass(selected.status))}>{selected.statusLabel}</span></div>
            <h2 className="mt-3 text-sm font-semibold">{selected.inputLabel}</h2>
            <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-muted-foreground">{selected.inputDetail}</p>
            {selected.sourceUrl ? <a href={selected.sourceUrl} target="_blank" rel="noreferrer" className="mt-3 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline">Buka referensi pengguna<ExternalLink aria-hidden="true" className="size-3.5" /></a> : null}
            <div className="mt-5 rounded-lg border border-primary/20 bg-primary/6 p-3"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Yang dipelajari</p><p className="mt-1 text-sm font-medium">{selected.learningLabel}</p><p className="mt-1 text-xs leading-5 text-muted-foreground">{selected.learningDetail}</p></div>
            <div className="mt-4"><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">Proses</p><ol className="mt-2 space-y-3">{selected.steps.map((step, index) => <li key={`${step.label}-${index}`} className="flex gap-3"><span className={cn("grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[10px]", step.state === "current" ? "border-primary bg-primary/10 text-primary" : step.state === "skipped" ? "border-border text-muted-foreground" : "border-positive/40 text-positive")}>{step.state === "complete" ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}</span><span><span className="block text-xs font-medium">{step.label}</span><span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{step.detail}</span>{step.at ? <span className="mt-1 block font-mono text-[9px] text-muted-foreground">{formatLearningTime(step.at)}</span> : null}</span></li>)}</ol></div>
            <p className="mt-5 border-t border-border pt-4 text-xs leading-5 text-muted-foreground"><strong className="text-foreground">Dampak:</strong> {selected.effectLabel}</p>
            <Link href={selected.href} className="mt-3 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline">Buka konteks<ArrowRight aria-hidden="true" className="size-3.5" /></Link>
          </article> : <div className="p-6 text-sm leading-6 text-muted-foreground"><Lightbulb aria-hidden="true" className="size-5 text-primary" /><p className="mt-3">Pilih satu masukan untuk melihat teks asli, proses, status, dan dampak memorinya.</p></div>}
        </Panel>
      </div>

      {predictionSlot}

      <section className="mt-4" aria-labelledby="memory-title">
        <div className="mb-4 flex flex-col gap-3 sm:flex-row sm:items-end sm:justify-between"><div><p className="meta text-primary">Memori aktif dan terjaga</p><h2 id="memory-title" className="editorial mt-1 text-2xl">Apa yang sedang disimpan</h2></div><div className="flex flex-wrap gap-2"><Link href="/cases?view=audit" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-primary hover:bg-muted">Kelola koreksi dan usulan<ArrowRight aria-hidden="true" className="size-3.5" /></Link><Link href="/playbook" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-primary hover:bg-muted">Edit aturan eksplisit<ArrowRight aria-hidden="true" className="size-3.5" /></Link></div></div>
        <div className="grid gap-4 lg:grid-cols-2">{memoryGroups.map((group) => {
          const items = snapshot.memories.filter((item) => item.group === group.key);
          return <Panel key={group.key} aria-labelledby={`memory-${group.key}-title`} className="overflow-hidden"><PanelHeader titleId={`memory-${group.key}-title`} eyebrow={group.eyebrow} title={group.title} />{items.length ? <div className="divide-y divide-border">{items.map((item) => <Link key={item.id} href={item.href} className="block px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><div className="flex flex-wrap items-center gap-2"><span className="text-sm font-medium">{item.label}</span><span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", statusClass(item.status))}>{statusText(item.status)}</span></div><p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p></Link>)}</div> : <p className="p-4 text-sm leading-6 text-muted-foreground">{group.empty}</p>}</Panel>;
        })}</div>
        <p className="mt-4 rounded-[10px] border border-border bg-background px-4 py-3 text-xs leading-5 text-muted-foreground">Memori tersimpan di peramban ini dan dicadangkan ke GCS bila layanan tersedia. Tidak ada akun; browser, cookie, atau perangkat baru dapat memulai memori baru.</p>
      </section>
    </div>
  );
}
