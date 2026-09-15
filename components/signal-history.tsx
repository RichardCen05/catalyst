"use client";

import { describeSignalStability } from "@/lib/agent/signal-history";
import type { PricePoint } from "@/lib/types";

/** Stability read over trailing halves of the recorded volume window. */
export function SignalHistory({ series }: { series: PricePoint[] }) {
  const stability = describeSignalStability(series);
  if (!stability.windowScores.length) {
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
        {stability.windowScores.map((item) => (
          <div key={item.label} className="bg-surface px-4 py-3">
            <p className="text-xs font-medium">{item.label}</p>
            <p className="mt-1 font-mono text-sm">{item.robustZ === null ? "—" : item.robustZ.toFixed(2)}</p>
            <p className="mt-0.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">{item.status}</p>
          </div>
        ))}
      </div>
      <p className="px-4 py-2 text-[11px] leading-5 text-muted-foreground">{stability.note}</p>
    </section>
  );
}
