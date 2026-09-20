"use client";

import Link from "next/link";
import { coverageInfo, events, priceSeries } from "@/lib/data/fixtures";
import type { SymbolCode } from "@/lib/types";
import { PriceChart } from "@/components/price-chart";
import { PriceCompareChart } from "@/components/price-compare-chart";
import { Panel } from "@/components/ui/panel";
import { IconArrowRight, IconChart } from "@/components/ui/icons";

/**
 * The board's chart mode: the recorded window for one issuer, or several read
 * against each other.
 *
 * The node map answers "what links these cases"; this answers "what did the
 * recording do", which is the question the timeline was built for. It reads
 * the same recordings the case page reads, so nothing here is a second copy
 * of the series.
 */
export function DashboardTimeline({ symbols }: { symbols: SymbolCode[] }) {
  const recorded = symbols.filter((symbol) => (priceSeries[symbol] ?? []).length > 0);
  const unrecorded = symbols.length - recorded.length;

  if (!recorded.length) {
    return (
      <Panel className="p-8 text-center">
        <IconChart aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
        <h2 className="mt-3 font-semibold">Belum ada rekaman harian</h2>
        <p className="mt-1 text-sm text-muted-foreground">Emiten yang dipilih belum punya deret harga terekam, jadi tidak ada grafik untuk digambar.</p>
        <Link href="/cases" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[6px] border border-border px-3 text-sm font-medium text-primary hover:bg-muted">
          Semua kasus<IconArrowRight aria-hidden="true" className="size-4" />
        </Link>
      </Panel>
    );
  }

  const notice = unrecorded > 0
    ? <p className="mb-3 text-xs text-muted-foreground">{unrecorded} emiten terpilih belum punya rekaman harian, jadi tidak digambar.</p>
    : null;

  if (recorded.length === 1) {
    const symbol = recorded[0];
    const partial = coverageInfo[symbol] && !coverageInfo[symbol].analyzed ? coverageInfo[symbol].missing : [];
    const relatedEvents = events.filter((event) => event.impactLinks.some((link) => link.symbol === symbol));
    return (
      <div>
        {notice}
        {partial.length ? <p className="mb-3 text-xs text-muted-foreground">Rekaman {symbol} belum lengkap: {partial.join(", ")}. Grafik memakai harga harian yang ada.</p> : null}
        <PriceChart data={priceSeries[symbol]} symbol={symbol} events={relatedEvents} />
      </div>
    );
  }

  // The window every line is read on: the longest recorded series among the
  // selection, so a symbol with a shorter recording leaves a gap instead of
  // cutting the others short.
  const longest = recorded.reduce((widest, symbol) => (priceSeries[symbol].length > priceSeries[widest].length ? symbol : widest), recorded[0]);
  return (
    <div>
      {notice}
      <PriceCompareChart series={recorded.map((symbol) => ({ symbol, data: priceSeries[symbol] }))} ihsgFrom={priceSeries[longest]} />
    </div>
  );
}
