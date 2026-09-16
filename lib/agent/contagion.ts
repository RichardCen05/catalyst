import type { Citation, InvestorResearchPlaybook, MarketEvent, PricePoint, SymbolCode } from "@/lib/types";
import { citations } from "@/lib/data/fixtures";

/**
 * Panik menular — pertanyaan yang dapat difalsifikasi, bukan vonis.
 * Murni dari rekaman: 18 simbol OHLCV + IHSG, jendela sama, sudah dibundel.
 */

export const COMMODITY_EXPOSURE: Record<string, string[]> = {
  Coal: ["ADRO", "PTBA"],
  Gold: ["ANTM"],
  Nickel: ["ANTM", "INCO"],
  Tin: ["TINS"],
  CPO: ["ICBP", "MYOR", "AMRT"],
  Oil: ["PGAS", "ADRO", "PTBA"],
};

export function returnSeries(closes: number[]): number[] {
  const out: number[] = [];
  for (let i = 1; i < closes.length; i += 1) {
    out.push(closes[i] / closes[i - 1] - 1);
  }
  return out;
}

export function excessReturns(series: PricePoint[]): number[] {
  const stock = returnSeries(series.map((p) => p.close));
  const market = returnSeries(series.map((p) => p.ihsg));
  return stock.map((r, i) => r - market[i]);
}

export function pairCorrelation(a: number[], b: number[]): number | null {
  // Guard <10 observasi tumpang tindih → null, bukan angka.
  // Catatan: 28 close menghasilkan 27 excess return, sehingga jendela bundel
  // selalu melampaui guard ini; guard hanya untuk jendela sempit di masa depan
  // dan diuji via seri sintetis pendek.
  const n = Math.min(a.length, b.length);
  if (n < 10) return null;
  const x = a.slice(0, n);
  const y = b.slice(0, n);
  const mx = x.reduce((s, v) => s + v, 0) / n;
  const my = y.reduce((s, v) => s + v, 0) / n;
  let cov = 0;
  let vx = 0;
  let vy = 0;
  for (let i = 0; i < n; i += 1) {
    cov += (x[i] - mx) * (y[i] - my);
    vx += (x[i] - mx) ** 2;
    vy += (y[i] - my) ** 2;
  }
  if (vx === 0 || vy === 0) return null;
  return cov / Math.sqrt(vx * vy);
}

export function fundamentallyLinked(
  a: SymbolCode,
  b: SymbolCode,
  opts: {
    events: MarketEvent[];
    getSubsector?: (s: SymbolCode) => string | undefined;
    playbook?: InvestorResearchPlaybook;
  },
): boolean {
  // Filter negatif: tautan berarti BUKAN unexplained.
  for (const e of opts.events) {
    const syms = new Set(e.impactLinks.map((l) => l.symbol));
    if (syms.has(a) && syms.has(b)) return true;
  }
  if (opts.getSubsector) {
    const sa = opts.getSubsector(a);
    const sb = opts.getSubsector(b);
    if (sa && sb && sa === sb) return true;
  }
  for (const leg of Object.values(COMMODITY_EXPOSURE)) {
    if (leg.includes(a) && leg.includes(b)) return true;
  }
  const comp = opts.playbook?.preferredComparables?.[a] ?? [];
  if (comp.includes(b)) return true;
  const compB = opts.playbook?.preferredComparables?.[b] ?? [];
  if (compB.includes(a)) return true;
  return false;
}

export interface ContagionCandidate {
  symbol: SymbolCode;
  peer: SymbolCode;
  correlation: number;
  peerEventId: string;
  peerEventTitle: string;
  date: string;
  citations: Citation[];
}

const datePart = (iso: string) => iso.slice(0, 10);

export function detectContagionCandidates(args: {
  symbol: SymbolCode;
  date: string;
  priceSeriesBySymbol: Record<string, PricePoint[]>;
  events: MarketEvent[];
  getSubsector?: (s: SymbolCode) => string | undefined;
  playbook?: InvestorResearchPlaybook;
  thresholds: { contagionDropFloor: number; contagionCorrelationFloor: number };
}): ContagionCandidate[] {
  const { symbol, date, priceSeriesBySymbol, events, thresholds } = args;
  const series = priceSeriesBySymbol[symbol];
  if (!series || series.length < 2) return [];
  const idx = series.findIndex((p) => p.date === date);
  if (idx <= 0) return [];
  const prev = series[idx - 1];
  const cur = series[idx];
  const drop = cur.close / prev.close - 1;
  if (drop > -Math.abs(thresholds.contagionDropFloor)) return [];
  // Tanpa peristiwa terhubung ke symbol pada D atau D-1 → layak diperiksa.
  const d1 = series[idx - 1]?.date;
  const linkedDates = new Set(
    events
      .filter((e) => e.impactLinks.some((l) => l.symbol === symbol))
      .map((e) => datePart(e.publishedAt),
      ),
  );
  if (linkedDates.has(date) || (d1 && linkedDates.has(d1))) return [];

  const excessBySymbol = new Map<string, number[]>();
  for (const [s, ps] of Object.entries(priceSeriesBySymbol)) {
    if (ps.length >= 2) excessBySymbol.set(s, excessReturns(ps));
  }
  const targetExcess = excessBySymbol.get(symbol);
  if (!targetExcess) return [];

  const out: ContagionCandidate[] = [];
  // Urutan eksplisit: korelasi desc, lalu peer asc. Jangan andalkan iterasi map.
  const peers = Object.keys(priceSeriesBySymbol).filter((s) => s !== symbol).sort();
  for (const peer of peers) {
    const peerExcess = excessBySymbol.get(peer);
    if (!peerExcess) continue;
    const corr = pairCorrelation(targetExcess, peerExcess);
    if (corr === null || corr < thresholds.contagionCorrelationFloor) continue;
    if (fundamentallyLinked(symbol, peer as SymbolCode, { events, getSubsector: args.getSubsector, playbook: args.playbook })) continue;
    // Peer harus punya peristiwa adverse pada D atau D-1.
    const peerEvent = events.find((e) => {
      const d = datePart(e.publishedAt);
      if (d !== date && d !== d1) return false;
      const link = e.impactLinks.find((l) => l.symbol === (peer as SymbolCode));
      return link?.direction === "Adverse";
    });
    if (!peerEvent) continue;
    out.push({
      symbol,
      peer: peer as SymbolCode,
      correlation: Math.round(corr * 1000) / 1000,
      peerEventId: peerEvent.id,
      peerEventTitle: peerEvent.title,
      date,
      citations: [citations.daily(symbol), citations.daily(peer)],
    });
  }
  return out.sort((a, b) => b.correlation - a.correlation || (a.peer < b.peer ? -1 : 1));
}
