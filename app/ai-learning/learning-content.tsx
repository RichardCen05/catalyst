"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, ExternalLink, Info, Lightbulb, Trash2, X } from "lucide-react";
import { LearningLayers } from "@/components/learning-layers";
import { PageHeader } from "@/components/page-header";
import { NextStep } from "@/components/next-step";
import { TeachAgent } from "@/components/teach-agent";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import {
  buildLearningSnapshot,
  filterLearningItems,
  formatLearningClock,
  formatLearningTime,
  groupLearningByDay,
  learningFacets,
  LEARNING_FILTERS,
  type LearningFilter,
  type LearningItem,
  type LearningStatus,
  type MemoryGroup,
  type MemoryItem,
} from "@/lib/learning";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { uiLabel } from "@/lib/ui-labels";
import { cn } from "@/lib/utils";

/**
 * Two questions, in order: what did you teach it, and what changed.
 *
 * The page is one column on purpose. An earlier layout put the form in a side
 * rail and the trace beside it, which left a column of air whenever the reader
 * had taught less than a screenful — the emptiest state was also the first one
 * anybody sees. A full-width band and a full-width list have no empty column
 * to leave.
 *
 * Each entry is read left to right as a sentence: when, what you said, what
 * moved because of it. The column headings say those three words once, so no
 * row has to repeat them.
 *
 * Nothing here is typed per ticker: the facet chips, their counts, and the day
 * headings are derived from the stored trace in lib/learning.ts.
 */

/** The page's four sections, in the order a reader meets them. */
type LearningSection = "ajaran" | "tinjauan" | "pasar" | "memori";

const sections: Array<{ value: LearningSection; label: string }> = [
  { value: "ajaran", label: "Ajaran dan riwayat" },
  { value: "tinjauan", label: "Tinjauan dan usulan" },
  { value: "pasar", label: "Belajar dari pasar" },
  { value: "memori", label: "Memori tersimpan" },
];

const filterLabels: Record<LearningFilter, string> = {
  all: "Semua",
  feedback: "Penilaian bukti",
  insight: "Ajaran Anda",
  resolution: "Hasil kasus",
};

const kindLabels: Record<LearningItem["kind"], string> = {
  feedback: "Penilaian bukti",
  insight: "Ajaran Anda",
  resolution: "Hasil kasus",
};

const memoryGroups: Array<{ key: MemoryGroup; title: string; empty: string }> = [
  { key: "feedback", title: "Penilaian bukti untuk prioritas", empty: "Belum ada penilaian aktif dari kartu bukti." },
  { key: "insight", title: "Ajaran Anda", empty: "Belum ada ajaran aktif." },
  { key: "rule", title: "Aturan yang disetujui", empty: "Belum ada usulan aturan yang diterima." },
  { key: "explicit", title: "Memori eksplisit", empty: "Belum ada aturan eksplisit yang disimpan." },
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

function dotClass(status: LearningStatus): string {
  if (status === "pending") return "bg-attention";
  if (status === "inactive" || status === "dismissed" || status === "rejected") return "bg-danger";
  return "bg-positive";
}

/** Berapa nilai yang terbuka sebelum sebuah golongan meminta dilipat. */
const MEMORY_ROWS_SHOWN = 6;

function MemoryRow({ item, showStatus }: { item: MemoryItem; showStatus: boolean }) {
  return (
    <li>
      <Link href={item.href} className="flex items-start gap-2 rounded-lg text-xs leading-5 text-muted-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
        <span className="min-w-0 flex-1">{item.detail}</span>
        {showStatus ? <span className={cn("mt-0.5 shrink-0 rounded-lg border px-1.5 py-0.5 text-xs", statusClass(item.status))}>{statusText(item.status)}</span> : null}
      </Link>
    </li>
  );
}

function chipClass(active: boolean): string {
  return cn(
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-lg border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "border-primary bg-primary/10 text-primary" : "border-border text-muted-foreground hover:text-foreground",
  );
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
  const setInsightStatus = useCatalystStore((state) => state.setInsightStatus);
  const setRuleProposalStatus = useCatalystStore((state) => state.setRuleProposalStatus);
  const removeInsight = useCatalystStore((state) => state.removeInsight);
  const snapshot = useMemo(
    () => buildLearningSnapshot({ feedback, preferences, insights, caseResolutions, ruleProposals, playbook }),
    [feedback, preferences, insights, caseResolutions, ruleProposals, playbook],
  );

  const requestedSection = searchParams.get("section") as LearningSection | null;
  const section: LearningSection = sections.some((item) => item.value === requestedSection) ? requestedSection as LearningSection : "ajaran";
  const requestedFilter = searchParams.get("filter");
  const filter: LearningFilter = LEARNING_FILTERS.includes(requestedFilter as LearningFilter) ? requestedFilter as LearningFilter : "all";
  const facets = learningFacets(snapshot.items);
  const requestedSymbol = searchParams.get("symbol") as SymbolCode | null;
  const symbol = requestedSymbol && facets.some((facet) => facet.symbol === requestedSymbol) ? requestedSymbol : undefined;
  const visibleItems = filterLearningItems(snapshot.items, { kind: filter, symbol });
  const days = groupLearningByDay(visibleItems);
  const openId = searchParams.get("selected");

  const setSearch = (next: { filter?: LearningFilter; symbol?: SymbolCode | null; selected?: string | null }) => {
    const params = new URLSearchParams(searchParams.toString());
    if (next.filter !== undefined) {
      if (next.filter === "all") params.delete("filter"); else params.set("filter", next.filter);
    }
    if (next.symbol !== undefined) {
      if (next.symbol) params.set("symbol", next.symbol); else params.delete("symbol");
    }
    if (next.selected !== undefined) {
      if (next.selected) params.set("selected", next.selected); else params.delete("selected");
    }
    const query = params.toString();
    router.replace(query ? `/ai-learning?${query}` : "/ai-learning", { scroll: false });
  };

  // Antrean yang menunggu keputusan pembaca: usulan aturan yang belum diterima
  // atau ditolak. Koreksi pengguna langsung diterima saat disimpan. Dihitung dari snapshot,
  // bukan dijumlah ulang di sini, agar lencana tab dan angka di bagian
  // Tinjauan tidak bisa berbeda.
  const pendingCount = snapshot.summary.pendingCount;

  const counters = [
    { label: "sudah diajarkan", value: snapshot.summary.inputCount },
    { label: "menunggu keputusan", value: snapshot.summary.pendingCount },
    { label: "ajaran dipakai", value: snapshot.summary.activeCount },
    // Playbook settings are memory too, but they were set, not taught; a
    // single "in use" total next to "0 taught" read as a contradiction.
    { label: "pengaturan Playbook dipakai", value: snapshot.summary.explicitCount },
  ];

  return (
    <div>
      <PageHeader
        title="AI Learning"
        description="Apa yang Anda ajarkan, apa yang menunggu keputusan Anda, apa yang Catalyst pelajari dari pasar, dan apa yang disimpan."
      />

      {/* Same tab strip as the case hub: one section on screen at a time, the
          section in the address bar so a reader can link to it. */}
      {/* The explainer sits at the end of the section strip, on the same line
          a reader is already using to move around the page — not floating in
          the header where it read as a stray chip. */}
      <div className="mb-4 flex flex-col-reverse gap-2 border-b border-border sm:flex-row sm:items-center sm:justify-between sm:gap-3">
        {/* Wraps instead of scrolling. `overflow-x-auto` forced overflow-y to
            auto as well, and the tabs' `-mb-px` underline overflowed by one
            pixel, so a vertical scrollbar sat over the last tab. */}
        <nav aria-label="Bagian AI Learning" className="flex min-w-0 flex-wrap gap-x-6">
          {sections.map((item) => (
            <Link
              key={item.value}
              href={item.value === "ajaran" ? "/ai-learning" : `/ai-learning?section=${item.value}`}
              aria-current={section === item.value ? "page" : undefined}
              className={cn(
                "relative -mb-px flex min-h-11 shrink-0 items-center border-b-2 border-transparent text-sm font-medium text-subtle-foreground transition-colors hover:text-foreground",
                section === item.value && "border-foreground text-foreground",
              )}
            >
              {item.label}
              {item.value === "tinjauan" && pendingCount ? <span className="ml-2 rounded-lg border border-attention/30 px-1.5 py-0.5 font-mono text-xs text-attention-foreground">{pendingCount}</span> : null}
            </Link>
          ))}
        </nav>
        <div className="shrink-0 px-1 pt-1 sm:p-0 sm:pb-2 sm:pr-1">
          <LearningLayers />
        </div>
      </div>

      <details className="group mb-6 rounded-lg border border-border bg-surface" aria-label="Batas AI Learning">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-3 px-4 text-sm text-muted-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
          <Info aria-hidden="true" className="size-4 shrink-0" />
          <span className="min-w-0 flex-1">Catalyst tidak melatih ulang model. Koreksi Anda langsung diterima dan diproses sebagai konteks, bukan fakta pasar.</span>
          <span className="shrink-0 font-medium text-foreground underline underline-offset-2 group-open:hidden">Selengkapnya</span>
        </summary>
        <p className="border-t border-border px-4 py-3 text-sm text-muted-foreground">Pertanyaan ke Asisten hanya ada selama sesi dan tidak disimpan sebagai memori. Penilaian bukti mengubah urutan daftar di Riset &amp; Analisis; jawaban Asisten menyebut seluruh pantauan Anda dalam urutan pantauan itu sendiri, jadi tidak ada baris yang naik atau hilang karena penilaian itu.</p>
      </details>

      {section === "ajaran" ? <>
      <TeachAgent />

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader
          title="Yang sudah dipelajari"
          action={
            <p className="hidden shrink-0 self-center text-xs text-muted-foreground sm:block">
              {counters.map((counter) => `${counter.value} ${counter.label}`).join(" · ")}
            </p>
          }
        />

        <div className="space-y-2 border-b border-border px-4 py-3">
          <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Filter jenis masukan">
            <span aria-hidden="true" className="w-12 shrink-0 text-xs text-muted-foreground">Jenis</span>
            {LEARNING_FILTERS.map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setSearch({ filter: value, selected: null })} className={chipClass(filter === value)}>
                {filterLabels[value]}
              </button>
            ))}
          </div>
          <div className="flex items-center gap-2 overflow-x-auto" role="group" aria-label="Filter emiten">
            <span aria-hidden="true" className="w-12 shrink-0 text-xs text-muted-foreground">Saham</span>
            <button type="button" aria-pressed={!symbol} onClick={() => setSearch({ symbol: null, selected: null })} className={chipClass(!symbol)}>
              Semua emiten
            </button>
            {facets.map((facet) => (
              <button key={facet.symbol} type="button" aria-pressed={symbol === facet.symbol} onClick={() => setSearch({ symbol: facet.symbol, selected: null })} className={cn(chipClass(symbol === facet.symbol), "font-mono")}>
                {facet.symbol}
                <span className="text-xs opacity-70">{facet.count}</span>
              </button>
            ))}
          </div>
          <p className="text-xs text-muted-foreground sm:hidden">{counters.map((counter) => `${counter.value} ${counter.label}`).join(" · ")}</p>
        </div>

        {days.length ? (
          <>
            <div className="hidden grid-cols-[132px_minmax(0,1.05fr)_minmax(0,1fr)_28px] gap-4 border-b border-border bg-muted/40 px-4 py-2 text-xs text-muted-foreground md:grid">
              <span>Kapan · emiten</span>
              <span>Yang Anda ajarkan</span>
              <span>Yang berubah pada Catalyst</span>
              <span className="sr-only">Rincian</span>
            </div>
            <div>
              {days.map((day) => (
                <section key={day.key} aria-label={`Garis waktu ${day.label}`}>
                  <p className="border-b border-border bg-background px-4 py-2 text-xs text-muted-foreground font-medium">
                    {day.label}
                  </p>
                  <ol className="divide-y divide-border">
                    {day.items.map((item) => {
                      const open = openId === item.id;
                      return (
                        <li key={item.id}>
                          <button
                            type="button"
                            onClick={() => setSearch({ selected: open ? null : item.id })}
                            aria-expanded={open}
                            className={cn(
                              "grid w-full grid-cols-1 gap-2 p-4 text-left transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring md:grid-cols-[132px_minmax(0,1.05fr)_minmax(0,1fr)_28px] md:gap-4",
                              open && "bg-primary/6",
                            )}
                          >
                            <span className="flex items-center gap-2">
                              <span aria-hidden="true" className={cn("size-2 shrink-0 rounded-full", dotClass(item.status))} />
                              <span className="font-mono text-xs text-muted-foreground">{formatLearningClock(item.createdAt)}</span>
                              {item.symbol ? <span className="font-mono text-xs font-semibold text-muted-foreground font-medium">{item.symbol}</span> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block text-xs text-muted-foreground">{item.inputLabel}</span>
                              <span className="mt-1 line-clamp-2 block text-sm leading-6">{item.inputDetail}</span>
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 block text-xs leading-5">{item.effectLabel}</span>
                              <span className={cn("mt-1.5 inline-block rounded-lg border px-1.5 py-0.5 text-xs", statusClass(item.status))}>{item.statusLabel}</span>
                            </span>
                            <ChevronDown aria-hidden="true" className={cn("mt-0.5 hidden size-4 shrink-0 text-primary transition-transform md:block", open && "rotate-180")} />
                          </button>

                          {open ? (
                            <article className="border-t border-border bg-background px-4 py-4 md:pl-[148px]" aria-label={`Detail ${item.inputLabel}`}>
                              <p className=" text-xs text-muted-foreground">{kindLabels[item.kind]} · {formatLearningTime(item.createdAt)}</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.inputDetail}</p>
                              {item.sourceUrl ? (
                                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                                  Buka referensi<ExternalLink aria-hidden="true" className="size-3.5" />
                                </a>
                              ) : null}
                              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
                                  <p className="text-xs text-muted-foreground font-medium">Yang dipelajari</p>
                                  <p className="mt-1 text-sm font-medium">{item.learningLabel}</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.learningDetail}</p>
                                </div>
                                <ol className="space-y-3">
                                  {item.steps.map((step, index) => (
                                    <li key={`${step.label}-${index}`} className="flex gap-3">
                                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border font-mono text-xs", step.state === "current" ? "border-primary bg-primary/10 text-primary" : step.state === "skipped" ? "border-border text-muted-foreground" : "border-positive/40 text-positive")}>
                                        {step.state === "complete" ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
                                      </span>
                                      <span>
                                        <span className="block text-xs font-medium">{step.label}</span>
                                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{step.detail}</span>
                                        {step.at ? <span className="mt-1 block font-mono text-xs text-muted-foreground">{formatLearningTime(step.at)}</span> : null}
                                      </span>
                                    </li>
                                  ))}
                                </ol>
                              </div>
                              <Link href={item.href} className="mt-4 inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline">
                                Buka konteks<ArrowRight aria-hidden="true" className="size-3.5" />
                              </Link>
                            </article>
                          ) : null}
                        </li>
                      );
                    })}
                  </ol>
                </section>
              ))}
            </div>
          </>
        ) : (
          <div className="flex flex-col items-start gap-3 px-4 py-8 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center">
            <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-primary" />
            <p className="max-w-2xl">
              {symbol
                ? `Belum ada yang dipelajari untuk ${symbol}. Tulis satu kalimat di kotak di atas.`
                : filter === "all"
                  ? "Belum ada yang dipelajari. Tulis satu kalimat di kotak di atas — baris pertama akan muncul di sini, lengkap dengan apa yang berubah."
                  : `Belum ada ${filterLabels[filter].toLowerCase()} yang tercatat.`}
            </p>
            <Link href="/cases" className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:ml-auto">
              Buka kasus riset<ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        )}
      </Panel>
      <NextStep title="Ajarkan sambil membaca bukti" description="Catatan paling berguna ditulis saat membaca kasus: buka Keputusan, lalu Koreksi analisis ini." href="/cases" action="Buka Riset & Analisis" secondary={{ href: "/ai-learning?section=tinjauan", label: "Tinjauan dan usulan" }} />
      </> : null}

      {section === "tinjauan" ? <>
      {/* Dua antrean yang menunggu keputusan pembaca, bukan tampilan ulang
          memori: bagian Memori tersimpan menunjukkan apa yang sudah dipakai,
          bagian ini menunjukkan apa yang belum diputuskan. Hasil kasus sendiri
          sudah muncul sebagai baris di Ajaran dan riwayat, jadi tidak diulang
          di sini. */}
      <div className="grid gap-4 lg:grid-cols-[minmax(0,1.1fr)_minmax(300px,0.9fr)]">
        <Panel className="overflow-hidden">
          <PanelHeader title="Koreksi yang diterima" />
          {insights.length ? (
            <div className="divide-y divide-border">
              {insights.map((insight) => (
                <article key={insight.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground font-medium">{insight.symbol}</span>
                    <span className="rounded-lg border border-border px-1.5 py-0.5 text-xs text-muted-foreground">{insight.pillar ? uiLabel(insight.pillar) : "Umum"}</span>
                    <span className={cn("rounded-lg border px-1.5 py-0.5 text-xs", statusClass(insight.status === "dismissed" ? "dismissed" : "accepted"))}>
                      {statusText(insight.status === "dismissed" ? "dismissed" : "accepted")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{insight.note}</p>
                  {insight.sourceUrl ? (
                    <a href={insight.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                      Buka referensi pengguna<ExternalLink aria-hidden="true" className="size-3.5" />
                    </a>
                  ) : null}
                  <div className="mt-3 flex flex-wrap items-center gap-2">
                    {insight.status === "dismissed" ? (
                      <Button variant="secondary" size="sm" onClick={() => setInsightStatus(insight.id, "incorporated")}>Pakai lagi</Button>
                    ) : (
                      <Button variant="ghost" size="sm" onClick={() => setInsightStatus(insight.id, "dismissed")}>Abaikan</Button>
                    )}
                    <Button variant="ghost" size="icon" onClick={() => removeInsight(insight.id)} aria-label={`Hapus catatan ${insight.symbol}`} className="ml-auto text-danger">
                      <Trash2 aria-hidden="true" className="size-4" />
                    </Button>
                  </div>
                </article>
              ))}
            </div>
          ) : (
            <div className="flex flex-col items-start gap-3 px-4 py-8 text-sm leading-6 text-muted-foreground sm:flex-row sm:items-center">
              <Lightbulb aria-hidden="true" className="size-5 shrink-0 text-primary" />
              <p className="max-w-2xl">Belum ada koreksi. Tulis satu kalimat di bagian Ajaran dan riwayat; Catalyst langsung menerima dan memprosesnya.</p>
              <Link href="/ai-learning" className="inline-flex min-h-9 shrink-0 items-center gap-1 text-xs font-medium text-primary hover:underline sm:ml-auto">
                Buka kotak ajaran<ArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          )}
        </Panel>

        <Panel className="overflow-hidden">
          <PanelHeader title="Usulan aturan" />
          <p className="border-b border-border px-4 py-3 text-xs leading-5 text-muted-foreground">Hasil kasus tidak otomatis mengubah aturan riset. Anda harus menerima atau menolak usulan.</p>
          {ruleProposals.length ? (
            <div className="divide-y divide-border">
              {ruleProposals.map((proposal) => (
                <article key={proposal.id} className="p-4">
                  <div className="flex flex-wrap items-center gap-2">
                    <span className="font-mono text-xs font-semibold text-muted-foreground font-medium">{proposal.symbol}</span>
                    <span className="rounded-lg border border-border px-1.5 py-0.5 text-xs text-muted-foreground">{proposal.kind === "materiality" ? "materialitas" : "kondisi pembatal"}</span>
                    <span className={cn("rounded-lg border px-1.5 py-0.5 text-xs", statusClass(proposal.status === "accepted" ? "accepted" : proposal.status === "rejected" ? "rejected" : "pending"))}>
                      {statusText(proposal.status === "accepted" ? "accepted" : proposal.status === "rejected" ? "rejected" : "pending")}
                    </span>
                  </div>
                  <p className="mt-2 text-sm leading-6">{proposal.rule}</p>
                  <p className="mt-1 text-xs leading-5 text-muted-foreground">Bukti: {proposal.evidence}</p>
                  {proposal.status === "pending" ? (
                    <div className="mt-3 flex gap-2">
                      <Button size="sm" onClick={() => setRuleProposalStatus(proposal.id, "accepted")}><Check aria-hidden="true" className="size-3.5" />Terima aturan</Button>
                      <Button variant="ghost" size="sm" onClick={() => setRuleProposalStatus(proposal.id, "rejected")}><X aria-hidden="true" className="size-3.5" />Tolak</Button>
                    </div>
                  ) : null}
                </article>
              ))}
            </div>
          ) : (
            <p className="p-4 text-sm leading-6 text-muted-foreground">Tutup kasus dengan pelajaran yang dapat dipakai ulang. Catalyst hanya akan mengusulkan aturan, dan usulannya menunggu di sini.</p>
          )}
        </Panel>
      </div>

      <NextStep title="Tutup kasus untuk memunculkan usulan" description="Usulan aturan muncul dari hasil kasus yang disimpan di langkah 3 Keputusan." href="/cases" action="Buka Riset & Analisis" />
      </> : null}

      {section === "pasar" ? <div>{predictionSlot}<NextStep title="Lihat klaim di kasusnya" description="Klaim dinilai dari rekaman sesudah tanggal berita. Buka kasusnya untuk membaca bukti yang sedang diuji." href="/cases" action="Buka Riset & Analisis" /></div> : null}

      {section === "memori" ? <>
      <div className="mb-4 flex flex-wrap gap-2">
        <Link href="/ai-learning?section=tinjauan" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-primary hover:bg-muted">Kelola ajaran dan usulan<ArrowRight aria-hidden="true" className="size-3.5" /></Link>
        <Link href="/playbook" className="inline-flex min-h-9 items-center gap-1 rounded-lg border border-border px-3 text-xs font-medium text-primary hover:bg-muted">Edit aturan eksplisit<ArrowRight aria-hidden="true" className="size-3.5" /></Link>
      </div>

      {/* Satu panel per jenis memori, bertumpuk selebar halaman.
          Versi sebelumnya menjejerkan empat panel dalam satu baris: tiga di
          antaranya kosong sementara yang keempat memanjang tiga layar, dan
          barisnya berakhir compang-camping.

          Di dalam panel, baris disatukan menurut labelnya. Registry memori
          memberi label yang sama kepada setiap nilai dalam satu golongan
          ("Eksposur yang diketahui" muncul sekali per emiten), jadi tanpa ini
          pembaca melihat judul yang sama tercetak enam kali berturut-turut. */}
      <div className="space-y-4">
        {memoryGroups.map((group) => {
          const items = snapshot.memories.filter((item) => item.group === group.key);
          const byLabel = new Map<string, MemoryItem[]>();
          for (const item of items) byLabel.set(item.label, [...(byLabel.get(item.label) ?? []), item]);
          // Lencana status hanya berguna saat ada yang berbeda; satu golongan
          // yang seluruhnya "eksplisit" tidak perlu 38 lencana kembar.
          const showStatus = new Set(items.map((item) => item.status)).size > 1;
          return (
            <Panel key={group.key} aria-labelledby={`memory-${group.key}-title`} className="overflow-hidden">
              <PanelHeader
                titleId={`memory-${group.key}-title`}
                title={group.title}
                action={items.length ? <span className="shrink-0 self-center font-mono text-xs text-muted-foreground">{items.length} tersimpan</span> : undefined}
              />
              {items.length ? (
                <div className="divide-y divide-border">
                  {[...byLabel.entries()].map(([label, rows]) => (
                    <div key={label} className="grid gap-x-4 gap-y-1 px-4 py-3 sm:grid-cols-[minmax(0,220px)_minmax(0,1fr)]">
                      <p className="text-sm font-medium">
                        {label}
                        {rows.length > 1 ? <span className="ml-2 font-mono text-xs text-muted-foreground">{rows.length}</span> : null}
                      </p>
                      <div className="min-w-0">
                        <ul className="space-y-1">
                          {rows.slice(0, MEMORY_ROWS_SHOWN).map((item) => <MemoryRow key={item.id} item={item} showStatus={showStatus} />)}
                        </ul>
                        {rows.length > MEMORY_ROWS_SHOWN ? (
                          <details className="group mt-1">
                            <summary className="min-h-8 cursor-pointer list-none text-xs font-medium text-primary">
                              <span className="group-open:hidden">Lihat {rows.length - MEMORY_ROWS_SHOWN} lainnya</span>
                              <span className="hidden group-open:inline">Sembunyikan</span>
                            </summary>
                            <ul className="mt-1 space-y-1">
                              {rows.slice(MEMORY_ROWS_SHOWN).map((item) => <MemoryRow key={item.id} item={item} showStatus={showStatus} />)}
                            </ul>
                          </details>
                        ) : null}
                      </div>
                    </div>
                  ))}
                </div>
              ) : <p className="p-4 text-sm leading-6 text-muted-foreground">{group.empty}</p>}
            </Panel>
          );
        })}
      </div>

      <p className="mt-4 rounded-lg border border-border bg-background px-4 py-3 text-xs leading-5 text-muted-foreground">Memori tersimpan di peramban ini dan dicadangkan ke GCS bila layanan tersedia. Tidak ada akun; peramban lain, cookie yang dihapus, atau perangkat baru dapat memulai memori baru. Catalyst tidak melatih ulang model dari data ini, dan pertanyaan ke Asisten tidak disimpan.</p>
      <NextStep title="Ubah aturan riset" description="Memori eksplisit di atas berasal dari aturan riset Anda. Ubah di sana bila cara Anda menguji tesis berubah." href="/playbook" action="Buka Aturan riset" />
      </> : null}
    </div>
  );
}