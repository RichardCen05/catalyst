"use client";

import { useCallback, useEffect, useMemo, useRef, useState } from "react";
import { usePathname, useRouter } from "next/navigation";
import { ArrowRight, Check, Compass, LocateFixed, MousePointerClick } from "lucide-react";
import { primarySymbol } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

interface TourStep {
  id: string;
  /** A step that reads on its own from the highlight it points at carries no
   *  heading or lead — the card then names itself by its action line. */
  title?: string;
  body?: string;
  /** A step whose highlight already states what to do carries no prompt block. */
  action?: string;
  outcome?: string;
  href: string;
  selector: string;
  /** Omitted on a step that only asks the reader to look: the card then offers
   *  its own continue control instead of waiting for a click on the highlight. */
  actionSelector?: string;
  destination: string;
}

interface TargetRect {
  top: number;
  left: number;
  width: number;
  height: number;
}

/** The tour walks one real recorded case. Which case that is comes from the
 *  registry, never a typed ticker — a recording refresh moves the tour with
 *  the data instead of pointing it at a symbol the app no longer covers. */
const steps: TourStep[] = [
  {
    id: "today",
    action: `Pilih kasus ${primarySymbol} yang disorot.`,
    outcome: "Anda melihat apa yang berubah, pembandingnya, dan alasan kasus ini penting.",
    href: "/",
    selector: '[data-tour-action="open-case"]',
    actionSelector: '[data-tour-action="open-case"]',
    destination: "Dashboard",
  },
  {
    id: "impact",
    title: "Lacak penyebab dan dampaknya",
    body: "Kasus sudah merangkum bukti pasar dan dampak bisnis. Sekarang lihat jalur yang menghubungkannya.",
    action: "Pilih Buka sebab akibat.",
    outcome: "Anda melihat penyebab yang bersaing, jalur ke emiten, dan kondisi pembatalnya.",
    href: `/cases/${primarySymbol}`,
    selector: '[data-tour-action="open-impact"]',
    actionSelector: '[data-tour-action="open-impact"]',
    destination: "Kasus",
  },
  {
    id: "chain",
    title: "Lihat rantainya lebih dulu",
    body: "Peta ini menyusun pemicu, jalur perantara, dan emiten dalam satu rantai. Baca dulu bentuknya sebelum menentukan tindakan.",
    action: "Telusuri rantai dari pemicu sampai emiten.",
    outcome: "Anda tahu lewat jalur mana pemicu sampai ke emiten sebelum menilai kasusnya.",
    href: `/impact?company=${primarySymbol}`,
    selector: '[data-tour="causal-chain"]',
    destination: "Sebab akibat",
  },
  {
    id: "action",
    title: "Tentukan tindakan riset",
    body: "Setelah bukti dibaca, Catalyst merangkum apakah kasus perlu dilanjutkan, dipantau, atau dihentikan.",
    action: "Pilih Lihat tindakan riset.",
    outcome: "Ini tindakan riset, bukan saran transaksi.",
    href: `/impact?company=${primarySymbol}`,
    selector: '[data-tour-action="show-next-action"]',
    actionSelector: '[data-tour-action="show-next-action"]',
    destination: "Sebab akibat",
  },
  {
    id: "watch",
    title: "Awasi web setiap hari",
    body: "Regulator, portal pasar, dan cuaca BMKG dibaca terjadwal tiap hari bursa pukul 17.30 WIB. Yang berubah masuk antrean untuk Anda petakan ke emiten.",
    href: "/pantau",
    selector: '[data-tour="review-queue"]',
    actionSelector: '[data-tour="review-queue"]',
    destination: "Pantau",
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
  /** A step with no heading or lead is a single meta line: centre it against the
   *  badge so the header row does not leave the dead space a two-line block fills. */
  const compact = !current.title && !current.body;

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
    if (complete) return;
    const expectedPath = current.href.split("?")[0];
    if (pathname !== expectedPath) router.push(current.href);
  }, [complete, current.href, pathname, router]);

  useEffect(() => {
    const previousPaddingBottom = document.body.style.paddingBottom;
    document.body.style.paddingBottom = "50vh";
    return () => {
      document.body.style.paddingBottom = previousPaddingBottom;
    };
  }, []);

  useEffect(() => {
    const actionSelector = current.actionSelector;
    if (!actionSelector) return;
    const onAction = (event: MouseEvent) => {
      const origin = event.target;
      if (!(origin instanceof Element) || !origin.closest(actionSelector)) return;
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
      <section role="dialog" aria-labelledby="guided-tour-complete-title" className="pointer-events-auto absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-w-lg rounded-lg border border-primary/35 bg-surface p-5 shadow-2xl sm:bottom-6">
        <span className="grid size-10 place-items-center rounded-lg bg-positive/10 text-positive"><Check aria-hidden="true" className="size-5" /></span>
        <p className="mt-4 text-xs text-muted-foreground font-medium">Tur selesai</p>
        <h2 id="guided-tour-complete-title" className="editorial mt-1 text-xl">Ritual harian selesai</h2>
        <p className="mt-2 text-sm leading-6 text-muted-foreground">Anda sudah memilih perubahan, menetapkan pertanyaan, melacak sebab akibat, dan menentukan tindakan riset.</p>
        <div className="mt-4 flex items-center justify-between gap-3 border-t border-border pt-4"><p className="text-xs text-muted-foreground">Ulangi alur ini saat ada perubahan baru.</p><Button size="sm" onClick={finishTour}>Selesai<ArrowRight aria-hidden="true" className="size-4" /></Button></div>
      </section>
    </div>
  );

  return (
    <div className="pointer-events-none fixed inset-0 z-[120]" aria-live="polite">
      {targetRect ? <div data-tour-spotlight className="fixed rounded-lg border-2 border-primary bg-primary/5 shadow-[0_0_0_9999px_rgba(8,5,7,0.76)] transition-[top,left,width,height] duration-300 motion-reduce:transition-none" style={targetRect} /> : <div className="absolute inset-0 bg-background/72" />}
      <section ref={coachRef} data-guided-tour-card role="dialog" aria-modal="false" aria-labelledby={current.title ? "guided-tour-title" : "guided-tour-action"} className="pointer-events-none absolute inset-x-3 bottom-[calc(4.5rem+env(safe-area-inset-bottom))] mx-auto max-h-[56dvh] max-w-lg overflow-y-auto rounded-lg border border-border bg-surface p-4 shadow-2xl sm:bottom-6 md:inset-x-auto md:bottom-auto md:mx-0 md:max-h-none md:overflow-visible" style={desktopPosition}>
        <div className={`flex gap-3 ${compact ? "items-center" : "items-start"}`}>
          <span className={`grid shrink-0 place-items-center rounded-lg bg-brand text-white ${compact ? "size-7" : "size-8"}`}><Compass aria-hidden="true" className={compact ? "size-3.5" : "size-4"} /></span>
          <div className="min-w-0 flex-1">
            <div className="flex flex-wrap items-center justify-between gap-2"><p className="text-xs text-muted-foreground font-medium">Langkah {step + 1}/{steps.length}</p><p className=" text-xs text-muted-foreground">{current.destination}</p></div>
            {current.title ? <h2 id="guided-tour-title" className="editorial mt-1.5 text-lg">{current.title}</h2> : null}
            {current.body ? <p className="mt-1.5 text-xs leading-5 text-muted-foreground">{current.body}</p> : null}
          </div>
        </div>

        {current.action ? <div className={`rounded-lg border border-primary/30 bg-primary/8 p-2.5 ${compact ? "mt-2.5" : "mt-3"}`}>
          <p className="flex items-center gap-2 text-xs font-semibold text-foreground"><MousePointerClick aria-hidden="true" className="size-4 text-primary" />Lakukan sekarang</p>
          <p id="guided-tour-action" className="mt-1 text-sm leading-5">{current.action}</p>
          {current.outcome ? <p className="mt-1 text-xs leading-4 text-muted-foreground">{current.outcome}</p> : null}
        </div> : null}

        <div className="mt-3 flex items-center gap-3 border-t border-border pt-3">
          <div role="img" className="grid w-24 shrink-0 gap-1" style={{ gridTemplateColumns: `repeat(${steps.length}, minmax(0, 1fr))` }} aria-label={`Langkah ${step + 1} dari ${steps.length}`}>{steps.map((item, index) => <span key={item.id} className={`h-1 rounded-full ${index <= step ? "bg-primary" : "bg-muted"}`} />)}</div>
          <Button variant="ghost" size="sm" className="pointer-events-auto ml-auto" onClick={finishTour}>Lewati tur</Button>
          {!targetRect ? <Button variant="secondary" size="sm" className="pointer-events-auto" onClick={() => router.push(current.href)}><LocateFixed aria-hidden="true" className="size-4" />Buka langkah</Button> : current.actionSelector ? <p className="hidden text-xs text-muted-foreground lg:block">Pilih sorotan untuk lanjut</p> : <Button size="sm" className="pointer-events-auto" onClick={advance}>Lanjut<ArrowRight aria-hidden="true" className="size-4" /></Button>}
        </div>
      </section>
    </div>
  );
}
