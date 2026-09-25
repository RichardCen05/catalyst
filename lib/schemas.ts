import { z } from "zod";
import { VIEW_IDS } from "@/lib/agent/retrieval/types";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { SYMBOL_CODES } from "@/lib/data/symbols.generated";
import type { InvestorResearchPlaybook } from "@/lib/types";

/**
 * A ticker exists because a recording exists for it.
 *
 * Length alone accepted `XXXX`, and every layer downstream trusted the parse:
 * the entry id `case:XXXX` was built from it, the bundle came back empty, and
 * the answer was written about whichever case ranked next — so a request
 * naming an issuer that was never recorded returned 200 with a fabricated id
 * and a sentence about a different emiten. Membership is checked here, at the
 * edge, against the generated universe rather than a list typed again.
 */
const symbolSchema = z.string().trim().min(4).max(5)
  .transform((value) => value.toUpperCase())
  .refine((value): value is (typeof SYMBOL_CODES)[number] => (SYMBOL_CODES as readonly string[]).includes(value), {
    message: "Kode emiten tidak ada pada rekaman",
  });
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
    chainRelevanceFloor: z.number().min(0).max(100).optional(),
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
/**
 * The threshold schema must list every tunable a reader can actually set.
 *
 * These objects are not `.strict()`, so a key the schema omits is stripped in
 * silence: `chainRelevanceFloor` was dropped on every write to GCS and again
 * on every hydration, which reads as "my setting reverted" with no error
 * anywhere. This assertion fails the build instead, the moment a threshold is
 * added to `InvestorResearchPlaybook` without its bound here.
 */
type SchemaThresholds = NonNullable<z.infer<typeof playbookSchema>["thresholds"]>;
type StoredThresholds = NonNullable<InvestorResearchPlaybook["thresholds"]>;
type ThresholdsMissingFromSchema = Exclude<keyof StoredThresholds, keyof SchemaThresholds>;
const _thresholdSchemaIsComplete: ThresholdsMissingFromSchema extends never ? true : never = true;
void _thresholdSchemaIsComplete;

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

const feedbackEventSchema = z.object({
  id: z.string().min(1).max(120),
  symbol: symbolSchema.optional(),
  eventId: z.string().max(200).optional(),
  targetId: z.string().max(200).optional(),
  targetLabel: z.string().max(400).optional(),
  action: z.enum(["useful", "not-useful", "show-more", "show-less"]),
  createdAt: z.string().max(40),
});

const learnedPreferenceSchema = z.object({
  id: z.string().min(1).max(120),
  label: z.string().max(400),
  explanation: z.string().max(800),
  source: z.enum(["explicit", "feedback"]),
  active: z.boolean(),
});

const ruleProposalSchema = z.object({
  id: z.string().min(1).max(120),
  symbol: symbolSchema,
  kind: z.enum(["materiality", "falsifier"]),
  rule: z.string().max(400),
  evidence: z.string().max(800),
  sourceResolutionAt: z.string().max(40),
  status: z.enum(["pending", "accepted", "rejected"]),
  createdAt: z.string().max(40),
});

const caseResolutionSchema = z.object({
  outcome: z.enum(["supported", "challenged", "open"]),
  disposition: z.enum(["escalate", "monitor", "dismiss"]).optional(),
  finalHypothesis: z.string().max(800),
  falsifiedBy: z.string().max(800),
  wrongAssumption: z.string().max(800),
  reusableRule: z.string().max(400),
  resolvedAt: z.string().max(40),
});

const holdingSchema = z.object({ shares: z.number().finite(), avgCost: z.number().finite() });

/**
 * The shape version every stored copy of a reader's memory carries.
 *
 * Two paths hydrate the store — zustand `persist` from localStorage, and
 * `MemorySync` from the GCS backup — and both must read the same number, so it
 * lives here rather than in `lib/store.ts`: the route is server code and the
 * store module is a client module that builds a zustand store on import.
 * `lib/store.ts` re-exports it as `STORE_VERSION`.
 *
 * Bumped 4 → 5 with `partialize`: the persisted shape lost `copilotOpen`,
 * `copilotContext` and `tourOpen`. Without the bump, zustand skips `migrate`
 * for a snapshot already marked 4, `merge` spreads the stored keys over the
 * defaults, and a browser that was closed mid-tour reopens into that tour
 * once — exactly the behaviour the change removes.
 */
export const MEMORY_SNAPSHOT_VERSION = 5;

/** One entry per recorded issuer at most: these maps are keyed by symbol. */
const bySymbol = <T extends z.ZodTypeAny>(value: T) => z.record(symbolSchema, value);

/**
 * Every memory key `/api/memory` accepts, and the shape it must have.
 *
 * The POST body is a zustand `persist` snapshot, not a hand-built payload, so
 * it carries whatever the store holds at the time. Validating only `playbook`
 * let a snapshot with a valid-JSON but wrong-shaped `profile` land in GCS, and
 * the next hydration `setState()`s that straight back into the store.
 *
 * This is now the whole allowlist, not a partial one. A key with no schema is
 * dropped before the write rather than forwarded: the previous rule — check
 * what has a schema, forward everything else — meant `feedback`,
 * `preferences`, `ruleProposals`, `caseResolutions`, `caseStatuses`,
 * `caseMandates` and `holdings` were stored unchecked, and hydration put them
 * back into the store unchecked. Adding a store field now means adding its
 * schema here in the same change, which is the point.
 */
export const memoryPatchFieldSchemas = {
  profile: profileSchema,
  playbook: playbookSchema,
  insights: z.array(userInsightSchema).max(100),
  feedback: z.array(feedbackEventSchema).max(100),
  preferences: z.array(learnedPreferenceSchema).max(100),
  ruleProposals: z.array(ruleProposalSchema).max(100),
  caseResolutions: bySymbol(caseResolutionSchema),
  caseStatuses: bySymbol(z.enum(["open", "closed"])),
  caseMandates: bySymbol(z.string().max(600)),
  holdings: bySymbol(holdingSchema),
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

/**
 * The two free-text minimums a reviewer has to clear. They are exported
 * because the Pantau form gates its buttons on them: a bound typed once here
 * and again in the component drifts apart silently, and the reader only
 * learns of the mismatch as an HTTP 400 with no field named.
 */
export const WEB_WATCH_PATH_MIN_CHARS = 10;
export const WEB_WATCH_REASON_MIN_CHARS = 3;

export const webWatchImpactSchema = z.object({
  symbol: symbolSchema,
  direction: z.enum(["Supported", "Adverse", "Mixed", "Unrelated", "Unverified"]),
  band: z.enum(["high", "medium", "low"]),
  path: z.string().trim().min(WEB_WATCH_PATH_MIN_CHARS).max(300),
});

export const webWatchReviewSchema = z.discriminatedUnion("action", [
  z.object({
    action: z.literal("accept"),
    candidateId: z.string().min(1).max(120),
    impacts: z.array(webWatchImpactSchema).min(1).max(18),
    reason: z.string().trim().max(500).optional(),
    /** The impacts came from the model's verified proposal. Recorded, not trusted:
     *  the impacts are validated exactly like hand-mapped ones. */
    viaProposal: z.boolean().optional(),
  }),
  z.object({
    action: z.literal("accept-proposals"),
    candidateIds: z.array(z.string().min(1).max(120)).min(1).max(50),
  }),
  z.object({
    action: z.literal("revert-auto"),
    candidateId: z.string().min(1).max(120),
  }),
  z.object({
    action: z.literal("set-auto-accept"),
    enabled: z.boolean(),
  }),
  z.object({
    action: z.literal("dismiss"),
    candidateId: z.string().min(1).max(120),
    reason: z.string().trim().min(WEB_WATCH_REASON_MIN_CHARS).max(500),
  }),
  z.object({
    action: z.literal("dispute-rumor"),
    candidateId: z.string().min(1).max(120),
    reason: z.string().trim().min(WEB_WATCH_REASON_MIN_CHARS).max(500),
  }),
  z.object({
    action: z.literal("dismiss-suspected"),
    candidateId: z.string().min(1).max(120),
    reason: z.string().trim().min(WEB_WATCH_REASON_MIN_CHARS).max(500),
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
