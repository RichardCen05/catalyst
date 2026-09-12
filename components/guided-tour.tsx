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
    id: "clarify",
    title: "Pilih outcome yang diuji",
    body: "Mandate awal masih ambigu. Agent berhenti sebelum meranking penyebab dan menawarkan dua interpretasi yang memakai sumber serta observable berbeda.",
    action: "Pilih opsi pertama pada Clarification gate.",
    outcome: "Pilihan Anda membuka hypothesis tree dan source plan yang spesifik pada pricing.",
    href: "/cases/ANTM",
    selector: '[data-tour-action="resolve-clarification"]',
    actionSelector: '[data-tour-action="resolve-clarification"]',
    destination: "Case · clarification",
  },
  {
    id: "market",
    title: "Konfirmasi gerak pasar",
    body: "Market Confirmation menguji apakah perubahan terlihat serempak pada konsentrasi, volume, dan momentum—tanpa melebur ketiganya menjadi skor.",
    action: "Klik tab “Market confirmation”.",
    outcome: "Anda dapat membuka formula, input, bukti pendukung, dan bukti penyangkal tiap pemeriksaan.",
    href: "/cases/ANTM",
    selector: '[data-tour-action="open-market"]',
    actionSelector: '[data-tour-action="open-market"]',
    destination: "Case · market confirmation",
  },
  {
    id: "business",
    title: "Uji transmisi ke bisnis",
    body: "Gerak pasar belum cukup. Business Transmission memeriksa katalis, exposure perusahaan, dan observable finansial tempat dampak seharusnya muncul.",
    action: "Klik tab “Business transmission”.",
    outcome: "Jalur wajib berakhir pada volume, pricing, margin, cash flow, balance sheet, atau valuation implication.",
    href: "/cases/ANTM?tab=market",
    selector: '[data-tour-action="open-business"]',
    actionSelector: '[data-tour-action="open-business"]',
    destination: "Case · business transmission",
  },
  {
    id: "hypotheses",
    title: "Buka hipotesis yang bersaing",
    body: "Catalyst tidak mengunci satu narasi. Workspace ini membandingkan beberapa penyebab yang berusaha menjelaskan observable yang sama.",
    action: "Klik tab “Hypotheses”.",
    outcome: "Anda akan melihat ranking, counter-evidence, discriminator, dan causal chain dalam case yang sama.",
    href: "/cases/ANTM?tab=business",
    selector: '[data-tour-action="open-hypotheses"]',
    actionSelector: '[data-tour-action="open-hypotheses"]',
    destination: "Case · competing hypotheses",
  },
  {
    id: "compete",
    title: "Bandingkan penjelasan",
    body: "Catalyst tidak mengunci satu narasi. Beberapa penyebab bersaing menjelaskan observable yang sama.",
    action: "Pilih penjelasan peringkat 2.",
    outcome: "Bandingkan supporting evidence, counter-evidence, dan discriminator-nya.",
    href: "/cases/ANTM?tab=hypotheses",
    selector: '[data-tour-action="competing-hypothesis-2"]',
    actionSelector: '[data-tour-action="competing-hypothesis-2"]',
    destination: "Case · competing hypotheses",
  },
  {
    id: "copilot",
    title: "Bawa tantangan ke Copilot",
    body: "Copilot menerima ticker, hipotesis terpilih, counter-evidence, dan pertanyaan lanjutan sebagai satu konteks.",
    action: "Klik “Challenge hypothesis”.",
    outcome: "Prompt akan terisi otomatis; Anda dapat mengubahnya sebelum agent memeriksa fixture.",
    href: "/cases/ANTM?tab=hypotheses",
    selector: '[data-tour-action="challenge-hypothesis"]',
    actionSelector: '[data-tour-action="challenge-hypothesis"]',
    destination: "Hypothesis → Copilot",
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
  const [coachSize, setCoachSize] = useState({ width: 400, height: 300 });
  const coachRef = useRef<HTMLElement | null>(null);
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
    const previousPaddingBottom = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "50vh";
    return () => {
      document.body.style.paddingBottom = previousPaddingBottom;
    };
  }, []);

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

  useEffect(() => {
    const coach = coachRef.current;
    if (!coach) return;
    const measure = () => {
      const rect = coach.getBoundingClientRect();
      setCoachSize((previous) => {
        const next = { width: Math.ceil(rect.width), height: Math.ceil(rect.height) };
        return previous.width === next.width && previous.height === next.height ? previous : next;
      });
    };
    measure();
    const observer = new ResizeObserver(measure);
    observer.observe(coach);
    return () => observer.disconnect();
  }, [current.id]);

  const desktopPosition = useMemo(() => {
    if (!targetRect || typeof window === "undefined" || window.innerWidth < 768) return undefined;
    const margin = 8;
    const gap = 12;
    const width = Math.min(400, window.innerWidth - margin * 2);
    const height = coachSize.height;
    const targetBottom = targetRect.top + targetRect.height;
    const spaceBelow = window.innerHeight - targetBottom - margin;
    const spaceAbove = targetRect.top - margin;
    const preferredLeft = targetRect.left + targetRect.width / 2 - width / 2;
    const left = Math.max(margin, Math.min(preferredLeft, window.innerWidth - width - margin));

    let top: number;
    if (spaceBelow >= height + gap) top = targetBottom + gap;
    else if (spaceAbove >= height + gap) top = targetRect.top - height - gap;
    else {
      const belowTop = Math.min(targetBottom + gap, window.innerHeight - height - margin);
      const aboveTop = Math.max(margin, targetRect.top - height - gap);
      top = spaceBelow >= spaceAbove ? belowTop : aboveTop;
    }
    return { left, top, width };
  }, [coachSize.height, targetRect]);

  if (complete) return (
    <div className="pointer-events-none fixed inset-0 z-[120] bg-background/70" aria-live="polite">
      <section role="dialog" aria-labelledby="guided-tour-complete-title" className="pointer-events-auto absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-[12px] border border-primary/35 bg-surface p-5 shadow-2xl sm:bottom-6">
        <span className="grid size-10 place-items-center rounded-[7px] bg-positive/10 text-positive"><Check aria-hidden="true" className="size-5" /></span>
        <p className="mt-4 font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Guided flow complete</p>
        <h2 id="guided-tour-complete-title" className="editorial mt-1 text-2xl">Alur inti selesai</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Anda sudah menemukan perubahan material, memperjelas outcome, menguji konfirmasi pasar dan transmisi bisnis, lalu menantang satu hipotesis melalui Copilot.</p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Prompt sudah terisi dan masih dapat diedit.</p><Button size="sm" onClick={finishTour}>Mulai bertanya<ArrowRight aria-hidden="true" className="size-4" /></Button></div>
      </section>
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-live="polite">
      {targetRect ? <div data-tour-spotlight className="fixed rounded-[10px] border-2 border-primary bg-primary/5 shadow-[0_0_0_9999px_rgba(8,5,7,0.76)] transition-[top,left,width,height] duration-300 motion-reduce:transition-none" style={targetRect} /> : <div className="absolute inset-0 bg-background/72" />}
      <section ref={coachRef} data-guided-tour-card role="dialog" aria-modal="false" aria-labelledby="guided-tour-title" className="pointer-events-none absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-h-[56dvh] max-w-lg overflow-y-auto rounded-[12px] border border-border bg-surface p-4 shadow-2xl sm:bottom-6 md:inset-x-auto md:bottom-auto md:mx-0 md:max-h-none md:overflow-visible" style={desktopPosition}>
        <div className="flex items-start gap-3">
          <span className="grid size-8 shrink-0 place-items-center rounded-[6px] bg-brand text-white"><Compass aria-hidden="true" className="size-4" /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="font-mono text-[10px] uppercase tracking-[0.14em] text-primary">Langkah {step + 1}/{steps.length}</p><p className="font-mono text-[9px] uppercase tracking-wider text-muted-foreground">{current.destination}</p></div>
            <h2 id="guided-tour-title" className="editorial mt-1.5 text-lg">{current.title}</h2>
            <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{current.body}</p>
          </div>
        </div>

        <div className="mt-3 rounded-[8px] border border-primary/30 bg-primary/8 p-2.5">
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground"><MousePointerClick aria-hidden="true" className="size-4 text-primary" />Lakukan sekarang</p>
          <p className="mt-1 text-sm leading-5">{current.action}</p>
          <p className="mt-1 text-[11px] leading-4 text-muted-foreground">{current.outcome}</p>
        </div>

        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
          <div className="grid w-24 shrink-0 grid-cols-7 gap-1" aria-label={`Langkah ${step + 1} dari ${steps.length}`}>{steps.map((item, index) => <span key={item.id} className={`h-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
          <Button variant="ghost" size="sm" className="pointer-events-auto ml-auto" onClick={finishTour}>Lewati tur</Button>
          {!targetRect ? <Button variant="secondary" size="sm" className="pointer-events-auto" onClick={() => router.push(current.href)}><LocateFixed aria-hidden="true" className="size-4" />Buka lokasi</Button> : <p className="hidden font-mono text-[9px] uppercase tracking-wider text-muted-foreground lg:block">Klik sorotan untuk lanjut</p>}
        </div>
      </section>
    </div>
  );
}
