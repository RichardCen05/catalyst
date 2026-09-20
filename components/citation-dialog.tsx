"use client";

import * as Dialog from "@radix-ui/react-dialog";
import { useEffect, useState } from "react";
import type { Citation } from "@/lib/types";
import { locate } from "@/lib/agent/citations";
import { glossField } from "@/lib/agent/explain";
import { digestFor } from "@/lib/data/recording-digest";
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

/**
 * What each cited feed holds, in plain words, on the card itself.
 *
 * The sentence used to sit inside "Rincian teknis", next to the address it
 * explains — which is the one place a reader who needed it would never open.
 * It belongs above the fold; the address and the raw column names stay
 * untouched underneath, because they are the audit trail.
 *
 * Every feed in the panel is asked for in one request when the panel opens,
 * and the answers are kept for the session: the same recording backs several
 * figures, and opening the panel twice should not cost twice.
 *
 * A missing answer (deterministic mode, spent budget, a draft the verifier
 * threw out) renders nothing at all. An invented description of a recording
 * would be worse than the terse card this replaces.
 */
type Claim = { endpoint: string; field: string; symbol?: string };
type Reading = { summary: string | null; takeaway: string | null; why: string | null };

const claimKey = (claim: Claim) => `${claim.endpoint}\u0000${claim.field}`;

const resolved = new Map<string, Reading>();

async function fetchSummaries(claims: Claim[]): Promise<Map<string, Reading>> {
  const missing = claims.filter((claim) => !resolved.has(claimKey(claim)));
  if (missing.length) {
    try {
      const response = await fetch("/api/endpoint-summary", {
        method: "POST",
        headers: { "content-type": "application/json" },
        body: JSON.stringify({ claims: missing }),
      });
      if (response.ok) {
        const payload: { summaries?: ({ endpoint: string; field: string } & Reading)[] } = await response.json();
        for (const item of payload.summaries ?? []) {
          if (item.summary || item.takeaway || item.why) {
            resolved.set(claimKey(item), { summary: item.summary, takeaway: item.takeaway, why: item.why });
          }
        }
      }
    } catch {
      // No sentence is a supported state; the card still names the provider,
      // the columns in plain words, and when the recording was taken.
    }
  }
  return new Map(resolved);
}

function useEndpointSummaries(claims: Claim[]): Map<string, Reading> {
  const [summaries, setSummaries] = useState<Map<string, Reading>>(() => new Map(resolved));
  const signature = claims.map((claim) => `${claimKey(claim)}\u0000${claim.symbol ?? ""}`).join("\u0001");
  useEffect(() => {
    let active = true;
    fetchSummaries(signature.split("\u0001").map((key) => {
      const [endpoint, field, symbol] = key.split("\u0000");
      return { endpoint, field, symbol: symbol || undefined };
    })).then((next) => {
      if (active) setSummaries(next);
    });
    return () => { active = false; };
  }, [signature]);
  return summaries;
}

/**
 * What this card's figure was actually read from, and what it came to.
 *
 * Listing the columns was the whole answer before: `tanggal, arus asing
 * bersih harian`, and the reader was on their own to work out which rows,
 * which values, and whether any of it supported the number on screen. The
 * readout now states the span that was read, the values that carried it, and
 * the conclusion — all computed from the recordings, so no sentence here can
 * drift from the figures it describes.
 *
 * Feeds this app keeps no per-symbol recording for (the broker registry, the
 * news list) still show the columns and the timestamp, which is everything
 * that is true about them.
 */
function RecordingReadout({ citation, reading }: { citation: Citation; reading?: Reading }) {
  const digest = digestFor(citation);
  return (
    <dl className="mt-3 grid gap-2 text-xs">
      <div><dt className="text-muted-foreground">Data yang dibaca</dt><dd className="mt-0.5 break-words text-foreground">{glossField(citation.field)}</dd></div>
      {digest ? <div><dt className="text-muted-foreground">Cakupan rekaman</dt><dd className="mt-0.5 break-words text-foreground">{digest.scope}</dd></div> : null}
      {digest?.values.map((entry) => (
        <div key={entry.label}><dt className="text-muted-foreground">{entry.label}</dt><dd className="mt-0.5 break-words font-mono text-foreground">{entry.value}</dd></div>
      ))}
      <div><dt className="text-muted-foreground">Waktu sumber</dt><dd className="mt-0.5 font-mono text-foreground">{formatAsOf(citation.asOf)} WIB</dd></div>
      {reading?.takeaway ? <div><dt className="text-muted-foreground">Kesimpulan</dt><dd className="mt-0.5 break-words leading-5 text-foreground">{reading.takeaway}</dd></div> : null}
      {/* What the reading decides, or the mistake it prevents. A reader who
          knows what a figure means still has no reason to care until someone
          says what hangs on it. */}
      {reading?.why ? <div><dt className="text-muted-foreground">Kenapa ini penting</dt><dd className="mt-0.5 break-words leading-5 text-muted-foreground">{reading.why}</dd></div> : null}
    </dl>
  );
}

/**
 * The address stays as the audit trail, one click away, with the sentence
 * that says why a reader would ever want it.
 */
function TechnicalDetails({ citation }: { citation: Citation }) {
  return (
    <details className="mt-3">
      <summary className="min-h-8 cursor-pointer font-mono text-[10px] uppercase tracking-wider text-primary">Rincian teknis</summary>
      <p className="mt-2 text-xs leading-5 text-muted-foreground">Alamat dan nama kolom ditulis apa adanya supaya Anda bisa meminta data yang sama ke penyedia dan mencocokkan angkanya sendiri.</p>
      <dl className="mt-3 grid gap-2 text-xs">
        <div><dt className="text-muted-foreground">Lokasi data</dt><dd className="mt-0.5 overflow-wrap-anywhere font-mono text-foreground">{citation.endpoint}</dd></div>
        <div><dt className="text-muted-foreground">Nama kolom</dt><dd className="mt-0.5 break-words font-mono text-foreground">{citation.field}</dd></div>
      </dl>
    </details>
  );
}

export function CitationDialog({ citations, label = "Periksa sumber" }: { citations: Citation[]; label?: string }) {
  const unique = [...new Map(citations.map((citation) => [citation.id, citation])).values()];
  const [open, setOpen] = useState(false);
  return (
    <Dialog.Root open={open} onOpenChange={setOpen}>
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
          {/* Mounted with the panel, so the descriptions are requested once
              per opening rather than once per card. */}
          <EvidenceList citations={unique} />
        </Dialog.Content>
      </Dialog.Portal>
    </Dialog.Root>
  );
}

function EvidenceList({ citations: unique }: { citations: Citation[] }) {
  const summaries = useEndpointSummaries(unique.map((citation) => ({
    endpoint: citation.endpoint,
    field: citation.field,
    // The filings feed is one address for the whole market, so the emiten
    // travels beside it or that card reads about nobody in particular.
    symbol: citation.id.match(/-([A-Z]{2,6})$/)?.[1],
  })));
  return (
    <>
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
                  {summaries.get(`${citation.endpoint}\u0000${citation.field}`)?.summary ? (
                    <p className="mt-2 text-xs leading-5 text-muted-foreground">{summaries.get(`${citation.endpoint}\u0000${citation.field}`)?.summary}</p>
                  ) : null}
                  <RecordingReadout citation={citation} reading={summaries.get(`${citation.endpoint}\u0000${citation.field}`)} />
                  <TechnicalDetails citation={citation} />
                  {event?.body ? <div className="mt-4"><SourceText body={event.body} span={span} /></div> : null}
                  {citation.url ? <div className="mt-4"><a href={citation.url} target="_blank" rel="noreferrer" className="inline-flex min-h-9 items-center gap-1.5 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10 focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><IconExternal aria-hidden="true" className="size-3.5" />{citation.urlLabel ?? "Buka dokumentasi sumber"}</a></div> : null}
                </article>
              );
            })}
          </div>
    </>
  );
}
