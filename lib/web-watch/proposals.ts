/**
 * Model-drafted mappings for candidates triage sent to review.
 *
 * For each pending candidate with a triage match and no draft yet, the model
 * proposes `{ direction, band, path, rationale }` per matched emiten through
 * the same `assessExposureWithLlm` the engine uses. A proposal is only ever a
 * pre-filled form: a human accepts it, edits it, or ignores it.
 *
 * A draft is kept only when every check passes:
 *
 *   - the symbol is in the registry and in triage's match set for this item;
 *   - every numeral in the path and rationale appears in what the model was
 *     given — the candidate's own text or the segment shares in the prompt;
 *   - the path and rationale are in Indonesian whenever they have grammar to
 *     be in anything, and say something about that same text: a sentence
 *     sharing no content term with it and quoting none of its figures is a
 *     mapping of some other article, however fluently written;
 *   - the rationale is long enough to be checked, in words from
 *     `DEFAULT_THRESHOLDS.webWatchRationaleMinWords`;
 *   - no advisory or transactional language (`assertSafeOutput`);
 *   - direction and band are known values, and the path is long enough for
 *     the accept form to take it as-is.
 *
 * A rejected or failed draft stores nothing and the candidate stays in plain
 * review. A closed budget (daily ceiling, 429 gate, per-sweep cap, time
 * budget) is not a failure: the remaining candidates are left untried and the
 * next sweep picks them up.
 */

import { assertSafeOutput } from "@/lib/agent/gates";
import { LlmBudgetError } from "@/lib/agent/llm/budget";
import type { generateStructured } from "@/lib/agent/llm/client";
import { assessExposureWithLlm, segmentLine, type ExposureAssessment } from "@/lib/agent/llm/exposure";
import { strongModel } from "@/lib/agent/llm/models";
import { detectLanguage, extractNumerals, groundingViolation, verifyDraft } from "@/lib/agent/llm/verify";
import { agentMode } from "@/lib/agent/mode";
import { RELEVANCE_BANDS, resolveThresholds, type ResolvedThresholds } from "@/lib/agent/thresholds";
import { citations, companies, revenueSegments } from "@/lib/data/fixtures";
import { isStopword } from "@/lib/agent/query";
import { words } from "@/lib/text/fuzzy";
import { WEB_WATCH_PATH_MIN_CHARS } from "@/lib/schemas";
import { isKnownSymbolCode, type ProposedImpact, type ReviewQueue, type TriageMatch, type TriageProposal } from "@/lib/web-watch/queue";
import { bandForArticle } from "@/lib/web-watch/figure-band";
import { matchText, type MatchKind } from "@/lib/web-watch/triage";

export { bandForArticle };
import type { MarketEvent, SymbolCode } from "@/lib/types";

/** Directions a reviewer can accept. `Unverified` says the model could not
 *  tell, which is not a mapping anyone should be offered. */
const PROPOSABLE_DIRECTIONS = new Set(["Supported", "Adverse", "Mixed", "Unrelated"]);

/** Stronger evidence first, so the per-candidate cap keeps the emiten the
 *  text actually names over the ones its source merely declares. */
const EVIDENCE_RANK: Record<MatchKind, number> = {
  symbol: 0,
  name: 1,
  region: 2,
  weather: 3,
  source: 4,
  subsector: 5,
  sector: 6,
};

export function rankedSymbols(match: TriageMatch, max: number): SymbolCode[] {
  const best = new Map<SymbolCode, number>();
  for (const evidence of match.matchedBy) {
    const rank = EVIDENCE_RANK[evidence.by];
    if (!best.has(evidence.symbol) || rank < (best.get(evidence.symbol) as number)) best.set(evidence.symbol, rank);
  }
  return [...best.entries()].sort((a, b) => a[1] - b[1]).map(([symbol]) => symbol).slice(0, max);
}

/** Headline verbs of a price or index move, by the direction they report. */
const FALL_WORDS = ["anjlok", "turun", "melemah", "merosot", "jatuh", "terkoreksi", "ambles", "ambrol", "longsor", "zona merah"];
const RISE_WORDS = ["naik", "menguat", "melonjak", "melesat", "meroket", "terbang", "zona hijau"];

/** The market indexes the recordings carry, named the way their endpoint names them. */
const INDEX_NAMES = [...new Set(Object.values(citations)
  .map((citation) => (typeof citation === "function" ? undefined : citation.endpoint)?.match(/\/index-daily\/([^/]+)\//)?.[1]?.toLowerCase())
  .filter((name): name is string => Boolean(name)))];

function saysMove(text: string, vocabulary: string[]): boolean {
  const padded = ` ${words(text).join(" ")} `;
  return vocabulary.some((word) => padded.includes(` ${word} `));
}

/**
 * The two ways a draft can be about some other article than the one it maps.
 *
 * A rationale that shares no word with the headline explains the body's
 * background paragraph, not the news: "IHSG Parkir di Zona Hijau" reached
 * BBCA on a BI-Rate sentence further down the page. And when the headline
 * reports a move of the emiten itself or of the index, a draft cannot take
 * the other side of it: "IHSG Anjlok" was proposed as supporting BBRI.
 */
function headlineViolations(draft: ExposureAssessment, symbol: string, headline: string): string[] {
  const prose = words(`${draft.path ?? ""} ${draft.rationale ?? ""}`).join(" ");
  const headlineWords = ` ${words(headline).join(" ")} `;
  // The emiten's code and its registry name are one anchor: a headline naming
  // "Bukit Asam" is addressed by a rationale about PTBA.
  const name = companies.find((company) => company.symbol === symbol)?.name.toLowerCase() ?? "";
  const nameWords = words(name).filter((word) => word.length >= 4);
  const ownName = [symbol.toLowerCase(), ...nameWords];
  const namesEmiten = ownName.some((word) => headlineWords.includes(` ${word} `));
  const anchors = words(headline).filter((word) => word.length >= 4 && !isStopword(word) && !/^\d/.test(word));
  const addressed = anchors.some((word) => prose.includes(word)) || (namesEmiten && ownName.some((word) => prose.includes(word)));
  const violations: string[] = [];
  if (anchors.length && !addressed) violations.push("rationale does not address the headline");
  const subjects = [...ownName, ...INDEX_NAMES];
  if (subjects.some((subject) => headlineWords.includes(` ${subject} `))) {
    const fell = saysMove(headline, FALL_WORDS);
    const rose = saysMove(headline, RISE_WORDS);
    if ((fell && !rose && draft.direction === "Supported") || (rose && !fell && draft.direction === "Adverse")) {
      violations.push(`direction ${draft.direction} contradicts the move the headline reports`);
    }
  }
  return violations;
}

export interface DraftCheck {
  approved: boolean;
  violations: string[];
}

/** Every check a draft must pass before it is stored as a proposal.
 *
 * `sourceText` is the candidate's own title and prose — the material the
 * prompt was built from, and required, so no caller can check a draft without
 * the one argument that can tell a mapping of this article from a mapping of
 * any other. The numeral gate alone is satisfied by a draft quoting a single
 * figure, and the language gate by a fluent sentence; grounding and the
 * rationale minimum are what make the two together say something about the
 * source — which matters because a proposal still reaches a reviewer
 * pre-filled, and a high-band one can be accepted without a look. An empty
 * string is accepted as "no text to ground against", never as a reason to
 * skip the rest of the checks.
 */
export function verifyExposureDraft(
  draft: ExposureAssessment,
  symbol: string,
  matchSet: SymbolCode[],
  allowedNumerals: string[],
  sourceText: string,
  headline?: string,
): DraftCheck {
  const violations: string[] = [];
  if (!isKnownSymbolCode(symbol)) violations.push(`${symbol} is not a registry symbol`);
  if (!matchSet.includes(symbol as SymbolCode)) violations.push(`${symbol} is outside the triage match set`);
  if (!PROPOSABLE_DIRECTIONS.has(draft.direction)) violations.push(`direction ${draft.direction} cannot be proposed`);
  if (!(RELEVANCE_BANDS as readonly string[]).includes(draft.relevanceBand)) violations.push(`band ${draft.relevanceBand} is not a band`);
  if (typeof draft.path !== "string" || draft.path.trim().length < WEB_WATCH_PATH_MIN_CHARS) violations.push("path too short");
  const prose = `${draft.path ?? ""}\n${draft.rationale ?? ""}`;
  violations.push(...verifyDraft(prose, allowedNumerals, []).violations);
  const minWords = resolveThresholds().webWatchRationaleMinWords;
  const rationale = (draft.rationale ?? "").replace(/\s+/g, " ").trim();
  if (rationale.split(" ").length < minWords) violations.push(`rationale is shorter than ${minWords} words`);
  // The card and the prompt examples are Indonesian; a fluent English
  // rationale passes every other rule here and is simply unreadable on the
  // screen it lands on. Checked field by field — a path is a fragment whose
  // few Indonesian words would otherwise outvote an English sentence after
  // them. "unknown" is allowed: a path of tickers and terms has no grammar to
  // detect.
  if ([draft.path ?? "", draft.rationale ?? ""].some((field) => detectLanguage(field) === "en")) {
    violations.push("draft is written in English");
  }
  const grounding = groundingViolation(prose, sourceText, allowedNumerals);
  if (grounding) violations.push(grounding);
  if (headline) violations.push(...headlineViolations(draft, symbol, headline));
  try {
    assertSafeOutput(prose);
  } catch {
    violations.push("advisory or transactional language");
  }
  return { approved: violations.length === 0, violations };
}

/**
 * Past reviewer decisions as prompt examples. Titles come from the accepted
 * list; a dismissal stores only its reason, so that is what it contributes.
 * A reason too short to say anything ("jelek") is left out, and so is an
 * auto-accept: it is the model's own draft, and feeding it back as a
 * reviewer example would teach the model to agree with itself.
 */
export function fewShotExamples(queue: ReviewQueue, max: number, minWords = resolveThresholds().webWatchFewShotReasonMinWords): string[] {
  const titleOf = new Map(queue.accepted.map((event) => [event.id, event.title]));
  return Object.values(queue.decided)
    .filter((decision) => !decision.auto && !decision.autoReject)
    .filter((decision) => decision.impacts?.length || decision.reason.trim().split(/\s+/).length >= minWords)
    .sort((a, b) => b.decidedAt.localeCompare(a.decidedAt))
    .slice(0, max)
    .map((decision) => {
      const title = titleOf.get(decision.candidateId);
      const head = decision.status === "accepted" ? "diterima" : "ditolak";
      const impacts = (decision.impacts ?? []).map((i) => `${i.symbol} ${i.direction} ${i.band}: ${i.path}`).join("; ");
      return [`- [${head}]`, title ? `"${title.slice(0, 160)}"` : "", impacts ? `→ ${impacts}` : "", decision.reason ? `alasan: ${decision.reason.slice(0, 200)}` : ""]
        .filter(Boolean)
        .join(" ");
    });
}

export interface DraftReport {
  attempted: number;
  calls: number;
  proposed: number;
  rejected: number;
  failed: number;
  /** Why drafting stopped before the queue ran out, if it did. */
  stoppedBy: "budget" | "rate-limit" | "sweep-cap" | "time" | "mode" | null;
  rejections: Array<{ title: string; symbol: string; violations: string[] }>;
  failures: Array<{ title: string; symbol: string; error: string }>;
}

export interface DraftOptions {
  call?: typeof generateStructured;
  nowIso?: string;
  /** Clock for the time budget; injectable so tests do not sleep. */
  now?: () => number;
  thresholds?: ResolvedThresholds;
  /** Draft even when AGENT_MODE is not `llm` (tests, dry-runs). */
  force?: boolean;
}

export interface DraftOutcome {
  id: string;
  drafted?: TriageMatch["drafted"];
  proposal?: TriageProposal;
}

/**
 * Draft proposals for pending candidates that have none. Does not touch the
 * queue: returns per-candidate outcomes for `applyDrafts`, so the caller can
 * merge them into whatever the queue holds by the time the model is done.
 */
export async function draftProposals(queue: ReviewQueue, options: DraftOptions = {}): Promise<{ outcomes: DraftOutcome[]; report: DraftReport }> {
  const t = options.thresholds ?? resolveThresholds();
  const now = options.now ?? Date.now;
  const nowIso = options.nowIso ?? new Date().toISOString();
  const report: DraftReport = { attempted: 0, calls: 0, proposed: 0, rejected: 0, failed: 0, stoppedBy: null, rejections: [], failures: [] };
  const outcomes: DraftOutcome[] = [];
  if (!options.force && agentMode() !== "llm") return { outcomes, report: { ...report, stoppedBy: "mode" } };

  const started = now();
  const examples = fewShotExamples(queue, t.webWatchFewShotMax, t.webWatchFewShotReasonMinWords);
  const todo = queue.pending.filter((event) => queue.matches[event.id]?.symbols.length && !queue.matches[event.id].drafted && !queue.proposals[event.id]);

  for (const event of todo) {
    const match = queue.matches[event.id];
    const symbols = rankedSymbols(match, t.webWatchDraftSymbolsMax);
    if (report.calls + symbols.length > t.webWatchSweepLlmCalls) {
      report.stoppedBy = "sweep-cap";
      break;
    }
    if (now() - started >= t.webWatchDraftTimeBudgetMs) {
      report.stoppedBy = "time";
      break;
    }
    report.attempted += 1;
    const result = await draftOne(event, match, symbols, examples, t, options, report);
    if (result === "stop") break;
    outcomes.push({ id: event.id, proposal: result.proposal, drafted: { at: nowIso, outcome: result.proposal ? "proposed" : result.outcome } });
    if (result.proposal) report.proposed += 1;
    else if (result.outcome === "rejected") report.rejected += 1;
    else report.failed += 1;
    // The budget closed part-way through this candidate: what verified is
    // kept, and nothing further is tried this sweep.
    if (report.stoppedBy) break;
  }
  return { outcomes, report };
}

async function draftOne(
  event: MarketEvent,
  match: TriageMatch,
  symbols: SymbolCode[],
  examples: string[],
  t: ResolvedThresholds,
  options: DraftOptions,
  report: DraftReport,
): Promise<"stop" | { outcome: "rejected" | "failed"; proposal?: TriageProposal }> {
  const text = matchText(event).slice(0, t.webWatchDraftContextChars);
  const impacts: ProposedImpact[] = [];
  let failed = false;
  for (const symbol of symbols) {
    const segments = revenueSegments[symbol] ?? [];
    const allowed = extractNumerals(event.title, event.summary, event.body ?? "", segmentLine(segments));
    report.calls += 1;
    let draft: ExposureAssessment;
    try {
      draft = await assessExposureWithLlm(
        {
          symbol,
          eventTitle: event.title,
          eventSummary: text,
          eventTags: [event.citations[0]?.label ?? event.category],
          segments,
          web: { examples },
        },
        options.call,
      );
    } catch (error) {
      if (error instanceof LlmBudgetError) {
        // Not this candidate's fault: leave it untried for the next sweep.
        report.calls -= 1;
        report.stoppedBy = error.reason === "budget" ? "budget" : "rate-limit";
        if (impacts.length) break;
        report.attempted -= 1;
        return "stop";
      }
      failed = true;
      const message = (error instanceof Error ? error.message : String(error)).slice(0, 300);
      report.failures.push({ title: event.title, symbol, error: message });
      console.warn(`[llm-fallback] triage ${symbol}/${event.id}: ${message}`);
      continue;
    }
    const check = verifyExposureDraft(draft, symbol, match.symbols, allowed, matchText(event), event.title);
    if (!check.approved) {
      console.warn(`[llm-fallback] triage ${symbol}/${event.id}: rejected — ${check.violations.join("; ").slice(0, 300)}`);
      report.rejections.push({ title: event.title, symbol, violations: check.violations });
      continue;
    }
    impacts.push({
      symbol,
      direction: draft.direction,
      band: bandForArticle(draft.relevanceBand, matchText(event)),
      path: draft.path.trim().slice(0, 300),
      rationale: draft.rationale.trim().slice(0, 500),
    });
  }
  if (!impacts.length) return { outcome: failed ? "failed" : "rejected" };
  return { outcome: "rejected", proposal: { impacts, model: strongModel(), verifiedAt: options.nowIso ?? new Date().toISOString() } };
}

/** Merge draft outcomes into the queue as it stands now. Outcomes for items
 *  that were decided or archived meanwhile are dropped. */
export function applyDrafts(queue: ReviewQueue, outcomes: DraftOutcome[]): ReviewQueue {
  const pendingIds = new Set(queue.pending.map((event) => event.id));
  const matches = { ...queue.matches };
  const proposals = { ...queue.proposals };
  for (const outcome of outcomes) {
    if (!pendingIds.has(outcome.id) || !matches[outcome.id]) continue;
    matches[outcome.id] = { ...matches[outcome.id], drafted: outcome.drafted };
    if (outcome.proposal) proposals[outcome.id] = outcome.proposal;
  }
  return { ...queue, matches, proposals };
}
