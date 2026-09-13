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
  revenueSegments,
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
  provider = "Sectors Simulasi",
  url = SECTORS_DOCS,
  urlLabel = "Buka dokumentasi sumber",
  access: Citation["access"] = "documentation",
): Citation {
  return { id, provider, endpoint, field, asOf: DATA_AS_OF, label, url, urlLabel, access };
}

const externalSource: Record<string, Pick<Citation, "provider" | "url" | "urlLabel" | "access">> = {
  "evt-nickel": { provider: "Sectors Komoditas Simulasi", url: "https://docs.sectors.app/api-references/v2/mining/commodities-trade/commodity-price", urlLabel: "Buka dokumentasi komoditas", access: "documentation" },
  "evt-tin": { provider: "Sectors Komoditas Simulasi", url: "https://docs.sectors.app/api-references/v2/mining/commodities-trade/commodity-price", urlLabel: "Buka dokumentasi komoditas", access: "documentation" },
  "evt-coal": { provider: "Sectors Komoditas Simulasi", url: "https://docs.sectors.app/api-references/v2/mining/commodities-trade/commodity-price", urlLabel: "Buka dokumentasi komoditas", access: "documentation" },
  "evt-rate": { provider: "Bank Indonesia Simulasi", url: "https://www.bi.go.id/id/fungsi-utama/moneter/bi-rate/default.aspx", urlLabel: "Buka sumber BI-Rate", access: "provider" },
  "evt-rupiah": { provider: "Bank Indonesia Simulasi", url: "https://www.bi.go.id/id/statistik/informasi-kurs/jisdor/default.aspx", urlLabel: "Buka sumber JISDOR", access: "provider" },
  "evt-spectrum": { provider: "Kebijakan Komdigi Simulasi", url: "https://www.komdigi.go.id/", urlLabel: "Buka sumber Komdigi", access: "provider" },
  "evt-gas": { provider: "Ditjen Migas Simulasi", url: "https://migas.esdm.go.id/", urlLabel: "Buka sumber Ditjen Migas", access: "provider" },
  "evt-tech": { provider: "Kebijakan Komdigi Simulasi", url: "https://www.komdigi.go.id/", urlLabel: "Buka sumber Komdigi", access: "provider" },
  "evt-consumer": { provider: "Cuaca BMKG Simulasi", url: "https://data.bmkg.go.id/prakiraan-cuaca/", urlLabel: "Buka data cuaca BMKG", access: "provider" },
};

export const citations = {
  price: (symbol: string) => cite(`price-${symbol}`, "/v2/companies/top-changes/", "last_price, change_pct", `Ringkasan harga ${symbol}`, "Sectors Simulasi", "https://docs.sectors.app/api-references/v2/indonesia/ranking/top-changes"),
  daily: (symbol: string) => cite(`daily-${symbol}`, `/v2/daily/${symbol}/`, "date, close, volume", `Data harian ${symbol}`, "Sectors Simulasi", SECTORS_DAILY_DOCS),
  broker: (symbol: string) => cite(`broker-${symbol}`, `/v2/broker-summary/${symbol}/`, "broker_code, buy_value, sell_value", `Ringkasan broker ${symbol}`, "Sectors Simulasi", SECTORS_BROKER_DOCS),
  registry: cite("registry", "/v2/brokers/", "broker_code, origin", "Daftar broker", "Sectors Simulasi", "https://docs.sectors.app/api-references/v2/indonesia/brokers/broker-registry"),
  foreign: (symbol: string) => cite(`foreign-${symbol}`, `/v2/foreign-flow/${symbol}/`, "net_foreign_inflow", `Arus asing ${symbol}`, "Sectors Simulasi", SECTORS_FOREIGN_DOCS),
  ownership: (symbol: string) => cite(`ownership-${symbol}`, `/v2/company/report/${symbol}/?sections=ownership`, "free_float, shares_outstanding", `Kepemilikan ${symbol}`, "Sectors Simulasi", "https://docs.sectors.app/api-references/v2/indonesia/report/company-report"),
  ihsg: cite("ihsg", "/v2/index-daily/ihsg/", "date, close", "Data harian IHSG", "Sectors Simulasi", "https://docs.sectors.app/api-references/v2/indonesia/transaction/index-daily"),
  market: cite("market-snapshot", "/v2/close/", "date, symbol, close, volume", "Ringkasan pasar umum", "Sectors Simulasi", "https://docs.sectors.app/api-references/v2/indonesia/transaction/close"),
  news: (eventId: string) => cite(`news-${eventId}`, eventId.includes("filing") ? "/v2/filings/" : "/v2/news/", "title, published_at, symbols, dimensions", "Berita perusahaan Sectors", "Sectors Simulasi", eventId.includes("filing") ? SECTORS_FILINGS_DOCS : SECTORS_NEWS_DOCS),
  financial: (symbol: string) => cite(`financial-${symbol}`, `/v2/financials/quarterly/${symbol}/`, "period, revenue, earnings, sector_metrics", `Konteks keuangan ${symbol}`, "Sectors Simulasi", SECTORS_FINANCIAL_DOCS),
  external: (eventId: string) => {
    const source = externalSource[eventId] ?? { provider: "Sumber Eksternal Simulasi", url: SECTORS_DOCS, urlLabel: "Buka referensi sumber", access: "provider" as const };
    return cite(`external-${eventId}`, `fixture://external/${eventId}`, "headline, published_at, exposure_tags", "Data simulasi yang terhubung ke sumber produksi resmi", source.provider, source.url, source.urlLabel, source.access);
  },
};

type CompanySeed = [SymbolCode, string, Sector, string, number, number, number, boolean, Company["evidenceState"], string];

const companySeeds: CompanySeed[] = [
  ["ANTM", "Aneka Tambang Tbk", "Basic Materials", "Diversified Metals", 3120, 5.8, 74.9, true, "Corroborated", "Arus partisipan, volume, dan katalis nikel menguat pada jendela yang sama."],
  ["INCO", "Vale Indonesia Tbk", "Basic Materials", "Nickel", 4860, 2.1, 48.3, true, "Corroborated", "Eksposur nikel diuji terhadap realisasi harga, margin, dan aktivitas pasar."],
  ["TINS", "Timah Tbk", "Basic Materials", "Tin", 1285, -0.8, 9.5, true, "Mixed Evidence", "Harga timah dan volume pasar belum bergerak sepenuhnya searah."],
  ["BBCA", "Bank Central Asia Tbk", "Financials", "Banks", 10450, 0.9, 1288, true, "Corroborated", "Partisipasi luas dan momentum relatif bergerak selaras."],
  ["BBRI", "Bank Rakyat Indonesia Tbk", "Financials", "Banks", 4970, -1.4, 753, true, "Mixed Evidence", "Akumulasi partisipan asing bertentangan dengan arus asing agregat."],
  ["BMRI", "Bank Mandiri Tbk", "Financials", "Banks", 7040, 1.2, 827, false, "Insufficient Evidence", "Ringkasan tersedia. Pemeriksaan empat pilar belum dijalankan."],
  ["TLKM", "Telkom Indonesia Tbk", "Infrastructure", "Telecommunication", 3380, 2.7, 335, true, "Corroborated", "Momentum relatif dan katalis spektrum mendapat konfirmasi volume."],
  ["JSMR", "Jasa Marga Tbk", "Infrastructure", "Toll Roads", 5180, 0.3, 37.5, false, "Insufficient Evidence", "Belum ada katalis terverifikasi dalam jendela pengamatan."],
  ["EXCL", "XLSmart Telecom Sejahtera Tbk", "Infrastructure", "Telecommunication", 2450, -0.5, 35.7, false, "Mixed Evidence", "Gerak sektor belum mendapat dukungan volume."],
  ["GOTO", "GoTo Gojek Tokopedia Tbk", "Technology", "Digital Platforms", 84, 4.9, 101, true, "Mixed Evidence", "Volume ekstrem terlihat, tetapi bukti katalis dan arus asing tidak searah."],
  ["BUKA", "Bukalapak.com Tbk", "Technology", "Digital Commerce", 151, 0.7, 15.6, false, "Insufficient Evidence", "Likuiditas tersedia; hipotesis belum memiliki bukti lintas pilar."],
  ["EMTK", "Elang Mahkota Teknologi Tbk", "Technology", "Media & Technology", 590, -1.0, 37.2, false, "Mixed Evidence", "Peristiwa kebijakan relevan, tetapi jalur dampak belum spesifik."],
  ["PGAS", "Perusahaan Gas Negara Tbk", "Energy", "Gas Distribution", 1835, 3.2, 44.6, true, "Corroborated", "Kebijakan gas, volume, dan momentum relatif saling mendukung."],
  ["ADRO", "Alamtri Resources Indonesia Tbk", "Energy", "Coal", 2740, -2.2, 88.1, true, "Mixed Evidence", "Tekanan harga batu bara diuji terhadap realisasi harga dan arus kas."],
  ["PTBA", "Bukit Asam Tbk", "Energy", "Coal", 2930, -1.7, 67.1, true, "Mixed Evidence", "Tekanan harga batu bara diuji terhadap bauran kontrak domestik dan volume penjualan."],
  ["ICBP", "Indofood CBP Sukses Makmur Tbk", "Consumer", "Packaged Food", 11750, 1.5, 137, false, "Insufficient Evidence", "Rupiah dan biaya bahan baku memberi konteks; bukti broker belum lengkap."],
  ["MYOR", "Mayora Indah Tbk", "Consumer", "Packaged Food", 2670, 0.2, 59.4, false, "Insufficient Evidence", "Data harga tersedia; katalis biaya bahan baku belum terhubung ke bukti lain."],
  ["AMRT", "Sumber Alfaria Trijaya Tbk", "Consumer", "Food Retail", 3260, 2.0, 135, false, "Insufficient Evidence", "Tekanan konsumsi relevan; bukti lintas pilar belum lengkap."],
];

export const companies: Company[] = rawCompanies.map((company) => ({
  ...company,
  asOf: DATA_AS_OF,
  citations: [citations.price(company.symbol)],
}));

export const events: MarketEvent[] = [
  {
    id: "evt-nickel",
    title: "Harga nikel acuan berbalik naik dalam data simulasi",
    summary: "Perubahan harga komoditas diuji terhadap produsen nikel dan emiten dengan rantai pasok terkait.",
    category: "commodity", sourceType: "commodity", publishedAt: "2026-09-11T09:20:00+07:00", asOf: DATA_AS_OF, sector: "Basic Materials",
    impactLinks: [
      impact("ANTM", "Supported", 94, "Harga nikel → potensi realisasi harga → arus kas operasi", "Eksposur komoditas langsung dan gerak mendahului penutupan.", "evt-nickel", true),
      impact("INCO", "Supported", 90, "Harga nikel → realisasi harga → margin", "Eksposur langsung ada. Bukti partisipan belum lengkap.", "evt-nickel", true),
      impact("TINS", "Unrelated", 18, "Harga nikel → tidak ada jalur material langsung", "Komoditas utama perusahaan berbeda.", "evt-nickel", true),
    ], citations: [citations.external("evt-nickel")],
  },
  {
    id: "evt-tin",
    title: "Harga timah acuan melemah setelah kenaikan persediaan",
    summary: "Data simulasi komoditas menguji hubungan harga timah ke realisasi harga, volume penjualan, dan margin produsen.",
    category: "commodity", sourceType: "commodity", publishedAt: "2026-09-10T15:40:00+07:00", asOf: DATA_AS_OF, sector: "Basic Materials",
    impactLinks: [
      impact("TINS", "Adverse", 93, "Harga timah → realisasi harga → margin", "Eksposur komoditas langsung. Jeda persediaan dan bauran kontrak masih perlu diperiksa.", "evt-tin", true),
      impact("ANTM", "Unrelated", 14, "Harga timah → tidak ada eksposur utama", "Kontribusi timah tidak material pada data bisnis ANTM.", "evt-tin", true),
    ], citations: [citations.external("evt-tin")],
  },
  {
    id: "evt-rate", title: "Skenario suku bunga acuan dipertahankan", summary: "Data simulasi menguji biaya dana, pertumbuhan kredit, dan valuasi sektor bank.",
    category: "rates", sourceType: "macro", publishedAt: "2026-09-10T14:05:00+07:00", asOf: DATA_AS_OF, sector: "Financials",
    impactLinks: [
      impact("BBCA", "Mixed", 82, "Suku bunga → biaya dana dan imbal hasil aset → margin bunga", "Dampak pada margin dan permintaan kredit bergerak melalui jalur berbeda.", "evt-rate", true),
      impact("BBRI", "Mixed", 80, "Suku bunga → kualitas kredit mikro dan margin", "Sensitivitas kredit mikro menambah tekanan pada margin.", "evt-rate", true),
      impact("BMRI", "Mixed", 76, "Suku bunga → penyesuaian harga aset dan liabilitas", "Penyesuaian harga membutuhkan data tenor yang belum tersedia.", "evt-rate", true),
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
    id: "evt-antm-filing", title: "ANTM memublikasikan pembaruan operasi kuartalan", summary: "Keterbukaan simulasi mencatat pertumbuhan volume penjualan pada lini logam utama.",
    category: "company", sourceType: "filing", publishedAt: "2026-09-09T18:10:00+07:00", asOf: DATA_AS_OF, sector: "Basic Materials",
    impactLinks: [impact("ANTM", "Supported", 96, "Volume penjualan → pendapatan → utilisasi aset", "Peristiwa perusahaan spesifik dan dapat diuji terhadap volume pasar.", "evt-antm-filing")], citations: [citations.news("evt-antm-filing")],
  },
  {
    id: "evt-bank-liquidity", title: "Likuiditas perbankan menjadi fokus laporan sektor", summary: "Berita sektor simulasi memuat pertumbuhan dana murah dan biaya dana.",
    category: "company", sourceType: "sectors", publishedAt: "2026-09-09T11:00:00+07:00", asOf: DATA_AS_OF, sector: "Financials",
    impactLinks: [
      impact("BBCA", "Supported", 86, "Dana murah → biaya dana → margin bunga", "Struktur pendanaan selaras dengan faktor margin.", "evt-bank-liquidity"),
      impact("BBRI", "Mixed", 72, "Likuiditas → biaya dana dan ruang penyaluran kredit", "Dukungan likuiditas berhadapan dengan kualitas aset yang belum diperiksa.", "evt-bank-liquidity"),
    ], citations: [citations.news("evt-bank-liquidity")],
  },
  {
    id: "evt-spectrum", title: "Alokasi spektrum baru masuk tahap evaluasi", summary: "Data simulasi kebijakan menguji kapasitas jaringan, belanja modal, dan kualitas layanan.",
    category: "policy", sourceType: "policy", publishedAt: "2026-09-08T16:40:00+07:00", asOf: DATA_AS_OF, sector: "Infrastructure",
    impactLinks: [
      impact("TLKM", "Mixed", 88, "Spektrum → kapasitas dan belanja modal → kualitas jaringan", "Kapasitas mendukung layanan. Biaya lisensi belum tersedia.", "evt-spectrum", true),
      impact("EXCL", "Mixed", 84, "Spektrum → kapasitas dan belanja modal → keekonomian jaringan", "Dampak bergantung pada biaya dan alokasi akhir.", "evt-spectrum", true),
    ], citations: [citations.external("evt-spectrum")],
  },
  {
    id: "evt-gas", title: "Penyesuaian kebijakan harga gas industri diuji", summary: "Data simulasi kebijakan memetakan volume distribusi, selisih harga, dan permintaan industri.",
    category: "policy", sourceType: "policy", publishedAt: "2026-09-08T08:45:00+07:00", asOf: DATA_AS_OF, sector: "Energy",
    impactLinks: [impact("PGAS", "Supported", 92, "Harga gas → selisih distribusi → arus kas operasi", "Jalur langsung ada. Rincian formula harga belum tersedia.", "evt-gas", true)], citations: [citations.external("evt-gas")],
  },
  {
    id: "evt-tech", title: "Aturan biaya layanan digital masuk konsultasi", summary: "Data simulasi regulasi menguji tingkat pendapatan, biaya kepatuhan, dan perilaku pedagang.",
    category: "policy", sourceType: "policy", publishedAt: "2026-09-07T13:00:00+07:00", asOf: DATA_AS_OF, sector: "Technology",
    impactLinks: [
      impact("GOTO", "Adverse", 89, "Biaya layanan → tingkat pendapatan → margin kontribusi", "Risiko regulasi terhubung langsung ke monetisasi.", "evt-tech", true),
      impact("BUKA", "Mixed", 63, "Biaya layanan → aktivitas pedagang → pendapatan platform", "Model bisnis memiliki eksposur berbeda yang belum dirinci.", "evt-tech", true),
    ], citations: [citations.external("evt-tech")],
  },
  {
    id: "evt-coal", title: "Harga batu bara melemah pada skenario komoditas", summary: "Data simulasi makro menilai realisasi harga, royalti, dan bauran volume produsen.",
    category: "commodity", sourceType: "commodity", publishedAt: "2026-09-06T19:25:00+07:00", asOf: DATA_AS_OF, sector: "Energy",
    impactLinks: [
      impact("ADRO", "Adverse", 91, "Harga batu bara → realisasi harga → margin", "Eksposur harga langsung ada pada bisnis komoditas.", "evt-coal", true),
      impact("PTBA", "Adverse", 90, "Harga batu bara → realisasi harga → pendapatan", "Bauran kontrak domestik belum diperiksa.", "evt-coal", true),
    ], citations: [citations.external("evt-coal")],
  },
  {
    id: "evt-consumer", title: "Curah hujan tinggi diuji pada koridor operasi dan distribusi", summary: "Data simulasi cuaca BMKG menguji gangguan logistik, kunjungan toko, distribusi produk, dan jam operasi tambang. Lokasi aset harus dipetakan sebelum hubungan dianggap kuat.",
    category: "weather", sourceType: "weather", publishedAt: "2026-09-05T09:15:00+07:00", asOf: DATA_AS_OF, sector: "Market",
    impactLinks: [
      impact("AMRT", "Mixed", 81, "Curah hujan → akses gerai dan kunjungan → penjualan toko", "Jalur masuk akal, tetapi pencocokan gerai terhadap wilayah prakiraan belum lengkap.", "evt-consumer", true),
      impact("ICBP", "Mixed", 76, "Curah hujan → distribusi produk → ketersediaan dan biaya logistik", "Jalur distribusi ada; dampak per wilayah belum dihitung.", "evt-consumer", true),
      impact("MYOR", "Mixed", 72, "Curah hujan → distribusi produk → biaya logistik", "Lokasi gudang dan rute pengiriman belum tersedia dalam data simulasi.", "evt-consumer", true),
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
    ["Pertumbuhan pendapatan", "+18,4% tahunan", "Kuartal 2 2026 · simulasi", "Dipakai sebagai konteks kemampuan monetisasi, bukan penentu arah harga."],
    ["Margin operasi", "14,2%", "Kuartal 2 2026 · simulasi", "Menguji apakah perubahan realisasi harga diteruskan ke operasi."],
    ["Utang bersih / EBITDA", "0,7×", "Kuartal 2 2026 · simulasi", "Memberi konteks ruang neraca saat siklus komoditas berubah."],
  ]), broker: broker(
    [{ code: "ZP", origin: "foreign", value: 420e9 }, { code: "AK", origin: "local", value: 260e9 }, { code: "CC", origin: "local", value: 180e9 }, { code: "BK", origin: "foreign", value: 120e9 }],
    [{ code: "YP", origin: "local", value: 310e9 }, { code: "PD", origin: "local", value: 260e9 }, { code: "RX", origin: "foreign", value: 170e9 }], 360e9, 1.42e12, 5.72e9, 24.03e9, 3120) },
  INCO: { symbol: "INCO", priceSeries: makeSeries(4480, 7.8, 31_000_000, 2.1, 7), sectorReturn: 0.031, beta: 1.18, catalystEventIds: ["evt-nickel", "evt-rupiah"], financialContext: financialContext("INCO", [
    ["Produksi nikel", "+6,7% tahunan", "Semester 1 2026 · simulasi", "Menjadi indikator volume sebelum perubahan harga komoditas diterjemahkan ke pendapatan."],
    ["Realisasi harga nikel", "US$15.840/t", "Kuartal 2 2026 · simulasi", "Menguji harga aktual terhadap perubahan harga acuan."],
    ["Margin EBITDA", "22,8%", "Kuartal 2 2026 · simulasi", "Menguji apakah realisasi harga diteruskan ke margin setelah biaya energi."],
  ]), broker: broker(
    [{ code: "ZP", origin: "foreign", value: 250e9 }, { code: "AK", origin: "local", value: 190e9 }, { code: "BK", origin: "foreign", value: 160e9 }],
    [{ code: "YP", origin: "local", value: 210e9 }, { code: "PD", origin: "local", value: 155e9 }], 118e9, 880e9, 1.98e9, 9.94e9, 4860) },
  TINS: { symbol: "TINS", priceSeries: makeSeries(1335, -1.4, 27_000_000, 1.8, 8), sectorReturn: 0.031, beta: 1.22, catalystEventIds: ["evt-tin", "evt-rupiah"], financialContext: financialContext("TINS", [
    ["Volume penjualan timah", "+3,9% tahunan", "Semester 1 2026 · simulasi", "Membedakan perubahan realisasi harga dari volume penjualan."],
    ["Rata-rata harga jual", "US$30.420/t", "Kuartal 2 2026 · simulasi", "Menguji jeda antara harga acuan, kontrak, dan harga jual aktual."],
    ["Margin operasi", "9,6%", "Kuartal 2 2026 · simulasi", "Menguji dampak harga setelah biaya penambangan dan pemurnian."],
  ]), broker: broker(
    [{ code: "AK", origin: "local", value: 118e9 }, { code: "CC", origin: "local", value: 96e9 }, { code: "ZP", origin: "foreign", value: 82e9 }],
    [{ code: "YP", origin: "local", value: 140e9 }, { code: "RX", origin: "foreign", value: 91e9 }], -24e9, 510e9, 2.52e9, 7.45e9, 1285) },
  BBCA: { symbol: "BBCA", priceSeries: makeSeries(9900, 11.5, 58_000_000, 1.65, 2), sectorReturn: 0.018, beta: 0.78, catalystEventIds: ["evt-rate", "evt-bank-liquidity"], financialContext: financialContext("BBCA", [
    ["Margin bunga bersih", "5,8%", "Kuartal 2 2026 · simulasi", "Menguji hubungan biaya dana dan imbal hasil aset dalam pilar Katalis."],
    ["Rasio dana murah", "82,1%", "Kuartal 2 2026 · simulasi", "Memberi konteks struktur biaya dana tanpa menggantikan bukti arus."],
    ["Kredit bermasalah bruto", "1,9%", "Kuartal 2 2026 · simulasi", "Menguji jalur kualitas aset pada skenario suku bunga."],
  ]), broker: broker(
    [{ code: "CC", origin: "local", value: 540e9 }, { code: "AK", origin: "local", value: 490e9 }, { code: "BK", origin: "foreign", value: 430e9 }, { code: "ZP", origin: "foreign", value: 390e9 }],
    [{ code: "YP", origin: "local", value: 510e9 }, { code: "PD", origin: "local", value: 470e9 }], 210e9, 3.2e12, 54.2e9, 123.3e9, 10450) },
  BBRI: { symbol: "BBRI", priceSeries: makeSeries(5150, -4.1, 142_000_000, 1.4, 3), sectorReturn: 0.018, beta: 1.05, catalystEventIds: ["evt-rate", "evt-bank-liquidity"], financialContext: financialContext("BBRI", [
    ["Margin bunga bersih", "7,4%", "Kuartal 2 2026 · simulasi", "Menguji sensitivitas margin terhadap penyesuaian harga kredit mikro."],
    ["Rasio dana murah", "67,8%", "Kuartal 2 2026 · simulasi", "Memberi konteks biaya dana pada skenario suku bunga."],
    ["Kredit bermasalah bruto", "3,1%", "Kuartal 2 2026 · simulasi", "Memeriksa risiko kualitas aset yang berlawanan dengan dukungan margin."],
  ]), broker: broker(
    [{ code: "ZP", origin: "foreign", value: 760e9 }, { code: "BK", origin: "foreign", value: 620e9 }, { code: "AK", origin: "local", value: 420e9 }],
    [{ code: "YP", origin: "local", value: 690e9 }, { code: "RX", origin: "foreign", value: 610e9 }], -185e9, 3.05e12, 61.7e9, 151.6e9, 4970) },
  TLKM: { symbol: "TLKM", priceSeries: makeSeries(3050, 7.1, 89_000_000, 2.05, 4), sectorReturn: 0.012, beta: 0.82, catalystEventIds: ["evt-spectrum"], financialContext: financialContext("TLKM", [
    ["Pertumbuhan pendapatan", "+4,6% tahunan", "Kuartal 2 2026 · simulasi", "Menguji permintaan sebelum efek kapasitas spektrum."],
    ["Margin EBITDA", "51,3%", "Kuartal 2 2026 · simulasi", "Memberi pembanding keekonomian jaringan untuk jalur belanja modal dan lisensi."],
    ["Belanja modal / pendapatan", "18,7%", "Kuartal 2 2026 · simulasi", "Menguji beban investasi dari penambahan kapasitas jaringan."],
  ]), broker: broker(
    [{ code: "AK", origin: "local", value: 410e9 }, { code: "ZP", origin: "foreign", value: 350e9 }, { code: "CC", origin: "local", value: 290e9 }],
    [{ code: "YP", origin: "local", value: 390e9 }, { code: "PD", origin: "local", value: 310e9 }], 120e9, 1.9e12, 47.4e9, 99.1e9, 3380) },
  GOTO: { symbol: "GOTO", priceSeries: makeSeries(66, 0.39, 1_120_000_000, 3.2, 5), sectorReturn: 0.009, beta: 1.48, catalystEventIds: ["evt-tech"], financialContext: financialContext("GOTO", [
    ["Nilai transaksi bruto", "+15,1% tahunan", "Kuartal 2 2026 · simulasi", "Memberi konteks skala aktivitas sebelum jalur tingkat pendapatan."],
    ["Margin kontribusi", "3,2%", "Kuartal 2 2026 · simulasi", "Menguji sensitivitas keekonomian platform terhadap biaya layanan."],
    ["Saldo kas", "Rp21,4T", "Kuartal 2 2026 · simulasi", "Memberi konteks ketahanan pendanaan, bukan penilaian transaksi."],
  ]), broker: broker(
    [{ code: "ZP", origin: "foreign", value: 390e9 }, { code: "BK", origin: "foreign", value: 320e9 }, { code: "AK", origin: "local", value: 210e9 }],
    [{ code: "YP", origin: "local", value: 370e9 }, { code: "RX", origin: "foreign", value: 340e9 }], -95e9, 1.65e12, 922e9, 1_201e9, 84) },
  PGAS: { symbol: "PGAS", priceSeries: makeSeries(1610, 5.2, 66_000_000, 2.25, 6), sectorReturn: -0.008, beta: 0.92, catalystEventIds: ["evt-gas"], financialContext: financialContext("PGAS", [
    ["Pertumbuhan pendapatan", "+7,9% tahunan", "Kuartal 2 2026 · simulasi", "Menguji apakah volume dan harga mulai terlihat pada pendapatan."],
    ["Margin kotor", "18,6%", "Kuartal 2 2026 · simulasi", "Memberi pembanding selisih distribusi untuk jalur kebijakan gas."],
    ["Arus kas operasi", "US$412M", "Semester 1 2026 · simulasi", "Menguji dampak kebijakan ke kas operasi, bukan harga saham."],
  ]), broker: broker(
    [{ code: "AK", origin: "local", value: 310e9 }, { code: "ZP", origin: "foreign", value: 260e9 }, { code: "CC", origin: "local", value: 200e9 }],
    [{ code: "YP", origin: "local", value: 250e9 }, { code: "PD", origin: "local", value: 190e9 }], 145e9, 1.2e12, 10.6e9, 24.2e9, 1835) },
  ADRO: { symbol: "ADRO", priceSeries: makeSeries(2940, -4.8, 49_000_000, 2.35, 9), sectorReturn: -0.008, beta: 1.08, catalystEventIds: ["evt-coal", "evt-rupiah"], financialContext: financialContext("ADRO", [
    ["Volume penjualan batu bara", "+2,8% tahunan", "Semester 1 2026 · simulasi", "Menguji apakah volume mengimbangi tekanan realisasi harga."],
    ["Rata-rata harga jual", "US$63,7/t", "Kuartal 2 2026 · simulasi", "Menguji dampak harga acuan batu bara ke harga kontrak aktual."],
    ["Arus kas operasi", "US$518M", "Semester 1 2026 · simulasi", "Menjadi hasil kas setelah harga, volume, royalti, dan biaya."],
  ]), broker: broker(
    [{ code: "AK", origin: "local", value: 275e9 }, { code: "ZP", origin: "foreign", value: 230e9 }, { code: "CC", origin: "local", value: 175e9 }],
    [{ code: "YP", origin: "local", value: 315e9 }, { code: "RX", origin: "foreign", value: 225e9 }], -66e9, 1.05e12, 12.4e9, 31.9e9, 2740) },
  PTBA: { symbol: "PTBA", priceSeries: makeSeries(3120, -3.9, 38_000_000, 1.95, 10), sectorReturn: -0.008, beta: 0.84, catalystEventIds: ["evt-coal", "evt-rupiah"], financialContext: financialContext("PTBA", [
    ["Volume penjualan batu bara", "+7,1% tahunan", "Semester 1 2026 · simulasi", "Menguji apakah kenaikan volume menahan tekanan harga jual."],
    ["Porsi pasar domestik", "52,6%", "Semester 1 2026 · simulasi", "Membedakan eksposur kontrak domestik dari harga acuan ekspor."],
    ["Biaya tunai", "US$41,2/t", "Kuartal 2 2026 · simulasi", "Menguji ruang margin saat realisasi harga melemah."],
  ]), broker: broker(
    [{ code: "CC", origin: "local", value: 210e9 }, { code: "AK", origin: "local", value: 185e9 }, { code: "ZP", origin: "foreign", value: 150e9 }],
    [{ code: "YP", origin: "local", value: 248e9 }, { code: "PD", origin: "local", value: 181e9 }], -31e9, 820e9, 4.18e9, 11.5e9, 2930) },
};

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
