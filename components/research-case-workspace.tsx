import Link from "next/link";
import { GitBranch } from "lucide-react";
import { useSearchParams } from "next/navigation";
import { companies, primarySymbol, WINDOW_SESSIONS } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import { NextStep } from "@/components/next-step";
import type { PillarKey, ResearchCase, SymbolCode } from "@/lib/types";
import { AnalysisReview } from "@/components/analysis-review";
import { CaseMemoActions } from "@/components/case-verdict";
import { CaseResolutionPanel } from "@/components/case-resolution";
import { CitationDialog } from "@/components/citation-dialog";
import { EvidenceCard } from "@/components/evidence-card";
import { StatusBadge } from "@/components/ui/status-badge";
import { cn } from "@/lib/utils";
import { uiLabel } from "@/lib/ui-labels";

/** `review` stays the URL value so links and the tour keep working; the
 *  reader sees the step it actually is: the decision the case ends on. */
export type ResearchCaseTab = "market" | "business" | "review";

const tabLabels: Array<{ value: ResearchCaseTab; label: string }> = [
  { value: "market", label: "Pasar" },
  { value: "business", label: "Bisnis" },
  { value: "review", label: "Keputusan" },
];

const impactLink = "inline-flex min-h-9 shrink-0 items-center gap-2 rounded-lg border border-border-strong bg-background px-3 text-sm font-medium transition-shadow hover:shadow-[0_0_0_3px_var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring";

function StepHeader({ id, title, description, action }: { id: string; title: string; description: string; action?: React.ReactNode }) {
  return (
    <header className="mb-5 flex flex-col gap-4 sm:flex-row sm:items-end sm:justify-between">
      <div className="max-w-2xl"><h2 id={id} className="editorial text-xl">{title}</h2><p className="mt-1 text-sm text-muted-foreground">{description}</p></div>
      {action}
    </header>
  );
}

export function ResearchCaseWorkspace({ analysis, symbol }: {
  analysis: ResearchCase;
  symbol: SymbolCode;
}) {
  const searchParams = useSearchParams();
  const requestedTab = searchParams.get("tab") as ResearchCaseTab | null;
  const activeTab = tabLabels.some((tab) => tab.value === requestedTab) ? requestedTab as ResearchCaseTab : "market";
  const marketPillars = analysis.pillars.filter((item) => item.key !== "catalyst");
  const requestedPillar = searchParams.get("pillar") as PillarKey | null;
  const activePillar = marketPillars.some((item) => item.key === requestedPillar) ? requestedPillar : marketPillars[0]?.key;
  const marketPillar = marketPillars.find((item) => item.key === activePillar) ?? marketPillars[0];
  const catalystPillar = analysis.pillars.find((item) => item.key === "catalyst");
  const watchlist = useCatalystStore((state) => state.profile.watchlist);
  const caseStatuses = useCatalystStore((state) => state.caseStatuses);
  // The next case to read: the next open, fully recorded issuer after this one
  // in the reader's own watchlist order, wrapping round to the start.
  const order = watchlist.filter((item) => item === symbol || (companies.some((company) => company.symbol === item && company.analyzed) && caseStatuses[item] !== "closed"));
  const nextCase = order.length > 1 ? order[(order.indexOf(symbol) + 1) % order.length] : undefined;
  const openImpact = <Link href={`/impact?company=${symbol}`} data-tour-action={symbol === primarySymbol ? "open-impact" : undefined} className={impactLink}><GitBranch aria-hidden="true" className="size-4" />Buka peta sebab akibat</Link>;

  return (
    <div>
      <section aria-label="Pertanyaan yang diuji" className="mb-6 flex flex-col gap-1 rounded-lg border border-border bg-surface px-4 py-3 sm:flex-row sm:gap-3">
        <p className="shrink-0 text-sm font-semibold">Pertanyaan yang diuji</p>
        <p className="text-sm text-muted-foreground">{analysis.mandate}</p>
      </section>

      <nav aria-label="Bagian kasus" className="sticky top-14 z-30 mb-6 -mx-4 overflow-x-auto border-b border-border bg-background/95 px-4 backdrop-blur sm:-mx-7 sm:px-7 xl:top-0 xl:mx-0 xl:px-0">
        <div role="tablist" aria-label="Bagian kasus" className="flex min-w-max gap-6">
          {tabLabels.map((tab, index) => {
            const active = activeTab === tab.value;
            return <Link key={tab.value} id={`case-tab-${tab.value}`} data-tour-action={tab.value === "market" && symbol === primarySymbol ? "open-market" : tab.value === "business" && symbol === primarySymbol ? "open-business" : undefined} role="tab" aria-selected={active} aria-controls={`case-panel-${tab.value}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=${tab.value}`} className={cn("relative -mb-px flex min-h-11 items-center gap-2 border-b-2 border-transparent text-sm font-medium text-subtle-foreground transition-colors hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active && "border-foreground text-foreground")}><span aria-hidden="true" className={cn("grid size-5 place-items-center rounded-full text-xs font-semibold", active ? "bg-foreground text-background" : "bg-muted text-muted-foreground")}>{index + 1}</span>{tab.label}</Link>;
          })}
        </div>
      </nav>

      <section id={`case-panel-${activeTab}`} role="tabpanel" aria-labelledby={`case-tab-${activeTab}`} tabIndex={0} className="focus:outline-none">
        {activeTab === "market" && marketPillar ? <section aria-labelledby="market-confirmation-title" className="rise-in">
          <StepHeader id="market-confirmation-title" title="Konfirmasi pasar" description="Apakah konsentrasi, volume, dan momentum ikut berubah? Bagian ini belum menjelaskan penyebabnya." action={openImpact} />
          <div role="tablist" aria-label="Pemeriksaan pasar" className="mb-4 grid gap-3 sm:grid-cols-3">{marketPillars.map((item) => { const active = item.key === marketPillar.key; return <Link key={item.key} role="tab" aria-selected={active} aria-controls={`pillar-panel-${item.key}`} tabIndex={active ? 0 : -1} href={`/cases/${symbol}?tab=market&pillar=${item.key}`} className={cn("min-w-0 rounded-lg border bg-background px-4 py-3 text-left transition-shadow hover:shadow-[0_0_0_3px_var(--muted)] focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring", active ? "border-foreground" : "border-border")}><span className="block truncate text-xs font-medium text-subtle-foreground">{item.label}</span><span className="mt-0.5 block truncate text-base font-semibold">{uiLabel(item.status)}</span></Link>; })}</div>
          <div id={`pillar-panel-${marketPillar.key}`} role="tabpanel" tabIndex={0} className="focus:outline-none"><EvidenceCard pillar={marketPillar} symbol={symbol} /></div>
          <p className="mt-3 text-xs text-subtle-foreground">Jejak bukti {WINDOW_SESSIONS} hari ada di <Link href="/" className="underline underline-offset-2 hover:text-foreground">Dashboard</Link>, tampilan grafik indeks.</p>
          {(() => {
            // Walk the three market checks in order before moving on to Bisnis.
            const next = marketPillars[marketPillars.findIndex((item) => item.key === marketPillar.key) + 1];
            return next
              ? <NextStep title={`Periksa ${next.label}`} description={`${marketPillar.label} terbaca: ${uiLabel(marketPillar.status).toLowerCase()}. Lanjutkan ke pemeriksaan pasar berikutnya.`} href={`/cases/${symbol}?tab=market&pillar=${next.key}`} action={`Buka ${next.label}`} secondary={{ href: `/cases/${symbol}?tab=business`, label: "Lewati ke 2 Bisnis" }} />
              : <NextStep title="Lanjut ke 2 Bisnis" description={`Pasar terbaca: ${marketPillars.map((item) => `${item.label.toLowerCase()} ${uiLabel(item.status).toLowerCase()}`).join(", ")}. Sekarang uji apakah pemicunya bisa mencapai operasi atau keuangan ${symbol}.`} href={`/cases/${symbol}?tab=business`} action="Buka Bisnis" />;
          })()}
        </section> : null}

        {activeTab === "business" && catalystPillar ? <section aria-labelledby="business-transmission-title" data-tour="business-transmission" className="rise-in">
          <StepHeader id="business-transmission-title" title="Dampak ke bisnis" description="Apakah pemicu dapat mencapai operasi atau keuangan emiten?" action={openImpact} />
          <EvidenceCard pillar={catalystPillar} symbol={symbol} trailing={<CitationDialog citations={analysis.financialContext.flatMap((item) => item.citations)} label="Periksa data keuangan" />} />
          <section aria-labelledby="business-observables-title" className="mt-6">
            <h3 id="business-observables-title" className="editorial text-base">Indikator bisnis yang diuji</h3>
            <p className="mt-1 text-sm text-muted-foreground">Label di bawah adalah peran indikator dalam kasus ini, bukan hasil ujinya. Uji utama: indikator yang harus berubah bila perubahannya nyata. Pendukung: dibaca untuk menguatkan. Belum diuji: di luar fokus kasus ini.</p>
            <ul className="mt-3 divide-y divide-border overflow-hidden rounded-lg border border-border">
              {analysis.businessImpact.map((item) => <li key={item.dimension} className="grid gap-2 px-4 py-3 sm:grid-cols-[200px_160px_minmax(0,1fr)] sm:items-center"><span className="text-sm font-semibold">{item.label}</span><StatusBadge status={item.status} /><span className="text-sm text-muted-foreground">{item.observable}</span></li>)}
            </ul>
          </section>
          <NextStep title="Lanjut ke 3 Keputusan" description="Bukti pasar dan bisnis sudah terbaca. Tinjau ringkasannya, lalu tentukan satu tindakan riset." href={`/cases/${symbol}?tab=review`} action="Buka Keputusan" secondary={{ href: `/cases/${symbol}?tab=market`, label: "Kembali ke Pasar" }} />
        </section> : null}

        {activeTab === "review" ? <section aria-labelledby="decision-title" className="rise-in">
          <StepHeader id="decision-title" title="Keputusan" description="Baca ringkasan, lalu simpan hasil kasus di bawahnya: pilih tindakan riset dan tulis satu aturan yang bisa dipakai ulang." />
          <div className="space-y-6">
            <div className="min-w-0 space-y-4">
              <dl className="grid overflow-hidden rounded-lg border border-border sm:grid-cols-4">
                {analysis.pillars.map((item) => <div key={item.key} className="border-border px-4 py-3 not-first:border-t sm:not-first:border-l sm:not-first:border-t-0"><dt className="text-xs font-medium text-muted-foreground">{item.label}</dt><dd className="mt-0.5 text-base font-semibold">{uiLabel(item.status)}</dd></div>)}
              </dl>
              <section aria-label="Ringkasan kasus" className="rounded-lg border border-border p-4">
                <div className="flex items-center justify-between gap-3"><h3 className="text-base font-semibold">Ringkasan</h3><StatusBadge status={analysis.evidenceState} /></div>
                <p className="mt-2 text-sm">{analysis.thesis}</p>
                <p className="mt-2 text-sm text-muted-foreground">{analysis.materialChange.whyMaterial}</p>
              </section>
              <section aria-label="Pertanyaan yang belum terjawab" className="rounded-lg border border-border p-4">
                <h3 className="text-base font-semibold">Pertanyaan yang belum terjawab</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{analysis.unresolvedQuestions.slice(0, 3).map((item) => <li key={item}>{item}</li>)}</ul>
              </section>
              {analysis.missingEvidence.length ? <section aria-label="Batas data" className="rounded-lg border border-border p-4">
                <h3 className="text-base font-semibold">Batas data</h3>
                <ul className="mt-2 list-disc space-y-1.5 pl-5 text-sm text-muted-foreground">{analysis.missingEvidence.map((item) => <li key={item}>{item}</li>)}</ul>
              </section> : null}
              <CaseMemoActions researchCase={analysis} symbol={symbol} />
            </div>
            <CaseResolutionPanel researchCase={analysis} symbol={symbol} />
          </div>
          <details className="group mt-6 rounded-lg border border-border">
            <summary className="flex min-h-11 cursor-pointer list-none items-center px-4 text-sm font-medium text-muted-foreground hover:text-foreground focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-inset focus-visible:ring-ring">Koreksi analisis ini<span aria-hidden="true" className="ml-auto transition-transform group-open:rotate-180">▾</span></summary>
            <div className="border-t border-border p-4"><AnalysisReview symbol={symbol} /></div>
          </details>
          {nextCase ? <NextStep title={`Lanjut ke kasus ${nextCase}`} description="Setelah hasil kasus ini tersimpan, periksa perubahan berikutnya di daftar pantauan Anda." href={`/cases/${nextCase}`} action={`Buka ${nextCase}`} secondary={{ href: "/cases", label: "Semua kasus" }} /> : <NextStep title="Kembali ke Riset & Analisis" description="Tidak ada kasus terbuka lain di daftar pantauan Anda." href="/cases" action="Buka daftar kasus" />}
        </section> : null}
      </section>
    </div>
  );
}
