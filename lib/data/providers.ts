import { analysisFixtures, companies, events } from "@/lib/data/fixtures";
import { getOverlayEvents } from "@/lib/web-watch/queue";
import type { MarketDataProvider, MarketEvent, NewsProvider } from "@/lib/types";

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

export const fixtureNewsProvider: NewsProvider = {
  listEvents: () => mergedEvents(),
  getEvent: (id) => mergedEvents().find((event) => event.id === id),
};

/**
 * Names the engine imports. A live `SECTORS_API_KEY` decides what the refresh
 * route writes into GCS for the next recorded bundle; it never decides which
 * events the chain may see. Web-watch accepts arrive through the overlay
 * above, so gating these on a Sectors key would drop scraped sources on any
 * deployment without one.
 */
export const marketDataProvider: MarketDataProvider = fixtureMarketDataProvider;
export const newsProvider: NewsProvider = fixtureNewsProvider;
