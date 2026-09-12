import { AlertTriangle, Calculator, ChevronDown, Database } from "lucide-react";
import type { PillarResult } from "@/lib/types";
import { CitationDialog } from "@/components/citation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

export function EvidenceCard({ pillar, index }: { pillar: PillarResult; index: number }) {
  return (
    <article className="min-w-0 max-w-full rounded-xl border border-border bg-surface p-4 shadow-panel">
      <div className="flex items-start gap-3">
        <span className="grid size-7 shrink-0 place-items-center rounded-md bg-primary/12 font-mono text-xs font-semibold text-primary">{index + 1}</span>
        <div className="min-w-0 flex-1"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-muted-foreground">Pilar {index + 1}</p><h3 className="mt-0.5 text-base font-semibold">{pillar.label}</h3></div>
        <StatusBadge status={pillar.status} />
      </div>
      <p className="mt-3 text-sm leading-6 text-muted-foreground">{pillar.summary}</p>
      {pillar.conflict ? <div className="mt-3 flex gap-2 rounded-lg border border-danger/25 bg-danger/8 p-3 text-xs leading-5 text-foreground"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />{pillar.conflict}</div> : null}
      <dl className="mt-4 grid grid-cols-2 gap-px overflow-hidden rounded-lg border border-border bg-border">
        {pillar.metrics.slice(0, 2).map((metric) => <div key={metric.label} className="min-w-0 bg-background p-2.5"><dt className="truncate text-[11px] text-muted-foreground" title={metric.label}>{metric.label}</dt><dd className="mt-1 break-words font-mono text-sm font-semibold tabular-nums">{metric.value}</dd><dd className="mt-1 inline-flex items-center gap-1 text-[9px] uppercase tracking-wider text-primary"><Database aria-hidden="true" className="size-2.5" />{metric.citations.length} source</dd></div>)}
      </dl>
      <details className="group mt-3 rounded-lg border border-border bg-background">
        <summary className="flex min-h-11 cursor-pointer list-none items-center gap-2 px-3 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring"><Calculator aria-hidden="true" className="size-3.5" />Lihat perhitungan dan semua input<ChevronDown aria-hidden="true" className="ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-border p-3">
          {pillar.calculation ? <div><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{pillar.calculation.name}</p><code className="mt-2 block overflow-x-auto rounded-md border border-border bg-surface p-2.5 text-[11px] leading-5 text-foreground">{pillar.calculation.formula}</code><dl className="mt-3 grid gap-3 text-xs"><div><dt className="text-muted-foreground">Substitusi fixture</dt><dd className="mt-1 break-words font-mono leading-5">{pillar.calculation.substitution}</dd></div><div><dt className="text-muted-foreground">Hasil deterministik</dt><dd className="mt-1 font-mono font-semibold text-foreground">{pillar.calculation.result}</dd></div></dl><ul className="mt-3 space-y-1.5 text-xs leading-5 text-muted-foreground">{pillar.calculation.notes.map((note) => <li key={note} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{note}</li>)}</ul></div> : null}
          {pillar.metrics.length > 2 ? <dl className="mt-4 grid grid-cols-2 gap-2 sm:grid-cols-3">{pillar.metrics.slice(2).map((metric) => <div key={metric.label} className="rounded-md border border-border p-2"><dt className="text-[10px] text-muted-foreground">{metric.label}</dt><dd className="mt-1 break-words font-mono text-xs font-semibold">{metric.value}</dd></div>)}</dl> : null}
          <div className="mt-4"><CitationDialog citations={pillar.citations} label="Periksa field sumber" /></div>
        </div>
      </details>
    </article>
  );
}
