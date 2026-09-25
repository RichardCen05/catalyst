/**
 * Built-in watch list. Every entry was fetched and checked from a
 * datacenter-shaped address on 14 Sep 2026 before being written down here:
 * reachable without a session, stable in *text* across repeat reads, and
 * small enough to read in one piece.
 *
 * Relevance notes name the Catalyst exposures each source feeds (see
 * `defaultPlaybook.knownExposures` in `lib/store.ts`). Where a note names
 * emiten, the same symbols are declared in `symbols` so triage can read them;
 * the note stays the reason, the field is what a machine acts on. General news
 * feeds, the quake feed and sources with no named emiten declare none.
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
    lang: "id",
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
    lang: "id",
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
    lang: "id",
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
    lang: "en",
    symbols: ["PGAS", "ADRO", "PTBA"],
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
    lang: "id",
    symbols: ["BBCA", "BBRI"],
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
    lang: "id",
    symbols: ["BBCA", "BBRI", "BMRI", "ANTM", "INCO"],
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
    lang: "id",
    symbols: ["ADRO", "PTBA", "PGAS", "TINS"],
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
    lang: "id",
    symbols: ["ICBP", "MYOR", "AMRT"],
  },

  // -- Documents & machine-readable weather --------------------------------
  {
    // A change here means a warning appeared or cleared for some province.
    // Sea-weather warnings gate TINS shipments; heavy-rain warnings gate
    // ADRO/PTBA pits and INCO operations (rainfall is a named exposure).
    id: "src-bmkg-warning",
    url: "https://www.bmkg.go.id/cuaca/peringatan-dini-cuaca",
    label: "BMKG — peringatan dini cuaca (NONAKTIF: halaman dirender JS, teks kosong)",
    kind: "document",
    // Verified 17 Sep 2026: a plain fetch returns the site shell only — the
    // extracted text is the nav menu ("Tentang BMKG Struktur Organisasi ..."),
    // never a warning, so every check reported `changed` and filed an empty
    // candidate. The forecast API entries below carry the same signal as
    // numbers. Re-enable only with an endpoint that answers without JS.
    enabled: false,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
    lang: "id",
    symbols: ["TINS", "ADRO", "PTBA", "INCO"],
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
    lang: "id",
  },
  {
    // Jakarta sample kept ONLY so the seed sync can switch it off in a
    // registry that was seeded while it was enabled — it produced Gambir
    // forecasts that no stock may cite. Replaced by the five mine-site
    // entries below. Do not re-enable.
    id: "src-bmkg-forecast-sample",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=31.71.01.1001",
    label: "BMKG — prakiraan cuaca Gambir (NONAKTIF: contoh adm4, diganti wilayah tambang)",
    kind: "document",
    enabled: false,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
    lang: "id",
  },
  // Per-village forecast API, one entry per mine site. Every adm4 below was
  // resolved from the Kemendagri code list and then fetched from BMKG on
  // 17 Sep 2026: each answered 200 with the province/regency/district/village
  // names quoted in its label, so a citation names the place it came from.
  // Rainfall and wind here gate pit hours, haul roads, and shipment windows —
  // the named exposures in `defaultPlaybook.knownExposures`.
  {
    // TINS: Sungailiat, Bangka — tin dredging and shipment windows.
    id: "src-bmkg-forecast-sungailiat",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=19.01.01.1001",
    label: "BMKG — prakiraan cuaca Sungailiat, Bangka (TINS)",
    kind: "document",
    enabled: true,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
    lang: "id",
    symbols: ["TINS"],
    region: "Bangka",
  },
  {
    // ADRO: Tanjung, Tabalong, Kalimantan Selatan — pit and haul road.
    id: "src-bmkg-forecast-tanjung-tabalong",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=63.09.04.1002",
    label: "BMKG — prakiraan cuaca Tanjung, Tabalong (ADRO)",
    kind: "document",
    enabled: true,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
    lang: "id",
    symbols: ["ADRO"],
    region: "Tabalong",
  },
  {
    // PTBA: Tanjung Enim, Lawang Kidul, Muara Enim — pit and rail loading.
    id: "src-bmkg-forecast-tanjung-enim",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=16.03.07.1001",
    label: "BMKG — prakiraan cuaca Tanjung Enim, Muara Enim (PTBA)",
    kind: "document",
    enabled: true,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
    lang: "id",
    symbols: ["PTBA"],
    region: "Muara Enim",
  },
  {
    // ANTM: Pomalaa, Kolaka — nickel mine and jetty.
    id: "src-bmkg-forecast-pomalaa",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=74.01.07.1002",
    label: "BMKG — prakiraan cuaca Pomalaa, Kolaka (ANTM)",
    kind: "document",
    enabled: true,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
    lang: "id",
    symbols: ["ANTM"],
    region: "Kolaka",
  },
  {
    // INCO: Sorowako, Nuha, Luwu Timur — mine, smelter, and hydro catchment.
    id: "src-bmkg-forecast-sorowako",
    url: "https://api.bmkg.go.id/publik/prakiraan-cuaca?adm4=73.24.02.2009",
    label: "BMKG — prakiraan cuaca Sorowako, Luwu Timur (INCO)",
    kind: "document",
    enabled: true,
    checkIntervalHours: 12,
    category: "weather",
    sourceType: "weather",
    lang: "id",
    symbols: ["INCO"],
    region: "Luwu Timur",
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
    lang: "id",
    symbols: ["BBCA", "BBRI", "BMRI", "ANTM", "INCO"],
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
    lang: "en",
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
    lang: "en",
    symbols: ["BBCA", "BBRI", "BMRI", "GOTO"],
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
    lang: "id",
    symbols: ["ICBP", "MYOR", "AMRT"],
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
    lang: "id",
    symbols: ["ANTM"],
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
    lang: "id",
  },
];
