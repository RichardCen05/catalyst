"use client";

import { useEffect, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowLeft, ArrowRight, Check, Compass, X } from "lucide-react";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

const steps = [
  { title: "Mulai dari perubahan", body: "Today hanya menampilkan perubahan watchlist yang layak dibuka sebagai case: apa yang berubah, mengapa, dan apa pembatalnya.", href: "/", target: "today-delta" },
  { title: "Pilih Research Case", body: "Setiap case menyatukan trigger, thesis, prioritas, dan pertanyaan yang masih terbuka.", href: "/cases", target: "research-cases" },
  { title: "Berikan research mandate", body: "Agent memecah mandate, menyusun source plan, menjalankan empat protokol uji, lalu menunggu review Anda.", href: "/cases/ANTM", target: "research-case" },
  { title: "Uji jalur sebab-akibat", body: "Impact membedakan sumber, mekanisme, emiten, dan observasi. Pilih panah untuk memeriksa exposure dan kondisi pembatalnya.", href: "/impact?case=ANTM", target: "causal-chain" },
  { title: "Lanjutkan case di Copilot", body: "Copilot memakai ticker dan catatan case yang sama. Koreksi Anda tetap menjadi hipotesis sampai sumber memverifikasinya.", href: "/copilot", target: "copilot-workspace" },
] as const;

export function GuidedTour() {
  const tourOpen = useCatalystStore((state) => state.tourOpen);
  if (!tourOpen) return null;
  return <GuidedTourContent />;
}

function GuidedTourContent() {
  const router = useRouter();
  const pathname = usePathname();
  const finishTour = useCatalystStore((state) => state.finishTour);
  const [step, setStep] = useState(0);
  const current = steps[step];

  useEffect(() => {
    router.push(steps[0].href);
  }, [router]);

  useEffect(() => {
    let highlighted: Element | null = null;
    const timer = window.setTimeout(() => {
      highlighted = document.querySelector(`[data-tour="${current.target}"]`);
      highlighted?.classList.add("tour-highlight");
      highlighted?.scrollIntoView({ behavior: "smooth", block: "center" });
    }, 220);
    return () => {
      window.clearTimeout(timer);
      highlighted?.classList.remove("tour-highlight");
    };
  }, [current.target, pathname]);
  const move = (next: number) => { setStep(next); router.push(steps[next].href); };

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-live="polite">
      <div className="absolute inset-0 bg-background/72 backdrop-blur-[1px]" />
      <section role="dialog" aria-modal="true" aria-labelledby="guided-tour-title" className="pointer-events-auto absolute inset-x-3 bottom-4 mx-auto max-w-xl rounded-2xl border border-primary/45 bg-surface p-4 shadow-2xl sm:bottom-6 sm:p-5">
        <div className="flex items-start gap-3">
          <span className="grid size-10 shrink-0 place-items-center rounded-xl bg-primary text-primary-foreground"><Compass aria-hidden="true" className="size-5" /></span>
          <div className="min-w-0 flex-1"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Tur produk · {step + 1}/{steps.length}</p><h2 id="guided-tour-title" className="mt-1 text-lg font-semibold">{current.title}</h2><p className="mt-2 text-sm leading-6 text-muted-foreground">{current.body}</p></div>
          <Button variant="ghost" size="icon" onClick={finishTour} aria-label="Tutup tur"><X aria-hidden="true" className="size-4" /></Button>
        </div>
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <div className="flex gap-1.5" aria-hidden="true">{steps.map((item, index) => <span key={item.title} className={`h-1.5 w-6 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
          <div className="ml-auto flex gap-2">
            {step > 0 ? <Button variant="ghost" size="sm" onClick={() => move(step - 1)}><ArrowLeft aria-hidden="true" className="size-4" />Kembali</Button> : <Button variant="ghost" size="sm" onClick={finishTour}>Lewati tur</Button>}
            {step < steps.length - 1 ? <Button size="sm" onClick={() => move(step + 1)}>Berikutnya<ArrowRight aria-hidden="true" className="size-4" /></Button> : <Button size="sm" onClick={finishTour}>Selesai<Check aria-hidden="true" className="size-4" /></Button>}
          </div>
        </div>
      </section>
    </div>
  );
}
