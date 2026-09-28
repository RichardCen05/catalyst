import {
  brokerEvidence,
  financialRows,
  institutionalFlows,
  priceSeries,
  rawCompanies,
} from "@/lib/data/market.generated";
import { endpointTemplate } from "@/lib/data/endpoint-registry";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { formatCurrency, formatNumber, signedPercent } from "@/lib/utils";
import type { Citation } from "@/lib/types";

/**
 * What was actually read from a recording, as measurements — never as prose.
 *
 * A citation used to hand the reader `tanggal, arus asing bersih harian` and
 * stop. Naming the columns is not the same as saying which rows were read,
 * what the values were, or what they come to.
 *
 * This module answers the first two questions and stops there on purpose.
 * Every entry below is computed from the recordings in
 * `lib/data/market.generated.ts` — the span, the values, and the comparisons
 * a reading turns on, including the app's own thresholds so a card cannot
 * disagree with the pillar above it. The sentences that interpret them are
 * written at `lib/agent/llm/reading-explain.ts` from exactly this material:
 * a table of hand-written verdicts per feed is a table that rots, because it
 * has to be edited whenever a feed is added and nothing fails when it is not.
 *
 * A feed with no digest renders none. Silence is the honest answer when the
 * recording behind a path is not one this app keeps per symbol.
 */
export interface RecordingDigest {
  /** How much of the recording was read. */
  scope: string;
  /** The values that carried the figure, already formatted. */
  values: { label: string; value: string }[];
  /**
   * The comparisons a reading turns on — a ratio against its baseline, a
   * share against the threshold the app judges it by, the direction of a net,
   * the limit of what the feed can say. Measurements and stated bounds, so a
   * sentence written from them cannot drift from the figures on the card.
   */
  context: { label: string; value: string }[];
}

/** Rupiah at the scale a reader can hold in their head. */
function idrShort(value: number): string {
  const sign = value < 0 ? "−" : "";
  const magnitude = Math.abs(value);
  if (magnitude >= 1e12) return `${sign}Rp ${(magnitude / 1e12).toFixed(1).replace(".", ",")} T`;
  if (magnitude >= 1e9) return `${sign}Rp ${(magnitude / 1e9).toFixed(1).replace(".", ",")} M`;
  if (magnitude >= 1e6) return `${sign}Rp ${(magnitude / 1e6).toFixed(1).replace(".", ",")} jt`;
  return `${sign}${formatCurrency(magnitude)}`;
}

function decimal(value: number, digits = 1): string {
  return value.toFixed(digits).replace(".", ",");
}

/**
 * A share as rupiah out of a hundred.
 *
 * "3,1% dari nilai transaksi" is arithmetic; "Rp 3,09 dari tiap Rp 100" is a
 * size. Both travel, so whoever writes the sentence can reach for the one a
 * reader can picture.
 */
function perHundred(sharePercent: number): string {
  return `Rp ${decimal(Math.abs(sharePercent), 2)} dari tiap Rp 100`;
}

function shortDate(iso: string): string {
  const parsed = new Date(iso);
  return Number.isNaN(parsed.getTime())
    ? iso
    : new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" }).format(parsed);
}

function median(values: number[]): number {
  const sorted = [...values].sort((left, right) => left - right);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 ? sorted[middle] : (sorted[middle - 1] + sorted[middle]) / 2;
}

/**
 * The emiten a citation was read for.
 *
 * Most paths carry it (`/v2/daily/ANTM/`), but the filings feed is one
 * address for the whole market and names the emiten only in the citation id
 * (`filing-ANTM`). Reading both means the filings card is not silently the
 * one card without a digest.
 */
function symbolOf(citation: Citation): string | undefined {
  const fromPath = citation.endpoint.split(/[/?]/).find((segment) => /^[A-Z]{2,6}$/.test(segment));
  if (fromPath) return fromPath;
  const fromId = citation.id.match(/-([A-Z]{2,6})$/);
  return fromId?.[1];
}

function dailyDigest(symbol: string): RecordingDigest | undefined {
  const series = priceSeries[symbol];
  if (!series?.length) return undefined;
  const last = series[series.length - 1];
  const comparison = series.slice(0, -1).map((point) => point.volume);
  const ratio = comparison.length ? last.volume / median(comparison) : undefined;
  const move = series[0].close ? (last.close / series[0].close - 1) * 100 : undefined;
  return {
    scope: `${series.length} sesi bursa, ${shortDate(series[0].date)} – ${shortDate(last.date)}`,
    values: [
      { label: "Penutupan terakhir", value: formatCurrency(last.close) },
      { label: "Volume terakhir", value: `${formatNumber(last.volume)} lembar` },
    ],
    context: [
      // The app's own volume score compares the last session against the
      // ones before it, so the baseline named here is that comparison set.
      ...(ratio ? [{ label: "Volume hari terakhir dibanding median pembanding", value: `${decimal(ratio, 2)}×` }] : []),
      { label: "Sesi pembanding", value: `${comparison.length} sesi` },
      ...(move === undefined ? [] : [{ label: "Perubahan harga sepanjang jendela", value: signedPercent(move) }]),
      { label: "Batas arti rekaman", value: "ramai atau sepinya perdagangan tidak menyebut siapa yang bertransaksi atau sebabnya" },
    ],
  };
}

function ihsgDigest(): RecordingDigest | undefined {
  // Every symbol's series carries the same index column, so the first one
  // that was recorded answers for the index.
  const series = Object.values(priceSeries).find((points) => points.length && points[0].ihsg);
  if (!series) return undefined;
  const last = series[series.length - 1];
  const move = series[0].ihsg ? (last.ihsg / series[0].ihsg - 1) * 100 : undefined;
  return {
    scope: `${series.length} sesi bursa, ${shortDate(series[0].date)} – ${shortDate(last.date)}`,
    values: [
      { label: "IHSG terakhir", value: formatNumber(last.ihsg) },
      { label: "IHSG awal jendela", value: formatNumber(series[0].ihsg) },
    ],
    context: [
      ...(move === undefined ? [] : [{ label: "Perubahan IHSG sepanjang jendela", value: signedPercent(move) }]),
      { label: "Peran rekaman", value: "pembanding pasar; gerak emiten dinilai setelah gerak pasar dikeluarkan" },
    ],
  };
}

function foreignDigest(symbol: string): RecordingDigest | undefined {
  const evidence = brokerEvidence[symbol];
  if (!evidence) return undefined;
  const share = evidence.totalMarketValue ? (evidence.netForeign / evidence.totalMarketValue) * 100 : undefined;
  return {
    scope: evidence.windowStart && evidence.windowEnd
      ? `Jendela ${shortDate(evidence.windowStart)} – ${shortDate(evidence.windowEnd)}`
      : "Jendela rekaman broker",
    values: [
      { label: "Arus asing bersih", value: idrShort(evidence.netForeign) },
      { label: "Total nilai transaksi", value: idrShort(evidence.totalMarketValue) },
    ],
    context: [
      { label: "Arah arus asing", value: evidence.netForeign >= 0 ? "bersih beli" : "bersih jual" },
      ...(share === undefined ? [] : [
        { label: "Porsi arus asing bersih terhadap nilai transaksi", value: `${decimal(Math.abs(share), 2)}%` },
        { label: "Porsi yang sama dalam rupiah", value: perHundred(share) },
      ]),
      { label: "Batas arti rekaman", value: "tidak menyebut siapa pembelinya, alasannya, atau apakah arahnya bertahan" },
    ],
  };
}

function brokerDigest(symbol: string): RecordingDigest | undefined {
  const evidence = brokerEvidence[symbol];
  // `buyIdr` is the per-broker triple from the `/top/` recording; a bundle
  // captured before that field existed falls back to the ranked value.
  const buyers = (evidence?.buyers ?? []).map((participant) => ({ code: participant.code, buy: participant.buyIdr ?? participant.value }));
  if (!evidence || !buyers.length) return undefined;
  const totalBuy = buyers.reduce((sum, participant) => sum + participant.buy, 0);
  const top = buyers.reduce((highest, participant) => (participant.buy > highest.buy ? participant : highest));
  const topShare = totalBuy ? (top.buy / totalBuy) * 100 : 0;
  const floor = DEFAULT_THRESHOLDS.concentrationFloor * 100;
  return {
    scope: `${buyers.length} broker pembeli dan ${evidence.sellers.length} broker penjual teratas`,
    values: [
      { label: "Nilai beli 10 broker teratas", value: idrShort(totalBuy) },
      { label: "Pembeli terbesar", value: `${top.code} · ${idrShort(top.buy)}` },
    ],
    context: [
      { label: "Porsi pembeli terbesar", value: `${decimal(topShare)}%` },
      { label: "Porsi yang sama dalam rupiah", value: perHundred(topShare) },
      // The card has to read the same way as the pillar above it, so the
      // comparison uses the app's own floor rather than a fresh opinion.
      { label: "Ambang aliran terpusat Catalyst", value: `${decimal(floor, 0)}%` },
      { label: "Posisi terhadap ambang", value: topShare >= floor ? "di atas ambang" : "di bawah ambang" },
      { label: "Batas arti rekaman", value: "kode broker bukan identitas pemilik dana; satu broker melayani banyak nasabah" },
    ],
  };
}

function overviewDigest(symbol: string): RecordingDigest | undefined {
  const company = rawCompanies.find((entry) => entry.symbol === symbol);
  if (!company) return undefined;
  const shares = company.price ? (company.marketCap * 1e12) / company.price : undefined;
  return {
    scope: `Profil satu emiten: ${company.name}, sektor ${company.sector}`,
    values: [
      { label: "Kapitalisasi pasar", value: `Rp ${decimal(company.marketCap)} T` },
      { label: "Harga acuan", value: formatCurrency(company.price) },
    ],
    context: [
      ...(shares ? [{ label: "Perkiraan saham beredar", value: `${decimal(shares / 1e9)} miliar lembar` }] : []),
      { label: "Peran rekaman", value: "penyebut untuk menilai besar pembelian terhadap saham yang beredar" },
    ],
  };
}

function financialDigest(symbol: string): RecordingDigest | undefined {
  const rows = financialRows[symbol];
  if (!rows?.length) return undefined;
  const revenue = rows.find((row) => row.label.toLowerCase().includes("revenue")) ?? rows[0];
  const history = revenue.history ?? [];
  const change = history.length >= 2 && history[history.length - 2].value
    ? (history[history.length - 1].value / history[history.length - 2].value - 1) * 100
    : undefined;
  return {
    scope: `${rows.length} metrik kuartalan, periode ${shortDate(revenue.period)}`,
    values: rows.slice(0, 2).map((row) => ({ label: row.label, value: row.value })),
    context: [
      ...(change === undefined ? [] : [{
        label: `Perubahan ${revenue.label} dari kuartal sebelumnya`,
        value: signedPercent(change),
      }]),
      { label: "Frekuensi terbit", value: "kuartalan, jauh lebih jarang daripada gerak harga harian" },
      { label: "Batas arti rekaman", value: "tidak menjelaskan gerak harga pada sesi tertentu" },
    ],
  };
}

function filingDigest(symbol: string): RecordingDigest | undefined {
  const flows = institutionalFlows[symbol];
  if (!flows) return undefined;
  if (!flows.length) {
    return {
      scope: "Tidak ada keterbukaan pemegang saham terekam untuk emiten ini",
      values: [],
      context: [
        { label: "Jumlah keterbukaan terekam", value: "0" },
        { label: "Arti kekosongan", value: "tidak ada laporan terekam pada jendela ini, bukan bukti tidak ada transaksi" },
      ],
    };
  }
  // A filing without a recorded rupiah value still counts as a filing; it
  // just adds nothing to the net.
  const net = flows.reduce((sum, flow) => {
    const value = flow.transactionValue ?? 0;
    return sum + (flow.transactionType === "sell" ? -value : value);
  }, 0);
  const latest = flows.reduce((newest, flow) => (flow.filedAt > newest.filedAt ? flow : newest));
  return {
    scope: `${flows.length} keterbukaan terekam, terakhir ${shortDate(latest.filedAt)}`,
    values: [
      { label: "Pelapor terakhir", value: latest.holderName },
      { label: "Nilai transaksi bersih", value: idrShort(net) },
    ],
    context: [
      { label: "Arah kepemilikan terlapor", value: net >= 0 ? "bertambah" : "berkurang" },
      { label: "Cakupan pelaporan", value: "hanya transaksi yang wajib dilaporkan ke bursa, dengan nama pelapor" },
    ],
  };
}

/**
 * The digest for a citation, or nothing when this app keeps no per-symbol
 * recording behind that path.
 */
export function digestFor(citation: Citation): RecordingDigest | undefined {
  const template = endpointTemplate(citation.endpoint);
  const symbol = symbolOf(citation);
  if (template === "/v2/index-daily/ihsg/") return ihsgDigest();
  if (!symbol) return undefined;
  if (template === "/v2/daily/{symbol}/") return dailyDigest(symbol);
  if (template === "/v2/foreign-flow/{symbol}/") return foreignDigest(symbol);
  if (template === "/v2/broker-summary/{symbol}/top/") return brokerDigest(symbol);
  if (template === "/v2/company/report/{symbol}/?sections=overview") return overviewDigest(symbol);
  if (template === "/v2/financials/quarterly/{symbol}/") return financialDigest(symbol);
  if (template === "/v2/filings/") return filingDigest(symbol);
  return undefined;
}
