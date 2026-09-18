import {
  betas,
  brokerEvidence,
  DATA_AS_OF as GENERATED_AS_OF,
  eventIdsBySymbol,
  financialRows,
  institutionalFlows,
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

/**
 * The recorded date, written once.
 *
 * Eleven places in the app used to say "rekaman 11 Sep 2026" as a literal
 * while `DATA_AS_OF` sat right next to them. The refresh route can move the
 * bundle forward, and every one of those strings would then tell a reader the
 * figures were recorded on a day they were not — a stale provenance claim is
 * indistinguishable from a false one.
 */
export const DATA_AS_OF_LABEL = new Intl.DateTimeFormat("id-ID", {
  day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta",
}).format(new Date(GENERATED_AS_OF));
export const WINDOW_START = WINDOW_DATES[0];
export const WINDOW_SESSIONS = WINDOW_DATES.length;

const SECTORS_DAILY_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/transaction/daily";
const SECTORS_BROKER_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-summary-by-symbol";
const SECTORS_FOREIGN_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/brokers/foreign-flow-by-symbol";
const SECTORS_FINANCIAL_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/report/quarterly-financials";
const SECTORS_NEWS_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/news/news";
const SECTORS_FILINGS_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/news/filings";
const SECTORS_COMPANY_DOCS = "https://docs.sectors.app/api-references/v2/indonesia/report/company-report";

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

/**
 * Every entry names the recording in `data/sectors/` that actually produced
 * the number, not the endpoint that sounds like it should have. A citation is
 * the only thing standing between a figure on screen and a reader who wants
 * to check it, so `endpoint` and `field` are part of the claim: a path that
 * was never called, or a field name the response does not carry, is a
 * fabricated source even when the figure itself is real.
 *
 * Mapping rule for `endpoint`: the recording's filename with `_` back to `/`
 * (`v2_free-float.json` → `/v2/free-float/`), which is how those files were
 * named when they were captured. `field` lists the response keys the build
 * script reads in `scripts/build_market_data.py` — the keys, verbatim, so
 * `buy_idr` is never softened into `buy_value`.
 *
 * A url is attached only where the public reference page exists. Free float
 * has no documented page, so that citation carries no link rather than a
 * guessed one.
 */
export const citations = {
  daily: (symbol: string) => cite(`daily-${symbol}`, `/v2/daily/${symbol}/`, "date, close, volume", `Data harian ${symbol}`, "Sectors rekaman", SECTORS_DAILY_DOCS),
  /** Company name, sector, and market cap. Also the denominator behind shares
   *  outstanding: `market_cap / last_close_price`. */
  overview: (symbol: string) => cite(`overview-${symbol}`, `/v2/company/report/${symbol}/?sections=overview`, "company_name, sector, sub_sector, market_cap, last_close_price", `Profil emiten ${symbol}`, "Sectors rekaman", SECTORS_COMPANY_DOCS),
  /** The ranked top-buyers/top-sellers view at `/top/`, which is where the
   *  recordings came from. `/v2/broker-summary/{symbol}/` is a different
   *  endpoint (per-broker daily rows) and never produced these figures. */
  broker: (symbol: string) => cite(`broker-${symbol}`, `/v2/broker-summary/${symbol}/top/`, "broker_code, buy_idr, sell_idr, net_idr", `Ringkasan broker ${symbol}`, "Sectors rekaman", SECTORS_BROKER_DOCS),
  /** Broker origin. `is_foreign` is the recorded field; the app's
   *  `origin: "foreign" | "local"` is derived from it, not returned by it. */
  registry: cite("registry", "/v2/brokers/", "code, is_foreign", "Daftar broker", "Sectors rekaman", "https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-registry"),
  foreign: (symbol: string) => cite(`foreign-${symbol}`, `/v2/foreign-flow/${symbol}/`, "date, net_foreign_inflow", `Arus asing ${symbol}`, "Sectors rekaman", SECTORS_FOREIGN_DOCS),
  /** Free float ratio. No public reference page, so no link. */
  freeFloat: cite("free-float", "/v2/free-float/", "symbol, free_float", "Porsi saham publik", "Sectors rekaman"),
  ihsg: cite("ihsg", "/v2/index-daily/ihsg/", "date, price", "Data harian IHSG", "Sectors rekaman", "https://docs.sectors.app/api-references/v2/indonesia/transaction/index-daily"),
  /** Sector return is an aggregate, so it takes two citations: the peer
   *  closes it averages and the market caps it weights them by. One line
   *  reading "sektor" would hide the weighting entirely. */
  sectorPeers: (sector: string) => cite(`sector-peers-${sector}`, "/v2/daily/{emiten sektor}/", "date, close", `Penutupan harian emiten sektor ${sector}`, "Sectors rekaman", SECTORS_DAILY_DOCS),
  sectorWeights: (sector: string) => cite(`sector-weights-${sector}`, "/v2/company/report/{emiten sektor}/?sections=overview", "market_cap, last_close_price", `Bobot kapitalisasi emiten sektor ${sector}`, "Sectors rekaman", SECTORS_COMPANY_DOCS),
  news: (eventId: string) => cite(`news-${eventId}`, eventId.includes("filing") ? "/v2/filings/" : "/v2/news/", "title, timestamp, symbols, dimension", "Berita perusahaan Sectors", "Sectors rekaman", eventId.includes("filing") ? SECTORS_FILINGS_DOCS : SECTORS_NEWS_DOCS),
  financial: (symbol: string) => cite(`financial-${symbol}`, `/v2/financials/quarterly/${symbol}/`, "date, revenue, earnings, financials_sector_metrics", `Konteks keuangan ${symbol}`, "Sectors rekaman", SECTORS_FINANCIAL_DOCS, "Buka dokumentasi sumber", "documentation"),
  /**
   * C3: setiap filing row membawa PDF pengumuman IDX sendiri di `source`,
   * sehingga citations.filing(symbol) tidak cukup. Teruskan source terekam.
   * Registry yang benar adalah file ini (fixtures.ts:58), bukan lib/agent/citations.ts
   * yang merupakan source-span locator porting ReguLens.
   */
  filing: (symbol: string, sourceUrl?: string) =>
    sourceUrl
      ? cite(`filing-${symbol}`, "/v2/filings/", "holder_name, holding_before, holding_after, transaction_value", `Keterbukaan ${symbol}`, "IDX", sourceUrl, "Buka pengumuman IDX", "provider")
      : cite(`filing-${symbol}`, "/v2/filings/", "holder_name, holding_before, holding_after, transaction_value", `Keterbukaan ${symbol}`, "Sectors rekaman", SECTORS_FILINGS_DOCS),
  /** Rekaman tanpa tautan asal yang bisa dibaca — jujur tanpa link, bukan link dokumentasi palsu. */
  external: (eventId: string) => cite(`external-${eventId}`, `fixture://recorded/${eventId}`, "title, publishedAt, tags", "Rekaman tanpa tautan sumber asal", "Sectors rekaman"),
  /** Pengganti jujur saat tidak ada peristiwa terverifikasi — lolos gate, tanpa link palsu. */
  empty: (symbol: string) => cite(`empty-${symbol}`, "/v2/news/", "title", "Belum ada peristiwa terverifikasi", "Sectors rekaman"),
};

export const companies: Company[] = rawCompanies.map((company) => ({
  ...company,
  asOf: DATA_AS_OF,
  // Price and change come from the daily recording; name, sector, and market
  // cap from the company report overview. Two recordings, two citations.
  citations: [citations.daily(company.symbol), citations.overview(company.symbol)],
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
          // Response keys verbatim: the news recording carries `timestamp` and
          // a singular `dimension`. This copy still said published_at and
          // dimensions after the registry above was corrected.
          "title, timestamp, symbols, dimension",
          "Berita perusahaan Sectors",
          host,
          raw.source,
          "Buka sumber asal",
          "provider",
        );
      } else {
        base = cite(`external-${raw.id}`, `fixture://recorded/${raw.id}`, "title, publishedAt, tags", "Berita terekam dengan tautan sumber asal", host, raw.source, "Buka sumber asal", "provider");
      }
    } catch {
      base = citations.external(raw.id);
    }
  } else if (raw.id.startsWith("flows-foreign-net-")) {
    const symbol = raw.impactLinks[0]?.symbol ?? "";
    base = symbol ? citations.foreign(symbol) : citations.external(raw.id);
  } else if (raw.id.startsWith("sentiment-attention-")) {
    base = cite(`news-${raw.id}`, "/v2/news/", "title, timestamp, symbols", "Hitungan liputan Sectors", "Sectors rekaman", SECTORS_NEWS_DOCS, "Buka dokumentasi sumber", "documentation");
  } else if (raw.id.startsWith("filing-corporate-action-")) {
    const symbol = raw.impactLinks[0]?.symbol ?? "";
    // Recorded as v2_company_corporate-actions_<symbol>.json, and the payload
    // groups actions by kind (agm, dividend, right_issue, stock_split, …)
    // rather than carrying flat action/ex_date/amount columns.
    base = cite(`news-${raw.id}`, symbol ? `/v2/company/corporate-actions/${symbol}/` : "/v2/company/corporate-actions/", "corporate_actions, agm, dividend, right_issue, stock_split, bonus, warrant", "Aksi korporasi Sectors", "Sectors rekaman");
  } else if (raw.sourceType === "commodity") {
    // The recordings are per commodity and per year range
    // (v2_mining_commodities_Gold_price__end_year-2025_start_year-2023.json),
    // so the path carries the commodity the event is about.
    base = cite(`news-${raw.id}`, `/v2/mining/commodities/${raw.id.startsWith("commodity-gold") ? "Gold" : raw.id.startsWith("commodity-coal") ? "Coal" : "{komoditas}"}/price/`, "name, date, price_usd_per_ton", "Harga acuan komoditas Sectors", "Sectors rekaman");
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

const sectorOf = (symbol: SymbolCode): string =>
  rawCompanies.find((company) => company.symbol === symbol)?.sector ?? "Market";

/**
 * Emiten dengan rekaman lengkap (harga harian + broker + keuangan).
 * Diturunkan dari ketersediaan data, bukan daftar tangan: simbol lolos bila
 * punya priceSeries dan brokerEvidence. Tambah rekaman + re-run script
 * untuk memperluas cakupan otomatis.
 */
const ANALYZED_SYMBOLS: SymbolCode[] = (Object.keys(priceSeries) as SymbolCode[]).filter(
  (symbol) =>
    (priceSeries[symbol] ?? []).length > 0 &&
    Boolean(brokerEvidence[symbol]) &&
    // Momentum needs both of these, and they used to fall back to `1` and `0`
    // when a recording was missing. A beta of exactly 1 and a sector return of
    // exactly 0,0% then rendered as recorded figures next to a citation, which
    // is a fabricated number with a source attached — the worst shape this bug
    // can take. A symbol without them is partially recorded, and
    // `coverageInfo` says so.
    betas[symbol] !== undefined &&
    sectorReturns[sectorOf(symbol)] !== undefined,
);

export const analysisFixtures: Record<string, CompanyAnalysisFixture> = Object.fromEntries(
  ANALYZED_SYMBOLS.map((symbol) => {
    const subsector = rawCompanies.find((company) => company.symbol === symbol)?.subsector;
    return [
      symbol,
      {
        symbol,
        priceSeries: priceSeries[symbol] ?? [],
        broker: brokerEvidence[symbol],
        sectorReturn: sectorReturns[sectorOf(symbol)],
        ...(subsector && subsectorContext[subsector] ? { subsectorContext: subsectorContext[subsector] } : {}),
        beta: betas[symbol],
        catalystEventIds: eventIdsBySymbol[symbol] ?? [],
        financialContext: (financialRows[symbol] ?? []).map(
          (row): FinancialInput => ({ ...row, citations: [citations.financial(symbol)] }),
        ),
        institutionalFlows: (institutionalFlows[symbol] ?? []).map((row) => ({ ...row, symbol })),
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
    const hasMomentumInputs = betas[symbol] !== undefined && sectorReturns[sectorOf(symbol)] !== undefined;
    const financialRowsCount = (financialRows[symbol] ?? []).length;
    const linkedEvents = (eventIdsBySymbol[symbol] ?? []).length;
    const missing: string[] = [];
    if (!hasPriceSeries) missing.push("harga harian");
    if (!hasBroker) missing.push("ringkasan broker + arus asing");
    if (!financialRowsCount) missing.push("keuangan kuartalan");
    if (!linkedEvents) missing.push("peristiwa terhubung");
    if (!hasMomentumInputs) missing.push("beta + imbal hasil sektor");
    return [symbol, { symbol, analyzed: hasPriceSeries && hasBroker && hasMomentumInputs, hasPriceSeries, hasBroker, financialRows: financialRowsCount, linkedEvents, missing }];
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
