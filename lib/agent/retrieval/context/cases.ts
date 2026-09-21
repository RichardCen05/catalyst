import { companies, coverageInfo } from "@/lib/data/fixtures";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";

/**
 * Which emiten carry a complete case, and what the rest are missing.
 *
 * Coverage is computed over the whole registry rather than the analysed
 * subset, so the denominator is always present. A question about all the
 * cases can then be answered with the count it actually asked for.
 */
export async function buildCasesBundle(): Promise<ContextBundle> {
  const analysed = companies.filter((company) => coverageInfo[company.symbol]?.analyzed);
  const rest = companies.filter((company) => !coverageInfo[company.symbol]?.analyzed);
  const body = [
    `${analysed.length} dari ${companies.length} emiten terekam punya kasus riset lengkap: ${analysed.map((company) => company.symbol).join(", ")}.`,
    ...rest.map((company) => {
      const missing = coverageInfo[company.symbol]?.missing ?? [];
      return `- ${company.symbol} belum lengkap${missing.length ? `: ${missing.join(", ")} belum ada` : ""}.`;
    }),
  ].join("\n");
  return {
    id: "view:cases",
    kind: "view",
    title: "Cakupan kasus",
    body,
    figures: extractNumerals(body),
    // Counted from the recorded registry, so the answer carries the sources
    // those recordings arrived with rather than presenting a bare figure.
    citations: [...new Map(analysed.flatMap((company) => company.citations).map((citation) => [citation.id, citation])).values()],
    symbols: analysed.map((company) => company.symbol),
  };
}
