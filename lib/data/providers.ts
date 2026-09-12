import { analysisFixtures, companies, events } from "@/lib/data/fixtures";
import type { MarketDataProvider, NewsProvider } from "@/lib/types";

export const fixtureMarketDataProvider: MarketDataProvider = {
  listCompanies: () => companies,
  getCompany: (symbol) => companies.find((company) => company.symbol === symbol.toUpperCase()),
  getDailySeries: (symbol) => analysisFixtures[symbol.toUpperCase()]?.priceSeries ?? [],
  getBrokerEvidence: (symbol) => analysisFixtures[symbol.toUpperCase()]?.broker,
  getCompanyEvents: (symbol) => events.filter((event) =>
    event.impactLinks.some((link) => link.symbol === symbol.toUpperCase()),
  ),
};

export const fixtureNewsProvider: NewsProvider = {
  listEvents: () => events,
  getEvent: (id) => events.find((event) => event.id === id),
};
