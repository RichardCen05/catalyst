"use client";
import { fuzzyIncludes } from "@/lib/text/fuzzy";

import { useCallback, useEffect, useRef, useState, type ReactNode } from "react";
import { PageHeader } from "@/components/page-header";
import { apiUrl } from "@/lib/api-base";
import { companies, primarySymbol } from "@/lib/data/fixtures";
import { WEB_WATCH_PATH_MIN_CHARS, WEB_WATCH_REASON_MIN_CHARS } from "@/lib/schemas";
import { bandForRelevance } from "@/lib/agent/thresholds";
import { uiLabel } from "@/lib/ui-labels";
import { EventMarkers } from "@/components/event-markers";
import { NextStep } from "@/components/next-step";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import { cn, formatWib } from "@/lib/utils";
import type { MarketEvent, SymbolCode } from "@/lib/types";
import type { ScreenCheck, TriageMatch, TriageProposal } from "@/lib/web-watch/queue";
import { splitMatchEvidence, TRIAGE_RULE_LABEL, type MatchKind, type TriageRule } from "@/lib/web-watch/triage";

/** The fields this page reads. `/api/web-watch` also returns poll counters and
 *  a status enum, which the crawler's own ops route reports; a reviewer does
 *  not act on either, so they are not read here. */
interface SourceRow {
  id: string;
  label: string;
  kind: string;
  lastError: string | null;
  lastCheckedAt: string | null;
  health: { window: number; noisy: number; share: number; suggestDisable: boolean } | null;
}

interface ArchivedRow {
  id: string;
  title: string;
  provider: string | null;
  url: string | null;
  rule: TriageRule;
  reason: string;
  at: string;
}

interface AutoAcceptedRow {
  id: string;
  title: string;
  url: string | null;
  provider: string | null;
  decidedAt: string;
  impacts: Array<{ symbol: string; direction: string; band: string; path: string; rationale: string }>;
}

interface AutoRejectedRow {
  id: string;
  title: string | null;
  url: string | null;
  decidedAt: string;
  check: ScreenCheck | null;
  span: string | null;
  score: number | null;
  reason: string;
}

interface SuspectedRow {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  category: string;
  publishedAt: string;
  provider: string | null;
  url: string | null;
  check: ScreenCheck | null;
  span: string | null;
  score: number | null;
  reason: string;
  at: string;
  legacy: boolean;
}

interface ResidualRow {
  id: string;
  reason: string;
  at: string;
}

interface AutoAcceptStatus {
  enabled: boolean;
  source: string;
  pinnedByEnv: boolean;
  dailyMax: number;
  usedToday: number;
}

interface ImpactDraft {
  symbol: string;
  direction: "Supported" | "Adverse" | "Mixed" | "Unrelated";
  band: "high" | "medium" | "low";
  path: string;
}

interface QueueData {
  sources: SourceRow[];
  pending: MarketEvent[];
  matches: Record<string, TriageMatch>;
  proposals: Record<string, TriageProposal>;
  batchable: string[];
  archived: ArchivedRow[];
  accepted: MarketEvent[];
  residual?: ResidualRow[];
  autoAccepted: AutoAcceptedRow[];
  autoRejected?: AutoRejectedRow[];
  suspected?: SuspectedRow[];
  autoAccept: AutoAcceptStatus;
  decidedCount: number;
  /** When the screen last applied verdicts; null when it has never run. */
  lastScreenAt?: string | null;
  symbols: SymbolCode[];
  bands: Record<ImpactDraft["band"], number>;
  unavailable?: boolean;
}

type PantauTab = "diterima" | "antrean" | "rumor";

/** The three tabs of the Berita page, like Riset & Analisis. Labels stay
 *  static so the chrome registry indexes them; counts render beside them. */
const tabs: Array<{ value: PantauTab; label: string }> = [
  { value: "diterima", label: "Diterima" },
  { value: "antrean", label: "Antrean" },
  { value: "rumor", label: "Terindikasi Rumor" },
];

const DIRECTIONS: ImpactDraft["direction"][] = ["Supported", "Adverse", "Mixed", "Unrelated"];
const BANDS: ImpactDraft["band"][] = ["high", "medium", "low"];
const BAND_ORDER: Record<ImpactDraft["band"], number> = { high: 0, medium: 1, low: 2 };
const bandLabel: Record<ImpactDraft["band"], string> = { high: "Tinggi", medium: "Sedang", low: "Rendah" };
const directionLabel: Record<ImpactDraft["direction"], string> = {
  Supported: "Mendukung",
  Adverse: "Berlawanan",
  Mixed: "Bercampur",
  Unrelated: "Tidak terkait",
};

/** Names for the evidence kinds triage records. Field labels, true of every case. */
const matchLabel: Record<MatchKind, string> = {
  symbol: "kode",
  name: "nama",
  sector: "sektor",
  subsector: "subsektor",
  source: "sumber",
  region: "wilayah",
  weather: "cuaca",
};

/** Names for the screen checks a verdict records. Field labels, true of every case. */
const checkLabel: Record<ScreenCheck, string> = {
  rumor: "rumor",
  "misleading-title": "judul tidak sesuai isi",
  figure: "angka bertentangan dengan rekaman",
  substance: "tanpa isi konkret",
  relevance: "tidak relevan bagi emiten",
};
/** How many rows a long list shows before a reviewer asks for the rest. Layout,
 *  not a decision threshold: it hides nothing the engine reads. */
const COLLAPSED_ROWS = 3;

/** First rows of a long list plus a toggle for the remainder. */
function Collapsible<T>({ items, render }: { items: T[]; render: (item: T) => ReactNode }) {
  const [open, setOpen] = useState(false);
  const shown = open ? items : items.slice(0, COLLAPSED_ROWS);
  const hidden = items.length - COLLAPSED_ROWS;
  return (
    <>
      {shown.map(render)}
      {hidden > 0 ? (
        <Button variant="secondary" size="sm" aria-expanded={open} onClick={() => setOpen(!open)} className="w-full">
          {open ? "Tampilkan lebih sedikit" : `Tampilkan ${hidden} lainnya`}
        </Button>
      ) : null}
    </>
  );
}

type ProposalImpact = TriageProposal["impacts"][number];
const mapsSomething = (impact: ProposalImpact) => impact.direction !== "Unrelated";
const toDraft = ({ symbol, direction, band, path }: ProposalImpact): ImpactDraft => ({
  symbol,
  direction: direction as ImpactDraft["direction"],
  band,
  path,
});

/** Best band among the impacts that map something; unrelated-only sorts last. */
function proposalRank(proposal: TriageProposal | undefined): number {
  if (!proposal) return Number.POSITIVE_INFINITY;
  const related = proposal.impacts.filter(mapsSomething);
  if (!related.length) return BANDS.length;
  return Math.min(...related.map((impact) => BAND_ORDER[impact.band]));
}

/**
 * The registry stores legal names — "Aneka Tambang Tbk.", "PT Bank Central
 * Asia Tbk." — and a headline never writes one. Matching on the full string
 * therefore never fired; the corporate wrapper comes off so the distinctive
 * part of the name is what gets compared.
 */
function tradingName(name: string): string {
  return name.replace(/^PT\s+/i, "").replace(/\s+Tbk\.?$/i, "").trim().toUpperCase();
}

/**
 * Which emiten a queue candidate is about, before a reviewer has mapped it.
 *
 * Pending candidates carry no impact links yet — mapping is the decision the
 * reviewer is here to make — so the only evidence is the text the crawler
 * kept: the ticker as its own word, or the registry's name for the company
 * behind it. Both come from the registry; neither is a per-symbol table.
 */
function mentionsSymbol(candidate: MarketEvent, symbol: SymbolCode, match?: TriageMatch): boolean {
  if (candidate.impactLinks.some((link) => link.symbol === symbol)) return true;
  if (match?.symbols.includes(symbol)) return true;
  const haystack = `${candidate.title} ${candidate.summary} ${candidate.body ?? ""}`.toUpperCase();
  const name = companies.find((company) => company.symbol === symbol)?.name;
  const named = name ? tradingName(name) : "";
  if (named && haystack.includes(named)) return true;
  return new RegExp(`\\b${symbol.replace(/[^\p{L}\p{N}]/gu, "")}\\b`).test(haystack);
}

/**
 * A rejected review names the field it tripped on.
 *
 * `/api/web-watch` answers a schema failure with zod's flattened errors, and
 * the form used to drop them: every bad row, missing reason and short path
 * read the same "Masukan review tidak valid", which tells a reviewer nothing
 * about which box to fix. The issue text comes from the route, so nothing is
 * re-stated here.
 */
function fieldMessage(data: unknown): string | null {
  if (!data || typeof data !== "object") return null;
  const details = (data as { details?: { formErrors?: string[]; fieldErrors?: Record<string, string[] | undefined> } }).details;
  if (!details) return null;
  const fields = Object.entries(details.fieldErrors ?? {}).flatMap(([field, issues]) =>
    (issues ?? []).map((issue) => `${field}: ${issue}`),
  );
  const all = [...(details.formErrors ?? []), ...fields];
  return all.length ? all.join(" · ") : null;
}

/** Same bound the route enforces, read from the schema rather than retyped. */
function pathIsShort(path: string): boolean {
  return path.trim().length < WEB_WATCH_PATH_MIN_CHARS;
}

function CandidateCard({
  candidate,
  symbols,
  bands,
  match,
  proposal,
  residual,
  onDecided,
}: {
  candidate: MarketEvent;
  symbols: SymbolCode[];
  bands: QueueData["bands"];
  match?: TriageMatch;
  proposal?: TriageProposal;
  residual?: ResidualRow;
  onDecided: () => void;
}) {
  const related = proposal?.impacts.filter(mapsSomething) ?? [];
  const unrelated = proposal?.impacts.filter((impact) => !mapsSomething(impact)) ?? [];
  const [impacts, setImpacts] = useState<ImpactDraft[]>(
    related.length ? related.map(toDraft) : [{ symbol: match?.symbols[0] ?? symbols[0] ?? primarySymbol, direction: "Supported", band: "medium", path: "" }],
  );
  const [reason, setReason] = useState("");
  const [dismissReason, setDismissReason] = useState("");
  const [showAccept, setShowAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceUrl = candidate.citations[0]?.url;
  const unmappedRows = impacts.filter((impact) => pathIsShort(impact.path)).length;
  const dismissTooShort = dismissReason.trim().length < WEB_WATCH_REASON_MIN_CHARS;

  const post = useCallback(
    async (payload: Record<string, unknown>) => {
      setBusy(true);
      setError(null);
      try {
        const response = await fetch(apiUrl("/api/web-watch"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify(payload),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(fieldMessage(data) ?? data.error ?? "Gagal menyimpan");
        onDecided();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan");
      } finally {
        setBusy(false);
      }
    },
    [onDecided],
  );

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-0.5">{candidate.category}</span>
        <span>{candidate.citations[0]?.provider ?? "sumber web"}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={candidate.publishedAt}>{candidate.publishedAt.slice(0, 10)}</time>
        {sourceUrl ? (
          <a href={sourceUrl} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Buka sumber asal
          </a>
        ) : null}
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">{candidate.title}</h3>
      {residual ? (
        <p className="mt-1 rounded-lg bg-muted p-2 text-xs leading-5 text-foreground">
          Penyaring belum yakin: {residual.reason}
        </p>
      ) : null}
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{candidate.summary}</p>
      {candidate.body ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat isi terekstrak</summary>
          <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-5">{candidate.body.slice(0, 3000)}</p>
        </details>
      ) : null}

      {match && splitMatchEvidence(match).text.length ? (
        <p className="mt-2 text-xs text-muted-foreground">
          Cocok dengan:{" "}
          {splitMatchEvidence(match).text.slice(0, 6).map((evidence, index) => (
            <span key={`${evidence.symbol}-${evidence.by}-${index}`}>
              {index ? " · " : ""}
              <span className="font-mono">{evidence.symbol}</span> ({matchLabel[evidence.by]}: {evidence.term})
            </span>
          ))}
        </p>
      ) : null}
      {match && splitMatchEvidence(match).declaredOnly.length ? (
        <p className="mt-1 text-xs text-muted-foreground">
          Dideklarasikan sumber, tidak disebut teks:{" "}
          <span className="font-mono">{splitMatchEvidence(match).declaredOnly.join(" · ")}</span>
        </p>
      ) : null}

      {proposal ? (
        <section aria-label="Usulan model" className="mt-4 rounded-lg border border-border bg-muted/40 p-3">
          <h4 className="text-sm font-semibold">Usulan model</h4>
          <p className="mt-0.5 text-xs text-muted-foreground">
            Lolos pemeriksaan angka, bahasa, dan kaitannya dengan sumber. Belum masuk analisis sampai Anda menerimanya.
          </p>
          <ul className="mt-2 space-y-2 text-sm">
            {proposal.impacts.map((impact) => (
              <li key={impact.symbol}>
                <span className="font-mono font-semibold">{impact.symbol}</span> · {directionLabel[impact.direction as ImpactDraft["direction"]] ?? impact.direction} · {bandLabel[impact.band] ?? impact.band}
                <p className="text-xs leading-5 text-muted-foreground">{impact.path}</p>
                <p className="text-xs leading-5 text-muted-foreground">{impact.rationale}</p>
              </li>
            ))}
          </ul>
          <div className="mt-3 flex flex-wrap gap-2">
            {related.length ? (
              <>
                <Button
                  disabled={busy}
                  onClick={() => post({ action: "accept", candidateId: candidate.id, impacts: related.map(toDraft), viaProposal: true })}
                >
                  {busy ? "Menyimpan…" : "Terima usulan"}
                </Button>
              </>
            ) : (
              <Button
                variant="secondary"
                disabled={busy}
                onClick={() =>
                  post({
                    action: "dismiss",
                    candidateId: candidate.id,
                    reason: `Usulan model: tidak terkait dengan ${unrelated.map((impact) => impact.symbol).join(", ")}.`,
                  })
                }
              >
                Tolak: tidak terkait
              </Button>
            )}
            {!showAccept ? (
              <Button variant="secondary" disabled={busy} onClick={() => setShowAccept(true)}>Edit</Button>
            ) : null}
          </div>
        </section>
      ) : null}

      {/* With a proposal on the card, the manual form stays closed until the
          reviewer asks to edit it; without one it is the only way to accept. */}
      {!proposal || showAccept ? (
      <div className="mt-4 border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Terima — petakan ke emiten</h4>
        {!showAccept ? (
          <div className="mt-2">
            <Button disabled={busy} onClick={() => setShowAccept(true)}>Petakan dampak</Button>
          </div>
        ) : (
          <>
        <p className="mt-0.5 text-xs text-muted-foreground">Band relevansi dipilih peninjau di sini, bukan dihitung mesin: {BANDS.map((band) => `${bandLabel[band].toLowerCase()} ${bands[band]}`).join(" · ")}.</p>
        <div className="mt-2 space-y-2">
          {impacts.map((impact, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[110px_130px_110px_minmax(0,1fr)_auto]">
              <select
                aria-label={`Emiten ${index + 1}`}
                value={impact.symbol}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, symbol: event.target.value } : row)))}
                className="h-10 rounded-lg border border-border bg-surface px-2 font-mono text-sm outline-none focus:border-primary"
              >
                {symbols.map((symbol) => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
              <select
                aria-label={`Arah ${index + 1}`}
                value={impact.direction}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, direction: event.target.value as ImpactDraft["direction"] } : row)))}
                className="h-10 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
              >
                {DIRECTIONS.map((direction) => (
                  <option key={direction} value={direction}>{directionLabel[direction]}</option>
                ))}
              </select>
              <select
                aria-label={`Band ${index + 1}`}
                value={impact.band}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, band: event.target.value as ImpactDraft["band"] } : row)))}
                className="h-10 rounded-lg border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
              >
                {BANDS.map((band) => (
                  <option key={band} value={band}>{bandLabel[band]} · {bands[band]}</option>
                ))}
              </select>
              <input
                aria-label={`Jalur eksposur ${index + 1}`}
                value={impact.path}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, path: event.target.value } : row)))}
                placeholder="Jalur eksposur, mis. ICP naik → lifting cost ADRO → margin"
                aria-invalid={pathIsShort(impact.path)}
                className={`h-10 rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary ${pathIsShort(impact.path) ? "border-red-500" : "border-border"}`}
              />
              <Button
                variant="ghost"
                size="icon"
                aria-label={`Hapus baris ${index + 1}`}
                disabled={impacts.length <= 1 || busy}
                onClick={() => setImpacts(impacts.filter((_, i) => i !== index))}
              >
                ×
              </Button>
            </div>
          ))}
        </div>
        <div className="mt-2 flex flex-wrap gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => setImpacts([...impacts, { symbol: symbols[0] ?? primarySymbol, direction: "Supported", band: "medium", path: "" }])}>
            + Tambah emiten
          </Button>
        </div>
        <input
          aria-label="Catatan peninjau"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Catatan peninjau (opsional)"
          className="mt-2 h-10 w-full rounded-lg border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
        />
        {unmappedRows > 0 ? (
          <p className="mt-2 text-xs text-muted-foreground">
            Setiap baris butuh jalur eksposur minimal {WEB_WATCH_PATH_MIN_CHARS} karakter. Belum terisi: {unmappedRows}.
          </p>
        ) : null}
        <div className="mt-2">
          <Button
            disabled={busy || unmappedRows > 0}
            onClick={() =>
              post({
                action: "accept",
                candidateId: candidate.id,
                impacts,
                reason: reason || undefined,
                ...(proposal && JSON.stringify(impacts) === JSON.stringify(related.map(toDraft)) ? { viaProposal: true } : {}),
              })
            }
          >
            {busy ? "Menyimpan…" : "Terima ke analisis"}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setShowAccept(false)} className="ml-2">
            Batal
          </Button>
        </div>
          </>
        )}
      </div>
      ) : null}

      <div className="mt-4 border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Tolak</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            aria-label="Alasan penolakan"
            value={dismissReason}
            onChange={(event) => setDismissReason(event.target.value)}
            placeholder="Alasan (wajib), mis. tidak material untuk watchlist"
            aria-invalid={dismissTooShort}
            className={`h-10 min-w-52 flex-1 rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary ${dismissTooShort && dismissReason.length > 0 ? "border-red-500" : "border-border"}`}
          />
          <Button
            variant="ghost"
            disabled={busy || dismissTooShort}
            onClick={() => post({ action: "dismiss", candidateId: candidate.id, reason: dismissReason })}
          >
            Tolak
          </Button>
        </div>
        {dismissTooShort ? (
          <p className="mt-2 text-xs text-muted-foreground">Alasan penolakan minimal {WEB_WATCH_REASON_MIN_CHARS} karakter.</p>
        ) : null}
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-red-500">{error}</p> : null}
    </Panel>
  );
}

/**
 * Accept every high-band verified proposal at once, after a confirm that
 * lists each one. A native <dialog>: focus moves in, Esc closes, and the
 * page behind is inert while it is open.
 */
function BatchAccept({ candidates, proposals, onDone }: { candidates: MarketEvent[]; proposals: QueueData["proposals"]; onDone: () => void }) {
  const dialog = useRef<HTMLDialogElement>(null);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  if (!candidates.length) return null;
  const confirm = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/web-watch"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "accept-proposals", candidateIds: candidates.map((candidate) => candidate.id) }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(fieldMessage(body) ?? body.error ?? "Gagal menyimpan");
      dialog.current?.close();
      onDone();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal menyimpan");
    } finally {
      setBusy(false);
    }
  };
  return (
    <>
      <Button variant="secondary" size="sm" onClick={() => dialog.current?.showModal()}>
        Terima usulan relevansi tinggi ({candidates.length})
      </Button>
      <dialog
        ref={dialog}
        aria-labelledby="batch-accept-title"
        className="m-auto w-[min(640px,calc(100vw-32px))] rounded-lg border border-border bg-surface p-5 text-foreground backdrop:bg-black/40"
      >
        <h2 id="batch-accept-title" className="text-base font-semibold">Terima {candidates.length} usulan sekaligus?</h2>
        <p className="mt-1 text-sm text-muted-foreground">Setiap kandidat dicatat sebagai keputusan Anda, satu per satu. Hanya usulan berelevansi tinggi yang lolos pemeriksaan.</p>
        <ul className="mt-3 max-h-72 space-y-2 overflow-auto text-sm">
          {candidates.map((candidate) => (
            <li key={candidate.id}>
              <p className="font-medium leading-snug">{candidate.title}</p>
              <p className="text-xs text-muted-foreground">
                {proposals[candidate.id]?.impacts.map((impact) => `${impact.symbol} · ${directionLabel[impact.direction as ImpactDraft["direction"]] ?? impact.direction}`).join(" · ")}
              </p>
            </li>
          ))}
        </ul>
        {error ? <p role="alert" className="mt-2 text-sm text-red-500">{error}</p> : null}
        <div className="mt-4 flex flex-wrap justify-end gap-2">
          <Button variant="ghost" disabled={busy} onClick={() => dialog.current?.close()}>Batal</Button>
          <Button disabled={busy} onClick={confirm}>{busy ? "Menyimpan…" : `Terima ${candidates.length} usulan`}</Button>
        </div>
      </dialog>
    </>
  );
}

function ArchivedList({ items }: { items: ArchivedRow[] }) {
  return (
    <details aria-label="Diarsipkan otomatis" className="rounded-lg border border-border bg-surface">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        Diarsipkan otomatis ({items.length})
      </summary>
      <div className="border-t border-border p-4">
        <p className="text-xs text-muted-foreground">Disisihkan oleh aturan triase, bukan oleh peninjau. Tidak ada yang dihapus, tetapi arsip final: calon di sini tidak kembali ke antrean.</p>
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="border-b border-border pb-3 last:border-0">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  <span className="rounded-full border border-border px-2 py-0.5">{TRIAGE_RULE_LABEL[item.rule] ?? item.rule}</span>{" "}
                  {item.provider ?? "sumber web"} · <time dateTime={item.at}>{item.at.slice(0, 10)}</time>
                  {item.url ? (
                    <>
                      {" · "}
                      <a href={item.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">Buka sumber asal</a>
                    </>
                  ) : null}
                </p>
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p>
              </div>
            </li>
          ))}
        </ul>
        {!items.length ? <p className="mt-3 text-sm text-muted-foreground">Belum ada yang diarsipkan.</p> : null}
      </div>
    </details>
  );
}

function AutoAcceptSwitch({ status, lastScreenAt, onChanged }: { status: AutoAcceptStatus; lastScreenAt: string | null; onChanged: () => void }) {
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const flip = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/web-watch"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "set-auto-accept", enabled: !status.enabled }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Gagal mengubah sakelar");
      onChanged();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengubah sakelar");
    } finally {
      setBusy(false);
    }
  };
  return (
    <Panel className="p-4" aria-label="Putuskan otomatis">
      <div className="flex items-center gap-3">
        <button
          type="button"
          role="switch"
          aria-checked={status.enabled}
          aria-label="Putuskan otomatis hasil penyaringan"
          disabled={busy || status.pinnedByEnv}
          onClick={() => void flip()}
          className={cn("relative h-6 w-11 shrink-0 rounded-full transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring disabled:opacity-50", status.enabled ? "bg-foreground" : "bg-border-strong")}
        >
          <span className={cn("absolute top-0.5 size-5 rounded-full bg-background shadow transition-all", status.enabled ? "left-[22px]" : "left-0.5")} />
        </button>
        <div className="min-w-0">
          <p className="text-sm font-semibold">Putuskan otomatis</p>
          <p className="text-xs text-subtle-foreground">
            {status.enabled ? "Aktif" : "Mati"} · {status.usedToday} dari batas {status.dailyMax} keputusan otomatis dalam 24 jam terakhir{status.pinnedByEnv ? " · dikunci operator" : ""}
          </p>
        </div>
      </div>
      <div className="mt-2 text-xs leading-5 text-muted-foreground">
        <p>Penyaring membaca setiap calon di antrean, lalu:</p>
        <ul className="mt-1 list-disc space-y-0.5 pl-5">
          <li>Terindikasi rumor atau judul menyesatkan: masuk tab Terindikasi Rumor, Anda yang memutuskan.</li>
          <li>Bertentangan dengan angka rekaman: ditolak langsung. Tanpa isi konkret atau tidak relevan: ditolak langsung hanya bila pemeriksaannya sudah terkalibrasi pada label peninjau; sebelum itu menunggu keputusan Anda. Penolakan yang keliru bisa Anda kembalikan ke antrean.</li>
          <li>Diterima otomatis hanya bila semua pemeriksaan bersih dan setiap emitennya punya arah jelas (menguatkan atau menekan), dengan relevansi tinggi atau sedang bila disebut di teks, atau relevansi tinggi bila dicantumkan sumbernya.</li>
          <li>Selebihnya menunggu keputusan Anda. Setiap penerimaan otomatis bisa dibatalkan.</li>
        </ul>
      </div>
      <p className="mt-1 text-xs text-subtle-foreground">
        {lastScreenAt ? (
          <>
            Penyaringan terakhir: <time dateTime={lastScreenAt}>{formatWib(lastScreenAt)}</time>
          </>
        ) : (
          "Penyaring belum pernah berjalan. Semua calon menunggu keputusan Anda."
        )}
      </p>
      {error ? <p role="alert" className="mt-2 text-sm text-red-500">{error}</p> : null}
    </Panel>
  );
}

function AutoDecidedList({ items, rejected, onReverted }: { items: AutoAcceptedRow[]; rejected: AutoRejectedRow[]; onReverted: () => void }) {
  const [busy, setBusy] = useState<string | null>(null);
  const [error, setError] = useState<string | null>(null);
  if (!items.length && !rejected.length) return null;
  const revert = async (id: string) => {
    setBusy(id);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/web-watch"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "revert-auto", candidateId: id }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(body.error ?? "Gagal membatalkan");
      onReverted();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal membatalkan");
    } finally {
      setBusy(null);
    }
  };
  return (
    <details aria-label="Diputuskan otomatis" className="rounded-lg border border-border bg-surface">
      <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
        Diputuskan otomatis ({items.length + rejected.length})
      </summary>
      <div className="border-t border-border p-4">
        <section aria-label="Diterima otomatis">
        <h3 className="text-sm font-semibold">Diterima otomatis ({items.length})</h3>
        <p className="mt-0.5 text-xs text-muted-foreground">Diterima oleh penyaring, bukan oleh peninjau. Batalkan untuk mengeluarkannya dari analisis dan mengembalikannya ke antrean; item itu tidak akan diputuskan otomatis lagi.</p>
        {error ? <p role="alert" className="mt-2 text-sm text-red-500">{error}</p> : null}
        <ul className="mt-3 space-y-3">
          {items.map((item) => (
            <li key={item.id} className="flex flex-col gap-2 border-b border-border pb-3 last:border-0 sm:flex-row sm:items-start sm:justify-between">
              <div className="min-w-0">
                <p className="text-sm font-medium leading-snug">{item.title}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.provider ?? "sumber web"} · <time dateTime={item.decidedAt}>{formatWib(item.decidedAt)}</time>
                  {item.url ? (
                    <>
                      {" · "}
                      <a href={item.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">Buka sumber asal</a>
                    </>
                  ) : null}
                </p>
                <ul className="mt-1 space-y-1 text-xs leading-5 text-muted-foreground">
                  {item.impacts.map((impact) => (
                    <li key={impact.symbol}>
                      <span className="font-mono">{impact.symbol}</span> · {directionLabel[impact.direction as ImpactDraft["direction"]] ?? impact.direction} — {impact.path}
                    </li>
                  ))}
                </ul>
              </div>
              <Button variant="secondary" size="sm" disabled={busy !== null} onClick={() => revert(item.id)} className="shrink-0">
                {busy === item.id ? "Membatalkan…" : "Batalkan"}
              </Button>
            </li>
          ))}
        </ul>
        {!items.length ? <p className="mt-3 text-sm text-muted-foreground">Belum ada yang diterima otomatis.</p> : null}
        </section>
        <section aria-label="Ditolak otomatis" className="mt-6">
          <h3 className="text-sm font-semibold">Ditolak otomatis ({rejected.length})</h3>
          <p className="mt-0.5 text-xs text-muted-foreground">Ditolak oleh penyaring selain rumor — tanpa isi konkret, angka bertentangan dengan rekaman, atau tidak relevan. Penyaring tidak membatalkannya sendiri; bila penolakan keliru, tulis alasannya lalu kembalikan ke antrean, dan item itu tidak akan diputuskan otomatis lagi. Temuan rumor tidak ada di sini, melainkan di tab Terindikasi Rumor. Pemeriksaan yang memutuskan dan kalimat yang dibacanya ditampilkan apa adanya.</p>
          <ul className="mt-3 space-y-3">
            {rejected.map((item) => (
              <li key={item.id} className="border-b border-border pb-3 last:border-0">
                <p className="text-sm font-medium leading-snug">{item.title ?? item.id}</p>
                <p className="mt-0.5 text-xs text-muted-foreground">
                  {item.check ? <span className="rounded-full border border-border px-2 py-0.5">{checkLabel[item.check] ?? item.check}</span> : null}{" "}
                  <time dateTime={item.decidedAt}>{formatWib(item.decidedAt)}</time>
                  {item.url ? (
                    <>
                      {" · "}
                      <a href={item.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">Buka sumber asal</a>
                    </>
                  ) : null}
                </p>
                {item.span ? <blockquote className="mt-1 border-l-2 border-border pl-2 text-xs leading-5 text-muted-foreground">{item.span}</blockquote> : null}
                <p className="mt-1 text-xs leading-5 text-muted-foreground">{item.reason}</p>
                <RestoreRejected id={item.id} onRestored={onReverted} />
              </li>
            ))}
          </ul>
          {!rejected.length ? <p className="mt-3 text-sm text-muted-foreground">Belum ada yang ditolak otomatis.</p> : null}
        </section>
      </div>
    </details>
  );
}

function RestoreRejected({ id, onRestored }: { id: string; onRestored: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const tooShort = reason.trim().length < WEB_WATCH_REASON_MIN_CHARS;
  const restore = async () => {
    setBusy(true);
    setError(null);
    try {
      const response = await fetch(apiUrl("/api/web-watch"), {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ action: "restore-reject", candidateId: id, reason }),
      });
      const body = await response.json();
      if (!response.ok) throw new Error(fieldMessage(body) ?? body.error ?? "Gagal mengembalikan");
      onRestored();
    } catch (err) {
      setError(err instanceof Error ? err.message : "Gagal mengembalikan");
    } finally {
      setBusy(false);
    }
  };
  return (
    <div className="mt-2 flex flex-wrap gap-2">
      <input
        aria-label="Alasan mengembalikan ke antrean"
        value={reason}
        onChange={(event) => setReason(event.target.value)}
        placeholder="Alasan (wajib), mis. beritanya menyangkut emiten yang dipantau"
        aria-invalid={tooShort && reason.length > 0}
        className={`h-9 min-w-52 flex-1 rounded-lg border bg-surface px-3 text-xs outline-none focus:border-primary ${tooShort && reason.length > 0 ? "border-red-500" : "border-border"}`}
      />
      <Button variant="secondary" size="sm" disabled={busy || tooShort} onClick={restore} className="shrink-0">
        {busy ? "Mengembalikan…" : "Kembalikan ke antrean"}
      </Button>
      {error ? <p role="alert" className="w-full text-xs text-red-500">{error}</p> : null}
    </div>
  );
}

function SuspectedCard({ item, onResolved, onDisputed }: { item: SuspectedRow; onResolved: () => void; onDisputed: () => void }) {
  const [reason, setReason] = useState("");
  const [busy, setBusy] = useState<"dispute" | "dismiss" | null>(null);
  const [error, setError] = useState<string | null>(null);
  const tooShort = reason.trim().length < WEB_WATCH_REASON_MIN_CHARS;

  const post = useCallback(
    async (action: "dispute-rumor" | "dismiss-suspected") => {
      setBusy(action === "dispute-rumor" ? "dispute" : "dismiss");
      setError(null);
      try {
        const response = await fetch(apiUrl("/api/web-watch"), {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ action, candidateId: item.id, reason }),
        });
        const data = await response.json();
        if (!response.ok) throw new Error(fieldMessage(data) ?? data.error ?? "Gagal menyimpan");
        if (action === "dispute-rumor") onDisputed();
        else onResolved();
      } catch (err) {
        setError(err instanceof Error ? err.message : "Gagal menyimpan");
      } finally {
        setBusy(null);
      }
    },
    [item.id, reason, onDisputed, onResolved],
  );

  return (
    <Panel className="p-5">
      <div className="flex flex-wrap items-center gap-2 text-xs text-muted-foreground">
        <span className="rounded-full border border-border px-2 py-0.5">{item.category}</span>
        {item.check ? <span className="rounded-full border border-border px-2 py-0.5">Terindikasi {checkLabel[item.check] ?? item.check}</span> : null}
        {item.legacy ? <span className="rounded-full border border-border px-2 py-0.5">Arsip lama</span> : null}
        <span>{item.provider ?? "sumber web"}</span>
        <span aria-hidden="true">·</span>
        <time dateTime={item.publishedAt}>{item.publishedAt.slice(0, 10)}</time>
        {item.url ? (
          <a href={item.url} target="_blank" rel="noreferrer" className="underline underline-offset-2 hover:text-foreground">
            Buka sumber asal
          </a>
        ) : null}
      </div>
      <h3 className="mt-2 text-base font-semibold leading-snug">{item.title}</h3>
      <p className="mt-1 rounded-lg bg-muted p-2 text-xs leading-5 text-foreground">
        Penyaring: {item.reason}
      </p>
      {item.span ? <blockquote className="mt-1 border-l-2 border-border pl-2 text-xs leading-5 text-muted-foreground">{item.span}</blockquote> : null}
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{item.summary}</p>
      {item.body ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat isi terekstrak</summary>
          <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-lg bg-muted p-3 text-xs leading-5">{item.body.slice(0, 3000)}</p>
        </details>
      ) : item.legacy ? (
        <p className="mt-2 text-xs text-muted-foreground">Isi lengkap tidak tersimpan untuk temuan lama ini — hanya judul dan alasan penyaring. Bantah untuk membawanya ke antrean, lalu petakan manual di sana.</p>
      ) : null}

      <div className="mt-4 border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Keputusan Anda</h4>
        <p className="mt-0.5 text-xs text-muted-foreground">
          Lihat berita ini di media sosial dan ingin memeriksa ulang dengan Catalyst? Pilih Bukan rumor bila beritanya layak ditelusuri — ia kembali ke Antrean untuk dipetakan. Pilih Tolak bila memang rumor.
        </p>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            aria-label="Alasan keputusan rumor"
            value={reason}
            onChange={(event) => setReason(event.target.value)}
            placeholder="Alasan (wajib), mis. ada pernyataan resmi emiten"
            aria-invalid={tooShort && reason.length > 0}
            className={`h-10 min-w-52 flex-1 rounded-lg border bg-surface px-3 text-sm outline-none focus:border-primary ${tooShort && reason.length > 0 ? "border-red-500" : "border-border"}`}
          />
        </div>
        {tooShort ? (
          <p className="mt-2 text-xs text-muted-foreground">Alasan minimal {WEB_WATCH_REASON_MIN_CHARS} karakter.</p>
        ) : null}
        <div className="mt-2 flex flex-wrap gap-2">
          <Button disabled={busy !== null || tooShort} onClick={() => post("dispute-rumor")}>
            {busy === "dispute" ? "Menyimpan…" : "Bukan rumor — kembali ke antrean"}
          </Button>
          <Button variant="ghost" disabled={busy !== null || tooShort} onClick={() => post("dismiss-suspected")}>
            {busy === "dismiss" ? "Menyimpan…" : "Tolak"}
          </Button>
        </div>
      </div>
      {error ? <p role="alert" className="mt-2 text-sm text-red-500">{error}</p> : null}
    </Panel>
  );
}

export function WebWatchReview() {
  const [data, setData] = useState<QueueData | null>(null);
  const [error, setError] = useState<string | null>(null);
  const [category, setCategory] = useState("semua");
  const [symbol, setSymbol] = useState("semua");
  const [query, setQuery] = useState("");
  const [tab, setTab] = useState<PantauTab>("antrean");

  const load = useCallback(async () => {
    try {
      const response = await fetch(apiUrl("/api/web-watch"));
      const body = (await response.json()) as QueueData;
      if (body.unavailable) {
        setError("Antrean belum tersedia (GCS tidak terjangkau dari sini). Jalankan di Cloud Run atau isi manual.");
        return;
      }
      setData(body);
      setError(null);
    } catch {
      setError("Tidak bisa memuat antrean pantauan.");
    }
  }, []);

  useEffect(() => {
    let cancelled = false;
    fetch(apiUrl("/api/web-watch"))      .then((response) => response.json() as Promise<QueueData>)
      .then((body) => {
        if (cancelled) return;
        if (body.unavailable) {
          setError("Antrean belum tersedia (GCS tidak terjangkau dari sini). Jalankan di Cloud Run atau isi manual.");
          return;
        }
        setData(body);
      })
      .catch(() => {
        if (!cancelled) setError("Tidak bisa memuat antrean pantauan.");
      });
    return () => {
      cancelled = true;
    };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const categories = ["semua", "company", "commodity", "rates", "currency", "policy", "weather"];
  // Proposals first, strongest band first, newest first within a band; then
  // the items a person still has to map by hand.
  const visiblePending = (data?.pending ?? [])
    .filter((candidate) => {
      if (category !== "semua" && candidate.category !== category) return false;
      if (symbol !== "semua" && !mentionsSymbol(candidate, symbol as SymbolCode, data?.matches[candidate.id])) return false;
      return fuzzyIncludes(`${candidate.title} ${candidate.summary} ${candidate.citations[0]?.provider ?? ""}`, query);
    })
    .sort(
      (a, b) =>
        proposalRank(data?.proposals[a.id]) - proposalRank(data?.proposals[b.id]) ||
        b.publishedAt.localeCompare(a.publishedAt),
    );
  const residualById = new Map((data?.residual ?? []).map((row) => [row.id, row]));
  const needsDecision = visiblePending.filter((candidate) => residualById.has(candidate.id));
  const unscreened = visiblePending.filter((candidate) => !residualById.has(candidate.id));
  const proposalCount = (data?.pending ?? []).filter((candidate) => data?.proposals[candidate.id]).length;
  const batchable = (data?.batchable ?? [])
    .map((id) => data?.pending.find((candidate) => candidate.id === id))
    .filter((candidate): candidate is MarketEvent => Boolean(candidate));

  const suspected = data?.suspected ?? [];
  const disputedToAntrean = useCallback(() => {
    setTab("antrean");
    load();
  }, [load]);

  return (
    <div>
      <PageHeader
        title="Pantau"
        description="Berita yang dipakai dalam analisis, dan berita baru yang menunggu keputusan Anda. Melihat kabar di media sosial? Cari di tab Terindikasi Rumor atau Antrean, lalu terima atau tolak."
        action={<Button variant="secondary" onClick={load}>Muat ulang</Button>}
      />
      {error ? (
        <Panel className="p-8 text-center"><p className="text-sm text-muted-foreground">{error}</p></Panel>
      ) : !data ? (
        <Panel className="h-72 shimmer" aria-label="Memuat antrean pantauan" />
      ) : (
        <div className="space-y-8">
          {data.autoAccept ? <AutoAcceptSwitch status={data.autoAccept} lastScreenAt={data.lastScreenAt ?? null} onChanged={load} /> : null}

          <nav aria-label="Bagian berita" className="flex min-w-0 gap-6 overflow-x-auto border-b border-border">
            {tabs.map((item) => {
              const count = item.value === "diterima" ? data.accepted.length : item.value === "antrean" ? visiblePending.length : suspected.length;
              return (
                <button
                  key={item.value}
                  type="button"
                  onClick={() => setTab(item.value)}
                  aria-current={tab === item.value ? "page" : undefined}
                  className={cn("relative -mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-subtle-foreground transition-colors hover:text-foreground", tab === item.value && "border-foreground text-foreground")}
                >
                  {item.label}
                  <span className="font-mono text-xs tabular-nums text-subtle-foreground">{count}</span>
                </button>
              );
            })}
          </nav>

          {tab === "diterima" ? (
          <section aria-label="Diterima ke analisis">
            <h2 className="editorial mb-3 text-xl">Diterima ({data.accepted.length})</h2>
            {data.accepted.length ? (
              <div className="space-y-3">
                <Collapsible
                  items={data.accepted}
                  render={(event) => (
                    <Panel key={event.id} className="p-4">
                      <h3 className="text-sm font-semibold leading-snug">{event.title}</h3>
                      <EventMarkers markers={event.markers} className="mt-1 block" />
                      <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                        {event.impactLinks.map((link) => (
                          <li key={link.symbol} className="font-mono">
                            {link.symbol} · {uiLabel(link.direction)} · {bandLabel[bandForRelevance(link.relevance)]} — {link.path}
                          </li>
                        ))}
                      </ul>
                    </Panel>
                  )}
                />
              </div>
            ) : (
              <Panel className="p-6 text-sm text-muted-foreground">Belum ada kandidat yang diterima.</Panel>
            )}
          </section>
          ) : null}

          {tab === "antrean" ? (
          <section aria-label="Antrean tinjauan" data-tour="review-queue">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <div className="mr-auto">
                <h2 className="editorial text-xl">Antrean ({visiblePending.length})</h2>
                <p className="text-xs text-muted-foreground">
                  {residualById.size} perlu keputusan · {proposalCount} dengan usulan model · terima atau tolak dengan alasan
                </p>
              </div>
              <BatchAccept candidates={batchable} proposals={data.proposals} onDone={load} />
              <select aria-label="Saring emiten" value={symbol} onChange={(event) => setSymbol(event.target.value)} className="h-9 rounded-lg border border-border bg-surface px-2 font-mono text-xs outline-none focus:border-primary">
                <option value="semua">Semua emiten</option>
                {data.symbols.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <select aria-label="Saring kategori" value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-lg border border-border bg-surface px-2 text-xs outline-none focus:border-primary">
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "semua" ? "Semua kategori" : uiLabel(c)}</option>
                ))}
              </select>
              <input
                aria-label="Cari antrean"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari judul…"
                className="h-9 w-44 rounded-lg border border-border bg-surface px-3 text-xs outline-none focus:border-primary"
              />
            </div>
            {visiblePending.length ? (
              <div className="space-y-8">
                <section aria-label="Perlu keputusan">
                  <h3 className="mb-1 text-base font-semibold">Perlu keputusan ({needsDecision.length})</h3>
                  <p className="mb-3 text-xs text-muted-foreground">Penyaring sudah membaca calon ini dan belum yakin. Terima dan petakan ke emiten, atau tolak dengan alasan. Keputusan Anda di sini dipakai untuk mengkalibrasi penyaring.</p>
                  {needsDecision.length ? (
                    <div className="space-y-4">
                      <Collapsible
                        items={needsDecision}
                        render={(candidate) => (
                          <CandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            symbols={data.symbols}
                            bands={data.bands}
                            match={data.matches[candidate.id]}
                            proposal={data.proposals[candidate.id]}
                            residual={residualById.get(candidate.id)}
                            onDecided={load}
                          />
                        )}
                      />
                    </div>
                  ) : (
                    <Panel className="p-6 text-sm text-muted-foreground">Tidak ada calon yang ditinggalkan penyaring untuk Anda.</Panel>
                  )}
                </section>
                {unscreened.length ? (
                  <section aria-label="Menunggu penyaringan">
                    <h3 className="mb-1 text-base font-semibold">Menunggu penyaringan ({unscreened.length})</h3>
                    <p className="mb-3 text-xs text-muted-foreground">Belum dibaca penyaring. Anda tetap bisa menerimanya ke analisis atau menolaknya sekarang.</p>
                    <div className="space-y-4">
                      <Collapsible
                        items={unscreened}
                        render={(candidate) => (
                          <CandidateCard
                            key={candidate.id}
                            candidate={candidate}
                            symbols={data.symbols}
                            bands={data.bands}
                            match={data.matches[candidate.id]}
                            proposal={data.proposals[candidate.id]}
                            onDecided={load}
                          />
                        )}
                      />
                    </div>
                  </section>
                ) : null}
              </div>
            ) : (
              <Panel className="p-6 text-sm text-muted-foreground">{data.pending.length ? "Tidak ada yang cocok dengan saringan." : "Antrean kosong. Tidak ada perubahan baru yang menunggu tinjauan."}</Panel>
            )}
          </section>
          ) : null}

          {tab === "rumor" ? (
          <section aria-label="Terindikasi rumor">
            <div className="mb-3">
              <h2 className="editorial text-xl">Terindikasi Rumor ({suspected.length})</h2>
              <p className="text-xs text-muted-foreground">
                Penyaring menandai calon ini sebagai rumor atau judul menyesatkan. Tidak ada yang dihapus otomatis: bantah dengan alasan bila beritanya layak ditelusuri — ia kembali ke Antrean untuk dipetakan — atau tolak bila memang rumor.
              </p>
            </div>
            {suspected.length ? (
              <div className="space-y-4">
                <Collapsible
                  items={suspected}
                  render={(item) => (
                    <SuspectedCard key={item.id} item={item} onResolved={load} onDisputed={disputedToAntrean} />
                  )}
                />
              </div>
            ) : (
              <Panel className="p-6 text-sm text-muted-foreground">Tidak ada temuan yang ditandai rumor. Berita yang Anda lihat di media sosial tetapi tidak ada di sini kemungkinan belum masuk pantauan atau sudah diterima di tab Diterima.</Panel>
            )}
          </section>
          ) : null}

          {/* Bookkeeping of what already left the queue, and the feed plumbing
              behind it. It belongs with the accepted list, not repeated under
              every tab. */}
          {tab === "diterima" ? (
          <>
          <AutoDecidedList items={data.autoAccepted ?? []} rejected={data.autoRejected ?? []} onReverted={load} />
          <ArchivedList items={data.archived} />

          {/* Feed plumbing, not review material: which pages the crawler polls
              and whether any of them is failing. It sits closed under the queue
              because a reviewer opens this page to judge candidates, and the
              poll bookkeeping above them was answering a question nobody on
              this page had asked. */}
          <details aria-label="Kesehatan sumber" className="rounded-lg border border-border bg-surface">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              Sumber yang dipantau ({data.sources.length})
            </summary>
            <div className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
              {data.sources.map((source) => (
                <Panel key={source.id} className="p-4">
                  <h3 className="text-sm font-semibold leading-snug">{source.label}</h3>
                  <p className="mt-1 font-mono text-xs text-muted-foreground">{source.kind}</p>
                  {source.lastError ? (
                    <p className="mt-2 rounded-lg bg-muted p-2 text-xs leading-5 text-foreground">Gagal: {source.lastError}</p>
                  ) : null}
                  {source.lastCheckedAt ? (
                    <p className="mt-1 text-xs text-muted-foreground">Terakhir dicek {formatWib(source.lastCheckedAt)}</p>
                  ) : null}
                  {source.health?.suggestDisable ? (
                    <p className="mt-2 rounded-lg bg-muted p-2 text-xs leading-5 text-foreground">
                      Pertimbangkan menonaktifkan sumber ini: {source.health.noisy} dari {source.health.window} hasil terakhirnya diarsipkan atau ditolak.
                    </p>
                  ) : null}
                </Panel>
              ))}
              {!data.sources.length ? (
                <Panel className="p-6 text-sm text-muted-foreground">Belum ada sumber — jalankan sweep sekarang, atau tunggu sapuan terjadwal berikutnya.</Panel>
              ) : null}
            </div>
          </details>
          </>
          ) : null}
          {data.pending.length ? <NextStep title={`Tinjau ${data.pending.length} temuan di antrean`} description="Terima temuan yang relevan agar masuk analisis, tolak yang tidak. Setelah itu buka kasusnya untuk melihat dampaknya." href="/cases" action="Buka Riset & Analisis" /> : <NextStep title="Tidak ada yang perlu ditinjau" description="Antrean kosong. Lanjutkan pemeriksaan kasus yang sudah terbuka." href="/cases" action="Buka Riset & Analisis" />}
        </div>
      )}
    </div>
  );
}
