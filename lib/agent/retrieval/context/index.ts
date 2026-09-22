import { createHash } from "node:crypto";
import { expandEnclitics, normalizeQuery } from "@/lib/agent/query";
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
import { buildActiveCasesBundle } from "@/lib/agent/retrieval/context/active-cases";
import { buildPantauBundle } from "@/lib/agent/retrieval/context/pantau";
import type { CorpusEntry, EntryScope, RequestContext, ViewId } from "@/lib/agent/retrieval/types";

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
  /** Whose material this spec holds. Registry material needs no marker. */
  scope?: EntryScope;
  /** The page's own vocabulary, as its headings and labels say it. */
  vocabulary: string[];
  /** `null` when this page has nothing of its own to say for this request. */
  load(context: RequestContext): Promise<import("@/lib/agent/retrieval/types").ContextBundle | null>;
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
    // Counted over every recording, so it answers "how many emiten are
    // covered" and never "what is on my list".
    scope: "registry",
    vocabulary: ["kasus", "daftar kasus", "cakupan", "kasus lengkap", "semua kasus", "riset"],
    load: () => buildCasesBundle(),
  },
  {
    // The reader's own open cases, beside the registry-wide coverage entry
    // above. Two specs on one page: one answers "how many emiten have a
    // case", the other "what is on my list", and those are different
    // questions with different denominators.
    id: "view:cases-active",
    view: "cases",
    scope: "user",
    vocabulary: ["kasus aktif", "kasus saya", "kasus terbuka", "kasus yang aktif",
      "kasus pada pantauan", "pantauan saya", "daftar kasus saya"],
    load: (context) => buildActiveCasesBundle(context),
  },
  {
    // The watchlist itself, as its own entry. The playbook spec below carries
    // it inside a longer answer about rules; a reader asking what is on their
    // list is not asking about their rules.
    id: "view:pantau-watchlist",
    view: "playbook",
    scope: "user",
    // Distinctive phrases only. A bare "pantau" belongs to the Pantau web
    // page, and indexing the generic half of "isi pantauan" let a question
    // about that page tie with a question about this list.
    vocabulary: ["daftar pantauan", "watchlist", "emiten pantauan", "emiten yang dipantau"],
    load: (context) => buildPantauBundle(context),
  },
  {
    id: "view:dashboard",
    view: "dashboard",
    // Counts drawn over the whole recorded map, not over one reader's list.
    scope: "registry",
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
    scope: "user",
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
    // "Yang dapat dicari: N kasus riset, M peristiwa" — every figure here is
    // a count over the recordings.
    scope: "registry",
    vocabulary: ["asisten", "copilot", "tanya", "kemampuan", "bisa jawab apa"],
    load: () => buildCopilotBundle(),
  },
  {
    // The case page is one emiten's case, so it answers about the case the
    // reader has open. `/cases/[symbol]` cannot be opened without a symbol,
    // so with none carried there is nothing page-specific to say, and the
    // per-symbol entries already cover a named one. Answering with the
    // coverage bundle instead handed back `view:cases`, which the registered
    // `view:cases` entry already carries — and a repeated id is dropped
    // without a trace in `retrieveContext`.
    id: "view:case",
    view: "case",
    vocabulary: ["halaman kasus", "kasus ini", "isi kasus"],
    load: (context) => (context.contextSymbol
      ? buildCaseBundle(context.contextSymbol)
      : Promise.resolve(null)),
  },
];

/** Content words of a phrase, normalized the way questions are. */
function termsOf(phrases: string[]): string[] {
  const out = new Set<string>();
  for (const phrase of phrases) {
    const normalized = normalizeQuery(phrase);
    if (!normalized) continue;
    out.add(normalized);
    // The stem as well as the written word, for the same reason the question
    // side keeps both: a label spelled with an enclitic must still be
    // reachable from the plain word, and the plain word from the label.
    for (const word of expandEnclitics(normalized.split(" "))) {
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
    ...(spec.scope ? { scope: spec.scope } : {}),
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
const viewMemo = lruMemo<string, Bundle | null>(DEFAULT_THRESHOLDS.retrievalMemoMaxEntries);

/**
 * Keyed on the spec, not on the page.
 *
 * A page can carry more than one spec — the registry's material and the
 * reader's own — and keying on `view` made the second one serve the first
 * one's bundle from the memo. That is a silent wrong answer, not a slow one.
 */
/**
 * Everything a builder reads beyond the recordings.
 *
 * The scoped builders call `analyzeCompany` with the reader's playbook,
 * notes and mandate, and those change the case they produce — a different
 * relevance floor is a different disposition on screen. Leaving them out of
 * the key served one reader's playbook to the next request that happened to
 * share a profile id and a watchlist, which is a wrong answer, not a stale
 * one. Hashed because the notes list is unbounded in length and the key is
 * held in memory per entry.
 */
function analysisFingerprint(context: RequestContext): string {
  if (!context.playbook && !context.userInsights?.length && !context.caseMandate) return "";
  return createHash("sha256")
    .update(JSON.stringify([context.playbook ?? null, context.userInsights ?? null, context.caseMandate ?? null]))
    .digest("hex")
    .slice(0, 16);
}

function viewMemoKey(specId: string, context: RequestContext): string {
  const profile = context.profile;
  return [
    specId, profile.id, context.contextSymbol ?? "",
    profile.watchlist.join(","), profile.owned.join(","),
    analysisFingerprint(context),
  ].join("|");
}

async function loadSpec(spec: ViewSpec, context: RequestContext): Promise<Bundle | null> {
  const key = viewMemoKey(spec.id, context);
  // `has` rather than a truthy `get`: a page with nothing of its own to say
  // is a real answer, and re-deriving it on every matched panel would spend
  // the wait to reach the same silence.
  if (viewMemo.has(key)) return viewMemo.get(key) ?? null;
  const bundle = await spec.load(context);
  viewMemo.set(key, bundle);
  return bundle;
}

/** One registered spec's material, by the id its corpus entry carries. */
export async function loadViewBundle(
  specId: string,
  context: RequestContext,
): Promise<Bundle | null> {
  const spec = VIEWS.find((candidate) => candidate.id === specId);
  return spec ? loadSpec(spec, context) : null;
}

/**
 * A page's own material, for callers that know the page but not the spec.
 *
 * The first spec registered for a page is its page-level material; later
 * specs on the same page are narrower slices of it, and a panel asking "what
 * does my page hold" wants the page.
 */
export async function loadPageBundle(
  view: ViewId,
  context: RequestContext,
): Promise<Bundle | null> {
  const spec = VIEWS.find((candidate) => candidate.view === view);
  return spec ? loadSpec(spec, context) : null;
}
