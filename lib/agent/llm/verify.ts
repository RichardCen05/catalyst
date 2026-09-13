import type { Citation } from "@/lib/types";

export interface VerificationResult {
  approved: boolean;
  violations: string[];
}

const NUMBER_PATTERN = /-?\d[\d.,]*%?/g;

export function verifyDraft(draftText: string, evidenceNumbers: string[], _citations: Citation[]): VerificationResult {
  const found = draftText.match(NUMBER_PATTERN) ?? [];
  const violations = found.filter((numeral) => !evidenceNumbers.includes(numeral)).map((numeral) => `"${numeral}" does not appear in the evidence pack`);
  return { approved: violations.length === 0, violations };
}
