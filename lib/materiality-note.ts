import type { ResearchCase } from "@/lib/types";

/**
 * A short note for a materiality badge when the reader approved a materiality
 * rule that nothing evaluates, or null.
 *
 * The engine records such a rule and quotes it, but the level is still the
 * exposure's relevance against the floor (`compilePlaybook`). The note used to
 * appear only in "Perbandingan emiten", so the case list and the case header
 * showed the same level with no sign the reader's rule was not applied (QA P2-9).
 */
export function materialityNote(priority: Pick<ResearchCase["priority"], "ruleTrace">): string | null {
  const pending = priority.ruleTrace.some((rule) => rule.kind === "materiality" && rule.approved && rule.evaluated === false);
  return pending ? "aturan Anda dicatat, belum dievaluasi" : null;
}
