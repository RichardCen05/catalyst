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
  revenueSegments,
  WINDOW_DATES,
} from "@/lib/data/market.generated";
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

function cite(
  id: string,
  endpoint: string,
  field: string,
  label: string,
  provider = "Sectors rekaman",
  url = SECTORS_DOCS,
  urlLabel = "Buka dokumentasi sumber",
  access: Citation["access"] = "documentation",
): Citation {
  return { id, provider, endpoint, field, asOf: DATA_AS_OF, label, url, urlLabel, access };
}

export const citations = {
  price: (symbol: string) => cite(`price-${symbol}`, "/v2/companies/top-changes/", "last_price, change_pct", `Ringkasan harga ${symbol}`, "Sectors rekaman", "https://docs.sectors.app/api-references/v2/indonesia/ranking/top-changes"),
  daily: (symbol: string) => cite(`daily-${symbol}`, `/v2/daily/${symbol}/`, "date, close, volume", `Data harian ${symbol}`, "Sectors rekaman", SECTORS_DAILY_DOCS),
  broker: (symbol: string) => cite(`broker-${symbol}`, `/v2/broker-summary/${symbol}/`, "broker_code, buy_value, sell_value", `Ringkasan broker ${symbol}`, "Sectors rekaman", SECTORS_BROKER_DOCS),
  registry: cite("registry", "/v2/brokers/", "broker_code, origin", "Daftar broker", "Sectors rekaman", "https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-registry"),
  foreign: (symbol: string) => cite(`foreign-${symbol}`, `/v2/foreign-flow/${symbol}/`, "net_foreign_inflow", `Arus asing ${symbol}`, "Sectors rekaman", SECTORS_FOREIGN_DOCS),
  ownership: (symbol: string) => cite(`ownership-${symbol}`, `/v2/company/report/${symbol}/?sections=ownership`, "free_float, shares_outstanding", `Kepemilikan ${symbol}`, "Sectors rekaman", "https://docs.sectors.app/api-references/v2/indonesia/report/company-report"),
  ihsg: cite("ihsg", "/v2/index-daily/ihsg/", "date, close", "Data harian IHSG", "Sectors rekaman", "https://docs.sectors.app/api-references/v2/indonesia/transaction/index-daily"),
  market: cite("market-snapshot", "/v2/close/", "date, symbol, close, volume", "Ringkasan pasar umum", "Sectors rekaman", "https://docs.sectors.app/api-references/v2/indonesia/transaction/close"),
  news: (eventId: string) => cite(`news-${eventId}`, eventId.includes("filing") ? "/v2/filings/" : "/v2/news/", "title, published_at, symbols, dimensions", "Berita perusahaan Sectors", "Sectors rekaman", eventId.includes("filing") ? SECTORS_FILINGS_DOCS : SECTORS_NEWS_DOCS),
  financial: (symbol: string) => cite(`financial-${symbol}`, `/v2/financials/quarterly/${symbol}/`, "period, revenue, earnings, sector_metrics", `Konteks keuangan ${symbol}`, "Sectors rekaman", SECTORS_FINANCIAL_DOCS),
  external: (eventId: string) => cite(`external-${eventId}`, `fixture://external/${eventId}`, "headline, published_at, exposure_tags", "Berita terekam dengan tautan sumber asal", "Sumber asal terekam", SECTORS_DOCS, "Buka referensi sumber", "provider"),
};

export const companies: Company[] = rawCompanies.map((company) => ({
  ...company,
  asOf: DATA_AS_OF,
  citations: [citations.price(company.symbol)],
}));

/**
 * Kabar dan filing asli dari rekaman Sectors API 11 Sep 2026
 * (data/sectors/ via lib/data/market.generated.ts). Bukan karangan.
 */
const eventCitation = (raw: (typeof rawEvents)[number]): Citation => {
  if (raw.sourceType === "filing" || raw.sourceType === "sectors") return citations.news(raw.id);
  if (raw.source) {
    try {
      const host = new URL(raw.source).hostname.replace(/^www\./, "");
      return cite(`external-${raw.id}`, `fixture://external/${raw.id}`, "headline, published_at, exposure_tags", "Berita terekam dengan tautan sumber asal", host, raw.source, "Buka sumber asal", "provider");
    } catch {
      /* jatuh ke kutipan generik di bawah */
    }
  }
  return citations.external(raw.id);
};

export const events: MarketEvent[] = rawEvents.map((raw) => {
  const citation = eventCitation(raw);
  return {
    id: raw.id,
    title: raw.title,
    summary: raw.summary,
    body: raw.body,
    category: raw.category,
    sourceType: raw.sourceType,
    publishedAt: raw.publishedAt,
    asOf: DATA_AS_OF,
    sector: raw.sector,
    impactLinks: raw.impactLinks.map((link) => ({ ...link, citations: [citation] })),
    citations: [citation],
  };
});

/** Enam emiten dengan rekaman lengkap: harga harian, broker, keuangan. */
const ANALYZED_SYMBOLS: SymbolCode[] = ["ANTM", "BBCA", "BBRI", "TLKM", "GOTO", "PGAS"];

const sectorOf = (symbol: SymbolCode): string =>
  rawCompanies.find((company) => company.symbol === symbol)?.sector ?? "Market";

export const analysisFixtures: Record<string, CompanyAnalysisFixture> = Object.fromEntries(
  ANALYZED_SYMBOLS.map((symbol) => {
    const subsector = rawCompanies.find((company) => company.symbol === symbol)?.subsector;
    return [
      symbol,
      {
        symbol,
        priceSeries: priceSeries[symbol] ?? [],
        broker: brokerEvidence[symbol],
        sectorReturn: sectorReturns[sectorOf(symbol)] ?? 0,
        ...(subsector && subsectorContext[subsector] ? { subsectorContext: subsectorContext[subsector] } : {}),
        beta: betas[symbol] ?? 1,
        catalystEventIds: eventIdsBySymbol[symbol] ?? [],
        financialContext: (financialRows[symbol] ?? []).map(
          (row): FinancialInput => ({ ...row, citations: [citations.financial(symbol)] }),
        ),
      },
    ];
  }),
);

export const demoProfiles: UserProfile[] = [
  {
    id: "flow-first", name: "Raka", description: "Mengutamakan arus, mencari konfirmasi partisipan sebelum membaca peristiwa.",
    watchlist: ["ANTM", "INCO", "TINS", "PGAS", "ADRO", "PTBA"], owned: ["ANTM", "PGAS"],
    config: { horizon: "event", depth: "standard", pillarOrder: ["concentration", "volume", "momentum", "catalyst"] },
    preferredSectors: ["Basic Materials", "Energy"], preferredEventTypes: ["commodity", "company", "currency", "weather", "policy"], hasOnboarded: false,
  },
  {
    id: "catalyst-first", name: "Maya", description: "Mengutamakan katalis, membuka analisis dari jalur dampak dan waktu peristiwa.",
    watchlist: ["ANTM", "INCO", "GOTO", "PGAS", "ICBP", "AMRT"], owned: ["GOTO", "ICBP"],
    config: { horizon: "position", depth: "forensic", pillarOrder: ["catalyst", "momentum", "volume", "concentration"] },
    preferredSectors: ["Technology", "Consumer", "Energy"], preferredEventTypes: ["policy", "currency", "rates"], hasOnboarded: true,
  },
];
export { revenueSegments };
