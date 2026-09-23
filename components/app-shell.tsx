"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname, useSearchParams } from "next/navigation";
import { useTheme } from "next-themes";
import { BarChart3, BrainCircuit, BriefcaseBusiness, Clock, GitBranch, Menu, Moon, Radar, Sun, X } from "lucide-react";
import { Suspense, useEffect, useRef, useState } from "react";
import { CatalystLogo } from "@/components/logo";
import { CommandPalette } from "@/components/command-palette";
import { Copilot } from "@/components/copilot";
import { CopilotLauncher } from "@/components/copilot-launcher";
import { Button } from "@/components/ui/button";
import { SettingsDrawer } from "@/components/settings-drawer";
import { useCatalystStore } from "@/lib/store";
import { useCopilotSession } from "@/lib/copilot-session";
import { symbolFromRoute } from "@/lib/agent/route-context";
import { DATA_AS_OF } from "@/lib/data/fixtures";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Dashboard", icon: BarChart3 },
  { href: "/cases", label: "Riset & Analisis", icon: BriefcaseBusiness },
  { href: "/impact", label: "Sebab akibat", icon: GitBranch },
  { href: "/pantau", label: "Pantau", icon: Radar },
  { href: "/ai-learning", label: "AI Learning", icon: BrainCircuit },
];

/** Writes the case the current URL is about into the assistant session.
 *  Renders nothing, and sits behind its own Suspense boundary: reading search
 *  params in the shell would push every route's tree to client rendering. */
function RouteContextProbe() {
  const pathname = usePathname();
  const searchParams = useSearchParams();
  const setRouteSymbol = useCopilotSession((state) => state.setRouteSymbol);
  useEffect(() => {
    setRouteSymbol(symbolFromRoute(pathname, searchParams) ?? null);
  }, [pathname, searchParams, setRouteSymbol]);
  return null;
}

const OnboardingWizard = dynamic(() => import("@/components/onboarding-wizard").then((mod) => mod.OnboardingWizard), { ssr: false });
const GuidedTour = dynamic(() => import("@/components/guided-tour").then((mod) => mod.GuidedTour), { ssr: false });

/** The date the figures close on. The figures are session closes, not an
 *  intraday feed, so the date travels with every page: it sits at the foot of
 *  the sidebar (and under the mobile header) instead of a banner across the
 *  top that every screen had to scroll past. */
function recordDate(): string {
  return new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric" }).format(new Date(DATA_AS_OF));
}

function DataStamp() {
  return (
    <div className="rounded-lg border border-border bg-background px-3 py-2.5">
      <p className="flex items-center gap-1.5 text-xs font-semibold text-foreground"><Clock aria-hidden="true" className="size-3" />Data {recordDate()}</p>
      <p className="mt-0.5 text-xs text-subtle-foreground">Penutupan sesi, diperbarui tiap hari bursa</p>
    </div>
  );
}

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const copilotOpen = useCatalystStore((state) => state.copilotOpen);
  const copilotPage = pathname.startsWith("/copilot");
  const mobileNavItems = navItems;
  const copilotTrigger = useRef<HTMLButtonElement>(null);
  const wasOpen = useRef(false);

  // Closing the panel unmounts it, so focus would land on <body>. Send it back
  // to the control that opened it, once the button has remounted.
  useEffect(() => {
    if (wasOpen.current && !copilotOpen) copilotTrigger.current?.focus();
    wasOpen.current = copilotOpen;
  }, [copilotOpen]);

  // Below xl the panel covers the page. Without this the page behind it kept
  // scrolling under the reader's finger and the panel lost its place.
  useEffect(() => {
    if (!copilotOpen || copilotPage || !window.matchMedia("(max-width: 1279px)").matches) return;
    const previous = document.body.style.overflow;
    document.body.style.overflow = "hidden";
    return () => { document.body.style.overflow = previous; };
  }, [copilotOpen, copilotPage]);

  const nav = (onNavigate?: () => void) => <>
    {navItems.map((item) => {
      const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("flex min-h-10 cursor-pointer items-center gap-2.5 rounded-lg px-3 text-sm font-medium transition-[background-color,color,box-shadow] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-muted font-semibold text-foreground" : "text-muted-foreground hover:text-foreground hover:shadow-[inset_0_0_0_1px_var(--border)]")}><item.icon aria-hidden="true" className="size-4" /><span>{item.label}</span></Link>;
    })}
  </>;

  return (
    <div className="relative min-h-dvh bg-background">
      <a href="#main-content" className="skip-link">Lewati navigasi</a>
      <div className="grid min-h-dvh xl:grid-cols-[240px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-dvh flex-col gap-5 border-r border-border bg-surface px-3 py-5 xl:flex">
          <Link href="/" className="flex min-h-10 items-center gap-2.5 rounded-lg px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CatalystLogo className="size-7" /><div><span className="block text-base font-semibold leading-5 text-foreground">Catalyst</span><span className="block text-xs text-subtle-foreground">Pemeriksa perubahan</span></div></Link>
          <CommandPalette />
          <nav aria-label="Navigasi utama" className="space-y-0.5">{nav()}</nav>
          <div className="mt-auto space-y-3">
            <DataStamp />
            <SettingsDrawer />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex min-h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5 xl:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileNav(true)} aria-label="Buka navigasi"><Menu aria-hidden="true" className="size-5" /></Button>
            <Link href="/" className="flex min-w-0 items-center gap-2.5"><CatalystLogo className="size-7" /><span className="editorial text-base text-foreground">Catalyst</span></Link>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Ganti tema"><Sun aria-hidden="true" className="size-4 dark:hidden" /><Moon aria-hidden="true" className="hidden size-4 dark:block" /></Button>
              <SettingsDrawer compact />
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="rise-in min-w-0 px-4 pb-32 pt-6 focus:outline-none sm:px-7 sm:pt-8 lg:px-12 lg:pt-10 xl:pb-16">{children}</main>
          <nav aria-label="Navigasi mobile" className="fixed inset-x-0 bottom-0 z-40 flex gap-1 overflow-x-auto border-t border-border bg-surface/98 px-2 pb-[env(safe-area-inset-bottom)] xl:hidden">
            {mobileNavItems.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-14 min-w-16 flex-1 cursor-pointer flex-col items-center justify-center gap-1 rounded-lg px-1 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "text-foreground" : "text-muted-foreground")}>{active ? <span aria-hidden="true" className="absolute top-0 h-[2px] w-6 rounded-full bg-brand" /> : null}<item.icon aria-hidden="true" className={cn("size-4", active && "text-primary")} />{item.label}</Link>; })}
          </nav>
        </div>

      </div>

      {mobileNav ? <div className="fixed inset-0 z-100 xl:hidden"><button className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-[2px]" onClick={() => setMobileNav(false)} aria-label="Tutup navigasi" /><aside className="absolute inset-y-0 left-0 w-[min(86vw,300px)] border-r border-border bg-surface p-4 shadow-2xl"><div className="mb-6 flex items-center gap-3"><CatalystLogo /><span className="editorial text-base">Catalyst</span><Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMobileNav(false)} aria-label="Tutup navigasi"><X aria-hidden="true" className="size-4" /></Button></div><nav className="space-y-0.5">{nav(() => setMobileNav(false))}</nav><div className="mt-7 space-y-3"><CommandPalette /><DataStamp /></div></aside></div> : null}
      {!copilotPage && !copilotOpen ? <CopilotLauncher triggerRef={copilotTrigger} /> : null}
      {!copilotPage && copilotOpen ? <div className="fixed inset-0 z-100 bg-surface xl:pointer-events-none xl:bg-transparent"><div className="h-full xl:pointer-events-auto xl:absolute xl:inset-y-4 xl:right-4 xl:w-[390px] xl:overflow-hidden xl:rounded-lg xl:border xl:border-border xl:shadow-2xl"><Copilot dismissible /></div></div> : null}
      <Suspense fallback={null}><RouteContextProbe /></Suspense>
      <OnboardingWizard />
      <GuidedTour />
    </div>
  );
}