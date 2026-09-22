"use client";

import Link from "next/link";
import { useRouter, useSearchParams } from "next/navigation";
import { useMemo, type ReactNode } from "react";
import { ArrowRight, Check, ChevronDown, ExternalLink, Lightbulb } from "lucide-react";
import { LearningLayers } from "@/components/learning-layers";
import { PageHeader } from "@/components/page-header";
import { TeachAgent } from "@/components/teach-agent";
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
} from "@/lib/learning";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
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

const filterLabels: Record<LearningFilter, string> = {
  all: "Semua",
  feedback: "Feedback",
  insight: "Ajaran Anda",
  resolution: "Hasil kasus",
};

const kindLabels: Record<LearningItem["kind"], string> = {
  feedback: "Feedback",
  insight: "Ajaran Anda",
  resolution: "Hasil kasus",
};

const memoryGroups: Array<{ key: MemoryGroup; eyebrow: string; title: string; empty: string }> = [
  { key: "feedback", eyebrow: "Prioritas", title: "Feedback untuk prioritas", empty: "Belum ada feedback aktif dari kartu bukti." },
  { key: "insight", eyebrow: "Hipotesis", title: "Hipotesis pengguna", empty: "Belum ada ajaran aktif yang perlu diperiksa." },
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

function dotClass(status: LearningStatus): string {
  if (status === "pending") return "bg-attention";
  if (status === "inactive" || status === "dismissed" || status === "rejected") return "bg-danger";
  return "bg-positive";
}

function chipClass(active: boolean): string {
  return cn(
    "inline-flex min-h-9 shrink-0 items-center gap-1.5 rounded-md border px-3 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
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
  const snapshot = useMemo(
    () => buildLearningSnapshot({ feedback, preferences, insights, caseResolutions, ruleProposals, playbook }),
    [feedback, preferences, insights, caseResolutions, ruleProposals, playbook],
  );

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

  const counters = [
    { label: "sudah diajarkan", value: snapshot.summary.inputCount },
    { label: "menunggu diperiksa", value: snapshot.summary.pendingCount },
    { label: "dipakai sekarang", value: snapshot.summary.activeCount + snapshot.summary.explicitCount },
  ];

  return (
    <div>
      <PageHeader
        eyebrow="Memori personal"
        title="AI Learning"
        description="Dua hal saja di halaman ini: Anda mengajari Catalyst tentang satu saham, lalu melihat apa yang berubah karenanya — kapan, untuk saham mana, dan efeknya."
      />

      <TeachAgent />

      <Panel className="mt-4 overflow-hidden">
        <PanelHeader
          eyebrow="Riwayat lengkap"
          title="Yang sudah dipelajari"
          action={
            <div className="hidden shrink-0 gap-4 sm:flex">
              {counters.map((counter) => (
                <p key={counter.label} className="text-right">
                  <span className="block font-mono text-lg font-semibold tabular-nums">{counter.value}</span>
                  <span className="block text-[11px] leading-4 text-muted-foreground">{counter.label}</span>
                </p>
              ))}
            </div>
          }
        />

        <div className="flex flex-wrap items-center gap-x-4 gap-y-2 border-b border-border px-4 py-3">
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filter jenis masukan">
            {LEARNING_FILTERS.map((value) => (
              <button key={value} type="button" aria-pressed={filter === value} onClick={() => setSearch({ filter: value, selected: null })} className={chipClass(filter === value)}>
                {filterLabels[value]}
              </button>
            ))}
          </div>
          <div className="flex gap-2 overflow-x-auto" role="group" aria-label="Filter saham">
            <button type="button" aria-pressed={!symbol} onClick={() => setSearch({ symbol: null, selected: null })} className={chipClass(!symbol)}>
              Semua saham
            </button>
            {facets.map((facet) => (
              <button key={facet.symbol} type="button" aria-pressed={symbol === facet.symbol} onClick={() => setSearch({ symbol: facet.symbol, selected: null })} className={cn(chipClass(symbol === facet.symbol), "font-mono")}>
                {facet.symbol}
                <span className="text-[10px] opacity-70">{facet.count}</span>
              </button>
            ))}
          </div>
          <p className="ml-auto text-xs text-muted-foreground sm:hidden">{counters.map((counter) => `${counter.value} ${counter.label}`).join(" · ")}</p>
        </div>

        {days.length ? (
          <>
            <div className="hidden grid-cols-[132px_minmax(0,1.05fr)_minmax(0,1fr)_28px] gap-4 border-b border-border bg-muted/40 px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-muted-foreground md:grid">
              <span>Kapan · saham</span>
              <span>Yang Anda ajarkan</span>
              <span>Yang berubah pada Catalyst</span>
              <span className="sr-only">Rincian</span>
            </div>
            <div>
              {days.map((day) => (
                <section key={day.key} aria-label={`Garis waktu ${day.label}`}>
                  <p className="border-b border-border bg-background px-4 py-2 font-mono text-[10px] uppercase tracking-wider text-primary">
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
                              <span className="font-mono text-[11px] text-muted-foreground">{formatLearningClock(item.createdAt)}</span>
                              {item.symbol ? <span className="font-mono text-[11px] font-semibold text-primary">{item.symbol}</span> : null}
                            </span>
                            <span className="min-w-0">
                              <span className="block font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.inputLabel}</span>
                              <span className="mt-1 line-clamp-2 block text-sm leading-6">{item.inputDetail}</span>
                            </span>
                            <span className="min-w-0">
                              <span className="line-clamp-2 block text-xs leading-5">{item.effectLabel}</span>
                              <span className={cn("mt-1.5 inline-block rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", statusClass(item.status))}>{item.statusLabel}</span>
                            </span>
                            <ChevronDown aria-hidden="true" className={cn("mt-0.5 hidden size-4 shrink-0 text-primary transition-transform md:block", open && "rotate-180")} />
                          </button>

                          {open ? (
                            <article className="border-t border-border bg-background px-4 py-4 md:pl-[148px]" aria-label={`Detail ${item.inputLabel}`}>
                              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{kindLabels[item.kind]} · {formatLearningTime(item.createdAt)}</p>
                              <p className="mt-2 whitespace-pre-wrap text-sm leading-6">{item.inputDetail}</p>
                              {item.sourceUrl ? (
                                <a href={item.sourceUrl} target="_blank" rel="noreferrer" className="mt-2 inline-flex min-h-8 items-center gap-1.5 text-xs font-medium text-primary hover:underline">
                                  Buka referensi<ExternalLink aria-hidden="true" className="size-3.5" />
                                </a>
                              ) : null}
                              <div className="mt-4 grid gap-4 lg:grid-cols-2">
                                <div className="rounded-lg border border-primary/20 bg-primary/6 p-3">
                                  <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Yang dipelajari</p>
                                  <p className="mt-1 text-sm font-medium">{item.learningLabel}</p>
                                  <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.learningDetail}</p>
                                </div>
                                <ol className="space-y-3">
                                  {item.steps.map((step, index) => (
                                    <li key={`${step.label}-${index}`} className="flex gap-3">
                                      <span className={cn("grid size-6 shrink-0 place-items-center rounded-full border font-mono text-[10px]", step.state === "current" ? "border-primary bg-primary/10 text-primary" : step.state === "skipped" ? "border-border text-muted-foreground" : "border-positive/40 text-positive")}>
                                        {step.state === "complete" ? <Check aria-hidden="true" className="size-3.5" /> : index + 1}
                                      </span>
                                      <span>
                                        <span className="block text-xs font-medium">{step.label}</span>
                                        <span className="mt-0.5 block text-xs leading-5 text-muted-foreground">{step.detail}</span>
                                        {step.at ? <span className="mt-1 block font-mono text-[9px] text-muted-foreground">{formatLearningTime(step.at)}</span> : null}
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

      <div className="mt-4">{predictionSlot}</div>

      <Panel className="mt-4 overflow-hidden">
        <details className="group">
          <summary className="flex min-h-14 cursor-pointer list-none items-center justify-between gap-4 px-5 py-4 transition-colors hover:bg-muted/40 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
            <span className="min-w-0">
              <span className="meta mb-1.5 block text-muted-foreground">Rincian untuk yang ingin menggali</span>
              <span className="editorial block text-[17px] text-foreground">Apa yang sedang disimpan</span>
            </span>
            <ChevronDown aria-hidden="true" className="size-4 shrink-0 text-primary transition-transform group-open:rotate-180" />
          </summary>
          <div className="border-t border-border p-4">
            <div className="mb-4 flex flex-wrap gap-2">
              <Link href="/cases?view=audit" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-primary hover:bg-muted">Kelola ajaran dan usulan<ArrowRight aria-hidden="true" className="size-3.5" /></Link>
              <Link href="/playbook" className="inline-flex min-h-9 items-center gap-1 rounded-md border border-border px-3 text-xs font-medium text-primary hover:bg-muted">Edit aturan eksplisit<ArrowRight aria-hidden="true" className="size-3.5" /></Link>
            </div>
            <div className="grid gap-4 lg:grid-cols-2 xl:grid-cols-4">
              {memoryGroups.map((group) => {
                const items = snapshot.memories.filter((item) => item.group === group.key);
                return (
                  <Panel key={group.key} aria-labelledby={`memory-${group.key}-title`} className="overflow-hidden">
                    <PanelHeader titleId={`memory-${group.key}-title`} eyebrow={group.eyebrow} title={group.title} />
                    {items.length ? (
                      <div className="divide-y divide-border">
                        {items.map((item) => (
                          <Link key={item.id} href={item.href} className="block px-4 py-3 transition-colors hover:bg-muted/60 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
                            <div className="flex flex-wrap items-center gap-2">
                              <span className="text-sm font-medium">{item.label}</span>
                              <span className={cn("rounded border px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider", statusClass(item.status))}>{statusText(item.status)}</span>
                            </div>
                            <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.detail}</p>
                          </Link>
                        ))}
                      </div>
                    ) : <p className="p-4 text-sm leading-6 text-muted-foreground">{group.empty}</p>}
                  </Panel>
                );
              })}
            </div>
            <p className="mt-4 rounded-[10px] border border-border bg-background px-4 py-3 text-xs leading-5 text-muted-foreground">Memori tersimpan di peramban ini dan dicadangkan ke GCS bila layanan tersedia. Tidak ada akun; browser, cookie, atau perangkat baru dapat memulai memori baru. Catalyst tidak melatih ulang model dari data ini, dan pertanyaan Copilot tidak disimpan.</p>
          </div>
        </details>
      </Panel>

      <div className="mt-4"><LearningLayers /></div>
    </div>
  );
}
