import { normalizeQuery } from "@/lib/agent/query";
import { buildImpactBundle } from "@/lib/agent/retrieval/context/impact";
import { buildPantauBundle } from "@/lib/agent/retrieval/context/pantau";
import { buildCasesBundle } from "@/lib/agent/retrieval/context/cases";
import type { CorpusEntry, RequestContext, ViewId } from "@/lib/agent/retrieval/types";

/**
 * One registered builder per page the reader can ask about.
 *
 * Every builder is callable on every request. The `view` field only raises an
 * entry's rank when the reader happens to be on that page; it never gates.
 * A reader on the dashboard asking about the causal map has to reach the
 * causal map, or the assistant is a page-local search box wearing a
 * conversation.
 *
 * Adding a page without registering it here is a visible gap — questions
 * about it simply fall to the menu — rather than a silently wrong answer
 * about some other page.
 */
interface ViewSpec {
  id: string;
  view: ViewId;
  /** The page's own vocabulary, as its headings and labels say it. */
  vocabulary: string[];
  load(context: RequestContext): Promise<import("@/lib/agent/retrieval/types").ContextBundle>;
}

const VIEWS: ViewSpec[] = [
  {
    id: "view:impact",
    view: "impact",
    vocabulary: [
      "peta sebab akibat", "sebab akibat", "sebab", "akibat", "jalur", "rantai",
      "mekanisme", "sumber", "emiten", "dampak bisnis", "dampak", "alur", "graf",
    ],
    load: () => buildImpactBundle(),
  },
  {
    id: "view:pantau",
    view: "pantau",
    vocabulary: ["daftar pantauan", "pantauan", "pantau", "watchlist", "emiten pantauan"],
    load: (context) => buildPantauBundle(context),
  },
  {
    id: "view:cases",
    view: "cases",
    vocabulary: ["kasus", "daftar kasus", "cakupan", "kasus lengkap", "semua kasus", "riset"],
    load: () => buildCasesBundle(),
  },
];

/** Content words of a phrase, normalized the way questions are. */
function termsOf(phrases: string[]): string[] {
  const out = new Set<string>();
  for (const phrase of phrases) {
    const normalized = normalizeQuery(phrase);
    if (!normalized) continue;
    out.add(normalized);
    for (const word of normalized.split(" ")) {
      if (word.length >= 3) out.add(word);
    }
  }
  return [...out];
}

export function viewEntries(): CorpusEntry[] {
  return VIEWS.map((spec) => ({
    id: spec.id,
    kind: "view" as const,
    symbols: [],
    view: spec.view,
    terms: termsOf(spec.vocabulary),
    load: spec.load,
  }));
}
