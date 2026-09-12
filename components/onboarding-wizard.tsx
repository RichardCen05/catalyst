"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowLeft, ArrowRight, Check, Compass, Database, Eye } from "lucide-react";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { Horizon, SymbolCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const horizons: Array<{ id: Horizon; label: string; detail: string }> = [
  { id: "event", label: "Event", detail: "1-3 hari" },
  { id: "swing", label: "Swing", detail: "1-4 minggu" },
  { id: "position", label: "Position", detail: "1-3 bulan" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const { profile, setWatchlist, setHorizon, completeOnboarding } = useCatalystStore();
  const readyCompanies = companies.filter((company) => company.analyzed);
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
            <p className="font-mono text-[10px] uppercase tracking-[0.16em] text-primary">Setup · {step}/2</p>
            <Dialog.Title className="mt-1 text-xl font-semibold">Siapkan ruang riset</Dialog.Title>
            <div className="mt-3 grid grid-cols-2 gap-2" aria-label={`Langkah ${step} dari 2`}><span className="h-1 rounded-full bg-primary" /><span className={cn("h-1 rounded-full", step === 2 ? "bg-primary" : "bg-muted")} /></div>
          </div>

          <div className="min-h-[330px] p-5 sm:p-6">
            {step === 1 ? <div>
              <h2 className="text-lg font-semibold">Pilih fokus awal</h2>
              <p className="mt-1 text-sm leading-6 text-muted-foreground">Mulai dari emiten yang analisisnya siap. Watchlist dan horizon dapat diubah lagi di Agent.</p>
              <div className="mt-5 grid gap-2 sm:grid-cols-3">{readyCompanies.map((company) => {
                const selected = profile.watchlist.includes(company.symbol);
                return <button key={company.symbol} onClick={() => toggleTicker(company.symbol)} aria-pressed={selected} className={cn("min-h-16 cursor-pointer rounded-xl border p-3 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", selected ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted")}><span className="flex items-center justify-between"><span className="font-mono text-sm font-semibold">{company.symbol}</span>{selected ? <Check aria-hidden="true" className="size-4 text-primary" /> : null}</span><span className="mt-1 block truncate text-xs text-muted-foreground">{company.subsector}</span></button>;
              })}</div>
              <fieldset className="mt-6"><legend className="text-sm font-medium">Horizon</legend><div className="mt-2 grid gap-2 sm:grid-cols-3">{horizons.map((item) => <button key={item.id} onClick={() => setHorizon(item.id)} aria-pressed={profile.config.horizon === item.id} className={cn("min-h-14 cursor-pointer rounded-lg border px-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", profile.config.horizon === item.id ? "border-primary bg-primary/10" : "border-border bg-background")}><span className="block text-sm font-semibold">{item.label}</span><span className="block font-mono text-[10px] text-muted-foreground">{item.detail}</span></button>)}</div></fieldset>
            </div> : null}

            {step === 2 ? <div>
              <div className="flex items-start gap-3"><span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Compass aria-hidden="true" className="size-5" /></span><div><h2 className="text-lg font-semibold">Ikuti tur lima titik</h2><p className="mt-1 text-sm leading-6 text-muted-foreground">Tur membawa Anda dari perubahan hari ini sampai Copilot. Durasi sekitar satu menit dan dapat diulang dari sidebar.</p></div></div>
              <div className="mt-5 grid gap-3 sm:grid-cols-2">
                <div className="rounded-xl border border-border bg-background p-4"><Database aria-hidden="true" className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Data tetap fixture</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Semua angka, peristiwa, dan jawaban agent adalah simulasi yang dapat diperiksa.</p></div>
                <div className="rounded-xl border border-border bg-background p-4"><Eye aria-hidden="true" className="size-5 text-primary" /><h3 className="mt-3 font-semibold">Koreksi menjadi hipotesis</h3><p className="mt-1 text-sm leading-6 text-muted-foreground">Catatan user tidak mengubah angka, formula, sumber, atau verdict.</p></div>
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
