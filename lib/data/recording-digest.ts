import {
  brokerEvidence,
  financialRows,
  institutionalFlows,
  priceSeries,
  rawCompanies,
} from "@/lib/data/market.generated";
import { endpointTemplate } from "@/lib/data/endpoint-registry";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { formatCurrency, formatNumber } from "@/lib/utils";
import type { Citation } from "@/lib/types";

/**
 * What was actually read from a recording, and what it adds up to.
 *
 * A citation used to hand the reader `tanggal, arus asing bersih harian` and
 * stop — column names, and an invitation to go verify the figure themselves
 * from a feed they cannot call. Naming the columns is not the same as saying
 * which rows were read, what the values were, or what they came to.
 *
 * So every digest here answers three questions from the recordings in
 * `lib/data/market.generated.ts`: how much was read, which values carried the
 * weight, and what those values mean together. All three are computed, never
 * written by a model — these are the numbers behind a figure on screen, and
 * the one thing worse than an opaque citation is a confident wrong one.
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
   * What those values come to, in words a reader can act on: what the number
   * means in ordinary terms, and what it still does not prove. "Asing membeli
   * lebih banyak daripada menjual, setara 3,1%" restated the arithmetic and
   * left the reader to guess whether 3,1% was a lot.
   */
  takeaway: string;
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
 * "3,1% dari nilai transaksi" is arithmetic; "dari tiap Rp 100 yang berpindah
 * tangan, sekitar Rp 3,10" is a size. Percentages of a total nobody can
 * picture are the reason the old takeaway read as a restatement.
 */
function perHundred(share: number): string {
  return `Rp ${decimal(Math.abs(share) * 100, 2)}`;
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
  const previous = series.slice(0, -1).map((point) => point.volume);
  const ratio = previous.length ? last.volume / median(previous) : undefined;
  const move = series[0].close ? (last.close / series[0].close - 1) * 100 : undefined;
  return {
    scope: `${series.length} sesi bursa, ${shortDate(series[0].date)} – ${shortDate(last.date)}`,
    values: [
      { label: "Penutupan terakhir", value: formatCurrency(last.close) },
      { label: "Volume terakhir", value: `${formatNumber(last.volume)} lembar` },
    ],
    takeaway: [
      // The app's own volume z-score compares the last session against the
      // sessions before it, so the count here names those comparison
      // sessions rather than the whole span that was read.
      ratio
        ? `Hari terakhir diperdagangkan ${decimal(ratio, 2)}× lebih ramai daripada hari biasanya pada ${previous.length} sesi sebelumnya${ratio >= 1.2 ? " — ada yang berubah pada minat beli-jual" : " — masih dalam kebiasaan jendela ini"}.`
        : "",
      move === undefined ? "" : `Harga ${move >= 0 ? "naik" : "turun"} ${decimal(Math.abs(move))}% sepanjang jendela.`,
      "Ramai atau tidaknya perdagangan belum menyebut siapa yang bertransaksi atau apa sebabnya.",
    ].filter(Boolean).join(" "),
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
    takeaway: move === undefined
      ? "Dipakai sebagai pembanding: gerak harga emiten hanya berarti setelah gerak pasar dikeluarkan."
      : `Seluruh pasar ${move >= 0 ? "naik" : "turun"} ${decimal(Math.abs(move))}% pada jendela yang sama. Bagian gerak emiten sebesar itu berasal dari pasar, bukan dari emitennya — sisanya yang perlu dijelaskan.`,
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
    takeaway: [
      share === undefined
        ? `Investor asing ${evidence.netForeign >= 0 ? "membeli" : "menjual"} lebih banyak daripada ${evidence.netForeign >= 0 ? "menjual" : "membeli"} pada jendela ini.`
        : `Dari tiap Rp 100 yang berpindah tangan pada jendela ini, sekitar ${perHundred(share / 100)} adalah ${
          evidence.netForeign >= 0 ? "pembelian asing yang tidak diimbangi penjualan asing" : "penjualan asing yang tidak diimbangi pembelian asing"
        } — selebihnya beli-jual yang saling menutup.`,
      "Angka ini tidak menyebut siapa pembelinya, alasannya, atau apakah arahnya bertahan setelah jendela ini.",
    ].join(" "),
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
  return {
    scope: `${evidence.buyers.length} broker pembeli dan ${evidence.sellers.length} broker penjual teratas`,
    values: [
      { label: "Nilai beli 10 broker teratas", value: idrShort(totalBuy) },
      { label: "Pembeli terbesar", value: `${top.code} · ${idrShort(top.buy)}` },
    ],
    takeaway: `Dari tiap Rp 100 nilai beli kelompok ini, ${perHundred(topShare / 100)} lewat satu broker. ${
      topShare / 100 >= DEFAULT_THRESHOLDS.concentrationFloor
        ? `Di atas ambang ${decimal(DEFAULT_THRESHOLDS.concentrationFloor * 100, 0)}% yang dipakai Catalyst untuk menyebut aliran terpusat: sedikit pihak menggerakkan transaksi.`
        : `Di bawah ambang ${decimal(DEFAULT_THRESHOLDS.concentrationFloor * 100, 0)}% yang dipakai Catalyst untuk menyebut aliran terpusat: pembelian masih tersebar.`
    } Kode broker bukan identitas pemilik dana — satu broker melayani banyak nasabah.`,
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
    takeaway: shares
      ? `Kapitalisasi dibagi harga memberi sekitar ${decimal(shares / 1e9)} miliar lembar saham beredar. Angka itu jadi pembanding: seberapa besar pembelian pada jendela ini dibanding seluruh saham yang ada.`
      : "Dipakai sebagai label sektor dan ukuran emiten, bukan sebagai sinyal harga.",
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
    takeaway: change === undefined
      ? "Dipakai sebagai konteks skala usaha. Laporan kuartalan terbit jauh lebih jarang daripada gerak harga, jadi tidak bisa menjelaskan sesi tertentu."
      : `${revenue.label} ${change >= 0 ? "naik" : "turun"} ${decimal(Math.abs(change))}% dari kuartal sebelumnya, jadi skala usahanya ${change >= 0 ? "membesar" : "mengecil"} pada periode terakhir. Laporan kuartalan tidak menjelaskan gerak harga pada sesi tertentu.`,
  };
}

function filingDigest(symbol: string): RecordingDigest | undefined {
  const flows = institutionalFlows[symbol];
  if (!flows) return undefined;
  if (!flows.length) {
    return {
      scope: "Tidak ada keterbukaan pemegang saham terekam untuk emiten ini",
      values: [],
      takeaway: "Tidak ada yang bisa disimpulkan soal aliran institusi di sini. Kosong berarti tidak ada laporan terekam pada jendela ini, bukan berarti tidak ada transaksi.",
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
    takeaway: `Pemegang saham yang wajib lapor ${net >= 0 ? "menambah" : "mengurangi"} kepemilikan senilai ${idrShort(Math.abs(net))} pada rekaman ini — pihak yang paling dekat dengan perusahaan ${net >= 0 ? "menaruh" : "menarik"} uang sendiri. Hanya transaksi yang wajib dilaporkan ke bursa yang muncul di sini.`,
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
