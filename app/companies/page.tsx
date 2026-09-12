"use client";

import Link from "next/link";
import { GitCompareArrows, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { companies } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { Sector, SymbolCode } from "@/lib/types";
import { formatAsOf, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";

type View = "watchlist" | "ready" | "incomplete";
const sectors = ["Semua", ...new Set(companies.map((company) => company.sector))] as Array<Sector | "Semua">;
const viewLabels: Record<View, string> = { watchlist: "Watchlist siap", ready: "Semua siap", incomplete: "Data belum lengkap" };

export default function CompaniesPage() {
  const profile = useCatalystStore((state) => state.profile);
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<Sector | "Semua">("Semua");
  const [view, setView] = useState<View>("watchlist");
  const [selected, setSelected] = useState<SymbolCode[]>([]);
  const filtered = useMemo(() => companies.filter((company) => {
    const viewMatch = view === "watchlist" ? company.analyzed && profile.watchlist.includes(company.symbol) : view === "ready" ? company.analyzed : !company.analyzed;
    return viewMatch && (sector === "Semua" || company.sector === sector) && `${company.symbol} ${company.name} ${company.subsector}`.toLowerCase().includes(query.toLowerCase());
  }), [profile.watchlist, query, sector, view]);
  const toggleCompare = (symbol: SymbolCode) => setSelected((current) => current.includes(symbol) ? current.filter((item) => item !== symbol) : current.length < 4 ? [...current, symbol] : current);

  return (
    <div data-tour="company-universe">
      <PageHeader eyebrow="Company universe" title="Pilih kasus yang siap diperiksa" description="Default hanya menampilkan watchlist dengan empat pilar lengkap. Data kosong dipisahkan agar antrean tetap pendek." />
      <Panel className="mb-4 p-3">
        <div className="flex flex-wrap gap-2" role="group" aria-label="Cakupan emiten">{(Object.keys(viewLabels) as View[]).map((item) => <button key={item} onClick={() => { setView(item); setSelected([]); }} aria-pressed={view === item} className={cn("min-h-10 cursor-pointer rounded-lg border px-3 text-xs font-medium focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", view === item ? "border-primary bg-primary text-primary-foreground" : "border-border bg-background text-muted-foreground hover:bg-muted")}>{viewLabels[item]}{item === "incomplete" ? ` · ${companies.filter((company) => !company.analyzed).length}` : ""}</button>)}</div>
        <div className="mt-3 grid gap-3 border-t border-border pt-3 sm:grid-cols-[minmax(0,1fr)_220px]">
          <label className="relative block"><span className="sr-only">Cari emiten</span><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari ticker atau nama" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-base outline-none placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25" /></label>
          <label><span className="sr-only">Filter sektor</span><select value={sector} onChange={(event) => setSector(event.target.value as Sector | "Semua")} className="h-11 w-full cursor-pointer rounded-lg border border-border bg-background px-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </Panel>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-panel md:block">
        <table className="w-full text-left text-sm"><caption className="sr-only">Daftar emiten Catalyst</caption><thead className="border-b border-border bg-surface-raised font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="w-12 px-4 py-3"><span className="sr-only">Pilih</span></th><th className="px-4 py-3">Emiten</th><th className="px-4 py-3">Sektor</th><th className="px-4 py-3 text-right">Harga</th><th className="px-4 py-3 text-right">Gerak</th><th className="px-4 py-3">Status bukti</th></tr></thead><tbody className="divide-y divide-border">{filtered.map((company) => <tr key={company.symbol} className="transition-colors hover:bg-muted/45"><td className="px-4 py-3"><input type="checkbox" checked={selected.includes(company.symbol)} onChange={() => toggleCompare(company.symbol)} disabled={!company.analyzed || (!selected.includes(company.symbol) && selected.length >= 4)} aria-label={`Pilih ${company.symbol} untuk dibandingkan`} className="size-4 cursor-pointer accent-[var(--primary)] disabled:cursor-not-allowed" /></td><td className="px-4 py-3"><Link href={`/companies/${company.symbol}`} className="inline-flex min-h-10 items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-mono font-semibold text-primary">{company.symbol}</span><span><span className="block text-sm font-medium">{company.name}</span><span className="block text-xs text-muted-foreground">{company.subsector}</span></span></Link></td><td className="px-4 py-3 text-xs text-muted-foreground">{company.sector}</td><td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(company.price).replace("Rp", "Rp ")}</td><td className={`px-4 py-3 text-right font-mono ${company.changePct >= 0 ? "text-positive" : "text-danger"}`}>{company.changePct >= 0 ? "+" : ""}{company.changePct.toFixed(1)}%</td><td className="px-4 py-3"><StatusBadge status={company.evidenceState} /></td></tr>)}</tbody></table>
      </div>
      <div className="grid gap-3 md:hidden">{filtered.map((company) => <article key={company.symbol} className="rounded-xl border border-border bg-surface p-4 shadow-panel"><div className="flex items-start gap-3"><input type="checkbox" checked={selected.includes(company.symbol)} onChange={() => toggleCompare(company.symbol)} disabled={!company.analyzed || (!selected.includes(company.symbol) && selected.length >= 4)} aria-label={`Pilih ${company.symbol} untuk dibandingkan`} className="mt-1 size-4 accent-[var(--primary)]" /><Link href={`/companies/${company.symbol}`} className="min-w-0 flex-1"><span className="font-mono font-semibold text-primary">{company.symbol}</span><h2 className="mt-1 text-sm font-semibold">{company.name}</h2><p className="mt-1 text-xs text-muted-foreground">{company.sector} · {company.subsector}</p></Link><StatusBadge status={company.evidenceState} /></div><div className="mt-3 flex items-end justify-between border-t border-border pt-3"><p className="font-mono">{formatCurrency(company.price).replace("Rp", "Rp ")}</p><p className="font-mono text-[10px] text-muted-foreground">{formatAsOf(company.asOf)} WIB</p></div></article>)}</div>
      {filtered.length === 0 ? <Panel className="p-10 text-center"><Search aria-hidden="true" className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 font-semibold">Tidak ada emiten pada filter ini</h2><p className="mt-1 text-sm text-muted-foreground">Ubah cakupan, pencarian, atau sektor.</p></Panel> : null}

      {selected.length ? <div className="fixed inset-x-3 bottom-16 z-30 mx-auto flex max-w-xl items-center gap-3 rounded-xl border border-primary/40 bg-surface p-3 shadow-2xl xl:bottom-4"><GitCompareArrows aria-hidden="true" className="size-5 text-primary" /><p className="min-w-0 flex-1 text-sm"><strong className="font-mono">{selected.length}/4</strong> emiten dipilih</p><button onClick={() => setSelected([])} className="min-h-10 rounded-lg px-3 text-xs text-muted-foreground hover:bg-muted">Bersihkan</button>{selected.length >= 2 ? <Link href={`/compare?symbols=${encodeURIComponent(selected.join(","))}`} className="inline-flex min-h-10 items-center rounded-lg bg-primary px-3 text-xs font-semibold text-primary-foreground">Bandingkan {selected.length} emiten</Link> : <span className="text-xs text-muted-foreground">Pilih satu lagi</span>}</div> : null}
    </div>
  );
}
