#!/usr/bin/env python3
"""
Turn the recorded Sectors API responses in data/sectors/ into lib/data/market.generated.ts.

Every number the app shows comes from one of those recordings. Nothing here invents a
price, a flow, a headline or a sentiment label: the transforms are aggregation,
unit conversion and a documented mapping from the API's own tags to the app's
category and direction vocabularies.

    python3 scripts/build_market_data.py
"""
import json
import math
import re
from datetime import datetime
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "sectors"
OUT = ROOT / "lib" / "data" / "market.generated.ts"

WINDOW = "__end-2026-09-11_start-2026-08-01"
SYMBOLS = ["ANTM", "INCO", "TINS", "BBCA", "BBRI", "BMRI", "TLKM", "JSMR", "EXCL",
           "GOTO", "BUKA", "EMTK", "PGAS", "ADRO", "PTBA", "ICBP", "MYOR", "AMRT"]
CASES = ["ANTM", "BBCA", "BBRI", "TLKM", "GOTO", "PGAS"]

SECTOR_MAP = {
    "Basic Materials": "Basic Materials",
    "Financials": "Financials",
    "Infrastructures": "Infrastructure",
    "Technology": "Technology",
    "Energy": "Energy",
    "Consumer Non-Cyclicals": "Consumer",
    "Consumer Cyclicals": "Consumer",
}

# The API's own tag vocabulary, mapped onto the six categories the app models.
CATEGORY_TAGS = [
    ("rates", {"Interest Rate", "Central Bank", "Inflation", "Monetary Policy"}),
    ("currency", {"Currency & FX"}),
    ("commodity", {"Commodities"}),
    ("policy", {"Government Policy", "Politics & Regulation", "Ministry", "OJK", "Tax"}),
]
DIRECTION_TAGS = {"Bullish": "Supported", "Bearish": "Adverse", "Neutral": "Mixed"}

CATEGORY_PATH = {
    "commodity": "Harga komoditas → realisasi harga → margin",
    "rates": "Suku bunga → biaya dana dan yield aset → margin bunga",
    "currency": "Kurs → biaya input dan pendapatan valuta → margin",
    "policy": "Kebijakan → biaya kepatuhan dan kapasitas operasi → margin",
}
DIMENSION_PATH = {
    "financials": "Kinerja kuartalan → pendapatan dan laba → valuasi",
    "valuation": "Ekspektasi analis → asumsi valuasi → multiple",
    "ownership": "Perubahan kepemilikan → free float dan arus → likuiditas",
    "dividend": "Kebijakan dividen → arus kas ke pemegang saham → neraca",
    "management": "Perubahan manajemen → eksekusi operasi → biaya",
    "future": "Rencana ke depan → kapasitas dan belanja modal → arus kas",
    "sustainability": "Komitmen keberlanjutan → biaya kepatuhan → margin",
    "technical": "Gerak harga terlapor → belum ada jalur operasional",
}


def load(name):
    return json.loads((RAW / name).read_text())


def rows(payload, *keys):
    if isinstance(payload, list):
        return payload
    for key in keys:
        if key in payload:
            return payload[key]
    return []


def fmt(value):
    return json.dumps(value, ensure_ascii=False)


def idr(value):
    """Compact rupiah, in the Indonesian scale the rest of the app uses."""
    for unit, scale in (("T", 1e12), ("M", 1e9), ("jt", 1e6)):
        if abs(value) >= scale:
            return f"Rp{value / scale:,.1f}{unit}".replace(",", "·").replace(".", ",").replace("·", ".")
    return f"Rp{value:,.0f}".replace(",", ".")


def pct(value, digits=1):
    return f"{value * 100:.{digits}f}%".replace(".", ",")


# --------------------------------------------------------------------------- price
ihsg = {row["date"]: round(row["price"]) for row in rows(load(f"v2_index-daily_ihsg{WINDOW}.json"), "data", "results")}
daily = {s: rows(load(f"v2_daily_{s}{WINDOW}.json"), "data", "results") for s in SYMBOLS}
overview = {s: load(f"v2_company_report_{s}__sections-overview.json") for s in SYMBOLS}
free_float = {r["symbol"].split(".")[0]: r["free_float"] for r in rows(load("v2_free-float.json"), "results", "data")}
brokers = {r["code"]: r for r in rows(load("v2_brokers.json"), "results", "data")}

DATES = sorted(set(ihsg) & set.intersection(*[{r["date"] for r in daily[s]} for s in SYMBOLS]))
ASOF = DATES[-1]

series = {}
for s in SYMBOLS:
    by_date = {r["date"]: r for r in daily[s]}
    series[s] = [{"date": d, "close": by_date[d]["close"], "ihsg": ihsg[d], "volume": by_date[d]["volume"]}
                 for d in DATES]


def returns(values):
    return [values[i] / values[i - 1] - 1 for i in range(1, len(values))]


market_returns = returns([ihsg[d] for d in DATES])


def beta_of(symbol):
    stock = returns([p["close"] for p in series[symbol]])
    mean_m = sum(market_returns) / len(market_returns)
    mean_s = sum(stock) / len(stock)
    var = sum((m - mean_m) ** 2 for m in market_returns)
    if var == 0:
        return 1.0
    cov = sum((m - mean_m) * (x - mean_s) for m, x in zip(market_returns, stock))
    return round(cov / var, 2)


def three_day_return(symbol):
    closes = [p["close"] for p in series[symbol]]
    return closes[-1] / closes[-4] - 1


sector_of = {s: SECTOR_MAP[overview[s]["overview"]["sector"]] for s in SYMBOLS}
market_cap_of = {s: series[s][-1]["close"] * (overview[s]["overview"]["market_cap"] / overview[s]["overview"]["last_close_price"])
                 for s in SYMBOLS}

sector_returns = {}
for sector in set(sector_of.values()):
    peers = [s for s in SYMBOLS if sector_of[s] == sector]
    weight = sum(market_cap_of[s] for s in peers)
    sector_returns[sector] = round(sum(three_day_return(s) * market_cap_of[s] for s in peers) / weight, 6)

# --------------------------------------------------------------------------- events
def category_of(tags):
    for name, members in CATEGORY_TAGS:
        if members & tags:
            return name
    return "company"


def direction_of(tags):
    for tag, direction in DIRECTION_TAGS.items():
        if tag in tags:
            return direction
    return "Unverified"


def dominant_dimension(item):
    dims = item.get("dimension") or {}
    if not dims or not any(dims.values()):
        return "technical"
    return max(dims, key=lambda key: dims[key])


def summarise(body, limit=240):
    text = re.sub(r"\s+", " ", (body or "").strip())
    if len(text) <= limit:
        return text
    cut = text[:limit]
    return cut[:cut.rfind(" ")] + "…"


def jakarta(timestamp):
    return f"{timestamp}+07:00" if len(timestamp) == 19 else timestamp


events = {}


def add_event(event_id, item, symbols_in_universe, source_type):
    tags = set(item.get("tags") or [])
    category = category_of(tags)
    dimension = dominant_dimension(item)
    direction = direction_of(tags)
    sub = (item.get("sub_sector") or [])
    sub = sub[0] if isinstance(sub, list) and sub else item.get("sub_sector")
    links = []
    for symbol in sorted(symbols_in_universe):
        spread = len([x for x in (item.get("symbols") or [item.get("symbol")]) if x])
        relevance = 95 if source_type == "filing" else max(40, 88 - (spread - 1) * 6)
        relevance = min(97, relevance + (2 if dimension in ("financials", "future") else 0))
        path = CATEGORY_PATH.get(category) or DIMENSION_PATH.get(dimension) or DIMENSION_PATH["technical"]
        rationale = (
            f"Sectors menandai peristiwa ini {', '.join(sorted(tags)) or 'tanpa tag'} pada dimensi {dimension}. "
            "Label sumber dipakai apa adanya; jalur eksposur dan observable operasional masih harus diverifikasi."
        )
        links.append({"symbol": symbol, "direction": direction, "relevance": relevance,
                      "path": path, "rationale": rationale})
    events[event_id] = {
        "id": event_id,
        "title": summarise(item["title"], 150),
        "summary": summarise(item.get("body") or item["title"]),
        "category": category,
        "sourceType": "filing" if source_type == "filing" else "sectors",
        "publishedAt": jakarta(item["timestamp"]),
        "sector": SECTOR_MAP.get({"basic-materials": "Basic Materials"}.get(sub, ""), None)
                  or sector_from_subsector(sub),
        "impactLinks": links,
        "source": item.get("source"),
        "tags": sorted(tags),
    }


SUBSECTOR_SECTOR = {
    "banks": "Financials", "financing-service": "Financials", "insurance": "Financials",
    "holding-investment-companies": "Financials", "investment-service": "Financials",
    "basic-materials": "Basic Materials", "industrial-goods": "Basic Materials",
    "oil-gas-coal": "Energy", "alternative-energy": "Energy", "utilities": "Energy",
    "telecommunication": "Infrastructure", "transportation-infrastructure": "Infrastructure",
    "heavy-constructions-civil-engineering": "Infrastructure",
    "software-it-services": "Technology", "technology-hardware-equipment": "Technology",
    "media-entertainment": "Technology",
    "food-beverage": "Consumer", "food-staples-retailing": "Consumer", "retailing": "Consumer",
    "consumer-services": "Consumer", "tobacco": "Consumer", "nondurable-household-products": "Consumer",
}


def sector_from_subsector(sub):
    return SUBSECTOR_SECTOR.get(sub or "", "Market")


for symbol in SYMBOLS:
    news = rows(load(f"v2_news{WINDOW}_symbols-{symbol}.JK.json"), "results", "data")
    scored = []
    for item in news:
        universe = {x.split(".")[0] for x in (item.get("symbols") or [])} & set(SYMBOLS)
        if symbol not in universe:
            continue
        tags = set(item.get("tags") or [])
        weight = (2 if tags & {"Bullish", "Bearish"} else 0) + (1 if len(universe) == 1 else 0)
        scored.append((weight, item["timestamp"], item, universe))
    scored.sort(key=lambda row: (row[0], row[1]), reverse=True)
    for _, _, item, universe in scored[:3]:
        add_event("news-" + re.sub(r"[^a-z0-9]+", "-", item["source"].lower())[-48:].strip("-"),
                  item, universe, "news")
    filings = rows(load(f"v2_filings{WINDOW}_symbol-{symbol}.JK.json"), "results", "data")
    for item in filings[:2]:
        universe = {(item.get("symbol") or "").split(".")[0]} & set(SYMBOLS)
        if not universe:
            continue
        add_event("filing-" + re.sub(r"[^a-z0-9]+", "-", item["source"].lower())[-48:].strip("-"),
                  item, universe, "filing")

event_list = sorted(events.values(), key=lambda e: e["publishedAt"], reverse=True)
events_by_symbol = {s: [e["id"] for e in event_list if any(l["symbol"] == s for l in e["impactLinks"])]
                    for s in SYMBOLS}

# --------------------------------------------------------------------------- broker
broker_evidence = {}
for symbol in CASES:
    top = load(f"v2_broker-summary_{symbol}_top.json")
    flow = rows(load(f"v2_foreign-flow_{symbol}.json"), "data", "results")
    window_flow = [r for r in flow if DATES[0] <= r["date"] <= DATES[-1]]
    reference = series[symbol][-1]["close"]
    shares_outstanding = market_cap_of[symbol] / reference
    broker_evidence[symbol] = {
        "buyers": sorted([{"code": b["broker_code"],
                           "origin": "foreign" if brokers.get(b["broker_code"], {}).get("is_foreign") else "local",
                           "value": b["buy_idr"]} for b in top["top_buyers"]],
                          key=lambda r: r["value"], reverse=True),
        "sellers": sorted([{"code": b["broker_code"],
                            "origin": "foreign" if brokers.get(b["broker_code"], {}).get("is_foreign") else "local",
                            "value": b["sell_idr"]} for b in top["top_sellers"]],
                           key=lambda r: r["value"], reverse=True),
        "netForeign": sum(r["net_foreign_inflow"] for r in window_flow),
        "totalMarketValue": sum(p["close"] * p["volume"] for p in series[symbol]),
        "freeFloatShares": shares_outstanding * free_float.get(symbol, 1.0),
        "sharesOutstanding": shares_outstanding,
        "referencePrice": reference,
        "windowStart": top["start"],
        "windowEnd": top["end"],
    }

# --------------------------------------------------------------------------- financials
def financial_rows(symbol):
    quarters = load(f"v2_financials_quarterly_{symbol}__n_quarters-4.json")
    quarters = sorted(quarters, key=lambda q: q["date"], reverse=True)
    latest = quarters[0]
    period = latest["date"]
    bank = latest.get("financials_sector_metrics") or {}
    out = []

    def row(label, value, interpretation):
        out.append({"label": label, "value": value, "period": period, "interpretation": interpretation})

    if bank.get("total_deposit"):
        casa = (bank.get("current_account", 0) + bank.get("savings_account", 0)) / bank["total_deposit"]
        row("Net interest income", idr(bank["net_interest_income"]),
            "Menguji transmisi biaya dana dan yield aset pada pilar Katalis.")
        row("CASA ratio", pct(casa),
            "Memberi konteks struktur biaya dana, tanpa menggantikan bukti arus partisipan.")
        row("Gross loan", idr(bank["gross_loan"]),
            "Menunjukkan basis penyaluran kredit yang menanggung perubahan margin.")
        if bank.get("allowance_for_loans") and bank.get("gross_loan"):
            row("Allowance / gross loan", pct(bank["allowance_for_loans"] / bank["gross_loan"]),
                "Memeriksa sisi kualitas aset yang dapat berlawanan dengan dukungan margin.")
    else:
        row("Revenue", idr(latest["revenue"]),
            "Dipakai sebagai konteks skala monetisasi; bukan penentu arah harga.")
        if latest.get("operating_pnl") and latest.get("revenue"):
            row("Operating margin", pct(latest["operating_pnl"] / latest["revenue"]),
                "Menguji apakah perubahan harga jual atau biaya diteruskan ke operasi.")
        if latest.get("operating_cash_flow"):
            row("Operating cash flow", idr(latest["operating_cash_flow"]),
                "Menguji transmisi perubahan ke kas operasi, bukan ke harga saham.")
        if latest.get("total_debt") and latest.get("total_equity"):
            row("Total debt / equity", pct(latest["total_debt"] / latest["total_equity"]),
                "Memberi konteks ruang neraca saat siklus berubah.")
    if len(quarters) > 1 and quarters[1].get("revenue"):
        change = latest["revenue"] / quarters[1]["revenue"] - 1
        row("Revenue QoQ", pct(change),
            f"Pembanding kuartal sebelumnya ({quarters[1]['date']}); bukan pertumbuhan tahunan.")
    return out


financials = {s: financial_rows(s) for s in CASES}

# --------------------------------------------------------------------------- companies
def evidence_state(symbol):
    if symbol not in CASES:
        return "Insufficient Evidence"
    if not events_by_symbol[symbol]:
        return "Insufficient Evidence"
    directions = {l["direction"] for e in event_list for l in e["impactLinks"] if l["symbol"] == symbol}
    return "Mixed Evidence" if {"Adverse", "Unverified"} & directions else "Corroborated"


def change_pct(symbol):
    closes = [p["close"] for p in series[symbol]]
    return round((closes[-1] / closes[-2] - 1) * 100, 2)


def volume_ratio(symbol):
    volumes = [p["volume"] for p in series[symbol]]
    baseline = sorted(volumes[:-1])
    median = baseline[len(baseline) // 2]
    return volumes[-1] / median if median else 0


companies = []
for symbol in SYMBOLS:
    ov = overview[symbol]["overview"]
    linked = len(events_by_symbol[symbol])
    companies.append({
        "symbol": symbol,
        "name": overview[symbol]["company_name"],
        "sector": sector_of[symbol],
        "subsector": ov["sub_sector"],
        "price": series[symbol][-1]["close"],
        "changePct": change_pct(symbol),
        "marketCap": round(market_cap_of[symbol] / 1e12, 1),
        "analyzed": symbol in CASES,
        "evidenceState": evidence_state(symbol),
        "summary": (f"Close {series[symbol][-1]['close']:,}".replace(",", ".")
                    + f" pada {ASOF}; volume terakhir {volume_ratio(symbol):.2f}× median {len(DATES) - 1} sesi; "
                    + (f"{linked} peristiwa terhubung pada jendela ini." if linked else "belum ada peristiwa terhubung pada jendela ini.")),
    })

# --------------------------------------------------------------------------- emit
def ts(value, indent=0):
    return json.dumps(value, ensure_ascii=False, indent=2)


OUT.write_text(f"""// GENERATED FILE — do not edit by hand.
// Written by scripts/build_market_data.py from the recorded Sectors API responses
// in data/sectors/. Every value below is either a raw field from those recordings or
// an aggregate of them; re-run the script to refresh it.

import type {{ BrokerEvidence, EvidenceState, ImpactDirection, MarketEvent, PricePoint, Sector, SymbolCode }} from "@/lib/types";

export const DATA_AS_OF = {fmt(ASOF + "T16:15:00+07:00")};
export const WINDOW_DATES = {ts(DATES)} as const;

export interface RawCompany {{
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
}}

export interface RawEvent {{
  id: string;
  title: string;
  summary: string;
  category: MarketEvent["category"];
  sourceType: MarketEvent["sourceType"];
  publishedAt: string;
  sector: Sector | "Market";
  source: string | null;
  tags: string[];
  impactLinks: Array<{{ symbol: SymbolCode; direction: ImpactDirection; relevance: number; path: string; rationale: string }}>;
}}

export const rawCompanies: RawCompany[] = {ts(companies)};

export const priceSeries: Record<string, PricePoint[]> = {ts(series)};

export const brokerEvidence: Record<string, BrokerEvidence & {{ windowStart: string; windowEnd: string }}> = {ts(broker_evidence)};

export const financialRows: Record<string, Array<{{ label: string; value: string; period: string; interpretation: string }}>> = {ts(financials)};

export const sectorReturns: Record<string, number> = {ts(sector_returns)};

export const betas: Record<string, number> = {ts({s: beta_of(s) for s in SYMBOLS})};

export const rawEvents: RawEvent[] = {ts(event_list)};

export const eventIdsBySymbol: Record<string, string[]> = {ts(events_by_symbol)};

export const caseSymbols = {ts(CASES)} as const;
""", encoding="utf-8")

print(f"{len(DATES)} sessions {DATES[0]}..{DATES[-1]}; {len(companies)} companies; "
      f"{len(event_list)} events; {len(broker_evidence)} broker sets; asOf {ASOF}")
