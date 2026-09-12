import type {
  BrokerEvidence,
  Citation,
  Company,
  CompanyAnalysisFixture,
  FinancialInput,
  ImpactLink,
  MarketEvent,
  PricePoint,
  Sector,
  SymbolCode,
  UserProfile,
} from "@/lib/types";

export const DATA_AS_OF = "2026-09-11T16:15:00+07:00";

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
  provider = "Sectors Fixture",
  url = SECTORS_DOCS,
  urlLabel = "Buka dokumentasi endpoint",
  access: Citation["access"] = "documentation",
): Citation {
  return { id, provider, endpoint, field, asOf: DATA_AS_OF, label, url, urlLabel, access };
}

const externalSource: Record<string, Pick<Citation, "provider" | "url" | "urlLabel" | "access">> = {
  "evt-nickel": { provider: "Sectors Commodity Fixture", url: "https://docs.sectors.app/api-references/v2/mining/commodities-trade/commodity-price", urlLabel: "Buka dokumentasi komoditas", access: "documentation" },
  "evt-coal": { provider: "Sectors Commodity Fixture", url: "https://docs.sectors.app/api-references/v2/mining/commodities-trade/commodity-price", urlLabel: "Buka dokumentasi komoditas", access: "documentation" },
  "evt-rate": { provider: "Bank Indonesia Fixture", url: "https://www.bi.go.id/id/fungsi-utama/moneter/bi-rate/default.aspx", urlLabel: "Buka provider BI-Rate", access: "provider" },
  "evt-rupiah": { provider: "Bank Indonesia Fixture", url: "https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx", urlLabel: "Buka provider JISDOR", access: "provider" },
  "evt-spectrum": { provider: "Komdigi Policy Fixture", url: "https://www.komdigi.go.id/", urlLabel: "Buka provider Komdigi", access: "provider" },
  "evt-gas": { provider: "Ditjen Migas Fixture", url: "https://migas.esdm.go.id/", urlLabel: "Buka provider Ditjen Migas", access: "provider" },
  "evt-tech": { provider: "Komdigi Policy Fixture", url: "https://www.komdigi.go.id/", urlLabel: "Buka provider Komdigi", access: "provider" },
  "evt-consumer": { provider: "BMKG Weather Fixture", url: "https://data.bmkg.go.id/prakiraan-cuaca/", urlLabel: "Buka data cuaca BMKG", access: "provider" },
};

export const citations = {
  price: (symbol: string) => cite(`price-${symbol}`, "/v2/companies/top-changes/", "last_price, change_pct", `${symbol} price snapshot`, "Sectors Fixture", "https://docs.sectors.app/api-references/v2/indonesia/ranking/top-changes"),
  daily: (symbol: string) => cite(`daily-${symbol}`, `/v2/daily/${symbol}/`, "date, close, volume", `${symbol} daily series`, "Sectors Fixture", SECTORS_DAILY_DOCS),
  broker: (symbol: string) => cite(`broker-${symbol}`, `/v2/broker-summary/${symbol}/`, "broker_code, buy_value, sell_value", `${symbol} broker summary`, "Sectors Fixture", SECTORS_BROKER_DOCS),
  registry: cite("registry", "/v2/brokers/", "broker_code, origin", "Broker registry", "Sectors Fixture", "https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-registry"),
  foreign: (symbol: string) => cite(`foreign-${symbol}`, `/v2/foreign-flow/${symbol}/`, "net_foreign_inflow", `${symbol} foreign flow`, "Sectors Fixture", SECTORS_FOREIGN_DOCS),
  ownership: (symbol: string) => cite(`ownership-${symbol}`, `/v2/company/report/${symbol}/?sections=ownership`, "free_float, shares_outstanding", `${symbol} ownership`, "Sectors Fixture", "https://docs.sectors.app/api-references/v2/indonesia/report/company-report"),
  ihsg: cite("ihsg", "/v2/index-daily/ihsg/", "date, close", "IHSG daily series", "Sectors Fixture", "https://docs.sectors.app/api-references/v2/indonesia/transaction/index-daily"),
  market: cite("market-snapshot", "/v2/close/", "date, symbol, close, volume", "General market snapshot fixture", "Sectors Fixture", "https://docs.sectors.app/api-references/v2/indonesia/transaction/close"),
  news: (eventId: string) => cite(`news-${eventId}`, eventId.includes("filing") ? "/v2/filings/" : "/v2/news/", "title, published_at, symbols, dimensions", "Sectors company news fixture", "Sectors Fixture", eventId.includes("filing") ? SECTORS_FILINGS_DOCS : SECTORS_NEWS_DOCS),
  financial: (symbol: string) => cite(`financial-${symbol}`, `/v2/financials/quarterly/${symbol}/`, "period, revenue, earnings, sector_metrics", `${symbol} financial context`, "Sectors Fixture", SECTORS_FINANCIAL_DOCS),
  external: (eventId: string) => {
    const source = externalSource[eventId] ?? { provider: "External Provider Fixture", url: SECTORS_DOCS, urlLabel: "Buka referensi provider", access: "provider" as const };
    return cite(`external-${eventId}`, `fixture://external/${eventId}`, "headline, published_at, exposure_tags", "Fixture linked to an official production source", source.provider, source.url, source.urlLabel, source.access);
  },
};

type CompanySeed = [SymbolCode, string, Sector, string, number, number, number, boolean, Company["evidenceState"], string];

const companySeeds: CompanySeed[] = [
  ["ANTM", "Aneka Tambang Tbk", "Basic Materials", "Diversified Metals", 3120, 5.8, 74.9, true, "Corroborated", "Arus partisipan, volume, dan katalis nikel menguat pada jendela yang sama."],
  ["INCO", "Vale Indonesia Tbk", "Basic Materials", "Nickel", 4860, 2.1, 48.3, false, "Insufficient Evidence", "Eksposur nikel terlihat, tetapi bukti broker belum lengkap."],
  ["TINS", "Timah Tbk", "Basic Materials", "Tin", 1285, -0.8, 9.5, false, "Mixed Evidence", "Volume naik tanpa dukungan momentum relatif."],
  ["BBCA", "Bank Central Asia Tbk", "Financials", "Banks", 10450, 0.9, 1288, true, "Corroborated", "Partisipasi luas dan momentum relatif bergerak selaras."],
  ["BBRI", "Bank Rakyat Indonesia Tbk", "Financials", "Banks", 4970, -1.4, 753, true, "Mixed Evidence", "Akumulasi partisipan asing bertentangan dengan foreign flow agregat."],
  ["BMRI", "Bank Mandiri Tbk", "Financials", "Banks", 7040, 1.2, 827, false, "Insufficient Evidence", "Snapshot tersedia; pemeriksaan empat pilar belum dijalankan."],
  ["TLKM", "Telkom Indonesia Tbk", "Infrastructure", "Telecommunication", 3380, 2.7, 335, true, "Corroborated", "Momentum relatif dan katalis spektrum mendapat konfirmasi volume."],
  ["JSMR", "Jasa Marga Tbk", "Infrastructure", "Toll Roads", 5180, 0.3, 37.5, false, "Insufficient Evidence", "Belum ada katalis terverifikasi dalam jendela pengamatan."],
  ["EXCL", "XLSmart Telecom Sejahtera Tbk", "Infrastructure", "Telecommunication", 2450, -0.5, 35.7, false, "Mixed Evidence", "Gerak sektor belum mendapat dukungan volume."],
  ["GOTO", "GoTo Gojek Tokopedia Tbk", "Technology", "Digital Platforms", 84, 4.9, 101, true, "Mixed Evidence", "Volume ekstrem terlihat, tetapi bukti katalis dan foreign flow tidak searah."],
  ["BUKA", "Bukalapak.com Tbk", "Technology", "Digital Commerce", 151, 0.7, 15.6, false, "Insufficient Evidence", "Likuiditas tersedia; hipotesis belum memiliki bukti lintas pilar."],
  ["EMTK", "Elang Mahkota Teknologi Tbk", "Technology", "Media & Technology", 590, -1.0, 37.2, false, "Mixed Evidence", "Peristiwa kebijakan relevan, tetapi jalur dampak belum spesifik."],
  ["PGAS", "Perusahaan Gas Negara Tbk", "Energy", "Gas Distribution", 1835, 3.2, 44.6, true, "Corroborated", "Kebijakan gas, volume, dan momentum relatif saling mendukung."],
  ["ADRO", "Alamtri Resources Indonesia Tbk", "Energy", "Coal", 2740, -2.2, 88.1, false, "Mixed Evidence", "Katalis harga batu bara bersifat adverse; data broker belum diperiksa."],
  ["PTBA", "Bukit Asam Tbk", "Energy", "Coal", 2930, -1.7, 67.1, false, "Mixed Evidence", "Tekanan komoditas tercatat tanpa bukti konsentrasi lengkap."],
  ["ICBP", "Indofood CBP Sukses Makmur Tbk", "Consumer", "Packaged Food", 11750, 1.5, 137, false, "Insufficient Evidence", "Rupiah dan biaya input memberi konteks; bukti broker belum lengkap."],
  ["MYOR", "Mayora Indah Tbk", "Consumer", "Packaged Food", 2670, 0.2, 59.4, false, "Insufficient Evidence", "Data harga tersedia; katalis biaya input belum terhubung ke bukti lain."],
  ["AMRT", "Sumber Alfaria Trijaya Tbk", "Consumer", "Food Retail", 3260, 2.0, 135, false, "Insufficient Evidence", "Tekanan konsumsi relevan; bukti lintas pilar belum lengkap."],
];

export const companies: Company[] = companySeeds.map(([symbol, name, sector, subsector, price, changePct, marketCap, analyzed, evidenceState, summary]) => ({
  symbol,
  name,
  sector,
  subsector,
  price,
  changePct,
  marketCap,
  analyzed,
  evidenceState,
  summary,
  asOf: DATA_AS_OF,
  citations: [citations.price(symbol)],
}));

const impact = (
  symbol: SymbolCode,
  direction: ImpactLink["direction"],
  relevance: number,
  path: string,
  rationale: string,
  eventId: string,
  external = false,
): ImpactLink => ({
  symbol,
  direction,
  relevance,
  path,
  rationale,
  citations: [external ? citations.external(eventId) : citations.news(eventId)],
});

export const events: MarketEvent[] = [
  {
    id: "evt-nickel",
    title: "Harga nikel acuan berbalik naik dalam fixture makro",
    summary: "Perubahan harga komoditas diuji terhadap produsen nikel dan emiten dengan rantai pasok terkait.",
    category: "commodity", sourceType: "commodity", publishedAt: "2026-09-11T09:20:00+07:00", asOf: DATA_AS_OF, sector: "Basic Materials",
    impactLinks: [
      impact("ANTM", "Supported", 94, "Harga nikel → potensi realisasi harga → arus kas operasi", "Eksposur komoditas langsung dan gerak mendahului penutupan.", "evt-nickel", true),
      impact("INCO", "Supported", 90, "Harga nikel → realized price → margin", "Eksposur langsung ada; bukti partisipan belum lengkap.", "evt-nickel", true),
      impact("TINS", "Unrelated", 18, "Harga nikel → tidak ada jalur material langsung", "Komoditas utama perusahaan berbeda.", "evt-nickel", true),
    ], citations: [citations.external("evt-nickel")],
  },
  {
    id: "evt-rate", title: "Skenario suku bunga acuan dipertahankan", summary: "Fixture menguji biaya dana, pertumbuhan kredit, dan valuasi sektor bank.",
    category: "rates", sourceType: "macro", publishedAt: "2026-09-10T14:05:00+07:00", asOf: DATA_AS_OF, sector: "Financials",
    impactLinks: [
      impact("BBCA", "Mixed", 82, "Suku bunga → biaya dana dan yield aset → margin bunga", "Dampak pada margin dan permintaan kredit bergerak melalui jalur berbeda.", "evt-rate", true),
      impact("BBRI", "Mixed", 80, "Suku bunga → kualitas kredit mikro dan margin", "Sensitivitas kredit mikro menambah sisi adverse pada dukungan margin.", "evt-rate", true),
      impact("BMRI", "Mixed", 76, "Suku bunga → repricing aset dan liabilitas", "Repricing membutuhkan data tenor yang belum ada di fixture.", "evt-rate", true),
    ], citations: [citations.external("evt-rate")],
  },
  {
    id: "evt-rupiah", title: "Rupiah melemah terhadap dolar pada skenario makro", summary: "Dampak dipetakan melalui bahan baku impor, pendapatan dolar, dan kewajiban valuta asing.",
    category: "currency", sourceType: "macro", publishedAt: "2026-09-10T10:30:00+07:00", asOf: DATA_AS_OF, sector: "Market",
    impactLinks: [
      impact("ICBP", "Adverse", 88, "Rupiah → bahan baku impor → biaya produksi", "Jalur biaya langsung; tingkat lindung nilai belum diperiksa.", "evt-rupiah", true),
      impact("MYOR", "Mixed", 74, "Rupiah → bahan baku impor dan pendapatan ekspor", "Biaya dan pendapatan valuta asing berlawanan arah.", "evt-rupiah", true),
      impact("ANTM", "Supported", 68, "Rupiah → pendapatan terkait dolar → translasi pendapatan", "Eksposur dolar mendukung, tetapi kontrak aktual belum ada.", "evt-rupiah", true),
    ], citations: [citations.external("evt-rupiah")],
  },
  {
    id: "evt-antm-filing", title: "ANTM memublikasikan pembaruan operasi kuartalan", summary: "Fixture filing mencatat pertumbuhan volume penjualan pada lini logam utama.",
    category: "company", sourceType: "filing", publishedAt: "2026-09-09T18:10:00+07:00", asOf: DATA_AS_OF, sector: "Basic Materials",
    impactLinks: [impact("ANTM", "Supported", 96, "Volume penjualan → pendapatan → utilisasi aset", "Peristiwa perusahaan spesifik dan dapat diuji terhadap volume pasar.", "evt-antm-filing")], citations: [citations.news("evt-antm-filing")],
  },
  {
    id: "evt-bank-liquidity", title: "Likuiditas perbankan menjadi fokus laporan sektor", summary: "Fixture berita sektor memuat pertumbuhan dana murah dan biaya dana.",
    category: "company", sourceType: "sectors", publishedAt: "2026-09-09T11:00:00+07:00", asOf: DATA_AS_OF, sector: "Financials",
    impactLinks: [
      impact("BBCA", "Supported", 86, "Dana murah → biaya dana → margin bunga", "Struktur pendanaan selaras dengan faktor margin.", "evt-bank-liquidity"),
      impact("BBRI", "Mixed", 72, "Likuiditas → biaya dana dan ruang penyaluran kredit", "Dukungan likuiditas berhadapan dengan kualitas aset yang belum diperiksa.", "evt-bank-liquidity"),
    ], citations: [citations.news("evt-bank-liquidity")],
  },
  {
    id: "evt-spectrum", title: "Alokasi spektrum baru masuk tahap evaluasi", summary: "Fixture kebijakan menguji kapasitas jaringan, belanja modal, dan kualitas layanan.",
    category: "policy", sourceType: "policy", publishedAt: "2026-09-08T16:40:00+07:00", asOf: DATA_AS_OF, sector: "Infrastructure",
    impactLinks: [
      impact("TLKM", "Mixed", 88, "Spektrum → kapasitas dan capex → kualitas jaringan", "Kapasitas mendukung layanan; biaya lisensi belum tersedia.", "evt-spectrum", true),
      impact("EXCL", "Mixed", 84, "Spektrum → kapasitas dan capex → economics jaringan", "Dampak bergantung pada biaya dan alokasi final.", "evt-spectrum", true),
    ], citations: [citations.external("evt-spectrum")],
  },
  {
    id: "evt-gas", title: "Penyesuaian kebijakan harga gas industri diuji", summary: "Fixture kebijakan memetakan volume distribusi, spread, dan permintaan pelanggan industri.",
    category: "policy", sourceType: "policy", publishedAt: "2026-09-08T08:45:00+07:00", asOf: DATA_AS_OF, sector: "Energy",
    impactLinks: [impact("PGAS", "Supported", 92, "Harga gas → spread distribusi → arus kas operasi", "Jalur langsung ada; detail formula harga belum tersedia.", "evt-gas", true)], citations: [citations.external("evt-gas")],
  },
  {
    id: "evt-tech", title: "Aturan biaya layanan digital masuk konsultasi", summary: "Fixture regulasi menguji take rate, biaya kepatuhan, dan perilaku merchant.",
    category: "policy", sourceType: "policy", publishedAt: "2026-09-07T13:00:00+07:00", asOf: DATA_AS_OF, sector: "Technology",
    impactLinks: [
      impact("GOTO", "Adverse", 89, "Biaya layanan → take rate → margin kontribusi", "Risiko regulasi terhubung langsung ke monetisasi.", "evt-tech", true),
      impact("BUKA", "Mixed", 63, "Biaya layanan → aktivitas merchant → pendapatan platform", "Model bisnis memiliki eksposur berbeda yang belum dirinci.", "evt-tech", true),
    ], citations: [citations.external("evt-tech")],
  },
  {
    id: "evt-coal", title: "Harga batu bara melemah pada skenario komoditas", summary: "Fixture makro menilai realized price, royalti, dan bauran volume produsen.",
    category: "commodity", sourceType: "commodity", publishedAt: "2026-09-06T19:25:00+07:00", asOf: DATA_AS_OF, sector: "Energy",
    impactLinks: [
      impact("ADRO", "Adverse", 91, "Harga batu bara → realized price → margin", "Eksposur harga langsung ada pada bisnis komoditas.", "evt-coal", true),
      impact("PTBA", "Adverse", 90, "Harga batu bara → realized price → pendapatan", "Bauran kontrak domestik belum diperiksa.", "evt-coal", true),
    ], citations: [citations.external("evt-coal")],
  },
  {
    id: "evt-consumer", title: "Curah hujan tinggi diuji pada koridor operasi dan distribusi", summary: "Fixture cuaca BMKG menguji gangguan logistik, traffic toko, distribusi produk, dan jam operasi tambang. Lokasi aset tetap harus dipetakan sebelum hubungan dianggap final.",
    category: "weather", sourceType: "weather", publishedAt: "2026-09-05T09:15:00+07:00", asOf: DATA_AS_OF, sector: "Market",
    impactLinks: [
      impact("AMRT", "Mixed", 81, "Curah hujan → akses gerai dan traffic → penjualan toko", "Jalur masuk akal, tetapi pencocokan gerai terhadap wilayah prakiraan belum lengkap.", "evt-consumer", true),
      impact("ICBP", "Mixed", 76, "Curah hujan → distribusi produk → ketersediaan dan biaya logistik", "Jalur distribusi ada; dampak per wilayah belum dihitung.", "evt-consumer", true),
      impact("MYOR", "Mixed", 72, "Curah hujan → distribusi produk → biaya logistik", "Lokasi gudang dan rute pengiriman belum tersedia di fixture.", "evt-consumer", true),
      impact("ANTM", "Adverse", 71, "Curah hujan → jam operasi tambang → volume produksi", "Hubungan harus diverifikasi terhadap lokasi tambang dan intensitas hujan aktual.", "evt-consumer", true),
    ], citations: [citations.external("evt-consumer")],
  },
];

function makeSeries(base: number, dailyStep: number, baseVolume: number, finalVolumeMultiplier: number, seed: number): PricePoint[] {
  const dates: string[] = [];
  const cursor = new Date("2026-09-11T00:00:00Z");
  while (dates.length < 45) {
    const day = cursor.getUTCDay();
    if (day !== 0 && day !== 6) dates.unshift(cursor.toISOString().slice(0, 10));
    cursor.setUTCDate(cursor.getUTCDate() - 1);
  }
  return dates.map((date, index) => {
    const wave = Math.sin((index + seed) / 3) * base * 0.006;
    const close = Math.round(base + dailyStep * index + wave);
    const volume = index === 44
      ? Math.round(baseVolume * finalVolumeMultiplier)
      : Math.round(baseVolume * (0.88 + ((index + seed) % 7) * 0.04));
    return { date, close, ihsg: Math.round(7060 + index * 6 + Math.sin(index / 4) * 18), volume };
  });
}

const broker = (
  buyers: BrokerEvidence["buyers"],
  sellers: BrokerEvidence["sellers"],
  netForeign: number,
  totalMarketValue: number,
  freeFloatShares: number,
  sharesOutstanding: number,
  referencePrice: number,
): BrokerEvidence => ({ buyers, sellers, netForeign, totalMarketValue, freeFloatShares, sharesOutstanding, referencePrice });

const financialContext = (
  symbol: SymbolCode,
  rows: Array<[label: string, value: string, period: string, interpretation: string]>,
): FinancialInput[] => rows.map(([label, value, period, interpretation]) => ({
  label,
  value,
  period,
  interpretation,
  citations: [citations.financial(symbol)],
}));

export const analysisFixtures: Record<string, CompanyAnalysisFixture> = {
  ANTM: { symbol: "ANTM", priceSeries: makeSeries(2700, 9.2, 76_000_000, 2.7, 1), sectorReturn: 0.031, beta: 1.35, catalystEventIds: ["evt-nickel", "evt-antm-filing", "evt-rupiah"], financialContext: financialContext("ANTM", [
    ["Revenue growth", "+18,4% YoY", "2026 Q2 fixture", "Dipakai sebagai konteks kapasitas monetisasi; bukan penentu arah harga."],
    ["Operating margin", "14,2%", "2026 Q2 fixture", "Menguji apakah perubahan realized price diteruskan ke operasi."],
    ["Net debt / EBITDA", "0,7×", "2026 Q2 fixture", "Memberi konteks ruang neraca saat siklus komoditas berubah."],
  ]), broker: broker(
    [{ code: "ZP", origin: "foreign", value: 420e9 }, { code: "AK", origin: "local", value: 260e9 }, { code: "CC", origin: "local", value: 180e9 }, { code: "BK", origin: "foreign", value: 120e9 }],
    [{ code: "YP", origin: "local", value: 310e9 }, { code: "PD", origin: "local", value: 260e9 }, { code: "RX", origin: "foreign", value: 170e9 }], 360e9, 1.42e12, 5.72e9, 24.03e9, 3120) },
  BBCA: { symbol: "BBCA", priceSeries: makeSeries(9900, 11.5, 58_000_000, 1.65, 2), sectorReturn: 0.018, beta: 0.78, catalystEventIds: ["evt-rate", "evt-bank-liquidity"], financialContext: financialContext("BBCA", [
    ["NIM", "5,8%", "2026 Q2 fixture", "Menguji transmisi biaya dana dan yield aset dalam pilar Katalis."],
    ["CASA ratio", "82,1%", "2026 Q2 fixture", "Memberi konteks struktur biaya dana, tanpa menggantikan bukti flow."],
    ["Gross NPL", "1,9%", "2026 Q2 fixture", "Menguji jalur kualitas aset pada skenario suku bunga."],
  ]), broker: broker(
    [{ code: "CC", origin: "local", value: 540e9 }, { code: "AK", origin: "local", value: 490e9 }, { code: "BK", origin: "foreign", value: 430e9 }, { code: "ZP", origin: "foreign", value: 390e9 }],
    [{ code: "YP", origin: "local", value: 510e9 }, { code: "PD", origin: "local", value: 470e9 }], 210e9, 3.2e12, 54.2e9, 123.3e9, 10450) },
  BBRI: { symbol: "BBRI", priceSeries: makeSeries(5150, -4.1, 142_000_000, 1.4, 3), sectorReturn: 0.018, beta: 1.05, catalystEventIds: ["evt-rate", "evt-bank-liquidity"], financialContext: financialContext("BBRI", [
    ["NIM", "7,4%", "2026 Q2 fixture", "Menguji sensitivitas margin terhadap repricing kredit mikro."],
    ["CASA ratio", "67,8%", "2026 Q2 fixture", "Memberi konteks biaya dana pada skenario suku bunga."],
    ["Gross NPL", "3,1%", "2026 Q2 fixture", "Memeriksa sisi risiko kualitas aset yang berlawanan dengan dukungan margin."],
  ]), broker: broker(
    [{ code: "ZP", origin: "foreign", value: 760e9 }, { code: "BK", origin: "foreign", value: 620e9 }, { code: "AK", origin: "local", value: 420e9 }],
    [{ code: "YP", origin: "local", value: 690e9 }, { code: "RX", origin: "foreign", value: 610e9 }], -185e9, 3.05e12, 61.7e9, 151.6e9, 4970) },
  TLKM: { symbol: "TLKM", priceSeries: makeSeries(3050, 7.1, 89_000_000, 2.05, 4), sectorReturn: 0.012, beta: 0.82, catalystEventIds: ["evt-spectrum"], financialContext: financialContext("TLKM", [
    ["Revenue growth", "+4,6% YoY", "2026 Q2 fixture", "Menguji konteks permintaan sebelum efek kapasitas spektrum."],
    ["EBITDA margin", "51,3%", "2026 Q2 fixture", "Memberi baseline economics jaringan untuk jalur capex dan lisensi."],
    ["Capex / revenue", "18,7%", "2026 Q2 fixture", "Menguji beban investasi dari penambahan kapasitas jaringan."],
  ]), broker: broker(
    [{ code: "AK", origin: "local", value: 410e9 }, { code: "ZP", origin: "foreign", value: 350e9 }, { code: "CC", origin: "local", value: 290e9 }],
    [{ code: "YP", origin: "local", value: 390e9 }, { code: "PD", origin: "local", value: 310e9 }], 120e9, 1.9e12, 47.4e9, 99.1e9, 3380) },
  GOTO: { symbol: "GOTO", priceSeries: makeSeries(66, 0.39, 1_120_000_000, 3.2, 5), sectorReturn: 0.009, beta: 1.48, catalystEventIds: ["evt-tech"], financialContext: financialContext("GOTO", [
    ["Gross transaction value", "+15,1% YoY", "2026 Q2 fixture", "Memberi konteks skala aktivitas sebelum jalur take rate."],
    ["Contribution margin", "3,2%", "2026 Q2 fixture", "Menguji sensitivitas economics platform terhadap biaya layanan."],
    ["Cash balance", "Rp21,4T", "2026 Q2 fixture", "Memberi konteks ketahanan pendanaan, bukan sinyal transaksi."],
  ]), broker: broker(
    [{ code: "ZP", origin: "foreign", value: 390e9 }, { code: "BK", origin: "foreign", value: 320e9 }, { code: "AK", origin: "local", value: 210e9 }],
    [{ code: "YP", origin: "local", value: 370e9 }, { code: "RX", origin: "foreign", value: 340e9 }], -95e9, 1.65e12, 922e9, 1_201e9, 84) },
  PGAS: { symbol: "PGAS", priceSeries: makeSeries(1610, 5.2, 66_000_000, 2.25, 6), sectorReturn: -0.008, beta: 0.92, catalystEventIds: ["evt-gas"], financialContext: financialContext("PGAS", [
    ["Revenue growth", "+7,9% YoY", "2026 Q2 fixture", "Menguji apakah volume dan harga mulai terlihat pada pendapatan."],
    ["Gross margin", "18,6%", "2026 Q2 fixture", "Memberi baseline spread distribusi untuk jalur kebijakan gas."],
    ["Operating cash flow", "US$412M", "2026 H1 fixture", "Menguji transmisi kebijakan ke kas operasi, bukan harga saham."],
  ]), broker: broker(
    [{ code: "AK", origin: "local", value: 310e9 }, { code: "ZP", origin: "foreign", value: 260e9 }, { code: "CC", origin: "local", value: 200e9 }],
    [{ code: "YP", origin: "local", value: 250e9 }, { code: "PD", origin: "local", value: 190e9 }], 145e9, 1.2e12, 10.6e9, 24.2e9, 1835) },
};

export const demoProfiles: UserProfile[] = [
  {
    id: "flow-first", name: "Raka", description: "Flow-first, mencari konfirmasi partisipan sebelum membaca peristiwa.",
    watchlist: ["ANTM", "BBCA", "BBRI", "TLKM", "PGAS", "ICBP"], owned: ["ANTM", "BBCA", "TLKM"],
    config: { horizon: "event", depth: "standard", pillarOrder: ["concentration", "volume", "momentum", "catalyst"] },
    preferredSectors: ["Basic Materials", "Financials", "Infrastructure"], preferredEventTypes: ["commodity", "company"], hasOnboarded: false,
  },
  {
    id: "catalyst-first", name: "Maya", description: "Catalyst-first, membuka analisis dari jalur dampak dan timing peristiwa.",
    watchlist: ["ANTM", "INCO", "GOTO", "PGAS", "ICBP", "AMRT"], owned: ["GOTO", "ICBP"],
    config: { horizon: "position", depth: "forensic", pillarOrder: ["catalyst", "momentum", "volume", "concentration"] },
    preferredSectors: ["Technology", "Consumer", "Energy"], preferredEventTypes: ["policy", "currency", "rates"], hasOnboarded: true,
  },
];
