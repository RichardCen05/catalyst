"use client";

import { ThumbsDown, ThumbsUp } from "lucide-react";
import { useCatalystStore } from "@/lib/store";
import type { PillarKey, SymbolCode } from "@/lib/types";
import { cn } from "@/lib/utils";

export function EvidenceFeedback({ symbol, pillar, label }: { symbol: SymbolCode; pillar: PillarKey; label: string }) {
  const feedback = useCatalystStore((state) => state.feedback);
  const recordFeedback = useCatalystStore((state) => state.recordFeedback);
  const targetId = `pillar:${symbol}:${pillar}`;
  const current = feedback.find((item) => item.targetId === targetId);
  const targetLabel = `${symbol} · ${label}`;

  const record = (action: "useful" | "not-useful") => {
    recordFeedback({ symbol, targetId, targetLabel, action });
  };

  return (
    <div role="group" className="flex min-w-0 flex-1 flex-wrap items-center gap-2" aria-label={`Penilaian bukti ${targetLabel}`}>
      <span className="text-xs text-muted-foreground">Bukti ini</span>
      <button
        type="button"
        aria-pressed={current?.action === "useful"}
        onClick={() => record("useful")}
        className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", current?.action === "useful" ? "border-positive/40 bg-positive/10 text-positive" : "border-border text-muted-foreground hover:border-positive/40 hover:text-foreground")}
      >
        <ThumbsUp aria-hidden="true" className="size-3.5" />Berguna
      </button>
      <button
        type="button"
        aria-pressed={current?.action === "not-useful"}
        onClick={() => record("not-useful")}
        className={cn("inline-flex min-h-8 items-center gap-1.5 rounded-lg border px-2 text-xs font-medium transition-colors focus-visible:outline-none focus-visible:ring-2 focus-visible:ring-ring", current?.action === "not-useful" ? "border-danger/40 bg-danger/10 text-danger" : "border-border text-muted-foreground hover:border-danger/40 hover:text-foreground")}
      >
        <ThumbsDown aria-hidden="true" className="size-3.5" />Kurang relevan
      </button>
      <span className="basis-full text-xs leading-4 text-muted-foreground sm:basis-auto">Hanya mengubah urutan kasus di Riset & Analisis. Angka, status bukti, dan kesimpulan tidak berubah.</span>
    </div>
  );
}
