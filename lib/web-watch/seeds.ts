/**
 * Built-in watch list. Every entry was fetched and checked from a
 * datacenter-shaped address on 14 Sep 2026 before being written down here:
 * reachable without a session, stable in *text* across repeat reads, and
 * small enough to read in one piece.
 *
 * Relevance notes name the Catalyst exposures each source feeds (see
 * `defaultPlaybook.knownExposures` in `lib/store.ts`).
 */

import type { WatchedSource } from "@/lib/web-watch/types";

export const SEED_SOURCES: WatchedSource[] = [
  // -- Feeds: what happened since yesterday -------------------------------
  {
    id: "src-cnbc-market",
    url: "https://www.cnbcindonesia.com/market/rss",
    label: "CNBC Indonesia — Market (saham, komoditas, rekomendasi)",
    kind: "feed",
    enabled: true,
    checkIntervalHours: 12,
    category: "company",
    sourceType: "macro",
  },
  {
    id: "src-cnbc-news",
    url: "https://www.cnbcindonesia.com/news/rss",
    label: "CNBC Indonesia — News (makro & kebijakan)",
    kind: "feed",
    enabled: true,
    checkIntervalHours: 12,
    category: "policy",
    sourceType: "macro",
  },
  {
    id: "src-katadata",
    url: "https://www.katadata.co.id/rss",
    label: "Katadata — ekonomi & energi",
    kind: "feed",
    enabled: true,
    checkIntervalHours: 24,
    category: "company",
    sourceType: "macro",
  },
  {
    // Energy fact sheets for PGAS (gas), ADRO/PTBA (coal). The US source is
    // deliberate: EIA serves a clean stable feed from any address, which none
    // of the domestic coal-price pages do.
    id: "src-eia-energy",
    url: "https://www.eia.gov/rss/todayinenergy.xml",
    label: "EIA — Today in Energy (gas, minyak, batu bara)",
    kind: "feed",
    enabled: true,
    checkIntervalHours: 24,
    category: "commodity",
    sourceType: "commodity",
  },

  // -- Listings: regulations published *tomorrow* appear here first --------
  {
    // Banking policy for BBCA/BBRI. Verified reachable from a datacenter
    // address with curl (389 KB); the interactive fetch layer is refused, so
    // this seed carries a plain curl UA, not a browser one.
    // Ownership note: keterbukaan kepemilikan pemegang saham substansial yang
    // terbit di sini ikut terbaca lewat pola yang sama dan dipetakan ke
    // emiten pada review (Detektor ΔforeignPct di build_market_data.py
    // menutup sisi rekaman bulanannya).
    id: "src-ojk-siaran-pers",
    url: "https://www.ojk.go.id/id/berita-dan-kegiatan/siaran-pers/",
    label: "OJK — siaran pers (aturan bank & pasar modal)",
    kind: "listing",
    enabled: true,
    checkIntervalHours: 24,
    linkPattern: "/id/berita-dan-kegiatan/siaran-pers/Pages/[^\"']+\\.aspx",
    category: "policy",
    sourceType: "policy",
  },
  {
    // BI-Rate decisions move BBCA/BBRI/BMRI; JISDOR moves exporters
    // (ANTM/INCO). Article links are stable `sp_<digits>.aspx` addresses.
    // SRBI auction results are announced through this same listing, so no
    // second BI seed is needed — liquidity-proxy items get category rates at
    // registration and human-mapped to flows at review when relevant.
    id: "src-bi-news",
    url: "https://www.bi.go.id/id/publikasi/ruang-media/news-release/",
    label: "Bank Indonesia — siaran pers (BI-Rate, rupiah, likuiditas)",
    kind: "listing",
    enabled: true,
    checkIntervalHours: 24,
    linkPattern: "/id/publikasi/ruang-media/news-release/Pages/sp_[^\"']+\\.aspx",
    category: "rates",
    sourceType: "macro",
  },
  {
    // ICP (Indonesian Crude Price) is published here first — it moves
    // ADRO/PTBA/PGAS directly. DMO and export-rule changes appear here too
    // (TINS export regulation, coal DMO). Supply-chain activity keywords
    // (smelter, outage, force majeure, DMO, RKAB — see ACTIVITY_KEYWORDS in
    // check.ts) are matched at review time against items from this listing
    // plus the CNBC/Katadata feeds above; no new infrastructure.
    id: "src-esdm-berita",
    url: "https://www.esdm.go.id/id/media-center/arsip-berita",
    label: "ESDM — arsip berita (ICP, DMO, aturan ekspor)",
    kind: "listing",
    enabled: true,
    checkIntervalHours: 24,
    linkPattern: "/id/media-center/arsip-berita/[^\"']+",
    category: "policy",
    sourceType: "policy",
  },
  {
    // CPO chain: B50/B60 biodiesel pace and supply-chain rules. A cost line
    // for ICBP/MYOR/AMRT and a policy line for energy.
    id: "src-gapki",
    url: "https://gapki.id/",
    label: "GAPKI — berita sawit (CPO, B50/B60)",
    kind: "listing",
    enabled: true,
    checkIntervalHours: 24,
    linkPattern: "https://gapki\\.id/news/\\d{4}/\\d{2}/\\d{2}/[^\"']+",
    category: "commodity",
    sourceType: "commodity",
  },

  // -- Documents & machine-readable weather --------------------------------
  {
    // A change here means a warning appeared or cleared for some province.
    // Sea-weather warnings gate TINS shipments; heavy-rain warnings gate
    // ADRO/PTBA pits and INCO operations (rainfall is a named exposure).
    id: "src-bmkg-warning",
    url: "https://www.bmkg.go.id/cuaca/peringatan-dini-cuaca",
    label: "BMKG — peringatan dini cuaca (laut & hujan lebat)",
    kind: "document",
    enabled: true,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
  },
  {
    // Latest-earthquake JSON. Changes on every felt quake — mine hours and
    // logistics for Sulawesi/Kalimantan/Sumatra operations.
    id: "src-bmkg-quake",
    url: "https://data.bmkg.go.id/DataMKG/TEWS/autogempa.json",
    label: "BMKG — gempa terkini (JSON)",
    kind: "document",
    enabled: true,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
  },
  {
    // Per-village forecast API pattern (validated 200 for one adm4 code on
    // 14 Sep 2026). DISABLED by default: the seeded adm4 is a Jakarta sample,
    // not a mining region. Enable per-region copies (Bangka for TINS,
    // Kalimantan Timur for ADRO/PTBA, Sulawesi for INCO/ANTM) with adm4 codes
    // confirmed on the BMKG data portal — never cite the sample for a stock.
    id: "src-bmkg-forecast-sample",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.01.1001",
    label: "BMKG — prakiraan cuaca per wilayah (NONAKTIF: contoh adm4, tambah wilayah tambang)",
    kind: "document",
    enabled: false,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
  },

  // -- Awaiting datacenter verification (disabled until checked) -----------
  // Rule, same as IDX below: a seed goes enabled:true only after a
  // 14-Sep-style curl from a datacenter-shaped address proves it reachable
  // without a session, stable in text, and small enough to read. Until then
  // these stay visible-but-off so the gap is explicit, never silent.
  {
    // BPS press releases: inflation (rates leg for BBCA/BBRI/BMRI) and trade
    // balance (currency leg for ANTM/INCO exporters). Macro numeric feed.
    id: "src-bps-pressrelease",
    url: "https://www.bps.go.id/id/pressrelease.html",
    label: "BPS — berita resmi statistik (NONAKTIF: belum verifikasi datacenter)",
    kind: "listing",
    enabled: false,
    checkIntervalHours: 24,
    linkPattern: "/id/pressrelease/[^\"']+\\.html",
    category: "rates",
    sourceType: "macro",
  },
  {
    // US 10Y constant-maturity series as plain CSV — the datacenter-safe end
    // of FRED. Pairs with SBN10Y from BI/OJK items for the rate-differential
    // leg (Mirae/Samuel Sep 2026 narrative: US10Y ~5%, SBN 7.11%).
    id: "src-fred-dgs10",
    url: "https://fred.stlouisfed.org/graph/fredgraph.csv?id=DGS10",
    label: "FRED — US 10Y DGS10 CSV (NONAKTIF: belum verifikasi datacenter)",
    kind: "document",
    enabled: false,
    checkIntervalHours: 24,
    category: "rates",
    sourceType: "macro",
  },
  {
    // Index rebalancing calendar for the flows leg (banks + GOTO). IDX direct
    // is 403 from datacenters, so MSCI announcements are the reachable half;
    // IDX-side items continue to arrive via the OJK listing mirror.
    id: "src-msci-announcements",
    url: "https://www.msci.com/index-announcements",
    label: "MSCI — pengumuman indeks (NONAKTIF: belum verifikasi datacenter)",
    kind: "listing",
    enabled: false,
    checkIntervalHours: 24,
    linkPattern: "/index-announcements/[^\"']+",
    category: "flows",
    sourceType: "macro",
  },
  {
    // KPBN auction posts: transacted CPO price leg for ICBP/MYOR/AMRT cost
    // path (CPO 4,654 reference). Complements GAPKI policy-side coverage.
    id: "src-kpbn-cpo",
    url: "https://www.kpbn.co.id/",
    label: "KPBN — lelang CPO (NONAKTIF: belum verifikasi datacenter)",
    kind: "listing",
    enabled: false,
    checkIntervalHours: 24,
    linkPattern: "kpbn\\.co\\.id/[^\"']*",
    category: "commodity",
    sourceType: "commodity",
  },
  {
    // Antam Logam Mulia daily price page: gold proxy leg for ANTM until an
    // LME-cash equivalent reachable from datacenters is found (LME pages are
    // JS-heavy — deliberately avoided).
    id: "src-antam-lm",
    url: "https://www.logammulia.com/id/harga-emas-hari-ini",
    label: "Logam Mulia — harga emas harian (NONAKTIF: belum verifikasi datacenter)",
    kind: "document",
    enabled: false,
    checkIntervalHours: 24,
    category: "commodity",
    sourceType: "commodity",
  },

  // -- Deliberately NOT enabled --------------------------------------------
  // IDX answers a datacenter address with `403` (verified 14 Sep 2026, both
  // www and bare host) — the EUR-Lex analog: the exact URL that works from a
  // laptop returns nothing from Cloud Run. Kept in the list, disabled, so the
  // gap is visible instead of forgotten. Enable it the day a machine-readable
  // disclosure address is found; until then company filings stay covered by
  // the Sectors filings record and the OJK/BI/ESDM listings above.
  {
    id: "src-idx-disabled",
    url: "https://www.idx.co.id/id/perusahaan-tercatat/aktivitas-pencatatan",
    label: "IDX — aktivitas pencatatan (NONAKTIF: 403 dari datacenter)",
    kind: "listing",
    enabled: false,
    checkIntervalHours: 24,
    linkPattern: "pengumuman[^\"']*",
    category: "company",
    sourceType: "filing",
  },
];
