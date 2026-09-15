import { z } from "zod";

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
});

export const analyzeRequestSchema = z.object({
  symbol: symbolSchema,
  profile: profileSchema,
  mandate: z.string().max(600).optional(),
  clarificationChoice: z.string().max(40).optional(),
  playbook: playbookSchema.optional(),
});
export const causalGraphRequestSchema = z.object({
  symbol: symbolSchema,
  profile: profileSchema,
  scope: z.enum(["watchlist", "market"]).default("market"),
  minRelevance: z.number().min(0).max(100).default(60),
  mandate: z.string().max(600).optional(),
  clarificationChoice: z.string().max(40).optional(),
  playbook: playbookSchema.optional(),
});
export const impactRequestSchema = z.object({ eventId: z.string().min(1), profile: profileSchema, scope: z.enum(["watchlist", "market"]) });
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
export const chatRequestSchema = z.object({
  question: z.string().trim().min(2).max(500),
  profile: profileSchema,
  contextSymbol: symbolSchema.optional(),
  userInsights: z.array(userInsightSchema).max(100).optional(),
  playbook: playbookSchema.optional(),
  caseMandate: z.string().max(600).optional(),
});
