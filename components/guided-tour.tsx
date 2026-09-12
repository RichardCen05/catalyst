"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { ArrowRight, Check, Compass } from "lucide-react";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Mulai dari perubahan", body: "Today menunjukkan perubahan watchlist yang perlu diselidiki—bukan semua data pasar.", href: "/", destination: "Today" },
  { title: "Uji satu Research Case", body: "Buka ANTM untuk melihat thesis, empat pemeriksaan bukti, kontradiksi, dan pertanyaan yang belum terjawab.", href: "/cases/ANTM", destination: "Research Case · ANTM" },
  { title: "Uji jalur sebab-akibat", body: "Impact memperlihatkan sumber → mekanisme → emiten, termasuk bukti yang dapat membatalkan hubungan.", href: "/impact?case=ANTM", destination: "Impact · ANTM" },
  { title: "Tanya dan koreksi agent", body: "Copilot melanjutkan konteks case. Insight Anda disimpan sebagai hipotesis terbuka sampai diverifikasi.", href: "/copilot", destination: "Copilot" },
] as const;

export function GuidedTour() {
  const tourOpen = useCatalystStore((state) => state.tourOpen);
  if (!tourOpen) return null;
  return <GuidedTourContent />;
}

function GuidedTourContent() {
  const router = useRouter();
  const finishTour = useCatalystStore((state) => state.finishTour);
  const [step, setStep] = useState(0);
  const current = steps[step];

  const moveForward = () => {
    const next = step + 1;
    setStep(next);
    router.push(steps[next].href);
  };

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-live="polite">
      <div className="absolute inset-0 bg-background/70 backdrop-blur-[1px]" />
      <section role="dialog" aria-modal="true" aria-labelledby="guided-tour-title" className="pointer-events-auto absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-[12px] border border-border bg-surface p-4 shadow-2xl sm:bottom-6 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[6px] bg-brand text-white"><Compass aria-hidden="true" className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <p className="meta text-primary">Panduan inti · {step + 1}/{steps.length}</p>
            <h2 id="guided-tour-title" className="editorial mt-2 text-xl">{current.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.body}</p>
            <p className="mt-3 font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground">Sedang dilihat · {current.destination}</p>
          </div>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <Button variant="ghost" size="sm" onClick={finishTour}>Lewati tur</Button>
          <div className="ml-auto">
            {step < steps.length - 1 ? <Button size="sm" onClick={moveForward}>Lanjut<ArrowRight aria-hidden="true" className="size-4" /></Button> : <Button size="sm" onClick={finishTour}>Selesai<Check aria-hidden="true" className="size-4" /></Button>}
          </div>
        </div>
      </section>
    </div>
  );
}
