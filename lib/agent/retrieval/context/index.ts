import { normalizeQuery } from "@/lib/agent/query";
import { CHROME_NAV } from "@/lib/data/chrome.generated";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { lruMemo } from "@/lib/agent/retrieval/memo";
import { buildImpactBundle } from "@/lib/agent/retrieval/context/impact";
import { buildCasesBundle } from "@/lib/agent/retrieval/context/cases";
import { buildDashboardBundle } from "@/lib/agent/retrieval/context/dashboard";
import { buildMethodBundle } from "@/lib/agent/retrieval/context/method";
import { buildPlaybookBundle } from "@/lib/agent/retrieval/context/playbook";
import { buildWebWatchBundle } from "@/lib/agent/retrieval/context/web-watch";
import { buildCopilotBundle } from "@/lib/agent/retrieval/context/copilot";
import { buildAiLearningBundle } from "@/lib/agent/retrieval/context/ai-learning";
import { buildCaseBundle } from "@/lib/agent/retrieval/context/case";
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
    vocabulary: ["pantau web", "sumber web", "antrean review", "review", "sumber yang diawasi", "feed"],
    load: () => buildWebWatchBundle(),
  },
  {
    id: "view:cases",
    view: "cases",
    vocabulary: ["kasus", "daftar kasus", "cakupan", "kasus lengkap", "semua kasus", "riset"],
    load: () => buildCasesBundle(),
  },
  {
    id: "view:dashboard",
    view: "dashboard",
    vocabulary: ["dashboard", "papan", "beranda", "halaman utama", "kasus terbuka", "peta node"],
    load: (context) => buildDashboardBundle(context),
  },
  {
    id: "view:method",
    view: "method",
    vocabulary: ["metode", "batas", "cara kerja", "lapisan", "pilar", "ambang", "keterbatasan"],
    load: () => buildMethodBundle(),
  },
  {
    id: "view:playbook",
    view: "playbook",
    // The watchlist lives on this page, so its words belong to this page.
    vocabulary: ["aturan riset", "playbook", "preferensi", "posisi", "portofolio",
      "daftar pantauan", "pantauan", "watchlist", "emiten pantauan"],
    load: (context) => buildPlaybookBundle(context),
  },
  {
    id: "view:ai-learning",
    view: "ai-learning",
    vocabulary: ["ai learning", "belajar", "memori", "lapis", "kalibrasi", "preferensi yang dipelajari"],
    load: () => buildAiLearningBundle(),
  },
  {
    id: "view:copilot",
    view: "copilot",
    vocabulary: ["asisten", "copilot", "tanya", "kemampuan", "bisa jawab apa"],
    load: () => buildCopilotBundle(),
  },
  {
    // The case page is one emiten's case, so it answers about the case the
    // reader has open. With no case open there is nothing page-specific to
    // say, and the per-symbol entries already cover a named one.
    id: "view:case",
    view: "case",
    vocabulary: ["halaman kasus", "kasus ini", "isi kasus"],
    load: (context) => (context.contextSymbol
      ? buildCaseBundle(context.contextSymbol)
      : buildCasesBundle()),
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

/**
 * Every way the app itself names a page.
 *
 * The sidebar and the command palette are where a reader learns what to call
 * a page, so those labels are the page's vocabulary whether or not anyone
 * remembered to type them into the list above. Generated, so a renamed menu
 * item renames the term with it.
 */
function navVocabulary(view: ViewId): string[] {
  return CHROME_NAV.filter((item) => item.view === view).map((item) => item.label);
}

export function viewEntries(): CorpusEntry[] {
  return VIEWS.map((spec) => ({
    id: spec.id,
    kind: "view" as const,
    symbols: [],
    view: spec.view,
    terms: termsOf([...spec.vocabulary, ...navVocabulary(spec.view)]),
    load: (context) => loadSpec(spec, context),
  }));
}

/**
 * One page's material, for callers that know which page they want.
 *
 * A chrome block belongs to a page and has to be able to say what that page
 * holds. Returning null for a page with no builder keeps that a visible gap
 * rather than an invented answer.
 */
type Bundle = import("@/lib/agent/retrieval/types").ContextBundle;

/**
 * One page's bundle, built once per distinct reader per page.
 *
 * Several panels on a page can be retrieved for one question, and each of
 * them wants its page's material. Without this the dashboard would rebuild
 * its market graph once per matched panel, for a single answer. Everything a
 * builder reads is either a recording — constant for the lifetime of the
 * process — or one of the context fields in the key below.
 */
const viewMemo = lruMemo<string, Bundle>(DEFAULT_THRESHOLDS.retrievalMemoMaxEntries);

function viewMemoKey(view: ViewId, context: RequestContext): string {
  const profile = context.profile;
  return [view, profile.id, context.contextSymbol ?? "", profile.watchlist.join(","), profile.owned.join(",")].join("|");
}

async function loadSpec(spec: ViewSpec, context: RequestContext): Promise<Bundle> {
  const key = viewMemoKey(spec.view, context);
  const cached = viewMemo.get(key);
  if (cached) return cached;
  const bundle = await spec.load(context);
  viewMemo.set(key, bundle);
  return bundle;
}

export async function loadViewBundle(
  view: ViewId,
  context: RequestContext,
): Promise<Bundle | null> {
  const spec = VIEWS.find((candidate) => candidate.view === view);
  return spec ? loadSpec(spec, context) : null;
}
