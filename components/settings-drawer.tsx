"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpenCheck, ChevronDown, ChevronRight, Compass, FlaskConical, Moon, RefreshCw, Settings2, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const utilityLinks = [
  { href: "/playbook", label: "Aturan riset investor", description: "Pembanding, eksposur, aturan, sumber, kondisi pembatal, dan ambang penilaian.", icon: BookOpenCheck },
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

  const [refresh, setRefresh] = useState<{
    enabled: boolean;
    source: string;
    pinnedByEnv: boolean;
    estimatedCost: number;
    budget: number;
  } | null>(null);
  const [refreshBusy, setRefreshBusy] = useState<"idle" | "toggle" | "preview" | "run">("idle");
  const [refreshNote, setRefreshNote] = useState("");

  const loadRefresh = async () => {
    try {
      const response = await fetch("/api/settings/refresh", { cache: "no-store" });
      const body = (await response.json()) as {
        enabled?: boolean;
        source?: string;
        pinnedByEnv?: boolean;
        estimatedCost?: number;
        budget?: number;
        unavailable?: boolean;
      };
      if (body.unavailable || typeof body.enabled !== "boolean") {
        setRefreshNote("Status pembaruan tidak tersedia saat ini.");
        return;
      }
      setRefresh({
        enabled: body.enabled,
        source: body.source ?? "settings",
        pinnedByEnv: body.pinnedByEnv ?? false,
        estimatedCost: body.estimatedCost ?? 0,
        budget: body.budget ?? 0,
      });
    } catch {
      setRefreshNote("Status pembaruan tidak tersedia (jaringan).");
    }
  };

  const flipRefresh = async () => {
    if (!refresh || refreshBusy !== "idle") return;
    setRefreshBusy("toggle");
    setRefreshNote("");
    try {
      const response = await fetch("/api/settings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ enabled: !refresh.enabled }),
      });
      const body = (await response.json()) as { enabled?: boolean; error?: string; hint?: string };
      if (!response.ok || typeof body.enabled !== "boolean") {
        setRefreshNote(body.hint ?? "Gagal mengubah sakelar refresh.");
        return;
      }
      setRefresh({ ...refresh, enabled: body.enabled });
      setRefreshNote(body.enabled ? "Pembaruan aktif. Tombol Jalankan sekarang dapat dipakai." : "Pembaruan mati. Aplikasi memakai rekaman bawaan.");
    } catch {
      setRefreshNote("Gagal mengubah sakelar refresh (jaringan).");
    } finally {
      setRefreshBusy("idle");
    }
  };

  const runRefresh = async (dryRun: boolean) => {
    if (!refresh || refreshBusy !== "idle") return;
    setRefreshBusy(dryRun ? "preview" : "run");
    setRefreshNote(dryRun ? "Menyusun pratinjau…" : "Menjalankan refresh…");
    try {
      const response = await fetch("/api/settings/refresh", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ run: true, dryRun }),
      });
      const body = (await response.json()) as {
        dryRun?: boolean;
        plans?: Array<{ symbol: string }>;
        estimatedCost?: number;
        results?: Array<{ symbol: string }>;
        rejected?: string[];
        error?: string;
        hint?: string;
      };
      if (!response.ok) {
        setRefreshNote(body.hint ?? `Refresh gagal (${body.error ?? response.status}).`);
        return;
      }
      if (body.dryRun) {
        setRefreshNote(`Pratinjau: ${body.plans?.length ?? 0} emiten, estimasi ${body.estimatedCost ?? 0} kredit (belanja 0).`);
      } else {
        setRefreshNote(`Selesai: ${body.results?.length ?? 0} emiten tersimpan untuk ditelaah. Data yang tampil tidak berubah.`);
      }
    } catch {
      setRefreshNote("Refresh gagal (jaringan).");
    } finally {
      setRefreshBusy("idle");
    }
  };

  const dark = resolvedTheme === "dark";

  return (
    <Dialog.Root onOpenChange={(open) => { if (open) void loadRefresh(); }}>
      <Dialog.Trigger asChild>
        <Button variant="ghost" size={compact ? "icon" : "default"} className={compact ? undefined : "w-full justify-start"} aria-label="Buka pengaturan"><Settings2 aria-hidden="true" className="size-4" />{compact ? null : <span>Pengaturan</span>}</Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fade-in fixed inset-0 z-100 bg-[var(--scrim)]" />
        <Dialog.Content aria-describedby="settings-description" className="slide-in fixed inset-y-0 right-0 z-100 flex w-[min(92vw,420px)] flex-col gap-2 overflow-y-auto border-l border-border bg-background p-5 shadow-2xl focus:outline-none">
          <div className="mb-2 flex items-start gap-3"><div className="min-w-0 flex-1"><Dialog.Title className="editorial text-xl">Pengaturan</Dialog.Title><Dialog.Description id="settings-description" className="mt-1 text-sm text-muted-foreground">Tampilan, tur, dan halaman pendukung.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup pengaturan"><X aria-hidden="true" className="size-4" /></Button></Dialog.Close></div>

          <div className="flex min-h-12 items-center gap-3 px-1">
            <Moon aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">Tema</span>
            <div role="group" aria-label="Tema" className="inline-flex gap-0.5 rounded-lg bg-muted p-[3px]">
              {[{ value: "light", label: "Terang" }, { value: "dark", label: "Gelap" }].map((option) => { const on = (option.value === "dark") === dark; return <button key={option.value} type="button" aria-pressed={on} onClick={() => setTheme(option.value)} className={cn("h-8 rounded-md border px-3 text-sm font-medium transition-colors", on ? "border-border bg-background text-foreground" : "border-transparent text-muted-foreground hover:text-foreground")}>{option.label}</button>; })}
            </div>
          </div>
          <div className="flex min-h-12 items-center gap-3 px-1">
            <Compass aria-hidden="true" className="size-4 text-muted-foreground" />
            <span className="flex-1 text-sm font-medium">Tur inti</span>
            <Dialog.Close asChild><Button variant="secondary" size="sm" onClick={restartTour}>Ulangi tur</Button></Dialog.Close>
          </div>

          <div className="my-2 h-px bg-border" />
          <p className="px-1 text-xs font-medium text-subtle-foreground">Halaman pendukung</p>
          <nav aria-label="Fitur pendukung" className="space-y-1">
            {utilityLinks.map((item) => <Dialog.Close key={item.href} asChild><Link href={item.href} className="flex items-center gap-3 rounded-lg p-2.5 transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="grid size-9 shrink-0 place-items-center rounded-lg border border-border text-muted-foreground"><item.icon aria-hidden="true" className="size-4" /></span><span className="min-w-0 flex-1"><span className="block text-sm font-semibold">{item.label}</span><span className="mt-0.5 block text-xs text-subtle-foreground">{item.description}</span></span><ChevronRight aria-hidden="true" className="size-4 shrink-0 text-subtle-foreground" /></Link></Dialog.Close>)}
          </nav>

          <div className="my-2 h-px bg-border" />
          <details className="group">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-1 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Lanjutan<ChevronDown aria-hidden="true" className="ml-auto size-4 transition-transform group-open:rotate-180" /></summary>
            <div className="mt-2 rounded-lg border border-border p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={refresh?.enabled ?? false}
                  aria-label="Perbarui data Sectors"
                  disabled={!refresh || refreshBusy !== "idle"}
                  onClick={() => void flipRefresh()}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", refresh?.enabled ? "bg-foreground" : "bg-border-strong")}
                >
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-background shadow transition-all", refresh?.enabled ? "left-[22px]" : "left-0.5")} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-semibold">Perbarui data sekarang</p>
                  <p className="truncate text-xs text-subtle-foreground">
                    {refresh
                      ? `${refresh.enabled ? "Aktif" : "Mati"} · ${refresh.source === "env" ? "diatur operator" : "diatur di sini"} · kuota ${refresh.budget} kredit per hari`
                      : "Memuat status…"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs text-muted-foreground">
                {`Mengambil ulang ringkasan broker dan arus asing dari Sectors (perkiraan ${refresh?.estimatedCost ?? "…"} kredit) untuk ditelaah. Data yang tampil tidak berubah sampai pembaruan disetujui.`}
              </p>
              <div className="mt-3 flex gap-2">
                <Button variant="secondary" size="sm" disabled={!refresh?.enabled || refreshBusy !== "idle"} onClick={() => void runRefresh(true)}>
                  <RefreshCw aria-hidden="true" className="size-3.5" />Pratinjau
                </Button>
                <Button variant="secondary" size="sm" disabled={!refresh?.enabled || refreshBusy !== "idle"} onClick={() => void runRefresh(false)}>
                  {refreshBusy === "run" ? "Berjalan…" : "Jalankan"}
                </Button>
              </div>
              {refresh?.pinnedByEnv ? <p className="mt-2 text-xs text-muted-foreground">Dikunci operator; sakelar ini tidak berlaku.</p> : null}
              {refreshNote ? <p className="mt-2 text-xs text-muted-foreground" role="status">{refreshNote}</p> : null}
            </div>
          </details>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
