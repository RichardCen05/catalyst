import { AlertTriangle, Calculator, ChevronDown, Database } from "lucide-react";
import type { Citation, PillarResult, SymbolCode } from "@/lib/types";
import { companies } from "@/lib/data/fixtures";
import { AskAgentButton } from "@/components/ask-agent-button";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceFeedback } from "@/components/evidence-feedback";
import { StatusBadge } from "@/components/ui/status-badge";

/**
 * The source count is the door to the sources.
 *
 * Every figure already named how many recordings produced it; the count sat
 * there as dead text while the only way into the evidence was a button below
 * the fold that opened the pillar's whole union. Pressing the count now opens
 * exactly the recordings behind that one figure.
 */
function SourceChip({ citations }: { citations: Citation[] }) {
  return (
    <CitationDialog
      citations={citations}
      trigger={
        <button type="button" className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-[5px] border border-transparent px-1.5 font-mono text-[9px] uppercase tracking-wider text-primary transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
          <Database aria-hidden="true" className="size-2.5" />
          {citations.length} sumber
        </button>
      }
    />
  );
}

export function EvidenceCard({ pillar, symbol }: { pillar: PillarResult; symbol: SymbolCode }) {
  // Tour anchor follows the first recorded full case, not a typed ticker, so
  // the spotlight tracks the registry when recordings refresh.
  const tourSymbol = companies.find((company) => company.analyzed)?.symbol;
  // Structural split only: the steps and their separator come from the
  // recorded substitution string, so nothing here can state a figure the
  // calculation did not produce.
  const substitutionSteps = pillar.calculation?.substitution.split(";").map((step) => step.trim()).filter(Boolean) ?? [];
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
        {pillar.metrics.map((metric) => <div key={metric.label} className="min-w-[45%] flex-1 bg-background p-3 sm:min-w-[150px]"><dt className="truncate text-[11px] text-muted-foreground" title={metric.label}>{metric.label}</dt><dd className="mt-1 break-words font-mono text-sm font-semibold tabular-nums">{metric.value}</dd>{metric.detail ? <dd className="mt-0.5 font-mono text-[10px] text-muted-foreground">{metric.detail}</dd> : null}<dd><SourceChip citations={metric.citations} /></dd></div>)}
      </dl>

      <details className="group">
        <summary data-tour-action={symbol === tourSymbol ? "toggle-calculation" : undefined} className="flex min-h-12 cursor-pointer list-none items-center gap-2 px-4 text-xs font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring sm:px-5"><Calculator aria-hidden="true" className="size-3.5" />Perhitungan dan data<ChevronDown aria-hidden="true" className="ml-auto size-3.5 transition-transform group-open:rotate-180" /></summary>
        <div className="border-t border-border bg-background p-4 sm:p-5">
          {pillar.calculation ? <div className="space-y-4">
            <div>
              <p className="font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{pillar.calculation.name}</p>
              <code className="mt-2 block overflow-x-auto rounded-md border border-border bg-surface p-2.5 text-[11px] leading-5 text-foreground">{pillar.calculation.formula}</code>
            </div>
            <div>
              <p className="text-xs text-muted-foreground">Substitusi data</p>
              {/* One recorded step per row: the substitution used to arrive as
                  a single unbroken mono line that wrapped mid-term, so the
                  reader could not tell where one quantity ended. */}
              <ol className="mt-2 grid gap-px overflow-hidden rounded-md border border-border bg-border">
                {substitutionSteps.map((step) => <li key={step} className="overflow-x-auto bg-surface p-2.5 font-mono text-[11px] leading-5 text-muted-foreground">{step}</li>)}
              </ol>
            </div>
            <div className="rounded-md border border-primary/25 bg-primary/8 p-3">
              <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Hasil perhitungan</p>
              <p className="mt-1 break-words font-mono text-sm font-semibold text-foreground">{pillar.calculation.result}</p>
            </div>
            <ul className="space-y-1.5 text-xs leading-5 text-muted-foreground">{pillar.calculation.notes.map((note) => <li key={note} className="flex gap-2"><span aria-hidden="true" className="mt-2 size-1 shrink-0 rounded-full bg-primary" />{note}</li>)}</ul>
          </div> : null}
          <div className="mt-4"><CitationDialog citations={pillar.citations} label="Periksa data sumber" /></div>
        </div>
      </details>
      <div className="flex flex-wrap items-center gap-3 border-t border-border px-4 py-3 sm:px-5"><EvidenceFeedback symbol={symbol} pillar={pillar.key} label={pillar.label} /><AskAgentButton context={{ label: `${symbol} · ${pillar.label}`, question: `Jelaskan bukti ${pillar.label} untuk ${symbol}.`, symbol }} label={`Tanya pilar ${pillar.label}`} /></div>
    </article>
  );
}
