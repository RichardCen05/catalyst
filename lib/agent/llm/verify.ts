import type { Citation } from "@/lib/types";

export interface VerificationResult {
  approved: boolean;
  violations: string[];
}

const NUMBER_PATTERN = /-?\d[\d.,]*%?/g;

/**
 * The evidence pack quotes providers verbatim, so an English filing carries
 * `62.71` while the Indonesian prose next to it carries `6,2%`. The model
 * writes the whole answer in Indonesian and localises the separator, so it
 * returns `62,71` for the same figure. A literal string match called that a
 * fabricated number and rejected an otherwise faithful draft, which is why a
 * working key still produced the deterministic answer.
 *
 * Comparison therefore happens on the digits alone. Separators carry no
 * information the verifier needs: a hallucinated figure has different digits,
 * not a different comma. A trailing percent sign is kept, so `6,2%` is never
 * accepted on the strength of a bare `6.2` in the evidence.
 */
function canonicalNumeral(numeral: string): string {
  const percent = numeral.endsWith("%");
  const digits = numeral.replace(/%$/, "").replace(/[.,]/g, "");
  return percent ? `${digits}%` : digits;
}

export function verifyDraft(draftText: string, evidenceNumbers: string[], _citations: Citation[]): VerificationResult {
  const allowed = new Set(evidenceNumbers.map(canonicalNumeral));
  const found = draftText.match(NUMBER_PATTERN) ?? [];
  const violations = found
    .filter((numeral) => !allowed.has(canonicalNumeral(numeral)))
    .map((numeral) => `"${numeral}" does not appear in the evidence pack`);
  return { approved: violations.length === 0, violations };
}
