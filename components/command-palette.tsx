"use client";
import { fuzzyIncludes } from "@/lib/text/fuzzy";
import { primarySymbol } from "@/lib/data/fixtures";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { BarChart3, BookOpenCheck, Bot, BrainCircuit, BriefcaseBusiness, Building2, FlaskConical, GitBranch, Radar, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";
import {
  IconAgent,
  IconClose,
  IconCompanies,
  IconCopilot,
  IconImpact,
  IconMethod,
  IconSearch,
  IconToday,
} from "@/components/ui/icons";

const actions = [
  { label: "Buka Dashboard", href: "/", icon: BarChart3 },
  { label: "Buka Kasus", href: "/cases", icon: BriefcaseBusiness },
  { label: `Buka Sebab akibat ${primarySymbol}`, href: `/impact?company=${primarySymbol}`, icon: GitBranch },
  { label: "Buka Pantau web", href: "/pantau", icon: Radar },
  { label: "Tanya asisten Catalyst", href: "/copilot", icon: Bot },
  { label: "Buka AI Learning", href: "/ai-learning", icon: BrainCircuit },
  { label: "Edit aturan riset", href: "/playbook", icon: BookOpenCheck },
  { label: "Buka daftar emiten", href: "/companies", icon: Building2 },
  { label: "Baca metode dan batas", href: "/method", icon: FlaskConical },
];

export function CommandPalette() {
  const [open, setOpen] = useState(false);
  const [query, setQuery] = useState("");
  const router = useRouter();

  useEffect(() => {
    const handler = (event: KeyboardEvent) => {
      const target = event.target as HTMLElement | null;
      if (event.key === "/" && !target?.matches("input, textarea, [contenteditable='true']")) {
        event.preventDefault();
        setOpen(true);
      }
      if ((event.metaKey || event.ctrlKey) && event.key.toLowerCase() === "k") {
        event.preventDefault();
        setOpen(true);
      }
    };
    window.addEventListener("keydown", handler);
    return () => window.removeEventListener("keydown", handler);
  }, []);

  // A palette that answers "no results" to "casess" is a palette the reader
  // stops trusting; the action is right there in the list behind the box.
  const filtered = actions.filter((action) => fuzzyIncludes(action.label, query));
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm" aria-label="Buka pencarian" className="hidden w-full justify-start text-muted-foreground lg:flex">
          <Search aria-hidden="true" className="size-4" />
          <span>Cari atau buka</span><kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[16vh] z-100 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl focus:outline-none">
          <Dialog.Title className="sr-only">Pencarian halaman</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search aria-hidden="true" className="size-4 text-muted-foreground" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari halaman..." className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" aria-label="Cari halaman" />
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup pencarian"><X aria-hidden="true" className="size-4" /></Button></Dialog.Close>
          </div>
          <div className="p-2">
            {filtered.map((action) => (
              <button key={action.href} onClick={() => { router.push(action.href); setOpen(false); }} className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-[6px] px-3 text-left text-[13px] transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <action.icon className="size-4 text-muted-foreground" />{action.label}
              </button>
            ))}
            {filtered.length === 0 ? <p className="p-4 text-[13px] text-muted-foreground">Tidak ada halaman yang cocok.</p> : null}
          </div>
          <div className="flex items-center gap-4 border-t border-border bg-surface-raised px-4 py-2.5">
            <span className="meta text-muted-foreground">Navigasi</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><kbd>/</kbd> buka</span>
            <span className="flex items-center gap-1.5 text-[11px] text-muted-foreground"><kbd>esc</kbd> tutup</span>
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
