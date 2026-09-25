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
  const [advanced, setAdvanced] = useState(false);
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
        title={symbol ? `Ajari Catalyst tentang ${symbol}` : "Ajari Catalyst tentang satu emiten"}
      />
      {/* Plain rows, top to bottom. An earlier two-column version left a hole
          in the left column whenever the textarea was taller than the field
          above it — the form has no side rail now, so there is nothing to
          leave empty. */}
      <form onSubmit={submit} className="space-y-4 p-4">
        <div className="grid gap-3 sm:grid-cols-2">
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

          <div>
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
        </div>

        <div>
          <div className="flex flex-wrap items-baseline justify-between gap-2">
            <label htmlFor={noteId} className="text-xs font-medium">Yang ingin Anda ajarkan</label>
            <span className="font-mono text-xs text-muted-foreground">{note.length}/{NOTE_MAX}</span>
          </div>
          <textarea
            id={noteId}
            rows={3}
            maxLength={NOTE_MAX}
            value={note}
            onChange={(event) => { setNote(event.target.value); setSaved(null); }}
            onBlur={() => setTouched(true)}
            aria-describedby={`${noteId}-help${noteError ? ` ${noteId}-error` : ""}`}
            placeholder={`Contoh: pada ${active}, kenaikan volume tanpa berita biasanya tidak berarti apa-apa untuk saya.`}
            className="mt-1.5 w-full resize-y rounded-lg border border-border bg-background px-3 py-2.5 text-sm leading-6 outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25"
          />
          {noteError ? <p id={`${noteId}-error`} role="alert" className="mt-1.5 text-xs text-danger">{noteError}</p> : null}
        </div>

        <div className="flex flex-wrap items-center gap-3">
          <Button type="submit" disabled={note.trim().length < NOTE_MIN || Boolean(sourceError)}>
            <IconNote aria-hidden="true" className="size-4" />
            Ajarkan ke Catalyst
          </Button>
          <button
            type="button"
            aria-expanded={advanced}
            onClick={() => setAdvanced((current) => !current)}
            className="min-h-9 text-xs font-medium text-muted-foreground hover:text-foreground"
          >
            {advanced ? "Sembunyikan opsi lanjutan" : "Opsi lanjutan"}
          </button>
          {saved ? (
            <p role="status" className="inline-flex items-center gap-1.5 text-xs text-positive">
              <IconCheck aria-hidden="true" className="size-4" />
              Tersimpan untuk {saved}
            </p>
          ) : null}
          <p id={`${noteId}-help`} className="ml-auto text-xs text-muted-foreground">Tersimpan di peramban ini.</p>
        </div>

        {advanced ? (
          <div className="grid gap-3 border-t border-border pt-4 sm:grid-cols-2">
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
        ) : null}

        <p className="flex gap-2 border-t border-border pt-3 text-xs leading-5 text-muted-foreground">
          <IconGate aria-hidden="true" className="mt-0.5 size-4 shrink-0 text-primary" />
          <span>Catatan Anda langsung diterima dan diproses: ia muncul pada analisis emiten ini sebagai konteks, tetapi tidak mengubah angka, rumus, atau sumber.</span>
        </p>
      </form>
    </Panel>
  );
}
