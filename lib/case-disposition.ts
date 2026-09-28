import type { CaseResolution, ResearchDispositionKind } from "@/lib/types";

/**
 * The research action a case shows.
 *
 * The engine proposes one from materiality and evidence; a reader who closed
 * the case chose one. The chosen action is the record: the QA pass closed ANTM
 * with "Pantau indikator" and the case list kept printing the engine's
 * "Lanjutkan riset", which read as the choice never having been saved.
 */
export function shownDisposition(computed: ResearchDispositionKind, stored: Pick<CaseResolution, "disposition"> | undefined): ResearchDispositionKind {
  return stored?.disposition ?? computed;
}
