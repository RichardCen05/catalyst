"use client";

import Link from "next/link";
import { ArrowRight } from "lucide-react";
import { TeachAgent } from "@/components/teach-agent";
import { useCatalystStore } from "@/lib/store";
import type { PillarKey, SymbolCode, UserInsight } from "@/lib/types";
import { Panel, PanelHeader } from "@/components/ui/panel";

/**
 * The case page's half of the teach box.
 *
 * It is the same form the AI Learning page carries, with the issuer already
 * decided by the case being read — one way to teach Catalyst, whichever page
 * the reader happens to be on. What belongs only here is the trail underneath
 * it: the notes already filed against this issuer, so a reader does not repeat
 * one they filed last week.
 */

const pillarLabels: Record<PillarKey, string> = {
  concentration: "Konsentrasi",
  volume: "Volume",
  momentum: "Momentum",
  catalyst: "Katalis",
};

const statusLabels: Record<UserInsight["status"], string> = {
  pending: "menunggu",
  incorporated: "diperiksa",
  dismissed: "diabaikan",
};

export function AnalysisReview({ symbol }: { symbol: SymbolCode }) {
  const insights = useCatalystStore((state) => state.insights);
  const symbolInsights = insights.filter((insight) => insight.symbol === symbol);

  return (
    <div className="space-y-4">
      <TeachAgent symbol={symbol} />

      {symbolInsights.length ? (
        <Panel className="overflow-hidden">
          <PanelHeader eyebrow="Riwayat" title={`${symbolInsights.length} ajaran pada ${symbol}`} />
          <div className="divide-y divide-border">
            {symbolInsights.slice(0, 3).map((insight) => (
              <article key={insight.id} className="p-4">
                <div className="flex flex-wrap items-center gap-2">
                  <span className="rounded border border-attention/30 bg-attention/8 px-1.5 py-0.5 font-mono text-[9px] uppercase tracking-wider text-attention-foreground">{statusLabels[insight.status]}</span>
                  <span className="text-[11px] text-muted-foreground">{insight.pillar ? pillarLabels[insight.pillar] : "Seluruh analisis"}</span>
                </div>
                <p className="mt-2 text-xs leading-5">{insight.note}</p>
              </article>
            ))}
          </div>
          <div className="border-t border-border px-4 py-3">
            <Link href={`/ai-learning?symbol=${symbol}`} className="inline-flex min-h-9 items-center gap-1 text-xs font-medium text-primary hover:underline">
              Lihat garis waktu {symbol}<ArrowRight aria-hidden="true" className="size-3.5" />
            </Link>
          </div>
        </Panel>
      ) : null}
    </div>
  );
}
