import { companies, coverageInfo } from "@/lib/data/fixtures";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle, RequestContext } from "@/lib/agent/retrieval/types";
import type { AnalysisCase, Citation } from "@/lib/types";

/**
 * The reader's own open cases, computed the way the screen computes them.
 *
 * `/cases` calls `analyzeCompany` once per watchlist symbol with the
 * reader's playbook, notes and mandate (`app/cases/page.tsx`). This calls the
 * same function with the same inputs, so the answer and the screen cannot
 * disagree about which cases exist — the one failure a numeral verifier
 * cannot catch, because every figure in such an answer is legitimate and only
 * the set is wrong.
 *
 * A watched symbol with no complete case is named and said to be incomplete
 * rather than dropped. Silently shortening a reader's own list is how "kasus
 * aktif saya" comes back with fewer rows than the screen shows.
 */
export async function buildActiveCasesBundle(context: RequestContext): Promise<ContextBundle> {
  const { agentEngine } = await import("@/lib/agent/engine");
  const watchlist = context.profile.watchlist.filter((symbol) =>
    companies.some((company) => company.symbol === symbol));
  const analyses = await Promise.all(watchlist.map(async (symbol) => ({
    symbol,
    analysis: await agentEngine.analyzeCompany(symbol, context.profile, {
      mandate: context.caseMandate,
      playbook: context.playbook,
      userInsights: context.userInsights,
    }),
  })));

  const open = analyses.filter((row): row is { symbol: typeof row.symbol; analysis: AnalysisCase } =>
    row.analysis !== null);
  const incomplete = analyses.filter((row) => row.analysis === null);

  const body = [
    // The denominator is the reader's own list, not the registry. "2 dari 18"
    // answers a question about all eighteen; the reader asked about theirs.
    `Kasus aktif pada daftar pantauan pembaca: ${open.length} dari ${watchlist.length} emiten yang dipantau.`,
    ...open.map(({ analysis }) => [
      `- ${analysis.company.symbol} (${analysis.company.name}), sektor ${analysis.company.sector}.`,
      `Perubahan material: ${analysis.materialChange.whatChanged}`,
      `Pembanding: ${analysis.materialChange.baseline}`,
      `Tindakan riset: ${analysis.researchDisposition.label}.`,
    ].join(" ")),
    ...incomplete.map(({ symbol }) => {
      const missing = coverageInfo[symbol]?.missing ?? [];
      return `- ${symbol} dipantau tetapi belum punya kasus lengkap${missing.length ? `: ${missing.join(", ")} belum ada` : ""}.`;
    }),
  ].join("\n");

  const citations = new Map<string, Citation>();
  for (const { analysis } of open) {
    for (const citation of analysis.sources) citations.set(citation.id, citation);
  }

  return {
    id: "view:cases-active",
    kind: "view",
    scope: "user",
    view: "cases",
    title: "Kasus aktif pada daftar pantauan",
    body,
    figures: extractNumerals(body),
    citations: [...citations.values()],
    symbols: watchlist,
  };
}
