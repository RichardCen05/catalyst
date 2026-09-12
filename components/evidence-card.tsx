import { AlertTriangle, Calculator, ChevronDown, Database } from "lucide-react";
import type { PillarResult, SymbolCode } from "@/lib/types";
import { AskAgentButton } from "@/components/ask-agent-button";
import { CitationDialog } from "@/components/citation-dialog";
import { StatusBadge } from "@/components/ui/status-badge";

export function EvidenceCard({ pillar, symbol }: { pillar: PillarResult; symbol: SymbolCode }) {
  return (
    <article className="min-w-0 max-w-full overflow-hidden rounded-[12px] border border-border bg-surface">
      <header className="px-4 py-4 sm:px-5">
        <div className="flex items-start justify-between gap-4"><h3 className="editorial text-2xl">{pillar.label}</h3><StatusBadge status={pillar.status} /></div>
        <p className="mt-3 max-w-3xl text-sm leading-6 text-muted-foreground">{pillar.summary}</p>
        {pillar.conflict ? <p className="mt-4 flex gap-2 border-t border-danger/25 pt-3 text-xs leading-5 text-foreground"><AlertTriangle aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-danger" />{pillar.conflict}</p> : null}
      </header>

      <section className="border-t border-border px-4 py-5 sm:px-5" aria-labelledby={`claim-${pillar.key}`}>
        <h4 id={`claim-${pillar.key}`} className="text-sm font-semibold">Klaim yang diuji</h4>
        <p className="mt-2 max-w-3xl text-sm leading-6">{pillar.protocol.claim}</p>
        <div className="mt-5 grid border-y border-border sm:grid-cols-2 sm:divide-x sm:divide-border">
          <div className="py-4 sm:pr-5"><p className="text-xs font-medium text-positive">Bukti pendukung</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{pillar.protocol.supportingEvidence}</p></div>
          <div className="border-t border-border py-4 sm:border-t-0 sm:pl-5"><p className="text-xs font-medium text-attention-foreground">Bukti penyangkal</p><p className="mt-2 text-xs leading-5 text-muted-foreground">{pillar.protocol.challengingEvidence}</p></div>
        </div>
        <details className="group border-b border-border"><summary className="flex min-h-11 cursor-pointer list-none items-center text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Batas dan langkah berikutnya<ChevronDown aria-hidden="true" className="ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary><dl className="grid gap-4 pb-4 text-xs leading-5 sm:grid-cols-2"><div><dt className="font-medium">Tidak cukup bila</dt><dd className="mt-1 text-muted-foreground">{pillar.protocol.insufficientWhen}</dd></div><div><dt className="font-medium">Pertanyaan berikutnya</dt><dd className="mt-1 text-muted-foreground">{pillar.protocol.nextQuestion}</dd></div></dl></details>
      </section>

      <dl className="grid grid-cols-2 border-y border-border bg-background sm:grid-cols-4">
        {pillar.metrics.map((metric) => <div key={metric.label} className="min-w-0 border-r border-border p-3 last:border-r-0"><dt className="truncate text-[11px] text-muted-foreground" title={metric.label}>{metric.label}</dt><dd className="mt-1 break-words font-mono text-sm font-semibold tabular-nums">{metric.value}</dd><dd className="mt-1 inline-flex items-center gap-1 font-mono text-[9px] uppercase tracking-wider text-primary"><Database aria-hidden="true" className="size-2.5" />{metric.citations.length} source</dd></div>)}
      </dl>

      <details className="group">
        <summary className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"><Calculator aria-hidden="true" className="size-3.5" />Perhitungan dan input<ChevronDown aria-hidden="true" className="ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-border bg-background p-4 sm:p-5">
          {pillar.calculation ? <div><p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{pillar.calculation.name}</p><code className="mt-2 block overflow-x-auto rounded-md border border-border bg-surface p-2.5 text-[11px] leading-5 text-foreground">{pillar.calculation.formula}</code><dl className="mt-3 grid gap-3 text-xs"><div><dt className="text-muted-foreground">Substitusi fixture</dt><dd className="mt-1 break-words font-mono leading-5">{pillar.calculation.substitution}</dd></div><div><dt className="text-muted-foreground">Hasil deterministik</dt><dd className="mt-1 font-mono font-semibold text-foreground">{pillar.calculation.result}</dd></div></dl><ul className="mt-3 space-y-1.5 text-xs leading-5 text-muted-foreground">{pillar.calculation.notes.map((note) => <li key={note} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{note}</li>)}</ul></div> : null}
          <div className="mt-4"><CitationDialog citations={pillar.citations} label="Periksa field sumber" /></div>
        </div>
      </details>
      <div className="border-t border-border px-4 py-3 sm:px-5"><AskAgentButton context={{ label: `${symbol} · ${pillar.label}`, question: `Jelaskan bukti ${pillar.label} untuk ${symbol}.`, symbol }} label={`Tanya pilar ${pillar.label}`} /></div>
    </article>
  );
}
