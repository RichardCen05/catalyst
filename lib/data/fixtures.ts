import {
  betas,
  brokerEvidence,
  DATA_AS_OF as GENERATED_AS_OF,
  eventIdsBySymbol,
  financialRows,
  priceSeries,
  rawCompanies,
  rawEvents,
  sectorReturns,
  subsectorContext,
  subsectorReturns,
  WINDOW_DATES,
} from "@/lib/data/market.generated";
import { locate } from "@/lib/agent/citations";
import type {
  Citation,
  Company,
  CompanyAnalysisFixture,
  FinancialInput,
  MarketEvent,
  SymbolCode,
  UserProfile,
} from "@/lib/types";

export const DATA_AS_OF = GENERATED_AS_OF;
export const WINDOW_START = WINDOW_DATES[0];
export const WINDOW_SESSIONS = WINDOW_DATES.length;

const SECTORS_DOCS = "https://docs.sectors.app/llms.txt";
const SECTORS_DAILY_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/transaction/daily";
const SECTORS_BROKER_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-summary-by-symbol";
const SECTORS_FOREIGN_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/brokers/foreign-flow-by-symbol";
const SECTORS_FINANCIAL_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/report/quarterly-financials";
const SECTORS_NEWS_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/news/news";
const SECTORS_FILINGS_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/news/filings";

const PROVIDER = "Sectors API (rekaman 2026-09-11)";

function cite(
  id: string,
  endpoint: string,
  field: string,
  label: string,
  provider = PROVIDER,
  url = SECTORS_DOCS,
  urlLabel = "Buka dokumentasi endpoint",
  access: Citation["access"] = "direct",
): Citation {
  return { id, provider, endpoint, field, asOf: DATA_AS_OF, label, url, urlLabel, access };
}

const eventById = new Map(rawEvents.map((event) => [event.id, event]));

export const citations = {
  price: (symbol: string) => cite(`price-${symbol}`, `/v2/company/report/${symbol}/?sections=overview`, "last_close_price, market_cap, sector", `${symbol} company overview`, PROVIDER, "https://docs.sectors.app/api-references/v2/indonesia/report/company-report"),
  daily: (symbol: string) => cite(`daily-${symbol}`, `/v2/daily/${symbol}/`, "date, close, volume, market_cap", `${symbol} daily series ${WINDOW_START}–${WINDOW_DATES.at(-1)}`, PROVIDER, SECTORS_DAILY_DOCS),
  broker: (symbol: string) => cite(`broker-${symbol}`, `/v2/broker-summary/${symbol}/top/`, "broker_code, buy_idr, sell_idr", `${symbol} top broker summary`, PROVIDER, SECTORS_BROKER_DOCS),
  registry: cite("registry", "/v2/brokers/", "code, is_foreign, cohort", "Broker registry", PROVIDER, "https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-registry"),
  foreign: (symbol: string) => cite(`foreign-${symbol}`, `/v2/foreign-flow/${symbol}/`, "date, net_foreign_inflow", `${symbol} foreign flow`, PROVIDER, SECTORS_FOREIGN_DOCS),
  ownership: (symbol: string) => cite(`ownership-${symbol}`, "/v2/free-float/", "symbol, free_float", `${symbol} free float`, PROVIDER, "https://docs.sectors.app/api-references/v2/indonesia/report/company-report"),
  ihsg: cite("ihsg", "/v2/index-daily/ihsg/", "date, price", `IHSG daily series ${WINDOW_START}–${WINDOW_DATES.at(-1)}`, PROVIDER, "https://docs.sectors.app/api-references/v2/indonesia/transaction/index-daily"),
  market: cite("market-snapshot", "/v2/daily/", "date, close, volume", "Snapshot pasar pada jendela rekaman", PROVIDER, SECTORS_DAILY_DOCS),
  news: (eventId: string) => {
    const event = eventById.get(eventId);
    const filing = event ? event.sourceType === "filing" : eventId.startsWith("filing-");
    const commodity = event ? event.sourceType === "commodity" : eventId.startsWith("commodity-");
    const endpoint = commodity ? "/v2/mining/commodities/" : filing ? "/v2/filings/" : "/v2/news/";
    const field = commodity ? "name, date, price_usd_per_ton" : filing ? "title, timestamp, symbol, holder_type" : "title, timestamp, symbols, tags, dimension";
    const docsUrl = commodity ? "https://docs.sectors.app/api-references/v2/others/mining/commodities-price-data" : filing ? SECTORS_FILINGS_DOCS : SECTORS_NEWS_DOCS;
    const base = cite(
      `news-${eventId}`,
      endpoint,
      field,
      event ? event.title : "Peristiwa tidak ditemukan pada rekaman",
      PROVIDER,
      event?.source ?? docsUrl,
      event?.source ? "Buka sumber asli" : "Buka dokumentasi endpoint",
      event?.source ? "provider" : "direct",
    );
    if (!event?.body) return base;
    return { ...base, span: locate(eventId, event.body, event.summary.replace(/…$/, "")) };
  },
  financial: (symbol: string) => cite(`financial-${symbol}`, `/v2/financials/quarterly/${symbol}/?n_quarters=4`, "date, revenue, earnings, financials_sector_metrics", `${symbol} quarterly financials`, PROVIDER, SECTORS_FINANCIAL_DOCS),
  external: (eventId: string) => citations.news(eventId),
};

export const companies: Company[] = rawCompanies.map((company) => ({
  ...company,
  asOf: DATA_AS_OF,
  citations: [citations.price(company.symbol)],
}));

export const events: MarketEvent[] = rawEvents.map((event) => ({
  id: event.id,
  title: event.title,
  summary: event.summary,
  body: event.body,
  category: event.category,
  sourceType: event.sourceType,
  publishedAt: event.publishedAt,
  asOf: DATA_AS_OF,
  sector: event.sector,
  impactLinks: event.impactLinks.map((link) => ({
    ...link,
    citations: [citations.news(event.id)],
  })),
  citations: [citations.news(event.id)],
}));

const financialContext = (symbol: SymbolCode): FinancialInput[] =>
  (financialRows[symbol] ?? []).map((row) => ({ ...row, citations: [citations.financial(symbol)] }));

export const analysisFixtures: Record<string, CompanyAnalysisFixture> = Object.fromEntries(
  Object.keys(brokerEvidence).map((symbol) => {
    const company = companies.find((item) => item.symbol === symbol)!;
    return [symbol, {
      symbol: symbol as SymbolCode,
      priceSeries: priceSeries[symbol],
      broker: brokerEvidence[symbol],
      sectorReturn: subsectorReturns[company.subsector] ?? sectorReturns[company.sector],
      subsectorContext: subsectorContext[company.subsector],
      beta: betas[symbol],
      catalystEventIds: eventIdsBySymbol[symbol] ?? [],
      financialContext: financialContext(symbol as SymbolCode),
    }];
  }),
);

const analyzed = companies.filter((company) => company.analyzed).map((company) => company.symbol);
const bySector = (sector: Company["sector"]) =>
  companies.filter((company) => company.sector === sector).map((company) => company.symbol);

export const demoProfiles: UserProfile[] = [
  {
    id: "flow-first", name: "Raka", description: "Flow-first, mencari konfirmasi partisipan sebelum membaca peristiwa.",
    watchlist: [...analyzed.slice(0, 5), bySector("Consumer")[0]].filter(Boolean) as SymbolCode[],
    owned: analyzed.slice(0, 3),
    config: { horizon: "event", depth: "standard", pillarOrder: ["concentration", "volume", "momentum", "catalyst"] },
    preferredSectors: ["Basic Materials", "Financials", "Infrastructure"], preferredEventTypes: ["commodity", "company"], hasOnboarded: false,
  },
  {
    id: "catalyst-first", name: "Maya", description: "Catalyst-first, membuka analisis dari jalur dampak dan timing peristiwa.",
    watchlist: ["ANTM", "INCO", "GOTO", "PGAS", "ICBP", "AMRT"],
    owned: ["GOTO", "ICBP"],
    config: { horizon: "position", depth: "forensic", pillarOrder: ["catalyst", "momentum", "volume", "concentration"] },
    preferredSectors: ["Technology", "Consumer", "Energy"], preferredEventTypes: ["policy", "currency", "rates"], hasOnboarded: true,
  },
];
