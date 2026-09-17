"use client";

import * as Dialog from "@radix-ui/react-dialog";
import type { Citation } from "@/lib/types";
import { locate } from "@/lib/agent/citations";
import { glossField } from "@/lib/agent/explain";
import { DATA_AS_OF_LABEL } from "@/lib/data/fixtures";
import { events } from "@/lib/data/fixtures";
import { formatAsOf } from "@/lib/utils";
import { Button } from "@/components/ui/button";
import { SourceText } from "@/components/source-text";
import { IconClose, IconDocument, IconExternal, IconInfo, IconSource } from "@/components/ui/icons";

const eventById = new Map(events.map((event) => [event.id, event]));

/** Event rekaman di balik sebuah sitasi — via span bila ada, via id bila tidak. */
function eventForCitation(citation: Citation) {
  if (citation.span) {
    const direct = eventById.get(citation.span.documentId);
    if (direct) return direct;
  }
  const stripped = citation.id.replace(/^(news-|external-|empty-)/, "");
  return eventById.get(stripped) ?? eventById.get(citation.id);
}

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
          <div className="flex items-start gap-3"><div className="min-w-0 flex-1"><Dialog.Title className="text-xl font-semibold">Daftar bukti</Dialog.Title><Dialog.Description className="mt-1 text-sm leading-6 text-muted-foreground">Setiap angka menyebut siapa penyedianya, data apa yang dibaca, dan kapan direkam. Alamat teknisnya ada di balik &ldquo;Rincian teknis&rdquo; untuk diperiksa sendiri.</Dialog.Description></div><Dialog.Close asChild><Button variant="ghost" size="icon" aria-label="Tutup sumber"><IconClose aria-hidden="true" className="size-4" /></Button></Dialog.Close></div>
          <div className="mt-4 flex gap-2 rounded-lg border border-attention/30 bg-attention/8 p-3 text-xs leading-5 text-muted-foreground"><IconInfo aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-attention" /><p>Nilai pada prototipe adalah rekaman {DATA_AS_OF_LABEL}. Tautan menunjukkan sumber asal, bukan bukti bahwa peristiwa benar-benar terjadi.</p></div>
          <div className="mt-6 space-y-3">
            {unique.map((citation) => {
              const event = eventForCitation(citation);
              const span = citation.span && citation.span.match !== "not_found"
                ? citation.span
                : event?.body
                  ? (() => {
                    const found = locate(event.id, event.body, (event.summary ?? "").replace(/…$/, ""));
                    return found.match === "not_found" ? undefined : found;
                  })()
                  : undefined;
              return (
                <article key={citation.id} className="rounded-xl border border-border bg-background p-4">
                  <div className="flex items-center gap-2 text-primary"><IconDocument aria-hidden="true" className="size-4" /><h3 className="font-mono text-xs font-semibold">{citation.provider}</h3></div>
                  <p className="mt-3 text-sm font-medium">{citation.label}</p>
                  {/* Plain words first, address second. A reader checking a
                      figure needs to know what was read before they can care
                      which path it was read from; `broker_code, buy_idr` told
                      them neither. The endpoint stays one click away because
                      it is the audit trail, not decoration. */}
                  <dl className="mt-3 grid gap-2 text-xs">
                    <div><dt className="text-muted-foreground">Data yang dibaca</dt><dd className="mt-0.5 break-words text-foreground">{glossField(citation.field)}</dd></div>
                    <div><dt className="text-muted-foreground">Waktu sumber</dt><dd className="mt-0.5 font-mono text-foreground">{formatAsOf(citation.asOf)} WIB</dd></div>
                  </dl>
                  <details className="mt-3">
                    <summary className="min-h-8 cursor-pointer font-mono text-[10px] uppercase tracking-wider text-primary">Rincian teknis</summary>
                    <dl className="mt-2 grid gap-2 text-xs">
                      <div><dt className="text-muted-foreground">Lokasi data</dt><dd className="mt-0.5 overflow-wrap-anywhere font-mono text-foreground">{citation.endpoint}</dd></div>
                      <div><dt className="text-muted-foreground">Nama kolom</dt><dd className="mt-0.5 break-words font-mono text-foreground">{citation.field}</dd></div>
                    </dl>
                  </details>
                  {event?.body ? <div className="mt-4"><SourceText body={event.body} span={span} /></div> : null}
                  {citation.url ? <div className="mt-4"><a href={citation.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconExternal aria-hidden="true" className="size-3.5" />{citation.urlLabel ?? "Buka dokumentasi sumber"}</a></div> : null}
                </article>
              );
            })}
          </div>
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}
