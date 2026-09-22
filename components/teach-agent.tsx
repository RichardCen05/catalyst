"use client";

import { FormEvent, useMemo, useState } from "react";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { PillarKey, SymbolCode, UserInsight } from "@/lib/types";
import { Button } from "@/components/ui/button";
import { Panel, PanelHeader } from "@/components/ui/panel";
import { IconCheck, IconGate, IconNote } from "@/components/ui/icons";

/**
 * One box, one question: what do you want Catalyst to know about this issuer?
 *
 * Everything a reader can teach lands here, at the level they actually think
 * in — a ticker. The two fields that carry meaning (the note, and the source
 * that backs it) are the only two on screen; the category and the pillar still
 * exist, because the trace downstream is written from them, but they sit
 * behind a disclosure with a default that reads correctly when nobody opens
 * it.
 *
 * The picker is built from the company registry, never a typed list, so an
 * issuer that enters the recordings can be taught the day it appears.
 */

const categoryLabels: Record<UserInsight["category"], string> = {
  "missing-context": "Konteks yang belum masuk",
  "data-error": "Angka atau fakta yang keliru",
  "alternative-interpretation": "Cara membaca yang berbeda",
};

const pillarLabels: Record<PillarKey, string> = {
  concentration: "Konsentrasi",
  volume: "Volume",
  momentum: "Momentum",
  catalyst: "Katalis",
};

const NOTE_MIN = 8;
const NOTE_MAX = 800;

export function TeachAgent({ symbol, className }: { symbol?: SymbolCode; className?: string }) {
  const recordInsight = useCatalystStore((state) => state.recordInsight);
  const watchlist = useCatalystStore((state) => state.profile.watchlist);
  const options = useMemo(() => {
    // Only issuers Catalyst can actually analyse: a note filed against a
    // symbol with no recorded case would sit on the timeline pointing at a
    // page that does not exist. Watchlist first, then the rest of the
    // registry, so nothing that can be taught is hidden.
    const known = companies.filter((company) => company.analyzed).map((company) => company.symbol);
    const followed = watchlist.filter((item) => known.includes(item));
    return [...followed, ...known.filter((item) => !followed.includes(item))];
  }, [watchlist]);
  const nameOf = (code: SymbolCode) => companies.find((company) => company.symbol === code)?.name ?? code;

  const [target, setTarget] = useState<SymbolCode>(symbol ?? options[0]);
  const active = symbol ?? target;
  const [note, setNote] = useState("");
  const [sourceUrl, setSourceUrl] = useState("");
  const [category, setCategory] = useState<UserInsight["category"]>("missing-context");
  const [pillar, setPillar] = useState<PillarKey | "">("");
  const [touched, setTouched] = useState(false);
  const [saved, setSaved] = useState<SymbolCode | null>(null);

  const noteError = touched && note.trim().length < NOTE_MIN ? `Tulis sedikitnya ${NOTE_MIN} karakter agar catatan dapat diuji.` : "";
  const sourceError = sourceUrl && !/^https:\/\//i.test(sourceUrl) ? "Gunakan URL HTTPS agar referensi dapat dibuka dengan aman." : "";
  const noteId = `teach-note-${symbol ?? "pick"}`;
  const sourceId = `teach-source-${symbol ?? "pick"}`;
  const symbolId = `teach-symbol-${symbol ?? "pick"}`;
  const categoryId = `teach-category-${symbol ?? "pick"}`;
  const pillarId = `teach-pillar-${symbol ?? "pick"}`;

  const submit = (event: FormEvent) => {
    event.preventDefault();
    setTouched(true);
    if (note.trim().length < NOTE_MIN || sourceError) return;
    recordInsight({
      symbol: active,
      pillar: pillar || undefined,
      category,
      note: note.trim(),
      sourceUrl: sourceUrl.trim() || undefined,
    });
    setNote("");
    setSourceUrl("");
    setTouched(false);
    setSaved(active);
  };

  return (
    <Panel className={className}>
      <PanelHeader
        eyebrow="Mulai di sini"
        title={symbol ? `Ajari Catalyst tentang ${symbol}` : "Ajari Catalyst tentang satu saham"}
      />
      {/* Two columns so the box stays a band across the page instead of a tall
          tower with a column of air beside it: the ticker and the optional
          link on the left, the sentence the reader is actually writing on the
          right, where it gets the width. */}
      <form onSubmit={submit} className="grid gap-x-4 gap-y-3 p-4 lg:grid-cols-[minmax(200px,260px)_minmax(0,1fr)]">
        {/* Placed rather than stacked: on a phone the fields read in the order
            they are written (ticker, sentence, optional link), while on a wide
            screen the link drops under the ticker and the sentence keeps the
            whole right-hand column. */}
        <div className="lg:col-start-1 lg:row-start-1">
          {symbol ? (
            <div>
              <p className="text-xs font-medium">Saham</p>
              <p className="mt-1.5 flex h-11 items-center rounded-lg border border-border bg-background px-3 text-sm">
                <span className="font-mono font-semibold text-primary">{symbol}</span>
                <span className="ml-2 truncate text-muted-foreground">{nameOf(symbol)}</span>
              </p>
            </div>
          ) : (
            <label htmlFor={symbolId} className="block text-xs font-medium">
              Saham
              <select
                id={symbolId}
                // The wrapping label also contains the option text, so the visible
                // word is repeated here to keep the accessible name just "Saham".
                aria-label="Saham"
                value={target}
                onChange={(event) => { setTarget(event.target.value as SymbolCode); setSaved(null); }}
                className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
              >
                {options.map((code) => <option key={code} value={code}>{code} — {nameOf(code)}</option>)}
              </select>
            </label>
          )}
        </div>

        <div className="flex min-w-0 flex-col gap-2 lg:col-start-2 lg:row-start-1">
          <label htmlFor={noteId} className="block text-xs font-medium">Yang ingin Anda ajarkan</label>
          <textarea
            id={noteId}
            rows={4}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => { setNote(event.target.value); setSaved(null); }}
            onBlur={() => setTouched(true)}
            aria-describedby={`${noteId}-help${noteError ? ` ${noteId}-error` : ""}`}
            placeholder={`Contoh: pada ${active}, kenaikan volume tanpa berita biasanya tidak berarti apa-apa untuk saya.`}
            className="min-h-[104px] w-full flex-1 resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
          />
          <div id={`${noteId}-help`} className="flex flex-wrap items-center justify-between gap-2 text-[11px] text-muted-foreground">
            <span>Tulis dengan bahasa Anda sendiri. Tersimpan di peramban ini.</span>
            <span className="font-mono">{note.length}/{NOTE_MAX}</span>
          </div>
          {noteError ? <p id={`${noteId}-error`} role="alert" className="text-xs text-danger">{noteError}</p> : null}

        </div>

        <div className="lg:col-start-1 lg:row-start-2">
          <label htmlFor={sourceId} className="block text-xs font-medium">
            Tautan referensi (opsional)
            <input
              id={sourceId}
              type="url"
              value={sourceUrl}
              onChange={(event) => { setSourceUrl(event.target.value); setSaved(null); }}
              placeholder="https://..."
              aria-describedby={sourceError ? `${sourceId}-error` : undefined}
              className="mt-1.5 h-11 w-full rounded-lg border border-border bg-background px-3 font-mono text-xs outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
            />
          </label>
          {sourceError ? <p id={`${sourceId}-error`} role="alert" className="mt-1.5 text-xs text-danger">{sourceError}</p> : null}
        </div>

        <div className="lg:col-start-2 lg:row-start-2">
          <div className="flex flex-wrap items-center gap-3">
            <Button type="submit" disabled={note.trim().length < NOTE_MIN || Boolean(sourceError)}>
              <IconNote aria-hidden="true" className="size-4" />
              Ajarkan ke Catalyst
            </Button>
            <details className="min-w-0">
              <summary className="min-h-9 cursor-pointer py-2 text-xs font-medium text-muted-foreground hover:text-foreground">Opsi lanjutan</summary>
              <div className="mt-2 grid gap-3 rounded-lg border border-border p-3 sm:grid-cols-2">
                <label htmlFor={categoryId} className="text-xs font-medium">
                  Jenis masukan
                  <select id={categoryId} aria-label="Jenis masukan" value={category} onChange={(event) => setCategory(event.target.value as UserInsight["category"])} className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">
                    {(Object.keys(categoryLabels) as UserInsight["category"][]).map((item) => <option key={item} value={item}>{categoryLabels[item]}</option>)}
                  </select>
                </label>
                <label htmlFor={pillarId} className="text-xs font-medium">
                  Pilar terkait
                  <select id={pillarId} aria-label="Pilar terkait" value={pillar} onChange={(event) => setPillar(event.target.value as PillarKey | "")} className="mt-1.5 h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">
                    <option value="">Seluruh analisis</option>
                    {(Object.keys(pillarLabels) as PillarKey[]).map((item) => <option key={item} value={item}>{pillarLabels[item]}</option>)}
                  </select>
                </label>
              </div>
            </details>
            {saved ? (
              <p role="status" className="inline-flex items-center gap-1.5 text-xs text-positive">
                <IconCheck aria-hidden="true" className="size-4" />
                Tersimpan untuk {saved}
              </p>
            ) : null}
          </div>
        </div>
      </form>

      <div className="border-t border-border px-4 py-3">
        <p className="flex gap-2 rounded-lg border border-primary/20 bg-primary/7 p-3 text-xs leading-5 text-muted-foreground">
          <IconGate aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>Catatan Anda menjadi hipotesis terbuka: ia muncul pada analisis saham ini, tetapi tidak mengubah angka, rumus, atau sumber sebelum diperiksa.</span>
        </p>
      </div>
    </Panel>
  );
}
