import type { Citation, FinancialInput, MarketEvent, SymbolCode } from "@/lib/types";

/** Arah tren dari seri kuartalan numerik — tidak pernah parse prose interpretasi. */
export type TrendDirection = "up" | "down" | "flat" | "unknown";

const HEADLINE_LABELS = ["Revenue", "Net interest income"];

export function headlineLabel(rows: FinancialInput[]): string | undefined {
  for (const label of HEADLINE_LABELS) {
    if (rows.some((r) => r.label === label)) return label;
  }
  return undefined;
}

export function directionOfFinancialTrend(
  financialContext: FinancialInput[],
  label: string,
): TrendDirection {
  const row = financialContext.find((r) => r.label === label);
  const hist = row?.history?.filter((p) => typeof p.value === "number" && Number.isFinite(p.value)) ?? [];
  if (hist.length < 2) return "unknown";
  const first = hist[0].value;
  const last = hist[hist.length - 1].value;
  if (!Number.isFinite(first) || !Number.isFinite(last)) return "unknown";
  const denom = Math.abs(first) < 1e-9 ? 1 : Math.abs(first);
  const change = (last - first) / denom;
  if (change > 0.02) return "up";
  if (change < -0.02) return "down";
  return "flat";
}

export function checkNarrativeAgainstFinancials(args: {
  event: MarketEvent;
  symbol: SymbolCode;
  financialContext: FinancialInput[];
}): { text: string; citations: Citation[] } | null {
  const { event, symbol, financialContext } = args;
  const link = event.impactLinks.find((l) => l.symbol === symbol);
  if (!link) return null;
  if (link.direction !== "Supported" && link.direction !== "Adverse") return null;
  const label = headlineLabel(financialContext);
  if (!label) return null;
  const trend = directionOfFinancialTrend(financialContext, label);
  // unknown/flat → diam. Silence beats a guess.
  if (trend === "unknown" || trend === "flat") return null;
  const opposed = (link.direction === "Supported" && trend === "down") ||
    (link.direction === "Adverse" && trend === "up");
  if (!opposed) return null;
  const row = financialContext.find((r) => r.label === label)!;
  const dirWord = link.direction === "Supported" ? "Mendukung" : "Berlawanan";
  const trendWord = trend === "up" ? "meningkat" : "menurun";
  const firstP = row.history?.[0]?.period ?? row.period;
  const lastP = row.history?.at(-1)?.period ?? row.period;
  return {
    text: `Peristiwa "${event.title}" berarah ${dirWord} untuk ${symbol}, sementara ${label} ${trendWord} dari ${firstP} ke ${lastP}. Apakah narasi peristiwa selaras dengan angka terekam atau ada penjelasan yang belum tercatat?`,
    citations: [...event.citations, ...row.citations],
  };
}
