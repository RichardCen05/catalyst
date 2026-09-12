"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Check, Compass, Database, Eye } from "lucide-react";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const { profile, setWatchlist, completeOnboarding } = useCatalystStore();
  const commodityDesk = new Set<SymbolCode>(["ANTM", "INCO", "TINS", "PGAS", "ADRO", "PTBA"]);
  const readyCompanies = companies.filter((company) => company.analyzed && commodityDesk.has(company.symbol));
  const readySelected = profile.watchlist.filter((item) => readyCompanies.some((company) => company.symbol === item));
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
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">Pengaturan · {step}/2</p>
            <Dialog.Title className="mt-1 text-xl font-semibold">Siapkan ruang riset</Dialog.Title>
            <div className="mt-3 grid grid-cols-2 gap-2" aria-label={`Langkah ${step} dari 2`}><span className="h-1 rounded-full bg-primary" /><span className={cn("h-1 rounded-full", step === 2 ? "bg-primary" : "bg-muted")} /></div>
          </div>

          <div className="min-h-[330px] p-5 sm:p-6">
            {step === 1 ? <div>
              <h2 className="text-lg font-semibold">Pilih saham komoditas yang dipantau</h2>
              <p className="mt-1 max-w-xl text-sm leading-6 text-muted-foreground">Catalyst berfokus pada emiten tambang dan energi. Perubahan harga komoditas, rupiah, cuaca, produksi, dan aturan dapat ditelusuri ke dampak bisnis.</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">{readyCompanies.map((company) => {
                const selected = profile.watchlist.includes(company.symbol);
                return <button key={company.symbol} onClick={() => toggleTicker(company.symbol)} aria-pressed={selected} className={cn("min-h-16 cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted")}><span className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{company.symbol}</span>{selected ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{uiLabel(company.subsector)}</span></button>;
              })}</div>
              <div className="mt-6 border-t border-border pt-4"><p className="font-mono text-[10px] uppercase tracking-wider text-primary">Alur harian</p><p className="mt-1 text-sm leading-6 text-muted-foreground">Pilih perubahan, tetapkan pertanyaan, lacak sebab akibat, lalu tentukan tindakan riset.</p></div>
            </div> : null}

            {step === 2 ? <div>
              <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-[6px] bg-brand text-white"><Compass aria-hidden="true" className="size-5" /></span><div><h2 className="editorial text-xl">Coba alur riset secara langsung</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Tur memandu empat tindakan dari perubahan baru hingga tindakan riset. Kurang dari satu menit.</p></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-4"><Database aria-hidden="true" className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Data simulasi</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Semua angka, peristiwa, dan jawaban asisten dapat diperiksa.</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><Eye aria-hidden="true" className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Koreksi tetap terpisah</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Catatan Anda tidak mengubah angka, rumus, sumber, atau hasil bukti.</p></div>
              </div>
              <p className="mt-5 rounded-lg border border-attention/30 bg-attention/8 p-3 text-xs leading-5 text-muted-foreground">Catalyst menyajikan riset dan batas bukti. Tidak ada penilaian tindakan transaksi.</p>
            </div> : null}
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-6">
            <Button variant="ghost" onClick={() => setStep(1)} disabled={step === 1}><ArrowLeft aria-hidden="true" className="size-4" />Kembali</Button>
            {step === 1 ? <Button onClick={() => setStep(2)}>Lanjut<ArrowRight aria-hidden="true" className="size-4" /></Button> : <Button onClick={completeOnboarding}>Masuk dan mulai tur<Compass aria-hidden="true" className="size-4" /></Button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
