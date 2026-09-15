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
from datetime import date, datetime, timedelta
from pathlib import Path

ROOT = Path(__file__).resolve().parent.parent
RAW = ROOT / "data" / "sectors"
OUT = ROOT / "lib" / "data" / "market.generated.ts"

WINDOW = "__end-2026-09-11_start-2026-08-01"
SYMBOLS = ["ANTM", "INCO", "TINS", "BBCA", "BBRI", "BMRI", "TLKM", "JSMR", "EXCL",
           "GOTO", "BUKA", "EMTK", "PGAS", "ADRO", "PTBA", "ICBP", "MYOR", "AMRT"]
# Full-case coverage is derived from recording availability: a symbol qualifies
# when its broker-summary recording exists. Never hand-extend this list without
# the recording — that would be dummy data.
CASES = [s for s in SYMBOLS if (RAW / f"v2_broker-summary_{s}_top.json").exists()]

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
    "flows": "Arus asing dan konsentrasi broker → tekanan beli/jual → likuiditas",
    "sentiment": "Volume liputan → perhatian ritel → volume tanpa perubahan operasional",
}
DIMENSION_PATH = {
    "financials": "Kinerja kuartalan → pendapatan dan laba → valuasi",
    "valuation": "Ekspektasi analis → asumsi valuasi → multiple",
    "ownership": "Perubahan kepemilikan → free float dan arus → likuiditas",
    "dividend": "Kebijakan dividen → arus kas ke pemegang saham → neraca",
    "buyback": "Pembelian kembali → kas dan saham beredar → neraca",
    "corporate": "Aksi korporasi → struktur modal dan likuiditas → valuasi",
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

# subsector_returns groups the same 18-emiten return data by the exact Sectors
# sub_sector label (e.g. "Banks", "Oil, Gas & Coal") instead of the six broad
# buckets above, so momentum compares a symbol against its real peers rather
# than an unrelated sector-mate. There is no return field in the recorded
# subsector_report; that endpoint only carries P/E statistics, so it cannot
# replace this number — see subsector_context below for what it does add.
subsector_of = {s: overview[s]["overview"]["sub_sector"] for s in SYMBOLS}
subsector_returns = {}
for subsector in set(subsector_of.values()):
    peers = [s for s in SYMBOLS if subsector_of[s] == subsector]
    weight = sum(market_cap_of[s] for s in peers)
    subsector_returns[subsector] = round(sum(three_day_return(s) * market_cap_of[s] for s in peers) / weight, 6)

SUBSECTOR_REPORT_FILES = {
    "Banks": "v2_subsector_report_banks__sections-statistics.json",
    "Oil, Gas & Coal": "v2_subsector_report_oil-gas-coal__sections-statistics.json",
    "Telecommunication": "v2_subsector_report_telecommunication__sections-statistics.json",
}
subsector_context = {}
for subsector, filename in SUBSECTOR_REPORT_FILES.items():
    if not (RAW / filename).exists():
        continue
    stats = load(filename)["statistics"]
    subsector_context[subsector] = {
        "totalCompanies": stats["total_companies"],
        "medianPe": round(stats["filtered_median_pe"], 2),
        "weightedAvgPe": round(stats["filtered_weighted_avg_pe"], 2),
        "sampleCompanies": len([s for s in SYMBOLS if subsector_of[s] == subsector]),
    }

# --------------------------------------------------------------------------- shareholders
def foreign_ownership_series(symbol):
    filename = f"v2_company_shareholders-composition_{symbol}.json"
    if not (RAW / filename).exists():
        return None
    payload = load(filename)
    points = sorted(payload["data"], key=lambda r: r["date"])
    series_out = []
    for row in points:
        shares = row.get("shares_number")
        if not shares:
            continue
        series_out.append({
            "date": row["date"],
            "foreignPct": round(row["total_f"] / shares, 4),
            "localPct": round(row["total_l"] / shares, 4),
        })
    return series_out or None


# --------------------------------------------------------------------------- segments
def top_revenue_segments(symbol):
    filename = f"v2_company_get-segments_{symbol}.json"
    if not (RAW / filename).exists():
        return None
    payload = load(filename)
    rows_in = [r for r in payload.get("revenue_breakdown", []) if r.get("target") == "Total Revenue" and r.get("value")]
    total = sum(r["value"] for r in rows_in)
    if not total:
        return None
    top = sorted(rows_in, key=lambda r: r["value"], reverse=True)[:3]
    return [{"segment": r["source"], "share": round(r["value"] / total, 4)} for r in top]


revenue_segments = {s: top_revenue_segments(s) for s in SYMBOLS if top_revenue_segments(s)}

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
        # Recorded heuristic, not a live model: filings carry 95; otherwise the
        # score decays as the item spreads across more symbols (less specific).
        # The engine treats this as a starting rank filtered by the user's
        # playbook relevanceFloor — never as a verdict.
        relevance = 95 if source_type == "filing" else max(40, 88 - (spread - 1) * 6)
        relevance = min(97, relevance + (2 if dimension in ("financials", "future") else 0))
        segment = (revenue_segments.get(symbol) or [None])[0]
        if category == "commodity" and segment:
            path = f"{segment['segment']} ({pct(segment['share'], 0)} pendapatan {symbol}) → realisasi harga → margin"
        else:
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
        "body": re.sub(r"\s+", " ", (item.get("body") or "").strip()) or None,
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

# --------------------------------------------------------------------------- corporate actions
# Every branch below reads the per-symbol corporate-actions recording when it
# exists and emits nothing when it does not. Splits/rights recordings on disk
# are all stale (2011-2021), so those branches stay silent until a fresh
# recording lands — that silence is honest, not a missing feature.
BUYBACK_RE = re.compile(r"buy-?back|pembelian kembali|repurchase", re.IGNORECASE)
LEAD_RE = re.compile(r"appoint|new Director|President Commissioner| Direksi|Dewan Komisaris|board.{0,20}term", re.IGNORECASE)


def _leadership_snippet(result):
    for sentence in re.split(r"(?<=[.!])\s+", result or ""):
        if LEAD_RE.search(sentence):
            return sentence.strip()[:220]
    return None


def add_corporate_action_events(symbol, asof_date):
    filename = f"v2_company_corporate-actions_{symbol}.json"
    if not (RAW / filename).exists():
        return
    actions = load(filename)["corporate_actions"]
    sector = sector_of[symbol]

    def emit(event_id, title, summary, published_at, path, rationale, tags, relevance):
        events[event_id] = {
            "id": event_id,
            "title": title,
            "summary": summary,
            "body": None,
            "category": "company",
            "sourceType": "filing",
            "publishedAt": published_at,
            "sector": sector,
            "impactLinks": [{
                "symbol": symbol, "direction": "Mixed", "relevance": relevance,
                "path": path,
                "rationale": rationale,
            }],
            "source": None,
            "tags": tags,
        }

    dividends = [d for d in (actions.get("dividend") or []) if d.get("ex_date")]
    if dividends:
        nearest = min(dividends, key=lambda d: abs((date.fromisoformat(d["ex_date"]) - asof_date).days))
        if abs((date.fromisoformat(nearest["ex_date"]) - asof_date).days) <= 270:
            amount = nearest["dividend_amount"]
            emit(f"filing-corporate-action-dividend-{symbol.lower()}",
                 f"{symbol} dividen tunai Rp{amount:,.2f} per saham".replace(",", "."),
                 f"Ex-date {nearest['ex_date']}, pembayaran {nearest['payment_date']}. Jadwal distribusi tunai, bukan sinyal arah harga.",
                 jakarta(nearest["ex_date"] + "T09:00:00"),
                 DIMENSION_PATH["dividend"],
                 f"Sectors corporate-actions API mencatat dividen ex-date {nearest['ex_date']}, dibayar {nearest['payment_date']}. Fakta jadwal distribusi, bukan sinyal arah harga.",
                 ["Dividend"], 92)

    for split in (actions.get("stock_split") or []):
        if not split.get("date"):
            continue
        if abs((date.fromisoformat(split["date"]) - asof_date).days) > 270:
            continue
        emit(f"filing-corporate-action-split-{symbol.lower()}-{split['date']}",
             f"{symbol} stock split 1:{split['split_ratio']} pada {split['date']}",
             f"Rasio split {split['split_ratio']}:1 berlaku {split['date']}. Jumlah saham berubah, nilai perusahaan tidak.",
             jakarta(split["date"] + "T09:00:00"),
             DIMENSION_PATH["corporate"],
             f"Sectors corporate-actions API mencatat stock split {symbol} rasio {split['split_ratio']}:1 pada {split['date']}. Fakta struktur modal, bukan sinyal arah harga.",
             ["Stock Split"], 90)

    for right in (actions.get("right_issue") or []):
        if not right.get("ex_date"):
            continue
        if abs((date.fromisoformat(right["ex_date"]) - asof_date).days) > 270:
            continue
        emit(f"filing-corporate-action-rights-{symbol.lower()}-{right['ex_date']}",
             f"{symbol} rights issue ex-date {right['ex_date']} harga Rp{right['price']:,}".replace(",", "."),
             f"Ex-date {right['ex_date']}, harga pelaksanaan Rp{right['price']:,}. Potensi dilusi bila hak tidak ditebus.".replace(",", "."),
             jakarta(right["ex_date"] + "T09:00:00"),
             DIMENSION_PATH["corporate"],
             f"Sectors corporate-actions API mencatat rights issue {symbol} ex-date {right['ex_date']} pada harga Rp{right['price']:,}. Fakta penawaran saham baru, bukan sinyal arah harga.".replace(",", "."),
             ["Right Issue"], 90)

    for agm in (actions.get("agm") or []):
        result = agm.get("agm_result") or ""
        agm_date = agm.get("agm_date") or ""
        if not result or not agm_date:
            continue
        try:
            within = abs((date.fromisoformat(agm_date) - asof_date).days) <= 270
        except ValueError:
            continue
        if not within:
            continue
        buyback_hit = BUYBACK_RE.search(result)
        if buyback_hit:
            snippet = result[max(0, buyback_hit.start() - 60):buyback_hit.end() + 140].strip()
            emit(f"filing-corporate-action-buyback-{symbol.lower()}-{agm_date}",
                 f"{symbol} RUPS menyetujui buyback ({agm_date})",
                 f"RUPS {agm_date} menyetujui pembelian kembali saham. …{snippet}… Potensi menopang EPS dan memberi sinyal keyakinan manajemen; eksekusi dan harga beli aktual belum terekam.",
                 jakarta(agm_date + "T09:00:00"),
                 DIMENSION_PATH["buyback"],
                 f"Sectors corporate-actions API mencatat persetujuan buyback {symbol} pada RUPS {agm_date}. Fakta otorisasi, bukan bukti eksekusi — realisasi pembelian kembali masih harus diverifikasi.",
                 ["Buyback"], 90)
        snippet = _leadership_snippet(result)
        if snippet:
            emit(f"filing-corporate-action-leadership-{symbol.lower()}-{agm_date}",
                 f"{symbol} perubahan pengurus hasil RUPS ({agm_date})",
                 f"RUPS {agm_date}: {snippet} Dampak ke eksekusi operasi masih harus diuji pada laporan berikutnya.",
                 jakarta(agm_date + "T09:00:00"),
                 DIMENSION_PATH["management"],
                 f"Sectors corporate-actions API mencatat keputusan pengurus {symbol} pada RUPS {agm_date}. Fakta tata kelola; jalur ke biaya/eksekusi belum terbukti dan diuji pada laba/arus kas laporan berikutnya.",
                 ["Leadership"], 88)


for symbol in SYMBOLS:
    add_corporate_action_events(symbol, date.fromisoformat(DATES[-1]))

# --------------------------------------------------------------------------- commodity prices
# Exposure legs for the miners/consumers this app tracks. Only Coal and Gold
# have a price recording on disk today; the rest are declared here so the
# mapping is reviewable, and add_commodity_event skips legs with no recording
# instead of inventing a series. Drop the file in data/sectors/ + re-run to
# light the leg up — no code change needed.
COMMODITY_EXPOSURE = {
    "Coal": ["ADRO", "PTBA"],
    "Gold": ["ANTM"],
    "Nickel": ["ANTM", "INCO"],
    "Tin": ["TINS"],
    "CPO": ["ICBP", "MYOR", "AMRT"],
    "Oil": ["PGAS", "ADRO", "PTBA"],
}


def add_commodity_event(name):
    recording = RAW / f"v2_mining_commodities_{name}_price__end_year-2025_start_year-2023.json"
    if not recording.exists():
        return
    points = sorted((r for r in json.loads(recording.read_text())),
                     key=lambda r: r["date"])
    if len(points) < 2:
        return
    latest, previous = points[-1], points[-2]
    change = latest["price_usd_per_ton"] / previous["price_usd_per_ton"] - 1
    direction = "Supported" if change > 0.005 else "Adverse" if change < -0.005 else "Mixed"
    symbols = [s for s in COMMODITY_EXPOSURE[name] if s in SYMBOLS]
    event_id = f"commodity-{name.lower()}-{latest['date']}"
    links = []
    for symbol in symbols:
        segment = (revenue_segments.get(symbol) or [None])[0]
        path = (f"{segment['segment']} ({pct(segment['share'], 0)} pendapatan {symbol}) → realisasi harga → margin"
                if segment else CATEGORY_PATH["commodity"])
        links.append({
            "symbol": symbol, "direction": direction, "relevance": 80, "path": path,
            "rationale": (f"Sectors mining-commodities API mencatat harga {name} (field price_usd_per_ton) "
                          f"berubah {pct(change)} dari {previous['date']} ke {latest['date']}. "
                          "Data bulanan, rekaman terbaru mendahului jendela harian Ags-Sep 2026 aplikasi ini."),
        })
    if not links:
        return
    events[event_id] = {
        "id": event_id,
        "title": f"Harga {name} acuan {latest['date']}: USD{latest['price_usd_per_ton']}",
        "summary": f"Harga referensi {name} (price_usd_per_ton) bergerak {pct(change)} dari {previous['date']} ke {latest['date']}, rekaman Sectors mining-commodities.",
        "body": None,
        "category": "commodity",
        "sourceType": "commodity",
        "publishedAt": jakarta(latest["date"] + "T00:00:00"),
        "sector": sector_from_subsector("basic-materials" if name != "Gold" else "basic-materials"),
        "impactLinks": links,
        "source": None,
        "tags": ["Commodities"],
    }


for commodity in COMMODITY_EXPOSURE:
    add_commodity_event(commodity)

# --------------------------------------------------------------------------- ownership change (foreign pct MoM)
# Reads the same shareholders-composition recordings that feed ownershipSeries.
# Emits only on the latest month-over-month move beyond ±0.5pp — an honest,
# reviewable tripwire, not a model. Runs for every symbol with a recording;
# today none of the four recorded symbols trips it, so this section is silent
# until the next recording refresh.
def add_ownership_change_events(symbol):
    series_out = foreign_ownership_series(symbol)
    if not series_out or len(series_out) < 2:
        return
    prev, last = series_out[-2], series_out[-1]
    delta_pp = (last["foreignPct"] - prev["foreignPct"]) * 100
    if abs(delta_pp) < 0.5:
        return
    direction = "Supported" if delta_pp > 0 else "Adverse"
    event_id = f"filing-ownership-change-{symbol.lower()}-{last['date']}"
    events[event_id] = {
        "id": event_id,
        "title": f"Kepemilikan asing {symbol} berubah {delta_pp:+.1f}pp MoM ({last['date']})".replace(".", ","),
        "summary": (f"Asing {pct(last['foreignPct'])} per {last['date']} vs {pct(prev['foreignPct'])} per {prev['date']} "
                    f"(Δ {delta_pp:+.2f}pp). Fakta komposisi pemegang saham; arah harga masih harus diverifikasi.".replace(".", ",")),
        "body": None,
        "category": "company",
        "sourceType": "filing",
        "publishedAt": jakarta(last["date"] + "T09:00:00"),
        "sector": sector_of[symbol],
        "impactLinks": [{
            "symbol": symbol, "direction": direction, "relevance": 85,
            "path": DIMENSION_PATH["ownership"],
            "rationale": (f"Sectors shareholders-composition API mencatat porsi asing {symbol} bergerak {delta_pp:+.2f}pp "
                          f"dari {prev['date']} ke {last['date']}. Fakta kepemilikan; jalur ke free float dan likuiditas masih harus diuji.".replace(".", ",")),
        }],
        "source": None,
        "tags": ["Ownership"],
    }


for symbol in SYMBOLS:
    add_ownership_change_events(symbol)

# --------------------------------------------------------------------------- flows (foreign net vs value traded)
# Recorded heuristic: |netForeign| over the app window at least 2% of total
# value traded flags a flows event. Direction follows the sign of the foreign
# net; the rationale names both numbers so the claim stays checkable. A
# block-trade flag (topBuyerShare >= 0.42 + volume Extreme) is deliberately
# NOT emitted: the broker-summary recordings carry only top-2 cohorts, so no
# honest denominator exists. It stays a web-watch review keyword instead.
def add_flows_events(symbol):
    if symbol not in CASES:
        return
    filename = f"v2_foreign-flow_{symbol}.json"
    if not (RAW / filename).exists():
        return
    flow = rows(load(filename), "data", "results")
    window_flow = [r for r in flow if DATES[0] <= r["date"] <= DATES[-1]]
    if not window_flow:
        return
    net_foreign = sum(r["net_foreign_inflow"] for r in window_flow)
    total_value = sum(p["close"] * p["volume"] for p in series[symbol])
    if not total_value:
        return
    share = abs(net_foreign) / total_value
    if share < 0.02:
        return
    direction = "Supported" if net_foreign > 0 else "Adverse"
    event_id = f"flows-foreign-net-{symbol.lower()}-{DATES[-1]}"
    events[event_id] = {
        "id": event_id,
        "title": f"Arus asing neto {symbol} {idr(net_foreign)} pada jendela {DATES[0]}–{DATES[-1]}",
        "summary": (f"Neto asing {idr(net_foreign)} ≈ {share * 100:.1f}% dari nilai transaksi {idr(total_value)} "
                    "pada jendela aplikasi. Fakta arus partisipan; kelanjutan atau pembalikan diuji pada sesi berikutnya.".replace(".", ",")),
        "body": None,
        "category": "flows",
        "sourceType": "sectors",
        "publishedAt": jakarta(DATES[-1] + "T16:15:00"),
        "sector": sector_of[symbol],
        "impactLinks": [{
            "symbol": symbol, "direction": direction, "relevance": 80,
            "path": CATEGORY_PATH["flows"],
            "rationale": (f"Sectors foreign-flow API mencatat neto asing {symbol} {idr(net_foreign)} pada jendela {DATES[0]}–{DATES[-1]}. "
                          "Fakta arus; bukan atribusi niat pembeli/penjual."),
        }],
        "source": None,
        "tags": ["Foreign Flow"],
    }


for symbol in SYMBOLS:
    add_flows_events(symbol)

# --------------------------------------------------------------------------- attention velocity (SVI proxy, no new source)
# Retail-dominated IDX moves on attention; this proxy counts the already-
# recorded Sectors news per symbol: last-7d count ≥ 5 AND at least double the
# prior 7d flags a sentiment event. Relevance is capped at 55 so the engine
# always renders it Low confidence, and the rationale carries the falsifier
# (no operational change → dismiss). No scraping, no new source risk.
def add_attention_velocity_events(symbol, asof):
    filename = f"v2_news{WINDOW}_symbols-{symbol}.JK.json"
    if not (RAW / filename).exists():
        return
    items = rows(load(filename), "results", "data")
    stamps = sorted(item["timestamp"][:10] for item in items if item.get("timestamp"))
    cutoff = (date.fromisoformat(asof) - timedelta(days=6)).isoformat()
    prior_start = (date.fromisoformat(asof) - timedelta(days=13)).isoformat()
    last7 = [d for d in stamps if d >= cutoff]
    prev7 = [d for d in stamps if prior_start <= d < cutoff]
    if len(last7) < 5 or len(last7) < 2 * len(prev7):
        return
    event_id = f"sentiment-attention-{symbol.lower()}-{asof}"
    events[event_id] = {
        "id": event_id,
        "title": f"Lonjakan liputan {symbol}: {len(last7)} berita 7 hari terakhir (vs {len(prev7)} pekan sebelumnya)",
        "summary": (f"Sectors news API mencatat {len(last7)} item {symbol} pada {cutoff}–{asof} vs {len(prev7)} pada 7 hari sebelumnya. "
                    "Proksi perhatian, bukan isi berita: batal bila volume/arus tidak diikuti perubahan operasional."),
        "body": None,
        "category": "sentiment",
        "sourceType": "sectors",
        "publishedAt": jakarta(asof + "T16:15:00"),
        "sector": sector_of[symbol],
        "impactLinks": [{
            "symbol": symbol, "direction": "Unverified", "relevance": 55,
            "path": CATEGORY_PATH["sentiment"],
            "rationale": (f"Hitungan rekaman Sectors news untuk {symbol}: {len(last7)} vs {len(prev7)} pekan sebelumnya. "
                          "Proksi liputan — bukan sentimen terukur dan bukan sinyal arah. Keyakinan dibatasi Rendah; wajib gugur bila tidak ada perubahan volume, arus, atau operasional."),
        }],
        "source": None,
        "tags": ["Attention"],
    }


for symbol in SYMBOLS:
    add_attention_velocity_events(symbol, DATES[-1])

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
    ownership_series = foreign_ownership_series(symbol)
    if ownership_series:
        broker_evidence[symbol]["ownershipSeries"] = ownership_series

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
  body: string | null;
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

export const subsectorReturns: Record<string, number> = {ts(subsector_returns)};

export const subsectorContext: Record<string, {{ totalCompanies: number; medianPe: number; weightedAvgPe: number; sampleCompanies: number }}> = {ts(subsector_context)};

export const revenueSegments: Record<string, Array<{{ segment: string; share: number }}>> = {ts(revenue_segments)};

export const betas: Record<string, number> = {ts({s: beta_of(s) for s in SYMBOLS})};

export const rawEvents: RawEvent[] = {ts(event_list)};

export const eventIdsBySymbol: Record<string, string[]> = {ts(events_by_symbol)};

export const caseSymbols = {ts(CASES)} as const;
""", encoding="utf-8")

print(f"{len(DATES)} sessions {DATES[0]}..{DATES[-1]}; {len(companies)} companies; "
      f"{len(event_list)} events; {len(broker_evidence)} broker sets; asOf {ASOF}")
