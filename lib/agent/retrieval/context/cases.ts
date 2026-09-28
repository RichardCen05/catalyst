import { companies, coverageInfo, priceSeries, missingList } from "@/lib/data/fixtures";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { checkMovement } from "@/lib/agent/coverage";
import { resolveThresholds } from "@/lib/agent/thresholds";
import type { ContextBundle, RequestContext } from "@/lib/agent/retrieval/types";

const decimal = new Intl.NumberFormat("id-ID", { minimumFractionDigits: 1, maximumFractionDigits: 1 });
const signed = (value: number) => (decimal.format(Math.abs(value)) === decimal.format(0) ? decimal.format(0) : `${value < 0 ? "-" : ""}${decimal.format(Math.abs(value))}`);
const percentOf = (fraction: number) => `${signed(fraction * 100)}%`;

/**
 * Which emiten carry a complete case, and what the rest are missing.
 *
 * Coverage is computed over the whole registry rather than the analysed
 * subset, so the denominator is always present. A question about all the
 * cases can then be answered with the count it actually asked for.
 *
 * It also carries the threshold test the "Semua emiten" tab runs on every
 * price series, with the reader's own floors, so "which emiten did not move"
 * is answered from the test rather than from the absence of a case: an
 * emiten can move past a floor and still have no case because a recording
 * is missing.
 */
export async function buildCasesBundle(context?: RequestContext): Promise<ContextBundle> {
  const thresholds = resolveThresholds(context?.playbook);
  const analysed = companies.filter((company) => coverageInfo[company.symbol]?.analyzed);
  const rest = companies.filter((company) => !coverageInfo[company.symbol]?.analyzed);
  const body = [
    `${analysed.length} dari ${companies.length} emiten terekam punya kasus riset lengkap: ${analysed.map((company) => company.symbol).join(", ")}.`,
    ...rest.map((company) => {
      const missing = coverageInfo[company.symbol]?.missing ?? [];
      return `- ${company.symbol} belum lengkap${missing.length ? `: ${missingList(missing)} belum ada` : ""}.`;
    }),
    `Uji ambang sesi terakhir (ambang volume z ${decimal.format(thresholds.volumeZFloor)}, ambang penurunan satu sesi ${percentOf(-Math.abs(thresholds.contagionDropFloor))}):`,
    ...companies.map((company) => {
      const movement = checkMovement(priceSeries[company.symbol] ?? [], thresholds);
      if (movement.status === "insufficient") return `- ${company.symbol}: data belum cukup untuk diuji.`;
      const change = movement.lastSessionChange === null ? "" : `, sesi terakhir ${percentOf(movement.lastSessionChange)}`;
      return `- ${company.symbol}: ${movement.status === "crossed" ? "melewati ambang" : "tidak melewati ambang"} (volume z ${movement.volumeZ === null ? "belum tersedia" : signed(movement.volumeZ)}${change}).`;
    }),
  ].join("\n");
  return {
    id: "view:cases",
    kind: "view",
    scope: "registry",
    title: "Cakupan kasus",
    body,
    figures: extractNumerals(body),
    // Counted from the recorded registry, so the answer carries the sources
    // those recordings arrived with rather than presenting a bare figure.
    citations: [...new Map(analysed.flatMap((company) => company.citations).map((citation) => [citation.id, citation])).values()],
    symbols: analysed.map((company) => company.symbol),
  };
}
