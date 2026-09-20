import type { BusinessImpactDimension, SymbolCode } from "@/lib/types";
import { events } from "@/lib/data/fixtures";

/**
 * One place for the business-impact dimension vocabulary.
 *
 * Three copies of this used to drift: the mandate parser in
 * `lib/agent/engine.ts`, the focus-row highlighter in
 * `components/research-case-workspace.tsx`, and the sector switch that picked
 * a default focus. A word added to one of them changed which rows a reader saw
 * highlighted without changing which dimension the case was actually testing.
 *
 * What lives here is a lexicon, not data and not prose: the words a recorded
 * impact path or a typed mandate uses for each dimension. Every figure, every
 * verdict sentence, and the default focus itself still come from the
 * recordings — `defaultFocusFor` below reads them rather than mapping a sector
 * to a dimension by hand.
 */

/** Field labels. Structural copy, true of every case. */
export const DIMENSION_LABELS: Record<BusinessImpactDimension, string> = {
  volume: "Volume operasi",
  pricing: "Realisasi harga",
  margin: "Margin operasi",
  "cash-flow": "Arus kas operasi",
  "balance-sheet": "Kapasitas neraca",
  valuation: "Dampak valuasi",
};

/** The measurable each dimension is read on — field names, not interpretation. */
export const DIMENSION_OBSERVABLES: Record<BusinessImpactDimension, string> = {
  volume: "Produksi, volume penjualan, utilisasi, atau jumlah transaksi",
  pricing: "Realisasi harga, imbal hasil, atau pendapatan per unit",
  margin: "Margin kotor, margin operasi, selisih, atau biaya per unit",
  "cash-flow": "Arus kas operasi, modal kerja, atau konversi kas",
  "balance-sheet": "Utang bersih, ruang likuiditas, rasio modal, atau sumber pendanaan",
  valuation: "Ekspektasi laba, arus kas, atau selisih valuasi pembanding",
};

/**
 * Matching vocabulary. Both languages appear because the recordings carry
 * Indonesian impact paths while a reader may type either.
 */
export const DIMENSION_KEYWORDS: Record<BusinessImpactDimension, string[]> = {
  volume: ["volume produksi", "volume penjualan", "volume distribusi", "utilisasi", "throughput", "volume", "produksi"],
  pricing: ["realisasi harga", "realized price", "harga jual", "pricing", "pendapatan per unit", "revenue", "pendapatan"],
  margin: ["margin", "spread", "biaya per unit", "biaya"],
  "cash-flow": ["arus kas", "cash flow", "working capital", "modal kerja", "casa", "belanja modal"],
  "balance-sheet": ["neraca", "balance sheet", "utang", "debt", "likuiditas", "ekuitas", "equity", "free float"],
  valuation: ["valuasi", "valuation", "multiple", "ekspektasi laba", "qoq", "yoy"],
};

const DIMENSIONS = Object.keys(DIMENSION_LABELS) as BusinessImpactDimension[];

/** Longest keyword first, so "volume penjualan" wins over bare "volume". */
const RANKED_KEYWORDS: Array<{ dimension: BusinessImpactDimension; keyword: string }> = DIMENSIONS
  .flatMap((dimension) => DIMENSION_KEYWORDS[dimension].map((keyword) => ({ dimension, keyword })))
  .sort((a, b) => b.keyword.length - a.keyword.length);

/** Does this row label belong to the dimension the case is testing? */
export function matchesDimension(label: string, dimension: BusinessImpactDimension): boolean {
  const value = label.toLowerCase();
  return DIMENSION_KEYWORDS[dimension].some((keyword) => value.includes(keyword));
}

/**
 * The dimension a free-text mandate names outright, if it names one.
 *
 * Earliest mention wins, longer keyword breaks a tie at the same position.
 * "margin dan cash flow" names margin first and means margin; ranking by
 * keyword length alone would have answered cash-flow because that phrase is
 * longer, which is not what the sentence says.
 */
export function dimensionFromText(text: string): BusinessImpactDimension | undefined {
  const value = text.toLowerCase();
  let best: { dimension: BusinessImpactDimension; at: number; length: number } | undefined;
  for (const { dimension, keyword } of RANKED_KEYWORDS) {
    const at = value.indexOf(keyword);
    if (at === -1) continue;
    if (!best || at < best.at || (at === best.at && keyword.length > best.length)) {
      best = { dimension, at, length: keyword.length };
    }
  }
  return best?.dimension;
}

/**
 * Default focus read from the recordings, not from a sector table.
 *
 * Every recorded impact link states its own path — "Harga komoditas →
 * realisasi harga → margin" — and the dimension it lands on is the last term.
 * The symbol's own recorded paths vote; where a symbol has no linked
 * recording, the whole recorded set votes instead. A sector switch would have
 * asserted a focus no recording supports, and would have stayed asserted after
 * the recordings said otherwise.
 */
function recordedPaths(symbol?: SymbolCode): string[] {
  const out: string[] = [];
  for (const event of events) {
    for (const link of event.impactLinks) {
      if (link.direction === "Unrelated") continue;
      if (symbol && link.symbol !== symbol) continue;
      if (link.path) out.push(link.path);
    }
  }
  return out;
}

function rankFocus(paths: string[]): BusinessImpactDimension[] {
  const counts = new Map<BusinessImpactDimension, number>();
  for (const path of paths) {
    const tail = path.split("\u2192").pop() ?? path;
    const dimension = dimensionFromText(tail) ?? dimensionFromText(path);
    if (!dimension) continue;
    counts.set(dimension, (counts.get(dimension) ?? 0) + 1);
  }
  return [...counts]
    .sort((a, b) => b[1] - a[1] || DIMENSIONS.indexOf(a[0]) - DIMENSIONS.indexOf(b[0]))
    .map(([dimension]) => dimension);
}

/** Every dimension this symbol's recordings reach, most-recorded first. The
 *  clarification offers the top of this list rather than a fixed pair. */
export function recordedFocusRanking(symbol?: SymbolCode): BusinessImpactDimension[] {
  const own = rankFocus(recordedPaths(symbol));
  const all = rankFocus(recordedPaths());
  return [...new Set([...own, ...all, ...DIMENSIONS])];
}

export function defaultFocusFor(symbol?: SymbolCode): BusinessImpactDimension {
  return recordedFocusRanking(symbol)[0];
}
