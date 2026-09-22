"use client";

import Link from "next/link";
import * as Dialog from "@radix-ui/react-dialog";
import { BookOpenCheck, BrainCircuit, BriefcaseBusiness, ClipboardCheck, Compass, FlaskConical, Moon, RefreshCw, Settings2, Sun, X } from "lucide-react";
import { useRouter } from "next/navigation";
import { useTheme } from "next-themes";
import { useState } from "react";
import { getOperatorToken, operatorHeaders, setOperatorToken } from "@/lib/operator-token";
import { useCatalystStore } from "@/lib/store";
import { Button } from "@/components/ui/button";
import { cn } from "@/lib/utils";

const utilityLinks = [
  { href: "/ai-learning", label: "AI Learning", description: "Masukan, proses pembelajaran, dan memori personal yang sedang dipakai.", icon: BrainCircuit },
  { href: "/playbook", label: "Aturan riset investor", description: "Pembanding, eksposur, aturan, sumber, kondisi pembatal, dan ambang penilaian.", icon: BookOpenCheck },
  { href: "/cases?view=picker", label: "Perbandingan emiten", description: "Buka kasus atau bandingkan bukti dua emiten.", icon: BriefcaseBusiness },
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

  const [refresh, setRefresh] = useState<{
    enabled: boolean;
    source: string;
    pinnedByEnv: boolean;
    estimatedCost: number;
    budget: number;
  } | null>(null);
  const [refreshBusy, setRefreshBusy] = useState<"idle" | "toggle" | "preview" | "run">("idle");
  const [refreshNote, setRefreshNote] = useState("");
  const [operatorToken, setOperatorTokenState] = useState("");
  const [tokenNote, setTokenNote] = useState("");

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
        setRefreshNote("Status refresh tak tersedia (penyimpanan tak terjangkau).");
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
      setRefreshNote("Status refresh tak tersedia (jaringan).");
    }
  };

  const flipRefresh = async () => {
    if (!refresh || refreshBusy !== "idle") return;
    setRefreshBusy("toggle");
    setRefreshNote("");
    try {
      const response = await fetch("/api/settings/refresh", {
        method: "POST",
        headers: operatorHeaders(),
        body: JSON.stringify({ enabled: !refresh.enabled }),
      });
      const body = (await response.json()) as { enabled?: boolean; error?: string; hint?: string };
      if (!response.ok || typeof body.enabled !== "boolean") {
        setRefreshNote(body.hint ?? "Gagal mengubah sakelar refresh.");
        return;
      }
      setRefresh({ ...refresh, enabled: body.enabled });
      setRefreshNote(body.enabled ? "Refresh Sectors aktif — tombol Jalankan di bawah boleh dipakai." : "Refresh Sectors mati — aplikasi kembali memakai rekaman bawaan.");
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
        headers: operatorHeaders(),
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
        setRefreshNote(`Selesai: ${body.results?.length ?? 0} emiten tersimpan ke GCS untuk telaah. Bundle bawaan tidak berubah.`);
      }
    } catch {
      setRefreshNote("Refresh gagal (jaringan).");
    } finally {
      setRefreshBusy("idle");
    }
  };

  return (
    <Dialog.Root onOpenChange={(open) => { if (open) { void loadRefresh(); setOperatorTokenState(getOperatorToken()); setTokenNote(""); } }}>
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
            <div className="rounded-xl border border-border bg-background p-3">
              <div className="flex items-center gap-3">
                <button
                  type="button"
                  role="switch"
                  aria-checked={refresh?.enabled ?? false}
                  aria-label="Refresh data Sectors"
                  disabled={!refresh || refreshBusy !== "idle"}
                  onClick={() => void flipRefresh()}
                  className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", refresh?.enabled ? "bg-primary" : "bg-muted")}
                >
                  <span className={cn("absolute top-0.5 size-5 rounded-full bg-white shadow transition-all", refresh?.enabled ? "left-[22px]" : "left-0.5")} />
                </button>
                <div className="min-w-0">
                  <p className="text-sm font-medium">Refresh data Sectors</p>
                  <p className="truncate text-xs text-muted-foreground">
                    {refresh
                      ? `${refresh.enabled ? "Aktif" : "Mati"} · via ${refresh.source === "env" ? "operator" : "sakelar ini"} · pagu ${refresh.budget} kredit/hari`
                      : "Memuat status…"}
                  </p>
                </div>
              </div>
              <p className="mt-2 text-xs leading-5 text-muted-foreground">
                {`Mengambil ulang broker-summary + foreign-flow (estimasi ${refresh?.estimatedCost ?? "…"} kredit) ke GCS untuk telaah. Bundle bawaan tidak berubah.`}
              </p>
              <div className="mt-2 flex gap-2">
                <Button variant="secondary" size="sm" disabled={!refresh?.enabled || refreshBusy !== "idle"} onClick={() => void runRefresh(true)}>
                  <RefreshCw aria-hidden="true" className="size-3.5" />Pratinjau
                </Button>
                <Button variant="secondary" size="sm" disabled={!refresh?.enabled || refreshBusy !== "idle"} onClick={() => void runRefresh(false)}>
                  {refreshBusy === "run" ? "Berjalan…" : "Jalankan"}
                </Button>
              </div>
              {refresh?.pinnedByEnv ? <p className="mt-2 text-xs text-muted-foreground">Gate dikunci operator via env — sakelar ini tidak berlaku.</p> : null}
              {refreshNote ? <p className="mt-2 text-xs leading-5 text-muted-foreground" role="status">{refreshNote}</p> : null}
            </div>
            <div className="rounded-xl border border-border bg-background p-3">
              <label htmlFor="operator-token" className="text-sm font-medium">Token operator</label>
              <p className="mt-1 text-xs leading-5 text-muted-foreground">
                Dibutuhkan untuk menyetujui kandidat pantauan dan menyalakan refresh Sectors. Disimpan di peramban ini saja, tidak pernah dikirim ke pihak lain.
              </p>
              <div className="mt-2 flex gap-2">
                <input
                  id="operator-token"
                  type="password"
                  autoComplete="off"
                  value={operatorToken}
                  onChange={(event) => setOperatorTokenState(event.target.value)}
                  placeholder="Tempel token"
                  className="min-w-0 flex-1 rounded-lg border border-border bg-surface px-3 py-1.5 text-sm focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"
                />
                <Button
                  variant="secondary"
                  size="sm"
                  onClick={() => {
                    setOperatorToken(operatorToken);
                    setTokenNote(operatorToken.trim() ? "Token disimpan di peramban ini." : "Token dihapus dari peramban ini.");
                  }}
                >
                  Simpan
                </Button>
              </div>
              {tokenNote ? <p className="mt-2 text-xs leading-5 text-muted-foreground" role="status">{tokenNote}</p> : null}
            </div>
            <Dialog.Close asChild><Button variant="secondary" className="justify-start" onClick={restartTour}><Compass aria-hidden="true" className="size-4" />Ulangi tur inti</Button></Dialog.Close>
            <Button variant="secondary" className="justify-start" onClick={() => setTheme(resolvedTheme === "dark" ? "light" : "dark")}><Sun aria-hidden="true" className="size-4 dark:hidden" /><Moon aria-hidden="true" className="hidden size-4 dark:block" />Ganti tema</Button>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
