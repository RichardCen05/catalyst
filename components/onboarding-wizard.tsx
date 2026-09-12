"use client";

import { useState } from "react";
import * as Dialog from "@radix-ui/react-dialog";
import { ArrowDown, ArrowLeft, ArrowRight, ArrowUp, Check, Database, Eye, RotateCcw, SlidersHorizontal } from "lucide-react";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { AnswerDepth, Horizon, PillarKey, SymbolCode } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const pillarLabels: Record<PillarKey, string> = { concentration: "Konsentrasi", volume: "Volume", momentum: "Momentum", catalyst: "Katalis" };
const horizons: Array<{ id: Horizon; label: string; detail: string }> = [
  { id: "event", label: "Event", detail: "1-3 hari" },
  { id: "swing", label: "Swing", detail: "1-4 minggu" },
  { id: "position", label: "Position", detail: "1-3 bulan" },
];
const depths: Array<{ id: AnswerDepth; label: string; detail: string }> = [
  { id: "compact", label: "Ringkas", detail: "Verdict dan bukti utama" },
  { id: "standard", label: "Standar", detail: "Metrik, konflik, dan sumber" },
  { id: "forensic", label: "Forensik", detail: "Trace serta detail field" },
];

export function OnboardingWizard() {
  const [step, setStep] = useState(1);
  const { profile, setWatchlist, toggleOwned, setHorizon, setDepth, setPillarOrder, completeOnboarding } = useCatalystStore();
  const movePillar = (index: number, direction: -1 | 1) => {
    const next = [...profile.config.pillarOrder];
    const target = index + direction;
    if (target < 0 || target >= next.length) return;
    [next[index], next[target]] = [next[target], next[index]];
    setPillarOrder(next);
  };
  const toggleTicker = (symbol: SymbolCode) => {
    if (profile.watchlist.includes(symbol)) {
      if (profile.watchlist.length <= 5) return;
      setWatchlist(profile.watchlist.filter((item) => item !== symbol));
    } else if (profile.watchlist.length < 15) setWatchlist([...profile.watchlist, symbol]);
  };

  return (
    <Dialog.Root open={!profile.hasOnboarded}>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-[#030914]/90 backdrop-blur-md" />
        <Dialog.Content onEscapeKeyDown={(event) => event.preventDefault()} onPointerDownOutside={(event) => event.preventDefault()} className="fixed inset-x-3 top-1/2 z-100 mx-auto max-h-[92dvh] w-auto max-w-3xl -translate-y-1/2 overflow-y-auto rounded-2xl border border-border bg-surface shadow-2xl focus:outline-none sm:inset-x-6">
          <div className="border-b border-border px-5 py-4 sm:px-6">
            <div className="mb-3 flex items-center justify-between gap-4">
              <div>
                <p className="font-mono text-[11px] uppercase tracking-[0.16em] text-primary">Setup agent · langkah {step}/4</p>
                <Dialog.Title className="mt-1 text-xl font-semibold">Atur cara Catalyst bekerja</Dialog.Title>
              </div>
              <div className="font-mono text-xs text-muted-foreground">catalyst:v1</div>
            </div>
            <div className="grid grid-cols-4 gap-2" aria-label={`Langkah ${step} dari 4`}>
              {[1, 2, 3, 4].map((item) => <div key={item} className={cn("h-1 rounded-full", item <= step ? "bg-primary" : "bg-muted")} />)}
            </div>
          </div>

          <div className="min-h-[400px] p-5 sm:p-6">
            {step === 1 ? (
              <div>
                <div className="flex flex-wrap items-start justify-between gap-2"><div><h2 className="text-lg font-semibold">Pilih semesta riset</h2><p className="mt-1 text-sm text-muted-foreground">Pilih 5-15 ticker. Penanda dimiliki tidak meminta lot, harga perolehan, atau nilai investasi.</p></div><span className="rounded-md border border-primary/25 bg-primary/8 px-2.5 py-1.5 font-mono text-xs text-primary">{profile.watchlist.length}/15 dipilih</span></div>
                <div className="mt-5 grid gap-2 sm:grid-cols-2 lg:grid-cols-3">
                  {companies.map((company) => {
                    const selected = profile.watchlist.includes(company.symbol);
                    const owned = profile.owned.includes(company.symbol);
                    return (
                      <div key={company.symbol} className={cn("rounded-lg border p-3 transition-colors", selected ? "border-primary bg-primary/8" : "border-border bg-background")}>
                        <button onClick={() => toggleTicker(company.symbol)} aria-pressed={selected} className="flex min-h-11 w-full cursor-pointer items-center gap-3 text-left focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                          <span className={cn("grid size-5 shrink-0 place-items-center rounded border", selected ? "border-primary bg-primary text-primary-foreground" : "border-border")}>{selected ? <Check aria-hidden="true" className="size-3.5" /> : null}</span>
                          <span className="min-w-0"><span className="block font-mono text-sm font-semibold">{company.symbol}</span><span className="block truncate text-xs text-muted-foreground">{company.subsector}</span></span>
                        </button>
                        {selected ? <button onClick={() => toggleOwned(company.symbol)} aria-pressed={owned} className={cn("mt-2 min-h-8 w-full cursor-pointer rounded border px-2 text-xs transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", owned ? "border-attention/40 bg-attention/10 text-attention-foreground" : "border-border text-muted-foreground hover:bg-muted")}>{owned ? "Dimiliki" : "Tandai dimiliki"}</button> : null}
                      </div>
                    );
                  })}
                </div>
              </div>
            ) : null}

            {step === 2 ? (
              <div>
                <h2 className="text-lg font-semibold">Pilih jendela analisis</h2>
                <p className="mt-1 text-sm text-muted-foreground">Horizon mengubah prioritas event dan panjang baseline yang dijelaskan, bukan rumus inti.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {horizons.map((item) => <button key={item.id} onClick={() => setHorizon(item.id)} aria-pressed={profile.config.horizon === item.id} className={cn("min-h-28 cursor-pointer rounded-xl border p-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", profile.config.horizon === item.id ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted")}><span className="block font-semibold">{item.label}</span><span className="mt-2 block font-mono text-sm text-primary">{item.detail}</span></button>)}
                </div>
              </div>
            ) : null}

            {step === 3 ? (
              <div className="grid gap-8 md:grid-cols-2">
                <div>
                  <h2 className="text-lg font-semibold">Urutkan empat pilar</h2>
                  <p className="mt-1 text-sm text-muted-foreground">Urutan mengatur penyajian. Verdict tetap dihitung dari bukti yang sama.</p>
                  <div className="mt-4 space-y-2">
                    {profile.config.pillarOrder.map((pillar, index) => <div key={pillar} className="flex items-center gap-2 rounded-lg border border-border bg-background p-2"><span className="grid size-7 place-items-center rounded bg-muted font-mono text-xs">{index + 1}</span><span className="flex-1 text-sm font-medium">{pillarLabels[pillar]}</span><Button variant="ghost" size="icon" disabled={index === 0} onClick={() => movePillar(index, -1)} aria-label={`Naikkan ${pillarLabels[pillar]}`}><ArrowUp aria-hidden="true" className="size-4" /></Button><Button variant="ghost" size="icon" disabled={index === 3} onClick={() => movePillar(index, 1)} aria-label={`Turunkan ${pillarLabels[pillar]}`}><ArrowDown aria-hidden="true" className="size-4" /></Button></div>)}
                  </div>
                </div>
                <div>
                  <h2 className="text-lg font-semibold">Kedalaman jawaban</h2>
                  <div className="mt-4 space-y-2">
                    {depths.map((item) => <button key={item.id} onClick={() => setDepth(item.id)} aria-pressed={profile.config.depth === item.id} className={cn("min-h-16 w-full cursor-pointer rounded-lg border px-4 text-left transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", profile.config.depth === item.id ? "border-primary bg-primary/10" : "border-border bg-background hover:bg-muted")}><span className="block text-sm font-semibold">{item.label}</span><span className="block text-xs text-muted-foreground">{item.detail}</span></button>)}
                  </div>
                </div>
              </div>
            ) : null}

            {step === 4 ? (
              <div>
                <h2 className="text-lg font-semibold">Batas agent</h2>
                <p className="mt-1 text-sm text-muted-foreground">Tiga aturan ini selalu aktif dan tidak dapat dilatih ulang oleh feedback.</p>
                <div className="mt-6 grid gap-3 sm:grid-cols-3">
                  {[
                    { icon: Database, title: "Fakta tetap", text: "Feedback tidak mengubah angka, sumber, rumus, ambang, atau status konflik." },
                    { icon: Eye, title: "Memori terlihat", text: "Preferensi yang dipelajari dapat dilihat, dimatikan, atau dihapus." },
                    { icon: RotateCcw, title: "Fail closed", text: "Pertanyaan di luar fixture berhenti pada bukti yang belum cukup." },
                  ].map((item) => <div key={item.title} className="rounded-xl border border-border bg-background p-4"><item.icon aria-hidden="true" className="size-5 text-primary" /><h3 className="mt-4 font-semibold">{item.title}</h3><p className="mt-2 text-sm leading-6 text-muted-foreground">{item.text}</p></div>)}
                </div>
                <div className="mt-6 rounded-xl border border-attention/30 bg-attention/8 p-4 text-sm leading-6 text-foreground"><SlidersHorizontal aria-hidden="true" className="mr-2 inline size-4 text-attention" />Agent akan memakai profil <strong>{profile.name}</strong>, horizon <strong>{horizons.find((item) => item.id === profile.config.horizon)?.detail}</strong>, dan kedalaman <strong>{depths.find((item) => item.id === profile.config.depth)?.label}</strong>.</div>
              </div>
            ) : null}
          </div>

          <div className="flex items-center justify-between border-t border-border px-5 py-4 sm:px-6">
            <Button variant="ghost" onClick={() => setStep((value) => Math.max(1, value - 1))} disabled={step === 1}><ArrowLeft aria-hidden="true" className="size-4" />Kembali</Button>
            {step < 4 ? <Button onClick={() => setStep((value) => Math.min(4, value + 1))}>Lanjut<ArrowRight aria-hidden="true" className="size-4" /></Button> : <Button onClick={completeOnboarding}>Masuk ke Today<Check aria-hidden="true" className="size-4" /></Button>}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
