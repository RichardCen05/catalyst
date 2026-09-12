"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, Compass, LocateFixed, MousePointerClick } from "lucide-react";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

interface TourStep {
  id: string;
  title: string;
  body: string;
  action: string;
  outcome: string;
  href: string;
  selector: string;
  actionSelector: string;
  destination: string;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

const steps: TourStep[] = [
  {
    id: "today",
    title: "Temukan perubahan material",
    body: "Today menyaring watchlist menjadi perubahan yang layak diselidiki. Anda tidak perlu membaca seluruh pasar.",
    action: "Klik case ANTM yang disorot.",
    outcome: "Anda akan membuka satu ruang investigasi, bukan halaman profil saham biasa.",
    href: "/",
    selector: '[data-tour-action="open-antm-case"]',
    actionSelector: '[data-tour-action="open-antm-case"]',
    destination: "Today",
  },
  {
    id: "mandate",
    title: "Tentukan pertanyaan riset",
    body: "Mandate mengontrol fokus agent. Mengubah kalimat ini akan menyusun ulang hipotesis, sumber, observable, dan clarification gate.",
    action: "Edit bila perlu, lalu klik “Simpan dan susun ulang plan”.",
    outcome: "Angka dasar tidak berubah; yang berubah adalah rencana pengujiannya.",
    href: "/cases/ANTM",
    selector: '[data-tour="research-mandate"]',
    actionSelector: '[data-tour-action="save-mandate"]',
    destination: "Research Case · ANTM",
  },
  {
    id: "evidence",
    title: "Buka empat pemeriksaan",
    body: "Evidence memisahkan Konsentrasi, Volume, Momentum, dan Katalis agar tidak dilebur menjadi satu skor yang menyesatkan.",
    action: "Klik tab “Evidence 4”.",
    outcome: "Setiap pilar menunjukkan klaim, bukti pendukung, bukti penyangkal, dan kondisi tidak cukup.",
    href: "/cases/ANTM",
    selector: '[data-tour-action="open-evidence"]',
    actionSelector: '[data-tour-action="open-evidence"]',
    destination: "Research Case · Evidence",
  },
  {
    id: "calculation",
    title: "Audit rumus dan sumber",
    body: "Tidak ada angka yang harus diterima begitu saja. Formula, substitusi fixture, hasil deterministik, dan field sumber tersedia di dalam pilar.",
    action: "Buka “Perhitungan dan input”.",
    outcome: "Bagian ini menunjukkan bagaimana agent sampai pada status bukti.",
    href: "/cases/ANTM?tab=evidence",
    selector: '[data-tour-action="toggle-calculation"]',
    actionSelector: '[data-tour-action="toggle-calculation"]',
    destination: "Evidence · calculation",
  },
  {
    id: "causal",
    title: "Lacak jalur sebab-akibat",
    body: "Causal Impact menguji apakah sebuah input benar-benar mencapai observable perusahaan dan outcome bisnis.",
    action: "Klik “Causal chain”.",
    outcome: "Anda akan melihat sumber → mekanisme → emiten → observasi, beserta kondisi pembatalnya.",
    href: "/cases/ANTM?tab=evidence",
    selector: '[data-tour-action="open-impact"]',
    actionSelector: '[data-tour-action="open-impact"]',
    destination: "Research Case · causal entry",
  },
  {
    id: "compete",
    title: "Bandingkan penjelasan",
    body: "Catalyst tidak mengunci satu narasi. Beberapa penyebab bersaing menjelaskan observable yang sama.",
    action: "Pilih penjelasan peringkat 2.",
    outcome: "Bandingkan supporting evidence, counter-evidence, dan discriminator-nya.",
    href: "/impact?case=ANTM",
    selector: '[data-tour-action="competing-hypothesis-2"]',
    actionSelector: '[data-tour-action="competing-hypothesis-2"]',
    destination: "Impact · competing hypotheses",
  },
  {
    id: "copilot",
    title: "Bawa tantangan ke Copilot",
    body: "Copilot menerima ticker, hipotesis terpilih, counter-evidence, dan pertanyaan lanjutan sebagai satu konteks.",
    action: "Klik “Challenge hypothesis”.",
    outcome: "Prompt akan terisi otomatis; Anda dapat mengubahnya sebelum agent memeriksa fixture.",
    href: "/impact?case=ANTM",
    selector: '[data-tour-action="challenge-hypothesis"]',
    actionSelector: '[data-tour-action="challenge-hypothesis"]',
    destination: "Impact → Copilot",
  },
];

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
  const [complete, setComplete] = useState(false);
  const [targetRect, setTargetRect] = useState<TargetRect | null>(null);
  const revealedStep = useRef<string | null>(null);
  const normalizedStart = useRef(false);
  const current = steps[step];

  const advance = useCallback(() => {
    if (step === steps.length - 1) setComplete(true);
    else setStep((value) => Math.min(value + 1, steps.length - 1));
  }, [step]);

  useEffect(() => {
    if (normalizedStart.current) return;
    normalizedStart.current = true;
    if (pathname !== "/") router.replace("/");
  }, [pathname, router]);

  useEffect(() => {
    const onAction = (event: MouseEvent) => {
      const origin = event.target;
      if (!(origin instanceof Element) || !origin.closest(current.actionSelector)) return;
      window.setTimeout(advance, 180);
    };
    document.addEventListener("click", onAction, true);
    return () => document.removeEventListener("click", onAction, true);
  }, [advance, current.actionSelector]);

  useEffect(() => {
    if (complete) return;
    let frame = 0;
    let revealTimer = 0;

    const measure = () => {
      window.cancelAnimationFrame(frame);
      frame = window.requestAnimationFrame(() => {
        const target = document.querySelector<HTMLElement>(current.selector);
        if (!target) {
          setTargetRect(null);
          return;
        }
        if (revealedStep.current !== current.id) {
          revealedStep.current = current.id;
          target.scrollIntoView({ block: window.innerWidth < 640 ? "start" : "center", behavior: "auto" });
          if (window.innerWidth < 640) window.scrollBy({ top: -88, behavior: "auto" });
          revealTimer = window.setTimeout(measure, 30);
        }
        const rect = target.getBoundingClientRect();
        setTargetRect({ top: rect.top - 6, left: rect.left - 6, width: rect.width + 12, height: rect.height + 12 });
      });
    };

    measure();
    const observer = new MutationObserver(measure);
    observer.observe(document.body, { childList: true, subtree: true });
    window.addEventListener("resize", measure);
    window.addEventListener("scroll", measure, true);
    return () => {
      observer.disconnect();
      window.cancelAnimationFrame(frame);
      window.clearTimeout(revealTimer);
      window.removeEventListener("resize", measure);
      window.removeEventListener("scroll", measure, true);
    };
  }, [complete, current.id, current.selector, pathname]);

  const desktopPosition = useMemo(() => {
    if (!targetRect || typeof window === "undefined" || window.innerWidth < 768) return undefined;
    const width = 390;
    const height = 270;
    const left = Math.max(16, Math.min(targetRect.left, window.innerWidth - width - 16));
    const top = targetRect.top + targetRect.height + height + 16 < window.innerHeight
      ? targetRect.top + targetRect.height + 12
      : Math.max(48, targetRect.top - height - 12);
    return { left, top, width };
  }, [targetRect]);

  if (complete) return (
    <div className="pointer-events-none fixed inset-0 z-[120] bg-background/70" aria-live="polite">
      <section role="dialog" aria-labelledby="guided-tour-complete-title" className="pointer-events-auto absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-[12px] border border-primary/35 bg-surface p-5 shadow-2xl sm:bottom-6">
        <span className="grid size-10 place-items-center rounded-[7px] bg-positive/10 text-positive"><Check aria-hidden="true" className="size-5" /></span>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Guided flow complete</p>
        <h2 id="guided-tour-complete-title" className="editorial mt-1 text-2xl">Alur inti selesai</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Anda sudah mengubah pertanyaan riset, memeriksa perhitungan, membandingkan penyebab, lalu membawa pertanyaan dan konteks hipotesis ke Copilot.</p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Prompt sudah terisi dan masih dapat diedit.</p><Button size="sm" onClick={finishTour}>Mulai bertanya<ArrowRight aria-hidden="true" className="size-4" /></Button></div>
      </section>
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-live="polite">
      {targetRect ? <div data-tour-spotlight className="fixed rounded-[10px] border-2 border-primary bg-primary/5 shadow-[0_0_0_9999px_rgba(8,5,7,0.76)] transition-[top,left,width,height] duration-300 motion-reduce:transition-none" style={targetRect} /> : <div className="absolute inset-0 bg-background/72" />}
      <section role="dialog" aria-modal="false" aria-labelledby="guided-tour-title" className="pointer-events-none absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-h-[46dvh] max-w-lg overflow-y-auto rounded-[12px] border border-border bg-surface p-4 shadow-2xl sm:bottom-6 sm:p-5 md:inset-x-auto md:bottom-auto md:mx-0" style={desktopPosition}>
        <div className="flex items-start gap-3">
          <span className="grid size-9 shrink-0 place-items-center rounded-[6px] bg-brand text-white"><Compass aria-hidden="true" className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Langkah {step + 1}/{steps.length}</p><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{current.destination}</p></div>
            <h2 id="guided-tour-title" className="editorial mt-2 text-xl">{current.title}</h2>
            <p className="mt-2 text-sm leading-6 text-muted-foreground">{current.body}</p>
          </div>
        </div>

        <div className="mt-4 rounded-[8px] border border-primary/30 bg-primary/8 p-3">
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground"><MousePointerClick aria-hidden="true" className="size-4 text-primary" />Lakukan sekarang</p>
          <p className="mt-1.5 text-sm leading-5">{current.action}</p>
          <p className="mt-2 text-xs leading-5 text-muted-foreground">{current.outcome}</p>
        </div>

        <div className="mt-4 grid grid-cols-7 gap-1" aria-label={`Langkah ${step + 1} dari ${steps.length}`}>{steps.map((item, index) => <span key={item.id} className={`h-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
        <div className="mt-4 flex items-center gap-3 border-t border-border pt-4">
          <Button variant="ghost" size="sm" className="pointer-events-auto" onClick={finishTour}>Lewati tur</Button>
          {!targetRect ? <Button variant="secondary" size="sm" className="pointer-events-auto ml-auto" onClick={() => router.push(current.href)}><LocateFixed aria-hidden="true" className="size-4" />Buka lokasi</Button> : <p className="ml-auto font-mono text-[9px] uppercase tracking-wider text-muted-foreground">Aksi yang disorot akan melanjutkan tur</p>}
        </div>
      </section>
    </div>
  );
}
