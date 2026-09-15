import type { AnalysisCase } from "@/lib/types";

export interface MonitorTrigger {
  id: string;
  label: string;
  condition: string;
  observable: string;
  /** Fixture is static, so triggers never fire yet — honest "watching" state. */
  status: "watching";
  source: string;
}

/**
 * Structured watch queue derived from the finished analysis.
 * Every trigger quotes the analysis itself (disposition, contradictions,
 * pillar follow-ups) — nothing invented, nothing live.
 */
export function deriveMonitorTriggers(analysis: AnalysisCase): MonitorTrigger[] {
  const symbol = analysis.company.symbol;
  const triggers: MonitorTrigger[] = [
    {
      id: `${symbol}-reopen`,
      label: "Buka kembali bila indikator bergerak",
      condition: analysis.researchDisposition.reopenWhen,
      observable: analysis.researchDisposition.monitorObservable,
      status: "watching",
      source: `Tindakan riset: ${analysis.researchDisposition.label}`,
    },
  ];
  for (const [index, contradiction] of analysis.contradictions.entries()) {
    triggers.push({
      id: `${symbol}-conflict-${index}`,
      label: "Konflik sumber menunggu resolusi",
      condition: `Ulangi pemeriksaan konflik setelah jendela peristiwa berakhir: ${contradiction}`,
      observable: analysis.researchDisposition.monitorObservable,
      status: "watching",
      source: "Kontradiksi lintas pilar",
    });
  }
  const catalystPillar = analysis.pillars.find((pillar) => pillar.key === "catalyst");
  if (catalystPillar) {
    triggers.push({
      id: `${symbol}-catalyst-confirm`,
      label: "Konfirmasi jalur katalis",
      condition: catalystPillar.protocol.nextQuestion,
      observable: analysis.businessImpact.find((item) => item.status === "Primary test")?.observable
        ?? analysis.researchDisposition.monitorObservable,
      status: "watching",
      source: `Pilar Katalis: ${catalystPillar.summary}`,
    });
  }
  return triggers;
}
