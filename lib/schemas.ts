import { z } from "zod";
import { VIEW_IDS } from "@/lib/agent/retrieval/types";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

const symbolSchema = z.string().trim().min(4).max(5).transform((value) => value.toUpperCase());
const pillarSchema = z.enum(["concentration", "volume", "momentum", "catalyst"]);

export const profileSchema = z.object({
  id: z.enum(["flow-first", "catalyst-first"]),
  name: z.string().min(1).max(40),
  description: z.string(),
  watchlist: z.array(symbolSchema).min(1).max(18),
  owned: z.array(symbolSchema).max(18),
  config: z.object({
    horizon: z.enum(["event", "swing", "position"]),
    depth: z.enum(["compact", "standard", "forensic"]),
    pillarOrder: z.array(pillarSchema).length(4).refine((value) => new Set(value).size === 4, "Pillar order must contain four unique values"),
  }),
  preferredSectors: z.array(z.enum(["Basic Materials", "Financials", "Infrastructure", "Technology", "Energy", "Consumer"])),
  preferredEventTypes: z.array(z.enum(["company", "commodity", "rates", "currency", "policy", "weather", "flows", "sentiment"])),
  hasOnboarded: z.boolean(),
});

export const playbookSchema = z.object({
  preferredComparables: z.record(z.string(), z.array(symbolSchema).max(6)),
  materialityRules: z.array(z.string().max(400)).max(30),
  knownExposures: z.array(z.string().max(400)).max(50),
  thesisAssumptions: z.array(z.string().max(400)).max(50),
  trustedSources: z.array(z.string().max(400)).max(30),
  falsifiers: z.array(z.string().max(400)).max(50),
  relevanceFloor: z.number().min(0).max(100).optional(),
  thresholds: z.object({
    concentrationFloor: z.number().min(0).max(1).optional(),
    volumeZFloor: z.number().min(0).max(10).optional(),
    volumeExtremeFloor: z.number().min(0).max(10).optional(),
    contagionDropFloor: z.number().min(0).max(1).optional(),
    contagionCorrelationFloor: z.number().min(0).max(1).optional(),
    distributionValueFloor: z.number().min(0).max(1e15).optional(),
    momentumAlignedFloor: z.number().min(0).max(1).optional(),
    momentumSectorFloor: z.number().min(0).max(1).optional(),
    momentumIdiosyncraticFloor: z.number().min(0).max(1).optional(),
    foreignContradictionShare: z.number().min(0).max(1).optional(),
  }).optional(),
});
export const userInsightSchema = z.object({
  id: z.string().min(1).max(100),
  symbol: symbolSchema,
  pillar: pillarSchema.optional(),
  category: z.enum(["data-error", "missing-context", "alternative-interpretation"]),
  note: z.string().trim().min(8).max(800),
  sourceUrl: z.url().startsWith("https://").optional(),
  status: z.enum(["pending", "incorporated", "dismissed"]),
  createdAt: z.string().datetime(),
  reviewHistory: z.array(z.object({ status: z.enum(["pending", "incorporated", "dismissed"]), at: z.string().datetime() })).max(30).default([]),
});

/**
 * The memory keys `/api/memory` knows how to check.
 *
 * The POST body is a zustand `persist` snapshot, not a hand-built payload, so
 * it carries whatever the store holds at the time. Validating only `playbook`
 * let a snapshot with a valid-JSON but wrong-shaped `profile` land in GCS, and
 * the next hydration `setState()`s that straight back into the store. Every key
 * that already has a schema is checked here; keys with no schema still pass
 * through, because rejecting unknown keys would stop sync for every client
 * older than the next store field.
 */
export const memoryPatchFieldSchemas = {
  profile: profileSchema,
  playbook: playbookSchema,
  insights: z.array(userInsightSchema).max(100),
} as const;

/** Lookup keys for the evidence panel's plain-words summaries. One panel asks
 *  for every feed it shows in a single request; each pair is checked against
 *  the citation registry before anything is done with it, so the caps here
 *  only bound the parse. */
export const endpointSummaryRequestSchema = z.object({
  claims: z.array(z.object({
    endpoint: z.string().trim().min(1).max(200),
    field: z.string().trim().min(1).max(300),
    /** Emiten the recording was read for, when the address does not name it
     *  (the filings feed is one address for the whole market). Checked
     *  against the recorded companies before it is used. */
    symbol: z.string().trim().min(2).max(6).optional(),
  })).min(1).max(24),
});

export const analyzeRequestSchema = z.object({
  symbol: symbolSchema,
  profile: profileSchema,
  mandate: z.string().max(600).optional(),
  userInsights: z.array(userInsightSchema).max(100).optional(),
  playbook: playbookSchema.optional(),
});
export const causalGraphRequestSchema = z.object({
  symbol: symbolSchema,
  profile: profileSchema,
  scope: z.enum(["watchlist", "market"]).default("market"),
  minRelevance: z.number().min(0).max(100).default(60),
  mandate: z.string().max(600).optional(),
  playbook: playbookSchema.optional(),
});
export const impactRequestSchema = z.object({ eventId: z.string().min(1), profile: profileSchema, scope: z.enum(["watchlist", "market"]) });

export const webWatchImpactSchema = z.object({
  symbol: symbolSchema,
  direction: z.enum(["Supported", "Adverse", "Mixed", "Unrelated", "Unverified"]),
  band: z.enum(["high", "medium", "low"]),
  path: z.string().trim().min(10).max(300),
});

export const webWatchReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    candidateId: z.string().min(1).max(120),
    impacts: z.array(webWatchImpactSchema).min(1).max(18),
    reason: z.string().trim().max(500).optional(),
  }),
  z.object({
    action: z.literal("dismiss"),
    candidateId: z.string().min(1).max(120),
    reason: z.string().trim().min(3).max(500),
  }),
]);
export const refreshToggleSchema = z.object({
  enabled: z.boolean(),
});
export const refreshRunSchema = z.object({
  run: z.literal(true),
  dryRun: z.boolean().default(true),
  symbols: z.array(z.string().trim().min(4).max(5)).max(6).optional(),
});
/**
 * Conversation turns, bounded at the boundary — by truncation, not refusal.
 *
 * This is client-supplied text that reaches a prompt, which is the same
 * surface `lib/data/endpoint-registry.ts` was written to close for the
 * evidence panel: free text in a prompt is both an injection vector and free
 * model time for whoever pastes into it. The engine filters each turn through
 * `safeLanguage` on the way in, and the retrieval layer never lets a turn
 * contribute a figure. The cap here is what stops the volume.
 *
 * It truncates rather than rejects because the turn it carries is this app's
 * own previous answer. A cap that refuses turned the most complete answers
 * into a dead end: an aggregate answer runs past any length worth choosing
 * here, so the next question was refused with `HTTP 400` and the reader was
 * told to retry a send that could never succeed. Trimming the tail of a turn
 * costs a follow-up some context; refusing it costs the reader the answer.
 */
const historyTurnSchema = z.object({
  role: z.enum(["user", "assistant"]),
  text: z.string().trim().min(1).transform((value) => value.slice(0, DEFAULT_THRESHOLDS.copilotHistoryTurnChars)),
  /** The symbols an assistant turn put on screen, so "yang satunya" has a
   *  list to point into. Shape-checked here; membership is checked again
   *  against the registry before any of them selects an entry, because a
   *  well-formed code is not the same thing as a recorded one. */
  symbols: z.array(symbolSchema).max(DEFAULT_THRESHOLDS.copilotHistorySymbols).optional(),
});

export const chatRequestSchema = z.object({
  // Truncated for the same reason as a history turn: a reader who pasted a
  // long question has asked something, and the first 500 characters of it are
  // a question this engine can answer. The composer stops at the same number,
  // so a request arrives longer than this only when it did not come from the
  // panel.
  question: z.string().trim().min(DEFAULT_THRESHOLDS.copilotQuestionMinChars).transform((value) => value.slice(0, DEFAULT_THRESHOLDS.copilotQuestionChars)),
  profile: profileSchema,
  contextSymbol: symbolSchema.optional(),
  userInsights: z.array(userInsightSchema).max(100).optional(),
  playbook: playbookSchema.optional(),
  caseMandate: z.string().max(600).optional(),
  // The same bound the panel trims to. A literal 12 here meant the panel
  // sent six while the route accepted twelve, and nothing could disagree
  // loudly enough to fail.
  history: z.array(historyTurnSchema).max(DEFAULT_THRESHOLDS.copilotHistoryTurns).optional(),
  view: z.enum(VIEW_IDS as unknown as [string, ...string[]]).optional(),
});
