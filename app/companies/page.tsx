"use client";

import Link from "next/link";
import { ArrowUpRight, Filter, Search } from "lucide-react";
import { useMemo, useState } from "react";
import { companies } from "@/lib/data/fixtures";
import type { Sector } from "@/lib/types";
import { formatAsOf, formatCurrency } from "@/lib/utils";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { StatusBadge } from "@/components/ui/status-badge";

const sectors = ["Semua", ...new Set(companies.map((company) => company.sector))] as Array<Sector | "Semua">;

export default function CompaniesPage() {
  const [query, setQuery] = useState("");
  const [sector, setSector] = useState<Sector | "Semua">("Semua");
  const filtered = useMemo(() => companies.filter((company) =>
    (sector === "Semua" || company.sector === sector) &&
    `${company.symbol} ${company.name} ${company.subsector}`.toLowerCase().includes(query.toLowerCase()),
  ), [query, sector]);

  return (
    <div>
      <PageHeader eyebrow="Company universe" title="18 emiten, enam sektor" description="Enam emiten memiliki analisis empat pilar lengkap. Emiten lain tetap dapat dibuka untuk melihat data yang belum tersedia." />
      <Panel className="mb-4 p-3">
        <div className="grid gap-3 sm:grid-cols-[minmax(0,1fr)_240px]">
          <label className="relative block"><span className="sr-only">Cari emiten</span><Search aria-hidden="true" className="absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><input value={query} onChange={(event) => setQuery(event.target.value)} placeholder="Cari ticker, nama, atau subsektor" className="h-11 w-full rounded-lg border border-border bg-background pl-10 pr-3 text-base outline-none transition-colors placeholder:text-muted-foreground focus:border-primary focus:ring-2 focus:ring-ring/25" /></label>
          <label className="relative block"><span className="sr-only">Filter sektor</span><Filter aria-hidden="true" className="pointer-events-none absolute left-3 top-1/2 size-4 -translate-y-1/2 text-muted-foreground" /><select value={sector} onChange={(event) => setSector(event.target.value as Sector | "Semua")} className="h-11 w-full cursor-pointer appearance-none rounded-lg border border-border bg-background pl-10 pr-3 text-sm outline-none focus:border-primary focus:ring-2 focus:ring-ring/25">{sectors.map((item) => <option key={item}>{item}</option>)}</select></label>
        </div>
      </Panel>

      <div className="hidden overflow-hidden rounded-xl border border-border bg-surface shadow-panel md:block">
        <table className="w-full text-left text-sm"><caption className="sr-only">Daftar emiten fixture Catalyst</caption><thead className="border-b border-border bg-surface-raised font-mono text-[10px] uppercase tracking-[0.12em] text-muted-foreground"><tr><th className="px-4 py-3">Emiten</th><th className="px-4 py-3">Sektor</th><th className="px-4 py-3 text-right">Harga</th><th className="px-4 py-3 text-right">Gerak</th><th className="px-4 py-3">Status bukti</th><th className="px-4 py-3"><span className="sr-only">Buka</span></th></tr></thead><tbody className="divide-y divide-border">{filtered.map((company) => <tr key={company.symbol} className="transition-colors hover:bg-muted/45"><td className="px-4 py-3"><Link href={`/companies/${company.symbol}`} className="inline-flex min-h-10 items-center gap-3 rounded focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><span className="font-mono font-semibold text-primary">{company.symbol}</span><span><span className="block text-sm font-medium">{company.name}</span><span className="block text-xs text-muted-foreground">{company.subsector}</span></span></Link></td><td className="px-4 py-3 text-xs text-muted-foreground">{company.sector}</td><td className="px-4 py-3 text-right font-mono tabular-nums">{formatCurrency(company.price).replace("Rp", "Rp ")}</td><td className={`px-4 py-3 text-right font-mono ${company.changePct >= 0 ? "text-positive" : "text-danger"}`}>{company.changePct >= 0 ? "+" : ""}{company.changePct.toFixed(1)}%</td><td className="px-4 py-3"><StatusBadge status={company.evidenceState} /></td><td className="px-4 py-3 text-right"><Link href={`/companies/${company.symbol}`} aria-label={`Buka ${company.symbol}`} className="inline-grid size-10 place-items-center rounded-lg text-muted-foreground hover:bg-muted hover:text-primary focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><ArrowUpRight aria-hidden="true" className="size-4" /></Link></td></tr>)}</tbody></table>
      </div>
      <div className="grid gap-3 md:hidden">{filtered.map((company) => <Link key={company.symbol} href={`/companies/${company.symbol}`} className="cursor-pointer rounded-xl border border-border bg-surface p-4 shadow-panel focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring"><div className="flex items-start justify-between gap-3"><div><span className="font-mono font-semibold text-primary">{company.symbol}</span><h2 className="mt-1 text-sm font-semibold">{company.name}</h2><p className="mt-1 text-xs text-muted-foreground">{company.sector} · {company.subsector}</p></div><ArrowUpRight aria-hidden="true" className="size-4 text-muted-foreground" /></div><div className="mt-4 flex items-end justify-between gap-2"><div><p className="font-mono text-lg">{formatCurrency(company.price).replace("Rp", "Rp ")}</p><p className="mt-1 font-mono text-[10px] text-muted-foreground">{formatAsOf(company.asOf)} WIB</p></div><StatusBadge status={company.evidenceState} /></div></Link>)}</div>
      {filtered.length === 0 ? <Panel className="p-10 text-center"><Search aria-hidden="true" className="mx-auto size-6 text-muted-foreground" /><h2 className="mt-3 font-semibold">Tidak ada emiten yang cocok</h2><p className="mt-1 text-sm text-muted-foreground">Ubah kata kunci atau filter sektor.</p></Panel> : null}
    </div>
  );
}
