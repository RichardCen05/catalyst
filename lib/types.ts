export type SymbolCode =
  | "ANTM" | "INCO" | "TINS"
  | "BBCA" | "BBRI" | "BMRI"
  | "TLKM" | "JSMR" | "EXCL"
  | "GOTO" | "BUKA" | "EMTK"
  | "PGAS" | "ADRO" | "PTBA"
  | "ICBP" | "MYOR" | "AMRT";

export type Sector =
  | "Basic Materials"
  | "Financials"
  | "Infrastructure"
  | "Technology"
  | "Energy"
  | "Consumer";

export type PillarKey = "concentration" | "volume" | "momentum" | "catalyst";
export type Horizon = "event" | "swing" | "position";
export type AnswerDepth = "compact" | "standard" | "forensic";
export type EvidenceState = "Corroborated" | "Mixed Evidence" | "Insufficient Evidence";
export type ImpactDirection = "Supported" | "Adverse" | "Mixed" | "Unrelated" | "Unverified";
export type ResearchCaseStatus = "open" | "closed";
export type BusinessImpactDimension = "volume" | "pricing" | "margin" | "cash-flow" | "balance-sheet" | "valuation";

export interface HypothesisProtocol {
  claim: string;
  supportingEvidence: string;
  challengingEvidence: string;
  insufficientWhen: string;
  nextQuestion: string;
}

export interface Citation {
  id: string;
  provider: string;
  endpoint: string;
  field: string;
  asOf: string;
  label: string;
  url?: string;
  urlLabel?: string;
  access?: "direct" | "provider" | "documentation";
}

export interface MetricValue {
  label: string;
  value: string;
  detail?: string;
  citations: Citation[];
}

export interface PillarResult {
  key: PillarKey;
  label: string;
  status: string;
  summary: string;
  metrics: MetricValue[];
  citations: Citation[];
  conflict?: string;
  protocol: HypothesisProtocol;
  calculation?: {
    name: string;
    formula: string;
    substitution: string;
    result: string;
    notes: string[];
  };
}

export interface FinancialInput {
  label: string;
  value: string;
  period: string;
  interpretation: string;
  citations: Citation[];
}

export interface Company {
  symbol: SymbolCode;
  name: string;
  sector: Sector;
  subsector: string;
  price: number;
  changePct: number;
  marketCap: number;
  analyzed: boolean;
  evidenceState: EvidenceState;
  summary: string;
  asOf: string;
  citations: Citation[];
}

export interface PricePoint {
  date: string;
  close: number;
  ihsg: number;
  volume: number;
}

export interface BrokerEvidence {
  buyers: Array<{ code: string; origin: "local" | "foreign"; value: number }>;
  sellers: Array<{ code: string; origin: "local" | "foreign"; value: number }>;
  netForeign: number;
  totalMarketValue: number;
  freeFloatShares: number;
  sharesOutstanding: number;
  referencePrice: number;
  /** Window the broker summary itself covers; it is wider than the daily price window. */
  windowStart?: string;
  windowEnd?: string;
}

export interface CompanyAnalysisFixture {
  symbol: SymbolCode;
  priceSeries: PricePoint[];
  broker: BrokerEvidence;
  sectorReturn: number;
  beta: number;
  catalystEventIds: string[];
  financialContext: FinancialInput[];
}

export interface HypothesisTrace {
  id: string;
  hypothesis: string;
  query: string;
  verification: string;
  outcome: "supported" | "challenged" | "open";
  citations: Citation[];
}

export interface AppliedPlaybookRule {
  id: string;
  kind: "materiality" | "exposure" | "assumption" | "source" | "falsifier" | "comparable";
  rule: string;
  effect: string;
}

export interface ResearchPlan {
  mandate: string;
  focus: BusinessImpactDimension;
  rationale: string;
  hypothesisTree: Array<{
    id: string;
    claim: string;
    test: string;
    state: "primary" | "supporting" | "challenge";
  }>;
  observables: Array<{
    dimension: BusinessImpactDimension;
    metric: string;
    expectedChange: string;
    window: string;
  }>;
}

export interface BusinessImpactResult {
  dimension: BusinessImpactDimension;
  label: string;
  status: "Primary test" | "Supporting" | "Open";
  mechanism: string;
  observable: string;
  implication: string;
  citations: Citation[];
}

export interface CaseResolution {
  outcome: "supported" | "challenged" | "open";
  finalHypothesis: string;
  falsifiedBy: string;
  wrongAssumption: string;
  reusableRule: string;
  resolvedAt: string;
}

export interface AnalysisContext {
  mandate?: string;
  playbook?: InvestorResearchPlaybook;
  userInsights?: UserInsight[];
  resolution?: CaseResolution;
}

export interface ResearchCase {
  caseId: string;
  status: ResearchCaseStatus;
  trigger: {
    title: string;
    detail: string;
    eventId?: string;
  };
  mandate: string;
  priority: {
    novelty: "New" | "Updated" | "Persistent";
    materiality: "High" | "Medium" | "Low";
    uncertainty: "High" | "Medium" | "Low";
    reason: string;
    ruleTrace: AppliedPlaybookRule[];
  };
  contradictions: string[];
  counterEvidence: string[];
  userNotes: UserInsight[];
  unresolvedQuestions: string[];
  nextResearchActions: string[];
  sourcePlan: string[];
  clarificationGate: string;
  lifecycle: Array<{
    key: "mandate" | "decompose" | "source-plan" | "evidence" | "review";
    label: string;
    state: "complete" | "active" | "blocked";
  }>;
  researchPlan: ResearchPlan;
  businessImpact: BusinessImpactResult[];
  appliedRules: AppliedPlaybookRule[];
  resolution?: CaseResolution;
  primaryCausalPath: string;
  company: Company;
  evidenceState: EvidenceState;
  thesis: string;
  pillars: PillarResult[];
  hypotheses: HypothesisTrace[];
  sources: Citation[];
  missingEvidence: string[];
  priceSeries: PricePoint[];
  financialContext: FinancialInput[];
  asOf: string;
}

export type AnalysisCase = ResearchCase;

export interface InvestorResearchPlaybook {
  preferredComparables: Partial<Record<SymbolCode, SymbolCode[]>>;
  materialityRules: string[];
  knownExposures: string[];
  thesisAssumptions: string[];
  trustedSources: string[];
  falsifiers: string[];
}

export interface ImpactLink {
  symbol: SymbolCode;
  direction: ImpactDirection;
  relevance: number;
  path: string;
  rationale: string;
  citations: Citation[];
}

export interface MarketEvent {
  id: string;
  title: string;
  summary: string;
  category: "company" | "commodity" | "rates" | "currency" | "policy" | "weather";
  sourceType: "sectors" | "filing" | "macro" | "commodity" | "weather" | "policy";
  publishedAt: string;
  asOf: string;
  sector: Sector | "Market";
  impactLinks: ImpactLink[];
  citations: Citation[];
}

export interface AgentConfig {
  horizon: Horizon;
  depth: AnswerDepth;
  pillarOrder: PillarKey[];
}

export interface UserProfile {
  id: "flow-first" | "catalyst-first";
  name: string;
  description: string;
  watchlist: SymbolCode[];
  owned: SymbolCode[];
  config: AgentConfig;
  preferredSectors: Sector[];
  preferredEventTypes: MarketEvent["category"][];
  hasOnboarded: boolean;
}

export interface FeedbackEvent {
  id: string;
  symbol?: SymbolCode;
  eventId?: string;
  action: "useful" | "not-useful" | "show-more" | "show-less";
  createdAt: string;
}

export interface LearnedPreference {
  id: string;
  label: string;
  explanation: string;
  source: "explicit" | "feedback";
  active: boolean;
}

export interface UserInsight {
  id: string;
  symbol: SymbolCode;
  pillar?: PillarKey;
  category: "data-error" | "missing-context" | "alternative-interpretation";
  note: string;
  sourceUrl?: string;
  status: "pending" | "incorporated" | "dismissed";
  createdAt: string;
  reviewHistory: Array<{ status: UserInsight["status"]; at: string }>;
}

export interface ChatRequest {
  question: string;
  profile: UserProfile;
  contextSymbol?: SymbolCode;
  userInsights?: UserInsight[];
  playbook?: InvestorResearchPlaybook;
  caseMandate?: string;
}

export interface ChatAnswer {
  text: string;
  refused: boolean;
  intent: "why-listed" | "event-impact" | "compare" | "missing" | "advice" | "unknown";
  hypotheses: HypothesisTrace[];
  citations: Citation[];
  preferenceNote: string;
  relatedSymbols: SymbolCode[];
}

export interface CopilotContext {
  label: string;
  question: string;
  symbol?: SymbolCode;
}

export interface CausalNode {
  id: string;
  label: string;
  kind: "source" | "mechanism" | "company" | "observation" | "business-impact";
  detail: string;
  sourceType?: MarketEvent["sourceType"] | "market" | "financial";
  direction?: ImpactDirection;
  relevance?: number;
  basis: "Reported input" | "Causal hypothesis" | "Aggregation point" | "Observed correlation";
  confidence: "High" | "Medium" | "Low";
  lag: string;
  counterEvidence: string;
  citations: Citation[];
}

export interface CausalEdge {
  id: string;
  from: string;
  to: string;
  label: string;
  direction: ImpactDirection;
  relevance: number;
  basis: "Reported input" | "Causal hypothesis" | "Observed correlation";
  confidence: "High" | "Medium" | "Low";
  lag: string;
  exposure: string;
  expectedObservable: string;
  alternativeExplanation: string;
  falsificationCondition: string;
  confidenceBasis: string;
  businessImpactDimension: BusinessImpactDimension;
  businessImpactImplication: string;
  citations: Citation[];
}

export interface CompetingHypothesis {
  id: string;
  rank: number;
  claim: string;
  targetObservable: string;
  supportingEvidence: string;
  counterEvidence: string;
  discriminator: string;
  status: "leading" | "plausible" | "challenged";
  confidence: "High" | "Medium" | "Low";
  citations: Citation[];
}

export interface CausalGraph {
  targetSymbol: SymbolCode;
  nodes: CausalNode[];
  edges: CausalEdge[];
  targetObservable: string;
  competingHypotheses: CompetingHypothesis[];
  hiddenRelationshipCount: number;
  asOf: string;
}

export interface MarketDataProvider {
  listCompanies(): Company[];
  getCompany(symbol: string): Company | undefined;
  getDailySeries(symbol: string): PricePoint[];
  getBrokerEvidence(symbol: string): BrokerEvidence | undefined;
  getCompanyEvents(symbol: string): MarketEvent[];
}

export interface NewsProvider {
  listEvents(): MarketEvent[];
  getEvent(id: string): MarketEvent | undefined;
}

export interface AgentEngine {
  analyzeCompany(symbol: string, profile: UserProfile, context?: AnalysisContext): AnalysisCase | null;
  mapEventImpact(eventId: string, profile: UserProfile, scope: "watchlist" | "market"): MarketEvent | null;
  answerFollowUp(request: ChatRequest): ChatAnswer;
  buildCausalGraph(symbol: string, profile: UserProfile, options: { scope: "watchlist" | "market"; minRelevance: number; context?: AnalysisContext }): CausalGraph | null;
}

export interface MemoryStore {
  loadProfile(): UserProfile;
  recordFeedback(feedback: FeedbackEvent): void;
  recordInsight(insight: UserInsight): void;
  listInsights(): UserInsight[];
  listPreferences(): LearnedPreference[];
  compareProfiles(): UserProfile[];
  reset(): void;
}
