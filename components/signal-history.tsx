import { Database } from "lucide-react";
import { CitationDialog } from "@/components/citation-dialog";
import type { ResearchCase } from "@/lib/types";

/**
 * Stability read over trailing halves of the recorded volume window.
 *
 * The figures come from the case, not from a second call to
 * `describeSignalStability` here. Recomputing them in the component left
 * three numbers on the page with no citation and no way for the assistant to
 * answer a question about them, and kept a second copy of the volume
 * thresholds in client code where it could drift from the pillars'.
 */
export function SignalHistory({ stability }: { stability: ResearchCase["signalStability"] }) {
  if (!stability.windows.length) {
    return (
      <section aria-label="Rekam jejak sinyal" className="mt-4 rounded-[10px] border border-border bg-surface px-4 py-3 text-xs leading-5 text-muted-foreground">
        <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Rekam jejak sinyal</p>
        <p className="mt-1">{stability.agreement}</p>
      </section>
    );
  }
  return (
    <section aria-label="Rekam jejak sinyal" className="mt-4 overflow-hidden rounded-[10px] border border-border bg-surface">
      <div className="border-b border-border px-4 py-3">
        <p className="font-mono text-[10px] uppercase tracking-wider text-primary">Rekam jejak sinyal</p>
        <p className="mt-1 text-xs leading-5 text-muted-foreground">{stability.agreement}</p>
      </div>
      <div className="grid gap-px bg-border sm:grid-cols-3">
        {stability.windows.map((item) => (
          <div key={item.label} className="bg-surface px-4 py-3">
            <p className="text-xs font-medium">{item.label}</p>
            <p className="mt-1 font-mono text-sm">{item.value === "Belum tersedia" ? "—" : item.value}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.detail}</p>
            <CitationDialog
              citations={item.citations}
              trigger={
                <button type="button" className="mt-1 inline-flex min-h-8 cursor-pointer items-center gap-1 rounded-[5px] border border-transparent px-1.5 font-mono text-[9px] uppercase tracking-wider text-primary transition-colors hover:border-primary/35 hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                  <Database aria-hidden="true" className="size-2.5" />
                  {item.citations.length} sumber
                </button>
              }
            />
          </div>
        ))}
      </div>
      <div className="flex flex-wrap items-center justify-between gap-2 px-4 py-2">
        <p className="text-[11px] leading-5 text-muted-foreground">{stability.note}</p>
        <CitationDialog citations={stability.windows.flatMap((item) => item.citations)} label="Periksa data sumber" />
      </div>
    </section>
  );
}
