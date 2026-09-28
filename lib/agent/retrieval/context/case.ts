import { DATA_AS_OF_LABEL, companies, demoProfiles } from "@/lib/data/fixtures";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { uiLabel } from "@/lib/ui-labels";
import type { ContextBundle } from "@/lib/agent/retrieval/types";
import type { SymbolCode } from "@/lib/types";

/**
 * A case, reduced to the lines a question can be answered from.
 *
 * The engine is imported inside the function rather than at module scope. The
 * engine will import the retrieval layer once the retrieved handler is wired,
 * and a module-level import here would close that circle at load time.
 *
 * The profile is the demo default rather than the reader's: these lines do not
 * depend on a watchlist, and threading one through would make every reader's
 * copy of an identical bundle distinct, which is exactly what the answer cache
 * is keyed to avoid.
 */
export async function buildCaseBundle(symbol: SymbolCode): Promise<ContextBundle> {
  const { agentEngine } = await import("@/lib/agent/engine");
  const analysis = await agentEngine.analyzeCompany(symbol, demoProfiles[0]);
  if (!analysis) {
    // The name still matters: without it the material for INCO never says
    // Vale Indonesia anywhere, so a reader who asked about the company by
    // name is answered material that does not contain it.
    const company = companies.find((entry) => entry.symbol === symbol);
    const named = company ? `${symbol} (${company.name}), sektor ${company.sector}` : symbol;
    const body = `${named} belum punya kasus lengkap pada rekaman ini.`;
    return { id: `case:${symbol}`, kind: "case", title: symbol, body, figures: [], citations: [], symbols: [symbol] };
  }
  const body = [
    `${symbol} (${analysis.company.name}), sektor ${analysis.company.sector}.`,
    // Every figure below was recorded, not fetched when the question was
    // asked. Without the date in the material the model has nothing to
    // qualify a price with, and the sentence reads as today's screen.
    `Semua angka di bawah berasal dari rekaman ${DATA_AS_OF_LABEL}, bukan harga berjalan.`,
    `Perubahan material: ${analysis.materialChange.whatChanged}`,
    `Pembanding: ${analysis.materialChange.baseline}`,
    `Kenapa penting: ${analysis.materialChange.whyMaterial}`,
    `Status bukti: ${uiLabel(analysis.evidenceState)}. ${analysis.thesis}`,
    `Pemicu: ${analysis.trigger.title}`,
    `Tindakan riset: ${analysis.researchDisposition.label}. ${analysis.researchDisposition.reason}`,
    `Jalur sebab akibat utama: ${analysis.primaryCausalPath}`,
    ...analysis.pillars.map((pillar) => `${pillar.label} (${uiLabel(pillar.status)}): ${pillar.summary}`),
    // What would overturn the case, and what is still open. These are the
    // panels a reader asks "apa yang membatalkan" about; leaving them out of
    // the material meant the question could only be matched to page copy.
    `Bukti penyangkal: ${analysis.counterEvidence.join(" ")}`,
    ...analysis.businessImpact.map((impact) => `Dampak bisnis ${impact.label} (${uiLabel(impact.status)}): ${impact.observable}.`),
    `Pertanyaan yang belum terjawab: ${analysis.unresolvedQuestions.join(" ")}`,
    `Indikator yang dipantau: ${analysis.researchDisposition.monitorObservable}. ${analysis.researchDisposition.reopenWhen}`,
    ...(analysis.missingEvidence.length ? [`Batas data: ${analysis.missingEvidence.join("; ")}`] : []),
  ].join("\n");
  return {
    id: `case:${symbol}`,
    kind: "case",
    title: `${symbol} — ${analysis.company.name}`,
    body,
    figures: extractNumerals(body),
    citations: analysis.sources,
    symbols: [symbol],
  };
}
