// GENERATED FILE — do not edit by hand.
// Written by scripts/build_market_data.py from the recorded Sectors API responses
// in data/sectors/. Every value below is either a raw field from those recordings or
// an aggregate of them; re-run the script to refresh it.

import type { BrokerEvidence, EvidenceState, ImpactDirection, InstitutionalFlow, MarketEvent, PricePoint, Sector, SymbolCode } from "@/lib/types";

export const DATA_AS_OF = "2026-09-28T16:15:00+07:00";
export const WINDOW_DATES = [
  "2026-08-03",
  "2026-08-04",
  "2026-08-05",
  "2026-08-06",
  "2026-08-07",
  "2026-08-10",
  "2026-08-11",
  "2026-08-12",
  "2026-08-13",
  "2026-08-14",
  "2026-08-18",
  "2026-08-19",
  "2026-08-20",
  "2026-08-21",
  "2026-08-24",
  "2026-08-26",
  "2026-08-27",
  "2026-08-28",
  "2026-08-31",
  "2026-09-01",
  "2026-09-02",
  "2026-09-03",
  "2026-09-04",
  "2026-09-07",
  "2026-09-08",
  "2026-09-09",
  "2026-09-10",
  "2026-09-11",
  "2026-09-14",
  "2026-09-15",
  "2026-09-16",
  "2026-09-17",
  "2026-09-18",
  "2026-09-21",
  "2026-09-22",
  "2026-09-23",
  "2026-09-24",
  "2026-09-25",
  "2026-09-28"
] as const;

export interface RawCompany {
  symbol: SymbolCode;
  name: string;
  sector: Sector;
  subsector: string;
  price: number;
  changePct: number;
  marketCap: number;
  analyzed: boolean;
  evidenceState: EvidenceState;
  summary: string;
}

export interface RawEvent {
  id: string;
  title: string;
  summary: string;
  body: string | null;
  category: MarketEvent["category"];
  sourceType: MarketEvent["sourceType"];
  publishedAt: string;
  sector: Sector | "Market";
  source: string | null;
  tags: string[];
  impactLinks: Array<{ symbol: SymbolCode; direction: ImpactDirection; relevance: number; path: string; rationale: string }>;
}

export const rawCompanies: RawCompany[] = [
  {
    "symbol": "ADRO",
    "name": "Alamtri Resources Indonesia Tbk",
    "sector": "Energy",
    "subsector": "Oil, Gas & Coal",
    "price": 2590,
    "changePct": -0.38,
    "marketCap": 74.6,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 2.590 pada 2026-09-28; volume terakhir 0.80× median 38 sesi; 7 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "AMRT",
    "name": "PT Sumber Alfaria Trijaya Tbk.",
    "sector": "Consumer",
    "subsector": "Food & Staples Retailing",
    "price": 1330,
    "changePct": 1.92,
    "marketCap": 55.2,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 1.330 pada 2026-09-28; volume terakhir 0.82× median 38 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "ANTM",
    "name": "Aneka Tambang Tbk.",
    "sector": "Basic Materials",
    "subsector": "Basic Materials",
    "price": 3100,
    "changePct": -4.02,
    "marketCap": 74.5,
    "analyzed": true,
    "evidenceState": "Corroborated",
    "summary": "Close 3.100 pada 2026-09-28; volume terakhir 0.78× median 38 sesi; 5 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BBCA",
    "name": "PT Bank Central Asia Tbk.",
    "sector": "Financials",
    "subsector": "Banks",
    "price": 6225,
    "changePct": -0.4,
    "marketCap": 759.7,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 6.225 pada 2026-09-28; volume terakhir 1.17× median 38 sesi; 8 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BBRI",
    "name": "PT Bank Rakyat Indonesia (Persero) Tbk",
    "sector": "Financials",
    "subsector": "Banks",
    "price": 3140,
    "changePct": -0.32,
    "marketCap": 471.1,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 3.140 pada 2026-09-28; volume terakhir 0.65× median 38 sesi; 7 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BMRI",
    "name": "PT Bank Mandiri (Persero) Tbk",
    "sector": "Financials",
    "subsector": "Banks",
    "price": 4020,
    "changePct": -1.47,
    "marketCap": 371.4,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 4.020 pada 2026-09-28; volume terakhir 1.02× median 38 sesi; 6 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BUKA",
    "name": "PT Bukalapak.com Tbk",
    "sector": "Technology",
    "subsector": "Software & IT Services",
    "price": 103,
    "changePct": -0.96,
    "marketCap": 10.6,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 103 pada 2026-09-28; volume terakhir 0.89× median 38 sesi; 5 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "EMTK",
    "name": "Elang Mahkota Teknologi Tbk",
    "sector": "Technology",
    "subsector": "Software & IT Services",
    "price": 408,
    "changePct": -2.86,
    "marketCap": 25.1,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 408 pada 2026-09-28; volume terakhir 0.79× median 38 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "EXCL",
    "name": "PT XLSMART Telecom Sejahtera Tbk",
    "sector": "Infrastructure",
    "subsector": "Telecommunication",
    "price": 2310,
    "changePct": -0.86,
    "marketCap": 42.0,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 2.310 pada 2026-09-28; volume terakhir 1.48× median 38 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "GOTO",
    "name": "PT GoTo Gojek Tokopedia Tbk",
    "sector": "Technology",
    "subsector": "Software & IT Services",
    "price": 43,
    "changePct": -14.0,
    "marketCap": 49.0,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 43 pada 2026-09-28; volume terakhir 12.50× median 38 sesi; 7 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "ICBP",
    "name": "Indofood CBP Sukses Makmur Tbk",
    "sector": "Consumer",
    "subsector": "Food & Beverage",
    "price": 6650,
    "changePct": 0.0,
    "marketCap": 77.6,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 6.650 pada 2026-09-28; volume terakhir 0.72× median 38 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "INCO",
    "name": "Vale Indonesia Tbk",
    "sector": "Basic Materials",
    "subsector": "Basic Materials",
    "price": 4400,
    "changePct": -5.98,
    "marketCap": 46.4,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 4.400 pada 2026-09-28; volume terakhir 1.61× median 38 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "JSMR",
    "name": "PT Jasa Marga Tbk",
    "sector": "Infrastructure",
    "subsector": "Transportation Infrastructure",
    "price": 2690,
    "changePct": -1.1,
    "marketCap": 19.5,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 2.690 pada 2026-09-28; volume terakhir 0.59× median 38 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "MYOR",
    "name": "Mayora Indah Tbk",
    "sector": "Consumer",
    "subsector": "Food & Beverage",
    "price": 1405,
    "changePct": -2.09,
    "marketCap": 31.4,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 1.405 pada 2026-09-28; volume terakhir 0.73× median 38 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "PGAS",
    "name": "PT Perusahaan Gas Negara Tbk",
    "sector": "Energy",
    "subsector": "Oil, Gas & Coal",
    "price": 1440,
    "changePct": 0.7,
    "marketCap": 34.9,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 1.440 pada 2026-09-28; volume terakhir 0.47× median 38 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "PTBA",
    "name": "Bukit Asam Tbk",
    "sector": "Energy",
    "subsector": "Oil, Gas & Coal",
    "price": 3180,
    "changePct": 2.91,
    "marketCap": 36.6,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 3.180 pada 2026-09-28; volume terakhir 2.62× median 38 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "TINS",
    "name": "PT Timah Tbk",
    "sector": "Basic Materials",
    "subsector": "Basic Materials",
    "price": 4510,
    "changePct": -4.45,
    "marketCap": 33.6,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 4.510 pada 2026-09-28; volume terakhir 0.84× median 38 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "TLKM",
    "name": "PT Telkom Indonesia (Persero) Tbk",
    "sector": "Infrastructure",
    "subsector": "Telecommunication",
    "price": 2370,
    "changePct": -1.66,
    "marketCap": 234.8,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 2.370 pada 2026-09-28; volume terakhir 1.46× median 38 sesi; 8 peristiwa terhubung pada jendela ini."
  }
];

export const priceSeries: Record<string, PricePoint[]> = {
  "ADRO": [
    {
      "date": "2026-08-03",
      "close": 2470,
      "ihsg": 6234,
      "volume": 17816300
    },
    {
      "date": "2026-08-04",
      "close": 2520,
      "ihsg": 6320,
      "volume": 34062000
    },
    {
      "date": "2026-08-05",
      "close": 2550,
      "ihsg": 6351,
      "volume": 26513000
    },
    {
      "date": "2026-08-06",
      "close": 2500,
      "ihsg": 6344,
      "volume": 18191200
    },
    {
      "date": "2026-08-07",
      "close": 2540,
      "ihsg": 6410,
      "volume": 14412400
    },
    {
      "date": "2026-08-10",
      "close": 2530,
      "ihsg": 6365,
      "volume": 18267400
    },
    {
      "date": "2026-08-11",
      "close": 2530,
      "ihsg": 6268,
      "volume": 22808600
    },
    {
      "date": "2026-08-12",
      "close": 2520,
      "ihsg": 6374,
      "volume": 17523900
    },
    {
      "date": "2026-08-13",
      "close": 2470,
      "ihsg": 6302,
      "volume": 21270000
    },
    {
      "date": "2026-08-14",
      "close": 2530,
      "ihsg": 6402,
      "volume": 18026800
    },
    {
      "date": "2026-08-18",
      "close": 2570,
      "ihsg": 6450,
      "volume": 37379600
    },
    {
      "date": "2026-08-19",
      "close": 2560,
      "ihsg": 6394,
      "volume": 29007800
    },
    {
      "date": "2026-08-20",
      "close": 2560,
      "ihsg": 6502,
      "volume": 19575600
    },
    {
      "date": "2026-08-21",
      "close": 2550,
      "ihsg": 6526,
      "volume": 15845700
    },
    {
      "date": "2026-08-24",
      "close": 2630,
      "ihsg": 6502,
      "volume": 52533200
    },
    {
      "date": "2026-08-26",
      "close": 2610,
      "ihsg": 6406,
      "volume": 50134700
    },
    {
      "date": "2026-08-27",
      "close": 2700,
      "ihsg": 6522,
      "volume": 65458300
    },
    {
      "date": "2026-08-28",
      "close": 2670,
      "ihsg": 6518,
      "volume": 33101900
    },
    {
      "date": "2026-08-31",
      "close": 2840,
      "ihsg": 6525,
      "volume": 102100700
    },
    {
      "date": "2026-09-01",
      "close": 2780,
      "ihsg": 6600,
      "volume": 60278400
    },
    {
      "date": "2026-09-02",
      "close": 2650,
      "ihsg": 6596,
      "volume": 125290300
    },
    {
      "date": "2026-09-03",
      "close": 2740,
      "ihsg": 6668,
      "volume": 77055100
    },
    {
      "date": "2026-09-04",
      "close": 2720,
      "ihsg": 6636,
      "volume": 40544500
    },
    {
      "date": "2026-09-07",
      "close": 2700,
      "ihsg": 6620,
      "volume": 32017200
    },
    {
      "date": "2026-09-08",
      "close": 2690,
      "ihsg": 6686,
      "volume": 34095200
    },
    {
      "date": "2026-09-09",
      "close": 2690,
      "ihsg": 6678,
      "volume": 68999600
    },
    {
      "date": "2026-09-10",
      "close": 2670,
      "ihsg": 6589,
      "volume": 22343200
    },
    {
      "date": "2026-09-11",
      "close": 2640,
      "ihsg": 6541,
      "volume": 28561800
    },
    {
      "date": "2026-09-14",
      "close": 2620,
      "ihsg": 6535,
      "volume": 40582600
    },
    {
      "date": "2026-09-15",
      "close": 2590,
      "ihsg": 6461,
      "volume": 26711100
    },
    {
      "date": "2026-09-16",
      "close": 2600,
      "ihsg": 6437,
      "volume": 53235800
    },
    {
      "date": "2026-09-17",
      "close": 2670,
      "ihsg": 6462,
      "volume": 43351000
    },
    {
      "date": "2026-09-18",
      "close": 2640,
      "ihsg": 6441,
      "volume": 74058700
    },
    {
      "date": "2026-09-21",
      "close": 2620,
      "ihsg": 6385,
      "volume": 28553500
    },
    {
      "date": "2026-09-22",
      "close": 2610,
      "ihsg": 6277,
      "volume": 32366600
    },
    {
      "date": "2026-09-23",
      "close": 2600,
      "ihsg": 6375,
      "volume": 55005000
    },
    {
      "date": "2026-09-24",
      "close": 2560,
      "ihsg": 6299,
      "volume": 19671000
    },
    {
      "date": "2026-09-25",
      "close": 2600,
      "ihsg": 6242,
      "volume": 21107500
    },
    {
      "date": "2026-09-28",
      "close": 2590,
      "ihsg": 6148,
      "volume": 26031800
    }
  ],
  "AMRT": [
    {
      "date": "2026-08-03",
      "close": 1325,
      "ihsg": 6234,
      "volume": 43707600
    },
    {
      "date": "2026-08-04",
      "close": 1325,
      "ihsg": 6320,
      "volume": 38218300
    },
    {
      "date": "2026-08-05",
      "close": 1425,
      "ihsg": 6351,
      "volume": 68734700
    },
    {
      "date": "2026-08-06",
      "close": 1400,
      "ihsg": 6344,
      "volume": 36788000
    },
    {
      "date": "2026-08-07",
      "close": 1420,
      "ihsg": 6410,
      "volume": 19096000
    },
    {
      "date": "2026-08-10",
      "close": 1385,
      "ihsg": 6365,
      "volume": 37440400
    },
    {
      "date": "2026-08-11",
      "close": 1395,
      "ihsg": 6268,
      "volume": 50177000
    },
    {
      "date": "2026-08-12",
      "close": 1390,
      "ihsg": 6374,
      "volume": 30175500
    },
    {
      "date": "2026-08-13",
      "close": 1350,
      "ihsg": 6302,
      "volume": 35838400
    },
    {
      "date": "2026-08-14",
      "close": 1370,
      "ihsg": 6402,
      "volume": 22066000
    },
    {
      "date": "2026-08-18",
      "close": 1400,
      "ihsg": 6450,
      "volume": 40228000
    },
    {
      "date": "2026-08-19",
      "close": 1355,
      "ihsg": 6394,
      "volume": 36791800
    },
    {
      "date": "2026-08-20",
      "close": 1375,
      "ihsg": 6502,
      "volume": 18249900
    },
    {
      "date": "2026-08-21",
      "close": 1440,
      "ihsg": 6526,
      "volume": 43120200
    },
    {
      "date": "2026-08-24",
      "close": 1415,
      "ihsg": 6502,
      "volume": 27292400
    },
    {
      "date": "2026-08-26",
      "close": 1380,
      "ihsg": 6406,
      "volume": 29307200
    },
    {
      "date": "2026-08-27",
      "close": 1375,
      "ihsg": 6522,
      "volume": 20056500
    },
    {
      "date": "2026-08-28",
      "close": 1340,
      "ihsg": 6518,
      "volume": 48088200
    },
    {
      "date": "2026-08-31",
      "close": 1335,
      "ihsg": 6525,
      "volume": 72131700
    },
    {
      "date": "2026-09-01",
      "close": 1340,
      "ihsg": 6600,
      "volume": 28779900
    },
    {
      "date": "2026-09-02",
      "close": 1305,
      "ihsg": 6596,
      "volume": 36147700
    },
    {
      "date": "2026-09-03",
      "close": 1325,
      "ihsg": 6668,
      "volume": 32300100
    },
    {
      "date": "2026-09-04",
      "close": 1310,
      "ihsg": 6636,
      "volume": 30783000
    },
    {
      "date": "2026-09-07",
      "close": 1315,
      "ihsg": 6620,
      "volume": 18085300
    },
    {
      "date": "2026-09-08",
      "close": 1310,
      "ihsg": 6686,
      "volume": 19926100
    },
    {
      "date": "2026-09-09",
      "close": 1310,
      "ihsg": 6678,
      "volume": 40247100
    },
    {
      "date": "2026-09-10",
      "close": 1300,
      "ihsg": 6589,
      "volume": 23188500
    },
    {
      "date": "2026-09-11",
      "close": 1255,
      "ihsg": 6541,
      "volume": 29331500
    },
    {
      "date": "2026-09-14",
      "close": 1280,
      "ihsg": 6535,
      "volume": 31315800
    },
    {
      "date": "2026-09-15",
      "close": 1300,
      "ihsg": 6461,
      "volume": 31110600
    },
    {
      "date": "2026-09-16",
      "close": 1300,
      "ihsg": 6437,
      "volume": 22212300
    },
    {
      "date": "2026-09-17",
      "close": 1325,
      "ihsg": 6462,
      "volume": 21271800
    },
    {
      "date": "2026-09-18",
      "close": 1300,
      "ihsg": 6441,
      "volume": 101363200
    },
    {
      "date": "2026-09-21",
      "close": 1315,
      "ihsg": 6385,
      "volume": 15096500
    },
    {
      "date": "2026-09-22",
      "close": 1305,
      "ihsg": 6277,
      "volume": 56252000
    },
    {
      "date": "2026-09-23",
      "close": 1310,
      "ihsg": 6375,
      "volume": 13899600
    },
    {
      "date": "2026-09-24",
      "close": 1280,
      "ihsg": 6299,
      "volume": 35826600
    },
    {
      "date": "2026-09-25",
      "close": 1305,
      "ihsg": 6242,
      "volume": 36005800
    },
    {
      "date": "2026-09-28",
      "close": 1330,
      "ihsg": 6148,
      "volume": 26524400
    }
  ],
  "ANTM": [
    {
      "date": "2026-08-03",
      "close": 2870,
      "ihsg": 6234,
      "volume": 46158100
    },
    {
      "date": "2026-08-04",
      "close": 2890,
      "ihsg": 6320,
      "volume": 70023600
    },
    {
      "date": "2026-08-05",
      "close": 3070,
      "ihsg": 6351,
      "volume": 187572000
    },
    {
      "date": "2026-08-06",
      "close": 3080,
      "ihsg": 6344,
      "volume": 172099500
    },
    {
      "date": "2026-08-07",
      "close": 3160,
      "ihsg": 6410,
      "volume": 108524600
    },
    {
      "date": "2026-08-10",
      "close": 3140,
      "ihsg": 6365,
      "volume": 107393800
    },
    {
      "date": "2026-08-11",
      "close": 3090,
      "ihsg": 6268,
      "volume": 110426400
    },
    {
      "date": "2026-08-12",
      "close": 3090,
      "ihsg": 6374,
      "volume": 57409700
    },
    {
      "date": "2026-08-13",
      "close": 3000,
      "ihsg": 6302,
      "volume": 86077700
    },
    {
      "date": "2026-08-14",
      "close": 3070,
      "ihsg": 6402,
      "volume": 83223900
    },
    {
      "date": "2026-08-18",
      "close": 3100,
      "ihsg": 6450,
      "volume": 90263100
    },
    {
      "date": "2026-08-19",
      "close": 3030,
      "ihsg": 6394,
      "volume": 93004300
    },
    {
      "date": "2026-08-20",
      "close": 3140,
      "ihsg": 6502,
      "volume": 141884600
    },
    {
      "date": "2026-08-21",
      "close": 3170,
      "ihsg": 6526,
      "volume": 114077500
    },
    {
      "date": "2026-08-24",
      "close": 3190,
      "ihsg": 6502,
      "volume": 114351200
    },
    {
      "date": "2026-08-26",
      "close": 3160,
      "ihsg": 6406,
      "volume": 125424800
    },
    {
      "date": "2026-08-27",
      "close": 3180,
      "ihsg": 6522,
      "volume": 71295100
    },
    {
      "date": "2026-08-28",
      "close": 3160,
      "ihsg": 6518,
      "volume": 62500400
    },
    {
      "date": "2026-08-31",
      "close": 3100,
      "ihsg": 6525,
      "volume": 88604100
    },
    {
      "date": "2026-09-01",
      "close": 3080,
      "ihsg": 6600,
      "volume": 87778200
    },
    {
      "date": "2026-09-02",
      "close": 3030,
      "ihsg": 6596,
      "volume": 99650500
    },
    {
      "date": "2026-09-03",
      "close": 3150,
      "ihsg": 6668,
      "volume": 136685600
    },
    {
      "date": "2026-09-04",
      "close": 3120,
      "ihsg": 6636,
      "volume": 83943400
    },
    {
      "date": "2026-09-07",
      "close": 3080,
      "ihsg": 6620,
      "volume": 72342200
    },
    {
      "date": "2026-09-08",
      "close": 3080,
      "ihsg": 6686,
      "volume": 96926900
    },
    {
      "date": "2026-09-09",
      "close": 3200,
      "ihsg": 6678,
      "volume": 205956800
    },
    {
      "date": "2026-09-10",
      "close": 3270,
      "ihsg": 6589,
      "volume": 255111300
    },
    {
      "date": "2026-09-11",
      "close": 3270,
      "ihsg": 6541,
      "volume": 135708200
    },
    {
      "date": "2026-09-14",
      "close": 3190,
      "ihsg": 6535,
      "volume": 153989700
    },
    {
      "date": "2026-09-15",
      "close": 3270,
      "ihsg": 6461,
      "volume": 136346800
    },
    {
      "date": "2026-09-16",
      "close": 3220,
      "ihsg": 6437,
      "volume": 142697700
    },
    {
      "date": "2026-09-17",
      "close": 3280,
      "ihsg": 6462,
      "volume": 71211300
    },
    {
      "date": "2026-09-18",
      "close": 3340,
      "ihsg": 6441,
      "volume": 135669000
    },
    {
      "date": "2026-09-21",
      "close": 3240,
      "ihsg": 6385,
      "volume": 108664300
    },
    {
      "date": "2026-09-22",
      "close": 3170,
      "ihsg": 6277,
      "volume": 80058600
    },
    {
      "date": "2026-09-23",
      "close": 3280,
      "ihsg": 6375,
      "volume": 80259400
    },
    {
      "date": "2026-09-24",
      "close": 3270,
      "ihsg": 6299,
      "volume": 53729000
    },
    {
      "date": "2026-09-25",
      "close": 3230,
      "ihsg": 6242,
      "volume": 67544100
    },
    {
      "date": "2026-09-28",
      "close": 3100,
      "ihsg": 6148,
      "volume": 77533400
    }
  ],
  "BBCA": [
    {
      "date": "2026-08-03",
      "close": 6300,
      "ihsg": 6234,
      "volume": 68143700
    },
    {
      "date": "2026-08-04",
      "close": 6500,
      "ihsg": 6320,
      "volume": 138953100
    },
    {
      "date": "2026-08-05",
      "close": 6450,
      "ihsg": 6351,
      "volume": 101666100
    },
    {
      "date": "2026-08-06",
      "close": 6350,
      "ihsg": 6344,
      "volume": 80734000
    },
    {
      "date": "2026-08-07",
      "close": 6375,
      "ihsg": 6410,
      "volume": 111930800
    },
    {
      "date": "2026-08-10",
      "close": 6375,
      "ihsg": 6365,
      "volume": 88666100
    },
    {
      "date": "2026-08-11",
      "close": 6300,
      "ihsg": 6268,
      "volume": 112490800
    },
    {
      "date": "2026-08-12",
      "close": 6350,
      "ihsg": 6374,
      "volume": 87177100
    },
    {
      "date": "2026-08-13",
      "close": 6375,
      "ihsg": 6302,
      "volume": 83208000
    },
    {
      "date": "2026-08-14",
      "close": 6350,
      "ihsg": 6402,
      "volume": 56953500
    },
    {
      "date": "2026-08-18",
      "close": 6300,
      "ihsg": 6450,
      "volume": 114945500
    },
    {
      "date": "2026-08-19",
      "close": 6300,
      "ihsg": 6394,
      "volume": 68105000
    },
    {
      "date": "2026-08-20",
      "close": 6400,
      "ihsg": 6502,
      "volume": 67749800
    },
    {
      "date": "2026-08-21",
      "close": 6450,
      "ihsg": 6526,
      "volume": 100684300
    },
    {
      "date": "2026-08-24",
      "close": 6400,
      "ihsg": 6502,
      "volume": 81295600
    },
    {
      "date": "2026-08-26",
      "close": 6350,
      "ihsg": 6406,
      "volume": 86115900
    },
    {
      "date": "2026-08-27",
      "close": 6400,
      "ihsg": 6522,
      "volume": 60556000
    },
    {
      "date": "2026-08-28",
      "close": 6475,
      "ihsg": 6518,
      "volume": 156445200
    },
    {
      "date": "2026-08-31",
      "close": 6475,
      "ihsg": 6525,
      "volume": 230904500
    },
    {
      "date": "2026-09-01",
      "close": 6600,
      "ihsg": 6600,
      "volume": 117969900
    },
    {
      "date": "2026-09-02",
      "close": 6675,
      "ihsg": 6596,
      "volume": 108537400
    },
    {
      "date": "2026-09-03",
      "close": 6775,
      "ihsg": 6668,
      "volume": 112329900
    },
    {
      "date": "2026-09-04",
      "close": 6700,
      "ihsg": 6636,
      "volume": 93923500
    },
    {
      "date": "2026-09-07",
      "close": 6625,
      "ihsg": 6620,
      "volume": 65118000
    },
    {
      "date": "2026-09-08",
      "close": 6675,
      "ihsg": 6686,
      "volume": 108127600
    },
    {
      "date": "2026-09-09",
      "close": 6525,
      "ihsg": 6678,
      "volume": 193375100
    },
    {
      "date": "2026-09-10",
      "close": 6425,
      "ihsg": 6589,
      "volume": 196819200
    },
    {
      "date": "2026-09-11",
      "close": 6325,
      "ihsg": 6541,
      "volume": 187922700
    },
    {
      "date": "2026-09-14",
      "close": 6500,
      "ihsg": 6535,
      "volume": 218017200
    },
    {
      "date": "2026-09-15",
      "close": 6400,
      "ihsg": 6461,
      "volume": 95608200
    },
    {
      "date": "2026-09-16",
      "close": 6325,
      "ihsg": 6437,
      "volume": 72157400
    },
    {
      "date": "2026-09-17",
      "close": 6350,
      "ihsg": 6462,
      "volume": 61812000
    },
    {
      "date": "2026-09-18",
      "close": 6300,
      "ihsg": 6441,
      "volume": 176753700
    },
    {
      "date": "2026-09-21",
      "close": 6225,
      "ihsg": 6385,
      "volume": 69914100
    },
    {
      "date": "2026-09-22",
      "close": 6200,
      "ihsg": 6277,
      "volume": 93211200
    },
    {
      "date": "2026-09-23",
      "close": 6300,
      "ihsg": 6375,
      "volume": 96826100
    },
    {
      "date": "2026-09-24",
      "close": 6225,
      "ihsg": 6299,
      "volume": 75648600
    },
    {
      "date": "2026-09-25",
      "close": 6250,
      "ihsg": 6242,
      "volume": 89447400
    },
    {
      "date": "2026-09-28",
      "close": 6225,
      "ihsg": 6148,
      "volume": 112107600
    }
  ],
  "BBRI": [
    {
      "date": "2026-08-03",
      "close": 3020,
      "ihsg": 6234,
      "volume": 119721600
    },
    {
      "date": "2026-08-04",
      "close": 3060,
      "ihsg": 6320,
      "volume": 191121700
    },
    {
      "date": "2026-08-05",
      "close": 3020,
      "ihsg": 6351,
      "volume": 111460100
    },
    {
      "date": "2026-08-06",
      "close": 3040,
      "ihsg": 6344,
      "volume": 117685400
    },
    {
      "date": "2026-08-07",
      "close": 3130,
      "ihsg": 6410,
      "volume": 349136300
    },
    {
      "date": "2026-08-10",
      "close": 3090,
      "ihsg": 6365,
      "volume": 232230700
    },
    {
      "date": "2026-08-11",
      "close": 3090,
      "ihsg": 6268,
      "volume": 179274900
    },
    {
      "date": "2026-08-12",
      "close": 3130,
      "ihsg": 6374,
      "volume": 158307500
    },
    {
      "date": "2026-08-13",
      "close": 3110,
      "ihsg": 6302,
      "volume": 165084600
    },
    {
      "date": "2026-08-14",
      "close": 3120,
      "ihsg": 6402,
      "volume": 118492200
    },
    {
      "date": "2026-08-18",
      "close": 3080,
      "ihsg": 6450,
      "volume": 153801000
    },
    {
      "date": "2026-08-19",
      "close": 3080,
      "ihsg": 6394,
      "volume": 101112000
    },
    {
      "date": "2026-08-20",
      "close": 3140,
      "ihsg": 6502,
      "volume": 156120300
    },
    {
      "date": "2026-08-21",
      "close": 3230,
      "ihsg": 6526,
      "volume": 349663900
    },
    {
      "date": "2026-08-24",
      "close": 3180,
      "ihsg": 6502,
      "volume": 151200300
    },
    {
      "date": "2026-08-26",
      "close": 3130,
      "ihsg": 6406,
      "volume": 159003300
    },
    {
      "date": "2026-08-27",
      "close": 3150,
      "ihsg": 6522,
      "volume": 164832300
    },
    {
      "date": "2026-08-28",
      "close": 3190,
      "ihsg": 6518,
      "volume": 135419900
    },
    {
      "date": "2026-08-31",
      "close": 3250,
      "ihsg": 6525,
      "volume": 353834000
    },
    {
      "date": "2026-09-01",
      "close": 3380,
      "ihsg": 6600,
      "volume": 393505600
    },
    {
      "date": "2026-09-02",
      "close": 3390,
      "ihsg": 6596,
      "volume": 213369000
    },
    {
      "date": "2026-09-03",
      "close": 3410,
      "ihsg": 6668,
      "volume": 244707500
    },
    {
      "date": "2026-09-04",
      "close": 3390,
      "ihsg": 6636,
      "volume": 152173900
    },
    {
      "date": "2026-09-07",
      "close": 3370,
      "ihsg": 6620,
      "volume": 140651200
    },
    {
      "date": "2026-09-08",
      "close": 3410,
      "ihsg": 6686,
      "volume": 148330400
    },
    {
      "date": "2026-09-09",
      "close": 3420,
      "ihsg": 6678,
      "volume": 156865000
    },
    {
      "date": "2026-09-10",
      "close": 3320,
      "ihsg": 6589,
      "volume": 194894800
    },
    {
      "date": "2026-09-11",
      "close": 3270,
      "ihsg": 6541,
      "volume": 217303600
    },
    {
      "date": "2026-09-14",
      "close": 3400,
      "ihsg": 6535,
      "volume": 278495400
    },
    {
      "date": "2026-09-15",
      "close": 3320,
      "ihsg": 6461,
      "volume": 158042700
    },
    {
      "date": "2026-09-16",
      "close": 3330,
      "ihsg": 6437,
      "volume": 118364900
    },
    {
      "date": "2026-09-17",
      "close": 3330,
      "ihsg": 6462,
      "volume": 132493900
    },
    {
      "date": "2026-09-18",
      "close": 3310,
      "ihsg": 6441,
      "volume": 242737200
    },
    {
      "date": "2026-09-21",
      "close": 3300,
      "ihsg": 6385,
      "volume": 102594200
    },
    {
      "date": "2026-09-22",
      "close": 3180,
      "ihsg": 6277,
      "volume": 272879800
    },
    {
      "date": "2026-09-23",
      "close": 3190,
      "ihsg": 6375,
      "volume": 205953900
    },
    {
      "date": "2026-09-24",
      "close": 3140,
      "ihsg": 6299,
      "volume": 129218800
    },
    {
      "date": "2026-09-25",
      "close": 3150,
      "ihsg": 6242,
      "volume": 87244800
    },
    {
      "date": "2026-09-28",
      "close": 3140,
      "ihsg": 6148,
      "volume": 102848000
    }
  ],
  "BMRI": [
    {
      "date": "2026-08-03",
      "close": 4170,
      "ihsg": 6234,
      "volume": 76254300
    },
    {
      "date": "2026-08-04",
      "close": 4260,
      "ihsg": 6320,
      "volume": 121374800
    },
    {
      "date": "2026-08-05",
      "close": 4220,
      "ihsg": 6351,
      "volume": 122781400
    },
    {
      "date": "2026-08-06",
      "close": 4200,
      "ihsg": 6344,
      "volume": 95744300
    },
    {
      "date": "2026-08-07",
      "close": 4240,
      "ihsg": 6410,
      "volume": 110106100
    },
    {
      "date": "2026-08-10",
      "close": 4180,
      "ihsg": 6365,
      "volume": 148614700
    },
    {
      "date": "2026-08-11",
      "close": 4120,
      "ihsg": 6268,
      "volume": 148404100
    },
    {
      "date": "2026-08-12",
      "close": 4130,
      "ihsg": 6374,
      "volume": 153658300
    },
    {
      "date": "2026-08-13",
      "close": 4130,
      "ihsg": 6302,
      "volume": 108708200
    },
    {
      "date": "2026-08-14",
      "close": 4170,
      "ihsg": 6402,
      "volume": 75934800
    },
    {
      "date": "2026-08-18",
      "close": 4150,
      "ihsg": 6450,
      "volume": 116514200
    },
    {
      "date": "2026-08-19",
      "close": 4140,
      "ihsg": 6394,
      "volume": 79287200
    },
    {
      "date": "2026-08-20",
      "close": 4150,
      "ihsg": 6502,
      "volume": 74796300
    },
    {
      "date": "2026-08-21",
      "close": 4220,
      "ihsg": 6526,
      "volume": 142906200
    },
    {
      "date": "2026-08-24",
      "close": 4200,
      "ihsg": 6502,
      "volume": 86046100
    },
    {
      "date": "2026-08-26",
      "close": 4160,
      "ihsg": 6406,
      "volume": 156162500
    },
    {
      "date": "2026-08-27",
      "close": 4210,
      "ihsg": 6522,
      "volume": 66036800
    },
    {
      "date": "2026-08-28",
      "close": 4250,
      "ihsg": 6518,
      "volume": 111542000
    },
    {
      "date": "2026-08-31",
      "close": 4230,
      "ihsg": 6525,
      "volume": 231356300
    },
    {
      "date": "2026-09-01",
      "close": 4320,
      "ihsg": 6600,
      "volume": 191597900
    },
    {
      "date": "2026-09-02",
      "close": 4360,
      "ihsg": 6596,
      "volume": 140357100
    },
    {
      "date": "2026-09-03",
      "close": 4460,
      "ihsg": 6668,
      "volume": 234997200
    },
    {
      "date": "2026-09-04",
      "close": 4420,
      "ihsg": 6636,
      "volume": 95373200
    },
    {
      "date": "2026-09-07",
      "close": 4390,
      "ihsg": 6620,
      "volume": 94899700
    },
    {
      "date": "2026-09-08",
      "close": 4430,
      "ihsg": 6686,
      "volume": 91930900
    },
    {
      "date": "2026-09-09",
      "close": 4390,
      "ihsg": 6678,
      "volume": 125622500
    },
    {
      "date": "2026-09-10",
      "close": 4370,
      "ihsg": 6589,
      "volume": 132956900
    },
    {
      "date": "2026-09-11",
      "close": 4360,
      "ihsg": 6541,
      "volume": 126557800
    },
    {
      "date": "2026-09-14",
      "close": 4440,
      "ihsg": 6535,
      "volume": 229164500
    },
    {
      "date": "2026-09-15",
      "close": 4340,
      "ihsg": 6461,
      "volume": 128314600
    },
    {
      "date": "2026-09-16",
      "close": 4260,
      "ihsg": 6437,
      "volume": 140870900
    },
    {
      "date": "2026-09-17",
      "close": 4350,
      "ihsg": 6462,
      "volume": 110580900
    },
    {
      "date": "2026-09-18",
      "close": 4260,
      "ihsg": 6441,
      "volume": 186217000
    },
    {
      "date": "2026-09-21",
      "close": 4200,
      "ihsg": 6385,
      "volume": 74720000
    },
    {
      "date": "2026-09-22",
      "close": 4160,
      "ihsg": 6277,
      "volume": 123121600
    },
    {
      "date": "2026-09-23",
      "close": 4190,
      "ihsg": 6375,
      "volume": 88290300
    },
    {
      "date": "2026-09-24",
      "close": 4070,
      "ihsg": 6299,
      "volume": 182057400
    },
    {
      "date": "2026-09-25",
      "close": 4080,
      "ihsg": 6242,
      "volume": 70546200
    },
    {
      "date": "2026-09-28",
      "close": 4020,
      "ihsg": 6148,
      "volume": 124768400
    }
  ],
  "BUKA": [
    {
      "date": "2026-08-03",
      "close": 118,
      "ihsg": 6234,
      "volume": 95160900
    },
    {
      "date": "2026-08-04",
      "close": 120,
      "ihsg": 6320,
      "volume": 49917400
    },
    {
      "date": "2026-08-05",
      "close": 120,
      "ihsg": 6351,
      "volume": 219226100
    },
    {
      "date": "2026-08-06",
      "close": 118,
      "ihsg": 6344,
      "volume": 147682500
    },
    {
      "date": "2026-08-07",
      "close": 118,
      "ihsg": 6410,
      "volume": 57365400
    },
    {
      "date": "2026-08-10",
      "close": 117,
      "ihsg": 6365,
      "volume": 44875400
    },
    {
      "date": "2026-08-11",
      "close": 118,
      "ihsg": 6268,
      "volume": 109452900
    },
    {
      "date": "2026-08-12",
      "close": 118,
      "ihsg": 6374,
      "volume": 83259300
    },
    {
      "date": "2026-08-13",
      "close": 112,
      "ihsg": 6302,
      "volume": 218155800
    },
    {
      "date": "2026-08-14",
      "close": 115,
      "ihsg": 6402,
      "volume": 61442100
    },
    {
      "date": "2026-08-18",
      "close": 115,
      "ihsg": 6450,
      "volume": 54168500
    },
    {
      "date": "2026-08-19",
      "close": 115,
      "ihsg": 6394,
      "volume": 225152500
    },
    {
      "date": "2026-08-20",
      "close": 116,
      "ihsg": 6502,
      "volume": 181926000
    },
    {
      "date": "2026-08-21",
      "close": 114,
      "ihsg": 6526,
      "volume": 171081000
    },
    {
      "date": "2026-08-24",
      "close": 113,
      "ihsg": 6502,
      "volume": 143979000
    },
    {
      "date": "2026-08-26",
      "close": 107,
      "ihsg": 6406,
      "volume": 97757200
    },
    {
      "date": "2026-08-27",
      "close": 108,
      "ihsg": 6522,
      "volume": 98697200
    },
    {
      "date": "2026-08-28",
      "close": 105,
      "ihsg": 6518,
      "volume": 115363600
    },
    {
      "date": "2026-08-31",
      "close": 105,
      "ihsg": 6525,
      "volume": 1883828500
    },
    {
      "date": "2026-09-01",
      "close": 113,
      "ihsg": 6600,
      "volume": 370491200
    },
    {
      "date": "2026-09-02",
      "close": 112,
      "ihsg": 6596,
      "volume": 61961200
    },
    {
      "date": "2026-09-03",
      "close": 114,
      "ihsg": 6668,
      "volume": 159782900
    },
    {
      "date": "2026-09-04",
      "close": 115,
      "ihsg": 6636,
      "volume": 70638700
    },
    {
      "date": "2026-09-07",
      "close": 113,
      "ihsg": 6620,
      "volume": 60366200
    },
    {
      "date": "2026-09-08",
      "close": 114,
      "ihsg": 6686,
      "volume": 72375300
    },
    {
      "date": "2026-09-09",
      "close": 114,
      "ihsg": 6678,
      "volume": 217779500
    },
    {
      "date": "2026-09-10",
      "close": 109,
      "ihsg": 6589,
      "volume": 131772300
    },
    {
      "date": "2026-09-11",
      "close": 107,
      "ihsg": 6541,
      "volume": 84072700
    },
    {
      "date": "2026-09-14",
      "close": 107,
      "ihsg": 6535,
      "volume": 76321800
    },
    {
      "date": "2026-09-15",
      "close": 104,
      "ihsg": 6461,
      "volume": 92945700
    },
    {
      "date": "2026-09-16",
      "close": 103,
      "ihsg": 6437,
      "volume": 99710400
    },
    {
      "date": "2026-09-17",
      "close": 105,
      "ihsg": 6462,
      "volume": 74231700
    },
    {
      "date": "2026-09-18",
      "close": 104,
      "ihsg": 6441,
      "volume": 323025300
    },
    {
      "date": "2026-09-21",
      "close": 107,
      "ihsg": 6385,
      "volume": 62188600
    },
    {
      "date": "2026-09-22",
      "close": 106,
      "ihsg": 6277,
      "volume": 88056800
    },
    {
      "date": "2026-09-23",
      "close": 107,
      "ihsg": 6375,
      "volume": 27985000
    },
    {
      "date": "2026-09-24",
      "close": 105,
      "ihsg": 6299,
      "volume": 67805300
    },
    {
      "date": "2026-09-25",
      "close": 104,
      "ihsg": 6242,
      "volume": 52179400
    },
    {
      "date": "2026-09-28",
      "close": 103,
      "ihsg": 6148,
      "volume": 84635100
    }
  ],
  "EMTK": [
    {
      "date": "2026-08-03",
      "close": 520,
      "ihsg": 6234,
      "volume": 47286000
    },
    {
      "date": "2026-08-04",
      "close": 530,
      "ihsg": 6320,
      "volume": 60098100
    },
    {
      "date": "2026-08-05",
      "close": 530,
      "ihsg": 6351,
      "volume": 40154800
    },
    {
      "date": "2026-08-06",
      "close": 530,
      "ihsg": 6344,
      "volume": 62962600
    },
    {
      "date": "2026-08-07",
      "close": 530,
      "ihsg": 6410,
      "volume": 44167700
    },
    {
      "date": "2026-08-10",
      "close": 515,
      "ihsg": 6365,
      "volume": 75023600
    },
    {
      "date": "2026-08-11",
      "close": 505,
      "ihsg": 6268,
      "volume": 43027300
    },
    {
      "date": "2026-08-12",
      "close": 510,
      "ihsg": 6374,
      "volume": 24974500
    },
    {
      "date": "2026-08-13",
      "close": 500,
      "ihsg": 6302,
      "volume": 35640900
    },
    {
      "date": "2026-08-14",
      "close": 505,
      "ihsg": 6402,
      "volume": 40820200
    },
    {
      "date": "2026-08-18",
      "close": 520,
      "ihsg": 6450,
      "volume": 21840400
    },
    {
      "date": "2026-08-19",
      "close": 525,
      "ihsg": 6394,
      "volume": 68442100
    },
    {
      "date": "2026-08-20",
      "close": 550,
      "ihsg": 6502,
      "volume": 82409400
    },
    {
      "date": "2026-08-21",
      "close": 540,
      "ihsg": 6526,
      "volume": 47671000
    },
    {
      "date": "2026-08-24",
      "close": 525,
      "ihsg": 6502,
      "volume": 31003900
    },
    {
      "date": "2026-08-26",
      "close": 500,
      "ihsg": 6406,
      "volume": 61787200
    },
    {
      "date": "2026-08-27",
      "close": 510,
      "ihsg": 6522,
      "volume": 39160700
    },
    {
      "date": "2026-08-28",
      "close": 515,
      "ihsg": 6518,
      "volume": 33662700
    },
    {
      "date": "2026-08-31",
      "close": 515,
      "ihsg": 6525,
      "volume": 49869400
    },
    {
      "date": "2026-09-01",
      "close": 535,
      "ihsg": 6600,
      "volume": 52530400
    },
    {
      "date": "2026-09-02",
      "close": 520,
      "ihsg": 6596,
      "volume": 50870200
    },
    {
      "date": "2026-09-03",
      "close": 535,
      "ihsg": 6668,
      "volume": 47833500
    },
    {
      "date": "2026-09-04",
      "close": 515,
      "ihsg": 6636,
      "volume": 34794900
    },
    {
      "date": "2026-09-07",
      "close": 510,
      "ihsg": 6620,
      "volume": 43367600
    },
    {
      "date": "2026-09-08",
      "close": 520,
      "ihsg": 6686,
      "volume": 26460300
    },
    {
      "date": "2026-09-09",
      "close": 515,
      "ihsg": 6678,
      "volume": 31399400
    },
    {
      "date": "2026-09-10",
      "close": 500,
      "ihsg": 6589,
      "volume": 27456800
    },
    {
      "date": "2026-09-11",
      "close": 500,
      "ihsg": 6541,
      "volume": 52096800
    },
    {
      "date": "2026-09-14",
      "close": 496,
      "ihsg": 6535,
      "volume": 45695500
    },
    {
      "date": "2026-09-15",
      "close": 492,
      "ihsg": 6461,
      "volume": 21766400
    },
    {
      "date": "2026-09-16",
      "close": 484,
      "ihsg": 6437,
      "volume": 24777600
    },
    {
      "date": "2026-09-17",
      "close": 494,
      "ihsg": 6462,
      "volume": 26492000
    },
    {
      "date": "2026-09-18",
      "close": 468,
      "ihsg": 6441,
      "volume": 86712000
    },
    {
      "date": "2026-09-21",
      "close": 464,
      "ihsg": 6385,
      "volume": 29043500
    },
    {
      "date": "2026-09-22",
      "close": 448,
      "ihsg": 6277,
      "volume": 50666700
    },
    {
      "date": "2026-09-23",
      "close": 446,
      "ihsg": 6375,
      "volume": 43447900
    },
    {
      "date": "2026-09-24",
      "close": 430,
      "ihsg": 6299,
      "volume": 53465200
    },
    {
      "date": "2026-09-25",
      "close": 420,
      "ihsg": 6242,
      "volume": 27548200
    },
    {
      "date": "2026-09-28",
      "close": 408,
      "ihsg": 6148,
      "volume": 34360900
    }
  ],
  "EXCL": [
    {
      "date": "2026-08-03",
      "close": 2530,
      "ihsg": 6234,
      "volume": 8010900
    },
    {
      "date": "2026-08-04",
      "close": 2510,
      "ihsg": 6320,
      "volume": 1918700
    },
    {
      "date": "2026-08-05",
      "close": 2560,
      "ihsg": 6351,
      "volume": 4775600
    },
    {
      "date": "2026-08-06",
      "close": 2500,
      "ihsg": 6344,
      "volume": 6373600
    },
    {
      "date": "2026-08-07",
      "close": 2550,
      "ihsg": 6410,
      "volume": 4237400
    },
    {
      "date": "2026-08-10",
      "close": 2500,
      "ihsg": 6365,
      "volume": 3968100
    },
    {
      "date": "2026-08-11",
      "close": 2410,
      "ihsg": 6268,
      "volume": 8128800
    },
    {
      "date": "2026-08-12",
      "close": 2560,
      "ihsg": 6374,
      "volume": 26942600
    },
    {
      "date": "2026-08-13",
      "close": 2630,
      "ihsg": 6302,
      "volume": 13349800
    },
    {
      "date": "2026-08-14",
      "close": 2800,
      "ihsg": 6402,
      "volume": 19243500
    },
    {
      "date": "2026-08-18",
      "close": 2910,
      "ihsg": 6450,
      "volume": 10371800
    },
    {
      "date": "2026-08-19",
      "close": 2860,
      "ihsg": 6394,
      "volume": 10094800
    },
    {
      "date": "2026-08-20",
      "close": 2830,
      "ihsg": 6502,
      "volume": 5310100
    },
    {
      "date": "2026-08-21",
      "close": 2840,
      "ihsg": 6526,
      "volume": 3456700
    },
    {
      "date": "2026-08-24",
      "close": 2700,
      "ihsg": 6502,
      "volume": 10104100
    },
    {
      "date": "2026-08-26",
      "close": 2700,
      "ihsg": 6406,
      "volume": 5159000
    },
    {
      "date": "2026-08-27",
      "close": 2770,
      "ihsg": 6522,
      "volume": 4733500
    },
    {
      "date": "2026-08-28",
      "close": 2770,
      "ihsg": 6518,
      "volume": 5397800
    },
    {
      "date": "2026-08-31",
      "close": 2820,
      "ihsg": 6525,
      "volume": 9277600
    },
    {
      "date": "2026-09-01",
      "close": 2770,
      "ihsg": 6600,
      "volume": 4177500
    },
    {
      "date": "2026-09-02",
      "close": 2710,
      "ihsg": 6596,
      "volume": 4987800
    },
    {
      "date": "2026-09-03",
      "close": 2740,
      "ihsg": 6668,
      "volume": 4344100
    },
    {
      "date": "2026-09-04",
      "close": 2710,
      "ihsg": 6636,
      "volume": 6732000
    },
    {
      "date": "2026-09-07",
      "close": 2710,
      "ihsg": 6620,
      "volume": 1682300
    },
    {
      "date": "2026-09-08",
      "close": 2740,
      "ihsg": 6686,
      "volume": 3136500
    },
    {
      "date": "2026-09-09",
      "close": 2730,
      "ihsg": 6678,
      "volume": 6836800
    },
    {
      "date": "2026-09-10",
      "close": 2700,
      "ihsg": 6589,
      "volume": 9761700
    },
    {
      "date": "2026-09-11",
      "close": 2630,
      "ihsg": 6541,
      "volume": 6844300
    },
    {
      "date": "2026-09-14",
      "close": 2550,
      "ihsg": 6535,
      "volume": 7008000
    },
    {
      "date": "2026-09-15",
      "close": 2550,
      "ihsg": 6461,
      "volume": 3888900
    },
    {
      "date": "2026-09-16",
      "close": 2540,
      "ihsg": 6437,
      "volume": 5181800
    },
    {
      "date": "2026-09-17",
      "close": 2580,
      "ihsg": 6462,
      "volume": 3041600
    },
    {
      "date": "2026-09-18",
      "close": 2500,
      "ihsg": 6441,
      "volume": 36585900
    },
    {
      "date": "2026-09-21",
      "close": 2420,
      "ihsg": 6385,
      "volume": 7498000
    },
    {
      "date": "2026-09-22",
      "close": 2410,
      "ihsg": 6277,
      "volume": 8627100
    },
    {
      "date": "2026-09-23",
      "close": 2440,
      "ihsg": 6375,
      "volume": 5719700
    },
    {
      "date": "2026-09-24",
      "close": 2400,
      "ihsg": 6299,
      "volume": 4743700
    },
    {
      "date": "2026-09-25",
      "close": 2330,
      "ihsg": 6242,
      "volume": 5560500
    },
    {
      "date": "2026-09-28",
      "close": 2310,
      "ihsg": 6148,
      "volume": 8445800
    }
  ],
  "GOTO": [
    {
      "date": "2026-08-03",
      "close": 50,
      "ihsg": 6234,
      "volume": 46756100
    },
    {
      "date": "2026-08-04",
      "close": 50,
      "ihsg": 6320,
      "volume": 46203700
    },
    {
      "date": "2026-08-05",
      "close": 50,
      "ihsg": 6351,
      "volume": 123652900
    },
    {
      "date": "2026-08-06",
      "close": 50,
      "ihsg": 6344,
      "volume": 35469600
    },
    {
      "date": "2026-08-07",
      "close": 50,
      "ihsg": 6410,
      "volume": 46708900
    },
    {
      "date": "2026-08-10",
      "close": 50,
      "ihsg": 6365,
      "volume": 47265600
    },
    {
      "date": "2026-08-11",
      "close": 50,
      "ihsg": 6268,
      "volume": 19202500
    },
    {
      "date": "2026-08-12",
      "close": 50,
      "ihsg": 6374,
      "volume": 22086800
    },
    {
      "date": "2026-08-13",
      "close": 50,
      "ihsg": 6302,
      "volume": 19638700
    },
    {
      "date": "2026-08-14",
      "close": 50,
      "ihsg": 6402,
      "volume": 9945800
    },
    {
      "date": "2026-08-18",
      "close": 50,
      "ihsg": 6450,
      "volume": 37192200
    },
    {
      "date": "2026-08-19",
      "close": 50,
      "ihsg": 6394,
      "volume": 10585100
    },
    {
      "date": "2026-08-20",
      "close": 50,
      "ihsg": 6502,
      "volume": 10633300
    },
    {
      "date": "2026-08-21",
      "close": 50,
      "ihsg": 6526,
      "volume": 9191000
    },
    {
      "date": "2026-08-24",
      "close": 50,
      "ihsg": 6502,
      "volume": 7613300
    },
    {
      "date": "2026-08-26",
      "close": 50,
      "ihsg": 6406,
      "volume": 4339200
    },
    {
      "date": "2026-08-27",
      "close": 50,
      "ihsg": 6522,
      "volume": 15706300
    },
    {
      "date": "2026-08-28",
      "close": 50,
      "ihsg": 6518,
      "volume": 15212100
    },
    {
      "date": "2026-08-31",
      "close": 50,
      "ihsg": 6525,
      "volume": 38022700
    },
    {
      "date": "2026-09-01",
      "close": 50,
      "ihsg": 6600,
      "volume": 6719800
    },
    {
      "date": "2026-09-02",
      "close": 50,
      "ihsg": 6596,
      "volume": 6195700
    },
    {
      "date": "2026-09-03",
      "close": 50,
      "ihsg": 6668,
      "volume": 8362700
    },
    {
      "date": "2026-09-04",
      "close": 50,
      "ihsg": 6636,
      "volume": 9459600
    },
    {
      "date": "2026-09-07",
      "close": 50,
      "ihsg": 6620,
      "volume": 33487700
    },
    {
      "date": "2026-09-08",
      "close": 50,
      "ihsg": 6686,
      "volume": 9295200
    },
    {
      "date": "2026-09-09",
      "close": 50,
      "ihsg": 6678,
      "volume": 16866200
    },
    {
      "date": "2026-09-10",
      "close": 50,
      "ihsg": 6589,
      "volume": 13698200
    },
    {
      "date": "2026-09-11",
      "close": 50,
      "ihsg": 6541,
      "volume": 3016900
    },
    {
      "date": "2026-09-14",
      "close": 50,
      "ihsg": 6535,
      "volume": 13598500
    },
    {
      "date": "2026-09-15",
      "close": 50,
      "ihsg": 6461,
      "volume": 4653300
    },
    {
      "date": "2026-09-16",
      "close": 50,
      "ihsg": 6437,
      "volume": 5406900
    },
    {
      "date": "2026-09-17",
      "close": 50,
      "ihsg": 6462,
      "volume": 2010100
    },
    {
      "date": "2026-09-18",
      "close": 50,
      "ihsg": 6441,
      "volume": 8861600
    },
    {
      "date": "2026-09-21",
      "close": 50,
      "ihsg": 6385,
      "volume": 30011000
    },
    {
      "date": "2026-09-22",
      "close": 50,
      "ihsg": 6277,
      "volume": 9191200
    },
    {
      "date": "2026-09-23",
      "close": 50,
      "ihsg": 6375,
      "volume": 4253400
    },
    {
      "date": "2026-09-24",
      "close": 50,
      "ihsg": 6299,
      "volume": 3472900
    },
    {
      "date": "2026-09-25",
      "close": 50,
      "ihsg": 6242,
      "volume": 4406200
    },
    {
      "date": "2026-09-28",
      "close": 43,
      "ihsg": 6148,
      "volume": 132941200
    }
  ],
  "ICBP": [
    {
      "date": "2026-08-03",
      "close": 7200,
      "ihsg": 6234,
      "volume": 6342500
    },
    {
      "date": "2026-08-04",
      "close": 7175,
      "ihsg": 6320,
      "volume": 3618500
    },
    {
      "date": "2026-08-05",
      "close": 7300,
      "ihsg": 6351,
      "volume": 5071600
    },
    {
      "date": "2026-08-06",
      "close": 7450,
      "ihsg": 6344,
      "volume": 6652200
    },
    {
      "date": "2026-08-07",
      "close": 7750,
      "ihsg": 6410,
      "volume": 10181700
    },
    {
      "date": "2026-08-10",
      "close": 7600,
      "ihsg": 6365,
      "volume": 6810700
    },
    {
      "date": "2026-08-11",
      "close": 7575,
      "ihsg": 6268,
      "volume": 2946500
    },
    {
      "date": "2026-08-12",
      "close": 7550,
      "ihsg": 6374,
      "volume": 2882200
    },
    {
      "date": "2026-08-13",
      "close": 7550,
      "ihsg": 6302,
      "volume": 3348500
    },
    {
      "date": "2026-08-14",
      "close": 7600,
      "ihsg": 6402,
      "volume": 3782100
    },
    {
      "date": "2026-08-18",
      "close": 7625,
      "ihsg": 6450,
      "volume": 3579400
    },
    {
      "date": "2026-08-19",
      "close": 7675,
      "ihsg": 6394,
      "volume": 2160100
    },
    {
      "date": "2026-08-20",
      "close": 7700,
      "ihsg": 6502,
      "volume": 3523100
    },
    {
      "date": "2026-08-21",
      "close": 7625,
      "ihsg": 6526,
      "volume": 2480400
    },
    {
      "date": "2026-08-24",
      "close": 7750,
      "ihsg": 6502,
      "volume": 3562400
    },
    {
      "date": "2026-08-26",
      "close": 7850,
      "ihsg": 6406,
      "volume": 10588000
    },
    {
      "date": "2026-08-27",
      "close": 7950,
      "ihsg": 6522,
      "volume": 7535100
    },
    {
      "date": "2026-08-28",
      "close": 7950,
      "ihsg": 6518,
      "volume": 3700600
    },
    {
      "date": "2026-08-31",
      "close": 7600,
      "ihsg": 6525,
      "volume": 11298400
    },
    {
      "date": "2026-09-01",
      "close": 7375,
      "ihsg": 6600,
      "volume": 8792900
    },
    {
      "date": "2026-09-02",
      "close": 7375,
      "ihsg": 6596,
      "volume": 7088900
    },
    {
      "date": "2026-09-03",
      "close": 7375,
      "ihsg": 6668,
      "volume": 5230500
    },
    {
      "date": "2026-09-04",
      "close": 7275,
      "ihsg": 6636,
      "volume": 6086500
    },
    {
      "date": "2026-09-07",
      "close": 7250,
      "ihsg": 6620,
      "volume": 6982400
    },
    {
      "date": "2026-09-08",
      "close": 7200,
      "ihsg": 6686,
      "volume": 10089400
    },
    {
      "date": "2026-09-09",
      "close": 7200,
      "ihsg": 6678,
      "volume": 7180200
    },
    {
      "date": "2026-09-10",
      "close": 7175,
      "ihsg": 6589,
      "volume": 3613500
    },
    {
      "date": "2026-09-11",
      "close": 7125,
      "ihsg": 6541,
      "volume": 2205300
    },
    {
      "date": "2026-09-14",
      "close": 7125,
      "ihsg": 6535,
      "volume": 3026600
    },
    {
      "date": "2026-09-15",
      "close": 6900,
      "ihsg": 6461,
      "volume": 10118100
    },
    {
      "date": "2026-09-16",
      "close": 7025,
      "ihsg": 6437,
      "volume": 3961900
    },
    {
      "date": "2026-09-17",
      "close": 6950,
      "ihsg": 6462,
      "volume": 2555300
    },
    {
      "date": "2026-09-18",
      "close": 6900,
      "ihsg": 6441,
      "volume": 7167000
    },
    {
      "date": "2026-09-21",
      "close": 6800,
      "ihsg": 6385,
      "volume": 3673700
    },
    {
      "date": "2026-09-22",
      "close": 6650,
      "ihsg": 6277,
      "volume": 5892900
    },
    {
      "date": "2026-09-23",
      "close": 6875,
      "ihsg": 6375,
      "volume": 5701800
    },
    {
      "date": "2026-09-24",
      "close": 6975,
      "ihsg": 6299,
      "volume": 4221800
    },
    {
      "date": "2026-09-25",
      "close": 6650,
      "ihsg": 6242,
      "volume": 4281100
    },
    {
      "date": "2026-09-28",
      "close": 6650,
      "ihsg": 6148,
      "volume": 3636400
    }
  ],
  "INCO": [
    {
      "date": "2026-08-03",
      "close": 5200,
      "ihsg": 6234,
      "volume": 10413200
    },
    {
      "date": "2026-08-04",
      "close": 5500,
      "ihsg": 6320,
      "volume": 15610600
    },
    {
      "date": "2026-08-05",
      "close": 5425,
      "ihsg": 6351,
      "volume": 14375900
    },
    {
      "date": "2026-08-06",
      "close": 5450,
      "ihsg": 6344,
      "volume": 11906100
    },
    {
      "date": "2026-08-07",
      "close": 5400,
      "ihsg": 6410,
      "volume": 10034800
    },
    {
      "date": "2026-08-10",
      "close": 5375,
      "ihsg": 6365,
      "volume": 8312200
    },
    {
      "date": "2026-08-11",
      "close": 5250,
      "ihsg": 6268,
      "volume": 12177500
    },
    {
      "date": "2026-08-12",
      "close": 5275,
      "ihsg": 6374,
      "volume": 6177900
    },
    {
      "date": "2026-08-13",
      "close": 5000,
      "ihsg": 6302,
      "volume": 11001400
    },
    {
      "date": "2026-08-14",
      "close": 5225,
      "ihsg": 6402,
      "volume": 13555800
    },
    {
      "date": "2026-08-18",
      "close": 5250,
      "ihsg": 6450,
      "volume": 4830900
    },
    {
      "date": "2026-08-19",
      "close": 5075,
      "ihsg": 6394,
      "volume": 10367400
    },
    {
      "date": "2026-08-20",
      "close": 5250,
      "ihsg": 6502,
      "volume": 12527000
    },
    {
      "date": "2026-08-21",
      "close": 5200,
      "ihsg": 6526,
      "volume": 9881100
    },
    {
      "date": "2026-08-24",
      "close": 5275,
      "ihsg": 6502,
      "volume": 9759400
    },
    {
      "date": "2026-08-26",
      "close": 5200,
      "ihsg": 6406,
      "volume": 15526000
    },
    {
      "date": "2026-08-27",
      "close": 5300,
      "ihsg": 6522,
      "volume": 4128900
    },
    {
      "date": "2026-08-28",
      "close": 5225,
      "ihsg": 6518,
      "volume": 6132000
    },
    {
      "date": "2026-08-31",
      "close": 5250,
      "ihsg": 6525,
      "volume": 4992400
    },
    {
      "date": "2026-09-01",
      "close": 5050,
      "ihsg": 6600,
      "volume": 15195100
    },
    {
      "date": "2026-09-02",
      "close": 4820,
      "ihsg": 6596,
      "volume": 36733300
    },
    {
      "date": "2026-09-03",
      "close": 4950,
      "ihsg": 6668,
      "volume": 13681700
    },
    {
      "date": "2026-09-04",
      "close": 4960,
      "ihsg": 6636,
      "volume": 8636800
    },
    {
      "date": "2026-09-07",
      "close": 4860,
      "ihsg": 6620,
      "volume": 13840300
    },
    {
      "date": "2026-09-08",
      "close": 4900,
      "ihsg": 6686,
      "volume": 14380900
    },
    {
      "date": "2026-09-09",
      "close": 4900,
      "ihsg": 6678,
      "volume": 19011200
    },
    {
      "date": "2026-09-10",
      "close": 4820,
      "ihsg": 6589,
      "volume": 19964900
    },
    {
      "date": "2026-09-11",
      "close": 4830,
      "ihsg": 6541,
      "volume": 19973900
    },
    {
      "date": "2026-09-14",
      "close": 4690,
      "ihsg": 6535,
      "volume": 21621900
    },
    {
      "date": "2026-09-15",
      "close": 4640,
      "ihsg": 6461,
      "volume": 12017400
    },
    {
      "date": "2026-09-16",
      "close": 4830,
      "ihsg": 6437,
      "volume": 33992100
    },
    {
      "date": "2026-09-17",
      "close": 4680,
      "ihsg": 6462,
      "volume": 22491400
    },
    {
      "date": "2026-09-18",
      "close": 4860,
      "ihsg": 6441,
      "volume": 22307800
    },
    {
      "date": "2026-09-21",
      "close": 4760,
      "ihsg": 6385,
      "volume": 10172800
    },
    {
      "date": "2026-09-22",
      "close": 4680,
      "ihsg": 6277,
      "volume": 12774900
    },
    {
      "date": "2026-09-23",
      "close": 4790,
      "ihsg": 6375,
      "volume": 12982700
    },
    {
      "date": "2026-09-24",
      "close": 4720,
      "ihsg": 6299,
      "volume": 11688800
    },
    {
      "date": "2026-09-25",
      "close": 4680,
      "ihsg": 6242,
      "volume": 5911900
    },
    {
      "date": "2026-09-28",
      "close": 4400,
      "ihsg": 6148,
      "volume": 20109500
    }
  ],
  "JSMR": [
    {
      "date": "2026-08-03",
      "close": 2770,
      "ihsg": 6234,
      "volume": 4380700
    },
    {
      "date": "2026-08-04",
      "close": 2760,
      "ihsg": 6320,
      "volume": 1022100
    },
    {
      "date": "2026-08-05",
      "close": 2800,
      "ihsg": 6351,
      "volume": 3511500
    },
    {
      "date": "2026-08-06",
      "close": 2750,
      "ihsg": 6344,
      "volume": 2581900
    },
    {
      "date": "2026-08-07",
      "close": 2790,
      "ihsg": 6410,
      "volume": 1889000
    },
    {
      "date": "2026-08-10",
      "close": 2770,
      "ihsg": 6365,
      "volume": 1940800
    },
    {
      "date": "2026-08-11",
      "close": 2740,
      "ihsg": 6268,
      "volume": 3589400
    },
    {
      "date": "2026-08-12",
      "close": 2760,
      "ihsg": 6374,
      "volume": 1785800
    },
    {
      "date": "2026-08-13",
      "close": 2740,
      "ihsg": 6302,
      "volume": 2496200
    },
    {
      "date": "2026-08-14",
      "close": 2730,
      "ihsg": 6402,
      "volume": 500100
    },
    {
      "date": "2026-08-18",
      "close": 2760,
      "ihsg": 6450,
      "volume": 1694300
    },
    {
      "date": "2026-08-19",
      "close": 2770,
      "ihsg": 6394,
      "volume": 3266000
    },
    {
      "date": "2026-08-20",
      "close": 2790,
      "ihsg": 6502,
      "volume": 1664900
    },
    {
      "date": "2026-08-21",
      "close": 2790,
      "ihsg": 6526,
      "volume": 2036200
    },
    {
      "date": "2026-08-24",
      "close": 2760,
      "ihsg": 6502,
      "volume": 2658000
    },
    {
      "date": "2026-08-26",
      "close": 2740,
      "ihsg": 6406,
      "volume": 1938400
    },
    {
      "date": "2026-08-27",
      "close": 2810,
      "ihsg": 6522,
      "volume": 2577700
    },
    {
      "date": "2026-08-28",
      "close": 2830,
      "ihsg": 6518,
      "volume": 3018200
    },
    {
      "date": "2026-08-31",
      "close": 2960,
      "ihsg": 6525,
      "volume": 8253900
    },
    {
      "date": "2026-09-01",
      "close": 2970,
      "ihsg": 6600,
      "volume": 4812900
    },
    {
      "date": "2026-09-02",
      "close": 2970,
      "ihsg": 6596,
      "volume": 3396800
    },
    {
      "date": "2026-09-03",
      "close": 3040,
      "ihsg": 6668,
      "volume": 3400200
    },
    {
      "date": "2026-09-04",
      "close": 2990,
      "ihsg": 6636,
      "volume": 3606300
    },
    {
      "date": "2026-09-07",
      "close": 2960,
      "ihsg": 6620,
      "volume": 1584000
    },
    {
      "date": "2026-09-08",
      "close": 3010,
      "ihsg": 6686,
      "volume": 1335500
    },
    {
      "date": "2026-09-09",
      "close": 3010,
      "ihsg": 6678,
      "volume": 1836300
    },
    {
      "date": "2026-09-10",
      "close": 2990,
      "ihsg": 6589,
      "volume": 1606200
    },
    {
      "date": "2026-09-11",
      "close": 2950,
      "ihsg": 6541,
      "volume": 1789500
    },
    {
      "date": "2026-09-14",
      "close": 2920,
      "ihsg": 6535,
      "volume": 2642700
    },
    {
      "date": "2026-09-15",
      "close": 2870,
      "ihsg": 6461,
      "volume": 3951700
    },
    {
      "date": "2026-09-16",
      "close": 2840,
      "ihsg": 6437,
      "volume": 3676100
    },
    {
      "date": "2026-09-17",
      "close": 2850,
      "ihsg": 6462,
      "volume": 4049000
    },
    {
      "date": "2026-09-18",
      "close": 2880,
      "ihsg": 6441,
      "volume": 7994700
    },
    {
      "date": "2026-09-21",
      "close": 2800,
      "ihsg": 6385,
      "volume": 3213700
    },
    {
      "date": "2026-09-22",
      "close": 2770,
      "ihsg": 6277,
      "volume": 2707400
    },
    {
      "date": "2026-09-23",
      "close": 2800,
      "ihsg": 6375,
      "volume": 1279700
    },
    {
      "date": "2026-09-24",
      "close": 2730,
      "ihsg": 6299,
      "volume": 1677700
    },
    {
      "date": "2026-09-25",
      "close": 2720,
      "ihsg": 6242,
      "volume": 755000
    },
    {
      "date": "2026-09-28",
      "close": 2690,
      "ihsg": 6148,
      "volume": 1519600
    }
  ],
  "MYOR": [
    {
      "date": "2026-08-03",
      "close": 1660,
      "ihsg": 6234,
      "volume": 9756600
    },
    {
      "date": "2026-08-04",
      "close": 1685,
      "ihsg": 6320,
      "volume": 6070500
    },
    {
      "date": "2026-08-05",
      "close": 1675,
      "ihsg": 6351,
      "volume": 19334500
    },
    {
      "date": "2026-08-06",
      "close": 1675,
      "ihsg": 6344,
      "volume": 8115700
    },
    {
      "date": "2026-08-07",
      "close": 1695,
      "ihsg": 6410,
      "volume": 5053700
    },
    {
      "date": "2026-08-10",
      "close": 1710,
      "ihsg": 6365,
      "volume": 12615100
    },
    {
      "date": "2026-08-11",
      "close": 1680,
      "ihsg": 6268,
      "volume": 11039800
    },
    {
      "date": "2026-08-12",
      "close": 1665,
      "ihsg": 6374,
      "volume": 10215600
    },
    {
      "date": "2026-08-13",
      "close": 1665,
      "ihsg": 6302,
      "volume": 3246600
    },
    {
      "date": "2026-08-14",
      "close": 1675,
      "ihsg": 6402,
      "volume": 3286200
    },
    {
      "date": "2026-08-18",
      "close": 1675,
      "ihsg": 6450,
      "volume": 6831100
    },
    {
      "date": "2026-08-19",
      "close": 1650,
      "ihsg": 6394,
      "volume": 8964000
    },
    {
      "date": "2026-08-20",
      "close": 1685,
      "ihsg": 6502,
      "volume": 2214800
    },
    {
      "date": "2026-08-21",
      "close": 1675,
      "ihsg": 6526,
      "volume": 7559800
    },
    {
      "date": "2026-08-24",
      "close": 1620,
      "ihsg": 6502,
      "volume": 22326700
    },
    {
      "date": "2026-08-26",
      "close": 1600,
      "ihsg": 6406,
      "volume": 11782900
    },
    {
      "date": "2026-08-27",
      "close": 1600,
      "ihsg": 6522,
      "volume": 11512000
    },
    {
      "date": "2026-08-28",
      "close": 1590,
      "ihsg": 6518,
      "volume": 24193500
    },
    {
      "date": "2026-08-31",
      "close": 1550,
      "ihsg": 6525,
      "volume": 36463100
    },
    {
      "date": "2026-09-01",
      "close": 1565,
      "ihsg": 6600,
      "volume": 32716000
    },
    {
      "date": "2026-09-02",
      "close": 1555,
      "ihsg": 6596,
      "volume": 22632500
    },
    {
      "date": "2026-09-03",
      "close": 1575,
      "ihsg": 6668,
      "volume": 20653900
    },
    {
      "date": "2026-09-04",
      "close": 1560,
      "ihsg": 6636,
      "volume": 26832800
    },
    {
      "date": "2026-09-07",
      "close": 1530,
      "ihsg": 6620,
      "volume": 23091800
    },
    {
      "date": "2026-09-08",
      "close": 1540,
      "ihsg": 6686,
      "volume": 25355500
    },
    {
      "date": "2026-09-09",
      "close": 1525,
      "ihsg": 6678,
      "volume": 15151000
    },
    {
      "date": "2026-09-10",
      "close": 1530,
      "ihsg": 6589,
      "volume": 17569100
    },
    {
      "date": "2026-09-11",
      "close": 1515,
      "ihsg": 6541,
      "volume": 23467100
    },
    {
      "date": "2026-09-14",
      "close": 1500,
      "ihsg": 6535,
      "volume": 16480200
    },
    {
      "date": "2026-09-15",
      "close": 1495,
      "ihsg": 6461,
      "volume": 11332400
    },
    {
      "date": "2026-09-16",
      "close": 1490,
      "ihsg": 6437,
      "volume": 10223800
    },
    {
      "date": "2026-09-17",
      "close": 1515,
      "ihsg": 6462,
      "volume": 9217000
    },
    {
      "date": "2026-09-18",
      "close": 1505,
      "ihsg": 6441,
      "volume": 40176600
    },
    {
      "date": "2026-09-21",
      "close": 1510,
      "ihsg": 6385,
      "volume": 7968600
    },
    {
      "date": "2026-09-22",
      "close": 1485,
      "ihsg": 6277,
      "volume": 12431100
    },
    {
      "date": "2026-09-23",
      "close": 1500,
      "ihsg": 6375,
      "volume": 9185500
    },
    {
      "date": "2026-09-24",
      "close": 1450,
      "ihsg": 6299,
      "volume": 15658000
    },
    {
      "date": "2026-09-25",
      "close": 1435,
      "ihsg": 6242,
      "volume": 8382200
    },
    {
      "date": "2026-09-28",
      "close": 1405,
      "ihsg": 6148,
      "volume": 8624800
    }
  ],
  "PGAS": [
    {
      "date": "2026-08-03",
      "close": 1510,
      "ihsg": 6234,
      "volume": 15393200
    },
    {
      "date": "2026-08-04",
      "close": 1515,
      "ihsg": 6320,
      "volume": 28199400
    },
    {
      "date": "2026-08-05",
      "close": 1505,
      "ihsg": 6351,
      "volume": 17831200
    },
    {
      "date": "2026-08-06",
      "close": 1505,
      "ihsg": 6344,
      "volume": 28221800
    },
    {
      "date": "2026-08-07",
      "close": 1510,
      "ihsg": 6410,
      "volume": 17980000
    },
    {
      "date": "2026-08-10",
      "close": 1510,
      "ihsg": 6365,
      "volume": 20588100
    },
    {
      "date": "2026-08-11",
      "close": 1490,
      "ihsg": 6268,
      "volume": 29821300
    },
    {
      "date": "2026-08-12",
      "close": 1485,
      "ihsg": 6374,
      "volume": 26112600
    },
    {
      "date": "2026-08-13",
      "close": 1475,
      "ihsg": 6302,
      "volume": 25697600
    },
    {
      "date": "2026-08-14",
      "close": 1495,
      "ihsg": 6402,
      "volume": 17773500
    },
    {
      "date": "2026-08-18",
      "close": 1515,
      "ihsg": 6450,
      "volume": 32365400
    },
    {
      "date": "2026-08-19",
      "close": 1505,
      "ihsg": 6394,
      "volume": 14895400
    },
    {
      "date": "2026-08-20",
      "close": 1525,
      "ihsg": 6502,
      "volume": 27450600
    },
    {
      "date": "2026-08-21",
      "close": 1520,
      "ihsg": 6526,
      "volume": 18956900
    },
    {
      "date": "2026-08-24",
      "close": 1540,
      "ihsg": 6502,
      "volume": 36377100
    },
    {
      "date": "2026-08-26",
      "close": 1520,
      "ihsg": 6406,
      "volume": 52147400
    },
    {
      "date": "2026-08-27",
      "close": 1535,
      "ihsg": 6522,
      "volume": 26339500
    },
    {
      "date": "2026-08-28",
      "close": 1510,
      "ihsg": 6518,
      "volume": 57344100
    },
    {
      "date": "2026-08-31",
      "close": 1530,
      "ihsg": 6525,
      "volume": 37894200
    },
    {
      "date": "2026-09-01",
      "close": 1555,
      "ihsg": 6600,
      "volume": 48408200
    },
    {
      "date": "2026-09-02",
      "close": 1535,
      "ihsg": 6596,
      "volume": 24552900
    },
    {
      "date": "2026-09-03",
      "close": 1540,
      "ihsg": 6668,
      "volume": 67582000
    },
    {
      "date": "2026-09-04",
      "close": 1520,
      "ihsg": 6636,
      "volume": 25218600
    },
    {
      "date": "2026-09-07",
      "close": 1520,
      "ihsg": 6620,
      "volume": 28201200
    },
    {
      "date": "2026-09-08",
      "close": 1540,
      "ihsg": 6686,
      "volume": 29486400
    },
    {
      "date": "2026-09-09",
      "close": 1545,
      "ihsg": 6678,
      "volume": 21931600
    },
    {
      "date": "2026-09-10",
      "close": 1515,
      "ihsg": 6589,
      "volume": 40942100
    },
    {
      "date": "2026-09-11",
      "close": 1520,
      "ihsg": 6541,
      "volume": 24755500
    },
    {
      "date": "2026-09-14",
      "close": 1550,
      "ihsg": 6535,
      "volume": 43793600
    },
    {
      "date": "2026-09-15",
      "close": 1530,
      "ihsg": 6461,
      "volume": 25470500
    },
    {
      "date": "2026-09-16",
      "close": 1520,
      "ihsg": 6437,
      "volume": 46415400
    },
    {
      "date": "2026-09-17",
      "close": 1495,
      "ihsg": 6462,
      "volume": 55628100
    },
    {
      "date": "2026-09-18",
      "close": 1475,
      "ihsg": 6441,
      "volume": 62556100
    },
    {
      "date": "2026-09-21",
      "close": 1500,
      "ihsg": 6385,
      "volume": 24451200
    },
    {
      "date": "2026-09-22",
      "close": 1455,
      "ihsg": 6277,
      "volume": 34749200
    },
    {
      "date": "2026-09-23",
      "close": 1440,
      "ihsg": 6375,
      "volume": 22476200
    },
    {
      "date": "2026-09-24",
      "close": 1440,
      "ihsg": 6299,
      "volume": 9655900
    },
    {
      "date": "2026-09-25",
      "close": 1430,
      "ihsg": 6242,
      "volume": 13088100
    },
    {
      "date": "2026-09-28",
      "close": 1440,
      "ihsg": 6148,
      "volume": 12877600
    }
  ],
  "PTBA": [
    {
      "date": "2026-08-03",
      "close": 2320,
      "ihsg": 6234,
      "volume": 14504100
    },
    {
      "date": "2026-08-04",
      "close": 2360,
      "ihsg": 6320,
      "volume": 9082700
    },
    {
      "date": "2026-08-05",
      "close": 2360,
      "ihsg": 6351,
      "volume": 13690100
    },
    {
      "date": "2026-08-06",
      "close": 2350,
      "ihsg": 6344,
      "volume": 9337400
    },
    {
      "date": "2026-08-07",
      "close": 2370,
      "ihsg": 6410,
      "volume": 9940400
    },
    {
      "date": "2026-08-10",
      "close": 2390,
      "ihsg": 6365,
      "volume": 10339700
    },
    {
      "date": "2026-08-11",
      "close": 2350,
      "ihsg": 6268,
      "volume": 9427900
    },
    {
      "date": "2026-08-12",
      "close": 2350,
      "ihsg": 6374,
      "volume": 10222900
    },
    {
      "date": "2026-08-13",
      "close": 2340,
      "ihsg": 6302,
      "volume": 5823800
    },
    {
      "date": "2026-08-14",
      "close": 2360,
      "ihsg": 6402,
      "volume": 10351500
    },
    {
      "date": "2026-08-18",
      "close": 2370,
      "ihsg": 6450,
      "volume": 10452300
    },
    {
      "date": "2026-08-19",
      "close": 2370,
      "ihsg": 6394,
      "volume": 9062800
    },
    {
      "date": "2026-08-20",
      "close": 2400,
      "ihsg": 6502,
      "volume": 7825700
    },
    {
      "date": "2026-08-21",
      "close": 2400,
      "ihsg": 6526,
      "volume": 8314400
    },
    {
      "date": "2026-08-24",
      "close": 2480,
      "ihsg": 6502,
      "volume": 33941000
    },
    {
      "date": "2026-08-26",
      "close": 2420,
      "ihsg": 6406,
      "volume": 19885800
    },
    {
      "date": "2026-08-27",
      "close": 2500,
      "ihsg": 6522,
      "volume": 23812700
    },
    {
      "date": "2026-08-28",
      "close": 2530,
      "ihsg": 6518,
      "volume": 37465600
    },
    {
      "date": "2026-08-31",
      "close": 2560,
      "ihsg": 6525,
      "volume": 30232000
    },
    {
      "date": "2026-09-01",
      "close": 2670,
      "ihsg": 6600,
      "volume": 115499100
    },
    {
      "date": "2026-09-02",
      "close": 2720,
      "ihsg": 6596,
      "volume": 93828700
    },
    {
      "date": "2026-09-03",
      "close": 2890,
      "ihsg": 6668,
      "volume": 109723500
    },
    {
      "date": "2026-09-04",
      "close": 2880,
      "ihsg": 6636,
      "volume": 26032000
    },
    {
      "date": "2026-09-07",
      "close": 3010,
      "ihsg": 6620,
      "volume": 92569800
    },
    {
      "date": "2026-09-08",
      "close": 3000,
      "ihsg": 6686,
      "volume": 67132000
    },
    {
      "date": "2026-09-09",
      "close": 3100,
      "ihsg": 6678,
      "volume": 104634100
    },
    {
      "date": "2026-09-10",
      "close": 3100,
      "ihsg": 6589,
      "volume": 81084900
    },
    {
      "date": "2026-09-11",
      "close": 3100,
      "ihsg": 6541,
      "volume": 51290600
    },
    {
      "date": "2026-09-14",
      "close": 3080,
      "ihsg": 6535,
      "volume": 46598300
    },
    {
      "date": "2026-09-15",
      "close": 3020,
      "ihsg": 6461,
      "volume": 22338600
    },
    {
      "date": "2026-09-16",
      "close": 3000,
      "ihsg": 6437,
      "volume": 25481200
    },
    {
      "date": "2026-09-17",
      "close": 3140,
      "ihsg": 6462,
      "volume": 49391500
    },
    {
      "date": "2026-09-18",
      "close": 3090,
      "ihsg": 6441,
      "volume": 35040000
    },
    {
      "date": "2026-09-21",
      "close": 3080,
      "ihsg": 6385,
      "volume": 15402900
    },
    {
      "date": "2026-09-22",
      "close": 3010,
      "ihsg": 6277,
      "volume": 22639100
    },
    {
      "date": "2026-09-23",
      "close": 3050,
      "ihsg": 6375,
      "volume": 23188400
    },
    {
      "date": "2026-09-24",
      "close": 3050,
      "ihsg": 6299,
      "volume": 11206200
    },
    {
      "date": "2026-09-25",
      "close": 3090,
      "ihsg": 6242,
      "volume": 31882000
    },
    {
      "date": "2026-09-28",
      "close": 3180,
      "ihsg": 6148,
      "volume": 60648500
    }
  ],
  "TINS": [
    {
      "date": "2026-08-03",
      "close": 3750,
      "ihsg": 6234,
      "volume": 51389000
    },
    {
      "date": "2026-08-04",
      "close": 3820,
      "ihsg": 6320,
      "volume": 64537000
    },
    {
      "date": "2026-08-05",
      "close": 3880,
      "ihsg": 6351,
      "volume": 74756700
    },
    {
      "date": "2026-08-06",
      "close": 3800,
      "ihsg": 6344,
      "volume": 62218800
    },
    {
      "date": "2026-08-07",
      "close": 3860,
      "ihsg": 6410,
      "volume": 68559300
    },
    {
      "date": "2026-08-10",
      "close": 3850,
      "ihsg": 6365,
      "volume": 44764500
    },
    {
      "date": "2026-08-11",
      "close": 3770,
      "ihsg": 6268,
      "volume": 43391800
    },
    {
      "date": "2026-08-12",
      "close": 3840,
      "ihsg": 6374,
      "volume": 43406200
    },
    {
      "date": "2026-08-13",
      "close": 3720,
      "ihsg": 6302,
      "volume": 39778400
    },
    {
      "date": "2026-08-14",
      "close": 3890,
      "ihsg": 6402,
      "volume": 134195200
    },
    {
      "date": "2026-08-18",
      "close": 3900,
      "ihsg": 6450,
      "volume": 39461900
    },
    {
      "date": "2026-08-19",
      "close": 4050,
      "ihsg": 6394,
      "volume": 105563700
    },
    {
      "date": "2026-08-20",
      "close": 3990,
      "ihsg": 6502,
      "volume": 55152900
    },
    {
      "date": "2026-08-21",
      "close": 4030,
      "ihsg": 6526,
      "volume": 23066900
    },
    {
      "date": "2026-08-24",
      "close": 4130,
      "ihsg": 6502,
      "volume": 63092700
    },
    {
      "date": "2026-08-26",
      "close": 4020,
      "ihsg": 6406,
      "volume": 42607700
    },
    {
      "date": "2026-08-27",
      "close": 4080,
      "ihsg": 6522,
      "volume": 34089000
    },
    {
      "date": "2026-08-28",
      "close": 4030,
      "ihsg": 6518,
      "volume": 33513500
    },
    {
      "date": "2026-08-31",
      "close": 4040,
      "ihsg": 6525,
      "volume": 24337100
    },
    {
      "date": "2026-09-01",
      "close": 4090,
      "ihsg": 6600,
      "volume": 36482300
    },
    {
      "date": "2026-09-02",
      "close": 4010,
      "ihsg": 6596,
      "volume": 42118400
    },
    {
      "date": "2026-09-03",
      "close": 4090,
      "ihsg": 6668,
      "volume": 37002300
    },
    {
      "date": "2026-09-04",
      "close": 4420,
      "ihsg": 6636,
      "volume": 101765000
    },
    {
      "date": "2026-09-07",
      "close": 4480,
      "ihsg": 6620,
      "volume": 56797200
    },
    {
      "date": "2026-09-08",
      "close": 4400,
      "ihsg": 6686,
      "volume": 36920400
    },
    {
      "date": "2026-09-09",
      "close": 4600,
      "ihsg": 6678,
      "volume": 59499900
    },
    {
      "date": "2026-09-10",
      "close": 4650,
      "ihsg": 6589,
      "volume": 86214100
    },
    {
      "date": "2026-09-11",
      "close": 4740,
      "ihsg": 6541,
      "volume": 55059000
    },
    {
      "date": "2026-09-14",
      "close": 4700,
      "ihsg": 6535,
      "volume": 50243100
    },
    {
      "date": "2026-09-15",
      "close": 4740,
      "ihsg": 6461,
      "volume": 38730600
    },
    {
      "date": "2026-09-16",
      "close": 4680,
      "ihsg": 6437,
      "volume": 37902900
    },
    {
      "date": "2026-09-17",
      "close": 4700,
      "ihsg": 6462,
      "volume": 26038600
    },
    {
      "date": "2026-09-18",
      "close": 4750,
      "ihsg": 6441,
      "volume": 29685400
    },
    {
      "date": "2026-09-21",
      "close": 4900,
      "ihsg": 6385,
      "volume": 63138200
    },
    {
      "date": "2026-09-22",
      "close": 4610,
      "ihsg": 6277,
      "volume": 76750100
    },
    {
      "date": "2026-09-23",
      "close": 4800,
      "ihsg": 6375,
      "volume": 37175000
    },
    {
      "date": "2026-09-24",
      "close": 4850,
      "ihsg": 6299,
      "volume": 34406900
    },
    {
      "date": "2026-09-25",
      "close": 4720,
      "ihsg": 6242,
      "volume": 24956000
    },
    {
      "date": "2026-09-28",
      "close": 4510,
      "ihsg": 6148,
      "volume": 36567100
    }
  ],
  "TLKM": [
    {
      "date": "2026-08-03",
      "close": 2740,
      "ihsg": 6234,
      "volume": 112278700
    },
    {
      "date": "2026-08-04",
      "close": 2790,
      "ihsg": 6320,
      "volume": 90753600
    },
    {
      "date": "2026-08-05",
      "close": 2710,
      "ihsg": 6351,
      "volume": 109494500
    },
    {
      "date": "2026-08-06",
      "close": 2650,
      "ihsg": 6344,
      "volume": 138223900
    },
    {
      "date": "2026-08-07",
      "close": 2710,
      "ihsg": 6410,
      "volume": 66412400
    },
    {
      "date": "2026-08-10",
      "close": 2620,
      "ihsg": 6365,
      "volume": 93974000
    },
    {
      "date": "2026-08-11",
      "close": 2610,
      "ihsg": 6268,
      "volume": 84124100
    },
    {
      "date": "2026-08-12",
      "close": 2590,
      "ihsg": 6374,
      "volume": 120373100
    },
    {
      "date": "2026-08-13",
      "close": 2590,
      "ihsg": 6302,
      "volume": 76115000
    },
    {
      "date": "2026-08-14",
      "close": 2620,
      "ihsg": 6402,
      "volume": 80799200
    },
    {
      "date": "2026-08-18",
      "close": 2600,
      "ihsg": 6450,
      "volume": 80089000
    },
    {
      "date": "2026-08-19",
      "close": 2600,
      "ihsg": 6394,
      "volume": 45580300
    },
    {
      "date": "2026-08-20",
      "close": 2610,
      "ihsg": 6502,
      "volume": 86747700
    },
    {
      "date": "2026-08-21",
      "close": 2610,
      "ihsg": 6526,
      "volume": 72276500
    },
    {
      "date": "2026-08-24",
      "close": 2620,
      "ihsg": 6502,
      "volume": 46321100
    },
    {
      "date": "2026-08-26",
      "close": 2600,
      "ihsg": 6406,
      "volume": 82579200
    },
    {
      "date": "2026-08-27",
      "close": 2610,
      "ihsg": 6522,
      "volume": 115845900
    },
    {
      "date": "2026-08-28",
      "close": 2570,
      "ihsg": 6518,
      "volume": 78958600
    },
    {
      "date": "2026-08-31",
      "close": 2600,
      "ihsg": 6525,
      "volume": 204591800
    },
    {
      "date": "2026-09-01",
      "close": 2610,
      "ihsg": 6600,
      "volume": 82430900
    },
    {
      "date": "2026-09-02",
      "close": 2590,
      "ihsg": 6596,
      "volume": 105899600
    },
    {
      "date": "2026-09-03",
      "close": 2600,
      "ihsg": 6668,
      "volume": 76991100
    },
    {
      "date": "2026-09-04",
      "close": 2610,
      "ihsg": 6636,
      "volume": 84953700
    },
    {
      "date": "2026-09-07",
      "close": 2610,
      "ihsg": 6620,
      "volume": 42030200
    },
    {
      "date": "2026-09-08",
      "close": 2650,
      "ihsg": 6686,
      "volume": 173160300
    },
    {
      "date": "2026-09-09",
      "close": 2660,
      "ihsg": 6678,
      "volume": 119056300
    },
    {
      "date": "2026-09-10",
      "close": 2630,
      "ihsg": 6589,
      "volume": 87447500
    },
    {
      "date": "2026-09-11",
      "close": 2600,
      "ihsg": 6541,
      "volume": 88455300
    },
    {
      "date": "2026-09-14",
      "close": 2690,
      "ihsg": 6535,
      "volume": 139730300
    },
    {
      "date": "2026-09-15",
      "close": 2700,
      "ihsg": 6461,
      "volume": 142432700
    },
    {
      "date": "2026-09-16",
      "close": 2660,
      "ihsg": 6437,
      "volume": 72687900
    },
    {
      "date": "2026-09-17",
      "close": 2590,
      "ihsg": 6462,
      "volume": 90206300
    },
    {
      "date": "2026-09-18",
      "close": 2560,
      "ihsg": 6441,
      "volume": 212768300
    },
    {
      "date": "2026-09-21",
      "close": 2500,
      "ihsg": 6385,
      "volume": 73848400
    },
    {
      "date": "2026-09-22",
      "close": 2470,
      "ihsg": 6277,
      "volume": 111856600
    },
    {
      "date": "2026-09-23",
      "close": 2440,
      "ihsg": 6375,
      "volume": 140225800
    },
    {
      "date": "2026-09-24",
      "close": 2410,
      "ihsg": 6299,
      "volume": 114511100
    },
    {
      "date": "2026-09-25",
      "close": 2410,
      "ihsg": 6242,
      "volume": 170051400
    },
    {
      "date": "2026-09-28",
      "close": 2370,
      "ihsg": 6148,
      "volume": 131894200
    }
  ]
};

export const brokerEvidence: Record<string, BrokerEvidence & { windowStart: string; windowEnd: string }> = {
  "ANTM": {
    "buyers": [
      {
        "code": "AK",
        "origin": "foreign",
        "value": 2028598844000,
        "buyIdr": 2028598844000,
        "sellIdr": 1670376598000,
        "netIdr": 358222246000
      },
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 1016443943000,
        "buyIdr": 1016443943000,
        "sellIdr": 702209478000,
        "netIdr": 314234465000
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 933560494000,
        "buyIdr": 933560494000,
        "sellIdr": 807357684000,
        "netIdr": 126202810000
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 451417408000,
        "buyIdr": 451417408000,
        "sellIdr": 380039356000,
        "netIdr": 71378052000
      },
      {
        "code": "LG",
        "origin": "local",
        "value": 351626437000,
        "buyIdr": 351626437000,
        "sellIdr": 332998023000,
        "netIdr": 18628414000
      },
      {
        "code": "KK",
        "origin": "foreign",
        "value": 229128719000,
        "buyIdr": 229128719000,
        "sellIdr": 175481616000,
        "netIdr": 53647103000
      },
      {
        "code": "GR",
        "origin": "local",
        "value": 213372163000,
        "buyIdr": 213372163000,
        "sellIdr": 184985237000,
        "netIdr": 28386926000
      },
      {
        "code": "TP",
        "origin": "foreign",
        "value": 153607637000,
        "buyIdr": 153607637000,
        "sellIdr": 103246921000,
        "netIdr": 50360716000
      },
      {
        "code": "KI",
        "origin": "local",
        "value": 93221297000,
        "buyIdr": 93221297000,
        "sellIdr": 43946251000,
        "netIdr": 49275046000
      },
      {
        "code": "DP",
        "origin": "foreign",
        "value": 22886893000,
        "buyIdr": 22886893000,
        "sellIdr": 3855893000,
        "netIdr": 19031000000
      }
    ],
    "sellers": [
      {
        "code": "CC",
        "origin": "local",
        "value": 1593652467000,
        "buyIdr": 1479843138000,
        "sellIdr": 1593652467000,
        "netIdr": -113809329000
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 1344394614000,
        "buyIdr": 1240390420000,
        "sellIdr": 1344394614000,
        "netIdr": -104004194000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 565679222000,
        "buyIdr": 392841685000,
        "sellIdr": 565679222000,
        "netIdr": -172837537000
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 458206673000,
        "buyIdr": 275436662000,
        "sellIdr": 458206673000,
        "netIdr": -182770011000
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 360632873000,
        "buyIdr": 318971159000,
        "sellIdr": 360632873000,
        "netIdr": -41661714000
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 329993315000,
        "buyIdr": 233909706000,
        "sellIdr": 329993315000,
        "netIdr": -96083609000
      },
      {
        "code": "AZ",
        "origin": "local",
        "value": 268010036000,
        "buyIdr": 218258121000,
        "sellIdr": 268010036000,
        "netIdr": -49751915000
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 224671286000,
        "buyIdr": 118500344000,
        "sellIdr": 224671286000,
        "netIdr": -106170942000
      },
      {
        "code": "AG",
        "origin": "foreign",
        "value": 89022857000,
        "buyIdr": 34998963000,
        "sellIdr": 89022857000,
        "netIdr": -54023894000
      },
      {
        "code": "AF",
        "origin": "local",
        "value": 55503930000,
        "buyIdr": 6375915000,
        "sellIdr": 55503930000,
        "netIdr": -49128015000
      }
    ],
    "netForeign": 1072684638000,
    "totalMarketValue": 13291780095000,
    "freeFloatShares": 8410767653.749999,
    "sharesOutstanding": 24030764725.0,
    "referencePrice": 3100,
    "windowStart": "2026-08-03",
    "windowEnd": "2026-09-28"
  },
  "BBCA": {
    "buyers": [
      {
        "code": "YU",
        "origin": "foreign",
        "value": 4105514502500,
        "buyIdr": 4105514502500,
        "sellIdr": 1511024120000,
        "netIdr": 2594490382500
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 1217970437500,
        "buyIdr": 1217970437500,
        "sellIdr": 1182871432500,
        "netIdr": 35099005000
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 1001212677500,
        "buyIdr": 1001212677500,
        "sellIdr": 911077445000,
        "netIdr": 90135232500
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 648740865000,
        "buyIdr": 648740865000,
        "sellIdr": 593648832500,
        "netIdr": 55092032500
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 449287350000,
        "buyIdr": 449287350000,
        "sellIdr": 257092032500,
        "netIdr": 192195317500
      },
      {
        "code": "AZ",
        "origin": "local",
        "value": 349620165000,
        "buyIdr": 349620165000,
        "sellIdr": 85405575000,
        "netIdr": 264214590000
      },
      {
        "code": "CP",
        "origin": "foreign",
        "value": 304442135000,
        "buyIdr": 304442135000,
        "sellIdr": 189146752500,
        "netIdr": 115295382500
      },
      {
        "code": "IF",
        "origin": "local",
        "value": 174510037500,
        "buyIdr": 174510037500,
        "sellIdr": 121886740000,
        "netIdr": 52623297500
      },
      {
        "code": "AG",
        "origin": "foreign",
        "value": 171709435000,
        "buyIdr": 171709435000,
        "sellIdr": 151478955000,
        "netIdr": 20230480000
      },
      {
        "code": "ES",
        "origin": "local",
        "value": 26945990000,
        "buyIdr": 26945990000,
        "sellIdr": 6478302500,
        "netIdr": 20467687500
      }
    ],
    "sellers": [
      {
        "code": "AK",
        "origin": "foreign",
        "value": 4068737885000,
        "buyIdr": 3118903337500,
        "sellIdr": 4068737885000,
        "netIdr": -949834547500
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 2002385085000,
        "buyIdr": 1796369797500,
        "sellIdr": 2002385085000,
        "netIdr": -206015287500
      },
      {
        "code": "RX",
        "origin": "foreign",
        "value": 1930116855000,
        "buyIdr": 803903967500,
        "sellIdr": 1930116855000,
        "netIdr": -1126212887500
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 1425106892500,
        "buyIdr": 1097765825000,
        "sellIdr": 1425106892500,
        "netIdr": -327341067500
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 740307887500,
        "buyIdr": 676274212500,
        "sellIdr": 740307887500,
        "netIdr": -64033675000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 604134827500,
        "buyIdr": 496528282500,
        "sellIdr": 604134827500,
        "netIdr": -107606545000
      },
      {
        "code": "TP",
        "origin": "foreign",
        "value": 602200702500,
        "buyIdr": 309743265000,
        "sellIdr": 602200702500,
        "netIdr": -292457437500
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 410554265000,
        "buyIdr": 338380725000,
        "sellIdr": 410554265000,
        "netIdr": -72173540000
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 366003885000,
        "buyIdr": 287329882500,
        "sellIdr": 366003885000,
        "netIdr": -78674002500
      },
      {
        "code": "PP",
        "origin": "local",
        "value": 55219427500,
        "buyIdr": 2446872500,
        "sellIdr": 55219427500,
        "netIdr": -52772555000
      }
    ],
    "netForeign": -678053515000,
    "totalMarketValue": 27237019945000,
    "freeFloatShares": 54482123342.79,
    "sharesOutstanding": 122042299500.0,
    "referencePrice": 6225,
    "windowStart": "2026-08-03",
    "windowEnd": "2026-09-28",
    "ownershipSeries": [
      {
        "date": "2026-01-30",
        "foreignPct": 0.3212,
        "localPct": 0.1043
      },
      {
        "date": "2026-02-27",
        "foreignPct": 0.3147,
        "localPct": 0.1108
      },
      {
        "date": "2026-03-31",
        "foreignPct": 0.3095,
        "localPct": 0.116
      },
      {
        "date": "2026-04-30",
        "foreignPct": 0.303,
        "localPct": 0.1225
      },
      {
        "date": "2026-05-29",
        "foreignPct": 0.2994,
        "localPct": 0.1261
      },
      {
        "date": "2026-06-30",
        "foreignPct": 0.2932,
        "localPct": 0.1323
      },
      {
        "date": "2026-07-31",
        "foreignPct": 0.2931,
        "localPct": 0.1324
      },
      {
        "date": "2026-08-31",
        "foreignPct": 0.2946,
        "localPct": 0.1309
      }
    ]
  },
  "BBRI": {
    "buyers": [
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 3395856792000,
        "buyIdr": 3395856792000,
        "sellIdr": 2967940283000,
        "netIdr": 427916509000
      },
      {
        "code": "AK",
        "origin": "foreign",
        "value": 3269318702000,
        "buyIdr": 3269318702000,
        "sellIdr": 2747020603000,
        "netIdr": 522298099000
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 1824019524000,
        "buyIdr": 1824019524000,
        "sellIdr": 1545621407000,
        "netIdr": 278398117000
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 1586018488000,
        "buyIdr": 1586018488000,
        "sellIdr": 1510509100000,
        "netIdr": 75509388000
      },
      {
        "code": "RX",
        "origin": "foreign",
        "value": 897592460000,
        "buyIdr": 897592460000,
        "sellIdr": 797547658000,
        "netIdr": 100044802000
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 740524736000,
        "buyIdr": 740524736000,
        "sellIdr": 342450249000,
        "netIdr": 398074487000
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 370573771000,
        "buyIdr": 370573771000,
        "sellIdr": 107373661000,
        "netIdr": 263200110000
      },
      {
        "code": "LG",
        "origin": "local",
        "value": 266998745000,
        "buyIdr": 266998745000,
        "sellIdr": 176304444000,
        "netIdr": 90694301000
      },
      {
        "code": "DR",
        "origin": "foreign",
        "value": 214681462000,
        "buyIdr": 214681462000,
        "sellIdr": 143296525000,
        "netIdr": 71384937000
      },
      {
        "code": "IF",
        "origin": "local",
        "value": 112722921000,
        "buyIdr": 112722921000,
        "sellIdr": 38812402000,
        "netIdr": 73910519000
      }
    ],
    "sellers": [
      {
        "code": "CC",
        "origin": "local",
        "value": 2765746468000,
        "buyIdr": 2177737787000,
        "sellIdr": 2765746468000,
        "netIdr": -588008681000
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 1762878447000,
        "buyIdr": 1460190358000,
        "sellIdr": 1762878447000,
        "netIdr": -302688089000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 1164776148000,
        "buyIdr": 846844510000,
        "sellIdr": 1164776148000,
        "netIdr": -317931638000
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 861258439000,
        "buyIdr": 609104952000,
        "sellIdr": 861258439000,
        "netIdr": -252153487000
      },
      {
        "code": "XC",
        "origin": "local",
        "value": 718252528000,
        "buyIdr": 622838760000,
        "sellIdr": 718252528000,
        "netIdr": -95413768000
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 638412262000,
        "buyIdr": 427098129000,
        "sellIdr": 638412262000,
        "netIdr": -211314133000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 518044103000,
        "buyIdr": 457252579000,
        "sellIdr": 518044103000,
        "netIdr": -60791524000
      },
      {
        "code": "TP",
        "origin": "foreign",
        "value": 361882066000,
        "buyIdr": 151947288000,
        "sellIdr": 361882066000,
        "netIdr": -209934778000
      },
      {
        "code": "CP",
        "origin": "foreign",
        "value": 244232493000,
        "buyIdr": 170941026000,
        "sellIdr": 244232493000,
        "netIdr": -73291467000
      },
      {
        "code": "GR",
        "origin": "local",
        "value": 162853939000,
        "buyIdr": 99491893000,
        "sellIdr": 162853939000,
        "netIdr": -63362046000
      }
    ],
    "netForeign": 1116018078000,
    "totalMarketValue": 23122991555000,
    "freeFloatShares": 70160299258.0812,
    "sharesOutstanding": 150043411587.0,
    "referencePrice": 3140,
    "windowStart": "2026-08-03",
    "windowEnd": "2026-09-28",
    "ownershipSeries": [
      {
        "date": "2026-01-30",
        "foreignPct": 0.2906,
        "localPct": 0.1774
      },
      {
        "date": "2026-02-27",
        "foreignPct": 0.2932,
        "localPct": 0.1749
      },
      {
        "date": "2026-03-31",
        "foreignPct": 0.2879,
        "localPct": 0.1802
      },
      {
        "date": "2026-04-30",
        "foreignPct": 0.2758,
        "localPct": 0.1923
      },
      {
        "date": "2026-05-29",
        "foreignPct": 0.2744,
        "localPct": 0.1936
      },
      {
        "date": "2026-06-30",
        "foreignPct": 0.2635,
        "localPct": 0.2045
      },
      {
        "date": "2026-07-31",
        "foreignPct": 0.2595,
        "localPct": 0.2085
      },
      {
        "date": "2026-08-31",
        "foreignPct": 0.2624,
        "localPct": 0.2057
      }
    ]
  },
  "GOTO": {
    "buyers": [
      {
        "code": "CC",
        "origin": "local",
        "value": 6093941000,
        "buyIdr": 6093941000,
        "sellIdr": 0,
        "netIdr": 6093941000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 4745933600,
        "buyIdr": 4745933600,
        "sellIdr": 0,
        "netIdr": 4745933600
      },
      {
        "code": "XC",
        "origin": "local",
        "value": 2963880900,
        "buyIdr": 2963880900,
        "sellIdr": 600000000,
        "netIdr": 2363880900
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 2807950000,
        "buyIdr": 2807950000,
        "sellIdr": 0,
        "netIdr": 2807950000
      },
      {
        "code": "AK",
        "origin": "foreign",
        "value": 2731135000,
        "buyIdr": 2731135000,
        "sellIdr": 0,
        "netIdr": 2731135000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 1850121700,
        "buyIdr": 1850121700,
        "sellIdr": 250000000,
        "netIdr": 1600121700
      },
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 1776018800,
        "buyIdr": 1776018800,
        "sellIdr": 344135000,
        "netIdr": 1431883800
      },
      {
        "code": "DP",
        "origin": "foreign",
        "value": 1753600000,
        "buyIdr": 1753600000,
        "sellIdr": 0,
        "netIdr": 1753600000
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 1715730100,
        "buyIdr": 1715730100,
        "sellIdr": 0,
        "netIdr": 1715730100
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 1064223600,
        "buyIdr": 1064223600,
        "sellIdr": 17200,
        "netIdr": 1064206400
      }
    ],
    "sellers": [
      {
        "code": "XL",
        "origin": "local",
        "value": 11976260000,
        "buyIdr": 7914202800,
        "sellIdr": 11976260000,
        "netIdr": -4062057200
      },
      {
        "code": "YB",
        "origin": "local",
        "value": 4765220000,
        "buyIdr": 66693000,
        "sellIdr": 4765220000,
        "netIdr": -4698527000
      },
      {
        "code": "MU",
        "origin": "local",
        "value": 3861310000,
        "buyIdr": 9300,
        "sellIdr": 3861310000,
        "netIdr": -3861300700
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 3623201900,
        "buyIdr": 843515900,
        "sellIdr": 3623201900,
        "netIdr": -2779686000
      },
      {
        "code": "MG",
        "origin": "local",
        "value": 2952730000,
        "buyIdr": 521030800,
        "sellIdr": 2952730000,
        "netIdr": -2431699200
      },
      {
        "code": "HD",
        "origin": "foreign",
        "value": 2604330000,
        "buyIdr": 2573000,
        "sellIdr": 2604330000,
        "netIdr": -2601757000
      },
      {
        "code": "CP",
        "origin": "foreign",
        "value": 2187810700,
        "buyIdr": 78495400,
        "sellIdr": 2187810700,
        "netIdr": -2109315300
      },
      {
        "code": "RB",
        "origin": "local",
        "value": 2028461000,
        "buyIdr": 15000,
        "sellIdr": 2028461000,
        "netIdr": -2028446000
      },
      {
        "code": "IU",
        "origin": "local",
        "value": 1466330000,
        "buyIdr": 25000000,
        "sellIdr": 1466330000,
        "netIdr": -1441330000
      },
      {
        "code": "PI",
        "origin": "local",
        "value": 1245415000,
        "buyIdr": 505000,
        "sellIdr": 1245415000,
        "netIdr": -1244910000
      }
    ],
    "netForeign": 9289650600,
    "totalMarketValue": 43636116600,
    "freeFloatShares": 921811314567.204,
    "sharesOutstanding": 1140573267220.0,
    "referencePrice": 43,
    "windowStart": "2026-08-03",
    "windowEnd": "2026-09-28"
  },
  "PGAS": {
    "buyers": [
      {
        "code": "XL",
        "origin": "local",
        "value": 171743302500,
        "buyIdr": 171743302500,
        "sellIdr": 125852464000,
        "netIdr": 45890838500
      },
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 132330234000,
        "buyIdr": 132330234000,
        "sellIdr": 86488524000,
        "netIdr": 45841710000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 93887191500,
        "buyIdr": 93887191500,
        "sellIdr": 65651083000,
        "netIdr": 28236108500
      },
      {
        "code": "CP",
        "origin": "foreign",
        "value": 62096518500,
        "buyIdr": 62096518500,
        "sellIdr": 49342341500,
        "netIdr": 12754177000
      },
      {
        "code": "GR",
        "origin": "local",
        "value": 61952363000,
        "buyIdr": 61952363000,
        "sellIdr": 14374171000,
        "netIdr": 47578192000
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 47957122500,
        "buyIdr": 47957122500,
        "sellIdr": 31439576500,
        "netIdr": 16517546000
      },
      {
        "code": "KK",
        "origin": "foreign",
        "value": 34543947500,
        "buyIdr": 34543947500,
        "sellIdr": 21116156000,
        "netIdr": 13427791500
      },
      {
        "code": "DH",
        "origin": "local",
        "value": 28234506500,
        "buyIdr": 28234506500,
        "sellIdr": 13839793000,
        "netIdr": 14394713500
      },
      {
        "code": "IH",
        "origin": "local",
        "value": 21528990000,
        "buyIdr": 21528990000,
        "sellIdr": 6414271000,
        "netIdr": 15114719000
      },
      {
        "code": "MG",
        "origin": "local",
        "value": 15855386000,
        "buyIdr": 15855386000,
        "sellIdr": 2983631500,
        "netIdr": 12871754500
      }
    ],
    "sellers": [
      {
        "code": "AK",
        "origin": "foreign",
        "value": 309700183000,
        "buyIdr": 271552961500,
        "sellIdr": 309700183000,
        "netIdr": -38147221500
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 160410045500,
        "buyIdr": 75958522500,
        "sellIdr": 160410045500,
        "netIdr": -84451523000
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 80069242500,
        "buyIdr": 63639449000,
        "sellIdr": 80069242500,
        "netIdr": -16429793500
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 73863429000,
        "buyIdr": 47089088500,
        "sellIdr": 73863429000,
        "netIdr": -26774340500
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 73414514000,
        "buyIdr": 53483726500,
        "sellIdr": 73414514000,
        "netIdr": -19930787500
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 71887002500,
        "buyIdr": 18126765000,
        "sellIdr": 71887002500,
        "netIdr": -53760237500
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 40090634500,
        "buyIdr": 25480107500,
        "sellIdr": 40090634500,
        "netIdr": -14610527000
      },
      {
        "code": "AG",
        "origin": "foreign",
        "value": 18440981500,
        "buyIdr": 12761077000,
        "sellIdr": 18440981500,
        "netIdr": -5679904500
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 18101588500,
        "buyIdr": 2148137000,
        "sellIdr": 18101588500,
        "netIdr": -15953451500
      },
      {
        "code": "SS",
        "origin": "local",
        "value": 13773850000,
        "buyIdr": 5109739500,
        "sellIdr": 13773850000,
        "netIdr": -8664110500
      }
    ],
    "netForeign": -126439531000,
    "totalMarketValue": 1804400447000,
    "freeFloatShares": 10431363391.82076,
    "sharesOutstanding": 24241508196.0,
    "referencePrice": 1440,
    "windowStart": "2026-08-03",
    "windowEnd": "2026-09-28"
  },
  "TLKM": {
    "buyers": [
      {
        "code": "CC",
        "origin": "local",
        "value": 1443603235000,
        "buyIdr": 1443603235000,
        "sellIdr": 861100771000,
        "netIdr": 582502464000
      },
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 1340172716000,
        "buyIdr": 1340172716000,
        "sellIdr": 1131689788000,
        "netIdr": 208482928000
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 566824274000,
        "buyIdr": 566824274000,
        "sellIdr": 440186633000,
        "netIdr": 126637641000
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 522143419000,
        "buyIdr": 522143419000,
        "sellIdr": 374018568000,
        "netIdr": 148124851000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 381097026000,
        "buyIdr": 381097026000,
        "sellIdr": 288964753000,
        "netIdr": 92132273000
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 274418724000,
        "buyIdr": 274418724000,
        "sellIdr": 169899443000,
        "netIdr": 104519281000
      },
      {
        "code": "XC",
        "origin": "local",
        "value": 214896173000,
        "buyIdr": 214896173000,
        "sellIdr": 168660323000,
        "netIdr": 46235850000
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 179860568000,
        "buyIdr": 179860568000,
        "sellIdr": 118861674000,
        "netIdr": 60998894000
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 168165309000,
        "buyIdr": 168165309000,
        "sellIdr": 105882038000,
        "netIdr": 62283271000
      },
      {
        "code": "TP",
        "origin": "foreign",
        "value": 98052299000,
        "buyIdr": 98052299000,
        "sellIdr": 36397341000,
        "netIdr": 61654958000
      }
    ],
    "sellers": [
      {
        "code": "BK",
        "origin": "foreign",
        "value": 1379743428000,
        "buyIdr": 1033527826000,
        "sellIdr": 1379743428000,
        "netIdr": -346215602000
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 1271465087000,
        "buyIdr": 248836683000,
        "sellIdr": 1271465087000,
        "netIdr": -1022628404000
      },
      {
        "code": "RX",
        "origin": "foreign",
        "value": 527821087000,
        "buyIdr": 448932439000,
        "sellIdr": 527821087000,
        "netIdr": -78888648000
      },
      {
        "code": "AG",
        "origin": "foreign",
        "value": 183136632000,
        "buyIdr": 67327036000,
        "sellIdr": 183136632000,
        "netIdr": -115809596000
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 124285942000,
        "buyIdr": 42476851000,
        "sellIdr": 124285942000,
        "netIdr": -81809091000
      },
      {
        "code": "DR",
        "origin": "foreign",
        "value": 100726224000,
        "buyIdr": 81073202000,
        "sellIdr": 100726224000,
        "netIdr": -19653022000
      },
      {
        "code": "HP",
        "origin": "local",
        "value": 68590937000,
        "buyIdr": 58677640000,
        "sellIdr": 68590937000,
        "netIdr": -9913297000
      },
      {
        "code": "BQ",
        "origin": "foreign",
        "value": 55827967000,
        "buyIdr": 36995226000,
        "sellIdr": 55827967000,
        "netIdr": -18832741000
      },
      {
        "code": "IF",
        "origin": "local",
        "value": 30242848000,
        "buyIdr": 9430744000,
        "sellIdr": 30242848000,
        "netIdr": -20812104000
      },
      {
        "code": "DP",
        "origin": "foreign",
        "value": 19877406000,
        "buyIdr": 4756512000,
        "sellIdr": 19877406000,
        "netIdr": -15120894000
      }
    ],
    "netForeign": -1052599606000,
    "totalMarketValue": 10495422824000,
    "freeFloatShares": 41259413213.9,
    "sharesOutstanding": 99062216600.0,
    "referencePrice": 2370,
    "windowStart": "2026-08-03",
    "windowEnd": "2026-09-28",
    "ownershipSeries": [
      {
        "date": "2026-01-30",
        "foreignPct": 0.39,
        "localPct": 0.0886
      },
      {
        "date": "2026-02-27",
        "foreignPct": 0.3893,
        "localPct": 0.0893
      },
      {
        "date": "2026-03-31",
        "foreignPct": 0.39,
        "localPct": 0.0886
      },
      {
        "date": "2026-04-30",
        "foreignPct": 0.3898,
        "localPct": 0.0888
      },
      {
        "date": "2026-05-29",
        "foreignPct": 0.3895,
        "localPct": 0.0891
      },
      {
        "date": "2026-06-30",
        "foreignPct": 0.3855,
        "localPct": 0.0931
      },
      {
        "date": "2026-07-31",
        "foreignPct": 0.3841,
        "localPct": 0.0945
      },
      {
        "date": "2026-08-31",
        "foreignPct": 0.3823,
        "localPct": 0.0962
      }
    ]
  }
};

export const institutionalFlows: Record<string, InstitutionalFlow[]> = {
  "ADRO": [],
  "AMRT": [],
  "ANTM": [],
  "BBCA": [],
  "BBRI": [],
  "BMRI": [
    {
      "symbol": "BMRI",
      "holderName": "Yuliot, Ir",
      "holderType": "insider",
      "transactionType": "buy",
      "sharesBefore": 165600,
      "sharesAfter": 188400,
      "sharesDelta": 22800,
      "filedAt": "2026-09-08T17:58:46+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-08092026-3898-00.pdf-0.pdf",
      "transactionValue": 99864000.0,
      "price": 4380.0
    },
    {
      "symbol": "BMRI",
      "holderName": "Yuliot, Ir",
      "holderType": "insider",
      "transactionType": "buy",
      "sharesBefore": 143200,
      "sharesAfter": 165600,
      "sharesDelta": 22400,
      "filedAt": "2026-09-08T17:53:21+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-08092026-7905-00.pdf-0.pdf",
      "transactionValue": 99232000.0,
      "price": 4430.0
    }
  ],
  "BUKA": [
    {
      "symbol": "BUKA",
      "holderName": "Rd Adi Wardhana Sariaatmadja",
      "holderType": "insider",
      "transactionType": "buy",
      "sharesBefore": 772585501,
      "sharesAfter": 1407585501,
      "sharesDelta": 635000000,
      "filedAt": "2026-09-08T16:15:50+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-08092026-6401-00.pdf-0.pdf",
      "transactionValue": 78740000000.0,
      "price": 124.0
    },
    {
      "symbol": "BUKA",
      "holderName": "Kreatif Media Karya",
      "holderType": "insider",
      "transactionType": "buy",
      "sharesBefore": 46321746385,
      "sharesAfter": 47125034185,
      "sharesDelta": 803287800,
      "filedAt": "2026-09-07T16:28:10+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-07092026-8071-00.pdf-0.pdf",
      "transactionValue": 101214262800.0,
      "price": 126.0
    }
  ],
  "EMTK": [],
  "EXCL": [],
  "GOTO": [
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "sell",
      "sharesBefore": 80863391484,
      "sharesAfter": 80413391484,
      "sharesDelta": -450000000,
      "filedAt": "2026-09-28T15:46:37+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-28092026-8273-00.pdf-0.pdf",
      "transactionValue": 12150000000.0,
      "price": 27.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "buy",
      "sharesBefore": 80539349984,
      "sharesAfter": 80939349984,
      "sharesDelta": 400000000,
      "filedAt": "2026-09-23T14:36:55+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-23092026-9638-00.pdf-0.pdf",
      "transactionValue": 10800000000.0,
      "price": 27.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "buy",
      "sharesBefore": 81275133384,
      "sharesAfter": 81695133384,
      "sharesDelta": 420000000,
      "filedAt": "2026-09-16T13:40:49+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-16092026-5380-00.pdf-0.pdf",
      "transactionValue": 11760000000.0,
      "price": 28.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "sell",
      "sharesBefore": 81695133384,
      "sharesAfter": 80302509784,
      "sharesDelta": -1392623600,
      "filedAt": "2026-09-16T13:40:49+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-16092026-5380-00.pdf-0.pdf",
      "transactionValue": 40386084400.0,
      "price": 29.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "others",
      "sharesBefore": 80476862884,
      "sharesAfter": 82306356884,
      "sharesDelta": 1829494000,
      "filedAt": "2026-09-10T16:56:31+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-10092026-1930-00.pdf-0.pdf",
      "transactionValue": 49396338000.0,
      "price": 27.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "others",
      "sharesBefore": 84971460184,
      "sharesAfter": 80476862884,
      "sharesDelta": -4494597300,
      "filedAt": "2026-09-09T18:40:37+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-09092026-8686-00.pdf-0.pdf",
      "transactionValue": 187964997300.0,
      "price": 25.393
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "others",
      "sharesBefore": 75029997584,
      "sharesAfter": 87487916784,
      "sharesDelta": 12457919200,
      "filedAt": "2026-09-07T17:10:05+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-07092026-9537-00.pdf-0.pdf",
      "transactionValue": 317445640000.0,
      "price": 25.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "buy",
      "sharesBefore": 65808820258,
      "sharesAfter": 75029997584,
      "sharesDelta": 9221177326,
      "filedAt": "2026-09-07T17:10:05+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-07092026-9537-00.pdf-0.pdf",
      "transactionValue": 230529433150.0,
      "price": 25.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "buy",
      "sharesBefore": 55572469938,
      "sharesAfter": 58710992438,
      "sharesDelta": 3138522500,
      "filedAt": "2026-08-26T17:26:48+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-26082026-1699-00.pdf-0.pdf",
      "transactionValue": 72186017500.0,
      "price": 23.0
    },
    {
      "symbol": "GOTO",
      "holderName": "Morgan Stanley And Co International Plc",
      "holderType": "institution",
      "transactionType": "others",
      "sharesBefore": 58710992438,
      "sharesAfter": 59368333838,
      "sharesDelta": 657341400,
      "filedAt": "2026-08-26T17:26:48+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-26082026-1699-00.pdf-0.pdf",
      "transactionValue": 15118852200.0,
      "price": 23.0
    }
  ],
  "ICBP": [],
  "INCO": [],
  "JSMR": [
    {
      "symbol": "JSMR",
      "holderName": "M+G Investment Funds (7) - M+G Global Emerging Markets Fund",
      "holderType": "insider",
      "transactionType": "buy",
      "sharesBefore": 362426800,
      "sharesAfter": 365685500,
      "sharesDelta": 3258700,
      "filedAt": "2026-09-02T19:25:26+07:00",
      "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-02092026-8460-00.pdf-0.pdf",
      "transactionValue": 9522965100.0,
      "price": 2922.32
    }
  ],
  "MYOR": [],
  "PGAS": [],
  "PTBA": [],
  "TINS": [],
  "TLKM": []
};

export const financialRows: Record<string, Array<{ label: string; value: string; period: string; interpretation: string; valueNum?: number; history?: Array<{ period: string; value: number }> }>> = {
  "ANTM": [
    {
      "label": "Revenue",
      "value": "Rp33,4T",
      "period": "2026-06-30",
      "interpretation": "Dipakai sebagai konteks skala monetisasi; bukan penentu arah harga.",
      "valueNum": 33390942000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 13008399000000
        },
        {
          "period": "2025-12-31",
          "value": 12614315000000
        },
        {
          "period": "2026-03-31",
          "value": 29323338000000
        },
        {
          "period": "2026-06-30",
          "value": 33390942000000
        }
      ]
    },
    {
      "label": "Operating margin",
      "value": "11,8%",
      "period": "2026-06-30",
      "interpretation": "Menguji apakah perubahan harga jual atau biaya diteruskan ke operasi.",
      "valueNum": 0.11800346932410592,
      "history": [
        {
          "period": "2025-09-30",
          "value": 0.13453692495133338
        },
        {
          "period": "2025-12-31",
          "value": 0.04021756234880768
        },
        {
          "period": "2026-03-31",
          "value": 0.15356229226017856
        },
        {
          "period": "2026-06-30",
          "value": 0.11800346932410592
        }
      ]
    },
    {
      "label": "Operating cash flow",
      "value": "Rp2,4T",
      "period": "2026-06-30",
      "interpretation": "Menguji transmisi perubahan ke kas operasi, bukan ke harga saham.",
      "valueNum": 2402307000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 1746066000000
        },
        {
          "period": "2025-12-31",
          "value": 831959000000
        },
        {
          "period": "2026-03-31",
          "value": -3154169000000
        },
        {
          "period": "2026-06-30",
          "value": 2402307000000
        }
      ]
    },
    {
      "label": "Total debt / equity",
      "value": "15,1%",
      "period": "2026-06-30",
      "interpretation": "Memberi konteks ruang neraca saat siklus berubah.",
      "valueNum": 0.15118092927556454,
      "history": [
        {
          "period": "2025-09-30",
          "value": 0.10479087970145567
        },
        {
          "period": "2025-12-31",
          "value": 0.11945673819858346
        },
        {
          "period": "2026-03-31",
          "value": 0.21151795954319766
        },
        {
          "period": "2026-06-30",
          "value": 0.15118092927556454
        }
      ]
    },
    {
      "label": "Revenue QoQ",
      "value": "13,9%",
      "period": "2026-06-30",
      "interpretation": "Pembanding kuartal sebelumnya (2026-03-31); bukan pertumbuhan tahunan.",
      "valueNum": 0.13871558551758323
    }
  ],
  "BBCA": [
    {
      "label": "Net interest income",
      "value": "Rp21,4T",
      "period": "2026-06-30",
      "interpretation": "Menguji transmisi biaya dana dan yield aset pada pilar Katalis.",
      "valueNum": 21404135000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 21361400000000
        },
        {
          "period": "2025-12-31",
          "value": 21601806000000
        },
        {
          "period": "2026-03-31",
          "value": 21108433000000
        },
        {
          "period": "2026-06-30",
          "value": 21404135000000
        }
      ]
    },
    {
      "label": "CASA ratio",
      "value": "84,8%",
      "period": "2026-06-30",
      "interpretation": "Memberi konteks struktur biaya dana, tanpa menggantikan bukti arus partisipan.",
      "valueNum": 0.8479140913371449,
      "history": [
        {
          "period": "2025-09-30",
          "value": 0.8347050415947819
        },
        {
          "period": "2025-12-31",
          "value": 0.8422198443832364
        },
        {
          "period": "2026-03-31",
          "value": 0.84771845736511
        },
        {
          "period": "2026-06-30",
          "value": 0.8479140913371449
        }
      ]
    },
    {
      "label": "Gross loan",
      "value": "Rp1.012,7T",
      "period": "2026-06-30",
      "interpretation": "Menunjukkan basis penyaluran kredit yang menanggung perubahan margin.",
      "valueNum": 1012705846000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 921999630000000
        },
        {
          "period": "2025-12-31",
          "value": 970233234000000
        },
        {
          "period": "2026-03-31",
          "value": 970701203000000
        },
        {
          "period": "2026-06-30",
          "value": 1012705846000000
        }
      ]
    },
    {
      "label": "Allowance / gross loan",
      "value": "3,0%",
      "period": "2026-06-30",
      "interpretation": "Memeriksa sisi kualitas aset yang dapat berlawanan dengan dukungan margin.",
      "valueNum": 0.03032069886955111,
      "history": [
        {
          "period": "2025-09-30",
          "value": 0.034129470312260324
        },
        {
          "period": "2025-12-31",
          "value": 0.030664826721447887
        },
        {
          "period": "2026-03-31",
          "value": 0.03144819941054508
        },
        {
          "period": "2026-06-30",
          "value": 0.03032069886955111
        }
      ]
    },
    {
      "label": "Revenue QoQ",
      "value": "0,9%",
      "period": "2026-06-30",
      "interpretation": "Pembanding kuartal sebelumnya (2026-03-31); bukan pertumbuhan tahunan.",
      "valueNum": 0.008553843660633387
    }
  ],
  "BBRI": [
    {
      "label": "Net interest income",
      "value": "Rp40,2T",
      "period": "2026-03-31",
      "interpretation": "Menguji transmisi biaya dana dan yield aset pada pilar Katalis.",
      "valueNum": 40155032000000,
      "history": [
        {
          "period": "2025-06-30",
          "value": 37422814000000
        },
        {
          "period": "2025-09-30",
          "value": 37716509000000
        },
        {
          "period": "2025-12-31",
          "value": 39507348000000
        },
        {
          "period": "2026-03-31",
          "value": 40155032000000
        }
      ]
    },
    {
      "label": "CASA ratio",
      "value": "68,1%",
      "period": "2026-03-31",
      "interpretation": "Memberi konteks struktur biaya dana, tanpa menggantikan bukti arus partisipan.",
      "valueNum": 0.6807293353191028,
      "history": [
        {
          "period": "2025-06-30",
          "value": 0.655105873389088
        },
        {
          "period": "2025-09-30",
          "value": 0.6764535065639647
        },
        {
          "period": "2025-12-31",
          "value": 0.7061348348479514
        },
        {
          "period": "2026-03-31",
          "value": 0.6807293353191028
        }
      ]
    },
    {
      "label": "Gross loan",
      "value": "Rp1.497,3T",
      "period": "2026-03-31",
      "interpretation": "Menunjukkan basis penyaluran kredit yang menanggung perubahan margin.",
      "valueNum": 1497270336000000,
      "history": [
        {
          "period": "2025-06-30",
          "value": 1358009739000000
        },
        {
          "period": "2025-09-30",
          "value": 1379689071000000
        },
        {
          "period": "2025-12-31",
          "value": 1460729418000000
        },
        {
          "period": "2026-03-31",
          "value": 1497270336000000
        }
      ]
    },
    {
      "label": "Allowance / gross loan",
      "value": "5,4%",
      "period": "2026-03-31",
      "interpretation": "Memeriksa sisi kualitas aset yang dapat berlawanan dengan dukungan margin.",
      "valueNum": 0.05376785478504264,
      "history": [
        {
          "period": "2025-06-30",
          "value": 0.057452839813544224
        },
        {
          "period": "2025-09-30",
          "value": 0.05628473301141341
        },
        {
          "period": "2025-12-31",
          "value": 0.05430753842735301
        },
        {
          "period": "2026-03-31",
          "value": 0.05376785478504264
        }
      ]
    },
    {
      "label": "Revenue QoQ",
      "value": "-2,1%",
      "period": "2026-03-31",
      "interpretation": "Pembanding kuartal sebelumnya (2025-12-31); bukan pertumbuhan tahunan.",
      "valueNum": -0.020747303445917464
    }
  ],
  "GOTO": [
    {
      "label": "Revenue",
      "value": "Rp5,7T",
      "period": "2026-06-30",
      "interpretation": "Dipakai sebagai konteks skala monetisasi; bukan penentu arah harga.",
      "valueNum": 5652799000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 4736512000000
        },
        {
          "period": "2025-12-31",
          "value": 5026636000000
        },
        {
          "period": "2026-03-31",
          "value": 5341314000000
        },
        {
          "period": "2026-06-30",
          "value": 5652799000000
        }
      ]
    },
    {
      "label": "Operating margin",
      "value": "6,4%",
      "period": "2026-06-30",
      "interpretation": "Menguji apakah perubahan harga jual atau biaya diteruskan ke operasi.",
      "valueNum": 0.06433998449263807,
      "history": [
        {
          "period": "2025-09-30",
          "value": -0.010719280348070478
        },
        {
          "period": "2025-12-31",
          "value": -0.031011793971156852
        },
        {
          "period": "2026-03-31",
          "value": 0.07829215807196506
        },
        {
          "period": "2026-06-30",
          "value": 0.06433998449263807
        }
      ]
    },
    {
      "label": "Operating cash flow",
      "value": "Rp662,5M",
      "period": "2026-06-30",
      "interpretation": "Menguji transmisi perubahan ke kas operasi, bukan ke harga saham.",
      "valueNum": 662485000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 451217000000
        },
        {
          "period": "2025-12-31",
          "value": 467860000000
        },
        {
          "period": "2026-03-31",
          "value": 1061925000000
        },
        {
          "period": "2026-06-30",
          "value": 662485000000
        }
      ]
    },
    {
      "label": "Total debt / equity",
      "value": "17,9%",
      "period": "2026-06-30",
      "interpretation": "Memberi konteks ruang neraca saat siklus berubah.",
      "valueNum": 0.1789931342471108,
      "history": [
        {
          "period": "2025-09-30",
          "value": 0.05698414352115924
        },
        {
          "period": "2025-12-31",
          "value": 0.17264761138655285
        },
        {
          "period": "2026-03-31",
          "value": 0.1780723368440745
        },
        {
          "period": "2026-06-30",
          "value": 0.1789931342471108
        }
      ]
    },
    {
      "label": "Revenue QoQ",
      "value": "5,8%",
      "period": "2026-06-30",
      "interpretation": "Pembanding kuartal sebelumnya (2026-03-31); bukan pertumbuhan tahunan.",
      "valueNum": 0.05831617463418182
    }
  ],
  "PGAS": [
    {
      "label": "Revenue",
      "value": "Rp15,8T",
      "period": "2026-03-31",
      "interpretation": "Dipakai sebagai konteks skala monetisasi; bukan penentu arah harga.",
      "valueNum": 15800743017591,
      "history": [
        {
          "period": "2025-06-30",
          "value": 15763252754248
        },
        {
          "period": "2025-09-30",
          "value": 16396819875661
        },
        {
          "period": "2025-12-31",
          "value": 17623775644586
        },
        {
          "period": "2026-03-31",
          "value": 15800743017591
        }
      ]
    },
    {
      "label": "Operating margin",
      "value": "12,8%",
      "period": "2026-03-31",
      "interpretation": "Menguji apakah perubahan harga jual atau biaya diteruskan ke operasi.",
      "valueNum": 0.12771906268314687,
      "history": [
        {
          "period": "2025-06-30",
          "value": 0.14027278285994121
        },
        {
          "period": "2025-09-30",
          "value": 0.14375898933749648
        },
        {
          "period": "2025-12-31",
          "value": 0.14345885371212644
        },
        {
          "period": "2026-03-31",
          "value": 0.12771906268314687
        }
      ]
    },
    {
      "label": "Operating cash flow",
      "value": "Rp1,5T",
      "period": "2026-03-31",
      "interpretation": "Menguji transmisi perubahan ke kas operasi, bukan ke harga saham.",
      "valueNum": 1476896483813,
      "history": [
        {
          "period": "2025-06-30",
          "value": 1463956486061
        },
        {
          "period": "2025-09-30",
          "value": 1743006771459
        },
        {
          "period": "2025-12-31",
          "value": 3644248834054
        },
        {
          "period": "2026-03-31",
          "value": 1476896483813
        }
      ]
    },
    {
      "label": "Total debt / equity",
      "value": "19,6%",
      "period": "2026-03-31",
      "interpretation": "Memberi konteks ruang neraca saat siklus berubah.",
      "valueNum": 0.19582528721695966,
      "history": [
        {
          "period": "2025-06-30",
          "value": 0.2372417359042434
        },
        {
          "period": "2025-09-30",
          "value": 0.2239129440090946
        },
        {
          "period": "2025-12-31",
          "value": 0.20576626805639006
        },
        {
          "period": "2026-03-31",
          "value": 0.19582528721695966
        }
      ]
    },
    {
      "label": "Revenue QoQ",
      "value": "-10,3%",
      "period": "2026-03-31",
      "interpretation": "Pembanding kuartal sebelumnya (2025-12-31); bukan pertumbuhan tahunan.",
      "valueNum": -0.10344166106966035
    }
  ],
  "TLKM": [
    {
      "label": "Revenue",
      "value": "Rp38,7T",
      "period": "2026-06-30",
      "interpretation": "Dipakai sebagai konteks skala monetisasi; bukan penentu arah harga.",
      "valueNum": 38689000000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 36613000000000
        },
        {
          "period": "2025-12-31",
          "value": 37125000000000
        },
        {
          "period": "2026-03-31",
          "value": 37189000000000
        },
        {
          "period": "2026-06-30",
          "value": 38689000000000
        }
      ]
    },
    {
      "label": "Operating margin",
      "value": "28,7%",
      "period": "2026-06-30",
      "interpretation": "Menguji apakah perubahan harga jual atau biaya diteruskan ke operasi.",
      "valueNum": 0.28731680839515106,
      "history": [
        {
          "period": "2025-09-30",
          "value": 0.2572310381558463
        },
        {
          "period": "2025-12-31",
          "value": 0.12923905723905724
        },
        {
          "period": "2026-03-31",
          "value": 0.2459060474871602
        },
        {
          "period": "2026-06-30",
          "value": 0.28731680839515106
        }
      ]
    },
    {
      "label": "Operating cash flow",
      "value": "Rp17,6T",
      "period": "2026-06-30",
      "interpretation": "Menguji transmisi perubahan ke kas operasi, bukan ke harga saham.",
      "valueNum": 17572000000000,
      "history": [
        {
          "period": "2025-09-30",
          "value": 17032000000000
        },
        {
          "period": "2025-12-31",
          "value": 14237000000000
        },
        {
          "period": "2026-03-31",
          "value": 17290000000000
        },
        {
          "period": "2026-06-30",
          "value": 17572000000000
        }
      ]
    },
    {
      "label": "Total debt / equity",
      "value": "42,2%",
      "period": "2026-06-30",
      "interpretation": "Memberi konteks ruang neraca saat siklus berubah.",
      "valueNum": 0.42206780968201235,
      "history": [
        {
          "period": "2025-09-30",
          "value": 0.345270043609527
        },
        {
          "period": "2025-12-31",
          "value": 0.3372858499903678
        },
        {
          "period": "2026-03-31",
          "value": 0.2917591938899942
        },
        {
          "period": "2026-06-30",
          "value": 0.42206780968201235
        }
      ]
    },
    {
      "label": "Revenue QoQ",
      "value": "4,0%",
      "period": "2026-06-30",
      "interpretation": "Pembanding kuartal sebelumnya (2026-03-31); bukan pertumbuhan tahunan.",
      "valueNum": 0.04033450751566314
    }
  ]
};

export const sectorReturns: Record<string, number> = {
  "Energy": 0.008722,
  "Technology": -0.110923,
  "Financials": -0.019659,
  "Basic Materials": -0.064051,
  "Infrastructure": -0.032875,
  "Consumer": -0.02244
};

export const subsectorReturns: Record<string, number> = {
  "Oil, Gas & Coal": 0.008722,
  "Transportation Infrastructure": -0.039286,
  "Food & Staples Retailing": 0.015267,
  "Banks": -0.019659,
  "Basic Materials": -0.064051,
  "Food & Beverage": -0.041551,
  "Software & IT Services": -0.110923,
  "Telecommunication": -0.032423
};

export const subsectorContext: Record<string, { totalCompanies: number; medianPe: number; weightedAvgPe: number; sampleCompanies: number }> = {
  "Banks": {
    "totalCompanies": 48,
    "medianPe": 10.26,
    "weightedAvgPe": 20.14,
    "sampleCompanies": 3
  },
  "Oil, Gas & Coal": {
    "totalCompanies": 89,
    "medianPe": 11.67,
    "weightedAvgPe": 39.3,
    "sampleCompanies": 3
  },
  "Telecommunication": {
    "totalCompanies": 22,
    "medianPe": 16.56,
    "weightedAvgPe": 147.23,
    "sampleCompanies": 2
  }
};

export const revenueSegments: Record<string, Array<{ segment: string; share: number }>> = {
  "ADRO": [
    {
      "segment": "Sales of Coal",
      "share": 0.5542
    },
    {
      "segment": "Mining services",
      "share": 0.4083
    },
    {
      "segment": "Others",
      "share": 0.0375
    }
  ],
  "BBCA": [
    {
      "segment": "Net Interest Income",
      "share": 0.7638
    },
    {
      "segment": "Non Interest Income",
      "share": 0.2349
    },
    {
      "segment": "Net Premium Income",
      "share": 0.0013
    }
  ],
  "BBRI": [
    {
      "segment": "Net Interest Income",
      "share": 0.8301
    },
    {
      "segment": "Non Interest Income",
      "share": 0.1628
    },
    {
      "segment": "Net Premium Income",
      "share": 0.0072
    }
  ],
  "TLKM": [
    {
      "segment": "Data, internet and information technology services revenues",
      "share": 0.6291
    },
    {
      "segment": "IndiHome revenues",
      "share": 0.1751
    },
    {
      "segment": "Interconnection revenues",
      "share": 0.0613
    }
  ]
};

export const betas: Record<string, number> = {
  "ADRO": 0.67,
  "AMRT": 0.68,
  "ANTM": 1.14,
  "BBCA": 0.7,
  "BBRI": 0.96,
  "BMRI": 0.84,
  "BUKA": 1.24,
  "EMTK": 1.69,
  "EXCL": 1.31,
  "GOTO": 0.5,
  "ICBP": 0.46,
  "INCO": 1.39,
  "JSMR": 0.84,
  "MYOR": 0.72,
  "PGAS": 0.52,
  "PTBA": 0.84,
  "TINS": 0.95,
  "TLKM": 0.45
};

export const rawEvents: RawEvent[] = [
  {
    "id": "news-kan-batas-harga-jadi-rp-1-cek-support-berikutnya",
    "title": "PT GoTo Gojek Tokopedia Tbk (GOTO) Slumps 14% to Auto Rejection Bottom as IDX Lowers Floor Price to Rp 1",
    "summary": "Shares of PT GoTo Gojek Tokopedia Tbk (GOTO) fell 14% to the auto rejection bottom (ARB) at Rp 43 on Monday (28/9/2026), the first day the Indonesia Stock Exchange (IDX) applied the Rp 1 minimum share price (floor price), and closed at Rp…",
    "body": "Shares of PT GoTo Gojek Tokopedia Tbk (GOTO) fell 14% to the auto rejection bottom (ARB) at Rp 43 on Monday (28/9/2026), the first day the Indonesia Stock Exchange (IDX) applied the Rp 1 minimum share price (floor price), and closed at Rp 43. Mirae Asset Sekuritas Senior Market Analyst Nafan Aji Gusta said the decline reflects price discovery and technical pressure rather than deteriorating fundamentals, with support seen at Rp 36-Rp 27 per share. GOTO's fundamentals improved, posting a net profit of Rp 252 billion, net revenue of Rp 5.7 trillion, and adjusted EBITDA of Rp 1.01 trillion in Q2-2026, and a net profit of Rp 423 billion with adjusted EBITDA of Rp 1,917 trillion in the first half of 2026. He advised existing holders to reassess risk profiles and prospective investors to wait and see for new support levels and consistent buying accumulation before considering bottom fishing.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T17:26:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Adverse",
        "relevance": 88,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bearish, Government Policy, Market Sentiment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/saham-goto-tertekan-usai-bei-turunkan-batas-harga-jadi-rp-1-cek-support-berikutnya",
    "tags": [
      "Bearish",
      "Government Policy",
      "Market Sentiment"
    ]
  },
  {
    "id": "news-k-1-dan-dolar-as-nyaris-rp-18000-ini-penyebabnya",
    "title": "IHSG Plunges 1.51% and Rupiah Nears Rp18,000/US$ as Fed Rate Hike and BEI Rule Changes Weigh on Markets",
    "summary": "Indonesian financial markets weakened in tandem on Monday (28/9/2026), with the Jakarta Composite Index (IHSG) falling 1.51%, or 94 points, to 6,147.86, while the rupiah depreciated 0.53% to Rp17,965/US$, just 35 points from the…",
    "body": "Indonesian financial markets weakened in tandem on Monday (28/9/2026), with the Jakarta Composite Index (IHSG) falling 1.51%, or 94 points, to 6,147.86, while the rupiah depreciated 0.53% to Rp17,965/US$, just 35 points from the psychological level of Rp18,000/US$. All sectors declined, with the deepest corrections in consumer non-primaries, property, and technology, and the smallest in energy; 532 stocks fell, 180 rose, and 81 were unchanged, with total transactions of Rp12.58 trillion. Top index drags included PT GoTo Gojek Tokopedia Tbk (GOTO), PT Amman Mineral Internasional Tbk (AMMN), and PT Bumi Resources Minerals Tbk (BRMS). The rupiah's weakness was driven by a strengthening US dollar after the Federal Reserve raised rates 25 basis points to 3.75%-4.00%, with Bank Indonesia Governor Destry Damayanti citing high global inflation of 4.6% and oil prices reaching US$125.53 per barrel on 24 September 2026. The IHSG decline also came as the Indonesia Stock Exchange (BEI) lowered the minimum stock trading price from Rp50 to Rp1 per share in the regular and cash markets, effective 28 September 2026, while adjusting Auto Rejection Top (ARA) and Auto Rejection Bottom (ARB) limits, retaining an asymmetric 15% ARB for equities above Rp10 until 31 December 2026 and setting ARA/ARB at Rp1 for stocks priced Rp1-Rp10.",
    "category": "rates",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T17:17:19+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Adverse",
        "relevance": 76,
        "path": "Suku bunga → biaya dana dan yield aset → margin bunga",
        "rationale": "Sectors menandai peristiwa ini Bearish, Central Bank, Currency & FX, Interest Rate, Politics & Regulation pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.cnbcindonesia.com/market/20260928161806-17-771517/ihsg-anjlok-1-dan-dolar-as-nyaris-rp-18000-ini-penyebabnya",
    "tags": [
      "Bearish",
      "Central Bank",
      "Currency & FX",
      "Interest Rate",
      "Politics & Regulation"
    ]
  },
  {
    "id": "news-iri-1-miliar-lot-jual-morgan-stanley-juga-jualan",
    "title": "PT GoTo Gojek Tokopedia Tbk (GOTO) Hits Auto Reject Bottom on First Day After Rp50 Floor Removal as Sell Queue Reaches 1.03 Billion Lots",
    "summary": "Shares of PT GoTo Gojek Tokopedia Tbk (GOTO) fell 14% to Rp43 on Monday (28/9/2026), hitting Auto Reject Bottom (ARB) on the first trading day after the Indonesia Stock Exchange removed the Rp50 minimum price floor. The sell queue at Rp43…",
    "body": "Shares of PT GoTo Gojek Tokopedia Tbk (GOTO) fell 14% to Rp43 on Monday (28/9/2026), hitting Auto Reject Bottom (ARB) on the first trading day after the Indonesia Stock Exchange removed the Rp50 minimum price floor. The sell queue at Rp43 piled up to 103,583,225,300 shares, equivalent to 1.03 billion lots, while the bid column was empty. The pressure coincided with a divestment by major shareholder Morgan Stanley And Co International Plc, which sold 450 million GOTO shares in a negotiated market transaction on 23 September 2026 at Rp27 per share, worth about Rp12.15 billion. Following the transaction, Morgan Stanley's holdings fell from 80.86 billion to 80.41 billion shares, reducing its ownership from 7,0233% to 6,9842%. GOTO was previously pressured to the Rp50 floor price on 5 May 2026 amid new ride-hailing regulations and commission-cap discussions, and the IDX stated it is one of 69 stocks now trading below Rp50 as it seeks a new equilibrium price.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T17:15:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Adverse",
        "relevance": 88,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bearish, Market Sentiment, Ownership, Politics & Regulation, Suspension pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/goto-arb-day-1-dibanjiri-1-miliar-lot-jual-morgan-stanley-juga-jualan",
    "tags": [
      "Bearish",
      "Market Sentiment",
      "Ownership",
      "Politics & Regulation",
      "Suspension"
    ]
  },
  {
    "id": "flows-foreign-net-antm-2026-09-28",
    "title": "Arus asing neto ANTM Rp1,1T pada jendela 2026-08-03–2026-09-28",
    "summary": "Neto asing Rp1,1T ≈ 8,1% dari nilai transaksi Rp13,3T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing ANTM Rp1,1T pada jendela 2026-08-03–2026-09-28. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-bbca-2026-09-28",
    "title": "Arus asing neto BBCA Rp-678,1M pada jendela 2026-08-03–2026-09-28",
    "summary": "Neto asing Rp-678,1M ≈ 2,5% dari nilai transaksi Rp27,2T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Adverse",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing BBCA Rp-678,1M pada jendela 2026-08-03–2026-09-28. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-bbri-2026-09-28",
    "title": "Arus asing neto BBRI Rp1,1T pada jendela 2026-08-03–2026-09-28",
    "summary": "Neto asing Rp1,1T ≈ 4,8% dari nilai transaksi Rp23,1T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Supported",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing BBRI Rp1,1T pada jendela 2026-08-03–2026-09-28. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-goto-2026-09-28",
    "title": "Arus asing neto GOTO Rp9,3M pada jendela 2026-08-03–2026-09-28",
    "summary": "Neto asing Rp9,3M ≈ 21,3% dari nilai transaksi Rp43,6M pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Supported",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing GOTO Rp9,3M pada jendela 2026-08-03–2026-09-28. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-pgas-2026-09-28",
    "title": "Arus asing neto PGAS Rp-126,4M pada jendela 2026-08-03–2026-09-28",
    "summary": "Neto asing Rp-126,4M ≈ 7,0% dari nilai transaksi Rp1,8T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PGAS",
        "direction": "Adverse",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing PGAS Rp-126,4M pada jendela 2026-08-03–2026-09-28. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-tlkm-2026-09-28",
    "title": "Arus asing neto TLKM Rp-1,1T pada jendela 2026-08-03–2026-09-28",
    "summary": "Neto asing Rp-1,1T ≈ 10,0% dari nilai transaksi Rp10,5T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Adverse",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing TLKM Rp-1,1T pada jendela 2026-08-03–2026-09-28. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "sentiment-attention-adro-2026-09-28",
    "title": "Lonjakan liputan ADRO: 7 berita 7 hari terakhir (vs 2 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 7 item ADRO pada 2026-09-22–2026-09-28 vs 2 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk ADRO: 7 vs 2 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "sentiment-attention-bbca-2026-09-28",
    "title": "Lonjakan liputan BBCA: 19 berita 7 hari terakhir (vs 1 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 19 item BBCA pada 2026-09-22–2026-09-28 vs 1 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk BBCA: 19 vs 1 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "sentiment-attention-bbri-2026-09-28",
    "title": "Lonjakan liputan BBRI: 20 berita 7 hari terakhir (vs 0 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 20 item BBRI pada 2026-09-22–2026-09-28 vs 0 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk BBRI: 20 vs 0 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "sentiment-attention-bmri-2026-09-28",
    "title": "Lonjakan liputan BMRI: 20 berita 7 hari terakhir (vs 0 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 20 item BMRI pada 2026-09-22–2026-09-28 vs 0 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk BMRI: 20 vs 0 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "sentiment-attention-goto-2026-09-28",
    "title": "Lonjakan liputan GOTO: 20 berita 7 hari terakhir (vs 0 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 20 item GOTO pada 2026-09-22–2026-09-28 vs 0 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk GOTO: 20 vs 0 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "sentiment-attention-inco-2026-09-28",
    "title": "Lonjakan liputan INCO: 5 berita 7 hari terakhir (vs 0 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 5 item INCO pada 2026-09-22–2026-09-28 vs 0 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T16:15:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "INCO",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk INCO: 5 vs 0 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-28092026-8273-00-pdf-0-pdf",
    "title": "Morgan Stanley And Co International Plc sells shares of GoTo Gojek Tokopedia",
    "summary": "Morgan Stanley And Co International Plc's disposal of GOTO shares is part of a larger exposure reduction that sees the firm trimming position across 3 companies in the last 6 months. Alongside GOTO, the firm has also disposed shares of…",
    "body": "Morgan Stanley And Co International Plc's disposal of GOTO shares is part of a larger exposure reduction that sees the firm trimming position across 3 companies in the last 6 months. Alongside GOTO, the firm has also disposed shares of AMRT and CTRA, totaling IDR 13,896,762,000 across all disposals in this period.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-28T15:46:37+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Unverified",
        "relevance": 95,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini divestment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-28092026-8273-00.pdf-0.pdf",
    "tags": [
      "divestment"
    ]
  },
  {
    "id": "news-antm-gali-laba-lebih-dalam-ada-target-harga-baru",
    "title": "MNC Sekuritas Raises PT Antam Tbk (ANTM) 2026 Net Profit Projection and Sets New Price Target",
    "summary": "MNC Sekuritas raised its 2026 net profit projection for PT Antam Tbk (ANTM) to Rp 9.2 trillion from Rp 8.9 trillion, followed by a higher price target. Antam's H1-2026 net profit jumped 36% year-on-year to Rp 6.4 trillion, reaching 71.4%…",
    "body": "MNC Sekuritas raised its 2026 net profit projection for PT Antam Tbk (ANTM) to Rp 9.2 trillion from Rp 8.9 trillion, followed by a higher price target. Antam's H1-2026 net profit jumped 36% year-on-year to Rp 6.4 trillion, reaching 71.4% of MNC Sekuritas' projection and 62.3% of consensus, while Q2-2026 net profit of Rp 3 trillion fell 12.5% quarter-on-quarter but grew 16.2% year-on-year, with net profit margin easing to 8.9% from 11.6% on weakening gold prices. The broker cut Antam's 2026 gold sales volume estimate by 9.5% to 36.2 tons but raised the average selling price assumption to US$4,535 per ounce from US$4,205. Supporting factors include an additional 900,000-ton nickel ore quota, bringing estimated 2026 total quota to 19 million tons, and the Mempawah smelter grade alumina (SGA) facility reaching 100% utilization in June 2026 with a 2026 production target of 700,000 tons versus 350,000 tons realized in H1.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T14:34:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Commodities, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455791/antam-antm-gali-laba-lebih-dalam-ada-target-harga-baru",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Commodities",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-nvestor-id-market-455728-perubahan-dramatis-bbca",
    "title": "PT Bank Central Asia Tbk (BBCA) records net foreign buying of IDR 103.17 bn after weeks of net selling",
    "summary": "PT Bank Central Asia Tbk (BBCA) experienced a dramatic reversal in foreign investor flow, posting a net foreign buy of IDR 103.17 bn on 25 Sept 2026 after a prior net sell of IDR 2.59 tn during 9‑23 Sept and a monthly net sell of IDR 1.52…",
    "body": "PT Bank Central Asia Tbk (BBCA) experienced a dramatic reversal in foreign investor flow, posting a net foreign buy of IDR 103.17 bn on 25 Sept 2026 after a prior net sell of IDR 2.59 tn during 9‑23 Sept and a monthly net sell of IDR 1.52 tn for September. UOB Kay Hian Sekuritas kept a buy rating with a target price of IDR 8,150 (≈30% upside), citing solid funding, capital and liquidity, while BBCA reported August 2026 net profit of IDR 4.92 tn (+13.1% YoY), cumulative profit of IDR 40.17 tn (+2.85%), forecasts profit of IDR 60 tn in 2026 and IDR 65 tn in 2027 with dividend yields of 5.7% and 6.1% respectively, and denied social‑media rumors of an acquisition.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-28T05:52:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Capital & Funding, Dividend Announcement, Financial Metrics, Ownership pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455728/perubahan-dramatis-bbca",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Capital & Funding",
      "Dividend Announcement",
      "Financial Metrics",
      "Ownership"
    ]
  },
  {
    "id": "news-ket-455662-bmri-dan-bbni-kompak-jadi-saham-murah",
    "title": "BMRI and BBNI flagged as cheap stocks by BRI Danareksa",
    "summary": "PT Bank Mandiri Tbk (BMRI) and PT Bank Negara Indonesia Tbk (BBNI) are highlighted as cheap big‑cap stocks, with trailing‑twelve‑months PE ratios of 6.1× and 6.3× respectively, closing at Rp 4,080 (+0.25%) and Rp 3,500 (‑0.5%) on 25 Sep…",
    "body": "PT Bank Mandiri Tbk (BMRI) and PT Bank Negara Indonesia Tbk (BBNI) are highlighted as cheap big‑cap stocks, with trailing‑twelve‑months PE ratios of 6.1× and 6.3× respectively, closing at Rp 4,080 (+0.25%) and Rp 3,500 (‑0.5%) on 25 Sep 2026 and having slipped about 4 % over the prior week. BRI Danareksa Sekuritas also maintains an overweight view on the banking sector, recommends PT Bank Central Asia Tbk (BBCA) as the top pick due to a solid net interest margin and a roughly 50 % savings‑account share, and projects aggregate bank net‑profit growth of 4 % annually in 2026, down from 11 % in H1 2026.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-27T10:41:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Supported",
        "relevance": 84,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455662/bmri-dan-bbni-kompak-jadi-saham-murah",
    "tags": [
      "Analyst Ratings",
      "Bullish"
    ]
  },
  {
    "id": "news-r-id-market-455653-saham-murah-emiten-boy-thohir",
    "title": "PT Alamtri Resources Indonesia Tbk (ADRO) highlighted as a cheap big‑cap stock linked to Boy Thohir",
    "summary": "The article spotlights PT Alamtri Resources Indonesia Tbk (ADRO) as a low‑priced big‑cap stock associated with Garibaldi “Boy” Thohir. It notes a trailing‑twelve‑months PE of 7.6× and a closing price of Rp 2,600 on 25 September 2026, with…",
    "body": "The article spotlights PT Alamtri Resources Indonesia Tbk (ADRO) as a low‑priced big‑cap stock associated with Garibaldi “Boy” Thohir. It notes a trailing‑twelve‑months PE of 7.6× and a closing price of Rp 2,600 on 25 September 2026, with the share up 1.5% that day but down 1.5% over the prior week and 1.1% over the month, while YTD performance rose 43.6%. Financially, ADRO reported H1‑2026 revenue of US$999 million (+16.5% YoY), EBITDA of US$491 million (+56.8% YoY) and net profit of US$309 million (+76.9% YoY). The article also records a foreign net‑sell of Rp 78.3 billion during the week of 21‑25 September 2026 and identifies Garibaldi Thohir, Christian Ariano Rachmat, Michael WP Soeryadjaya and Arini Saraswaty Subianto as the individual beneficial owners of ADRO.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-27T06:01:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Supported",
        "relevance": 88,
        "path": "Ekspektasi analis → asumsi valuasi → multiple",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Ownership pada dimensi valuation. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455653/saham-murah-emiten-boy-thohir",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Ownership"
    ]
  },
  {
    "id": "news-612-saham-bank-central-asia-bbca-kembali-disorot",
    "title": "Bank Central Asia (PT Bank Central Asia Tbk (BBCA)) stock again draws investor focus",
    "summary": "PT Bank Central Asia Tbk (BBCA) saw a foreign net buy of Rp 103.17 billion on 25 September 2026, lifting the share price 0.40% to Rp 6,250 with a volume of 89.45 million shares. UOB Kay Hian Sekuritas maintained a buy rating, setting a…",
    "body": "PT Bank Central Asia Tbk (BBCA) saw a foreign net buy of Rp 103.17 billion on 25 September 2026, lifting the share price 0.40% to Rp 6,250 with a volume of 89.45 million shares. UOB Kay Hian Sekuritas maintained a buy rating, setting a target price of Rp 8,150 (≈30% upside) and citing solid funding, capital and liquidity, while reporting August 2026 net profit of Rp 4.92 trillion (+13.1% YoY) and forecasting 2026‑2027 profits of Rp 60 trillion and Rp 65 trillion with dividend yields of 5.7% and 6.1%. The bank also refuted social‑media rumors of an acquisition by Andi Syamsuddin Arsyad (Haji Isam), confirming no corporate action plans.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-26T11:41:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455612/saham-bank-central-asia-bbca-kembali-disorot",
    "tags": [
      "Analyst Ratings",
      "Bullish"
    ]
  },
  {
    "id": "news-ton-emas-freeport-semester-i-catat-sales-rp50-t",
    "title": "PT Aneka Tambang Tbk (ANTM) reports 9‑ton gold purchase from Freeport and semester‑I sales of Rp50.39 trillion",
    "summary": "PT Aneka Tambang Tbk (ANTM) bought 9 tonnes of gold from PT Freeport Indonesia between January and August 2026 to strengthen domestic supply. In the first half of 2026, ANTAM sold 18.08 tonnes of gold generating Rp50.39 trillion, about 80%…",
    "body": "PT Aneka Tambang Tbk (ANTM) bought 9 tonnes of gold from PT Freeport Indonesia between January and August 2026 to strengthen domestic supply. In the first half of 2026, ANTAM sold 18.08 tonnes of gold generating Rp50.39 trillion, about 80% of its Rp62.71 trillion net sales, a 1% year‑on‑year increase, while its own gold production was 433 kg.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-25T22:16:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Asset Purchase, Bullish, Business Expansion, Commodities pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/122766/antam-serap-9-ton-emas-freeport-semester-i-catat-sales-rp50-t",
    "tags": [
      "Asset Purchase",
      "Bullish",
      "Business Expansion",
      "Commodities"
    ]
  },
  {
    "id": "news-market-455514-dividen-bbca-setelah-laba-melesat",
    "title": "BBCA dividend outlook improves as profit surges",
    "summary": "The article discusses the dividend outlook for PT Bank Central Asia Tbk (BBCA) following a sharp rise in earnings in August 2026. UOB Kay Hian Sekuritas reports that BBCA’s net interest margin increased to 5.7% in August from 5.3% in the…",
    "body": "The article discusses the dividend outlook for PT Bank Central Asia Tbk (BBCA) following a sharp rise in earnings in August 2026. UOB Kay Hian Sekuritas reports that BBCA’s net interest margin increased to 5.7% in August from 5.3% in the first half of the year, while the corporate loan yield rose to 7.4% from 6.7‑6.8% in April, and the bank maintains its NIM guidance of 5.4‑5.6%. The bank’s loan‑to‑deposit ratio stands at 81% supported by a CASA ratio of 85.5%, giving it room to be selective in credit extension and potentially raise dividends.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-25T15:40:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Supported",
        "relevance": 88,
        "path": "Kebijakan dividen → arus kas ke pemegang saham → neraca",
        "rationale": "Sectors menandai peristiwa ini Bullish, Dividend Announcement pada dimensi dividend. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455514/dividen-bbca-setelah-laba-melesat-",
    "tags": [
      "Bullish",
      "Dividend Announcement"
    ]
  },
  {
    "id": "news-turun-ke-6200-asing-net-sell-jumbo-10-saham-ini",
    "title": "IHSG falls to 6,298.61 as foreign investors net sell Rp1.49 trillion across ten stocks, led by PT Bank Rakyat Indonesia (Persero) Tbk (BBRI) and PT…",
    "summary": "On Thursday 24 September 2026, the Jakarta Composite Index (IHSG) closed at 6,298.61, down 1.20%, as foreign investors recorded a net sell of Rp1.49 trillion, comprising Rp1.42 trillion in the regular market and Rp71.85 billion in the…",
    "body": "On Thursday 24 September 2026, the Jakarta Composite Index (IHSG) closed at 6,298.61, down 1.20%, as foreign investors recorded a net sell of Rp1.49 trillion, comprising Rp1.42 trillion in the regular market and Rp71.85 billion in the negotiation and cash market. The largest outflows were in PT Bank Rakyat Indonesia (Persero) Tbk (BBRI) with Rp141.17 billion and PT Bumi Resources Tbk (BUMI) with Rp74.90 billion, placing them among the ten most heavily sold stocks that pressured the market.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-25T09:24:24+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Adverse",
        "relevance": 82,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini Bearish, Foreign Investment, Market Sentiment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.cnbcindonesia.com/market/20260925083429-17-770792/ihsg-turun-ke-6200-asing-net-sell-jumbo-10-saham-ini",
    "tags": [
      "Bearish",
      "Foreign Investment",
      "Market Sentiment"
    ]
  },
  {
    "id": "news-rugi-kurs-biaya-bahan-baku-saham-disarankan-hold",
    "title": "Indofood CBP (ICBP) profit pressured by foreign-exchange losses and raw-material costs, stock recommended Hold",
    "summary": "Indofood CBP (ICBP) posted revenue of Rp 41.9 trillion in the first half of 2026, up 11.3% YoY, but net profit fell 33.1% to Rp 3.7 trillion as gross and operating margins narrowed to 34.3% and 21.9% amid a Rp 2.95 trillion…",
    "body": "Indofood CBP (ICBP) posted revenue of Rp 41.9 trillion in the first half of 2026, up 11.3% YoY, but net profit fell 33.1% to Rp 3.7 trillion as gross and operating margins narrowed to 34.3% and 21.9% amid a Rp 2.95 trillion foreign‑exchange loss and high wheat (US$ 714 per bushel) and CPO (MYR 4,898 per ton) prices. MNC Sekuritas kept a Hold rating, citing limited pricing power despite strong volume growth, and set a target price of Rp 7,500 per share, implying a 2026 PE of about 10.5× and PBV of 1.1×. The firm also raised its 2026‑27 revenue outlook to Rp 80.1 trillion and Rp 84.6 trillion respectively, while cutting 2026‑27 net‑profit forecasts to Rp 8.3 trillion and Rp 9.7 trillion.",
    "category": "currency",
    "sourceType": "sectors",
    "publishedAt": "2026-09-25T09:17:00+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "ICBP",
        "direction": "Adverse",
        "relevance": 90,
        "path": "Kurs → biaya input dan pendapatan valuta → margin",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bearish, Commodities, Currency & FX, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/laba-indofood-cbp-icbp-tertekan-rugi-kurs-biaya-bahan-baku-saham-disarankan-hold",
    "tags": [
      "Analyst Ratings",
      "Bearish",
      "Commodities",
      "Currency & FX",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-455439-saham-bank-mandiri-bmri-diamdiam-diserok",
    "title": "PT Bank Mandiri Tbk (BMRI) Stock Quietly Shorted",
    "summary": "PT Bank Mandiri Tbk (BMRI), the issuer of the shares, fell 2.66% to Rp 4,070 on 24 September 2026 as foreign investors recorded a net sell of Rp 531.94 billion. Domestic brokers Mandiri Sekuritas and Stockbit Sekuritas together logged a…",
    "body": "PT Bank Mandiri Tbk (BMRI), the issuer of the shares, fell 2.66% to Rp 4,070 on 24 September 2026 as foreign investors recorded a net sell of Rp 531.94 billion. Domestic brokers Mandiri Sekuritas and Stockbit Sekuritas together logged a net purchase of about Rp 221.4 billion, while trading volume reached 182.06 million shares (value Rp 748.06 billion). KB Valbury Sekuritas analyst Akhmad Nurcahyadi projects 3Q26 net profit of Rp 13.46 trillion (below consensus of Rp 13.97 trillion) and expects cumulative 9-month profit growth of 16.3% YoY, supported by 17.6% credit and DPK growth, 8.2% CASA increase, cost of credit 0.5%, and ROE 21.6%. The broker maintains a buy recommendation with a target price of Rp 5,660, implying a 2026 price-to-book ratio of 1.8x versus the current 1.4x.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-25T05:30:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Domestic Investor, Financial Metrics, Foreign Investment pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455439/saham-bank-mandiri-bmri-diamdiam-diserok",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Domestic Investor",
      "Financial Metrics",
      "Foreign Investment"
    ]
  },
  {
    "id": "news-mber-cuan-baru-andy-hakim-hingga-daya-tahan-cdia",
    "title": "Popular news roundup: Andy Hakim’s stake in PT Guna Timur Raya Tbk (TRUK), PT NexAI Digital Infrastruktur Tbk (MGLV)’s loan facility, PT Chandra Daya…",
    "summary": "The article compiles the day’s most popular financial news, covering several corporate actions. Hakimson Growth Capital bought 5 % (21.75 million shares) of PT Guna Timur Raya Tbk (TRUK) at Rp 428 per share, a total of about Rp 9.3…",
    "body": "The article compiles the day’s most popular financial news, covering several corporate actions. Hakimson Growth Capital bought 5 % (21.75 million shares) of PT Guna Timur Raya Tbk (TRUK) at Rp 428 per share, a total of about Rp 9.3 billion, well below the Rp 1,420 closing price on 18 September 2026. PT NexAI Digital Infrastruktur Tbk (MGLV) secured a loan facility from PT Bank Negara Indonesia Tbk (BBNI) for its subsidiaries PT Nextier Askara Center (NAC) and PT Nextier GenAI Center (NGC) with a maximum commitment of Rp 4,125 trillion within an overall facility of Rp 10.75 trillion. PT Chandra Daya Investasi Tbk (CDIA) posted a 22.8 % year‑on‑year revenue increase to US$81.2 million in the first half of 2026, PT Sinergi Inti Andalan Prima Tbk (INET) is expanding its digital infrastructure business, and PT Alamtri Resources Indonesia Tbk (ADRO), PT Medco Energi Internasional Tbk (MEDC) and PT Arkora Hydro Tbk (ARKO) are competing to supply green electricity to Singapore from the Batam‑Bintan islands.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-25T05:00:00+07:00",
    "sector": "Market",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Supported",
        "relevance": 52,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Debt Issuance, ESG, Financial Metrics, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455437/berita-populer-sumber-cuan-baru-andy-hakim-hingga-daya-tahan-cdia",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Debt Issuance",
      "ESG",
      "Financial Metrics",
      "Ownership"
    ]
  },
  {
    "id": "news-investor-id-market-455388-nasib-sang-raja-nikel",
    "title": "PT Vale Indonesia Tbk (INCO) reports operational recovery in Q2 2026 with higher nickel ore sales and matte production, prompting a new target price",
    "summary": "PT Vale Indonesia Tbk (INCO), Indonesia’s largest nickel miner, is showing a gradual operational recovery in the second quarter of 2026, leading analysts to set a new target price for its shares. Nickel ore sales at the Bahodopi mine rose…",
    "body": "PT Vale Indonesia Tbk (INCO), Indonesia’s largest nickel miner, is showing a gradual operational recovery in the second quarter of 2026, leading analysts to set a new target price for its shares. Nickel ore sales at the Bahodopi mine rose 21.3% quarter‑on‑quarter to 1.1 million wet metric tons, while sales from Pomalaa jumped to 496,000 wmt, almost four times the previous quarter. Nickel matte output increased 18.8% QoQ to 16.2 thousand tonnes, and the broker forecasts total matte production of 67.6 kt in 2026 and 71.0 kt in 2027. The implementation of the Harga Patokan Mineral (HPM) 363 policy is expected to boost INCO’s 2027 net profit by US$46 million, a 14.5% uplift, supported by integrated infrastructure and captive hydropower capacity of 365 MW.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-24T18:32:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "INCO",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Commodities, Financial Metrics, Government Policy, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455388/nasib-sang-raja-nikel",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Commodities",
      "Financial Metrics",
      "Government Policy",
      "Production & Operations"
    ]
  },
  {
    "id": "news-ak-prospek-dan-rekomendasi-saham-jasa-marga-jsmr",
    "title": "Jasa Marga (JSMR) Outlook Projects Positive Prospects Through BUMN Toll Acquisitions and Recommends the Stock",
    "summary": "The article assesses PT Jasa Marga (Persero) Tbk (JSMR)'s outlook through 2026, focusing on potential acquisitions of toll road assets from state‑owned construction firms. JSMR plans to acquire profitable toll sections from PT Waskita…",
    "body": "The article assesses PT Jasa Marga (Persero) Tbk (JSMR)'s outlook through 2026, focusing on potential acquisitions of toll road assets from state‑owned construction firms. JSMR plans to acquire profitable toll sections from PT Waskita Karya Tbk (WSKT), PT Wijaya Karya Tbk (WIKA) and PT Pembangunan Perumahan (Persero) Tbk (PTPP), targeting an internal rate of return on equity of 13‑15% and allocating Rp10‑12 trillion in capex for toll projects. Recent financing includes a Rp2.06 trillion bond issuance, cash rising to Rp7.08 trillion (up 11% YoY), total liabilities increasing 15% YoY to Rp99.98 trillion and long‑term debt climbing 21% YoY to Rp69.38 trillion. JSMR also raised its stake in PT Trans Lingkar Kita Jaya (TLKJ) to 21.29%, which could boost profit contribution, while analysts stress selective acquisition based on traffic, valuation and cash‑flow generation.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-24T18:25:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "JSMR",
        "direction": "Supported",
        "relevance": 72,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Business Expansion, Capital & Funding, Debt Issuance, Mergers & Acquisitions pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/akuisisi-tol-bumn-simak-prospek-dan-rekomendasi-saham-jasa-marga-jsmr",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Business Expansion",
      "Capital & Funding",
      "Debt Issuance",
      "Mergers & Acquisitions"
    ]
  },
  {
    "id": "news-arket-455327-adro-medc-dan-arko-berebut-panggung",
    "title": "ADRO, MEDC, and ARKO Compete for Green Power Export to Singapore",
    "summary": "The three issuers PT Alamtri Resources Indonesia Tbk (ADRO), PT Medco Energi Internasional Tbk (MEDC) and PT Arkora Hydro Tbk (ARKO) are competing to become Singapore’s green electricity supplier from the Batam‑Bintan islands. ADRO,…",
    "body": "The three issuers PT Alamtri Resources Indonesia Tbk (ADRO), PT Medco Energi Internasional Tbk (MEDC) and PT Arkora Hydro Tbk (ARKO) are competing to become Singapore’s green electricity supplier from the Batam‑Bintan islands. ADRO, through its subsidiary Adaro Solar International, has secured a 0.4 GW allocation from the Singapore regulator and plans a US$3.2 billion capital expenditure for the project. MEDC, via the Pacific Medco Solar Energy consortium with Grup Salim, obtained conditional approval for 600 MW within a 2 GWp Batam solar PV project. ARKO’s subsidiary Endorshine Energy Solutions received US$9.8 million financing from PT Sarana Multi Infrastruktur for a commercial PLTS project, positioning ARKO as a potential dark‑horse contender.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-24T11:43:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Supported",
        "relevance": 76,
        "path": "Komitmen keberlanjutan → biaya kepatuhan → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Capital & Funding, ESG, Export, Partnerships & Agreements pada dimensi sustainability. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455327/adro-medc-dan-arko-berebut-panggung",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Capital & Funding",
      "ESG",
      "Export",
      "Partnerships & Agreements"
    ]
  },
  {
    "id": "news-rakyat-indonesia-bbri-ungkap-info-terkait-lapkeu",
    "title": "Bank Rakyat Indonesia (BBRI) announces limited review and upcoming publication of its Q3‑2026 financial statements",
    "summary": "PT Bank Rakyat Indonesia Tbk (BBRI) disclosed that its consolidated financial statements for the period ending 30 September 2026 will undergo a limited review by a public accountant and will be published in accordance with applicable…",
    "body": "PT Bank Rakyat Indonesia Tbk (BBRI) disclosed that its consolidated financial statements for the period ending 30 September 2026 will undergo a limited review by a public accountant and will be published in accordance with applicable regulations. In the first half of 2026, BRI and its subsidiaries reported a net profit of Rp30.86 trillion, up 17.42 % YoY, driven by a 5.42 % increase in interest income to Rp107.92 trillion and a 5.87 % decline in interest expense to Rp27.39 trillion, yielding net interest income of Rp80.53 trillion (+9.91 %) while impairment provisions rose 9.64 % to Rp25.51 trillion. Profitability ratios improved, with pre‑tax ROA at 3.30 %, after‑tax ROA at 2.70 % and ROE at 22.59 %, although the net interest margin fell to 6.40 % from 6.58 %, reflecting broader banking‑sector margin pressures.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-24T08:37:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Annual Report, Bullish, Financial Metrics pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455296/bank-rakyat-indonesia-bbri-ungkap-info-terkait-lapkeu",
    "tags": [
      "Annual Report",
      "Bullish",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-news-69316-emtek-perkuat-posisi-di-buka-dan-jecx",
    "title": "PT Elang Mahkota Teknologi Tbk (EMTK) strengthens its position in PT Bukalapak.com Tbk (BUKA) and PT Nitrasanata Dharma Tbk (JECX)",
    "summary": "The BEI disclosed on 22 Sep that PT Elang Mahkota Teknologi Tbk (EMTK) increased its holdings in PT Bukalapak.com Tbk (BUKA) by 188.70 million shares, raising its stake to 10.67%, and added 1.17 million shares of PT Nitrasanata Dharma Tbk…",
    "body": "The BEI disclosed on 22 Sep that PT Elang Mahkota Teknologi Tbk (EMTK) increased its holdings in PT Bukalapak.com Tbk (BUKA) by 188.70 million shares, raising its stake to 10.67%, and added 1.17 million shares of PT Nitrasanata Dharma Tbk (JECX) through its health subsidiary PT Sarana Meditama Metropolitan Tbk (SAME), bringing its total shareholdings to 33%. PT Yulie Sekuritas Indonesia Tbk (YULE) raised its stake in PT Esa Medika Mandiri Tbk (EMMI) to about 10.19%; Samudra (Investment) Pte. Ltd boosted its holding in PT Mitra Adiperkasa Tbk (MAPI) to 30.19%; and Lo Kheng Hong increased his position in PT Intiland Development Tbk (DILD) to 7.54%. Edwin Soeryadjaya now controls 35.95% of PT Saratoga Investama Sedaya Tbk (SRTG), Ferry Sudjono holds roughly 6.02% of PT Fore Kopi Indonesia Tbk (FORE), while Dato Tahir reduced his stake in PT Maha Properti Indonesia Tbk (MPRO) to 10.46%. PT Global Mediacom Tbk (BMTR) sold 28.90 million shares of its subsidiary PT Media Nusantara Citra Tbk (MNCN), lowering its control to 38.23%, and The Bank of New York Mellon divested 6 million shares of PT Telkom Indonesia (Persero) Tbk (TLKM), retaining about 6.3% of the telecom firm.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-24T08:20:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "BUKA",
        "direction": "Supported",
        "relevance": 40,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Foreign Investment, Institutional Investor, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      },
      {
        "symbol": "EMTK",
        "direction": "Supported",
        "relevance": 40,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Foreign Investment, Institutional Investor, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      },
      {
        "symbol": "TLKM",
        "direction": "Supported",
        "relevance": 40,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Foreign Investment, Institutional Investor, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/69316/emtek-perkuat-posisi-di-buka-dan-jecx",
    "tags": [
      "Bullish",
      "Foreign Investment",
      "Institutional Investor",
      "Ownership"
    ]
  },
  {
    "id": "news-455283-saham-bank-rakyat-indonesia-bbri-diserok",
    "title": "PT Bank Rakyat Indonesia Tbk (BBRI) shares see net foreign sell offset by domestic buying, closing up 0,31%",
    "summary": "PT Bank Rakyat Indonesia Tbk (BBRI) shares recorded a net foreign sell of Rp 187.64 miliar on 23/9/2026, while domestic investors posted a net buy of Rp 187.6 miliar. Based on data from Stockbit Sekuritas, domestic investors net bought Rp…",
    "body": "PT Bank Rakyat Indonesia Tbk (BBRI) shares recorded a net foreign sell of Rp 187.64 miliar on 23/9/2026, while domestic investors posted a net buy of Rp 187.6 miliar. Based on data from Stockbit Sekuritas, domestic investors net bought Rp 187.6 miliar, with Stokcbit Sekuritas (Rp 30.5 miliar), CGS International Sekuritas (Rp 26.7 miliar) and BCA Sekuritas (Rp 23.8 miliar) contributing, helping the stock close up 0.31% at Rp 3,190. For semester I‑2026 the bank reported PATMI of Rp 31.2 triliun, a 17.5% yoy increase, with net interest income up 9.9%, pre‑provision operating profit up 12.8%, cost of credit improving to 3.1%, total credit rising 16.2% yoy to Rp 1,645.5 triliun (corporate credit +47.1%, commercial credit +58.1%) and the micro‑credit portfolio at Rp 714.1 triliun, while gross NPL fell to 2.90% and loan at risk (LAR) improved to 9.1%. Kiwoom Sekuritas Indonesia maintains a buy recommendation with a 12‑month target price of Rp 4,000, implying a P/BV of 1.8 kali versus a three‑year average of 2.06 kali, while flagging risks from prolonged NIM pressure, tighter liquidity, slower credit growth, higher cost of credit and delayed micro‑asset quality recovery.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-24T07:03:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Supported",
        "relevance": 88,
        "path": "Ekspektasi analis → asumsi valuasi → multiple",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Domestic Investor, Financial Metrics, Foreign Investment pada dimensi valuation. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/455283/saham-bank-rakyat-indonesia-bbri-diserok",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Domestic Investor",
      "Financial Metrics",
      "Foreign Investment"
    ]
  },
  {
    "id": "news-form-untuk-obligasi-himbara-soroti-kredit-kopdes",
    "title": "CreditSights maintains Underperform rating on senior bonds of PT Bank Mandiri Tbk (BMRI) and PT Bank Negara Indonesia Tbk (BBNI) amid KDMP credit risk",
    "summary": "CreditSights kept its Underperform view on the senior bonds of PT Bank Mandiri Tbk (BMRI) and PT Bank Negara Indonesia Tbk (BBNI), noting that the bonds trade at only 100 bps and 68 bps above US Treasury yields respectively—well below the…",
    "body": "CreditSights kept its Underperform view on the senior bonds of PT Bank Mandiri Tbk (BMRI) and PT Bank Negara Indonesia Tbk (BBNI), noting that the bonds trade at only 100 bps and 68 bps above US Treasury yields respectively—well below the 25‑30 bps fair‑value spread to comparable Indian bank bonds—while each bank has extended Rp 55 trillion to PT Agrinas Pangan Nusantara (Agrinas) for the government‑backed KDMP program, representing 3 % of BMRI’s gross loan book and 6 % of BBNI’s. The firm highlighted the resulting pressure on capital ratios (CET1 of 16.7 % for BMRI and 15.7 % for BBNI, with projected reductions of roughly 25 bps and 43 bps) and net interest margins (KDMP loan NIM 2.2 % versus overall NIM 4.4 % for BMRI and 3.6 % for BBNI).",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-24T05:27:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Adverse",
        "relevance": 84,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bearish, Bonds, Capital & Funding, Credit, Government Policy pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://keuangan.kontan.co.id/news/creditsights-rekomendasi-underperform-untuk-obligasi-himbara-soroti-kredit-kopdes",
    "tags": [
      "Analyst Ratings",
      "Bearish",
      "Bonds",
      "Capital & Funding",
      "Credit",
      "Government Policy"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-23092026-9638-00-pdf-0-pdf",
    "title": "Morgan Stanley And Co International Plc buys shares of GoTo Gojek Tokopedia",
    "summary": "This is Morgan Stanley And Co International Plc's 4th insider purchase in the last 6 months, totaling an accumulation of 13,179,699,826 shares transacted at an average price of IDR 25. Morgan Stanley And Co International Plc's ownership in…",
    "body": "This is Morgan Stanley And Co International Plc's 4th insider purchase in the last 6 months, totaling an accumulation of 13,179,699,826 shares transacted at an average price of IDR 25. Morgan Stanley And Co International Plc's ownership in GoTo Gojek Tokopedia has increased from 6.995% to 7.03% in this period.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-23T14:36:55+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Unverified",
        "relevance": 95,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini investment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-23092026-9638-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "news-rga-jsmr-usai-gelar-transaksi-shl-rp-654-triliun",
    "title": "PT Jasa Marga Tbk (JSMR) completes Rp 6.54 trillion shareholder loan from PT Jasamarga Transjawa Tol (JTT) to PT Jasamarga Jalanlayang Cikampek (JJC)",
    "summary": "The article reports that PT Jasa Marga Tbk (JSMR) facilitated a shareholder loan (SHL) of Rp 6.54 trillion between its subsidiaries PT Jasamarga Transjawa Tol (JTT) and PT Jasamarga Jalanlayang Cikampek (JJC) on 17 September 2026. JSMR…",
    "body": "The article reports that PT Jasa Marga Tbk (JSMR) facilitated a shareholder loan (SHL) of Rp 6.54 trillion between its subsidiaries PT Jasamarga Transjawa Tol (JTT) and PT Jasamarga Jalanlayang Cikampek (JJC) on 17 September 2026. JSMR holds 65% of JTT and JTT holds 40% of JJC, and the loan is intended to bridge JJC’s refinancing and other operational needs with an interest rate within the market range. The transaction reduces JSMR’s cash and cash equivalents by roughly Rp 6.54 trillion and increases other receivables by the same amount, while its total liabilities were about Rp 100 trillion as of June 2026; the loan has no immediate impact on revenue or expenses, and JSMR’s first‑half 2026 toll revenue rose 6.8% to Rp 9.5 trillion, net profit about Rp 1.9 trillion and EBITDA grew about 8%. Panin Sekuritas analyst Elandry Pratama recommends a “buy on weakness” for JSMR with a target price of Rp 3,800–4,000 per share, noting the loan supports JJC’s liquidity while increasing intra‑group funding exposure.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-23T06:43:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "JSMR",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Capital & Funding, Credit, Financial Metrics pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/begini-rekomendasi-saham-jasa-marga-jsmr-usai-gelar-transaksi-shl-rp-654-triliun",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Capital & Funding",
      "Credit",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-si-shl-rp-654-triliun-simak-rekomendasi-sahamnya",
    "title": "PT Jasa Marga Tbk (JSMR) completes a IDR 6.54 trillion shareholder loan and is recommended as a buy",
    "summary": "On 17 September 2026, PT Jasa Marga Tbk (JSMR) facilitated a IDR 6.54 trillion shareholder loan from its 65%-owned subsidiary PT Jasamarga Transjawa Tol (JTT) to JTT’s 40%-owned subsidiary PT Jasamarga Jalanlayang Cikampek (JJC), reducing…",
    "body": "On 17 September 2026, PT Jasa Marga Tbk (JSMR) facilitated a IDR 6.54 trillion shareholder loan from its 65%-owned subsidiary PT Jasamarga Transjawa Tol (JTT) to JTT’s 40%-owned subsidiary PT Jasamarga Jalanlayang Cikampek (JJC), reducing JSMR’s cash and cash equivalents by the same amount while leaving its revenue and expenses unchanged. Panin Sekuritas Pondok Indah analyst Elandry Pratama projects continued toll‑traffic growth, noting H1 2026 revenue of IDR 9.5 trillion (+6.8%) and net profit of IDR 1.9 trillion, and recommends a buy on weakness with a target price of IDR 3,800‑4,000 per share despite JSMR’s IDR 100 trillion liabilities.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-22T19:36:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "JSMR",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Capital & Funding, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/jasa-marga-jsmr-transaksi-shl-rp-654-triliun-simak-rekomendasi-sahamnya",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Capital & Funding",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-00-saham-telkomsigma-di-tde-intip-arah-bisnisnya",
    "title": "PT Telkom Indonesia (Persero) Tbk (TLKM) regains 100% ownership of PT Telkom Data Ekosistem (TDE)",
    "summary": "PT Telkom Indonesia (Persero) Tbk (TLKM) completed a transaction on 17 September 2026 to acquire the remaining shares of PT Telkom Data Ekosistem (TDE), bringing its ownership to 100%. TLKM purchased 1,445,020 Series A shares and…",
    "body": "PT Telkom Indonesia (Persero) Tbk (TLKM) completed a transaction on 17 September 2026 to acquire the remaining shares of PT Telkom Data Ekosistem (TDE), bringing its ownership to 100%. TLKM purchased 1,445,020 Series A shares and 2,015,637,361,776 Series B shares, representing 19.19% of TDE’s issued and paid‑up capital, increasing its total holding to 10,504,517,594,408 shares. PT Telkom Data Ekosistem (TDE) is a subsidiary of TLKM (99.96% owned) and previously held 0.40% by PT Sigma Cipta Caraka (Telkomsigma), which itself is a TLKM subsidiary (56.39% owned) with the remainder held by PT Multimedia Nusantara, another TLKM subsidiary (99.99% owned). The transaction was disclosed to the Indonesia Stock Exchange and reported to OJK as an affiliated transaction, following a prior Rp2.01‑trillion restructuring in August 2022 that transferred Telkomsigma’s data‑center business to TDE.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-21T18:29:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Supported",
        "relevance": 88,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Mergers & Acquisitions, OJK, Ownership, Subsidiaries pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260921/192/2005915/tlkm-kuasai-lagi-100-saham-telkomsigma-di-tde-intip-arah-bisnisnya",
    "tags": [
      "Bullish",
      "Mergers & Acquisitions",
      "OJK",
      "Ownership",
      "Subsidiaries"
    ]
  },
  {
    "id": "news-i-6633-pekan-ini-cek-saham-antm-mtel-hingga-impc",
    "title": "IHSG Forecast to Test 6.633 This Week, with Analyst Recommendations for PT Aneka Tambang Tbk (ANTM), PT Dayamitra Telekomunikasi Tbk (MTEL) and PT…",
    "summary": "Indo Premier Sekuritas projects the Jakarta Composite Index (IHSG) to test the 6,633 level this week, with support at 6,200‑6,279 and resistance at 6,585‑6,633 after the index closed at 6,441.16 below the MA5‑MA20 dead‑cross but still…",
    "body": "Indo Premier Sekuritas projects the Jakarta Composite Index (IHSG) to test the 6,633 level this week, with support at 6,200‑6,279 and resistance at 6,585‑6,633 after the index closed at 6,441.16 below the MA5‑MA20 dead‑cross but still above the MA60. The broker recommends PT Aneka Tambang Tbk (ANTM) with a target price of Rp3,710 and a stop‑loss at Rp3,110, PT Dayamitra Telekomunikasi Tbk (MTEL) with a target of Rp535 and stop‑loss at Rp484, and PT Impack Pratama Industri Tbk (IMPC) with a target of Rp1,825 and stop‑loss at Rp1,630, citing solid technical structures for each. The outlook follows recent global monetary tightening, including a 25‑basis‑point Fed rate hike and a BOJ rate increase, which contributed to a 1.53% weekly decline in IHSG and net foreign outflows of Rp2.9 trillion.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-21T08:50:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 76,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Foreign Investment, Global Economy pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260921/189/2005724/ihsg-diramal-uji-6633-pekan-ini-cek-saham-antm-mtel-hingga-impc",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Foreign Investment",
      "Global Economy"
    ]
  },
  {
    "id": "news-tlkm-perkuat-kendali-atas-telkom-data-ekosistem",
    "title": "PT Telkom Indonesia Tbk (TLKM) Acquires Remaining Shares of PT Telkom Data Ekosistem (TDE), Achieving Full Ownership",
    "summary": "PT Telkom Indonesia Tbk (TLKM) completed the purchase of the remaining shares of its subsidiary PT Telkom Data Ekosistem (TDE), raising its ownership to 100% (10.5 trillion shares) after buying 1.44 million series A and 2.01 trillion…",
    "body": "PT Telkom Indonesia Tbk (TLKM) completed the purchase of the remaining shares of its subsidiary PT Telkom Data Ekosistem (TDE), raising its ownership to 100% (10.5 trillion shares) after buying 1.44 million series A and 2.01 trillion series B shares (19.19% of TDE) from Telkomsigma. TLKM said the transaction has no material impact on its finances, reaffirmed its 2026 EBITDA‑margin target above 50% (Q1 margin 49.4% and Q2 already above target), and reported first‑half 2026 revenue of Rp75.9 trillion (up 3.9% YoY) driven by Telkomsel’s 3.3% revenue growth to Rp55.6 trillion and an EBITDA margin rise to 46.9%, with CapEx ratio at 14.2% and a full‑year guidance of 17‑19%.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-18T19:00:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Financial Metrics, Mergers & Acquisitions, Ownership pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/122067/telkom-tlkm-perkuat-kendali-atas-telkom-data-ekosistem",
    "tags": [
      "Bullish",
      "Financial Metrics",
      "Mergers & Acquisitions",
      "Ownership"
    ]
  },
  {
    "id": "news-pengalihan-utang-whoosh-indonesia-siapkan-plan-b",
    "title": "BAKN DPR RI Urges Government to Prepare Backup Plan for PT Kereta Cepat Indonesia China Debt Transfer as September 15 Deadline Looms",
    "summary": "The State Financial Accountability Agency (BAKN) of the House of Representatives has urged the government to prepare a contingency plan for the debt transfer of PT Kereta Cepat Indonesia China, operator of the Whoosh high-speed rail, as…",
    "body": "The State Financial Accountability Agency (BAKN) of the House of Representatives has urged the government to prepare a contingency plan for the debt transfer of PT Kereta Cepat Indonesia China, operator of the Whoosh high-speed rail, as the September 15 settlement target appears unlikely to be met. Chairman Andreas Eddy Susetyo warned that ongoing due diligence may not conclude in time, potentially burdening PT Kereta Api Indonesia financially. Finance Minister Purbaya Yudhi Sadewa previously disclosed the restructured debt carries an annual installment of approximately Rp1 trillion with a tenor of up to 80 years. Separately, BAKN pressed Danantara, as shareholder of PT Kereta Api Indonesia and PT Bukit Asam, to strengthen supervision following recurring Supreme Audit Agency findings at state-owned enterprises.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:40:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PTBA",
        "direction": "Adverse",
        "relevance": 90,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bearish, Capital & Funding, Government Policy, Risk & Compliance pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/68721/pengalihan-utang-whoosh-indonesia-siapkan-plan-b",
    "tags": [
      "Bearish",
      "Capital & Funding",
      "Government Policy",
      "Risk & Compliance"
    ]
  },
  {
    "id": "news-s-lampaui-target-laba-bersih-melonjak-805-persen",
    "title": "PT Timah Revises 2026 Budget After First-Half Net Profit Jumps 805% and Exceeds Full-Year Targets",
    "summary": "PT Timah (Persero) Tbk announced it will revise its 2026 work plan and budget (RKAP) after first-half 2026 results far surpassed full-year targets. Revenue reached Rp10.4 trillion, up 147% year-on-year, achieving 67% of the full-year…",
    "body": "PT Timah (Persero) Tbk announced it will revise its 2026 work plan and budget (RKAP) after first-half 2026 results far surpassed full-year targets. Revenue reached Rp10.4 trillion, up 147% year-on-year, achieving 67% of the full-year target of Rp15.35 trillion. Net profit surged 805% to Rp2.7 trillion, exceeding the full-year target of Rp1.6 trillion, while EBITDA of Rp3.9 trillion also surpassed the full-year target of Rp2.9 trillion. Total assets rose 21% to Rp16.4 trillion, driven by cash growth to Rp4 trillion, and liabilities increased 13% to Rp5.9 trillion due to dividend obligations from the June 12, 2026 shareholder meeting, which were paid in July 2026.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T18:01:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "TINS",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Bullish, Dividend Announcement, Financial Metrics, Shareholders General Meeting pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/kinerja-timah-tins-lampaui-target-laba-bersih-melonjak-805-persen",
    "tags": [
      "Bullish",
      "Dividend Announcement",
      "Financial Metrics",
      "Shareholders General Meeting"
    ]
  },
  {
    "id": "news-di-katalis-tins-pede-kinerja-akhir-2026-berkilau",
    "title": "PT Timah Tbk expects Perpres No.79/2026 to boost performance and net income through 2026",
    "summary": "PT Timah Tbk says the implementation of Presidential Regulation No.79/2026 on tin land governance will act as a catalyst for its performance through the end of 2026. The company highlighted that its first‑half 2026 production of 12,232 t…",
    "body": "PT Timah Tbk says the implementation of Presidential Regulation No.79/2026 on tin land governance will act as a catalyst for its performance through the end of 2026. The company highlighted that its first‑half 2026 production of 12,232 t of tin ore and 10,865 t of refined tin, together with a 52 % rise in average tin price to US$49,794/ton, already pushed revenue and net‑profit targets above the original 2026 RKAP of Rp15.4 trillion and Rp1.6 trillion. Consequently, PT Timah Tbk has proposed higher 2026 targets, expecting continued price strength as LME tin prices are up 38.13 % year‑on‑year and export sales, which account for 97 % of total, remain dominated by Asia (75 %) with China contributing 35 % of shipments. Management expects the regulatory improvements in upstream‑to‑downstream governance to further boost productivity and net income in the second half of 2026.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T17:30:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "TINS",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Commodities, Export, Financial Metrics, Government Policy, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260910/192/2003143/perpres-792026-jadi-katalis-tins-pede-kinerja-akhir-2026-berkilau",
    "tags": [
      "Bullish",
      "Commodities",
      "Export",
      "Financial Metrics",
      "Government Policy",
      "Production & Operations"
    ]
  },
  {
    "id": "news-3-tambang-segera-beroperasi-morowali-lebih-dulu",
    "title": "PT Vale Indonesia Tbk announces near‑term start of operations for its three mining projects, with Morowali ahead of schedule",
    "summary": "PT Vale Indonesia Tbk is preparing to bring three mining projects in Morowali, Pomalaa and Sorowako into operation, with Morowali leading the timeline. Morowali’s Phase 1 has been running since 2025 and Phase 2 construction is on track for…",
    "body": "PT Vale Indonesia Tbk is preparing to bring three mining projects in Morowali, Pomalaa and Sorowako into operation, with Morowali leading the timeline. Morowali’s Phase 1 has been running since 2025 and Phase 2 construction is on track for mechanical completion by the end of 2026 and ramp‑up in early 2027, targeting 60‑66 k tons of Mixed Hydroxide Precipitate (MHP). The Pomalaa project is in commissioning and ready to feed ore for an initial 120 k‑ton MHP capacity, while Sorowako’s mining is progressing with stockpiled limonite and early‑stage HPAL works, including a 60‑km slurry pipeline and jetty construction. An HPAL autoclave is expected to arrive by the end of September or early October, supporting the upcoming production ramp‑up.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T17:16:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "INCO",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Commodities, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/inco-kejar-proyek-3-tambang-segera-beroperasi-morowali-lebih-dulu",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Commodities",
      "Production & Operations"
    ]
  },
  {
    "id": "news-ejar-proyek-hpal-pomalaa-full-produksi-pada-2027",
    "title": "Vale Indonesia aims for full production at the Pomalaa HPAL smelter by 2027",
    "summary": "Vale Indonesia (PT Vale Indonesia Tbk) announced that its Pomalaa High-Pressure Acid Leach (HPAL) smelter is slated to reach full production in 2027. The US$4.5 billion project will have an annual capacity of 120,000 tons of mixed…",
    "body": "Vale Indonesia (PT Vale Indonesia Tbk) announced that its Pomalaa High-Pressure Acid Leach (HPAL) smelter is slated to reach full production in 2027. The US$4.5 billion project will have an annual capacity of 120,000 tons of mixed hydroxide precipitate (MHP), which contains about 15,000 tons of cobalt, and mechanical completion is now expected by September-October 2026. Mining operations are already 83% complete and HPAL construction 86% complete, with the first ore sale recorded on 28 February 2026. Vale also targets 67,645 tons of nickel matte production for 2026 and a limonite output of 300,000 tons per month (about 9,677 tons per day) as part of the broader output plan. The project is being developed in partnership with Zhejiang Huayou Cobalt Co., Ltd and Ford Motor Co, which support the downstream battery and automotive supply chain.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T17:10:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "INCO",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Commodities, Partnerships & Agreements, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260910/192/2003124/vale-inco-kejar-proyek-hpal-pomalaa-full-produksi-pada-2027",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Commodities",
      "Partnerships & Agreements",
      "Production & Operations"
    ]
  },
  {
    "id": "news-ha-emtek-borong-803-juta-buka-kuasai-45-68-saham",
    "title": "Emtek subsidiary PT Kreatif Media Karya acquires 803.28 million shares of PT Bukalapak.com Tbk, raising its stake to 45.68%",
    "summary": "On Tuesday, 8 September, PT Kreatif Media Karya, an Emtek subsidiary, purchased 803.28 million shares of PT Bukalapak.com Tbk, increasing its ownership to 45.68%. The same filing shows Lo Kheng Hong buying 1 million shares of PT Intiland…",
    "body": "On Tuesday, 8 September, PT Kreatif Media Karya, an Emtek subsidiary, purchased 803.28 million shares of PT Bukalapak.com Tbk, increasing its ownership to 45.68%. The same filing shows Lo Kheng Hong buying 1 million shares of PT Intiland Development Tbk, lifting his holding to 7.51%, and Edwin Soeryadjaya acquiring 600 thousand shares of PT Saratoga Investama Sedaya Tbk, maintaining a 35.9% stake. Buyback actions were noted for PT Prodia Widyahusada Tbk (781,700 shares, 5.63% ownership), PT United Tractors Tbk (1.01 million shares, 7.77% ownership) and PT Arwana Citramulia Tbk (200,000 shares, 5.16% ownership). Additionally, CGS International Securities Singapore Pte Ltd sold 126 million shares of PT Wilton Makmur Indonesia Tbk, reducing its stake to 18.77%, while PT Bahana Nusantara Indojaya and PT Nusantara Makmur Lestari sold 2.55 million shares of PT Indokripto Koin Semesta Tbk (remaining 19.62%) and 205 thousand shares of PT Nusantara Sawit Sejahtera Tbk (remaining 9.46%) respectively.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T15:40:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "BUKA",
        "direction": "Supported",
        "relevance": 40,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Ownership, Stock Buyback pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/68636/anak-usaha-emtek-borong-803-juta-buka-kuasai-45-68-saham",
    "tags": [
      "Bullish",
      "Ownership",
      "Stock Buyback"
    ]
  },
  {
    "id": "news-tan-melonjak-timah-tins-siapkan-revisi-rkap-2026",
    "title": "PT Timah Tbk prepares revised 2026 RKAP after 147% revenue jump and 805% profit surge",
    "summary": "PT Timah Tbk announced that it is preparing a revised 2026 corporate work plan (RKAP) after the first‑half 2026 results far exceeded the original targets. Revenue reached Rp10.4 trillion, up 147% year‑on‑year, while net profit surged 805%…",
    "body": "PT Timah Tbk announced that it is preparing a revised 2026 corporate work plan (RKAP) after the first‑half 2026 results far exceeded the original targets. Revenue reached Rp10.4 trillion, up 147% year‑on‑year, while net profit surged 805% to Rp2.7 trillion and EBITDA climbed 363% to Rp3.9 trillion, surpassing the full‑year RKAP EBITDA target. Total assets grew 21% to Rp16.4 trillion, cash rose to about Rp4 trillion and equity increased to Rp10.5 trillion, while cash cost is projected to rise to US$23,000‑24,000 per metric ton by year‑end. The company allocated roughly Rp446 billion for 2026 capex, with half earmarked for production and exploration and the remainder for non‑recurring investments.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T15:02:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "TINS",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Capital & Funding, Financial Metrics, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260910/192/2003075/laba-pendapatan-melonjak-timah-tins-siapkan-revisi-rkap-2026",
    "tags": [
      "Bullish",
      "Capital & Funding",
      "Financial Metrics",
      "Production & Operations"
    ]
  },
  {
    "id": "news-jumbo-emiten-telko-bawa-peluang-sekaligus-risiko",
    "title": "Jumbo Capex by Telecom Emitters Brings Opportunities and Risks",
    "summary": "Jumbo capex plans by Indonesian telecom issuers are set to reshape the sector, with PT Solusi Sinergi Digital Tbk (WIFI) earmarking Rp7 trillion for 2026 to expand fixed wireless access, fiber‑to‑home, and tower fiberization. PT Telkom…",
    "body": "Jumbo capex plans by Indonesian telecom issuers are set to reshape the sector, with PT Solusi Sinergi Digital Tbk (WIFI) earmarking Rp7 trillion for 2026 to expand fixed wireless access, fiber‑to‑home, and tower fiberization. PT Telkom Indonesia Tbk (TLKM) has already spent Rp10.8 trillion in the first half of 2026, representing 14.2% of revenue, allocating 94% of capex to core B2C and B2B infrastructure and targeting a 17-19% capex‑to‑revenue ratio. PT Sarana Menara Nusantara Tbk (TOWR) plans Rp2.69 trillion for 2026, split between Rp2.01 trillion capex, Rp47 billion acquisitions, and Rp625 billion ground leases. The article highlights that while TLKM’s mature business model offers defensive growth, WIFI’s aggressive expansion carries higher execution risk and could pressure free cash flow if subscriber targets are not met, with PT Integrasi Jaringan Ekosistem (IJE) noted as a WIFI subsidiary.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-08T18:57:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Adverse",
        "relevance": 78,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Asset Purchase, Bearish, Business Expansion, Capital & Funding pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260908/7/2002483/capex-jumbo-emiten-telko-bawa-peluang-sekaligus-risiko",
    "tags": [
      "Asset Purchase",
      "Bearish",
      "Business Expansion",
      "Capital & Funding"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-08092026-3898-00-pdf-0-pdf",
    "title": "Yuliot, Ir buys shares of Bank Mandiri",
    "summary": "This is Yuliot, Ir's 3rd insider purchase in the last 6 months, totaling an accumulation of 146,900 shares transacted at an average price of IDR 4,208. Yuliot, Ir's ownership in Bank Mandiri has decreased from 0.0% to 0.0% in this period.",
    "body": "This is Yuliot, Ir's 3rd insider purchase in the last 6 months, totaling an accumulation of 146,900 shares transacted at an average price of IDR 4,208. Yuliot, Ir's ownership in Bank Mandiri has decreased from 0.0% to 0.0% in this period.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-08T17:58:46+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Unverified",
        "relevance": 95,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini investment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-08092026-3898-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-08092026-7905-00-pdf-0-pdf",
    "title": "Yuliot, Ir buys shares of Bank Mandiri",
    "summary": "Yuliot, Ir bought 22,400 shares of Bank Mandiri. This increases their holdings from 143,200 to 165,600 shares. The stated purpose of the transaction was investment.",
    "body": "Yuliot, Ir bought 22,400 shares of Bank Mandiri. This increases their holdings from 143,200 to 165,600 shares. The stated purpose of the transaction was investment.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-08T17:53:21+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Unverified",
        "relevance": 95,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini investment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-08092026-7905-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-08092026-6401-00-pdf-0-pdf",
    "title": "Rd Adi Wardhana Sariaatmadja buys shares of Bukalapak.com",
    "summary": "Rd Adi Wardhana Sariaatmadja bought 635,000,000 shares of Bukalapak.com. This increases their holdings from 772,585,501 to 1,407,585,501 shares. The stated purpose of the transaction was investment.",
    "body": "Rd Adi Wardhana Sariaatmadja bought 635,000,000 shares of Bukalapak.com. This increases their holdings from 772,585,501 to 1,407,585,501 shares. The stated purpose of the transaction was investment.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-08T16:15:50+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "BUKA",
        "direction": "Unverified",
        "relevance": 95,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini investment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-08092026-6401-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "news-ngi-pendapatan-batu-bara-target-diversifikasi-20",
    "title": "PT Bukit Asam Tbk targets 20% non‑coal revenue share by 2030 and reports H1 2026 net profit of Rp4.06 trillion",
    "summary": "PT Bukit Asam Tbk said it will increase the contribution of non‑coal and green‑energy revenue to 20% of total earnings by 2030, up from about 3% currently. The plan relies on securing 842 million tonnes of coal reserves for a 20‑year…",
    "body": "PT Bukit Asam Tbk said it will increase the contribution of non‑coal and green‑energy revenue to 20% of total earnings by 2030, up from about 3% currently. The plan relies on securing 842 million tonnes of coal reserves for a 20‑year supply and on constructing gasification projects for dimethyl ether (DME) and synthetic natural gas (SNG) with physical completion targeted for 2027. DME will be off‑taken by Pertamina Patra Niaga for LPG substitution and SNG will be supplied to PGN for industrial gas, both under the National Strategic Projects coordinated by Danantara, while PTBA will also expand its 1.2 MWp solar portfolio through cooperation with Pertamina NRE and participation in PLN’s RUPTL auction. The company reported H1 2026 revenue of Rp22.03 trillion and net profit of Rp4.06 trillion, a 4.2‑times year‑on‑year rise.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T19:52:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PTBA",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Financial Metrics, Government Policy, Partnerships & Agreements pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/68476/ptba-kurangi-pendapatan-batu-bara-target-diversifikasi-20",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Financial Metrics",
      "Government Policy",
      "Partnerships & Agreements"
    ]
  },
  {
    "id": "news-ba-ptba-melonjak-218-persen-jadi-rp-2-65-triliun",
    "title": "PT Bukit Asam Tbk reports 218% YoY net profit jump to Rp 2.65 trillion in H1 2026",
    "summary": "PT Bukit Asam Tbk posted a net profit of Rp 2.65 trillion for the first half of 2026, a 218% year‑on‑year increase. Revenue rose 8% YoY to Rp 22.03 trillion, supported by a 10% rise in average selling price of coal and stronger export…",
    "body": "PT Bukit Asam Tbk posted a net profit of Rp 2.65 trillion for the first half of 2026, a 218% year‑on‑year increase. Revenue rose 8% YoY to Rp 22.03 trillion, supported by a 10% rise in average selling price of coal and stronger export sales. Coal production reached 19.45 million tons and sales totaled 21.1 million tons, with exports of 10.33 million tons (up 5%) to Vietnam, Bangladesh, Cambodia, India and Thailand, while domestic sales accounted for about 51% of volume. The company aims to hit its target of roughly 50 million tons of production and sales by year‑end 2026, buoyed by global coal price gains reflected in the Newcastle Index (+25% YoY) and ICI‑3 (+15% YoY).",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T19:31:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PTBA",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Commodities, Export, Financial Metrics, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://money.kompas.com/read/2026/09/07/193100826/harga-batu-bara-naik-laba-ptba-melonjak-218-persen-jadi-rp-2-65-triliun",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Commodities",
      "Export",
      "Financial Metrics",
      "Production & Operations"
    ]
  },
  {
    "id": "news-porsi-saham-buka-serok-803-juta-harga-atas-pasar",
    "title": "Grup Emtek Strengthens Bukalapak Stake, Purchases 803 Million Shares at Above-Market Price",
    "summary": "PT Kreatif Media Karya (KMK Online), a digital subsidiary of PT Elang Mahkota Teknologi Tbk (EMTK), has increased its stake in PT Bukalapak.com Tbk (BUKA) by purchasing 803,287,800 shares on 4 September 2026. The shares were bought at…",
    "body": "PT Kreatif Media Karya (KMK Online), a digital subsidiary of PT Elang Mahkota Teknologi Tbk (EMTK), has increased its stake in PT Bukalapak.com Tbk (BUKA) by purchasing 803,287,800 shares on 4 September 2026. The shares were bought at Rp126 each, totaling Rp101,214 million, which is above BUKA's closing price of Rp113 per share on the same day. The acquisition raised KMK Online's ownership of BUKA to 45.68% from 44.90%, strengthening its control over the e‑commerce platform.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T17:06:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "BUKA",
        "direction": "Supported",
        "relevance": 88,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Domestic Investor, Mergers & Acquisitions, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/grup-emtek-pertebal-porsi-saham-buka-serok-803-juta-harga-atas-pasar",
    "tags": [
      "Bullish",
      "Domestic Investor",
      "Mergers & Acquisitions",
      "Ownership"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-07092026-8071-00-pdf-0-pdf",
    "title": "Kreatif Media Karya buys shares of Bukalapak.com",
    "summary": "Kreatif Media Karya bought 803,287,800 shares of Bukalapak.com. This increases their holdings from 46,321,746,385 to 47,125,034,185 shares. The stated purpose of the transaction was for investment.",
    "body": "Kreatif Media Karya bought 803,287,800 shares of Bukalapak.com. This increases their holdings from 46,321,746,385 to 47,125,034,185 shares. The stated purpose of the transaction was for investment.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-07T16:28:10+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "BUKA",
        "direction": "Unverified",
        "relevance": 95,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini investment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-07092026-8071-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "news-ari-ini-79-intip-rekomendasi-saham-mnc-sekuritas",
    "title": "MNC Sekuritas recommends AMRT, ELSA, SSMS and INDY as the IHSG targets the 6,705 level",
    "summary": "The article reports that MNC Sekuritas recommends four stocks—AMRT, ELSA, SSMS and INDY—while the Jakarta Composite Index (IHSG) eyes the 6,705 resistance level on 7 September 2026. The IHSG closed at 6,636.47 on Friday, up 0.47% from the…",
    "body": "The article reports that MNC Sekuritas recommends four stocks—AMRT, ELSA, SSMS and INDY—while the Jakarta Composite Index (IHSG) eyes the 6,705 resistance level on 7 September 2026. The IHSG closed at 6,636.47 on Friday, up 0.47% from the prior session and 1.82% (118.35 points) for the week, supported by a net foreign inflow of Rp2.30 trillion and a 35.9% rise in average daily volume to 48.99 billion shares. AMRT fell 1.13% to Rp1,310, ELSA slipped 2.01% to Rp730, SSMS rose 0.42% to Rp1,185, and INDY traded at Rp2,790 with a near‑term correction zone of Rp2,470–Rp2,640 and resistance at its 200‑day moving average (MA200). The market‑wide capitalisation rose 1.47% to Rp11,599 trillion, average daily transaction value increased 25.75% to Rp19.22 trillion, and transaction frequency climbed 10.93% to 2.39 million, underscoring the broader buying pressure behind the index’s potential breakout.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T07:38:00+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "AMRT",
        "direction": "Supported",
        "relevance": 72,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Foreign Investment, Market Sentiment pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260907/189/2001882/peluang-ihsg-incar-6705-hari-ini-79-intip-rekomendasi-saham-mnc-sekuritas",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Foreign Investment",
      "Market Sentiment"
    ]
  },
  {
    "id": "news-m-naik-ini-prospek-saham-medc-elsa-pgas-dan-tpia",
    "title": "Oil Price Upside Threatens to Boost MEDC, ELSA, PGAS and TPIA Stock Prospects",
    "summary": "The article analyzes how a potential rise in global oil prices, driven by Iran‑U.S. geopolitical tension, could affect the stock prospects of four Indonesian energy companies. PT Medco Energi Internasional Tbk is seen as the most…",
    "body": "The article analyzes how a potential rise in global oil prices, driven by Iran‑U.S. geopolitical tension, could affect the stock prospects of four Indonesian energy companies. PT Medco Energi Internasional Tbk is seen as the most positively impacted, with its upstream exposure, a projected production of 145 mboepd and a target price of Rp1,900 per share. PT Elnusa Tbk may benefit indirectly from higher upstream activity, supported by a Rp1.3 trillion contract backlog and a projected 12% YoY net‑profit growth, with a target price of Rp845; PT Perusahaan Gas Negara Tbk is considered relatively defensive, backed by stable gas‑distribution volumes of 880 BBTUD and a target price of Rp1,615; while PT Chandra Asri Pacific Tbk faces mixed effects, with petrochemical spread expectations of US$350‑US$400 per ton, an additional US$120 million EBITDA from infrastructure assets, and a target price of Rp3,000. The analysts caution that if oil prices normalize to US$70‑US$80 per barrel, MEDC’s earnings would be most vulnerable, whereas ELSA and PGAS would remain comparatively defensive.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-06T14:11:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PGAS",
        "direction": "Supported",
        "relevance": 72,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Commodities, Financial Metrics, Global Economy, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/harga-minyak-terancam-naik-ini-prospek-saham-medc-elsa-pgas-dan-tpia",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Commodities",
      "Financial Metrics",
      "Global Economy",
      "Production & Operations"
    ]
  },
  {
    "id": "news-ed-capex-2026-jadi-rp20-t-ini-fokus-investasinya",
    "title": "XLSMART Telecom Sejahtera Tbk raises 2026 capitalized capex guidance to Rp20 trillion from Rp15 trillion to fund 5G expansion and spectrum…",
    "summary": "PT XLSMART Telecom Sejahtera Tbk increased its 2026 capitalized capital expenditure guidance to Rp20 trillion from Rp15 trillion, directing the additional investment toward network infrastructure strengthening, 5G service expansion, and…",
    "body": "PT XLSMART Telecom Sejahtera Tbk increased its 2026 capitalized capital expenditure guidance to Rp20 trillion from Rp15 trillion, directing the additional investment toward network infrastructure strengthening, 5G service expansion, and optimization of 700 MHz and 2.6 GHz spectrum utilization. As of the first half of 2026, the company's 5G services covered more than 50 cities with approximately 15,000 base stations reaching 23% of the national population, and its network earned four Ookla awards including Best Mobile Network and Best 5G Network. The company is also collaborating with Google to offer Gemini AI Plus and Cloud Storage to customers, while emphasizing that digital infrastructure development requires ecosystem collaboration among government, operators, technology firms, and device manufacturers. In the second half of 2026, XLSMART will prioritize customer experience enhancement, spectrum optimization, 5G network and ecosystem expansion, and digital service strengthening.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-04T13:30:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "EXCL",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Artificial Intelligence, Award, Bullish, Business Expansion, Capital & Funding, Digital Transformation pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/xlsmart-excl-naikkan-capitalized-capex-2026-jadi-rp20-t-ini-fokus-investasinya",
    "tags": [
      "Artificial Intelligence",
      "Award",
      "Bullish",
      "Business Expansion",
      "Capital & Funding",
      "Digital Transformation"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-02092026-8460-00-pdf-0-pdf",
    "title": "M+G Investment Funds (7) - M+G Global Emerging Markets Fund buys shares of Jasa Marga",
    "summary": "M+G Investment Funds (7) - M+G Global Emerging Markets Fund bought 3,258,700 shares of Jasa Marga. This increases their holdings from 362,426,800 to 365,685,500 shares. The stated purpose of the transaction was purchase of shares.",
    "body": "M+G Investment Funds (7) - M+G Global Emerging Markets Fund bought 3,258,700 shares of Jasa Marga. This increases their holdings from 362,426,800 to 365,685,500 shares. The stated purpose of the transaction was purchase of shares.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-02T19:25:26+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "JSMR",
        "direction": "Unverified",
        "relevance": 95,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini investment pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-02092026-8460-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "news-trase-kompensasi-awal-pgas-ke-gunvor-9-kargo-lng",
    "title": "PGAS Loses Partial Arbitration Award, Ordered to Pay 9 LNG Cargoes to Gunvor",
    "summary": "PT Perusahaan Gas Negara Tbk (PGAS) lost a partial arbitration award at the London Court of International Arbitration and must compensate Gunvor Singapore Pte Ltd with 9 LNG cargoes covering 2024 and 2025 deliveries. The partial award…",
    "body": "PT Perusahaan Gas Negara Tbk (PGAS) lost a partial arbitration award at the London Court of International Arbitration and must compensate Gunvor Singapore Pte Ltd with 9 LNG cargoes covering 2024 and 2025 deliveries. The partial award addresses Gunvor's claim for 4-8 cargoes in 2024 and 1-4 cargoes in 2025, while remaining claims for 2025 through 2027 are still pending. Gunvor reportedly claimed US$130.4 million (approximately Rp2.18 trillion) in the dispute, while PGAS provisioned US$72.02 million (approximately Rp1.2 trillion) in its December 2025 financial statements. The dispute stems from a 2022 master sales agreement for 8 cargoes annually through 2027, which PGAS declared force majeure on in November 2023. PGAS shares have fallen 18.59% year-to-date to Rp1,555.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-02T08:30:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PGAS",
        "direction": "Adverse",
        "relevance": 90,
        "path": "Sengketa kontrak → kewajiban kompensasi → arus kas operasi dan kapasitas neraca",
        "rationale": "Sectors menandai peristiwa ini Bearish, Commodities, Financial Metrics, Market Sentiment, Partnerships & Agreements, Risk & Compliance pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/120211/kalah-arbitrase-kompensasi-awal-pgas-ke-gunvor-9-kargo-lng",
    "tags": [
      "Bearish",
      "Commodities",
      "Financial Metrics",
      "Market Sentiment",
      "Partnerships & Agreements",
      "Risk & Compliance"
    ]
  },
  {
    "id": "news-ws-pgas-beber-latar-pembayaran-kompensasi-gunvor",
    "title": "PGAS Ordered to Pay Compensation to Gunvor Singapore After LCIA Arbitration Rejects Force Majeure Claim",
    "summary": "Perusahaan Gas Negara (PGAS) must pay compensation to Gunvor Singapore following a partial award from the London Court of International Arbitration (LCIA) that rejected PGAS's force majeure declaration regarding LNG delivery obligations.…",
    "body": "Perusahaan Gas Negara (PGAS) must pay compensation to Gunvor Singapore following a partial award from the London Court of International Arbitration (LCIA) that rejected PGAS's force majeure declaration regarding LNG delivery obligations. The tribunal's decision covers nine LNG cargoes spanning cargoes 4-8 of 2024 and cargoes 1-4 of 2025, while reserving jurisdiction over remaining claims for 2025 through 2027 cargoes. Gunvor had previously claimed USD 130.4 million in the dispute arising from a master LNG sales and purchase agreement dated June 23, 2022, under which PGAS committed to deliver eight cargoes from January 2024 through December 2027. PGAS is currently conducting a comprehensive review with legal counsel Mayer Brown and relevant institutions to determine the impact and next steps. The award requires Gunvor to seek execution through the Central Jakarta District Court before enforcement.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-02T06:39:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PGAS",
        "direction": "Adverse",
        "relevance": 88,
        "path": "Sengketa kontrak → kewajiban kompensasi → arus kas operasi dan kapasitas neraca",
        "rationale": "Sectors menandai peristiwa ini Bearish, Commodities, Export, Partnerships & Agreements, Risk & Compliance pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/pgas-beber-latar-pembayaran-kompensasi-gunvor",
    "tags": [
      "Bearish",
      "Commodities",
      "Export",
      "Partnerships & Agreements",
      "Risk & Compliance"
    ]
  },
  {
    "id": "news-masih-lesu-simak-prospeknya-di-semester-ii-2026",
    "title": "Investment holding issuers report weak H1 2026 performance amid portfolio losses",
    "summary": "The article reports that major Indonesian investment holding companies posted deteriorated results in the first semester of 2026 due to market volatility affecting their equity portfolios. PT Provident Investasi Bersama Tbk recorded a net…",
    "body": "The article reports that major Indonesian investment holding companies posted deteriorated results in the first semester of 2026 due to market volatility affecting their equity portfolios. PT Provident Investasi Bersama Tbk recorded a net investment loss of IDR 670.61 billion and a net loss attributable to owners of IDR 881.69 billion, reversing a profit of IDR 587.36 billion a year earlier. PT Elang Mahkota Teknologi Tbk posted a net investment loss of IDR 2.28 trillion and a net loss of IDR 289.69 billion, compared with profits of IDR 1.31 trillion and IDR 4.25 trillion respectively in the same period of 2025. PT Saratoga Investama Sedaya Tbk saw net investment losses rise to IDR 4.83 trillion and a net loss of IDR 3.87 trillion, while PT Astra International Tbk reported a fair‑value loss on other investments of IDR 837 billion and an additional IDR 259 billion loss on group equity investments. The firms said they will maintain long‑term investment strategies and aim for a turnaround in semester II 2026.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-31T19:29:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "EMTK",
        "direction": "Adverse",
        "relevance": 72,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Asset Management, Bearish, Financial Metrics pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/kinerja-emiten-holding-investasi-masih-lesu-simak-prospeknya-di-semester-ii-2026",
    "tags": [
      "Asset Management",
      "Bearish",
      "Financial Metrics"
    ]
  },
  {
    "id": "filing-corporate-action-dividend-bbca",
    "title": "BBCA dividen tunai Rp25 per saham",
    "summary": "Ex-date 2026-08-31, pembayaran 2026-09-16. Jadwal distribusi tunai, bukan sinyal arah harga.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-08-31T09:00:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Mixed",
        "relevance": 92,
        "path": "Kebijakan dividen → arus kas ke pemegang saham → neraca",
        "rationale": "Sectors corporate-actions API mencatat dividen ex-date 2026-08-31, dibayar 2026-09-16. Fakta jadwal distribusi, bukan sinyal arah harga."
      }
    ],
    "source": null,
    "tags": [
      "Dividend"
    ]
  },
  {
    "id": "news-am-hari-ini-jumat-28-agustus-2026-excl-inet-hrum",
    "title": "BRI Danareksa Sekuritas recommends EXCL, INET and HRUM with bullish technical targets on 28 Aug 2026",
    "summary": "BRI Danareksa Sekuritas issued a broker recommendation on 28 August 2026 for three Indonesian equities – EXCL, INET and HRUM – citing bullish technical setups. EXCL broke out above the 2,600 level and its MA20, pulled back to 2,639‑2,707…",
    "body": "BRI Danareksa Sekuritas issued a broker recommendation on 28 August 2026 for three Indonesian equities – EXCL, INET and HRUM – citing bullish technical setups. EXCL broke out above the 2,600 level and its MA20, pulled back to 2,639‑2,707 and now targets 2,840‑2,910, while announcing the resignation of commissioner Vivek Sood. INET reversed lower, broke its neckline at 240 and surged to a breakout at 338 on high volume, setting a target range of 358‑370 and noting foreign investor buying of Rp 23.9 billion in the regular market. HRUM rebounded above its MA20 after a breakout at 895, with near‑term targets of 935 and 975, support at 895‑863, and announced an extraordinary shareholders’ meeting on 18 September 2026 at the Deutsche Bank Building in Jakarta.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-28T07:36:03+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "EXCL",
        "direction": "Supported",
        "relevance": 76,
        "path": "Gerak harga terlapor → belum ada jalur operasional",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Executive Changes, Foreign Investment, Shareholders General Meeting pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/451922/rekomendasi-saham-hari-ini-jumat-28-agustus-2026-excl-inet-hrum",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Executive Changes",
      "Foreign Investment",
      "Shareholders General Meeting"
    ]
  },
  {
    "id": "news-am-hari-ini-kamis-27-agustus-2026-smil-mapa-icbp",
    "title": "BRI Danareksa Sekuritas recommends SMIL, MAPA and ICBP with new price targets",
    "summary": "BRI Danareksa Sekuritas issued a broker recommendation for three stocks on Thursday, 27 August 2026. SMIL broke out of the 365‑390 consolidation area, stayed above the 20‑day moving average at 394, and the broker set near‑term and…",
    "body": "BRI Danareksa Sekuritas issued a broker recommendation for three stocks on Thursday, 27 August 2026. SMIL broke out of the 365‑390 consolidation area, stayed above the 20‑day moving average at 394, and the broker set near‑term and longer‑term targets of 414 and 429 rupiah respectively, noting semester‑I 2026 profit of Rp 60.08 billion and EPS of Rp 6.87. MAPA remained above its 630‑655 breakout zone, tested resistance at 690 and could advance toward 709 rupiah with support at 655, supported by a 15.1% YoY increase in net revenue to Rp 10.1 trillion. ICBP broke out above 7,750 rupiah with strong volume and a bullish MACD, targeting 7,950‑8,164 rupiah as revenue grew 11.3% YoY, prompting a revised target price of Rp 10,600.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-27T07:59:26+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ICBP",
        "direction": "Supported",
        "relevance": 78,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/451770/rekomendasi-saham-hari-ini-kamis-27-agustus-2026-smil-mapa-icbp",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-bhimata-citra-abadi-ini-alasan-dibalik-divestasi",
    "title": "Emtek sells 99.99% of PT Abhimata Citra Abadi, ending its subsidiary status",
    "summary": "Emtek announced the sale of virtually all its shares in PT Abhimata Citra Abadi, removing the company from its consolidated financial statements. The transaction, effective 20 August 2026 and disclosed on 24 August 2026, transferred…",
    "body": "Emtek announced the sale of virtually all its shares in PT Abhimata Citra Abadi, removing the company from its consolidated financial statements. The transaction, effective 20 August 2026 and disclosed on 24 August 2026, transferred 100,090 shares representing 99.99% of ACA’s paid‑up capital, valued at Rp 10,009 billion, to former director Yuslinda Nasution. Emtek said the divestment is part of a strategic portfolio optimisation and will not have material negative impact on its operations or financial condition. Following the announcement, EMTK shares fell 1.9% to Rp 515.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-26T10:18:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "EMTK",
        "direction": "Adverse",
        "relevance": 88,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bearish, Market Sentiment, Mergers & Acquisitions, Ownership, Subsidiaries pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/emtek-emtk-lepas-saham-abhimata-citra-abadi-ini-alasan-dibalik-divestasi",
    "tags": [
      "Bearish",
      "Market Sentiment",
      "Mergers & Acquisitions",
      "Ownership",
      "Subsidiaries"
    ]
  },
  {
    "id": "news-kan-ai-untuk-tingkatkan-efisiensi-dan-daya-saing",
    "title": "Elang Mahkota Teknologi Tbk expands AI use to improve efficiency and competitiveness",
    "summary": "PT Elang Mahkota Teknologi Tbk (EMTK) said it is expanding artificial‑intelligence applications across its media and health services to enhance efficiency and competitiveness, citing the VidioGen platform that cuts production time and cost…",
    "body": "PT Elang Mahkota Teknologi Tbk (EMTK) said it is expanding artificial‑intelligence applications across its media and health services to enhance efficiency and competitiveness, citing the VidioGen platform that cuts production time and cost by about 30%. For the first half of 2026 the company reported net revenue of Rp10.81 trillion, up 22.74% YoY, but posted a loss attributable to its parent owners of Rp320.60 billion after a profit of Rp4.22 trillion in the same period a year earlier.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-25T14:09:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "EMTK",
        "direction": "Adverse",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Artificial Intelligence, Bearish, Business Expansion, Digital Transformation, Financial Metrics pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260825/192/1998727/elang-mahkota-emtk-andalkan-ai-untuk-tingkatkan-efisiensi-dan-daya-saing",
    "tags": [
      "Artificial Intelligence",
      "Bearish",
      "Business Expansion",
      "Digital Transformation",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-ndasi-saham-pilihan-ipot-untuk-trading-pekan-ini",
    "title": "Indo Premier Sekuritas (IPOT) issues weekly stock recommendations for August 24‑28, 2026",
    "summary": "Indo Premier Sekuritas (IPOT) released its weekly stock picks for the trading week of 24‑28 August 2026, anticipating a bullish technical momentum for the IHSG. The firm expects the index to stay above MA5‑MA100, with support at…",
    "body": "Indo Premier Sekuritas (IPOT) released its weekly stock picks for the trading week of 24‑28 August 2026, anticipating a bullish technical momentum for the IHSG. The firm expects the index to stay above MA5‑MA100, with support at 6,429‑6,475 and a target range of 6,628‑6,666, while credit growth of 13.0% YoY in July supports domestic sentiment. IPOT recommends buying EXCL (entry Rp 2,840, target Rp 3,150, stop‑loss Rp 2,690), DSNG (entry Rp 1,440, target Rp 1,610, stop‑loss Rp 1,380), and BBNI on pull‑back (entry Rp 3,640‑3,700, target Rp 4,000, stop‑loss Rp 3,500) based on technical signals such as Doji candles, ADX above 20, EMA crossovers and a golden‑cross MACD. The broker also suggests the Premier ETF Gold Sharia Indonesia (XGLD) as a Sharia‑compliant gold exposure.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-24T08:34:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "EXCL",
        "direction": "Supported",
        "relevance": 78,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Market Sentiment, Sharia Economy pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/simak-rekomendasi-saham-pilihan-ipot-untuk-trading-pekan-ini",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Market Sentiment",
      "Sharia Economy"
    ]
  },
  {
    "id": "news-dapur-cuan-emiten-grup-salim-saham-bisa-naik-40",
    "title": "BRI Danareksa raises earnings outlook for PT Indofood CBP Sukses Makmur Tbk, sees up to 40% upside",
    "summary": "The article reports that BRI Danareksa Sekuritas upgraded its earnings estimates for PT Indofood CBP Sukses Makmur Tbk (ICBP), an issuer of the Salim Group. Revenue in the first half of 2026 grew 11.3% year‑on‑year, driven by a 20.7% rise…",
    "body": "The article reports that BRI Danareksa Sekuritas upgraded its earnings estimates for PT Indofood CBP Sukses Makmur Tbk (ICBP), an issuer of the Salim Group. Revenue in the first half of 2026 grew 11.3% year‑on‑year, driven by a 20.7% rise in overseas instant‑noodle sales and a 7% increase domestically, with foreign sales accounting for 28% of total. The analysts lifted their 2026‑27 earnings forecasts by 6.2% and introduced a new target price that implies a potential 40% share price appreciation. Management continues to project a conservative 5‑7% revenue growth for 2026, while a new Bogor plant adds 1.5 billion noodle‑pack capacity, though average selling‑price growth is expected to remain limited.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-21T19:23:58+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "ICBP",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Business Expansion, Export, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/451175/dapur-cuan-emiten-grup-salim-saham-bisa-naik-40",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Business Expansion",
      "Export",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-channel-amrt-midi-hingga-mapi-masuk-radar-analis",
    "title": "Retail Stocks Highlighted in Omnichannel Era as AMRT, MIDI and MAPI Gain Analyst Attention",
    "summary": "The article examines analysts’ view that omnichannel strategies are a positive catalyst for Indonesian retail companies. Sucor Sekuritas analyst Christofer Kojongian cites PT Sumber Alfaria Trijaya Tbk, PT Midi Utama Indonesia Tbk, PT…",
    "body": "The article examines analysts’ view that omnichannel strategies are a positive catalyst for Indonesian retail companies. Sucor Sekuritas analyst Christofer Kojongian cites PT Sumber Alfaria Trijaya Tbk, PT Midi Utama Indonesia Tbk, PT Mitra Adiperkasa Tbk, PT MAP Aktif Adiperkasa Tbk, PT Aspirasi Hidup Indonesia Tbk and ERAA as having strong membership programs and recommends BUY for AMRT (target Rp1,800), MIDI (Rp410), ERAA (Rp450) and ERAL (Rp330) while assigning HOLD to MAPI (Rp1,400), MAPA (Rp670) and ACES (Rp350). Kiwoom Sekuritas research head Liza Camelia adds that MAPI, ACES and ERAA are well positioned to benefit from omnichannel due to cross‑brand data, home‑living integration and gadget distribution, respectively. Both analysts note that successful digital‑offline integration can improve same‑store sales growth, margins and profitability despite weak consumer purchasing power, with the article dated 19 August 2026.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-19T14:05:00+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "AMRT",
        "direction": "Supported",
        "relevance": 54,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Business Expansion, Digital Transformation pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://market.bisnis.com/read/20260819/189/1997398/adu-emiten-ritel-di-era-omnichannel-amrt-midi-hingga-mapi-masuk-radar-analis",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Business Expansion",
      "Digital Transformation"
    ]
  },
  {
    "id": "news-a-amrt-di-tengah-efisiensi-dan-tekanan-daya-beli",
    "title": "Analyst adds PT Sumber Alfaria Trijaya Tbk with target Rp1,595 as expansion and cost‑efficiency drive growth despite purchasing‑power pressure",
    "summary": "The article evaluates PT Sumber Alfaria Trijaya Tbk's growth outlook amid efficiency initiatives and consumer purchasing‑power constraints. AMRT plans to open about 800 new domestic stores—over 50% outside Java—and a total of 1,080 stores…",
    "body": "The article evaluates PT Sumber Alfaria Trijaya Tbk's growth outlook amid efficiency initiatives and consumer purchasing‑power constraints. AMRT plans to open about 800 new domestic stores—over 50% outside Java—and a total of 1,080 stores including projects in the Philippines and Bangladesh, having opened 167 Alfamart and 42 Alfamidi outlets in the first half of 2026; same‑store sales growth and higher non‑food contribution are highlighted as catalysts. Consensus forecasts revenue growth of roughly 9% and net‑profit growth of about 10% by 2026 with a net margin near 2.7%, while BRI Danareksa projects annual revenue and profit increases of 6.49% and 7.5% respectively; a recent MSCI downgrade to Global Small Cap triggered short‑term foreign outflows but did not alter fundamentals. Mirae Asset analyst Nafan Aji Gusta issues an \"add\" recommendation with a target price of Rp1,595 per share.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-13T15:40:00+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "AMRT",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Business Expansion, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/menakar-prospek-sumber-alfaria-amrt-di-tengah-efisiensi-dan-tekanan-daya-beli",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Business Expansion",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-unaan-dana-hasil-ipo-nagita-buat-pelunasan-utang",
    "title": "RANS Entertainment Indonesia Discloses IPO Proceeds Allocation, Emphasizing Debt Repayment",
    "summary": "RANS Entertainment Indonesia Tbk announced how the Rp429.25 billion raised in its recent IPO will be allocated, with debt repayment being the first priority. Approximately Rp29.95 billion (6.98% of proceeds) will be used to settle existing…",
    "body": "RANS Entertainment Indonesia Tbk announced how the Rp429.25 billion raised in its recent IPO will be allocated, with debt repayment being the first priority. Approximately Rp29.95 billion (6.98% of proceeds) will be used to settle existing credit facilities, while the remaining funds are earmarked for concerts (Rp161.5 billion, 37.61%), the acquisition of a 51 % stake in PT Rans Kosmetika Indonesia (Rp85 billion, 19.80%), development of the Cipungland entertainment park (Rp80 billion, 18.64%), an AI joint‑venture with PT Feedloop Global Teknologi (Rp35 billion, 8.15%) and working‑capital support for PT Rans Nikmat Sejahtera (Rp37.8 billion). The company also confirmed a strategic partnership with PT Mayora Indah Tbk to co‑develop intellectual‑property assets across live entertainment, music and family experiences. The disclosure aligns with the prospectus and was presented by President Director Nagita Slavina on 11 August 2026.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-11T19:02:20+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "MYOR",
        "direction": "Supported",
        "relevance": 84,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Artificial Intelligence, Asset Purchase, Bullish, Capital & Funding, Credit, Joint Venture pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.cnbcindonesia.com/market/20260811180008-17-758395/rans-ungkap-penggunaan-dana-hasil-ipo-nagita-buat-pelunasan-utang",
    "tags": [
      "Artificial Intelligence",
      "Asset Purchase",
      "Bullish",
      "Capital & Funding",
      "Credit",
      "Joint Venture"
    ]
  },
  {
    "id": "news-naik-tipis-arus-kas-operasi-melejit-3158-persen",
    "title": "PT Mayora Indah Tbk reports modest net profit rise and 315.8% surge in operating cash flow",
    "summary": "PT Mayora Indah Tbk, the snack food and beverage issuer, posted H1‑2026 net profit of Rp1.70 trillion, a slight increase from Rp1.66 trillion a year earlier. Operating cash flow jumped 315.8% to Rp4.02 trillion, supported by cash receipts…",
    "body": "PT Mayora Indah Tbk, the snack food and beverage issuer, posted H1‑2026 net profit of Rp1.70 trillion, a slight increase from Rp1.66 trillion a year earlier. Operating cash flow jumped 315.8% to Rp4.02 trillion, supported by cash receipts from customers of Rp19.78 trillion, up 5.3% YoY. The company’s gross profit rose to Rp4.61 trillion, cost of goods sold fell to Rp13.30 trillion, and cash and cash equivalents grew to Rp5.60 trillion despite a reduction in total assets. Shares traded around Rp1,710 intraday, reflecting a year‑to‑date decline of about 19.7%.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-11T11:33:00+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "MYOR",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Bullish, Financial Metrics pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/laba-myor-naik-tipis-arus-kas-operasi-melejit-3158-persen",
    "tags": [
      "Bullish",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-fe-haven-sektor-konsumer-saat-rupiah-di-rp-18000",
    "title": "Maybank Sekuritas maintains buy on PT Mayora Indah Tbk with target Rp 2,500, citing consumer‑sector safe‑haven benefits as rupiah weakens to Rp…",
    "summary": "Maybank Sekuritas analyst Willy Goutama continues to recommend a buy on PT Mayora Indah Tbk, labeling it a consumer‑sector safe haven as the rupiah trades around Rp 18,000 per USD. He keeps the target price at Rp 2,500 per share, based on…",
    "body": "Maybank Sekuritas analyst Willy Goutama continues to recommend a buy on PT Mayora Indah Tbk, labeling it a consumer‑sector safe haven as the rupiah trades around Rp 18,000 per USD. He keeps the target price at Rp 2,500 per share, based on a 2026 price‑to‑earnings multiple of 17.9× and projected 2026 revenue of Rp 41.65 trillion with net profit of Rp 3.13 trillion. Recent results show Q1 2026 core profit of Rp 1.5 trillion (+38% YoY, excluding a Rp 309 billion currency gain) and a gross margin of 25.7%, up 450 basis points year‑on‑year, while Q2 2026 core profit rose 24% YoY to Rp 603 billion with a 7% sales increase. The firm also notes Mayora’s shift to net‑cash status, an EPS compound annual growth rate of 15.4% for 2025‑2028, and an expected dividend yield of 3.3‑4.4%, while warning that slower sales growth could pose a risk.",
    "category": "currency",
    "sourceType": "sectors",
    "publishedAt": "2026-08-04T14:03:00+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "MYOR",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kurs → biaya input dan pendapatan valuta → margin",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Currency & FX, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/mayora-myor-disebut-bisa-jadi-safe-haven-sektor-konsumer-saat-rupiah-di-rp-18000",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Currency & FX",
      "Financial Metrics"
    ]
  },
  {
    "id": "filing-corporate-action-dividend-tlkm",
    "title": "TLKM dividen tunai Rp223,17 per saham",
    "summary": "Ex-date 2026-06-18, pembayaran 2026-07-10. Jadwal distribusi tunai, bukan sinyal arah harga.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-06-18T09:00:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Mixed",
        "relevance": 92,
        "path": "Kebijakan dividen → arus kas ke pemegang saham → neraca",
        "rationale": "Sectors corporate-actions API mencatat dividen ex-date 2026-06-18, dibayar 2026-07-10. Fakta jadwal distribusi, bukan sinyal arah harga."
      }
    ],
    "source": null,
    "tags": [
      "Dividend"
    ]
  },
  {
    "id": "filing-corporate-action-buyback-tlkm-2026-06-08",
    "title": "TLKM RUPS menyetujui buyback (2026-06-08)",
    "summary": "RUPS 2026-06-08 menyetujui pembelian kembali saham. …complete the task.\nAgenda #5: Shareholders approved a share buyback program with a maximum budget of Rp4,000,000,000,000, including all related execution costs and regulatory compliance. The Board of Directo… Potensi menopang EPS dan memberi sinyal keyakinan manajemen; eksekusi dan harga beli aktual belum terekam.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-06-08T09:00:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Mixed",
        "relevance": 90,
        "path": "Pembelian kembali → kas dan saham beredar → neraca",
        "rationale": "Sectors corporate-actions API mencatat persetujuan buyback TLKM pada RUPS 2026-06-08. Fakta otorisasi, bukan bukti eksekusi — realisasi pembelian kembali masih harus diverifikasi."
      }
    ],
    "source": null,
    "tags": [
      "Buyback"
    ]
  },
  {
    "id": "filing-corporate-action-leadership-tlkm-2026-06-08",
    "title": "TLKM perubahan pengurus hasil RUPS (2026-06-08)",
    "summary": "RUPS 2026-06-08: Agenda #4: The Board of Commissioners, subject to Series B Shareholder approval, was authorized to appoint a Public Accounting Firm to audit the 2026 consolidated financial statements and the Micro and Small Business Fun Dampak ke eksekusi operasi masih harus diuji pada laporan berikutnya.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-06-08T09:00:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Mixed",
        "relevance": 88,
        "path": "Perubahan manajemen → eksekusi operasi → biaya",
        "rationale": "Sectors corporate-actions API mencatat keputusan pengurus TLKM pada RUPS 2026-06-08. Fakta tata kelola; jalur ke biaya/eksekusi belum terbukti dan diuji pada laba/arus kas laporan berikutnya."
      }
    ],
    "source": null,
    "tags": [
      "Leadership"
    ]
  },
  {
    "id": "filing-corporate-action-dividend-bbri",
    "title": "BBRI dividen tunai Rp209 per saham",
    "summary": "Ex-date 2026-04-21, pembayaran 2026-05-08. Jadwal distribusi tunai, bukan sinyal arah harga.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-04-21T09:00:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Mixed",
        "relevance": 92,
        "path": "Kebijakan dividen → arus kas ke pemegang saham → neraca",
        "rationale": "Sectors corporate-actions API mencatat dividen ex-date 2026-04-21, dibayar 2026-05-08. Fakta jadwal distribusi, bukan sinyal arah harga."
      }
    ],
    "source": null,
    "tags": [
      "Dividend"
    ]
  },
  {
    "id": "filing-corporate-action-buyback-adro-2026-04-17",
    "title": "ADRO RUPS menyetujui buyback (2026-04-17)",
    "summary": "RUPS 2026-04-17 menyetujui pembelian kembali saham. …ement this change.\nAgenda #6: Shareholders approved a share buyback of up to Rp5,000,000,000,000 in accordance with OJK Regulation No. 29/2023. The Board of Directors was granted authority to execute the buy… Potensi menopang EPS dan memberi sinyal keyakinan manajemen; eksekusi dan harga beli aktual belum terekam.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-04-17T09:00:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Mixed",
        "relevance": 90,
        "path": "Pembelian kembali → kas dan saham beredar → neraca",
        "rationale": "Sectors corporate-actions API mencatat persetujuan buyback ADRO pada RUPS 2026-04-17. Fakta otorisasi, bukan bukti eksekusi — realisasi pembelian kembali masih harus diverifikasi."
      }
    ],
    "source": null,
    "tags": [
      "Buyback"
    ]
  },
  {
    "id": "filing-corporate-action-leadership-adro-2026-04-17",
    "title": "ADRO perubahan pengurus hasil RUPS (2026-04-17)",
    "summary": "RUPS 2026-04-17: Agenda #3: Shareholders approved the reappointment of KAP Rintis, Jumadi, Rianto dan Rekan (PwC) and Public Accountant Firman Sababalat to audit the 2026 financial statements. Dampak ke eksekusi operasi masih harus diuji pada laporan berikutnya.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-04-17T09:00:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Mixed",
        "relevance": 88,
        "path": "Perubahan manajemen → eksekusi operasi → biaya",
        "rationale": "Sectors corporate-actions API mencatat keputusan pengurus ADRO pada RUPS 2026-04-17. Fakta tata kelola; jalur ke biaya/eksekusi belum terbukti dan diuji pada laba/arus kas laporan berikutnya."
      }
    ],
    "source": null,
    "tags": [
      "Leadership"
    ]
  },
  {
    "id": "filing-corporate-action-leadership-bbri-2026-04-10",
    "title": "BBRI perubahan pengurus hasil RUPS (2026-04-10)",
    "summary": "RUPS 2026-04-10: Agenda #4: Shareholders approved appointing Purwanto Susanti dan Surja (Ernst & Young Global) to audit the 2026 Financial Statements and PUMK Program reports. Dampak ke eksekusi operasi masih harus diuji pada laporan berikutnya.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-04-10T09:00:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Mixed",
        "relevance": 88,
        "path": "Perubahan manajemen → eksekusi operasi → biaya",
        "rationale": "Sectors corporate-actions API mencatat keputusan pengurus BBRI pada RUPS 2026-04-10. Fakta tata kelola; jalur ke biaya/eksekusi belum terbukti dan diuji pada laba/arus kas laporan berikutnya."
      }
    ],
    "source": null,
    "tags": [
      "Leadership"
    ]
  },
  {
    "id": "filing-corporate-action-buyback-bbca-2026-03-12",
    "title": "BBCA RUPS menyetujui buyback (2026-03-12)",
    "summary": "RUPS 2026-03-12 menyetujui pembelian kembali saham. …ermine honorariums.\nAgenda #5: The meeting approved a share buyback plan with a maximum budget of Rp5,000,000,000,000 and authorized the Board of Directors to execute the process and determine pricing.\nAgend… Potensi menopang EPS dan memberi sinyal keyakinan manajemen; eksekusi dan harga beli aktual belum terekam.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-03-12T09:00:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Mixed",
        "relevance": 90,
        "path": "Pembelian kembali → kas dan saham beredar → neraca",
        "rationale": "Sectors corporate-actions API mencatat persetujuan buyback BBCA pada RUPS 2026-03-12. Fakta otorisasi, bukan bukti eksekusi — realisasi pembelian kembali masih harus diverifikasi."
      }
    ],
    "source": null,
    "tags": [
      "Buyback"
    ]
  },
  {
    "id": "filing-corporate-action-leadership-bbca-2026-03-12",
    "title": "BBCA perubahan pengurus hasil RUPS (2026-03-12)",
    "summary": "RUPS 2026-03-12: Agenda #4: PwC Indonesia and Eddy Rintis were appointed to audit the company's 2026 financial records, with the Board of Commissioners authorized to appoint replacements and determine honorariums. Dampak ke eksekusi operasi masih harus diuji pada laporan berikutnya.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-03-12T09:00:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Mixed",
        "relevance": 88,
        "path": "Perubahan manajemen → eksekusi operasi → biaya",
        "rationale": "Sectors corporate-actions API mencatat keputusan pengurus BBCA pada RUPS 2026-03-12. Fakta tata kelola; jalur ke biaya/eksekusi belum terbukti dan diuji pada laba/arus kas laporan berikutnya."
      }
    ],
    "source": null,
    "tags": [
      "Leadership"
    ]
  },
  {
    "id": "commodity-coal-2025-12-15",
    "title": "Harga acuan batu bara 2025-12-15: USD100,81",
    "summary": "Harga referensi batu bara (price_usd_per_ton) bergerak 2,6% dari 2025-12-01 ke 2025-12-15, rekaman Sectors mining-commodities.",
    "body": null,
    "category": "commodity",
    "sourceType": "commodity",
    "publishedAt": "2025-12-15T00:00:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Supported",
        "relevance": 80,
        "path": "Sales of Coal (55% pendapatan ADRO) → realisasi harga → margin",
        "rationale": "Sectors mining-commodities API mencatat harga Coal (field price_usd_per_ton) berubah 2,6% dari 2025-12-01 ke 2025-12-15. Data bulanan, rekaman terbaru mendahului jendela harian Ags-Sep 2026 aplikasi ini."
      },
      {
        "symbol": "PTBA",
        "direction": "Supported",
        "relevance": 80,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors mining-commodities API mencatat harga Coal (field price_usd_per_ton) berubah 2,6% dari 2025-12-01 ke 2025-12-15. Data bulanan, rekaman terbaru mendahului jendela harian Ags-Sep 2026 aplikasi ini."
      }
    ],
    "source": null,
    "tags": [
      "Commodities"
    ]
  },
  {
    "id": "commodity-gold-2025-12-01",
    "title": "Harga acuan emas 2025-12-01: USD4.299,97",
    "summary": "Harga referensi emas (price_usd_per_ton) bergerak 5,3% dari 2025-11-01 ke 2025-12-01, rekaman Sectors mining-commodities.",
    "body": null,
    "category": "commodity",
    "sourceType": "commodity",
    "publishedAt": "2025-12-01T00:00:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 80,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors mining-commodities API mencatat harga Gold (field price_usd_per_ton) berubah 5,3% dari 2025-11-01 ke 2025-12-01. Data bulanan, rekaman terbaru mendahului jendela harian Ags-Sep 2026 aplikasi ini."
      }
    ],
    "source": null,
    "tags": [
      "Commodities"
    ]
  }
];

export const eventIdsBySymbol: Record<string, string[]> = {
  "ADRO": [
    "sentiment-attention-adro-2026-09-28",
    "news-r-id-market-455653-saham-murah-emiten-boy-thohir",
    "news-mber-cuan-baru-andy-hakim-hingga-daya-tahan-cdia",
    "news-arket-455327-adro-medc-dan-arko-berebut-panggung",
    "filing-corporate-action-buyback-adro-2026-04-17",
    "filing-corporate-action-leadership-adro-2026-04-17",
    "commodity-coal-2025-12-15"
  ],
  "AMRT": [
    "news-ari-ini-79-intip-rekomendasi-saham-mnc-sekuritas",
    "news-channel-amrt-midi-hingga-mapi-masuk-radar-analis",
    "news-a-amrt-di-tengah-efisiensi-dan-tekanan-daya-beli"
  ],
  "ANTM": [
    "flows-foreign-net-antm-2026-09-28",
    "news-antm-gali-laba-lebih-dalam-ada-target-harga-baru",
    "news-ton-emas-freeport-semester-i-catat-sales-rp50-t",
    "news-i-6633-pekan-ini-cek-saham-antm-mtel-hingga-impc",
    "commodity-gold-2025-12-01"
  ],
  "BBCA": [
    "flows-foreign-net-bbca-2026-09-28",
    "sentiment-attention-bbca-2026-09-28",
    "news-nvestor-id-market-455728-perubahan-dramatis-bbca",
    "news-612-saham-bank-central-asia-bbca-kembali-disorot",
    "news-market-455514-dividen-bbca-setelah-laba-melesat",
    "filing-corporate-action-dividend-bbca",
    "filing-corporate-action-buyback-bbca-2026-03-12",
    "filing-corporate-action-leadership-bbca-2026-03-12"
  ],
  "BBRI": [
    "flows-foreign-net-bbri-2026-09-28",
    "sentiment-attention-bbri-2026-09-28",
    "news-turun-ke-6200-asing-net-sell-jumbo-10-saham-ini",
    "news-rakyat-indonesia-bbri-ungkap-info-terkait-lapkeu",
    "news-455283-saham-bank-rakyat-indonesia-bbri-diserok",
    "filing-corporate-action-dividend-bbri",
    "filing-corporate-action-leadership-bbri-2026-04-10"
  ],
  "BMRI": [
    "sentiment-attention-bmri-2026-09-28",
    "news-ket-455662-bmri-dan-bbni-kompak-jadi-saham-murah",
    "news-455439-saham-bank-mandiri-bmri-diamdiam-diserok",
    "news-form-untuk-obligasi-himbara-soroti-kredit-kopdes",
    "filing-entstock-from-ksei-lk-08092026-3898-00-pdf-0-pdf",
    "filing-entstock-from-ksei-lk-08092026-7905-00-pdf-0-pdf"
  ],
  "BUKA": [
    "news-news-69316-emtek-perkuat-posisi-di-buka-dan-jecx",
    "news-ha-emtek-borong-803-juta-buka-kuasai-45-68-saham",
    "filing-entstock-from-ksei-lk-08092026-6401-00-pdf-0-pdf",
    "news-porsi-saham-buka-serok-803-juta-harga-atas-pasar",
    "filing-entstock-from-ksei-lk-07092026-8071-00-pdf-0-pdf"
  ],
  "EMTK": [
    "news-news-69316-emtek-perkuat-posisi-di-buka-dan-jecx",
    "news-masih-lesu-simak-prospeknya-di-semester-ii-2026",
    "news-bhimata-citra-abadi-ini-alasan-dibalik-divestasi",
    "news-kan-ai-untuk-tingkatkan-efisiensi-dan-daya-saing"
  ],
  "EXCL": [
    "news-ed-capex-2026-jadi-rp20-t-ini-fokus-investasinya",
    "news-am-hari-ini-jumat-28-agustus-2026-excl-inet-hrum",
    "news-ndasi-saham-pilihan-ipot-untuk-trading-pekan-ini"
  ],
  "GOTO": [
    "news-kan-batas-harga-jadi-rp-1-cek-support-berikutnya",
    "news-k-1-dan-dolar-as-nyaris-rp-18000-ini-penyebabnya",
    "news-iri-1-miliar-lot-jual-morgan-stanley-juga-jualan",
    "flows-foreign-net-goto-2026-09-28",
    "sentiment-attention-goto-2026-09-28",
    "filing-entstock-from-ksei-lk-28092026-8273-00-pdf-0-pdf",
    "filing-entstock-from-ksei-lk-23092026-9638-00-pdf-0-pdf"
  ],
  "ICBP": [
    "news-rugi-kurs-biaya-bahan-baku-saham-disarankan-hold",
    "news-am-hari-ini-kamis-27-agustus-2026-smil-mapa-icbp",
    "news-dapur-cuan-emiten-grup-salim-saham-bisa-naik-40"
  ],
  "INCO": [
    "sentiment-attention-inco-2026-09-28",
    "news-investor-id-market-455388-nasib-sang-raja-nikel",
    "news-3-tambang-segera-beroperasi-morowali-lebih-dulu",
    "news-ejar-proyek-hpal-pomalaa-full-produksi-pada-2027"
  ],
  "JSMR": [
    "news-ak-prospek-dan-rekomendasi-saham-jasa-marga-jsmr",
    "news-rga-jsmr-usai-gelar-transaksi-shl-rp-654-triliun",
    "news-si-shl-rp-654-triliun-simak-rekomendasi-sahamnya",
    "filing-entstock-from-ksei-lk-02092026-8460-00-pdf-0-pdf"
  ],
  "MYOR": [
    "news-unaan-dana-hasil-ipo-nagita-buat-pelunasan-utang",
    "news-naik-tipis-arus-kas-operasi-melejit-3158-persen",
    "news-fe-haven-sektor-konsumer-saat-rupiah-di-rp-18000"
  ],
  "PGAS": [
    "flows-foreign-net-pgas-2026-09-28",
    "news-m-naik-ini-prospek-saham-medc-elsa-pgas-dan-tpia",
    "news-trase-kompensasi-awal-pgas-ke-gunvor-9-kargo-lng",
    "news-ws-pgas-beber-latar-pembayaran-kompensasi-gunvor"
  ],
  "PTBA": [
    "news-pengalihan-utang-whoosh-indonesia-siapkan-plan-b",
    "news-ngi-pendapatan-batu-bara-target-diversifikasi-20",
    "news-ba-ptba-melonjak-218-persen-jadi-rp-2-65-triliun",
    "commodity-coal-2025-12-15"
  ],
  "TINS": [
    "news-s-lampaui-target-laba-bersih-melonjak-805-persen",
    "news-di-katalis-tins-pede-kinerja-akhir-2026-berkilau",
    "news-tan-melonjak-timah-tins-siapkan-revisi-rkap-2026"
  ],
  "TLKM": [
    "flows-foreign-net-tlkm-2026-09-28",
    "news-news-69316-emtek-perkuat-posisi-di-buka-dan-jecx",
    "news-00-saham-telkomsigma-di-tde-intip-arah-bisnisnya",
    "news-tlkm-perkuat-kendali-atas-telkom-data-ekosistem",
    "news-jumbo-emiten-telko-bawa-peluang-sekaligus-risiko",
    "filing-corporate-action-dividend-tlkm",
    "filing-corporate-action-buyback-tlkm-2026-06-08",
    "filing-corporate-action-leadership-tlkm-2026-06-08"
  ]
};

export const caseSymbols = [
  "ANTM",
  "BBCA",
  "BBRI",
  "GOTO",
  "PGAS",
  "TLKM"
] as const;
