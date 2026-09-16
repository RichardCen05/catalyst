// GENERATED FILE — do not edit by hand.
// Written by scripts/build_market_data.py from the recorded Sectors API responses
// in data/sectors/. Every value below is either a raw field from those recordings or
// an aggregate of them; re-run the script to refresh it.

import type { BrokerEvidence, EvidenceState, ImpactDirection, InstitutionalFlow, MarketEvent, PricePoint, Sector, SymbolCode } from "@/lib/types";

export const DATA_AS_OF = "2026-09-11T16:15:00+07:00";
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
  "2026-09-11"
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
    "symbol": "ANTM",
    "name": "Aneka Tambang Tbk.",
    "sector": "Basic Materials",
    "subsector": "Basic Materials",
    "price": 3270,
    "changePct": 0.0,
    "marketCap": 78.6,
    "analyzed": true,
    "evidenceState": "Corroborated",
    "summary": "Close 3.270 pada 2026-09-11; volume terakhir 1.40× median 27 sesi; 5 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "INCO",
    "name": "Vale Indonesia Tbk",
    "sector": "Basic Materials",
    "subsector": "Basic Materials",
    "price": 4830,
    "changePct": 0.21,
    "marketCap": 50.9,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 4.830 pada 2026-09-11; volume terakhir 1.68× median 27 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "TINS",
    "name": "PT Timah Tbk",
    "sector": "Basic Materials",
    "subsector": "Basic Materials",
    "price": 4740,
    "changePct": 1.94,
    "marketCap": 35.3,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 4.740 pada 2026-09-11; volume terakhir 1.23× median 27 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BBCA",
    "name": "PT Bank Central Asia Tbk.",
    "sector": "Financials",
    "subsector": "Banks",
    "price": 6325,
    "changePct": -1.56,
    "marketCap": 771.9,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 6.325 pada 2026-09-11; volume terakhir 1.87× median 27 sesi; 8 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BBRI",
    "name": "PT Bank Rakyat Indonesia (Persero) Tbk",
    "sector": "Financials",
    "subsector": "Banks",
    "price": 3270,
    "changePct": -1.51,
    "marketCap": 490.6,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 3.270 pada 2026-09-11; volume terakhir 1.37× median 27 sesi; 7 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BMRI",
    "name": "PT Bank Mandiri (Persero) Tbk",
    "sector": "Financials",
    "subsector": "Banks",
    "price": 4360,
    "changePct": -0.23,
    "marketCap": 402.9,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 4.360 pada 2026-09-11; volume terakhir 1.09× median 27 sesi; 6 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "TLKM",
    "name": "PT Telkom Indonesia (Persero) Tbk",
    "sector": "Infrastructure",
    "subsector": "Telecommunication",
    "price": 2600,
    "changePct": -1.14,
    "marketCap": 257.6,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 2.600 pada 2026-09-11; volume terakhir 1.04× median 27 sesi; 8 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "JSMR",
    "name": "PT Jasa Marga Tbk",
    "sector": "Infrastructure",
    "subsector": "Transportation Infrastructure",
    "price": 2950,
    "changePct": -1.34,
    "marketCap": 21.4,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 2.950 pada 2026-09-11; volume terakhir 0.72× median 27 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "EXCL",
    "name": "PT XLSMART Telecom Sejahtera Tbk",
    "sector": "Infrastructure",
    "subsector": "Telecommunication",
    "price": 2630,
    "changePct": -2.59,
    "marketCap": 47.9,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 2.630 pada 2026-09-11; volume terakhir 1.27× median 27 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "GOTO",
    "name": "PT GoTo Gojek Tokopedia Tbk",
    "sector": "Technology",
    "subsector": "Software & IT Services",
    "price": 50,
    "changePct": 0.0,
    "marketCap": 57.0,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 50 pada 2026-09-11; volume terakhir 0.19× median 27 sesi; 6 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "BUKA",
    "name": "PT Bukalapak.com Tbk",
    "sector": "Technology",
    "subsector": "Software & IT Services",
    "price": 107,
    "changePct": -1.83,
    "marketCap": 11.0,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 107 pada 2026-09-11; volume terakhir 0.77× median 27 sesi; 6 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "EMTK",
    "name": "Elang Mahkota Teknologi Tbk",
    "sector": "Technology",
    "subsector": "Software & IT Services",
    "price": 500,
    "changePct": 0.0,
    "marketCap": 30.7,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 500 pada 2026-09-11; volume terakhir 1.20× median 27 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "PGAS",
    "name": "PT Perusahaan Gas Negara Tbk",
    "sector": "Energy",
    "subsector": "Oil, Gas & Coal",
    "price": 1520,
    "changePct": 0.33,
    "marketCap": 36.8,
    "analyzed": true,
    "evidenceState": "Mixed Evidence",
    "summary": "Close 1.520 pada 2026-09-11; volume terakhir 0.90× median 27 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "ADRO",
    "name": "Alamtri Resources Indonesia Tbk",
    "sector": "Energy",
    "subsector": "Oil, Gas & Coal",
    "price": 2640,
    "changePct": -1.12,
    "marketCap": 76.0,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 2.640 pada 2026-09-11; volume terakhir 0.89× median 27 sesi; 7 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "PTBA",
    "name": "Bukit Asam Tbk",
    "sector": "Energy",
    "subsector": "Oil, Gas & Coal",
    "price": 3100,
    "changePct": 0.0,
    "marketCap": 35.7,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 3.100 pada 2026-09-11; volume terakhir 3.54× median 27 sesi; 4 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "ICBP",
    "name": "Indofood CBP Sukses Makmur Tbk",
    "sector": "Consumer",
    "subsector": "Food & Beverage",
    "price": 7125,
    "changePct": -0.7,
    "marketCap": 83.1,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 7.125 pada 2026-09-11; volume terakhir 0.42× median 27 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "MYOR",
    "name": "Mayora Indah Tbk",
    "sector": "Consumer",
    "subsector": "Food & Beverage",
    "price": 1515,
    "changePct": -0.98,
    "marketCap": 33.9,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 1.515 pada 2026-09-11; volume terakhir 1.99× median 27 sesi; 3 peristiwa terhubung pada jendela ini."
  },
  {
    "symbol": "AMRT",
    "name": "PT Sumber Alfaria Trijaya Tbk.",
    "sector": "Consumer",
    "subsector": "Food & Staples Retailing",
    "price": 1255,
    "changePct": -3.46,
    "marketCap": 52.1,
    "analyzed": false,
    "evidenceState": "Insufficient Evidence",
    "summary": "Close 1.255 pada 2026-09-11; volume terakhir 0.82× median 27 sesi; 3 peristiwa terhubung pada jendela ini."
  }
];

export const priceSeries: Record<string, PricePoint[]> = {
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
    }
  ],
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
    }
  ]
};

export const brokerEvidence: Record<string, BrokerEvidence & { windowStart: string; windowEnd: string }> = {
  "ANTM": {
    "buyers": [
      {
        "code": "CC",
        "origin": "local",
        "value": 2886424188000,
        "buyIdr": 2886424188000,
        "sellIdr": 2491559254000,
        "netIdr": 394864934000
      },
      {
        "code": "AK",
        "origin": "foreign",
        "value": 2585686056000,
        "buyIdr": 2585686056000,
        "sellIdr": 2341861079000,
        "netIdr": 243824977000
      },
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 1652874687000,
        "buyIdr": 1652874687000,
        "sellIdr": 1582498403000,
        "netIdr": 70376284000
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 837202001000,
        "buyIdr": 837202001000,
        "sellIdr": 369602045000,
        "netIdr": 467599956000
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 725096559000,
        "buyIdr": 725096559000,
        "sellIdr": 623908620000,
        "netIdr": 101187939000
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 586545015000,
        "buyIdr": 586545015000,
        "sellIdr": 154322381000,
        "netIdr": 432222634000
      },
      {
        "code": "DR",
        "origin": "foreign",
        "value": 391349562000,
        "buyIdr": 391349562000,
        "sellIdr": 310858494000,
        "netIdr": 80491068000
      },
      {
        "code": "CP",
        "origin": "foreign",
        "value": 318694191000,
        "buyIdr": 318694191000,
        "sellIdr": 302117297000,
        "netIdr": 16576894000
      },
      {
        "code": "KK",
        "origin": "foreign",
        "value": 284928039000,
        "buyIdr": 284928039000,
        "sellIdr": 228974895000,
        "netIdr": 55953144000
      },
      {
        "code": "GR",
        "origin": "local",
        "value": 229044992000,
        "buyIdr": 229044992000,
        "sellIdr": 204265969000,
        "netIdr": 24779023000
      }
    ],
    "sellers": [
      {
        "code": "PD",
        "origin": "local",
        "value": 949677786000,
        "buyIdr": 571609274000,
        "sellIdr": 949677786000,
        "netIdr": -378068512000
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 615977769000,
        "buyIdr": 472925699000,
        "sellIdr": 615977769000,
        "netIdr": -143052070000
      },
      {
        "code": "LG",
        "origin": "local",
        "value": 613119937000,
        "buyIdr": 381700530000,
        "sellIdr": 613119937000,
        "netIdr": -231419407000
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 482217161000,
        "buyIdr": 366021834000,
        "sellIdr": 482217161000,
        "netIdr": -116195327000
      },
      {
        "code": "AZ",
        "origin": "local",
        "value": 463372499000,
        "buyIdr": 257186727000,
        "sellIdr": 463372499000,
        "netIdr": -206185772000
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 394478600000,
        "buyIdr": 178838942000,
        "sellIdr": 394478600000,
        "netIdr": -215639658000
      },
      {
        "code": "RX",
        "origin": "foreign",
        "value": 290739254000,
        "buyIdr": 126548375000,
        "sellIdr": 290739254000,
        "netIdr": -164190879000
      },
      {
        "code": "AI",
        "origin": "foreign",
        "value": 216839467000,
        "buyIdr": 138598867000,
        "sellIdr": 216839467000,
        "netIdr": -78240600000
      },
      {
        "code": "DH",
        "origin": "local",
        "value": 129654529000,
        "buyIdr": 77721333000,
        "sellIdr": 129654529000,
        "netIdr": -51933196000
      },
      {
        "code": "AF",
        "origin": "local",
        "value": 87277587000,
        "buyIdr": 6606839000,
        "sellIdr": 87277587000,
        "netIdr": -80670748000
      }
    ],
    "netForeign": 299990321000,
    "totalMarketValue": 9705181059000,
    "freeFloatShares": 8410767653.749999,
    "sharesOutstanding": 24030764725.0,
    "referencePrice": 3270,
    "windowStart": "2026-06-15",
    "windowEnd": "2026-09-13"
  },
  "BBCA": {
    "buyers": [
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 11625066207500,
        "buyIdr": 11625066207500,
        "sellIdr": 9542643340000,
        "netIdr": 2082422867500
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 6021413449000,
        "buyIdr": 6021413449000,
        "sellIdr": 3678431981500,
        "netIdr": 2342981467500
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 3581007184500,
        "buyIdr": 3581007184500,
        "sellIdr": 448852033500,
        "netIdr": 3132155151000
      },
      {
        "code": "RX",
        "origin": "foreign",
        "value": 2740245458500,
        "buyIdr": 2740245458500,
        "sellIdr": 2618644130000,
        "netIdr": 121601328500
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 2564911724000,
        "buyIdr": 2564911724000,
        "sellIdr": 1640503252000,
        "netIdr": 924408472000
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 1832332177500,
        "buyIdr": 1832332177500,
        "sellIdr": 1168819706000,
        "netIdr": 663512471500
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 1606710927500,
        "buyIdr": 1606710927500,
        "sellIdr": 1445575546500,
        "netIdr": 161135381000
      },
      {
        "code": "AZ",
        "origin": "local",
        "value": 646453079000,
        "buyIdr": 646453079000,
        "sellIdr": 525109601500,
        "netIdr": 121343477500
      },
      {
        "code": "DR",
        "origin": "foreign",
        "value": 639686133000,
        "buyIdr": 639686133000,
        "sellIdr": 469812472500,
        "netIdr": 169873660500
      },
      {
        "code": "IF",
        "origin": "local",
        "value": 450365181000,
        "buyIdr": 450365181000,
        "sellIdr": 323723744500,
        "netIdr": 126641436500
      }
    ],
    "sellers": [
      {
        "code": "AK",
        "origin": "foreign",
        "value": 14503228880000,
        "buyIdr": 10417606887000,
        "sellIdr": 14503228880000,
        "netIdr": -4085621993000
      },
      {
        "code": "CC",
        "origin": "local",
        "value": 8056345626500,
        "buyIdr": 7432866226000,
        "sellIdr": 8056345626500,
        "netIdr": -623479400500
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 8044379798500,
        "buyIdr": 5704892063500,
        "sellIdr": 8044379798500,
        "netIdr": -2339487735000
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 3451150195500,
        "buyIdr": 3119904255000,
        "sellIdr": 3451150195500,
        "netIdr": -331245940500
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 3067367733500,
        "buyIdr": 2686991482000,
        "sellIdr": 3067367733500,
        "netIdr": -380376251500
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 2851671950500,
        "buyIdr": 2054567628500,
        "sellIdr": 2851671950500,
        "netIdr": -797104322000
      },
      {
        "code": "XC",
        "origin": "local",
        "value": 1744660735500,
        "buyIdr": 1563357755500,
        "sellIdr": 1744660735500,
        "netIdr": -181302980000
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 1143624792000,
        "buyIdr": 959591585500,
        "sellIdr": 1143624792000,
        "netIdr": -184033206500
      },
      {
        "code": "MG",
        "origin": "local",
        "value": 856681264500,
        "buyIdr": 761143865500,
        "sellIdr": 856681264500,
        "netIdr": -95537399000
      },
      {
        "code": "AI",
        "origin": "foreign",
        "value": 460270844500,
        "buyIdr": 230725078500,
        "sellIdr": 460270844500,
        "netIdr": -229545766000
      }
    ],
    "netForeign": 1289788970000,
    "totalMarketValue": 19894607862500,
    "freeFloatShares": 54482123342.79,
    "sharesOutstanding": 122042299500.0,
    "referencePrice": 6325,
    "windowStart": "2026-06-07",
    "windowEnd": "2026-09-05",
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
        "code": "CC",
        "origin": "local",
        "value": 6824489161000,
        "buyIdr": 6824489161000,
        "sellIdr": 6476722351000,
        "netIdr": 347766810000
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 3730051038000,
        "buyIdr": 3730051038000,
        "sellIdr": 3410294975000,
        "netIdr": 319756063000
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 3446313328000,
        "buyIdr": 3446313328000,
        "sellIdr": 2664060606000,
        "netIdr": 782252722000
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 3166780511000,
        "buyIdr": 3166780511000,
        "sellIdr": 2926576997000,
        "netIdr": 240203514000
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 1828594136000,
        "buyIdr": 1828594136000,
        "sellIdr": 1556002453000,
        "netIdr": 272591683000
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 1260999390000,
        "buyIdr": 1260999390000,
        "sellIdr": 711259648000,
        "netIdr": 549739742000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 1258240912000,
        "buyIdr": 1258240912000,
        "sellIdr": 1085680660000,
        "netIdr": 172560252000
      },
      {
        "code": "RX",
        "origin": "foreign",
        "value": 1190592802000,
        "buyIdr": 1190592802000,
        "sellIdr": 1007429882000,
        "netIdr": 183162920000
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 1008530641000,
        "buyIdr": 1008530641000,
        "sellIdr": 838278982000,
        "netIdr": 170251659000
      },
      {
        "code": "AG",
        "origin": "foreign",
        "value": 312139557000,
        "buyIdr": 312139557000,
        "sellIdr": 142491590000,
        "netIdr": 169647967000
      }
    ],
    "sellers": [
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 7070507531000,
        "buyIdr": 6266781870000,
        "sellIdr": 7070507531000,
        "netIdr": -803725661000
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 2600094426000,
        "buyIdr": 466419972000,
        "sellIdr": 2600094426000,
        "netIdr": -2133674454000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 2263553648000,
        "buyIdr": 2105028617000,
        "sellIdr": 2263553648000,
        "netIdr": -158525031000
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 1728996068000,
        "buyIdr": 1032184127000,
        "sellIdr": 1728996068000,
        "netIdr": -696811941000
      },
      {
        "code": "CP",
        "origin": "foreign",
        "value": 723230496000,
        "buyIdr": 683107674000,
        "sellIdr": 723230496000,
        "netIdr": -40122822000
      },
      {
        "code": "TP",
        "origin": "foreign",
        "value": 525146035000,
        "buyIdr": 442309277000,
        "sellIdr": 525146035000,
        "netIdr": -82836758000
      },
      {
        "code": "XA",
        "origin": "foreign",
        "value": 409010916000,
        "buyIdr": 379399234000,
        "sellIdr": 409010916000,
        "netIdr": -29611682000
      },
      {
        "code": "YB",
        "origin": "local",
        "value": 111198504000,
        "buyIdr": 87185738000,
        "sellIdr": 111198504000,
        "netIdr": -24012766000
      },
      {
        "code": "HP",
        "origin": "local",
        "value": 103613885000,
        "buyIdr": 86645905000,
        "sellIdr": 103613885000,
        "netIdr": -16967980000
      },
      {
        "code": "AT",
        "origin": "local",
        "value": 97963509000,
        "buyIdr": 66462875000,
        "sellIdr": 97963509000,
        "netIdr": -31500634000
      }
    ],
    "netForeign": 1559521131000,
    "totalMarketValue": 17145763058000,
    "freeFloatShares": 70160299258.0812,
    "sharesOutstanding": 150043411587.0,
    "referencePrice": 3270,
    "windowStart": "2026-06-07",
    "windowEnd": "2026-09-05",
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
  "TLKM": {
    "buyers": [
      {
        "code": "CC",
        "origin": "local",
        "value": 2607839688000,
        "buyIdr": 2607839688000,
        "sellIdr": 2255063661000,
        "netIdr": 352776027000
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 1977104460000,
        "buyIdr": 1977104460000,
        "sellIdr": 1679087717000,
        "netIdr": 298016743000
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 849719953000,
        "buyIdr": 849719953000,
        "sellIdr": 627065702000,
        "netIdr": 222654251000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 539042768000,
        "buyIdr": 539042768000,
        "sellIdr": 455932625000,
        "netIdr": 83110143000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 461245789000,
        "buyIdr": 461245789000,
        "sellIdr": 369378479000,
        "netIdr": 91867310000
      },
      {
        "code": "XC",
        "origin": "local",
        "value": 409034792000,
        "buyIdr": 409034792000,
        "sellIdr": 334046883000,
        "netIdr": 74987909000
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 332347489000,
        "buyIdr": 332347489000,
        "sellIdr": 259480983000,
        "netIdr": 72866506000
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 257621101000,
        "buyIdr": 257621101000,
        "sellIdr": 181931050000,
        "netIdr": 75690051000
      },
      {
        "code": "LG",
        "origin": "local",
        "value": 184301971000,
        "buyIdr": 184301971000,
        "sellIdr": 71492143000,
        "netIdr": 112809828000
      },
      {
        "code": "SH",
        "origin": "local",
        "value": 72408565000,
        "buyIdr": 72408565000,
        "sellIdr": 6545595000,
        "netIdr": 65862970000
      }
    ],
    "sellers": [
      {
        "code": "AK",
        "origin": "foreign",
        "value": 3934228133000,
        "buyIdr": 3712252919000,
        "sellIdr": 3934228133000,
        "netIdr": -221975214000
      },
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 3137180383000,
        "buyIdr": 2635056438000,
        "sellIdr": 3137180383000,
        "netIdr": -502123945000
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 2206522575000,
        "buyIdr": 2094969521000,
        "sellIdr": 2206522575000,
        "netIdr": -111553054000
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 1128200479000,
        "buyIdr": 551735754000,
        "sellIdr": 1128200479000,
        "netIdr": -576464725000
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 686932448000,
        "buyIdr": 608803964000,
        "sellIdr": 686932448000,
        "netIdr": -78128484000
      },
      {
        "code": "TP",
        "origin": "foreign",
        "value": 260836175000,
        "buyIdr": 177910578000,
        "sellIdr": 260836175000,
        "netIdr": -82925597000
      },
      {
        "code": "AG",
        "origin": "foreign",
        "value": 214990229000,
        "buyIdr": 131663371000,
        "sellIdr": 214990229000,
        "netIdr": -83326858000
      },
      {
        "code": "SS",
        "origin": "local",
        "value": 113209619000,
        "buyIdr": 59124459000,
        "sellIdr": 113209619000,
        "netIdr": -54085160000
      },
      {
        "code": "BQ",
        "origin": "foreign",
        "value": 110882566000,
        "buyIdr": 56008753000,
        "sellIdr": 110882566000,
        "netIdr": -54873813000
      },
      {
        "code": "IU",
        "origin": "local",
        "value": 20167085000,
        "buyIdr": 1542702000,
        "sellIdr": 20167085000,
        "netIdr": -18624383000
      }
    ],
    "netForeign": -481094325000,
    "totalMarketValue": 6961866415000,
    "freeFloatShares": 41259413213.9,
    "sharesOutstanding": 99062216600.0,
    "referencePrice": 2600,
    "windowStart": "2026-06-07",
    "windowEnd": "2026-09-05",
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
  },
  "GOTO": {
    "buyers": [
      {
        "code": "YU",
        "origin": "foreign",
        "value": 79996865000,
        "buyIdr": 79996865000,
        "sellIdr": 13712080000,
        "netIdr": 66284785000
      },
      {
        "code": "BK",
        "origin": "foreign",
        "value": 54600970000,
        "buyIdr": 54600970000,
        "sellIdr": 0,
        "netIdr": 54600970000
      },
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 38133630000,
        "buyIdr": 38133630000,
        "sellIdr": 15091405000,
        "netIdr": 23042225000
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 26751385000,
        "buyIdr": 26751385000,
        "sellIdr": 17919025000,
        "netIdr": 8832360000
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 18100870000,
        "buyIdr": 18100870000,
        "sellIdr": 0,
        "netIdr": 18100870000
      },
      {
        "code": "CC",
        "origin": "local",
        "value": 14500345000,
        "buyIdr": 14500345000,
        "sellIdr": 0,
        "netIdr": 14500345000
      },
      {
        "code": "AK",
        "origin": "foreign",
        "value": 9463220000,
        "buyIdr": 9463220000,
        "sellIdr": 258915000,
        "netIdr": 9204305000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 7779310000,
        "buyIdr": 7779310000,
        "sellIdr": 19500000,
        "netIdr": 7759810000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 5985635000,
        "buyIdr": 5985635000,
        "sellIdr": 250000000,
        "netIdr": 5735635000
      },
      {
        "code": "SQ",
        "origin": "local",
        "value": 5222455000,
        "buyIdr": 5222455000,
        "sellIdr": 0,
        "netIdr": 5222455000
      }
    ],
    "sellers": [
      {
        "code": "YB",
        "origin": "local",
        "value": 74050610000,
        "buyIdr": 271175000,
        "sellIdr": 74050610000,
        "netIdr": -73779435000
      },
      {
        "code": "MG",
        "origin": "local",
        "value": 59486525000,
        "buyIdr": 1139545000,
        "sellIdr": 59486525000,
        "netIdr": -58346980000
      },
      {
        "code": "OD",
        "origin": "local",
        "value": 29369475000,
        "buyIdr": 2351805000,
        "sellIdr": 29369475000,
        "netIdr": -27017670000
      },
      {
        "code": "CP",
        "origin": "foreign",
        "value": 14713060000,
        "buyIdr": 1570320000,
        "sellIdr": 14713060000,
        "netIdr": -13142740000
      },
      {
        "code": "RB",
        "origin": "local",
        "value": 14537930000,
        "buyIdr": 80000,
        "sellIdr": 14537930000,
        "netIdr": -14537850000
      },
      {
        "code": "MU",
        "origin": "local",
        "value": 11224955000,
        "buyIdr": 110000,
        "sellIdr": 11224955000,
        "netIdr": -11224845000
      },
      {
        "code": "AZ",
        "origin": "local",
        "value": 9862095000,
        "buyIdr": 3006730000,
        "sellIdr": 9862095000,
        "netIdr": -6855365000
      },
      {
        "code": "PI",
        "origin": "local",
        "value": 9860465000,
        "buyIdr": 570000,
        "sellIdr": 9860465000,
        "netIdr": -9859895000
      },
      {
        "code": "IU",
        "origin": "local",
        "value": 8535815000,
        "buyIdr": 34470000,
        "sellIdr": 8535815000,
        "netIdr": -8501345000
      },
      {
        "code": "HD",
        "origin": "foreign",
        "value": 7733095000,
        "buyIdr": 2650000,
        "sellIdr": 7733095000,
        "netIdr": -7730445000
      }
    ],
    "netForeign": 5198490000,
    "totalMarketValue": 33626390000,
    "freeFloatShares": 921811314567.204,
    "sharesOutstanding": 1140573267220.0,
    "referencePrice": 50,
    "windowStart": "2026-06-15",
    "windowEnd": "2026-09-13"
  },
  "PGAS": {
    "buyers": [
      {
        "code": "BK",
        "origin": "foreign",
        "value": 240288178500,
        "buyIdr": 240288178500,
        "sellIdr": 217577384000,
        "netIdr": 22710794500
      },
      {
        "code": "XL",
        "origin": "local",
        "value": 231097938000,
        "buyIdr": 231097938000,
        "sellIdr": 161073139000,
        "netIdr": 70024799000
      },
      {
        "code": "YP",
        "origin": "foreign",
        "value": 134368622000,
        "buyIdr": 134368622000,
        "sellIdr": 108201674500,
        "netIdr": 26166947500
      },
      {
        "code": "NI",
        "origin": "local",
        "value": 87427995500,
        "buyIdr": 87427995500,
        "sellIdr": 66069821500,
        "netIdr": 21358174000
      },
      {
        "code": "XC",
        "origin": "local",
        "value": 87397785000,
        "buyIdr": 87397785000,
        "sellIdr": 72589155000,
        "netIdr": 14808630000
      },
      {
        "code": "GR",
        "origin": "local",
        "value": 82040763000,
        "buyIdr": 82040763000,
        "sellIdr": 22897719500,
        "netIdr": 59143043500
      },
      {
        "code": "LG",
        "origin": "local",
        "value": 55110462500,
        "buyIdr": 55110462500,
        "sellIdr": 28444075500,
        "netIdr": 26666387000
      },
      {
        "code": "KK",
        "origin": "foreign",
        "value": 55064240500,
        "buyIdr": 55064240500,
        "sellIdr": 28175840500,
        "netIdr": 26888400000
      },
      {
        "code": "DH",
        "origin": "local",
        "value": 52323613500,
        "buyIdr": 52323613500,
        "sellIdr": 19198531500,
        "netIdr": 33125082000
      },
      {
        "code": "EP",
        "origin": "local",
        "value": 48637934000,
        "buyIdr": 48637934000,
        "sellIdr": 15435789000,
        "netIdr": 33202145000
      }
    ],
    "sellers": [
      {
        "code": "ZP",
        "origin": "foreign",
        "value": 232294098000,
        "buyIdr": 157695589000,
        "sellIdr": 232294098000,
        "netIdr": -74598509000
      },
      {
        "code": "BB",
        "origin": "foreign",
        "value": 200066265000,
        "buyIdr": 36103775000,
        "sellIdr": 200066265000,
        "netIdr": -163962490000
      },
      {
        "code": "YU",
        "origin": "foreign",
        "value": 181305021000,
        "buyIdr": 159758752000,
        "sellIdr": 181305021000,
        "netIdr": -21546269000
      },
      {
        "code": "PD",
        "origin": "local",
        "value": 140822210000,
        "buyIdr": 115627488500,
        "sellIdr": 140822210000,
        "netIdr": -25194721500
      },
      {
        "code": "RX",
        "origin": "foreign",
        "value": 108218245000,
        "buyIdr": 49483732000,
        "sellIdr": 108218245000,
        "netIdr": -58734513000
      },
      {
        "code": "KZ",
        "origin": "foreign",
        "value": 56840300500,
        "buyIdr": 40952790500,
        "sellIdr": 56840300500,
        "netIdr": -15887510000
      },
      {
        "code": "AI",
        "origin": "foreign",
        "value": 41003899000,
        "buyIdr": 10624107000,
        "sellIdr": 41003899000,
        "netIdr": -30379792000
      },
      {
        "code": "AG",
        "origin": "foreign",
        "value": 26951885500,
        "buyIdr": 15164309000,
        "sellIdr": 26951885500,
        "netIdr": -11787576500
      },
      {
        "code": "DX",
        "origin": "local",
        "value": 25981301500,
        "buyIdr": 6762045000,
        "sellIdr": 25981301500,
        "netIdr": -19219256500
      },
      {
        "code": "AO",
        "origin": "local",
        "value": 13709617500,
        "buyIdr": 6506821500,
        "sellIdr": 13709617500,
        "netIdr": -7202796000
      }
    ],
    "netForeign": -106177979000,
    "totalMarketValue": 1280798000000,
    "freeFloatShares": 10431363391.82076,
    "sharesOutstanding": 24241508196.0,
    "referencePrice": 1520,
    "windowStart": "2026-06-15",
    "windowEnd": "2026-09-13"
  }
};

export const institutionalFlows: Record<string, InstitutionalFlow[]> = {
  "ANTM": [],
  "INCO": [],
  "TINS": [],
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
  "TLKM": [],
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
  "EXCL": [],
  "GOTO": [
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
  "PGAS": [],
  "ADRO": [],
  "PTBA": [],
  "ICBP": [],
  "MYOR": [],
  "AMRT": []
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
  ]
};

export const sectorReturns: Record<string, number> = {
  "Infrastructure": -0.022054,
  "Energy": -0.00472,
  "Consumer": -0.021312,
  "Financials": -0.040221,
  "Basic Materials": 0.041557,
  "Technology": -0.018821
};

export const subsectorReturns: Record<string, number> = {
  "Telecommunication": -0.022203,
  "Software & IT Services": -0.018821,
  "Transportation Infrastructure": -0.019934,
  "Oil, Gas & Coal": -0.00472,
  "Food & Staples Retailing": -0.041985,
  "Food & Beverage": -0.012101,
  "Basic Materials": 0.041557,
  "Banks": -0.040221
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
  ],
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
  ]
};

export const betas: Record<string, number> = {
  "ANTM": 0.95,
  "INCO": 1.48,
  "TINS": 0.46,
  "BBCA": 0.74,
  "BBRI": 0.95,
  "BMRI": 0.71,
  "TLKM": 0.52,
  "JSMR": 0.72,
  "EXCL": 1.43,
  "GOTO": 0.0,
  "BUKA": 1.55,
  "EMTK": 1.79,
  "PGAS": 0.66,
  "ADRO": 0.77,
  "PTBA": 0.81,
  "ICBP": 0.13,
  "MYOR": 0.65,
  "AMRT": 1.08
};

export const rawEvents: RawEvent[] = [
  {
    "id": "news-k-mandiri-bmri-terbitkan-surat-utang-usd750-juta",
    "title": "Bank Mandiri Issues USD750 Million Perpetual Bond to Strengthen Capital",
    "summary": "PT Bank Mandiri (Persero) Tbk. issued a USD750 million perpetual bond on September 10, 2026, as Additional Tier 1 capital to strengthen its capital structure. The bond carries an initial distribution rate of 7.35% per year and was offered…",
    "body": "PT Bank Mandiri (Persero) Tbk. issued a USD750 million perpetual bond on September 10, 2026, as Additional Tier 1 capital to strengthen its capital structure. The bond carries an initial distribution rate of 7.35% per year and was offered to investors outside the United States under Regulation S, with listing on the Singapore Exchange. Proceeds will be used to reinforce the bank's capital position in accordance with OJK Regulation No. 11/POJK.03/2016. The issuance, arranged by HSBC, J.P. Morgan Securities, Mandiri Securities, and Standard Chartered Bank, falls below the 20% equity threshold and does not constitute a material transaction under OJK Regulation No. 17/POJK.04/2020.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T21:00:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bonds, Bullish, Capital & Funding, Debt Issuance, Politics & Regulation pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/perkuat-modal-bank-mandiri-bmri-terbitkan-surat-utang-usd750-juta",
    "tags": [
      "Bonds",
      "Bullish",
      "Capital & Funding",
      "Debt Issuance",
      "Politics & Regulation"
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
    "id": "flows-foreign-net-antm-2026-09-11",
    "title": "Arus asing neto ANTM Rp300,0M pada jendela 2026-08-03–2026-09-11",
    "summary": "Neto asing Rp300,0M ≈ 3,1% dari nilai transaksi Rp9,7T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing ANTM Rp300,0M pada jendela 2026-08-03–2026-09-11. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-bbca-2026-09-11",
    "title": "Arus asing neto BBCA Rp1,3T pada jendela 2026-08-03–2026-09-11",
    "summary": "Neto asing Rp1,3T ≈ 6,5% dari nilai transaksi Rp19,9T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Supported",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing BBCA Rp1,3T pada jendela 2026-08-03–2026-09-11. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-bbri-2026-09-11",
    "title": "Arus asing neto BBRI Rp1,6T pada jendela 2026-08-03–2026-09-11",
    "summary": "Neto asing Rp1,6T ≈ 9,1% dari nilai transaksi Rp17,1T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Supported",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing BBRI Rp1,6T pada jendela 2026-08-03–2026-09-11. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-tlkm-2026-09-11",
    "title": "Arus asing neto TLKM Rp-481,1M pada jendela 2026-08-03–2026-09-11",
    "summary": "Neto asing Rp-481,1M ≈ 6,9% dari nilai transaksi Rp7,0T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Adverse",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing TLKM Rp-481,1M pada jendela 2026-08-03–2026-09-11. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-goto-2026-09-11",
    "title": "Arus asing neto GOTO Rp5,2M pada jendela 2026-08-03–2026-09-11",
    "summary": "Neto asing Rp5,2M ≈ 15,5% dari nilai transaksi Rp33,6M pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Supported",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing GOTO Rp5,2M pada jendela 2026-08-03–2026-09-11. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "flows-foreign-net-pgas-2026-09-11",
    "title": "Arus asing neto PGAS Rp-106,2M pada jendela 2026-08-03–2026-09-11",
    "summary": "Neto asing Rp-106,2M ≈ 8,3% dari nilai transaksi Rp1,3T pada jendela aplikasi, Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya,",
    "body": null,
    "category": "flows",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PGAS",
        "direction": "Adverse",
        "relevance": 80,
        "path": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
        "rationale": "Sectors foreign-flow API mencatat neto asing PGAS Rp-106,2M pada jendela 2026-08-03–2026-09-11. Fakta arus; bukan atribusi niat pembeli/penjual."
      }
    ],
    "source": null,
    "tags": [
      "Foreign Flow"
    ]
  },
  {
    "id": "sentiment-attention-bbca-2026-09-11",
    "title": "Lonjakan liputan BBCA: 19 berita 7 hari terakhir (vs 1 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 19 item BBCA pada 2026-09-05–2026-09-11 vs 1 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
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
    "id": "sentiment-attention-bbri-2026-09-11",
    "title": "Lonjakan liputan BBRI: 19 berita 7 hari terakhir (vs 1 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 19 item BBRI pada 2026-09-05–2026-09-11 vs 1 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk BBRI: 19 vs 1 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "sentiment-attention-bmri-2026-09-11",
    "title": "Lonjakan liputan BMRI: 20 berita 7 hari terakhir (vs 0 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 20 item BMRI pada 2026-09-05–2026-09-11 vs 0 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
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
    "id": "sentiment-attention-tlkm-2026-09-11",
    "title": "Lonjakan liputan TLKM: 20 berita 7 hari terakhir (vs 0 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 20 item TLKM pada 2026-09-05–2026-09-11 vs 0 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk TLKM: 20 vs 0 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "sentiment-attention-buka-2026-09-11",
    "title": "Lonjakan liputan BUKA: 6 berita 7 hari terakhir (vs 2 pekan sebelumnya)",
    "summary": "Sectors news API mencatat 6 item BUKA pada 2026-09-05–2026-09-11 vs 2 pada 7 hari sebelumnya. Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional.",
    "body": null,
    "category": "sentiment",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T16:15:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "BUKA",
        "direction": "Unverified",
        "relevance": 55,
        "path": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
        "rationale": "Hitungan rekaman Sectors news untuk BUKA: 6 vs 2 pekan sebelumnya. Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."
      }
    ],
    "source": null,
    "tags": [
      "Attention"
    ]
  },
  {
    "id": "news-si-blok-madura-murah-raja-raup-laba-us15-54-juta",
    "title": "PT Rukun Raharja Tbk (RAJA) posts 102% net profit surge to US$15.54 million in H1-2026 on bargain purchase gain from Madura Block acquisition",
    "summary": "PT Rukun Raharja Tbk (RAJA) reported a 102% year-on-year increase in net profit to US$15.54 million for the first half of 2026, driven primarily by a bargain purchase gain from the acquisition of SMSD Development, which includes a 20%…",
    "body": "PT Rukun Raharja Tbk (RAJA) reported a 102% year-on-year increase in net profit to US$15.54 million for the first half of 2026, driven primarily by a bargain purchase gain from the acquisition of SMSD Development, which includes a 20% stake in Husky-CNOOC Madura Limited (HCML). Revenue rose 2% to US$25.65 million supported by stable lifting at the Jabung Block and higher oil prices, while adjusted EBITDA grew 38% to US$21.28 million. The acquisition was financed through bond issuance and a Bank Mandiri loan, pushing total assets to US$231.8 million and liabilities to US$166.8 million, with the debt-to-equity ratio rising to 2.42 times but remaining below covenant limits of 5 times for bonds and 4 times for Raharja Energi Madura. Net profit margin reached 66.61% and return on equity hit 47.8%.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-11T09:20:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Supported",
        "relevance": 82,
        "path": "Ekspektasi analis → asumsi valuasi → multiple",
        "rationale": "Sectors menandai peristiwa ini Bullish, Capital & Funding, Debt Issuance, Financial Metrics, Mergers & Acquisitions pada dimensi valuation. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/68694/akuisisi-blok-madura-murah-raja-raup-laba-us15-54-juta",
    "tags": [
      "Bullish",
      "Capital & Funding",
      "Debt Issuance",
      "Financial Metrics",
      "Mergers & Acquisitions"
    ]
  },
  {
    "id": "news-rampungkan-penerbitan-perpetual-bond-usd750-juta",
    "title": "Bank Mandiri Completes USD 750 Million Perpetual Bond Issuance at 7.35%",
    "summary": "PT Bank Mandiri Tbk completed the issuance of a USD 750 million Additional Tier 1 perpetual bond with an initial distribution rate of 7.35% on 10 September 2026. The bond was offered to investors outside the United States under Regulation…",
    "body": "PT Bank Mandiri Tbk completed the issuance of a USD 750 million Additional Tier 1 perpetual bond with an initial distribution rate of 7.35% on 10 September 2026. The bond was offered to investors outside the United States under Regulation S and listed on the Singapore Stock Exchange, with HSBC, J.P. Morgan Securities, Mandiri Securities, and Standard Chartered Bank acting as joint lead managers. Proceeds will strengthen the bank's capital structure and the issuance is not classified as a material transaction as it represents less than 20% of equity based on the 30 June 2026 audited financial statements. As of that date, the bank's consolidated Tier 1 capital stood at Rp249.16 trillion, Tier 2 capital at Rp17.08 trillion, and total capital at Rp266.25 trillion, all lower than the same period in 2025.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T22:37:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BMRI",
        "direction": "Adverse",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Bearish, Bonds, Capital & Funding, Debt Issuance, Financial Metrics, Foreign Investment pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/bank-mandiri-rampungkan-penerbitan-perpetual-bond-usd750-juta",
    "tags": [
      "Bearish",
      "Bonds",
      "Capital & Funding",
      "Debt Issuance",
      "Financial Metrics",
      "Foreign Investment"
    ]
  },
  {
    "id": "news-pendapatan-antam-total-penjualan-tembus-rp-50-t",
    "title": "Antam reports H1-2026 revenue of Rp 62.71 trillion, with gold sales exceeding Rp 50 trillion",
    "summary": "PT Aneka Tambang Tbk, Antam, reported first‑half 2026 revenue of Rp 62.71 trillion and net profit of Rp 6.91 trillion, with gold sales generating Rp 50.39 trillion, representing the majority of its earnings. Gold volume reached about 18.1…",
    "body": "PT Aneka Tambang Tbk, Antam, reported first‑half 2026 revenue of Rp 62.71 trillion and net profit of Rp 6.91 trillion, with gold sales generating Rp 50.39 trillion, representing the majority of its earnings. Gold volume reached about 18.1 tonnes, while nickel production was 7.78 million wet metric tons and sales 6.77 million wmt. The company also highlighted its bauxite value‑chain integration, operating the Chemical Grade Alumina facility through PT Indonesia Chemical Alumina (300 k t/yr) and holding a 40 % stake in Smelter Grade Alumina Mempawah (1 M t/yr). Antam is advancing a precious‑metal manufacturing plant in Gresik with a planned capacity of 30 tonnes per year, now in pre‑construction. As of H1‑2026, total assets stood at Rp 61.27 trillion, equity at Rp 38.53 trillion and cash and equivalents at Rp 9.23 trillion.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T18:30:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Commodities, Financial Metrics, Production & Operations pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://finance.detik.com/bursa-dan-valas/d-8657400/emas-sumbang-mayoritas-pendapatan-antam-total-penjualan-tembus-rp-50-t",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Commodities",
      "Financial Metrics",
      "Production & Operations"
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
    "id": "news-ah-dan-ihsg-tertekan-imbas-lonjakan-harga-minyak",
    "title": "Indonesian rupiah and IHSG pressured by surge in oil prices amid US-Iran tensions.",
    "summary": "The Indonesian stock market (IHSG) fell 1.33% to 6,589.34 and the rupiah weakened 0.2% to 17,547 per US dollar on Thursday, pressured by a surge in Brent crude oil prices above $100 per barrel amid escalating US-Iran tensions. The decline…",
    "body": "The Indonesian stock market (IHSG) fell 1.33% to 6,589.34 and the rupiah weakened 0.2% to 17,547 per US dollar on Thursday, pressured by a surge in Brent crude oil prices above $100 per barrel amid escalating US-Iran tensions. The decline marked the IHSG's lowest level in a week and made it the worst-performing emerging market index in Asia Pacific, with all sectoral indices down, led by energy (-2.06%) and transportation (-1.80%). Trading value reached Rp21.58 trillion with 51 billion shares exchanged, with PT Dian Swastatika Sentosa Tbk, PT Bank Central Asia Tbk, and PT Petrindo Jaya Kreasi Tbk among the most actively traded stocks. Most Asian emerging market currencies weakened against the dollar, though the Malaysian ringgit and Chinese yuan edged higher.",
    "category": "currency",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T17:10:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Adverse",
        "relevance": 76,
        "path": "Kurs → biaya input dan pendapatan valuta → margin",
        "rationale": "Sectors menandai peristiwa ini Bearish, Commodities, Currency & FX, Market Sentiment, Politics & Regulation pada dimensi technical. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/68664/rupiah-dan-ihsg-tertekan-imbas-lonjakan-harga-minyak",
    "tags": [
      "Bearish",
      "Commodities",
      "Currency & FX",
      "Market Sentiment",
      "Politics & Regulation"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-10092026-1930-00-pdf-0-pdf",
    "title": "Change in Morgan Stanley And Co International Plc's position in GoTo Gojek Tokopedia",
    "summary": "Morgan Stanley And Co International Plc executed a transaction for 1,829,494,000 shares of GoTo Gojek Tokopedia. This increases their holdings from 80,476,862,884 to 82,306,356,884 shares. The stated purpose of the transaction was…",
    "body": "Morgan Stanley And Co International Plc executed a transaction for 1,829,494,000 shares of GoTo Gojek Tokopedia. This increases their holdings from 80,476,862,884 to 82,306,356,884 shares. The stated purpose of the transaction was investment.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-10T16:56:31+07:00",
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
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-10092026-1930-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "news-belum-janjikan-dividen-di-tengah-ekspansi-bisnis",
    "title": "PT Vale Indonesia Tbk does not promise dividend amid 2026‑27 expansion plans",
    "summary": "PT Vale Indonesia Tbk said it has not provided a dividend commitment as it concentrates on its 2026‑27 expansion programme. The company is targeting first feed at the Pomalaa high‑pressure acid leach (HPAL) plant around 15 September 2026…",
    "body": "PT Vale Indonesia Tbk said it has not provided a dividend commitment as it concentrates on its 2026‑27 expansion programme. The company is targeting first feed at the Pomalaa high‑pressure acid leach (HPAL) plant around 15 September 2026 and full‑scale production of 120,000 tonnes of mixed hydroxide precipitate (MHP) in 2027, while also advancing the Bahodopi HPAL project and other growth initiatives. Management reiterated a cash‑cost goal of below US$10,000 per tonne and intends to keep new loan drawdowns low to preserve liquidity, noting that any dividend would only be considered if sufficient space remains after funding the capex. The dividend outlook therefore remains an aspiration, pending evaluation of nickel prices, financing efficiency and capital‑expenditure needs.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T16:50:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "INCO",
        "direction": "Adverse",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bearish, Business Expansion, Capital & Funding, Dividend Announcement, Financial Metrics, Production & Operations pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/121175/inco-belum-janjikan-dividen-di-tengah-ekspansi-bisnis",
    "tags": [
      "Bearish",
      "Business Expansion",
      "Capital & Funding",
      "Dividend Announcement",
      "Financial Metrics",
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
    "id": "news-ubs-sekuritas-hingga-jp-morgan-borong-saham-antm",
    "title": "UBS Sekuritas Leads Net Buying of PT Aneka Tambang Tbk Shares, While JP Morgan Issues Bullish Outlook",
    "summary": "UBS Sekuritas led the net‑buy activity for PT Aneka Tambang Tbk (ANTM) on 9 September 2026, purchasing shares at an average price of Rp3,159 and generating a net purchase value of over Rp95 billion, while CGS International Sekuritas…",
    "body": "UBS Sekuritas led the net‑buy activity for PT Aneka Tambang Tbk (ANTM) on 9 September 2026, purchasing shares at an average price of Rp3,159 and generating a net purchase value of over Rp95 billion, while CGS International Sekuritas followed with a net buy of more than Rp75 billion at an average price of Rp3,170. The heavy buying helped lift ANTM’s share price 3.91 % to Rp3,200 at the close on 9 September and a further 4 % to Rp3,330 by midday on 10 September. The activity coincided with a rebound in global spot gold to US$4,424 per troy ounce and a bullish note from JP Morgan’s Asia Pacific Equity Research, which expects an earnings upgrade for ANTM based on favorable nickel market dynamics and its strong gold‑refining business.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T12:58:00+07:00",
    "sector": "Basic Materials",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 88,
        "path": "Harga komoditas → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Commodities, Institutional Investor pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/121148/ubs-sekuritas-hingga-jp-morgan-borong-saham-antm",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Commodities",
      "Institutional Investor"
    ]
  },
  {
    "id": "news-a-rp-400-miliar-jsmr-bmas-siapkan-aksi-korporasi",
    "title": "SSIA Maintains Rp400 Billion Profit Target; JSMR and BMAS Plan Corporate Actions",
    "summary": "SSIA reaffirmed its 2026 net profit target of Rp400 billion while revising its revenue outlook to Rp7.20 trillion and allocating Rp2.20 trillion in capex, primarily for land acquisition and a Bali resort rebranding. JSMR disclosed a 2026…",
    "body": "SSIA reaffirmed its 2026 net profit target of Rp400 billion while revising its revenue outlook to Rp7.20 trillion and allocating Rp2.20 trillion in capex, primarily for land acquisition and a Bali resort rebranding. JSMR disclosed a 2026 capex budget of Rp12 trillion, with Rp4.40 trillion already spent, and projected that about 62 km of toll roads, including sections of the Jogja‑Bawen and Patimban Access projects, will be operational by the end of 2026 or early 2027. BMAS announced a rights issue (PMHMETD IV) at Rp350 per share, aiming to raise roughly Rp1.01 trillion, representing 13.70 % of its capital, with the offering scheduled for 27 Nov‑3 Dec 2026 and Kasikorn Vision Financial Company Pte Ltd intending to exercise all its rights. The corporate actions are presented amid a broader market backdrop of a 0.12 % decline in the IHSG and foreign net selling of Rp621.40 billion.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-10T08:52:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "JSMR",
        "direction": "Supported",
        "relevance": 78,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Capital & Funding, Financial Metrics, Foreign Investment, Rights Issue pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://finance.detik.com/bursa-dan-valas/d-8656403/ssia-pertahankan-target-laba-rp-400-miliar-jsmr-bmas-siapkan-aksi-korporasi",
    "tags": [
      "Bullish",
      "Capital & Funding",
      "Financial Metrics",
      "Foreign Investment",
      "Rights Issue"
    ]
  },
  {
    "id": "news-ncana-pembagian-dividen-interim-secara-kuartalan",
    "title": "PT Bank Central Asia Tbk announces quarterly interim dividend plan for 2026",
    "summary": "PT Bank Central Asia Tbk announced that it will pay interim dividends on a quarterly basis in 2026. The next interim dividend of Rp25 per share is scheduled for 16 September 2026, up from Rp20 per share paid in June 2026, with a further…",
    "body": "PT Bank Central Asia Tbk announced that it will pay interim dividends on a quarterly basis in 2026. The next interim dividend of Rp25 per share is scheduled for 16 September 2026, up from Rp20 per share paid in June 2026, with a further interim dividend planned for December 2026. The company reported a dividend payout ratio of 72% for the most recent period, up from 68%, and total profit of Rp29.5 trillion for the first half of 2026, including its subsidiaries. Credit grew 8% year‑on‑year to Rp1,036 trillion and CASA rose 10.2% year‑on‑year to Rp1,082 trillion, supporting the dividend policy.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-09T21:29:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Credit, Dividend Announcement, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.antaranews.com/berita/5733832/bca-ungkap-rencana-pembagian-dividen-interim-secara-kuartalan",
    "tags": [
      "Bullish",
      "Credit",
      "Dividend Announcement",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-embus-sebesar-rp1-036-triliun-npl-turun-jadi-1-9",
    "title": "PT Bank Central Asia Tbk Reports Credit Growth to Rp1,036 Trillion and NPL Decline to 1.9% in First Half 2026",
    "summary": "PT Bank Central Asia Tbk (BCA) disclosed in its 2026 public expose that credit expanded 8% year-on-year to Rp1,036 trillion as of June 2026, driven by productive credit growth of 11% to Rp802 trillion and corporate lending growth of 13.6%…",
    "body": "PT Bank Central Asia Tbk (BCA) disclosed in its 2026 public expose that credit expanded 8% year-on-year to Rp1,036 trillion as of June 2026, driven by productive credit growth of 11% to Rp802 trillion and corporate lending growth of 13.6% to Rp513.4 trillion. Asset quality improved with the non-performing loan ratio falling to 1.9% from 2.2% a year earlier and the loan-at-risk ratio easing to 4.9% from 5.7%. Third-party funds rose 7.9% to Rp1,284 trillion, supported by a current account savings account (CASA) ratio of 85.2%. The bank and its subsidiaries recorded a net profit of Rp29.5 trillion for the first half of 2026, while green financing grew 19% to Rp123 trillion. Meanwhile, BBCA shares have declined 18.69% year-to-date to Rp6,525.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-09T20:30:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBCA",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Bullish, Capital & Funding, Credit, ESG, Financial Metrics pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/68603/kredit-bbca-tembus-sebesar-rp1-036-triliun-npl-turun-jadi-1-9",
    "tags": [
      "Bullish",
      "Capital & Funding",
      "Credit",
      "ESG",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-ening-bank-rp50-000-dari-apbn-total-rp11-triliun",
    "title": "Indonesian government allocates Rp11 trillion to Bank Rakyat Indonesia and Bank Syariah Indonesia for a program giving citizens Rp50,000 opening…",
    "summary": "The Indonesian government announced a program to open bank accounts for up to 200 million citizens with an initial Rp50,000 balance, funded by an Rp11 trillion allocation from the state budget (APBN). The accounts will be provided through…",
    "body": "The Indonesian government announced a program to open bank accounts for up to 200 million citizens with an initial Rp50,000 balance, funded by an Rp11 trillion allocation from the state budget (APBN). The accounts will be provided through the two state‑owned banks, Bank Rakyat Indonesia and Bank Syariah Indonesia. Implementation will be coordinated with Bank Indonesia, the Financial Services Authority and the civil registration agency to enable automatic account creation, and the funding may be drawn from the 2026 or 2027 APBN. The rollout will be phased, and the initial balance will be withdrawable by account holders.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-09T19:10:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Supported",
        "relevance": 84,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Capital & Funding, Government Policy, OJK, Sharia Economy pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/121071/wni-dapat-rekening-bank-rp50-000-dari-apbn-total-rp11-triliun",
    "tags": [
      "Bullish",
      "Capital & Funding",
      "Government Policy",
      "OJK",
      "Sharia Economy"
    ]
  },
  {
    "id": "filing-entstock-from-ksei-lk-09092026-8686-00-pdf-0-pdf",
    "title": "Change in Morgan Stanley And Co International Plc's position in GoTo Gojek Tokopedia",
    "summary": "Morgan Stanley And Co International Plc executed a transaction for 7,402,292,100 shares of GoTo Gojek Tokopedia. This decreases their holdings from 84,971,460,184 to 80,476,862,884 shares. The stated purpose of the transaction was…",
    "body": "Morgan Stanley And Co International Plc executed a transaction for 7,402,292,100 shares of GoTo Gojek Tokopedia. This decreases their holdings from 84,971,460,184 to 80,476,862,884 shares. The stated purpose of the transaction was investment.",
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2026-09-09T18:40:37+07:00",
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
    "source": "https://www.idx.co.id/StaticData/NewsAndAnnouncement/ANNOUNCEMENTSTOCK/From_KSEI/LK-09092026-8686-00.pdf-0.pdf",
    "tags": [
      "investment"
    ]
  },
  {
    "id": "news-kemas-laba-rp191t-kini-garap-5-proyek-jalan-tol",
    "title": "PT Jasa Marga Tbk reports net profit of Rp1.91 trillion for H1 2026 and outlines five new toll projects",
    "summary": "PT Jasa Marga Tbk reported operating revenue of Rp10.31 trillion in the first half of 2026, with net profit attributable to the parent reaching Rp1.91 trillion, up 2.0% YoY. Revenue grew 7.6% YoY, driven by toll revenue of Rp9.5 trillion…",
    "body": "PT Jasa Marga Tbk reported operating revenue of Rp10.31 trillion in the first half of 2026, with net profit attributable to the parent reaching Rp1.91 trillion, up 2.0% YoY. Revenue grew 7.6% YoY, driven by toll revenue of Rp9.5 trillion (up 6.8%) and other business revenue of Rp798.2 billion (up 17.6%); EBITDA rose 8.1% to Rp6.99 trillion, maintaining a margin of 67.8%. The company now manages 36 concessions covering 1,736 km, operating about 1,294 km, roughly 42% of Indonesia’s toll network. It also announced progress on five new toll projects, including Jakarta‑Cikampek Selatan II (Setu to Sadang), a 14‑km Patimban access road slated for 2028, and the Jogja‑Bawen corridor with section 1 targeting SLO by end‑September 2026 and section 6 already test‑operational this year.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-09T16:35:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "JSMR",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/jasa-marga-jsmr-kemas-laba-rp191t-kini-garap-5-proyek-jalan-tol",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Financial Metrics"
    ]
  },
  {
    "id": "news-potensi-investasi-tol-baru-siapkan-dana-rp-12-t",
    "title": "PT Jasa Marga Tbk Plans Rp 12 Trillion Capex for 2026 and Explores New Toll Road Investments",
    "summary": "PT Jasa Marga Tbk is exploring potential investments in new toll roads and has allocated a capital expenditure budget of Rp 12 trillion for 2026. As of the first half of 2026, the company has realized Rp 4.4 trillion in capex for…",
    "body": "PT Jasa Marga Tbk is exploring potential investments in new toll roads and has allocated a capital expenditure budget of Rp 12 trillion for 2026. As of the first half of 2026, the company has realized Rp 4.4 trillion in capex for operations, maintenance, and toll road construction. The state-owned enterprise is open to both greenfield and brownfield toll projects, with investment decisions based on traffic prospects, connectivity, feasibility, and financial capacity. Additionally, Jasa Marga is participating in a streamlining initiative led by the Ministry of State-Owned Enterprises and the Danantara sovereign wealth fund to optimize its portfolio.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-09T13:49:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "JSMR",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Capital & Funding, Government Policy, Ministry, Portfolio pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://finance.detik.com/bursa-dan-valas/d-8655301/jasa-marga-jajaki-potensi-investasi-tol-baru-siapkan-dana-rp-12-t",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Capital & Funding",
      "Government Policy",
      "Ministry",
      "Portfolio"
    ]
  },
  {
    "id": "news-owo-minta-semua-wni-punya-rekening-siap-jalankan",
    "title": "BSI Ready to Provide Bank Accounts for All Indonesian Citizens as Directed by President Prabowo",
    "summary": "PT Bank Syariah Indonesia Tbk (BSI) has announced it is prepared to open bank accounts for all Indonesian citizens in line with President Prabowo Subianto’s directive, partnering with Bank Rakyat Indonesia to roll out the program. BSI, a…",
    "body": "PT Bank Syariah Indonesia Tbk (BSI) has announced it is prepared to open bank accounts for all Indonesian citizens in line with President Prabowo Subianto’s directive, partnering with Bank Rakyat Indonesia to roll out the program. BSI, a national Islamic bank, reported a net profit of Rp4.16 trillion in the first half of 2026, up 11% year‑over‑year, and third‑party funds of Rp393 trillion, up 22%. The bank’s customer base reached 24.3 million as of June 2026, following a 9.84‑million increase since its 2021 merger. The government will fund each new account with Rp50,000, with no fees, and the accounts will also serve as a channel for social assistance disbursements.",
    "category": "policy",
    "sourceType": "sectors",
    "publishedAt": "2026-09-09T13:09:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Supported",
        "relevance": 84,
        "path": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Financial Metrics, Government Policy, Partnerships & Agreements, Sharia Economy pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/121012/bsi-soal-prabowo-minta-semua-wni-punya-rekening-siap-jalankan",
    "tags": [
      "Bullish",
      "Financial Metrics",
      "Government Policy",
      "Partnerships & Agreements",
      "Sharia Economy"
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
    "id": "news-kom-tlkm-tambah-100-mhz-spektrum-untuk-telkomsel",
    "title": "PT Telkom Indonesia Tbk allocates additional 100 MHz spectrum to PT Telkomsel",
    "summary": "PT Telkom Indonesia Tbk announced the allocation of an additional 100 MHz of spectrum to its subsidiary PT Telkomsel, expanding the latter’s 700 MHz and 2,600 MHz bands and raising its total portfolio to 265 MHz. The allocation was…",
    "body": "PT Telkom Indonesia Tbk announced the allocation of an additional 100 MHz of spectrum to its subsidiary PT Telkomsel, expanding the latter’s 700 MHz and 2,600 MHz bands and raising its total portfolio to 265 MHz. The allocation was disclosed at the Public Expose Live 2026 TelkomGroup on 7 September 2026 to support Telkomsel’s 5G network development. In the first half of 2026 Telkomsel reported revenue of Rp28.0 trillion, up 5.3% YoY, EBITDA up 10.3%, net profit up 24.9%, and mobile ARPU of Rp46 thousand, up 11.6% YoY. The company said the new spectrum will be deployed gradually in line with market demand while maintaining investment discipline and long‑term value creation.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-08T15:30:00+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Supported",
        "relevance": 90,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Digital Transformation, Financial Metrics, Subsidiaries pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/akselerasi-5g-telkom-tlkm-tambah-100-mhz-spektrum-untuk-telkomsel",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Digital Transformation",
      "Financial Metrics",
      "Subsidiaries"
    ]
  },
  {
    "id": "news-tanley-borong-saham-goto-lagi-di-harga-diskon-50",
    "title": "Morgan Stanley And Co International Plc purchases 21.67 billion GOTO shares at 50% discount via negotiated market",
    "summary": "Morgan Stanley And Co International Plc acquired 21.67 billion shares of PT GoTo Gojek Tokopedia Tbk through three negotiated market transactions on September 2, 2026, at Rp25 per share, a 50% discount to the regular market price of Rp50.…",
    "body": "Morgan Stanley And Co International Plc acquired 21.67 billion shares of PT GoTo Gojek Tokopedia Tbk through three negotiated market transactions on September 2, 2026, at Rp25 per share, a 50% discount to the regular market price of Rp50. The total outlay reached Rp541.97 billion, raising Morgan Stanley's ownership in GOTO to 7.59% from 5.71% at the end of August 2026. Morgan Stanley stated the purchases were not intended to maintain control over GOTO. The accumulation occurred just before GOTO's removal from the Morgan Stanley Capital International (MSCI) global index on August 31, 2026, after MSCI determined the stock no longer met liquidity criteria and had stagnated at Rp50 for over three months.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-08T09:10:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Adverse",
        "relevance": 88,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bearish, Global Index, Mergers & Acquisitions, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.idnfinancials.com/id/news/68500/morgan-stanley-borong-saham-goto-lagi-di-harga-diskon-50",
    "tags": [
      "Bearish",
      "Global Index",
      "Mergers & Acquisitions",
      "Ownership"
    ]
  },
  {
    "id": "news-stanley-lanjut-borong-saham-goto-rp541-9-miliar",
    "title": "Morgan Stanley & Co International Plc purchases additional PT GoTo Gojek Tokopedia Tbk shares worth Rp541.9 billion, raising its stake to 7.59%",
    "summary": "Morgan Stanley & Co International Plc bought more shares of PT GoTo Gojek Tokopedia Tbk after the company was removed from the MSCI index. On 2 September 2026 the broker purchased about 21.67 billion GOTO shares at Rp25 per share, spending…",
    "body": "Morgan Stanley & Co International Plc bought more shares of PT GoTo Gojek Tokopedia Tbk after the company was removed from the MSCI index. On 2 September 2026 the broker purchased about 21.67 billion GOTO shares at Rp25 per share, spending roughly Rp541.98 billion and increasing its total holding to 87.48 billion shares, or 7.59% of the float, following an earlier purchase of 3.8 billion shares at Rp23 per share for about Rp87.3 billion at the end of August 2026. PT GoTo Gojek Tokopedia Tbk reported net profit of Rp607 billion and revenue of Rp10.99 trillion for the first half of 2026, with revenue contributions of Rp3.2 trillion (+16.5%) from delivery services, Rp3.15 trillion (+14.9%) from services compensation, Rp2.71 trillion (+65%) from loan services, Rp551 billion (+32.3%) from Tokopedia e‑commerce service fees, Rp254 billion (+8%) from advertising, and Rp1.13 trillion (+46.5%) from other sources. The company is also considering a reverse stock split and a share buyback of up to Rp3.5 trillion, while analysts note that the removal of the price‑floor rule could ease passive‑fund pressure on the stock.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-08T08:10:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Supported",
        "relevance": 88,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Foreign Investment, Institutional Investor, Ownership, Stock Buyback, Stock Split pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.bloombergtechnoz.com/detail-news/120822/morgan-stanley-lanjut-borong-saham-goto-rp541-9-miliar",
    "tags": [
      "Bullish",
      "Foreign Investment",
      "Institutional Investor",
      "Ownership",
      "Stock Buyback",
      "Stock Split"
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
    "id": "news-er-ii-2026-telkom-buka-strategi-jaga-pertumbuhan",
    "title": "Telkom Reports 3.9% Revenue Growth in H1 2026, Maintains Full-Year Guidance Amid TLKM 30 Transformation",
    "summary": "Telkom reported consolidated revenue of Rp75.9 trillion for the first half of 2026, a 3.9% year-on-year increase, with normalized net profit rising 6.2% to Rp11.3 trillion. The company's mobile subsidiary Telkomsel posted 5.3% revenue…",
    "body": "Telkom reported consolidated revenue of Rp75.9 trillion for the first half of 2026, a 3.9% year-on-year increase, with normalized net profit rising 6.2% to Rp11.3 trillion. The company's mobile subsidiary Telkomsel posted 5.3% revenue growth to Rp28.0 trillion and a 24.9% jump in net profit, driven by an 11.6% rise in mobile ARPU to Rp46 thousand. Telkom is advancing its TLKM 30 transformation, delayering into five segments and preparing a second-stage spin-off of infrastructure unit InfraNexia in the third quarter, while its data center subsidiary NeutraDC grew revenue 11% to Rp867 billion with 49.9 MW capacity. The group also plans to acquire 100% of Digiserve to bolster its B2B ICT capabilities. Management maintained full-year guidance of 1-3% normalized revenue growth and an EBITDA margin above 50%, noting the second-quarter margin had already exceeded that threshold.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T19:07:08+07:00",
    "sector": "Infrastructure",
    "impactLinks": [
      {
        "symbol": "TLKM",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Digital Transformation, Financial Metrics, Mergers & Acquisitions pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://www.cnnindonesia.com/ekonomi/20260907184255-625-1401152/optimis-sambut-semester-ii-2026-telkom-buka-strategi-jaga-pertumbuhan",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Digital Transformation",
      "Financial Metrics",
      "Mergers & Acquisitions"
    ]
  },
  {
    "id": "news-emiten-yang-akuisisi-aset-tambang-di-luar-negeri",
    "title": "BRI Danareksa Sekuritas analyst highlights expansion prospects and buy recommendations for PT Bumi Resources Tbk, PT Petrosea Tbk, PT United Tractors…",
    "summary": "BRI Danareksa Sekuritas analyst Abida Massi Armand reviews the overseas mining expansion of PT Bumi Resources Tbk, PT Petrosea Tbk, PT United Tractors Tbk and PT Aneka Tambang Tbk. PT Bumi Resources Tbk, via its subsidiary Bumi Resources…",
    "body": "BRI Danareksa Sekuritas analyst Abida Massi Armand reviews the overseas mining expansion of PT Bumi Resources Tbk, PT Petrosea Tbk, PT United Tractors Tbk and PT Aneka Tambang Tbk. PT Bumi Resources Tbk, via its subsidiary Bumi Resources Australia Pty Ltd, completed the acquisition of 100% of Loyal Metals Ltd for Rp 1,004,742,244,136.50 (AUD 79,069,731.75); PT Petrosea Tbk finalized a binding offer for Tolu Minerals Limited, issuing convertible notes worth AUS $23.75 million; PT United Tractors Tbk is exploring mineral asset acquisitions in Australia; and PT Aneka Tambang Tbk is targeting gold production in the Middle East. The analyst recommends buying PT Aneka Tambang Tbk with a target price of Rp 4,900 and PT United Tractors Tbk with a target price of Rp 30,600, noting strong free cash flow and diversification benefits. He cautions that integration risks, possible overpaying and regulatory hurdles may delay profit contributions for two to three years after the deals.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T18:54:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ANTM",
        "direction": "Supported",
        "relevance": 72,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Business Expansion, Capital & Funding, Foreign Investment, Mergers & Acquisitions pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/cek-prospek-dan-rekomendasi-emiten-yang-akuisisi-aset-tambang-di-luar-negeri",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Business Expansion",
      "Capital & Funding",
      "Foreign Investment",
      "Mergers & Acquisitions"
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
    "id": "news-saham-buka-tambah-porsi-kepemilikan-jadi-segini",
    "title": "PT Kreatif Media Karya increases its stake in PT Bukalapak.com Tbk to 45.68%",
    "summary": "PT Kreatif Media Karya, the controlling shareholder of PT Bukalapak.com Tbk, increased its ownership to 45.68% by buying additional shares. On 4 September 2026 it purchased 803,287,800 shares at Rp126 each, costing about Rp101.21 billion…",
    "body": "PT Kreatif Media Karya, the controlling shareholder of PT Bukalapak.com Tbk, increased its ownership to 45.68% by buying additional shares. On 4 September 2026 it purchased 803,287,800 shares at Rp126 each, costing about Rp101.21 billion and raising its holding to 47,125,034,185 shares out of 46,321,746,385 total shares. The filing also shows that PT Elang Mahkota and PT Bukalapak each hold over 10% of PT Bukalapak.com Tbk’s shares, with 10,821,706,040 (10.48%) and 11,333,437,507 (10.986%) shares respectively. Following the transaction, PT Bukalapak.com Tbk’s shares closed at 113 on 7 September, down 1.74% (‑2 points), and the stock carries a special notation I.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T16:43:00+07:00",
    "sector": "Technology",
    "impactLinks": [
      {
        "symbol": "BUKA",
        "direction": "Supported",
        "relevance": 82,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Domestic Investor, Mergers & Acquisitions, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      },
      {
        "symbol": "EMTK",
        "direction": "Supported",
        "relevance": 82,
        "path": "Perubahan kepemilikan → free float dan arus → likuiditas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Domestic Investor, Mergers & Acquisitions, Ownership pada dimensi ownership. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://emitennews.com/news/pengendali-borong-saham-buka-tambah-porsi-kepemilikan-jadi-segini",
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
    "id": "news-un-bri-tegaskan-komitmen-jaga-shareholder-return",
    "title": "PT Bank Rakyat Indonesia Tbk announces dividend payout ratio to fall to about 70% for FY 2026, reaffirming commitment to shareholder returns",
    "summary": "PT Bank Rakyat Indonesia Tbk said its dividend payout ratio will be reduced to roughly 70% for the 2026 fiscal year while reaffirming its commitment to delivering optimal shareholder returns. The announcement was made by Finance & Strategy…",
    "body": "PT Bank Rakyat Indonesia Tbk said its dividend payout ratio will be reduced to roughly 70% for the 2026 fiscal year while reaffirming its commitment to delivering optimal shareholder returns. The announcement was made by Finance & Strategy Director Achmad Royadi, who noted that the payout policy will balance fundamentals, capital needs and long‑term growth, with a long‑term target range of 50‑60%. The bank reported consolidated net profit of Rp 31.2 trillion for the first half of 2026, up 17.5% YoY, alongside credit growth of 16.2% YoY, an NPL ratio improving to 2.9% and a capital adequacy ratio of 21.5%, above its 20% target. The lower payout follows a 92% ratio in 2025 and reflects PT Bank Rakyat Indonesia Tbk’s strong fundamentals that allow it to balance shareholder returns with capital reinforcement for future expansion.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-07T15:32:00+07:00",
    "sector": "Financials",
    "impactLinks": [
      {
        "symbol": "BBRI",
        "direction": "Supported",
        "relevance": 90,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Capital & Funding, Dividend Announcement, Financial Metrics pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://keuangan.kontan.co.id/news/rasio-dividen-dikabarkan-turun-bri-tegaskan-komitmen-jaga-shareholder-return",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Capital & Funding",
      "Dividend Announcement",
      "Financial Metrics"
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
    "id": "news-nguat-pada-senin-79-ini-saham-rekomendasi-analis",
    "title": "IHSG Still Has Opportunity to Strengthen on Monday (7/9), Here Are Analyst-Recommended Stocks",
    "summary": "The article discusses the potential for the Indonesian Composite Index (IHSG) to strengthen on Monday, 7 September 2026, after a 0.47% decline to 6,636 on Friday, 4 September 2026, and a weekly gain of 1.82%. Analyst William Hartanto…",
    "body": "The article discusses the potential for the Indonesian Composite Index (IHSG) to strengthen on Monday, 7 September 2026, after a 0.47% decline to 6,636 on Friday, 4 September 2026, and a weekly gain of 1.82%. Analyst William Hartanto projects the index to trade between 6,612 and 6,704 on Monday, citing a gap at 6,704 formed on 13 May 2026 and the index remaining above the 5‑period moving average as evidence of a strong uptrend. He recommends buying PT Alamtri Resources Indonesia Tbk (ADRO) with a target price of Rp 2,800–Rp 2,820 per share and PT Baramulti Suksessarana Tbk (BSSR) with a target price of Rp 5,000 per share.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-06T14:00:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Supported",
        "relevance": 84,
        "path": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Market Sentiment pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investasi.kontan.co.id/news/ihsg-masih-berpeluang-menguat-pada-senin-79-ini-saham-rekomendasi-analis",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Market Sentiment"
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
    "id": "news-reli-saham-energi-adro-hingga-bumi-dalam-bidikan",
    "title": "Energy Stock Rally Targets ADRO and BUMI",
    "summary": "Energy stocks are rallying, with ADRO and BUMI among the companies targeted by the surge. The IDX Energy index rose 12.6% in the past month and gained 1.36% on 3 September 2026, outpacing the broader market. Analysts say the rally is…",
    "body": "Energy stocks are rallying, with ADRO and BUMI among the companies targeted by the surge. The IDX Energy index rose 12.6% in the past month and gained 1.36% on 3 September 2026, outpacing the broader market. Analysts say the rally is driven by improving earnings prospects, stronger valuations, and investor funds returning to commodity stocks with solid fundamentals, rather than commodity price euphoria alone, and they expect the energy sector to remain a support for the IHSG until the end of 2026. The next phase will focus on stock picking, favoring companies with low production costs, healthy balance sheets, strong cash flows, large reserves, and the ability to maintain production volumes.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-04T06:22:25+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Supported",
        "relevance": 84,
        "path": "Sales of Coal (55% pendapatan ADRO) → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Commodities, Financial Metrics, Market Sentiment pada dimensi future. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/452777/reli-saham-energi-adro-hingga-bumi-dalam-bidikan",
    "tags": [
      "Bullish",
      "Commodities",
      "Financial Metrics",
      "Market Sentiment"
    ]
  },
  {
    "id": "news-ru-adro-dan-risiko-yang-perlu-dicermati-investor",
    "title": "ADRO Enters New Chapter with Aluminum Diversification as Coal Earnings Surge, but Risks Remain",
    "summary": "PT Alamtri Resources Indonesia Tbk (ADRO) is advancing its diversification into aluminum through PT Kalimantan Aluminium Industry (KAI), which is entering ramp-up and expected to contribute revenue by late 2026. The company posted strong…",
    "body": "PT Alamtri Resources Indonesia Tbk (ADRO) is advancing its diversification into aluminum through PT Kalimantan Aluminium Industry (KAI), which is entering ramp-up and expected to contribute revenue by late 2026. The company posted strong first-half 2026 results, with revenue rising 16.5% year-on-year to US$999 million, EBITDA jumping 56.8% to US$491 million, and net profit surging 76.9% to US$309 million. Second-quarter net profit climbed 41.5% quarter-on-quarter to US$181 million, while EBITDA margin expanded to 55.8% from 41.6%. However, analysts flag risks including domestic market obligation pressure on pricing, a 35-40% quarterly jump in domestic diesel costs, policy uncertainty from PT Danantara Sumberdaya Indonesia and a single-gate export scheme, and execution risk for the nascent aluminum business.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-03T13:34:29+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Supported",
        "relevance": 82,
        "path": "Sales of Coal (55% pendapatan ADRO) → realisasi harga → margin",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Commodities, Financial Metrics, Risk & Compliance pada dimensi valuation. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/452712/babak-baru-adro-dan-risiko-yang-perlu-dicermati-investor",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Commodities",
      "Financial Metrics",
      "Risk & Compliance"
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
    "id": "news-rket-452557-bisnis-ev-toba-masuk-fase-monetisasi",
    "title": "PT TBS Energi Utama Tbk’s EV Business Enters Monetisation Phase, Posting Positive Gross Profit and Adjusted EBITDA in H1 2026",
    "summary": "PT TBS Energi Utama Tbk’s electric‑vehicle segment, operated through the Electrum joint venture with PT GoTo Gojek Tokopedia Tbk, entered a monetisation phase in the first half of 2026. Revenue rose 184% year‑on‑year to US$9.06 million,…",
    "body": "PT TBS Energi Utama Tbk’s electric‑vehicle segment, operated through the Electrum joint venture with PT GoTo Gojek Tokopedia Tbk, entered a monetisation phase in the first half of 2026. Revenue rose 184% year‑on‑year to US$9.06 million, gross profit turned positive at US$0.39 million (from a US$0.45 million loss) and adjusted EBITDA became positive at about US$0.5 million. The ecosystem now covers roughly 13,883 two‑wheel EVs (up 172%) and 550 battery‑swapping stations (up 72%), supporting over 1.7 million monthly swaps and more than 135 million km traveled, and Kiwoom Sekuritas analyst Abdul Azis said the profit shift signals healthier unit economics and a focus on utilisation to drive recurring revenue.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-09-02T11:32:44+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "GOTO",
        "direction": "Supported",
        "relevance": 84,
        "path": "Kinerja kuartalan → pendapatan dan laba → valuasi",
        "rationale": "Sectors menandai peristiwa ini Bullish, Business Expansion, Financial Metrics, Joint Venture pada dimensi financials. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/452557/bisnis-ev-toba-masuk-fase-monetisasi",
    "tags": [
      "Bullish",
      "Business Expansion",
      "Financial Metrics",
      "Joint Venture"
    ]
  },
  {
    "id": "news-trase-kompensasi-awal-pgas-ke-gunvor-9-kargo-lng",
    "title": "PGAS Loses Partial Arbitration Award, Ordered to Pay 9 LNG Cargoes to Gunvor",
    "summary": "PT Perusahaan Gas Negara Tbk (PGAS) lost a partial arbitration award at the London Court of International Arbitration and must compensate Gunvor Singapore Pte Ltd with 9 LNG cargoes covering 2024 and 2025 deliveries. The partial award…",
    "body": "PT Perusahaan Gas Negara Tbk (PGAS) lost a partial arbitration award at the London Court of International Arbitration and must compensate Gunvor Singapore Pte Ltd with 9 LNG cargoes covering 2024 and 2025 deliveries. The partial award addresses Gunvor's claim for 4-8 cargoes in 2024 and 1-4 cargoes in 2025, while remaining claims for 2025 through 2027 are still pending. Gunvor reportedly claimed US$130.4 million (approximately Rp2.18 trillion) in the dispute, while PGAS provisioned US$72.02 million (approximately Rp1.2 trillion) in its December 2025 financial statements. The dispute stems from a 2022 master sales agreement for 8 cargoes annually through 2027, which PGAS declared force majeure on in November 2023. PGAS shares have fallen 18.59% year-to-date to Rp1,555.",
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-02T08:30:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PGAS",
        "direction": "Adverse",
        "relevance": 90,
        "path": "Harga komoditas → realisasi harga → margin",
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
    "category": "commodity",
    "sourceType": "sectors",
    "publishedAt": "2026-09-02T06:39:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "PGAS",
        "direction": "Adverse",
        "relevance": 88,
        "path": "Harga komoditas → realisasi harga → margin",
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
    "title": "BBCA dividen tunai Rp25.00 per saham",
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
    "id": "news-murahmurahnya-dicicil-terus-ramalan-ke-rp-12000",
    "title": "PT Indofood CBP Sukses Makmur Tbk shares deemed cheap with target price of Rp 12,000",
    "summary": "The article notes that PT Indofood CBP Sukses Makmur Tbk (ICBP) shares are considered cheap and are forecast to reach Rp 12,000. Foreign investors recorded a net purchase of IDR 221.70 billion between 16 July and 12 August 2026, with a…",
    "body": "The article notes that PT Indofood CBP Sukses Makmur Tbk (ICBP) shares are considered cheap and are forecast to reach Rp 12,000. Foreign investors recorded a net purchase of IDR 221.70 billion between 16 July and 12 August 2026, with a small net sell of IDR 599.21 million on 13 August. The stock rose 13.53% over the past month, trades at Rp 7,550, down nearly 21% year‑to‑date, and shows a price‑to‑book ratio of 1.67× (below the –1 SD level of 1.99×) and a price‑earnings ratio of 11.91× (around the –1 SD level of 11.32×). Mandiri Sekuritas maintains a buy recommendation with a target price of Rp 12,000, implying roughly 60% upside.",
    "category": "company",
    "sourceType": "sectors",
    "publishedAt": "2026-08-14T06:52:56+07:00",
    "sector": "Consumer",
    "impactLinks": [
      {
        "symbol": "ICBP",
        "direction": "Supported",
        "relevance": 88,
        "path": "Ekspektasi analis → asumsi valuasi → multiple",
        "rationale": "Sectors menandai peristiwa ini Analyst Ratings, Bullish, Financial Metrics, Foreign Investment pada dimensi valuation. Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
      }
    ],
    "source": "https://investor.id/market/450304/saham-emiten-anthoni-salim-lagi-murahmurahnya-dicicil-terus-ramalan-ke-rp-12000",
    "tags": [
      "Analyst Ratings",
      "Bullish",
      "Financial Metrics",
      "Foreign Investment"
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
    "title": "TLKM dividen tunai Rp223.17 per saham",
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
    "title": "BBRI dividen tunai Rp209.00 per saham",
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
    "id": "filing-corporate-action-dividend-adro",
    "title": "ADRO dividen tunai Rp145.14 per saham",
    "summary": "Ex-date 2025-12-30, pembayaran 2026-01-15. Jadwal distribusi tunai, bukan sinyal arah harga.",
    "body": null,
    "category": "company",
    "sourceType": "filing",
    "publishedAt": "2025-12-30T09:00:00+07:00",
    "sector": "Energy",
    "impactLinks": [
      {
        "symbol": "ADRO",
        "direction": "Mixed",
        "relevance": 92,
        "path": "Kebijakan dividen → arus kas ke pemegang saham → neraca",
        "rationale": "Sectors corporate-actions API mencatat dividen ex-date 2025-12-30, dibayar 2026-01-15. Fakta jadwal distribusi, bukan sinyal arah harga."
      }
    ],
    "source": null,
    "tags": [
      "Dividend"
    ]
  },
  {
    "id": "commodity-coal-2025-12-15",
    "title": "Harga Coal acuan 2025-12-15: USD100.81",
    "summary": "Harga referensi Coal (price_usd_per_ton) bergerak 2,6% dari 2025-12-01 ke 2025-12-15, rekaman Sectors mining-commodities.",
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
    "title": "Harga Gold acuan 2025-12-01: USD4299.97",
    "summary": "Harga referensi Gold (price_usd_per_ton) bergerak 5,3% dari 2025-11-01 ke 2025-12-01, rekaman Sectors mining-commodities.",
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
  "ANTM": [
    "flows-foreign-net-antm-2026-09-11",
    "news-pendapatan-antam-total-penjualan-tembus-rp-50-t",
    "news-ubs-sekuritas-hingga-jp-morgan-borong-saham-antm",
    "news-emiten-yang-akuisisi-aset-tambang-di-luar-negeri",
    "commodity-gold-2025-12-01"
  ],
  "INCO": [
    "news-3-tambang-segera-beroperasi-morowali-lebih-dulu",
    "news-ejar-proyek-hpal-pomalaa-full-produksi-pada-2027",
    "news-belum-janjikan-dividen-di-tengah-ekspansi-bisnis"
  ],
  "TINS": [
    "news-s-lampaui-target-laba-bersih-melonjak-805-persen",
    "news-di-katalis-tins-pede-kinerja-akhir-2026-berkilau",
    "news-tan-melonjak-timah-tins-siapkan-revisi-rkap-2026"
  ],
  "BBCA": [
    "flows-foreign-net-bbca-2026-09-11",
    "sentiment-attention-bbca-2026-09-11",
    "news-ah-dan-ihsg-tertekan-imbas-lonjakan-harga-minyak",
    "news-ncana-pembagian-dividen-interim-secara-kuartalan",
    "news-embus-sebesar-rp1-036-triliun-npl-turun-jadi-1-9",
    "filing-corporate-action-dividend-bbca",
    "filing-corporate-action-buyback-bbca-2026-03-12",
    "filing-corporate-action-leadership-bbca-2026-03-12"
  ],
  "BBRI": [
    "flows-foreign-net-bbri-2026-09-11",
    "sentiment-attention-bbri-2026-09-11",
    "news-ening-bank-rp50-000-dari-apbn-total-rp11-triliun",
    "news-owo-minta-semua-wni-punya-rekening-siap-jalankan",
    "news-un-bri-tegaskan-komitmen-jaga-shareholder-return",
    "filing-corporate-action-dividend-bbri",
    "filing-corporate-action-leadership-bbri-2026-04-10"
  ],
  "BMRI": [
    "news-k-mandiri-bmri-terbitkan-surat-utang-usd750-juta",
    "sentiment-attention-bmri-2026-09-11",
    "news-si-blok-madura-murah-raja-raup-laba-us15-54-juta",
    "news-rampungkan-penerbitan-perpetual-bond-usd750-juta",
    "filing-entstock-from-ksei-lk-08092026-3898-00-pdf-0-pdf",
    "filing-entstock-from-ksei-lk-08092026-7905-00-pdf-0-pdf"
  ],
  "TLKM": [
    "flows-foreign-net-tlkm-2026-09-11",
    "sentiment-attention-tlkm-2026-09-11",
    "news-jumbo-emiten-telko-bawa-peluang-sekaligus-risiko",
    "news-kom-tlkm-tambah-100-mhz-spektrum-untuk-telkomsel",
    "news-er-ii-2026-telkom-buka-strategi-jaga-pertumbuhan",
    "filing-corporate-action-dividend-tlkm",
    "filing-corporate-action-buyback-tlkm-2026-06-08",
    "filing-corporate-action-leadership-tlkm-2026-06-08"
  ],
  "JSMR": [
    "news-a-rp-400-miliar-jsmr-bmas-siapkan-aksi-korporasi",
    "news-kemas-laba-rp191t-kini-garap-5-proyek-jalan-tol",
    "news-potensi-investasi-tol-baru-siapkan-dana-rp-12-t",
    "filing-entstock-from-ksei-lk-02092026-8460-00-pdf-0-pdf"
  ],
  "EXCL": [
    "news-ed-capex-2026-jadi-rp20-t-ini-fokus-investasinya",
    "news-am-hari-ini-jumat-28-agustus-2026-excl-inet-hrum",
    "news-ndasi-saham-pilihan-ipot-untuk-trading-pekan-ini"
  ],
  "GOTO": [
    "flows-foreign-net-goto-2026-09-11",
    "filing-entstock-from-ksei-lk-10092026-1930-00-pdf-0-pdf",
    "filing-entstock-from-ksei-lk-09092026-8686-00-pdf-0-pdf",
    "news-tanley-borong-saham-goto-lagi-di-harga-diskon-50",
    "news-stanley-lanjut-borong-saham-goto-rp541-9-miliar",
    "news-rket-452557-bisnis-ev-toba-masuk-fase-monetisasi"
  ],
  "BUKA": [
    "sentiment-attention-buka-2026-09-11",
    "news-ha-emtek-borong-803-juta-buka-kuasai-45-68-saham",
    "filing-entstock-from-ksei-lk-08092026-6401-00-pdf-0-pdf",
    "news-porsi-saham-buka-serok-803-juta-harga-atas-pasar",
    "news-saham-buka-tambah-porsi-kepemilikan-jadi-segini",
    "filing-entstock-from-ksei-lk-07092026-8071-00-pdf-0-pdf"
  ],
  "EMTK": [
    "news-saham-buka-tambah-porsi-kepemilikan-jadi-segini",
    "news-masih-lesu-simak-prospeknya-di-semester-ii-2026",
    "news-bhimata-citra-abadi-ini-alasan-dibalik-divestasi",
    "news-kan-ai-untuk-tingkatkan-efisiensi-dan-daya-saing"
  ],
  "PGAS": [
    "flows-foreign-net-pgas-2026-09-11",
    "news-m-naik-ini-prospek-saham-medc-elsa-pgas-dan-tpia",
    "news-trase-kompensasi-awal-pgas-ke-gunvor-9-kargo-lng",
    "news-ws-pgas-beber-latar-pembayaran-kompensasi-gunvor"
  ],
  "ADRO": [
    "news-nguat-pada-senin-79-ini-saham-rekomendasi-analis",
    "news-reli-saham-energi-adro-hingga-bumi-dalam-bidikan",
    "news-ru-adro-dan-risiko-yang-perlu-dicermati-investor",
    "filing-corporate-action-buyback-adro-2026-04-17",
    "filing-corporate-action-leadership-adro-2026-04-17",
    "filing-corporate-action-dividend-adro",
    "commodity-coal-2025-12-15"
  ],
  "PTBA": [
    "news-pengalihan-utang-whoosh-indonesia-siapkan-plan-b",
    "news-ngi-pendapatan-batu-bara-target-diversifikasi-20",
    "news-ba-ptba-melonjak-218-persen-jadi-rp-2-65-triliun",
    "commodity-coal-2025-12-15"
  ],
  "ICBP": [
    "news-am-hari-ini-kamis-27-agustus-2026-smil-mapa-icbp",
    "news-dapur-cuan-emiten-grup-salim-saham-bisa-naik-40",
    "news-murahmurahnya-dicicil-terus-ramalan-ke-rp-12000"
  ],
  "MYOR": [
    "news-unaan-dana-hasil-ipo-nagita-buat-pelunasan-utang",
    "news-naik-tipis-arus-kas-operasi-melejit-3158-persen",
    "news-fe-haven-sektor-konsumer-saat-rupiah-di-rp-18000"
  ],
  "AMRT": [
    "news-ari-ini-79-intip-rekomendasi-saham-mnc-sekuritas",
    "news-channel-amrt-midi-hingga-mapi-masuk-radar-analis",
    "news-a-amrt-di-tengah-efisiensi-dan-tekanan-daya-beli"
  ]
};

export const caseSymbols = [
  "ANTM",
  "BBCA",
  "BBRI",
  "TLKM",
  "GOTO",
  "PGAS"
] as const;
