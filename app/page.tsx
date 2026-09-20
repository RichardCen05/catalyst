"use client";

import { useEffect, useMemo, useState } from "react";
import Link from "next/link";
import { buildMarketGraph } from "@/lib/agent/market-graph";
import { companies, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { useCatalystStore } from "@/lib/store";
import type { MarketCausalGraph, SymbolCode } from "@/lib/types";
import { formatAsOf } from "@/lib/utils";
import { CitationDialog } from "@/components/citation-dialog";
import { MarketCausalMap } from "@/components/market-causal-map";
import { PageHeader } from "@/components/page-header";
import { Panel } from "@/components/ui/panel";
import { IconArrowRight, IconBranch, IconClock, IconCopilot, IconSignal } from "@/components/ui/icons";

export default function DashboardPage() {
  const { profile, playbook, insights, caseMandates, caseClarifications, caseStatuses, caseResolutions } = useCatalystStore();
  // Relevance floor for the whole board: lower draws more of the recorded
  // links, higher thins it to the strongest paths. Same semantics as the
  // per-issuer chain so the two views can be compared.
  const [minRelevance, setMinRelevance] = useState(60);
  const [graph, setGraph] = useState<MarketCausalGraph | undefined>(undefined);
  const [reloading, setReloading] = useState(false);

  // Closed cases leave the board: the dashboard is the open work, and a
  // resolved case that keeps drawing six cards is noise the user already
  // dismissed once.
  const openSymbols = useMemo(
    () => profile.watchlist.filter((symbol) => caseStatuses[symbol] !== "closed"),
    [profile.watchlist, caseStatuses],
  );
  const symbolKey = openSymbols.join(",");

  useEffect(() => {
    let cancelled = false;
    void buildMarketGraph(openSymbols, profile, {
      minRelevance,
      context: (symbol: SymbolCode) => ({
        mandate: caseMandates[symbol],
        clarificationChoice: caseClarifications[symbol],
        playbook,
        userInsights: insights,
        resolution: caseResolutions[symbol],
      }),
    }).then((result) => {
      if (cancelled) return;
      setGraph(result);
      setReloading(false);
    });
    return () => { cancelled = true; };
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [symbolKey, profile, minRelevance, caseMandates, caseClarifications, playbook, insights, caseResolutions]);

  const asOfDate = new Date(DATA_AS_OF);
  const [stalenessDays] = useState(() => Math.max(0, Math.round((Date.now() - new Date(DATA_AS_OF).getTime()) / 86_400_000)));
  const pending = insights.filter((item) => item.status === "pending");

  // The board's counters read the recorded universe: closes from the daily
  // recording, names and market caps from the company report overview.
  const citations = useMemo(
    () => [
      ...events.filter((event) => event.impactLinks.some((link) => openSymbols.includes(link.symbol))).flatMap((event) => event.citations),
      ...companies.flatMap((company) => company.citations),
    ],
    [openSymbols],
  );

  const header = (
    <PageHeader
      eyebrow="Riset saham komoditas IDX"
      title="Apa yang menggerakkan daftar pantauan?"
      description="Seluruh kasus terbuka digambar sebagai satu peta sebab akibat: sumber terekam, mekanisme yang dihipotesiskan, emiten, lalu dampak bisnis yang diuji. Sumber dan jalur yang dipakai lebih dari satu emiten digambar sekali lalu bercabang, jadi terlihat di mana kasus-kasus itu bertemu."
      action={<CitationDialog citations={citations} label="Sumber" />}
    />
  );

  if (graph === undefined) {
    return (
      <div>
        {header}
        <Panel className="h-[560px] animate-pulse bg-muted" aria-label="Memuat peta sebab akibat" />
      </div>
    );
  }

  const sourceCount = graph.nodes.filter((node) => node.kind === "source").length;
  const impactCount = graph.nodes.filter((node) => node.kind === "business-impact").length;
  // Channels more than one issuer runs through: the count that says whether
  // the board is one web or six chains that happen to share a page.
  const hubCount = graph.nodes.filter((node) => node.kind === "mechanism" && node.symbols.length > 1).length;

  return (
    <div>
      {header}

      <section className="mb-4 flex flex-wrap items-center gap-x-5 gap-y-2 rounded-xl border border-border bg-surface px-4 py-3 text-xs" aria-label="Status pembaruan">
        <span className="inline-flex items-center gap-2 font-medium">
          <IconSignal aria-hidden="true" className="size-4 text-primary" />
          {graph.symbols.length} kasus terbuka di peta
        </span>
        <span className="text-muted-foreground"><strong className="font-mono text-foreground">{sourceCount}</strong> sumber terekam</span>
        <span className="text-muted-foreground"><strong className="font-mono text-attention-foreground">{graph.sharedSourceIds.length}</strong> pemicu bersama</span>
        <span className="text-muted-foreground"><strong className="font-mono text-attention-foreground">{hubCount}</strong> jalur dipakai bersama</span>
        <span className="text-muted-foreground"><strong className="font-mono text-foreground">{impactCount}</strong> dampak bisnis dapat diuji</span>
        <span className="text-muted-foreground"><strong className="font-mono text-attention-foreground">{pending.length}</strong> catatan menunggu</span>
        <span className="text-muted-foreground">Rekaman {stalenessDays} hari lalu — bukan pasar live</span>
        <span className="ml-auto inline-flex items-center gap-1.5 font-mono text-[10px] uppercase tracking-wider text-muted-foreground">
          <IconClock aria-hidden="true" className="size-3" />{formatAsOf(DATA_AS_OF)} WIB
        </span>
      </section>

      {graph.symbols.length === 0 ? (
        <Panel className="p-8 text-center">
          <IconBranch aria-hidden="true" className="mx-auto size-6 text-muted-foreground" />
          <h2 className="mt-3 font-semibold">Belum ada kasus terbuka</h2>
          <p className="mt-1 text-sm text-muted-foreground">Tambahkan emiten ke daftar pantauan, atau buka kembali kasus yang sudah ditutup.</p>
          <Link href="/cases" className="mt-4 inline-flex min-h-10 items-center gap-2 rounded-[6px] border border-border px-3 text-sm font-medium text-primary hover:bg-muted">
            Semua kasus<IconArrowRight aria-hidden="true" className="size-4" />
          </Link>
        </Panel>
      ) : (
        <MarketCausalMap
          // Remount when the board's shape changes: see MarketCausalMap.
          key={`${symbolKey}:${minRelevance}`}
          graph={graph}
          reloading={reloading}
          toolbar={
            <div className="flex flex-wrap items-center gap-x-4 gap-y-3 border-b border-border px-4 py-3">
              <div className="min-w-0">
                <p className="meta text-muted-foreground">Peta sebab akibat</p>
                <h2 className="editorial text-[17px] text-foreground">Semua kasus dalam satu jalur</h2>
              </div>
              <label className="ml-auto flex items-center gap-2 text-xs font-medium text-muted-foreground">
                Ambang relevansi
                <select
                  aria-label="Ambang relevansi peta"
                  value={minRelevance}
                  onChange={(event) => { setReloading(true); setMinRelevance(Number(event.target.value)); }}
                  className="h-9 rounded-[6px] border border-border bg-surface px-2 font-mono text-xs text-foreground outline-none focus:border-primary focus:ring-2 focus:ring-ring/25"
                >
                  <option value={40}>≥ 40 · lebar</option>
                  <option value={60}>≥ 60 · standar</option>
                  <option value={75}>≥ 75 · kuat</option>
                  <option value={90}>≥ 90 · terkuat</option>
                </select>
              </label>
              <Link href="/impact" className="inline-flex min-h-9 items-center gap-1 rounded-md px-2 text-xs font-medium text-primary hover:bg-primary/10">
                Uji satu emiten<IconArrowRight aria-hidden="true" className="size-3.5" />
              </Link>
            </div>
          }
        />
      )}

      <section className="mt-4 flex flex-col gap-3 rounded-xl border border-primary/25 bg-primary/8 p-4 sm:flex-row sm:items-center sm:justify-between" aria-labelledby="ask-agent-title">
        <div>
          <h2 id="ask-agent-title" className="font-semibold">Ada jalur yang ingin diuji?</h2>
          <p className="mt-1 text-sm text-muted-foreground">
            Asisten membaca rekaman {asOfDate.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })}, sumber, dan catatan dalam konteks daftar pantauan.
          </p>
        </div>
        <Link href="/copilot" className="inline-flex min-h-11 shrink-0 items-center justify-center gap-2 rounded-lg bg-primary px-4 text-sm font-semibold text-primary-foreground">
          <IconCopilot aria-hidden="true" className="size-4" />Tanya asisten
        </Link>
      </section>
    </div>
  );
}
