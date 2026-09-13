"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpenCheck, BriefcaseBusiness, ClipboardCheck, Compass, FlaskConical, Moon, Settings2, Sun, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";

const utilityLinks = [
  { href: "/playbook", label: "Aturan riset investor", description: "Pembanding, eksposur, aturan, sumber, dan kondisi pembatal.", icon: BookOpenCheck },
  { href: "/cases?view=picker", label: "Pilih emiten", description: "Buka kasus atau bandingkan bukti dua emiten.", icon: BriefcaseBusiness },
  { href: "/cases?view=audit", label: "Audit riset", description: "Koreksi pengguna, hasil kasus, dan aturan yang dapat dipakai ulang.", icon: ClipboardCheck },
  { href: "/method", label: "Metode dan batas", description: "Rumus, batas data, pemeriksaan sumber, dan penafian.", icon: FlaskConical },
] as const;

export function SettingsDrawer({ compact = false }: { compact?: boolean }) {
  const router = useRouter();
  const { resolvedTheme, setTheme } = useTheme();
  const startTour = useCatalystStore((state) => state.startTour);
  const setCopilotOpen = useCatalystStore((state) => state.setCopilotOpen);
  const restartTour = () => {
    setCopilotOpen(false);
    router.push("/");
    startTour();
  };

  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "default"} className={compact ? undefined : "w-full justify-start"} aria-label="Buka pengaturan"><Settings2 aria-hidden="true" className="size-4" />{compact ? null : <span>Pengaturan</span>}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content aria-describedby="settings-description" className="fixed inset-y-0 right-0 z-100 w-[min(92vw,420px)] overflow-y-auto border-l border-border bg-surface p-4 shadow-2xl focus:outline-none sm:p-5">
          <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><Dialog.Title className="text-lg font-semibold">Pengaturan</Dialog.Title><Dialog.Description id="settings-description" className="mt-1 text-sm leading-6 text-muted-foreground">Fitur pendukung disimpan di sini agar alur utama tetap fokus.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup pengaturan"><X aria-hidden="true" className="size-4" /></Button></Dialog.Close></div>
          <nav aria-label="Fitur pendukung" className="mt-5 space-y-2">
            {utilityLinks.map((item) => <Dialog.Close key={item.href} asChild><Link href={item.href} className="flex min-h-20 items-start gap-3 rounded-xl border border-border bg-background p-3 transition-colors hover:border-primary/45 hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-9 shrink-0 place-items-center rounded-lg bg-primary/10 text-primary"><item.icon aria-hidden="true" className="size-4" /></span><span><strong className="block text-sm">{item.label}</strong><span className="mt-1 block text-xs leading-5 text-muted-foreground">{item.description}</span></span></Link></Dialog.Close>)}
          </nav>
          <div className="mt-5 grid gap-2 border-t border-border pt-4">
            <Dialog.Close asChild><Button variant="secondary" className="justify-start" onClick={restartTour}><Compass aria-hidden="true" className="size-4" />Ulangi tur inti</Button></Dialog.Close>
            <Button variant="secondary" className="justify-start" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Sun aria-hidden="true" className="size-4 dark:hidden" /><Moon aria-hidden="true" className="hidden size-4 dark:block" />Ganti tema</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
