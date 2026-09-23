import { DATA_AS_OF_LABEL } from "@/lib/data/fixtures";
import type { Citation, PillarResult } from "@/lib/types";

/**
 * The checks that actually run, named once.
 *
 * The audit panel printed "3 · sumber, konflik, bahasa" as a literal. Adding
 * or removing a gate would have left that line claiming a number of checks
 * the code no longer performs — a claim about the app's own rigour that
 * nothing verified.
 */
export const ACTIVE_GATES = [
  { key: "citations", label: "sumber", detail: "Setiap angka wajib membawa penyedia, lokasi data, nama data, dan waktu sumber." },
  { key: "conflict", label: "konflik", detail: "Asal partisipan dominan diperiksa silang dengan arus asing agregat." },
  { key: "language", label: "bahasa", detail: "Permintaan dan jawaban bernuansa transaksi ditolak." },
] as const;

export function isCompleteCitation(citation: Citation): boolean {
  return Boolean(citation.provider && citation.endpoint && citation.field && citation.asOf);
}

export function enforceCitations(pillars: PillarResult[]): void {
  for (const pillar of pillars) {
    for (const metric of pillar.metrics) {
      if (metric.citations.length === 0 || metric.citations.some((citation) => !isCompleteCitation(citation))) {
        throw new Error(`Citation gate: ${pillar.key}/${metric.label} tidak memiliki sumber lengkap`);
      }
    }
  }
}

/**
 * Recorded field names that happen to contain a trading verb.
 *
 * "nilai beli" is a column in the broker recording, and "porsi jual" is how
 * the evidence panel labels a share. Matching a bare `beli` refused
 * "berapa nilai beli broker teratas ANTM" as if it were a request for advice
 * — the reader was asking about a figure already on their screen and got a
 * refusal instead. These phrases are removed before the advice test runs.
 */
const DATA_TERMS = /\b(nilai|porsi|total|rasio|volume|harga|aliran|arus)\s+(beli|jual)\b/gi;

/**
 * Transactional language, including the affixed forms Indonesian actually
 * uses.
 *
 * The old pattern tested bare `beli` and `jual`, which is not how anyone asks.
 * "apakah saya harus membeli ANTM", "sebaiknya dijual atau ditahan" and
 * "ANTM bagus untuk dibeli sekarang" all passed the gate untouched, because a
 * word boundary cannot sit between "di" and "beli".
 *
 * The prefixes are listed rather than made optional wildcards so that
 * "pembelian" and "penjualan" still pass: both are ordinary nouns in a
 * recording, and neither asks for a recommendation. The trailing boundary is
 * what excludes them.
 */
const ADVICE_PATTERN = /\b(?:di|mem|men|meng|ber)?(?:beli|jual)\b|\b(?:entry|stop\s*loss|target\s*price|take\s*profit|cuan|buy|sell)\b/i;

/**
 * What a reader may ask for that no recording can answer.
 *
 * These run on the question and never on a draft. The distinction is not
 * decorative: the AI Learning page prints "Ringkasan prediksi" and the method
 * page prints "Data intrahari … belum tersedia", so a pattern that refused
 * those words in output would refuse the app describing its own screen. A
 * reader asking for tomorrow's price is a different act from a panel naming
 * yesterday's calibration.
 *
 * Each entry carries the sentence the reader gets, because "tidak bisa" with
 * no reason is indistinguishable from a broken engine. `kind` is what the
 * route reports as the intent: a forecast is declined, an unrecorded field is
 * missing data, and those are not the same answer.
 */
const REQUEST_SCREENS: Array<{ kind: "advice" | "forecast" | "absent"; pattern: RegExp; text: () => string }> = [
  {
    kind: "advice",
    // Portfolio sizing is advice with a different noun. "berapa persen ke
    // energi" asks Catalyst to allocate, which it does not do.
    pattern: /\b(?:alokasi|dialokasikan|mengalokasikan|porsi\s+portofolio|bobot\s+portofolio|rekomendasi\s+(?:beli|jual|saham)|layak\s+(?:di)?koleksi)\b/i,
    text: () => "Catalyst tidak menyusun alokasi atau rekomendasi posisi. Saya dapat merangkum bukti Konsentrasi, Volume, Momentum, dan Katalis beserta data yang masih kosong.",
  },
  {
    kind: "forecast",
    // A price object or a forward horizon, never the bare word: "apa isi
    // ringkasan prediksi" asks about a panel that exists.
    pattern: /\b(?:target\s+harga|harga\s+target|(?:prediksi|proyeksi|perkiraan)\s+(?:harga|ihsg|indeks|saham|nilai)|ramalan|forecast)\b|\b(?:akan|bakal)\s+(?:naik|turun|menguat|melemah)\b|\bharga\b[^.?!]*\b(?:besok|minggu\s+depan|bulan\s+depan|tahun\s+depan)\b|\bkapan\b[^.?!]*\b(?:akan|berikutnya|selanjutnya|mendatang)\b/i,
    text: () => `Catalyst tidak memperkirakan harga atau peristiwa yang belum terjadi. Rekaman berhenti pada ${DATA_AS_OF_LABEL}; yang bisa saya bacakan adalah bukti sampai tanggal itu dan jalur dampak yang sedang diuji.`,
  },
  {
    kind: "absent",
    // Resolutions the recordings do not have. The daily series is the finest
    // grain in the bundle, so a question about a minute or an hour is asking
    // for a figure that was never recorded — answering it with the daily
    // number is the failure this screen exists to stop.
    pattern: /\b(?:intraday|intrahari|tick|candlestick|per\s+menit|per\s+jam|menit\s+ke)\b|\bjam\s*\d{1,2}(?:[.:]\d{2})?\b/i,
    text: () => `Rekaman Catalyst berhenti pada resolusi harian (${DATA_AS_OF_LABEL}). Data intrahari, per jam, dan per menit tidak direkam, jadi angka itu tidak ada untuk dibacakan.`,
  },
];

/**
 * Advisory language in a model draft, named once for every verifier.
 *
 * `reading-explain.ts` and `today-fact.ts` each carried their own copy of
 * this list, and the request-side gate above carried a third with different
 * words — which is why "target harga" was caught in a draft and waved through
 * in a question. One list, three call sites.
 */
export const DRAFT_ADVICE_PATTERN = /\b(beli sekarang|jual sekarang|sebaiknya beli|sebaiknya jual|target harga|harga target|stop loss|take profit|layak dikoleksi|rekomendasi)\b/i;

/** The text an advice check actually examines. */
function withoutDataTerms(input: string): string {
  return input.replace(DATA_TERMS, " ");
}

export interface LanguageVerdict {
  refused: boolean;
  text: string;
  /** Why it was refused, for the caller that has to name an intent. */
  kind?: "advice" | "forecast" | "absent";
}

export function safeLanguage(input: string): LanguageVerdict {
  const screened = withoutDataTerms(input);
  if (ADVICE_PATTERN.test(screened)) {
    return {
      refused: true,
      kind: "advice",
      text: "Catalyst tidak menilai tindakan transaksi. Saya dapat merangkum bukti Konsentrasi, Volume, Momentum, dan Katalis beserta data yang masih kosong.",
    };
  }
  for (const screen of REQUEST_SCREENS) {
    if (screen.pattern.test(screened)) return { refused: true, kind: screen.kind, text: screen.text() };
  }
  return { refused: false, text: input };
}

export function assertSafeOutput(text: string): void {
  if (ADVICE_PATTERN.test(withoutDataTerms(text))) {
    throw new Error("Language gate: output memuat istilah advisory atau transaksi");
  }
}
