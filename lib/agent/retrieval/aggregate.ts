import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { normalizeQuery } from "@/lib/agent/query";
import { getCorpus } from "@/lib/agent/retrieval/corpus";
import type { ScoredEntry } from "@/lib/agent/retrieval/score";
import type { ContextBundle, RequestContext } from "@/lib/agent/retrieval/types";
import type { Citation } from "@/lib/types";

/**
 * The ways a reader asks about more than one thing.
 *
 * Padded entries must match as whole words: "all" inside "allocation" and
 * "list" inside "listed" are not plural askings, and "kenapa ANTM listed
 * hari ini" is emphatically a singular question.
 */
// "berapa" alone asks how much, not how many: "berapa ambang konsentrasi" is
// a question about one number, and answering it with all eighteen thresholds
// is the wrong kind of answer. Only "berapa banyak" is plural, and it lives in
// the phrase list below.
const AGGREGATE_WORDS = ["semua", "seluruh", "seluruhnya", "total", "all", "every", "list"];
const AGGREGATE_PHRASES = ["mana saja", "apa saja", "siapa saja", "berapa banyak", "daftar lengkap", "how many"];

export function isAggregateQuestion(question: string): boolean {
  const normalized = normalizeQuery(question);
  const padded = ` ${normalized} `;
  if (AGGREGATE_PHRASES.some((phrase) => normalized.includes(phrase))) return true;
  return AGGREGATE_WORDS.some((word) => padded.includes(` ${word} `));
}

/**
 * An aggregate answer, computed over everything that matched.
 *
 * Top-K plus a character cap would hand the model a sample and let it write a
 * confident sentence about "semua". The numeral verifier cannot catch that:
 * every figure in such a draft is legitimately in the bundle, and only the
 * claim of completeness is false — which is the one part the verifier does not
 * check.
 *
 * So the count is taken over the full matching set before anything is dropped,
 * the coverage denominator is always stated, and a list that did not fit says
 * how much of it is showing. The model can then write around numbers that were
 * measured over everything the question asked about.
 */
export async function aggregateBundle(
  question: string,
  ranked: ScoredEntry[],
  context: RequestContext,
): Promise<ContextBundle> {
  const corpus = getCorpus();
  const matched = ranked.length;

  const byKind = new Map<string, number>();
  for (const row of ranked) byKind.set(row.entry.kind, (byKind.get(row.entry.kind) ?? 0) + 1);
  const totalOfKind = (kind: string) => corpus.entries.filter((entry) => entry.kind === kind).length;

  const coverage = [...byKind.entries()]
    .map(([kind, count]) => `${kind} ${count} dari ${totalOfKind(kind)}`)
    .join("; ");

  const header = `Pertanyaan ini mencakup banyak hal. Yang cocok pada rekaman: ${coverage}.`;
  const lines = [header];
  const collected = new Map<string, Citation>();
  let used = header.length;
  let listed = 0;

  for (const row of ranked) {
    const bundle = await row.entry.load(context).catch(() => null);
    if (!bundle) continue;
    const first = bundle.body.split("\n")[0];
    const line = `- ${bundle.title}: ${first}`;
    if (used + line.length > DEFAULT_THRESHOLDS.retrievalContextCharCap) break;
    lines.push(line);
    used += line.length;
    listed += 1;
    // An aggregate counted over recordings must carry those recordings'
    // sources. Summarising many cases is not a reason to drop the citations
    // every one of them arrived with.
    for (const citation of bundle.citations) collected.set(citation.id, citation);
  }

  if (listed < matched) {
    lines.push(`Daftar di atas dipotong: ${listed} dari ${matched} hasil yang cocok ditampilkan.`);
  }

  const body = lines.join("\n");
  return {
    id: `aggregate:${normalizeQuery(question).replace(/\s+/g, "-").slice(0, 80)}`,
    kind: "view",
    title: "Ringkasan agregat",
    body,
    figures: extractNumerals(body),
    citations: [...collected.values()],
    symbols: [],
  };
}
