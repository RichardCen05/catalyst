"use client";

import { useEffect, useId, useMemo, useRef, useState } from "react";
import { companies, coverageInfo } from "@/lib/data/fixtures";
import { fuzzyIncludes } from "@/lib/text/fuzzy";
import type { SymbolCode } from "@/lib/types";
import { cn } from "@/lib/utils";
import { IconSearch } from "@/components/ui/icons";
import { PriceChange } from "@/components/ui/price-change";
import { TickerAvatar } from "@/components/ui/ticker-avatar";

interface Option {
  symbol: SymbolCode;
  name: string;
  changePct: number;
  /** Why this emiten cannot be picked; absent when it can. */
  reason?: string;
}

/**
 * Search and dropdown in one field. The list opens with every emiten in the
 * registry, so a reader sees what exists before typing; typing narrows it.
 *
 * An emiten a comparison cannot use stays in the list, greyed, with the
 * recordings it is missing — hiding it would read as "not in the registry".
 * Pickable emiten come first, each group in registry order.
 */
export function SymbolCombobox({
  label,
  exclude = [],
  onSelect,
  onClose,
}: {
  /** Screen-reader name of the field. */
  label: string;
  /** Emiten already taken elsewhere, shown greyed rather than hidden. */
  exclude?: SymbolCode[];
  onSelect: (symbol: SymbolCode) => void;
  onClose: () => void;
}) {
  const [query, setQuery] = useState("");
  const [active, setActive] = useState(0);
  const listRef = useRef<HTMLUListElement | null>(null);
  const baseId = useId();

  const options = useMemo<Option[]>(() => {
    const value = query.trim().toLowerCase();
    const all = companies
      .filter((company) => !value || fuzzyIncludes(`${company.symbol} ${company.name} ${company.sector}`, value))
      .map((company): Option => {
        const missing = coverageInfo[company.symbol]?.missing ?? [];
        const reason = exclude.includes(company.symbol)
          ? "Sudah ada di kolom lain"
          : company.analyzed
            ? undefined
            : `Rekaman belum lengkap${missing.length ? `: ${missing.join(", ")}` : ""}`;
        return { symbol: company.symbol, name: company.name, changePct: company.changePct, reason };
      });
    return [...all.filter((option) => !option.reason), ...all.filter((option) => option.reason)];
  }, [query, exclude]);

  const enabled = useMemo(() => options.map((option, index) => (option.reason ? -1 : index)).filter((index) => index >= 0), [options]);
  const activeIndex = enabled.length ? enabled[Math.min(active, enabled.length - 1)] : -1;

  useEffect(() => {
    if (activeIndex < 0) return;
    listRef.current?.querySelector<HTMLElement>(`[data-index="${activeIndex}"]`)?.scrollIntoView({ block: "nearest" });
  }, [activeIndex]);

  const optionId = (index: number) => `${baseId}-option-${index}`;
  const listId = `${baseId}-list`;

  return (
    <div className="relative">
      <label className="relative block">
        <IconSearch aria-hidden="true" className="pointer-events-none absolute left-2.5 top-1/2 size-3.5 -translate-y-1/2 text-muted-foreground" />
        <span className="sr-only">{label}</span>
        <input
          autoFocus
          role="combobox"
          aria-expanded="true"
          aria-controls={listId}
          aria-autocomplete="list"
          aria-activedescendant={activeIndex >= 0 ? optionId(activeIndex) : undefined}
          value={query}
          onChange={(event) => { setQuery(event.target.value); setActive(0); }}
          onBlur={onClose}
          onKeyDown={(event) => {
            if (event.key === "ArrowDown") { event.preventDefault(); setActive((index) => (enabled.length ? (index + 1) % enabled.length : 0)); }
            else if (event.key === "ArrowUp") { event.preventDefault(); setActive((index) => (enabled.length ? (index - 1 + enabled.length) % enabled.length : 0)); }
            else if (event.key === "Home") { event.preventDefault(); setActive(0); }
            else if (event.key === "End") { event.preventDefault(); setActive(Math.max(0, enabled.length - 1)); }
            else if (event.key === "Enter") { event.preventDefault(); if (activeIndex >= 0) onSelect(options[activeIndex].symbol); }
            else if (event.key === "Escape") { event.preventDefault(); onClose(); }
          }}
          placeholder="Cari emiten"
          className="h-9 w-full rounded-lg border border-primary bg-surface pl-8 pr-2 font-mono text-xs outline-none focus:ring-2 focus:ring-ring/25"
        />
      </label>
      <ul
        ref={listRef}
        id={listId}
        role="listbox"
        aria-label={label}
        className="absolute z-10 mt-1 max-h-72 w-72 overflow-y-auto rounded-lg border border-border bg-surface py-1 text-left shadow-lg"
      >
        {options.length ? options.map((option, index) => {
          const disabled = Boolean(option.reason);
          const current = index === activeIndex;
          return (
            <li
              key={option.symbol}
              id={optionId(index)}
              data-index={index}
              role="option"
              aria-selected={current}
              aria-disabled={disabled || undefined}
              onMouseDown={(event) => event.preventDefault()}
              onMouseEnter={() => { if (!disabled) setActive(enabled.indexOf(index)); }}
              onClick={() => { if (!disabled) onSelect(option.symbol); }}
              className={cn(
                "flex items-start gap-2 px-3 py-2 text-xs",
                disabled ? "cursor-not-allowed opacity-55" : "cursor-pointer",
                current && "bg-muted",
              )}
            >
              <TickerAvatar symbol={option.symbol} size="sm" />
              <span className="min-w-0 flex-1">
                <span className="flex items-center gap-2">
                  <span className={cn("font-mono font-semibold", disabled ? "text-muted-foreground" : "text-primary")}>{option.symbol}</span>
                  <span className="truncate text-muted-foreground">{option.name}</span>
                </span>
                {option.reason ? <span className="mt-0.5 block text-subtle-foreground">{option.reason}</span> : null}
              </span>
              <PriceChange value={option.changePct} className="text-xs" />
            </li>
          );
        }) : <li role="presentation" className="px-3 py-2 text-xs text-muted-foreground">Tidak ada emiten cocok.</li>}
      </ul>
    </div>
  );
}
