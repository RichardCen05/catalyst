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

const ADVICE_PATTERN = /\b(beli|jual|entry|stop\s*loss|target\s*price|take\s*profit|cuan|buy|sell)\b/i;

export function safeLanguage(input: string): { refused: boolean; text: string } {
  if (ADVICE_PATTERN.test(input)) {
    return {
      refused: true,
      text: "Catalyst tidak menilai tindakan transaksi. Saya dapat merangkum bukti Konsentrasi, Volume, Momentum, dan Katalis beserta data yang masih kosong.",
    };
  }
  return { refused: false, text: input };
}

export function assertSafeOutput(text: string): void {
  if (ADVICE_PATTERN.test(text)) {
    throw new Error("Language gate: output memuat istilah advisory atau transaksi");
  }
}
