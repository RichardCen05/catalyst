"use client";

import type { SymbolCode } from "@/lib/types";
import { cn } from "@/lib/utils";

/**
 * Which issuers the board is reading right now.
 *
 * "Semua" is the absence of a filter, not a value: the board without a
 * selection is every open case, so clearing the last chip returns to it rather
 * than leaving the page with nothing to draw.
 */
export function SymbolMultiselect({ options, selected, onChange, label }: {
  options: SymbolCode[];
  /** Empty means every option — the "Semua" state. */
  selected: SymbolCode[];
  onChange: (next: SymbolCode[]) => void;
  label: string;
}) {
  const all = selected.length === 0;
  const toggle = (symbol: SymbolCode) => {
    const active = selected.includes(symbol);
    // From "Semua", the first click narrows to that one issuer; otherwise the
    // chip is added to or removed from what is already selected.
    const next = all ? [symbol] : active ? selected.filter((item) => item !== symbol) : [...selected, symbol];
    onChange(next.length === options.length ? [] : next);
  };
  const chip = (active: boolean) => cn(
    "inline-flex min-h-9 items-center rounded-lg border px-3 text-sm font-medium transition-[background-color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring",
    active ? "border-foreground bg-foreground text-background" : "border-border-strong bg-background text-foreground hover:shadow-[0_0_0_3px_var(--muted)]",
  );

  return (
    <div role="group" aria-label={label} className="flex flex-wrap items-center gap-2">
      <button type="button" aria-pressed={all} onClick={() => onChange([])} className={chip(all)}>
        Semua<span className="ml-1.5 font-mono text-xs opacity-70">{options.length}</span>
      </button>
      {options.map((symbol) => {
        // Under "Semua" only that chip is filled: every chip lit at once read
        // as six separate filters rather than no filter.
        const active = selected.includes(symbol);
        return (
          <button key={symbol} type="button" aria-pressed={active} onClick={() => toggle(symbol)} className={chip(active)}>
            {symbol}
          </button>
        );
      })}
    </div>
  );
}