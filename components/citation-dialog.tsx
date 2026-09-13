"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { Citation } from "@/lib/types";
import { events } from "@/lib/data/fixtures";
import { formatAsOf } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SourceText } from "@/components/source-text";
import { IconClose, IconDocument, IconExternal, IconInfo, IconSource } from "@/components/ui/icons";

const eventById = new Map(events.map((event) => [event.id, event]));

export function CitationDialog({ citations, label = "Periksa sumber" }: { citations: Citation[]; label?: string }) {
  const unique = [...new Map(citations.map((citation) => [citation.id, citation])).values()];
  return (
    <Dialog.Root>
      <Dialog.Trigger asChild>
        <Button variant="secondary" size="sm">
          <IconSource className="size-3.5" />
          {label}
          <span className="rounded-full bg-muted px-1.5 py-0.5 font-mono text-[10px] text-muted-foreground">{unique.length}</span>
        </Button>
      </Dialog.Trigger>
      <Dialog.Portal>
        <Dialog.Overlay className="fixed inset-0 z-100 bg-background/80 backdrop-blur-sm" />
        <Dialog.Content className="fixed inset-y-0 right-0 z-100 w-[min(100vw,480px)] overflow-y-auto border-l border-border bg-surface p-5 shadow-2xl focus:outline-none sm:p-6">
          <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><Dialog.Title className="text-xl font-semibold">Daftar bukti</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">Setiap angka menyertakan penyedia, lokasi data, nama data, dan waktu sumber.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup sumber"><IconClose aria-hidden="true" className="size-4" /></Button></Dialog.Close></div>
          <div className="mt-4 flex gap-2 rounded-lg border border-attention/30 bg-attention/8 p-3 text-xs leading-5 text-muted-foreground"><IconInfo aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-attention" /><p>Nilai pada prototipe adalah rekaman 11 Sep 2026. Tautan menunjukkan sumber asal, bukan bukti bahwa peristiwa benar-benar terjadi.</p></div>
          <div className="mt-6 space-y-3">
            {unique.map((citation) => <article key={citation.id} className="rounded-xl border border-border bg-background p-4"><div className="flex items-center gap-2 text-primary"><IconDocument aria-hidden="true" className="size-4" /><h3 className="font-mono text-xs font-semibold">{citation.provider}</h3></div><p className="mt-3 text-sm font-medium">{citation.label}</p><dl className="mt-3 grid gap-2 text-xs"><div><dt className="text-muted-foreground">Lokasi data</dt><dd className="mt-0.5 overflow-wrap-anywhere font-mono text-foreground">{citation.endpoint}</dd></div><div><dt className="text-muted-foreground">Nama data</dt><dd className="mt-0.5 break-words font-mono text-foreground">{citation.field}</dd></div><div><dt className="text-muted-foreground">Waktu sumber</dt><dd className="mt-0.5 font-mono text-foreground">{formatAsOf(citation.asOf)} WIB</dd></div></dl>{citation.url ? <a href={citation.url} target="_blank" rel="noreferrer" className="mt-4 inline-flex min-h-10 cursor-pointer items-center gap-2 rounded-lg border border-primary/30 bg-primary/8 px-3 text-xs font-medium text-primary transition-colors hover:bg-primary/14 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconExternal aria-hidden="true" className="size-3.5" />{citation.urlLabel ?? "Buka sumber"}<span className="sr-only"> di tab baru</span></a> : null}</article>)}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
