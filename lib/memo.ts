import type { ResearchCase } from "@/lib/types";
import { uiLabel } from "@/lib/ui-labels";

/**
 * One-page investment memo reformatted from the finished analysis.
 * No new claims — every line quotes the analysis object.
 */
export function buildInvestmentMemo(analysis: ResearchCase): string {
  const primary = analysis.businessImpact.find((item) => item.status === "Primary test");
  const lines = [
    `# Memo riset ${analysis.company.symbol} — ${analysis.company.name}`,
    ``,
    `Pemicu: ${analysis.trigger.title}`,
    `Pembanding: ${analysis.materialChange.baseline}`,
    `Alasan material: ${analysis.materialChange.whyMaterial}`,
    `Aturan: ${analysis.materialChange.rule}`,
    ``,
    `## Tesis`,
    analysis.thesis,
    ``,
    `## Bukti pasar`,
    ...analysis.pillars.map((pillar) => `- ${pillar.label} (${uiLabel(pillar.status)}): ${pillar.summary}`),
    ``,
    `## Uji bisnis utama`,
    primary ? `${primary.label}: ${primary.mechanism} Indikator: ${primary.observable}` : "Belum ada uji utama.",
    ``,
    `## Sanggahan`,
    ...analysis.counterEvidence.map((item) => `- ${item}`),
    ...(analysis.contradictions.length ? [`Konflik terbuka: ${analysis.contradictions.join(" ")}`] : []),
    ``,
    `## Tindakan riset: ${analysis.researchDisposition.label}`,
    analysis.researchDisposition.reason,
    `Pantau: ${analysis.researchDisposition.monitorObservable}`,
    `Buka kembali bila: ${analysis.researchDisposition.reopenWhen}`,
    ``,
    `## Sumber (${analysis.sources.length})`,
    ...analysis.sources.map((citation) => `- ${citation.label} · ${citation.endpoint} · ${citation.asOf}`),
    ``,
    `Rekaman ${analysis.asOf} · bukan pasar live, bukan saran transaksi.`,
  ];
  return lines.join("\n");
}
