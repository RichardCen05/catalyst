import React from "react";
import { AlertTriangle, Calculator, ChevronDown, Database } from "lucide-react";
import type { Citation, MetricValue, PillarResult, SymbolCode } from "@/lib/types";
import { primarySymbol } from "@/lib/data/fixtures";
import { metricDerivation } from "@/lib/agent/explain";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceFeedback } from "@/components/evidence-feedback";
import { StatusBadge } from "@/components/ui/status-badge";

/** The recordings behind one figure, named. One label reads; a list counts. */
function sourceSummary(citations: Citation[]): string {
  if (!citations.length) return "Tanpa rekaman";
  const [first, ...rest] = citations;
  return rest.length ? `${first.label} +${rest.length}` : first.label;
}

/**
 * The source count is the door to the sources.
 *
 * Every figure already named how many recordings produced it; the count sat
 * there as dead text while the only way into the evidence was a button below
 * the fold that opened the pillar's whole union. Pressing the count now opens
 * exactly the recordings behind that one figure.
 *
 * The count alone still answered "how many" and never "which" — a reader
 * had to open a dialog to learn whether "2 sumber" meant two broker feeds or
 * a broker feed and a price series. The chip names the first recording and
 * how many more follow; the accessible name stays the count, which is what a
 * screen reader needs on a control whose job is to open the list.
 */
function SourceChip({ citations }: { citations: Citation[] }) {
  const summary = sourceSummary(citations);
  return (
    <CitationDialog
      citations={citations}
      trigger={
        <button
          type="button"
          aria-label={`${citations.length} sumber`}
          title={citations.map((citation) => citation.label).join(" · ")}
          className="mt-1 flex min-h-8 w-full cursor-pointer items-center gap-1 rounded-[5px] border border-transparent px-1.5 text-left font-mono text-[9px] uppercase tracking-wider text-primary transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
        >
          <Database aria-hidden="true" className="size-2.5 shrink-0" />
          <span aria-hidden="true" className="shrink-0">{citations.length} sumber</span>
          <span aria-hidden="true" className="truncate normal-case tracking-normal text-muted-foreground">· {summary}</span>
        </button>
      }
    />
  );
}

/**
 * One figure, and how it was produced.
 *
 * The block below the tiles used to hold the pillar's headline arithmetic
 * only: one formula, one substitution list, one result — for a row of up to
 * eight separate figures. A reader looking at "Peserta efektif 7.1" could not
 * learn that it is 1 ÷ HHI, because the derivation on screen belonged to the
 * pillar rather than to that tile.
 *
 * Every row here is read back from material that already exists: the label
 * and value from the metric, the formula from the per-metric registry the
 * assistant answers from, the substituted numbers from the recorded
 * calculation, and the recordings from the metric's own citations. A figure
 * the app reads straight off a recording says so instead of borrowing a
 * formula from the figure beside it.
 */
function DerivationRow({ pillar, metric }: { pillar: PillarResult; metric: MetricValue }) {
  const { formula, substitution, readDirectly } = metricDerivation(pillar, metric);
  return (
    <li className="bg-surface p-3">
      <div className="flex flex-wrap items-baseline justify-between gap-x-3 gap-y-1">
        <p className="text-xs font-semibold text-foreground">{metric.label}</p>
        <p className="break-words font-mono text-sm font-semibold tabular-nums text-foreground">{metric.value}</p>
      </div>
      {formula ? (
        <code className="mt-2 block overflow-x-auto rounded-md border border-border bg-background px-2 py-1.5 text-[11px] leading-5 text-foreground">{formula}</code>
      ) : readDirectly ? (
        <p className="mt-2 text-[11px] leading-5 text-muted-foreground">Tidak dihitung — dibaca langsung dari rekaman.</p>
      ) : null}
      {substitution ? (
        <div className="mt-2">
          <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Angka yang dimasukkan</p>
          <code className="mt-1 block overflow-x-auto rounded-md border border-border bg-background px-2 py-1.5 font-mono text-[11px] leading-5 text-muted-foreground">{substitution}</code>
        </div>
      ) : null}
      <p className="mt-2 flex items-start gap-1.5 text-[10px] leading-4 text-muted-foreground">
        <Database aria-hidden="true" className="mt-0.5 size-2.5 shrink-0 text-primary" />
        <span className="break-words">{metric.citations.map((citation) => citation.label).join(" · ") || "Tanpa rekaman"}</span>
      </p>
    </li>
  );
}

export function EvidenceCard({ pillar, symbol, trailing }: { pillar: PillarResult; symbol: SymbolCode; trailing?: React.ReactNode }) {
  // Tour anchor follows the first recorded full case, not a typed ticker, so
  // the spotlight tracks the registry when recordings refresh.
  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-[12px] border border-border bg-surface">
      <header className="px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4"><h3 className="editorial text-2xl">{pillar.label}</h3><StatusBadge status={pillar.status} /></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{pillar.summary}</p>
        {pillar.conflict ? <p className="mt-4 flex gap-2 border-t border-danger/25 pt-3 text-xs leading-5 text-foreground"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />{pillar.conflict}</p> : null}
      </header>

      <section className="border-t border-border px-4 py-5 sm:px-5" aria-labelledby={`claim-${pillar.key}`}>
        <div className="flex flex-wrap items-center justify-between gap-3">
          <h4 id={`claim-${pillar.key}`} className="text-sm font-semibold">Klaim yang diuji</h4>
          {trailing}
        </div>
        <p className="mt-2 max-w-3xl text-sm leading-6">{pillar.protocol.claim}</p>
        <div className="mt-5 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border sm:grid-cols-2">
          <div className="bg-background p-4"><p className="text-xs font-medium text-positive">Bukti pendukung</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{pillar.protocol.supportingEvidence}</p></div>
          <div className="bg-background p-4"><p className="text-xs font-medium text-attention-foreground">Bukti penyangkal</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{pillar.protocol.challengingEvidence}</p></div>
        </div>
      </section>

      {/* Wrapping row, not a fixed grid: a pillar carries three, four or five
          figures, and a four-column grid left the fifth alone beside an empty
          cell the width of half the card. The tiles stretch to close the last
          row instead. */}
      <dl className="flex flex-wrap gap-px border-y border-border bg-border">
        {pillar.metrics.map((metric) => <div key={metric.label} className="min-w-[45%] flex-1 overflow-hidden bg-background p-3 sm:min-w-[170px]"><dt className="truncate text-[11px] text-muted-foreground" title={metric.label}>{metric.label}</dt><dd className="mt-1 break-words font-mono text-sm font-semibold tabular-nums">{metric.value}</dd>{metric.detail ? <dd className="mt-0.5 font-mono text-[10px] text-muted-foreground">{metric.detail}</dd> : null}<dd><SourceChip citations={metric.citations} /></dd></div>)}
      </dl>

      <details className="group">
        <summary data-tour-action={symbol === primarySymbol ? "toggle-calculation" : undefined} className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"><Calculator aria-hidden="true" className="size-3.5" />Perhitungan dan data<ChevronDown aria-hidden="true" className="ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-border bg-background p-4 sm:p-5">
          <p className="text-xs leading-5 text-muted-foreground">Setiap angka di atas, beserta rumus, angka yang dimasukkan, dan rekaman asalnya.</p>
          <ol className="mt-3 grid gap-px overflow-hidden rounded-[10px] border border-border bg-border">
            {pillar.metrics.map((metric) => <DerivationRow key={metric.label} pillar={pillar} metric={metric} />)}
          </ol>
          {pillar.calculation ? <div className="mt-5 space-y-4">
            <div className="rounded-md border border-primary/25 bg-primary/8 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Hasil perhitungan · {pillar.calculation.name}</p>
              <p className="mt-1 break-words font-mono text-sm font-semibold text-foreground">{pillar.calculation.result}</p>
            </div>
            <div>
              <p className="text-[10px] uppercase tracking-wider text-muted-foreground">Rumus gabungan pilar</p>
              <code className="mt-1 block overflow-x-auto rounded-md border border-border bg-surface p-2.5 text-[11px] leading-5 text-foreground">{pillar.calculation.formula}</code>
            </div>
            <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">{pillar.calculation.notes.map((note) => <li key={note} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{note}</li>)}</ul>
          </div> : null}
          <div className="mt-4"><CitationDialog citations={pillar.citations} label="Periksa data sumber" /></div>
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5"><EvidenceFeedback symbol={symbol} pillar={pillar.key} label={pillar.label} /></div>
    </article>
  );
}