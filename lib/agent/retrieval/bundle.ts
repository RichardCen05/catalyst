import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { scoreCorpus, topScore } from "@/lib/agent/retrieval/score";
import { aggregateBundle, isAggregateQuestion } from "@/lib/agent/retrieval/aggregate";
import { loadViewBundle } from "@/lib/agent/retrieval/context";
import type { ContextBundle, RequestContext, ViewId } from "@/lib/agent/retrieval/types";
import type { Citation, SymbolCode } from "@/lib/types";

export interface RetrievedContext {
  /** What the model is given. Headings help it keep entries apart. */
  text: string;
  /** What the reader is shown when no model wrote an answer — on a closed
   *  budget, a 429, or two failed verifications. The same material without
   *  the markdown scaffolding, which the panel renders literally. */
  readerText: string;
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
  const seen = new Set<string>();
  if (isAggregateQuestion(question)) {
    bundles.push(await aggregateBundle(question, ranked, context));
  } else {
    const top = ranked.slice(0, DEFAULT_THRESHOLDS.retrievalTopK);
    // Every entry's builder is independent, so awaiting them one by one put
    // the sum of their costs on every answer. They load together and are
    // reassembled in ranked order below, which is the only order the cap and
    // the audit trail ever see.
    const loaded = await Promise.all(
      top.map((row) =>
        row.entry.load(context).catch((error) => {
          // One page's builder failing must not cost the reader every other
          // page's material, so the entry drops out and the rest proceed.
          console.warn(`[retrieval] builder ${row.entry.id} failed: ${error instanceof Error ? error.message : String(error)}`);
          return null;
        }),
      ),
    );
    // One fetch per distinct view, in first-seen ranked order. A question can
    // match three panels on one screen, and fetching their shared page three
    // times would spend the wait on the same paragraph thrice over.
    const wantedViews = [...new Set(
      loaded.flatMap((bundle) => (bundle?.view ? [bundle.view] : [])),
    )];
    const pages = await Promise.all(
      wantedViews.map((view) => loadViewBundle(view, context).catch(() => null)),
    );
    const pageByView = new Map<ViewId, ContextBundle>();
    wantedViews.forEach((view, index) => {
      const page = pages[index];
      if (page) pageByView.set(view, page);
    });
    for (const bundle of loaded) {
      if (!bundle) continue;
      if (seen.has(bundle.id)) continue;
      bundles.push(bundle);
      seen.add(bundle.id);

      // A matched panel says what its words are; its page says what the
      // panel shows, and the reader asked about both. The page follows its
      // panel immediately so the character cap cannot leave a panel standing
      // without the material that explains it.
      if (!bundle.view) continue;
      const page = pageByView.get(bundle.view);
      if (page && !seen.has(page.id)) {
        bundles.push(page);
        seen.add(page.id);
      }
    }
  }
  if (!bundles.length) return null;

  const parts: string[] = [];
  const readerParts: string[] = [];
  const kept: ContextBundle[] = [];
  let used = 0;
  for (const bundle of bundles) {
    const part = `## ${bundle.title}\n${bundle.body}`;
    // Skip rather than break: a long bundle must not hide every shorter one
    // ranked behind it.
    if (used + part.length > DEFAULT_THRESHOLDS.retrievalContextCharCap) continue;
    parts.push(part);
    // The reader's copy carries the same words with no "##": the panel prints
    // what it is given, so a heading marker reaches the screen as literal
    // punctuation in front of a sentence.
    readerParts.push(`${bundle.title}: ${bundle.body}`);
    kept.push(bundle);
    used += part.length;
  }
  if (!kept.length) return null;

  return {
    text: parts.join("\n\n"),
    readerText: readerParts.join("\n\n"),
    figures: [...new Set(kept.flatMap((bundle) => bundle.figures))],
    citations: [...new Map(
      kept.flatMap((bundle) => bundle.citations).map((citation) => [citation.id, citation]),
    ).values()],
    symbols: [...new Set(kept.flatMap((bundle) => bundle.symbols))],
    entryIds: kept.map((bundle) => bundle.id),
    score,
  };
}
