import type { MarketEvent, PricePoint, SymbolCode } from "@/lib/types";

export interface LagValidation {
  eventId: string;
  eventDate: string;
  spikeDate: string;
  deltaSessions: number;
  heuristicLag: string;
  withinHeuristic: boolean;
  note: string;
}

export function heuristicLagFor(event: MarketEvent): string {
  if (event.category === "company") return "0-3 sesi";
  if (event.category === "weather") return "0-5 sesi";
  if (event.category === "rates") return "5-20 sesi";
  if (event.category === "sentiment") return "1-5 sesi";
  return "1-10 sesi";
}

function heuristicMaxSessions(event: MarketEvent): number {
  if (event.category === "company") return 3;
  if (event.category === "weather") return 5;
  if (event.category === "rates") return 20;
  if (event.category === "sentiment") return 5;
  return 10;
}

/** Session date with the highest recorded volume — the spike to beat. */
export function spikeDate(series: PricePoint[]): string {
  return series.reduce((max, point) => (point.volume > max.volume ? point : max), series[0]).date;
}

/**
 * Compare the recorded event date against the recorded volume spike.
 * Both inputs are fixture dates, so the check is a consistency read —
 * it cannot confirm causality, only timing plausibility.
 */
export function validateLag(event: MarketEvent, series: PricePoint[]): LagValidation | null {
  if (!series.length) return null;
  const spike = spikeDate(series);
  const dates = series.map((point) => point.date);
  const eventIndex = dates.findIndex((date) => date >= event.publishedAt.slice(0, 10));
  const spikeIndex = dates.indexOf(spike);
  if (eventIndex === -1) return null;
  const deltaSessions = spikeIndex - eventIndex;
  const heuristicLag = heuristicLagFor(event);
  const withinHeuristic = deltaSessions >= 0 && deltaSessions <= heuristicMaxSessions(event);
  return {
    eventId: event.id,
    eventDate: event.publishedAt.slice(0, 10),
    spikeDate: spike,
    deltaSessions,
    heuristicLag,
    withinHeuristic,
    note: deltaSessions < 0
      ? "Lonjakan volume terekam SEBELUM peristiwa — waktu tidak mendukung jalur sebab akibat ini."
      : withinHeuristic
        ? `Lonjakan ${deltaSessions} sesi setelah peristiwa — konsisten dengan jeda ${heuristicLag}.`
        : `Lonjakan ${deltaSessions} sesi setelah peristiwa — di luar jeda ${heuristicLag}, perlakukan jalur dengan hati-hati.`,
  };
}

/** Recorded events touching 2+ watchlist symbols — candidate shared shocks. */
export function getSharedShocks(events: MarketEvent[], watchlist: SymbolCode[]): MarketEvent[] {
  const watched = new Set(watchlist);
  return events.filter(
    (event) => event.impactLinks.filter((link) => watched.has(link.symbol)).length >= 2,
  );
}
