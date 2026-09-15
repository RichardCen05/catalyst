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
import { locate } from "@/lib/agent/citations";

export const DATA_AS_OF = GENERATED_AS_OF;
export const WINDOW_START = WINDOW_DATES[0];
export const WINDOW_SESSIONS = WINDOW_DATES.length;

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
  url?: string,
  urlLabel?: string,
  access?: Citation["access"],
): Citation {
  return {
    id,
    provider,
    endpoint,
    field,
    asOf: DATA_AS_OF,
    label,
    ...(url ? { url, urlLabel: urlLabel ?? "Buka dokumentasi sumber", access: access ?? "documentation" } : {}),
  };
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
  financial: (symbol: string) => cite(`financial-${symbol}`, `/v2/financials/quarterly/${symbol}/`, "period, revenue, earnings, sector_metrics", `Konteks keuangan ${symbol}`, "Sectors rekaman", SECTORS_FINANCIAL_DOCS, "Buka dokumentasi sumber", "documentation"),
  /** Rekaman tanpa tautan asal yang bisa dibaca — jujur tanpa link, bukan link dokumentasi palsu. */
  external: (eventId: string) => cite(`external-${eventId}`, `fixture://recorded/${eventId}`, "headline, published_at, exposure_tags", "Rekaman tanpa tautan sumber asal", "Sectors rekaman"),
  /** Pengganti jujur saat tidak ada peristiwa terverifikasi — lolos gate, tanpa link palsu. */
  empty: (symbol: string) => cite(`empty-${symbol}`, "/v2/news/", "title", "Belum ada peristiwa terverifikasi", "Sectors rekaman"),
};

export const companies: Company[] = rawCompanies.map((company) => ({
  ...company,
  asOf: DATA_AS_OF,
  citations: [citations.price(company.symbol)],
}));

/**
 * Kabar dan filing asli dari rekaman Sectors API 11 Sep 2026
 * (data/sectors/ via lib/data/market.generated.ts). Bukan karangan.
 *
 * Aturan tautan — yang bisa dibaca user selalu menang:
 * - `source` asal ada (kompas, emitennews, ...): link langsung ke artikel asal,
 *   provider = host asal, endpoint tetap /v2/news/ atau /v2/filings/.
 * - Agregat turunan tanpa artikel (arus asing, hitungan liputan, aksi
 *   korporasi, komoditas): endpoint + field sesuai API aslinya, link hanya ke
 *   dokumentasi bila memang endpoint itu; tanpa link palsu bila tidak ada
 *   halaman docs yang cocok.
 */
const eventCitation = (raw: (typeof rawEvents)[number]): Citation => {
  let base: Citation;
  if (raw.source) {
    try {
      const host = new URL(raw.source).hostname.replace(/^www\./, "");
      if (raw.sourceType === "filing" || raw.sourceType === "sectors") {
        base = cite(
          `news-${raw.id}`,
          raw.sourceType === "filing" ? "/v2/filings/" : "/v2/news/",
          "title, published_at, symbols, dimensions",
          "Berita perusahaan Sectors",
          host,
          raw.source,
          "Buka sumber asal",
          "provider",
        );
      } else {
        base = cite(`external-${raw.id}`, `fixture://recorded/${raw.id}`, "headline, published_at, exposure_tags", "Berita terekam dengan tautan sumber asal", host, raw.source, "Buka sumber asal", "provider");
      }
    } catch {
      base = citations.external(raw.id);
    }
  } else if (raw.id.startsWith("flows-foreign-net-")) {
    const symbol = raw.impactLinks[0]?.symbol ?? "";
    base = symbol ? citations.foreign(symbol) : citations.external(raw.id);
  } else if (raw.id.startsWith("sentiment-attention-")) {
    base = cite(`news-${raw.id}`, "/v2/news/", "title, published_at, symbols", "Hitungan liputan Sectors", "Sectors rekaman", SECTORS_NEWS_DOCS, "Buka dokumentasi sumber", "documentation");
  } else if (raw.id.startsWith("filing-corporate-action-")) {
    const symbol = raw.impactLinks[0]?.symbol ?? "";
    base = cite(`news-${raw.id}`, symbol ? `/v2/corporate-actions/${symbol}/` : "/v2/corporate-actions/", "action, ex_date, amount", "Aksi korporasi Sectors", "Sectors rekaman");
  } else if (raw.sourceType === "commodity") {
    base = cite(`news-${raw.id}`, "/v2/mining-commodities/", "price_usd_per_ton", "Harga acuan komoditas Sectors", "Sectors rekaman");
  } else if (raw.sourceType === "filing" || raw.sourceType === "sectors") {
    base = citations.news(raw.id);
  } else {
    base = citations.external(raw.id);
  }
  if (raw.body) {
    const span = locate(raw.id, raw.body, (raw.summary ?? "").replace(/…$/, ""));
    if (span.match !== "not_found") return { ...base, span };
  }
  return base;
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

/**
 * Emiten dengan rekaman lengkap (harga harian + broker + keuangan).
 * Diturunkan dari ketersediaan data, bukan daftar tangan: simbol lolos bila
 * punya priceSeries dan brokerEvidence. Tambah rekaman + re-run script
 * untuk memperluas cakupan otomatis.
 */
const ANALYZED_SYMBOLS: SymbolCode[] = (Object.keys(priceSeries) as SymbolCode[]).filter(
  (symbol) => (priceSeries[symbol] ?? []).length > 0 && Boolean(brokerEvidence[symbol]),
);

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

export interface SymbolCoverage {
  symbol: SymbolCode;
  analyzed: boolean;
  hasPriceSeries: boolean;
  hasBroker: boolean;
  financialRows: number;
  linkedEvents: number;
  /** Recordings still missing before this symbol can open a full case. */
  missing: string[];
}

/** Per-symbol recording availability — drives the honest snapshot/full-case split in the picker. */
export const coverageInfo: Record<string, SymbolCoverage> = Object.fromEntries(
  rawCompanies.map((company) => {
    const symbol = company.symbol;
    const hasPriceSeries = (priceSeries[symbol] ?? []).length > 0;
    const hasBroker = Boolean(brokerEvidence[symbol]);
    const financialRowsCount = (financialRows[symbol] ?? []).length;
    const linkedEvents = (eventIdsBySymbol[symbol] ?? []).length;
    const missing: string[] = [];
    if (!hasPriceSeries) missing.push("harga harian");
    if (!hasBroker) missing.push("ringkasan broker + arus asing");
    if (!financialRowsCount) missing.push("keuangan kuartalan");
    if (!linkedEvents) missing.push("peristiwa terhubung");
    return [symbol, { symbol, analyzed: hasPriceSeries && hasBroker, hasPriceSeries, hasBroker, financialRows: financialRowsCount, linkedEvents, missing }];
  }),
);

export const demoProfiles: UserProfile[] = [
  {
    id: "flow-first", name: "Raka", description: "Mengutamakan arus, mencari konfirmasi partisipan sebelum membaca peristiwa.",
    watchlist: ["ANTM", "INCO", "TINS", "PGAS", "ADRO", "PTBA"], owned: ["ANTM", "PGAS"],
    config: { horizon: "event", depth: "standard", pillarOrder: ["concentration", "volume", "momentum", "catalyst"] },
    preferredSectors: ["Basic Materials", "Energy"], preferredEventTypes: ["commodity", "company", "currency", "weather", "policy", "flows"], hasOnboarded: false,
  },
  {
    id: "catalyst-first", name: "Maya", description: "Mengutamakan katalis, membuka analisis dari jalur dampak dan waktu peristiwa.",
    watchlist: ["ANTM", "INCO", "GOTO", "PGAS", "ICBP", "AMRT"], owned: ["GOTO", "ICBP"],
    config: { horizon: "position", depth: "forensic", pillarOrder: ["catalyst", "momentum", "volume", "concentration"] },
    preferredSectors: ["Technology", "Consumer", "Energy"], preferredEventTypes: ["policy", "currency", "rates", "flows", "sentiment"], hasOnboarded: true,
  },
];
export { revenueSegments };
