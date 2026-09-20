"use client";
import { fuzzyIncludes } from "@/lib/text/fuzzy";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { Check, Compass, Search } from "lucide-react";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

export function OnboardingWizard() {
  const [query, setQuery] = useState("");
  const { profile, setWatchlist, completeOnboarding } = useCatalystStore();
  // Commodity desk scope derived from recorded sectors — never a symbol list.
  const commodityDesk = new Set(["Basic Materials", "Energy"]);
  const readyCompanies = companies.filter((company) => commodityDesk.has(company.sector));
  const readySelected = profile.watchlist.filter((item) => readyCompanies.some((company) => company.symbol === item));
  // Local filter over already-loaded fixtures — no network call per keystroke.
  const filteredCompanies = readyCompanies.filter((company) => {
    return fuzzyIncludes(`${company.symbol} ${company.name}`, query);
  });
  const toggleTicker = (symbol: SymbolCode) => {
    if (profile.watchlist.includes(symbol)) {
      if (readySelected.length <= 2) return;
      setWatchlist(profile.watchlist.filter((item) => item !== symbol));
    } else setWatchlist([...profile.watchlist, symbol]);
  };

  return (
    <Dialog.Root open={!profile.hasOnboarded}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/90 backdrop-blur-md" />
        <Dialog.Content onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()} className="fixed inset-x-3 top-1/2 z-100 mx-auto max-h-[92dvh] w-auto max-w-2xl -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none sm:inset-x-6">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <Dialog.Title className="text-xl font-semibold">Siapkan ruang riset</Dialog.Title>
          </div>

          <div className="min-h-[330px] p-5 sm:p-6">
            <div>
              <h2 className="text-lg font-semibold">Pilih saham komoditas yang dipantau</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">Catalyst berfokus pada emiten tambang dan energi. Perubahan harga komoditas, rupiah, cuaca, produksi, dan aturan dapat ditelusuri ke dampak bisnis.</p>
              <div className="relative mt-4">
                <Search aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" />
                <input type="text" value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari kode atau nama emiten" className="w-full rounded-xl border border-border bg-background py-2 pl-9 pr-3 text-sm outline-none focus-visible:ring-2 focus-visible:ring-ring" />
              </div>
              <div className="mt-3 grid gap-2 sm:grid-cols-3">{filteredCompanies.map((company) => {
                const selected = profile.watchlist.includes(company.symbol);
                return <button key={company.symbol} onClick={() => toggleTicker(company.symbol)} aria-pressed={selected} className={cn("min-h-16 cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted")}><span className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{company.symbol}</span>{selected ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{uiLabel(company.subsector)}</span></button>;
              })}</div>
              <div className="mt-6 border-t border-border pt-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Alur harian</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Pilih perubahan, tetapkan pertanyaan, lacak sebab akibat, lalu tentukan tindakan riset.</p></div>
            </div>
          </div>

          <div className="flex items-center justify-end border-t border-border px-5 py-4 sm:px-6">
            <Button onClick={completeOnboarding}>Mulai tour<Compass aria-hidden="true" className="size-4" /></Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
