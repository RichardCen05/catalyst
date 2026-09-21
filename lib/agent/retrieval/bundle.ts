import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { scoreCorpus, topScore } from "@/lib/agent/retrieval/score";
import { aggregateBundle, isAggregateQuestion } from "@/lib/agent/retrieval/aggregate";
import type { ContextBundle, RequestContext } from "@/lib/agent/retrieval/types";
import type { Citation, SymbolCode } from "@/lib/types";

export interface RetrievedContext {
  text: string;
  figures: string[];
  citations: Citation[];
  symbols: SymbolCode[];
  /** Which entries survived the cap. The answer cache is keyed on the text
   *  these produced, and the audit trail names them. */
  entryIds: string[];
  /** The best entry score, which is what the retrieved handler bids with. */
  score: number;
}

/**
 * The material one question gets, and nothing more.
 *
 * `figures` is built from the loaded bundles alone. Neither the question nor
 * the conversation history contributes, and that is deliberate: history is
 * client-supplied text, so a numeral a reader pasted two turns ago must never
 * license the model to write that numeral as a finding. The verifier checks
 * drafts against this list, so anything that leaks in here becomes quotable.
 */
export async function retrieveContext(
  question: string,
  context: RequestContext,
): Promise<RetrievedContext | null> {
  const ranked = scoreCorpus(question, context);
  if (!ranked.length) return null;
  const score = topScore(ranked);

  const bundles: ContextBundle[] = [];
  if (isAggregateQuestion(question)) {
    bundles.push(await aggregateBundle(question, ranked, context));
  } else {
    for (const row of ranked.slice(0, DEFAULT_THRESHOLDS.retrievalTopK)) {
      const bundle = await row.entry.load(context).catch((error) => {
        // One page's builder failing must not cost the reader every other
        // page's material, so the entry drops out and the rest proceed.
        console.warn(`[retrieval] builder ${row.entry.id} failed: ${error instanceof Error ? error.message : String(error)}`);
        return null;
      });
      if (bundle) bundles.push(bundle);
    }
  }
  if (!bundles.length) return null;

  const parts: string[] = [];
  const kept: ContextBundle[] = [];
  let used = 0;
  for (const bundle of bundles) {
    const part = `## ${bundle.title}\n${bundle.body}`;
    // Skip rather than break: a long bundle must not hide every shorter one
    // ranked behind it.
    if (used + part.length > DEFAULT_THRESHOLDS.retrievalContextCharCap) continue;
    parts.push(part);
    kept.push(bundle);
    used += part.length;
  }
  if (!kept.length) return null;

  return {
    text: parts.join("\n\n"),
    figures: [...new Set(kept.flatMap((bundle) => bundle.figures))],
    citations: [...new Map(
      kept.flatMap((bundle) => bundle.citations).map((citation) => [citation.id, citation]),
    ).values()],
    symbols: [...new Set(kept.flatMap((bundle) => bundle.symbols))],
    entryIds: kept.map((bundle) => bundle.id),
    score,
  };
}
