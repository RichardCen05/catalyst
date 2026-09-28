"use client";

import { Suspense, useEffect, useMemo, useState, type ReactNode } from "react";
import Link from "next/link";
import { useSearchParams } from "next/navigation";
import { agentEngine } from "@/lib/agent/engine";
import { companies, DATA_AS_OF_LABEL, missingList } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { SymbolCode, AnalysisCase } from "@/lib/types";
import { PageHeader } from "@/components/page-header";
import { NextStep } from "@/components/next-step";
import { Panel } from "@/components/ui/panel";
import { StatusBadge, strengthRank } from "@/components/ui/status-badge";
import { PriceChange } from "@/components/ui/price-change";
import { IconArrowRight, IconClose, IconSearch } from "@/components/ui/icons";
import { TickerAvatar } from "@/components/ui/ticker-avatar";
import { SymbolCombobox } from "@/components/ui/symbol-combobox";
import { cn, displayFigure, formatCurrency, withStop } from "@/lib/utils";
import { shownDisposition } from "@/lib/case-disposition";
import { dispositionLabel, uiLabel } from "@/lib/ui-labels";
import { orderByFeedback } from "@/lib/learning";
import { COVERAGE_ORDER, coverageRows, type CoverageStatus, type MovementCheck } from "@/lib/agent/coverage";
import { resolveThresholds, type ResolvedThresholds } from "@/lib/agent/thresholds";

type CaseHubView = "active" | "coverage" | "picker";

const views: Array<{ value: CaseHubView; label: string }> = [
  { value: "active", label: "Kasus aktif" },
  { value: "coverage", label: "Semua emiten" },
  { value: "picker", label: "Perbandingan emiten" },
];

const coverageGroups: Record<CoverageStatus, { title: string; description: string }> = {
  case: { title: "Kasus aktif", description: "Ada di pantauan Anda dan rekamannya lengkap." },
  recorded: { title: "Terekam lengkap, di luar pantauan", description: "Kasus terbuka begitu emiten ditambahkan ke pantauan." },
  partial: { title: "Di pantauan, rekaman belum lengkap", description: "Kasus belum bisa dibuka sampai rekaman yang kurang tersedia." },
  outside: { title: "Di luar pantauan, rekaman belum lengkap", description: "Tidak dipantau dan rekamannya belum cukup untuk kasus." },
};

const decimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
/** A value that rounds to zero prints as 0,0, never −0,0. */
const signed = (value: number) => (decimal.format(Math.abs(value)) === decimal.format(0) ? decimal.format(0) : `${value < 0 ? "−" : ""}${decimal.format(Math.abs(value))}`);
const percentOf = (fraction: number) => `${signed(fraction * 100)}%`;

/** One line per test, always naming the floor it was held to. */
function MovementCell({ movement, thresholds }: { movement: MovementCheck; thresholds: ResolvedThresholds }) {
  if (movement.status === "insufficient") return <span className="text-xs text-muted-foreground">Data belum cukup untuk diuji</span>;
  const dropFloor = -Math.abs(thresholds.contagionDropFloor);
  return <span className="block">
    <span className={cn("inline-flex h-6 items-center rounded-lg border px-2 text-xs font-medium", movement.status === "crossed" ? "border-foreground" : "border-border text-muted-foreground")}>{movement.status === "crossed" ? "Melewati ambang" : "Tidak melewati ambang"}</span>
    <span className="mt-1 block font-mono text-xs tabular-nums text-subtle-foreground">
      <span className={cn("block", movement.volumeCrossed && "font-semibold text-foreground")}>Volume z {movement.volumeZ === null ? "—" : signed(movement.volumeZ)} {movement.volumeCrossed ? "≥" : "<"} {decimal.format(thresholds.volumeZFloor)}</span>
      {movement.lastSessionChange !== null ? <span className={cn("block", movement.dropCrossed && "font-semibold text-foreground")}>Sesi terakhir {percentOf(movement.lastSessionChange)} {movement.dropCrossed ? "≤" : ">"} {percentOf(dropFloor)}</span> : null}
    </span>
  </span>;
}

function ResearchCasesContent() {
  const searchParams = useSearchParams();
  const requested = searchParams.get("view") as CaseHubView | null;
  // Koreksi pengguna, usulan aturan, dan memori hasil hidup di AI Learning —
  // itu memori yang diajarkan pembaca, bukan kasus yang sedang diperiksa.
  const activeView: CaseHubView = views.some((item) => item.value === requested) ? requested as CaseHubView : "active";
  const { profile, playbook, caseStatuses, caseResolutions, insights, feedback, preferences, setWatchlist } = useCatalystStore();
  const [openSlot, setOpenSlot] = useState<number | null>(null);
  const [selected, setSelected] = useState<Array<SymbolCode | undefined>>(() => {
    const valid = (searchParams.get("compare") ?? "")
      .split(",")
      .map((item) => item.trim().toUpperCase() as SymbolCode)
      .filter((symbol) => companies.some((company) => company.symbol === symbol && company.analyzed))
      .slice(0, 3);
    return [0, 1, 2].map((index) => valid[index]);
  });
  const [cases, setCases] = useState<AnalysisCase[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(profile.watchlist.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: undefined, playbook, userInsights: insights, resolution: caseResolutions[symbol] }))).then((results) => { if (!cancelled) setCases(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [profile, profile.watchlist.join(","), playbook, insights, caseResolutions]);
  const activeSymbols = useMemo(() => selected.filter((symbol): symbol is SymbolCode => Boolean(symbol)), [selected]);
  const [compared, setCompared] = useState<AnalysisCase[]>([]);
  useEffect(() => {
    let cancelled = false;
    void Promise.all(activeSymbols.map((symbol) => agentEngine.analyzeCompany(symbol, profile, { mandate: undefined, playbook }))).then((results) => { if (!cancelled) setCompared(results.filter((item) => item !== null)); });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [activeSymbols.join(",")]);
  // The only effect feedback has: evidence marked useful lifts that issuer's
  // case, evidence marked irrelevant sinks it. Nothing about the case itself
  // changes — this is the claim lib/learning.ts makes to the reader.
  const orderedCases = useMemo(
    () => orderByFeedback(cases, feedback, preferences, (item) => item.company.symbol),
    [cases, feedback, preferences],
  );

  const selectSlot = (index: number, symbol: SymbolCode) => { setSelected((current) => current.map((item, itemIndex) => (itemIndex === index ? symbol : item))); setOpenSlot(null); };
  const removeSlot = (index: number) => setSelected((current) => current.map((item, itemIndex) => (itemIndex === index ? undefined : item)));

  const rawFigure = (item: AnalysisCase, pillar: string, label: string) => item.pillars.find((entry) => entry.key === pillar)?.metrics.find((metric) => metric.label === label)?.value;
  const figureOf = (item: AnalysisCase, pillar: string, label: string) => {
    const value = rawFigure(item, pillar, label);
    return value ? displayFigure(value) : "—";
  };
  /** The size of a recorded figure, sign dropped: the strongest signal in a
   *  row is the one furthest from zero, whichever way it points. */
  const magnitudeOf = (item: AnalysisCase, pillar: string, label: string) => {
    const value = Number.parseFloat((rawFigure(item, pillar, label) ?? "").replace(/[−–]/g, "-").replace(",", ".").replace(/[^0-9.-]/g, ""));
    return Number.isFinite(value) ? Math.abs(value) : undefined;
  };

  const thresholds = useMemo(() => resolveThresholds(playbook), [playbook]);
  const coverage = useMemo(() => coverageRows(profile.watchlist, thresholds), [profile.watchlist, thresholds]);
  const crossedCount = coverage.filter((row) => row.movement.status === "crossed").length;
  const testedCount = coverage.filter((row) => row.movement.status !== "insufficient").length;

  const firstOpen = orderedCases.find((item) => (caseStatuses[item.company.symbol] ?? item.status) !== "closed");

  const compareRows: Array<{ label: string; render: (item: AnalysisCase) => ReactNode; score?: (item: AnalysisCase) => number | undefined }> = [
    { label: "Harga saham", render: (item) => <span className="flex items-center gap-2"><span className="font-mono tabular-nums">{formatCurrency(item.company.price)}</span><PriceChange value={item.company.changePct} className="text-xs" /></span>, score: (item) => Math.abs(item.company.changePct) },
    { label: "Status bukti", render: (item) => <StatusBadge status={item.evidenceState} />, score: (item) => strengthRank(item.evidenceState) },
    { label: "Uji bisnis utama", render: (item) => item.businessImpact.find((impact) => impact.status === "Primary test")?.label ?? "—" },
    { label: "Konsentrasi (HHI, 0–1)", render: (item) => figureOf(item, "concentration", "HHI"), score: (item) => magnitudeOf(item, "concentration", "HHI") },
    { label: "Volume (skor z, 0 = biasa)", render: (item) => figureOf(item, "volume", "Skor z tahan pencilan"), score: (item) => magnitudeOf(item, "volume", "Skor z tahan pencilan") },
    { label: "Gerak di luar IHSG", render: (item) => figureOf(item, "momentum", "Residual setelah beta"), score: (item) => magnitudeOf(item, "momentum", "Residual setelah beta") },
    { label: "Imbal hasil sektor", render: (item) => figureOf(item, "momentum", "Imbal hasil sektor") },
    { label: "Materialitas", render: (item) => `${uiLabel(item.priority.materiality)} · ${item.priority.reason}` },
    { label: "Tantangan utama", render: (item) => item.counterEvidence[0] },
  ];

  return (
    <div data-tour="research-cases">
      <PageHeader title="Riset & Analisis" description="Perubahan yang perlu diperiksa. Setiap kasus menghubungkan pemicu, bukti pasar, dampak bisnis, dan tindakan riset." />

      <nav aria-label="Bagian kasus" className="mb-6 flex min-w-0 gap-6 overflow-x-auto border-b border-border">
        {views.map((item) => <Link key={item.value} href={item.value === "active" ? "/cases" : `/cases?view=${item.value}`} aria-current={activeView === item.value ? "page" : undefined} className={cn("relative -mb-px flex min-h-11 shrink-0 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-subtle-foreground transition-colors hover:text-foreground", activeView === item.value && "border-foreground text-foreground")}>{item.label}</Link>)}
      </nav>

      {activeView === "active" ? <div><div className="overflow-hidden rounded-lg border border-border">
        <div aria-hidden="true" className="hidden grid-cols-[200px_minmax(0,1fr)_120px_150px_140px_110px_20px] gap-4 border-b border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid"><span>Emiten</span><span>Pemicu</span><span>Materialitas</span><span>Status bukti</span><span>Tindakan</span><span className="text-right">Harga</span><span /></div>
        <ul className="divide-y divide-border">
          {orderedCases.map((analysis) => {
            const status = caseStatuses[analysis.company.symbol] ?? analysis.status;
            const materiality = uiLabel(analysis.priority.materiality);
            return <li key={analysis.company.symbol}><Link href={`/cases/${analysis.company.symbol}`} className="grid gap-3 px-4 py-4 transition-colors hover:bg-surface focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring lg:grid-cols-[200px_minmax(0,1fr)_120px_150px_140px_110px_20px] lg:items-start lg:gap-4">
              <span className="min-w-0"><strong className="block text-base font-semibold">{analysis.company.symbol}</strong><span className="block truncate text-xs text-subtle-foreground">{analysis.company.name}</span></span>
              <span className="min-w-0"><span className="block text-sm font-medium">{analysis.trigger.title}</span><span className="mt-1 line-clamp-2 block text-xs text-subtle-foreground">{analysis.materialChange.baseline}</span></span>
              <span className="flex flex-wrap gap-1.5"><span className={cn("inline-flex h-6 items-center rounded-lg border px-2 text-xs font-medium", analysis.priority.materiality === "High" ? "border-foreground" : "border-border text-muted-foreground")}>{materiality}</span>{status === "closed" ? <span className="inline-flex h-6 items-center rounded-lg border border-border px-2 text-xs font-medium text-muted-foreground">Selesai</span> : null}</span>
              <span><StatusBadge status={analysis.evidenceState} /></span>
              <span className="text-sm font-medium">{dispositionLabel(shownDisposition(analysis.researchDisposition.kind, caseResolutions[analysis.company.symbol]))}</span>
              <span className="flex items-center gap-2 lg:flex-col lg:items-end lg:gap-0.5"><span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(analysis.company.price)}</span><PriceChange value={analysis.company.changePct} className="text-xs" /></span>
              <IconArrowRight aria-hidden="true" className="hidden size-4 self-center text-subtle-foreground lg:block" />
            </Link></li>;
          })}
        </ul>
      </div>
        <p className="mt-3 text-xs text-subtle-foreground">Urutan mengikuti materialitas dan penilaian bukti Anda. Setiap kasus diperiksa dalam tiga langkah: 1 Pasar, 2 Bisnis, 3 Keputusan.</p>
        <p className="mt-2 text-sm text-muted-foreground">{orderedCases.length} dari {companies.length} emiten punya kasus aktif. <Link href="/cases?view=coverage" className="font-medium text-foreground underline underline-offset-4 hover:no-underline">Lihat semua emiten</Link> untuk emiten yang tidak masuk daftar ini dan hasil uji ambangnya.</p>
        {firstOpen ? <NextStep title={`Mulai dari ${firstOpen.company.symbol}`} description={`${withStop(firstOpen.trigger.title)} Buka langkah 1 Pasar untuk memeriksa apakah pasar ikut bergerak.`} href={`/cases/${firstOpen.company.symbol}?tab=market`} action={`Buka ${firstOpen.company.symbol}`} secondary={{ href: "/cases?view=picker", label: "Bandingkan emiten" }} /> : <NextStep title="Semua kasus sudah ditutup" description="Pelajaran dari kasus yang ditutup menunggu keputusan Anda di AI Learning." href="/ai-learning?section=tinjauan" action="Buka tinjauan dan usulan" />}
      </div> : null}

      {activeView === "coverage" ? <div>
        <p className="mb-4 text-sm text-muted-foreground">{testedCount} dari {companies.length} emiten diuji pada sesi terakhir rekaman ({DATA_AS_OF_LABEL}); {crossedCount} melewati ambang volume atau penurunan harian. Uji ini hanya memakai harga dan volume, jadi juga berjalan untuk emiten tanpa kasus.</p>
        <div className="space-y-6">
          {COVERAGE_ORDER.map((status) => {
            const rows = coverage.filter((row) => row.status === status);
            if (!rows.length) return null;
            const group = coverageGroups[status];
            return <section key={status} aria-labelledby={`coverage-${status}`}>
              <div className="mb-2 flex flex-wrap items-baseline gap-x-2">
                <h2 id={`coverage-${status}`} className="text-base font-semibold">{group.title}</h2>
                <span className="font-mono text-xs tabular-nums text-subtle-foreground">{rows.length}</span>
                <p className="w-full text-xs text-subtle-foreground">{group.description}</p>
              </div>
              <div className="overflow-hidden rounded-lg border border-border">
                <div aria-hidden="true" className="hidden grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)_110px_170px] gap-4 border-b border-border bg-surface px-4 py-2.5 text-xs font-medium text-muted-foreground lg:grid"><span>Emiten</span><span>Rekaman</span><span>Uji ambang</span><span className="text-right">Harga</span><span className="text-right">Tindakan</span></div>
                <ul className="divide-y divide-border">
                  {rows.map((row) => {
                    const company = companies.find((item) => item.symbol === row.symbol)!;
                    return <li key={row.symbol} className="grid gap-3 px-4 py-4 lg:grid-cols-[200px_minmax(0,1fr)_minmax(0,1fr)_110px_170px] lg:items-start lg:gap-4">
                      <span className="flex min-w-0 items-center gap-2"><TickerAvatar symbol={row.symbol} size="sm" /><span className="min-w-0"><strong className="block text-base font-semibold">{row.symbol}</strong><span className="block truncate text-xs text-subtle-foreground">{company.name}</span></span></span>
                      <span className="text-xs text-muted-foreground">{row.missing.length ? `Belum ada: ${missingList(row.missing)}` : "Lengkap"}</span>
                      <MovementCell movement={row.movement} thresholds={thresholds} />
                      <span className="flex items-center gap-2 lg:flex-col lg:items-end lg:gap-0.5"><span className="font-mono text-sm font-medium tabular-nums">{formatCurrency(company.price)}</span><PriceChange value={company.changePct} className="text-xs" /></span>
                      <span className="lg:text-right">
                        {row.status === "case" ? <Link href={`/cases/${row.symbol}`} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium hover:underline">Buka kasus<IconArrowRight aria-hidden="true" className="size-4" /></Link>
                          : row.status === "recorded" ? <button type="button" onClick={() => setWatchlist([...profile.watchlist, row.symbol])} className="inline-flex min-h-9 cursor-pointer items-center whitespace-nowrap rounded-lg border border-border-strong bg-background px-3 text-sm font-medium transition-colors hover:bg-muted focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring">Tambah ke pantauan</button>
                          : <Link href={`/companies/${row.symbol}`} className="inline-flex min-h-9 items-center gap-1.5 text-sm font-medium hover:underline">Lihat emiten<IconArrowRight aria-hidden="true" className="size-4" /></Link>}
                      </span>
                    </li>;
                  })}
                </ul>
              </div>
            </section>;
          })}
        </div>
        <p className="mt-3 text-xs text-subtle-foreground">Ambang yang sama dengan pilar kasus: Ambang volume (Meningkat) untuk skor z volume dan Ambang penurunan penularan untuk penurunan harga satu sesi. Keduanya diubah di Aturan riset investor.</p>
        <NextStep title="Kembali ke kasus aktif" description="Emiten yang melewati ambang tetapi rekamannya belum lengkap belum bisa dibuka sebagai kasus. Kasus yang bisa diperiksa ada di Kasus aktif." href="/cases" action="Buka Kasus aktif" secondary={{ href: "/playbook", label: "Aturan riset investor" }} />
      </div> : null}

      {activeView === "picker" ? <div>
        <Panel className="overflow-hidden">
          <div className="border-b border-border p-4">
            <h2 className="editorial text-xl">Bandingkan bukti, bukan skor</h2>
            <p className="mt-1 text-sm text-muted-foreground">Pilih kolom emiten untuk menambah atau mengganti, hingga tiga emiten berkasus lengkap.</p>
          </div>
          <div className="overflow-x-auto">
            <table className="w-full min-w-[680px] table-fixed text-left text-xs">
              <colgroup><col className="w-40" />{selected.map((_, index) => <col key={index} className="w-[calc((100%-10rem)/3)]" />)}</colgroup>
              <thead className="border-b border-border bg-background">
                <tr>
                  <th className="px-4 py-3 align-bottom">Pemeriksaan</th>
                  {selected.map((symbol, index) => <th key={index} className="px-4 py-3 align-bottom font-normal">
                    {openSlot === index ? <SymbolCombobox
                      label={`Cari emiten untuk kolom ${index + 1}`}
                      exclude={selected.filter((item, itemIndex): item is SymbolCode => Boolean(item) && itemIndex !== index)}
                      onSelect={(picked) => selectSlot(index, picked)}
                      onClose={() => setOpenSlot(null)}
                    /> : symbol ? <div className="flex items-center gap-1.5">
                      <TickerAvatar symbol={symbol} size="sm" />
                      <button type="button" onClick={() => setOpenSlot(index)} className="font-mono text-sm font-semibold text-primary hover:underline">{symbol}</button>
                      <button type="button" onClick={() => removeSlot(index)} aria-label={`Hapus ${symbol} dari perbandingan`} className="grid size-4 place-items-center rounded-full text-muted-foreground hover:bg-muted hover:text-foreground"><IconClose aria-hidden="true" className="size-3" /></button>
                    </div> : <button type="button" onClick={() => setOpenSlot(index)} className="inline-flex items-center gap-1.5 text-xs text-muted-foreground hover:text-primary"><IconSearch aria-hidden="true" className="size-3" />Tambah emiten</button>}
                  </th>)}
                </tr>
              </thead>
              <tbody className="divide-y divide-border">
                {compareRows.map((row) => {
                  const items = selected.map((symbol) => (symbol ? compared.find((entry) => entry.company.symbol === symbol) : undefined));
                  // A row is lit only when at least two columns can be compared
                  // and one of them is strictly ahead; a tie lights nothing.
                  const scores = items.map((item) => (item && row.score ? row.score(item) : undefined));
                  const known = scores.filter((value): value is number => value !== undefined);
                  const top = known.length >= 2 ? Math.max(...known) : undefined;
                  const leader = top !== undefined && known.filter((value) => value === top).length === 1 ? scores.indexOf(top) : -1;
                  return <tr key={row.label}>
                    <th className="px-4 py-3 align-top font-medium">{row.label}</th>
                    {items.map((item, index) => {
                      const lit = index === leader;
                      return <td key={index} className={cn("px-4 py-3 align-top transition-colors", lit && "bg-muted font-semibold")}>{item ? <span className="flex flex-wrap items-center gap-2">{row.render(item)}{lit ? <span className="inline-flex h-5 items-center rounded-lg border border-foreground px-1.5 text-xs font-medium">Terkuat</span> : null}</span> : <span className="text-muted-foreground">—</span>}</td>;
                    })}
                  </tr>;
                })}
              </tbody>
            </table>
          </div>
          <p className="border-t border-border px-4 py-3 text-xs text-subtle-foreground">Terkuat: sinyal paling jauh dari nol di baris itu, atau status bukti yang paling kuat. Ini urutan pemeriksaan, bukan peringkat investasi.</p>
        </Panel>
        {activeSymbols.length ? <NextStep title={`Periksa ${activeSymbols[0]} lebih dalam`} description="Perbandingan menunjukkan di mana bukti berbeda. Buka kasusnya untuk membaca buktinya langkah demi langkah." href={`/cases/${activeSymbols[0]}`} action={`Buka ${activeSymbols[0]}`} secondary={{ href: "/cases", label: "Kembali ke Kasus aktif" }} /> : <NextStep title="Pilih emiten untuk dibandingkan" description="Tekan Tambah emiten di kepala kolom, lalu pilih dari daftar atau ketik kode saham." href="/cases" action="Kembali ke Kasus aktif" />}
      </div> : null}
    </div>
  );
}

export default function ResearchCasesPage() {
  return <Suspense fallback={<Panel className="h-72 shimmer" aria-label="Memuat kasus" />}><ResearchCasesContent /></Suspense>;
}