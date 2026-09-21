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

/** The text an advice check actually examines. */
function withoutDataTerms(input: string): string {
  return input.replace(DATA_TERMS, " ");
}

export function safeLanguage(input: string): { refused: boolean; text: string } {
  if (ADVICE_PATTERN.test(withoutDataTerms(input))) {
    return {
      refused: true,
      text: "Catalyst tidak menilai tindakan transaksi. Saya dapat merangkum bukti Konsentrasi, Volume, Momentum, dan Katalis beserta data yang masih kosong.",
    };
  }
  return { refused: false, text: input };
}

export function assertSafeOutput(text: string): void {
  if (ADVICE_PATTERN.test(withoutDataTerms(text))) {
    throw new Error("Language gate: output memuat istilah advisory atau transaksi");
  }
}
