"use client";
import { fuzzyIncludes } from "@/lib/text/fuzzy";

import { useCallback, useEffect, useState } from "react";
import { PageHeader } from "@/components/page-header";
import { apiUrl } from "@/lib/api-base";
import { companies, primarySymbol } from "@/lib/data/fixtures";
import { Button } from "@/components/ui/button";
import { Panel } from "@/components/ui/panel";
import type { MarketEvent, SymbolCode } from "@/lib/types";

/** The fields this page reads. `/api/web-watch` also returns poll counters and
 *  a status enum, which the crawler's own ops route reports; a reviewer does
 *  not act on either, so they are not read here. */
interface SourceRow {
  id: string;
  label: string;
  kind: string;
  lastError: string | null;
  lastCheckedAt: string | null;
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
  accepted: MarketEvent[];
  decidedCount: number;
  symbols: SymbolCode[];
  bands: Record<string, number>;
  unavailable?: boolean;
}

const DIRECTIONS: ImpactDraft["direction"][] = ["Supported", "Adverse", "Mixed", "Unrelated"];
const directionLabel: Record<ImpactDraft["direction"], string> = {
  Supported: "Mendukung",
  Adverse: "Berlawanan",
  Mixed: "Bercampur",
  Unrelated: "Tidak terkait",
};

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
function mentionsSymbol(candidate: MarketEvent, symbol: SymbolCode): boolean {
  if (candidate.impactLinks.some((link) => link.symbol === symbol)) return true;
  const haystack = `${candidate.title} ${candidate.summary} ${candidate.body ?? ""}`.toUpperCase();
  const name = companies.find((company) => company.symbol === symbol)?.name;
  const named = name ? tradingName(name) : "";
  if (named && haystack.includes(named)) return true;
  return new RegExp(`\\b${symbol.replace(/[^\p{L}\p{N}]/gu, "")}\\b`).test(haystack);
}

function CandidateCard({
  candidate,
  symbols,
  onDecided,
}: {
  candidate: MarketEvent;
  symbols: SymbolCode[];
  onDecided: () => void;
}) {
  const [impacts, setImpacts] = useState<ImpactDraft[]>([{ symbol: symbols[0] ?? primarySymbol, direction: "Supported", band: "medium", path: "" }]);
  const [reason, setReason] = useState("");
  const [dismissReason, setDismissReason] = useState("");
  const [showAccept, setShowAccept] = useState(false);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState<string | null>(null);
  const sourceUrl = candidate.citations[0]?.url;

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
        if (!response.ok) throw new Error(data.error ?? "Gagal menyimpan");
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
      <p className="mt-1 text-sm leading-6 text-muted-foreground">{candidate.summary}</p>
      {candidate.body ? (
        <details className="mt-2 text-sm">
          <summary className="cursor-pointer text-muted-foreground hover:text-foreground">Lihat isi terekstrak</summary>
          <p className="mt-2 max-h-48 overflow-auto whitespace-pre-wrap rounded-[6px] bg-muted p-3 text-xs leading-5">{candidate.body.slice(0, 3000)}</p>
        </details>
      ) : null}

      <div className="mt-4 border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Terima — petakan ke emiten</h4>
        {!showAccept ? (
          <div className="mt-2">
            <Button disabled={busy} onClick={() => setShowAccept(true)}>Petakan dampak</Button>
          </div>
        ) : (
          <>
        <p className="mt-0.5 text-xs text-muted-foreground">Band relevansi dipilih reviewer di sini, bukan dihitung mesin: tinggi 85 · sedang 70 · rendah 50.</p>
        <div className="mt-2 space-y-2">
          {impacts.map((impact, index) => (
            <div key={index} className="grid gap-2 sm:grid-cols-[110px_130px_110px_minmax(0,1fr)_auto]">
              <select
                aria-label={`Emiten ${index + 1}`}
                value={impact.symbol}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, symbol: event.target.value } : row)))}
                className="h-10 rounded-[6px] border border-border bg-surface px-2 font-mono text-sm outline-none focus:border-primary"
              >
                {symbols.map((symbol) => (
                  <option key={symbol} value={symbol}>{symbol}</option>
                ))}
              </select>
              <select
                aria-label={`Arah ${index + 1}`}
                value={impact.direction}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, direction: event.target.value as ImpactDraft["direction"] } : row)))}
                className="h-10 rounded-[6px] border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
              >
                {DIRECTIONS.map((direction) => (
                  <option key={direction} value={direction}>{directionLabel[direction]}</option>
                ))}
              </select>
              <select
                aria-label={`Band ${index + 1}`}
                value={impact.band}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, band: event.target.value as ImpactDraft["band"] } : row)))}
                className="h-10 rounded-[6px] border border-border bg-surface px-2 text-sm outline-none focus:border-primary"
              >
                <option value="high">Tinggi · 85</option>
                <option value="medium">Sedang · 70</option>
                <option value="low">Rendah · 50</option>
              </select>
              <input
                aria-label={`Jalur eksposur ${index + 1}`}
                value={impact.path}
                onChange={(event) => setImpacts(impacts.map((row, i) => (i === index ? { ...row, path: event.target.value } : row)))}
                placeholder="Jalur eksposur, mis. ICP naik → lifting cost ADRO → margin"
                className="h-10 rounded-[6px] border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
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
          aria-label="Catatan reviewer"
          value={reason}
          onChange={(event) => setReason(event.target.value)}
          placeholder="Catatan reviewer (opsional)"
          className="mt-2 h-10 w-full rounded-[6px] border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
        />
        <div className="mt-2">
          <Button disabled={busy} onClick={() => post({ action: "accept", candidateId: candidate.id, impacts, reason: reason || undefined })}>
            {busy ? "Menyimpan…" : "Terima ke engine"}
          </Button>
          <Button variant="ghost" disabled={busy} onClick={() => setShowAccept(false)} className="ml-2">
            Batal
          </Button>
        </div>
          </>
        )}
      </div>

      <div className="mt-4 border-t border-border pt-4">
        <h4 className="text-sm font-semibold">Tolak</h4>
        <div className="mt-2 flex flex-wrap gap-2">
          <input
            aria-label="Alasan penolakan"
            value={dismissReason}
            onChange={(event) => setDismissReason(event.target.value)}
            placeholder="Alasan (wajib), mis. tidak material untuk watchlist"
            className="h-10 min-w-52 flex-1 rounded-[6px] border border-border bg-surface px-3 text-sm outline-none focus:border-primary"
          />
          <Button variant="ghost" disabled={busy} onClick={() => post({ action: "dismiss", candidateId: candidate.id, reason: dismissReason })}>
            Tolak
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
  const visiblePending = (data?.pending ?? []).filter((candidate) => {
    if (category !== "semua" && candidate.category !== category) return false;
    if (symbol !== "semua" && !mentionsSymbol(candidate, symbol as SymbolCode)) return false;
    return fuzzyIncludes(`${candidate.title} ${candidate.summary} ${candidate.citations[0]?.provider ?? ""}`, query);
  });

  return (
    <div className="mx-auto max-w-[1240px]">
      <PageHeader
        eyebrow="Pantauan sumber"
        title="Perubahan sejak pemeriksaan terakhir"
        description="Sumber resmi dan portal pasar diperiksa setiap hari bursa pukul 17.30 WIB"
        action={<Button onClick={load}>Muat ulang</Button>}
      />
      {error ? (
        <Panel className="p-8 text-center"><p className="text-sm text-muted-foreground">{error}</p></Panel>
      ) : !data ? (
        <Panel className="h-72 animate-pulse bg-muted" aria-label="Memuat antrean pantauan" />
      ) : (
        <div className="space-y-8">
          <section aria-label="Antrean review" data-tour="review-queue">
            <div className="mb-3 flex flex-wrap items-center gap-2">
              <h2 className="mr-auto text-lg font-semibold">Antrean ({visiblePending.length})</h2>
              <select aria-label="Saring emiten" value={symbol} onChange={(event) => setSymbol(event.target.value)} className="h-9 rounded-[6px] border border-border bg-surface px-2 font-mono text-xs outline-none focus:border-primary">
                <option value="semua">Semua emiten</option>
                {data.symbols.map((code) => (
                  <option key={code} value={code}>{code}</option>
                ))}
              </select>
              <select aria-label="Saring kategori" value={category} onChange={(event) => setCategory(event.target.value)} className="h-9 rounded-[6px] border border-border bg-surface px-2 text-xs outline-none focus:border-primary">
                {categories.map((c) => (
                  <option key={c} value={c}>{c === "semua" ? "Semua kategori" : c}</option>
                ))}
              </select>
              <input
                aria-label="Cari antrean"
                value={query}
                onChange={(event) => setQuery(event.target.value)}
                placeholder="Cari judul…"
                className="h-9 w-44 rounded-[6px] border border-border bg-surface px-3 text-xs outline-none focus:border-primary"
              />
            </div>
            {visiblePending.length ? (
              <div className="space-y-4">
                {visiblePending.map((candidate) => (
                  <CandidateCard key={candidate.id} candidate={candidate} symbols={data.symbols} onDecided={load} />
                ))}
              </div>
            ) : (
              <Panel className="p-6 text-sm text-muted-foreground">{data.pending.length ? "Tidak ada yang cocok dengan saringan." : "Antrean kosong — tidak ada perubahan baru yang menunggu review."}</Panel>
            )}
          </section>

          <section aria-label="Diterima engine">
            <h2 className="mb-3 text-lg font-semibold">Diterima ({data.accepted.length})</h2>
            {data.accepted.length ? (
              <div className="space-y-3">
                {data.accepted.map((event) => (
                  <Panel key={event.id} className="p-4">
                    <h3 className="text-sm font-semibold leading-snug">{event.title}</h3>
                    <ul className="mt-2 space-y-1 text-xs text-muted-foreground">
                      {event.impactLinks.map((link) => (
                        <li key={link.symbol} className="font-mono">
                          {link.symbol} · {link.direction} · {link.relevance} — {link.path}
                        </li>
                      ))}
                    </ul>
                  </Panel>
                ))}
              </div>
            ) : (
              <Panel className="p-6 text-sm text-muted-foreground">Belum ada kandidat yang diterima.</Panel>
            )}
          </section>

          {/* Feed plumbing, not review material: which pages the crawler polls
              and whether any of them is failing. It sits closed under the queue
              because a reviewer opens this page to judge candidates, and the
              poll bookkeeping above them was answering a question nobody on
              this page had asked. */}
          <details aria-label="Kesehatan sumber" className="rounded-[12px] border border-border bg-surface">
            <summary className="flex min-h-11 cursor-pointer items-center px-4 text-sm font-medium text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">
              Sumber yang dipantau ({data.sources.length})
            </summary>
            <div className="grid gap-3 border-t border-border p-4 md:grid-cols-2">
              {data.sources.map((source) => (
                <Panel key={source.id} className="p-4">
                  <h3 className="text-sm font-semibold leading-snug">{source.label}</h3>
                  <p className="mt-1 font-mono text-[11px] text-muted-foreground">{source.kind}</p>
                  {source.lastError ? (
                    <p className="mt-2 rounded-[6px] bg-muted p-2 text-xs leading-5 text-foreground">Gagal: {source.lastError}</p>
                  ) : null}
                  {source.lastCheckedAt ? (
                    <p className="mt-1 text-[11px] text-muted-foreground">Terakhir dicek {source.lastCheckedAt.slice(0, 16).replace("T", " ")}</p>
                  ) : null}
                </Panel>
              ))}
              {!data.sources.length ? (
                <Panel className="p-6 text-sm text-muted-foreground">Belum ada sumber — jalankan sweep sekarang, atau tunggu sapuan terjadwal berikutnya.</Panel>
              ) : null}
            </div>
          </details>
        </div>
      )}
    </div>
  );
}
