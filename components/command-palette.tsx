"use client";

import { useEffect, useState } from "react";
import { useRouter } from "next/navigation";
import * as Dialog from "@radix-ui/react-dialog";
import { BarChart3, BookOpenCheck, Bot, BriefcaseBusiness, Building2, FlaskConical, Newspaper, Search, X } from "lucide-react";
import { Button } from "@/components/ui/button";

const actions = [
  { label: "Buka Today", href: "/", icon: BarChart3 },
  { label: "Buka Research Cases", href: "/cases", icon: BriefcaseBusiness },
  { label: "Buka causal impact", href: "/impact", icon: Newspaper },
  { label: "Tanya Catalyst Copilot", href: "/copilot", icon: Bot },
  { label: "Edit Investor Research Playbook", href: "/playbook", icon: BookOpenCheck },
  { label: "Buka company universe", href: "/companies", icon: Building2 },
  { label: "Baca method & limits", href: "/method", icon: FlaskConical },
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

  const filtered = actions.filter((action) => action.label.toLowerCase().includes(query.toLowerCase()));
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm" aria-label="Buka command palette" className="hidden w-full justify-start text-muted-foreground lg:flex">
          <Search aria-hidden="true" className="size-4" />
          <span>Cari atau buka</span><kbd className="ml-auto rounded border border-border px-1.5 py-0.5 font-mono text-[10px]">/</kbd>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed left-1/2 top-[16vh] z-100 w-[min(92vw,560px)] -translate-x-1/2 overflow-hidden rounded-xl border border-border bg-surface shadow-2xl focus:outline-none">
          <Dialog.Title className="sr-only">Command palette</Dialog.Title>
          <div className="flex items-center gap-2 border-b border-border px-4">
            <Search aria-hidden="true" className="size-4 text-muted-foreground" />
            <input autoFocus value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari halaman..." className="h-14 min-w-0 flex-1 bg-transparent text-base outline-none placeholder:text-muted-foreground" aria-label="Cari halaman" />
            <Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup command palette"><X aria-hidden="true" className="size-4" /></Button></Dialog.Close>
          </div>
          <div className="p-2">
            {filtered.map((action) => (
              <button key={action.href} onClick={() => { router.push(action.href); setOpen(false); }} className="flex min-h-11 w-full cursor-pointer items-center gap-3 rounded-lg px-3 text-left text-sm transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">
                <action.icon aria-hidden="true" className="size-4 text-primary" />{action.label}
              </button>
            ))}
            {filtered.length === 0 ? <p className="p-4 text-sm text-muted-foreground">Tidak ada halaman yang cocok.</p> : null}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
