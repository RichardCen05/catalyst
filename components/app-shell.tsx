"use client";

import Link from "next/link";
import dynamic from "next/dynamic";
import { usePathname } from "next/navigation";
import { useTheme } from "next-themes";
import { BarChart3, Bot, BriefcaseBusiness, FlaskConical, GitBranch, Menu, Moon, Sun, X } from "lucide-react";
import { useState } from "react";
import { CatalystLogo } from "@/components/logo";
import { CommandPalette } from "@/components/command-palette";
import { Copilot } from "@/components/copilot";
import { Button } from "@/components/ui/button";
import { SettingsDrawer } from "@/components/settings-drawer";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode } from "@/lib/types";
import { cn } from "@/lib/utils";

const navItems = [
  { href: "/", label: "Hari ini", icon: BarChart3 },
  { href: "/cases", label: "Kasus", icon: BriefcaseBusiness },
  { href: "/impact", label: "Sebab akibat", icon: GitBranch },
  { href: "/copilot", label: "Asisten", icon: Bot },
];

const OnboardingWizard = dynamic(() => import("@/components/onboarding-wizard").then((mod) => mod.OnboardingWizard), { ssr: false });
const GuidedTour = dynamic(() => import("@/components/guided-tour").then((mod) => mod.GuidedTour), { ssr: false });

export function AppShell({ children }: { children: React.ReactNode }) {
  const pathname = usePathname();
  const { resolvedTheme, setTheme } = useTheme();
  const [mobileNav, setMobileNav] = useState(false);
  const copilotOpen = useCatalystStore((state) => state.copilotOpen);
  const setCopilotOpen = useCatalystStore((state) => state.setCopilotOpen);
  const copilotPage = pathname.startsWith("/copilot");
  const caseSymbol = pathname.match(/^\/cases\/([^/]+)$/)?.[1] as SymbolCode | undefined;
  const mobileNavItems = navItems;

  const nav = (onNavigate?: () => void) => <>
    {navItems.map((item) => {
      const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href);
      return <Link key={item.href} href={item.href} onClick={onNavigate} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-10 cursor-pointer items-center gap-3 rounded-[6px] px-3 text-[13px] transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "bg-muted font-medium text-foreground" : "text-muted-foreground hover:bg-muted/70 hover:text-foreground")}>{active ? <span aria-hidden="true" className="absolute left-0 top-1/2 h-4 w-[2px] -translate-y-1/2 rounded-full bg-brand" /> : null}<item.icon aria-hidden="true" className={cn("size-4", active && "text-primary")} /><span>{item.label}</span></Link>;
    })}
  </>;

  return (
    <div className="relative min-h-dvh bg-background">
      <a href="#main-content" className="skip-link">Lewati navigasi</a>
      <div className="demo-banner relative z-50 flex h-9 items-center justify-center gap-2 border-b border-border bg-surface-raised px-3 text-center"><FlaskConical aria-hidden="true" className="size-3 text-attention" /><p className="meta truncate text-attention-foreground"><strong className="font-medium">Rekaman 11 Sep 2026</strong><span aria-hidden="true" className="mx-2 opacity-50">/</span><span className="sm:hidden">Bukan pasar live</span><span className="hidden sm:inline">Bukan kondisi pasar live</span></p></div>
      <div className="grid min-h-[calc(100dvh-36px)] xl:grid-cols-[236px_minmax(0,1fr)]">
        <aside className="sticky top-0 hidden h-[calc(100dvh-36px)] flex-col border-r border-border bg-surface px-3 py-4 xl:flex">
          <Link href="/" className="mb-6 flex min-h-12 items-center gap-3 rounded-[6px] px-2 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><CatalystLogo /><div><span className="editorial block text-[17px] text-foreground">Catalyst</span><span className="meta block text-muted-foreground">Pemeriksa perubahan</span></div></Link>
          <CommandPalette />
          <nav aria-label="Navigasi utama" className="mt-5 space-y-0.5">{nav()}</nav>
          <div className="mt-auto border-t border-border pt-3">
            <p className="editorial mb-3 px-2 text-[15px] italic text-muted-foreground">Lacak perubahan. Periksa buktinya.</p>
            <SettingsDrawer />
          </div>
        </aside>

        <div className="min-w-0">
          <header className="sticky top-0 z-40 flex min-h-14 items-center gap-3 border-b border-border bg-background/95 px-3 backdrop-blur sm:px-5 xl:hidden">
            <Button variant="ghost" size="icon" onClick={() => setMobileNav(true)} aria-label="Buka navigasi"><Menu aria-hidden="true" className="size-5" /></Button>
            <Link href="/" className="flex min-w-0 items-center gap-2.5"><CatalystLogo className="size-7" /><span className="editorial text-[16px] text-foreground">Catalyst</span></Link>
            <div className="ml-auto flex items-center gap-1">
              <Button variant="ghost" size="icon" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")} aria-label="Ganti tema"><Sun aria-hidden="true" className="size-4 dark:hidden" /><Moon aria-hidden="true" className="hidden size-4 dark:block" /></Button>
              <SettingsDrawer compact />
              <Link href="/copilot" className="inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-[6px] border border-border bg-surface px-3 text-xs font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><Bot aria-hidden="true" className="size-4" /><span className="hidden sm:inline">Tanya asisten</span><span className="sr-only sm:hidden">Buka asisten</span></Link>
            </div>
          </header>
          <main id="main-content" tabIndex={-1} className="min-w-0 px-4 pb-24 pt-6 focus:outline-none sm:px-7 sm:pt-8 lg:px-9 lg:pt-10 xl:pb-10">{children}</main>
          <nav aria-label="Navigasi mobile" className="fixed inset-x-0 bottom-0 z-40 grid grid-cols-4 border-t border-border bg-surface/98 px-1 pb-[env(safe-area-inset-bottom)] xl:hidden">
            {mobileNavItems.map((item) => { const active = item.href === "/" ? pathname === "/" : pathname.startsWith(item.href); return <Link key={item.href} href={item.href} aria-current={active ? "page" : undefined} className={cn("relative flex min-h-14 cursor-pointer flex-col items-center justify-center gap-1 rounded-[6px] text-[10px] font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", active ? "text-foreground" : "text-muted-foreground")}>{active ? <span aria-hidden="true" className="absolute top-0 h-[2px] w-6 rounded-full bg-brand" /> : null}<item.icon aria-hidden="true" className={cn("size-4", active && "text-primary")} />{item.label}</Link>; })}
          </nav>
        </div>

      </div>

      {mobileNav ? <div className="fixed inset-0 z-100 xl:hidden"><button className="absolute inset-0 cursor-default bg-background/80 backdrop-blur-[2px]" onClick={() => setMobileNav(false)} aria-label="Tutup navigasi" /><aside className="absolute inset-y-0 left-0 w-[min(86vw,300px)] border-r border-border bg-surface p-4 shadow-2xl"><div className="mb-6 flex items-center gap-3"><CatalystLogo /><span className="editorial text-[17px]">Catalyst</span><Button variant="ghost" size="icon" className="ml-auto" onClick={() => setMobileNav(false)} aria-label="Tutup navigasi"><X aria-hidden="true" className="size-4" /></Button></div><nav className="space-y-0.5">{nav(() => setMobileNav(false))}</nav><div className="mt-7"><CommandPalette /></div></aside></div> : null}
      {!copilotPage && !caseSymbol && pathname !== "/" && !pathname.startsWith("/impact") && !copilotOpen ? <Button onClick={() => setCopilotOpen(true)} className="fixed bottom-[4.25rem] right-3 z-30 shadow-2xl xl:bottom-5 xl:right-5"><Bot aria-hidden="true" className="size-4" />Tanya asisten</Button> : null}
      {!copilotPage && copilotOpen ? <div className="fixed inset-0 z-100 bg-surface xl:pointer-events-none xl:bg-transparent"><div className="h-full xl:pointer-events-auto xl:absolute xl:inset-y-4 xl:right-4 xl:w-[390px] xl:overflow-hidden xl:rounded-2xl xl:border xl:border-border xl:shadow-2xl"><Copilot dismissible /></div></div> : null}
      <OnboardingWizard />
      <GuidedTour />
    </div>
  );
}
