import { analysisFixtures, companies, events } from "@/lib/data/fixtures";
import { getOverlayEvents } from "@/lib/web-watch/queue";
import { fetchSectors, isKnownSymbol } from "@/lib/data/sectors-client";
import type { MarketDataProvider, MarketEvent, NewsProvider, SymbolCode } from "@/lib/types";

export const fixtureMarketDataProvider: MarketDataProvider = {
  listCompanies: () => companies,
  getCompany: (symbol) => companies.find((company) => company.symbol === symbol.toUpperCase()),
  getDailySeries: (symbol) => analysisFixtures[symbol.toUpperCase()]?.priceSeries ?? [],
  getBrokerEvidence: (symbol) => analysisFixtures[symbol.toUpperCase()]?.broker,
  getCompanyEvents: (symbol) => mergedEvents().filter((event) =>
    event.impactLinks.some((link) => link.symbol === symbol.toUpperCase()),
  ),
};

/**
 * Recorded fixtures plus reviewer-accepted web-watch events. The overlay is
 * an in-process cache refreshed best-effort by the API routes — empty means
 * fixtures-only, which is a valid state, not an error.
 */
function mergedEvents(): MarketEvent[] {
  const overlay = getOverlayEvents();
  if (!overlay.length) return events;
  const ids = new Set(overlay.map((event) => event.id));
  return [...overlay, ...events.filter((event) => !ids.has(event.id))];
}

const SECTORS_KEY = process.env.SECTORS_API_KEY || "";

export const marketDataProvider: MarketDataProvider = SECTORS_KEY ? {
  listCompanies: () => companies,
  getCompany: (symbol) => companies.find((company) => company.symbol === symbol.toUpperCase()),
  getDailySeries: (symbol) => fixtureMarketDataProvider.getDailySeries(symbol),
  getBrokerEvidence: (symbol) => {
    if (SECTORS_KEY) {
      try {
        // Live sectors path available; async call handled by refresh route, not UI provider.
        return fixtureMarketDataProvider.getBrokerEvidence(symbol);
      } catch {
        return undefined;
      }
    }
    return fixtureMarketDataProvider.getBrokerEvidence(symbol);
  },
  getCompanyEvents: (symbol) => fixtureMarketDataProvider.getCompanyEvents(symbol),
} : fixtureMarketDataProvider;

export const fixtureNewsProvider: NewsProvider = {
  listEvents: () => events,
  getEvent: (id) => events.find((event) => event.id === id),
};

export const newsProvider: NewsProvider = SECTORS_KEY ? {
  listEvents: () => mergedEvents(),
  getEvent: (id) => mergedEvents().find((event) => event.id === id),
} : fixtureNewsProvider;
