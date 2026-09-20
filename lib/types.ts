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
export type ResearchDispositionKind = "escalate" | "monitor" | "dismiss";

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
  /** Sentence-level location of the cited claim inside a source's body text, when one was attempted. */
  span?: SourceSpan;
}

export interface SourceSpan {
  documentId: string;
  start: number;
  end: number;
  match: "exact" | "approximate" | "not_found";
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
  /** Angka mentah kuartal terbaru untuk komputasi tren (Task 8b); display tetap `value`. */
  valueNum?: number;
  /** Seri kuartalan per label dari 4 kuartal terekam, menanjak (oldest→newest). */
  history?: Array<{ period: string; value: number }>;
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

export interface BrokerParticipant {
  code: string;
  origin: "local" | "foreign";
  value: number;
  /** Per-broker triple dari rekaman v2_broker-summary_*_top.json (C2). */
  buyIdr?: number;
  sellIdr?: number;
  netIdr?: number;
}

export interface BrokerEvidence {
  buyers: BrokerParticipant[];
  sellers: BrokerParticipant[];
  netForeign: number;
  totalMarketValue: number;
  freeFloatShares: number;
  sharesOutstanding: number;
  referencePrice: number;
  /** Window the broker summary itself covers; it is wider than the daily price window. */
  windowStart?: string;
  windowEnd?: string;
  /** Monthly local/foreign ownership split from shareholders-composition, when recorded for this symbol. */
  ownershipSeries?: Array<{ date: string; foreignPct: number; localPct: number }>;
}

export interface InstitutionalFlow {
  symbol: SymbolCode;
  holderName: string;
  holderType: "institution" | "insider" | "other";
  transactionType: string;
  sharesBefore: number;
  sharesAfter: number;
  sharesDelta: number;
  filedAt: string;
  source: string;
  /** Nilai transaksi terekam (transaction_value); diutamakan atas hitungan ulang dari referencePrice. */
  transactionValue?: number;
  price?: number;
}

export interface CompanyAnalysisFixture {
  symbol: SymbolCode;
  priceSeries: PricePoint[];
  broker: BrokerEvidence;
  sectorReturn: number;
  /** Real subsector_report statistics (P/E only; the endpoint has no return field), when recorded for this subsector. */
  subsectorContext?: { totalCompanies: number; medianPe: number; weightedAvgPe: number; sampleCompanies: number };
  beta: number;
  catalystEventIds: string[];
  financialContext: FinancialInput[];
  institutionalFlows: InstitutionalFlow[];
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
  disposition?: ResearchDispositionKind;
  finalHypothesis: string;
  falsifiedBy: string;
  wrongAssumption: string;
  reusableRule: string;
  resolvedAt: string;
}

export interface AnalysisContext {
  mandate?: string;
  clarificationChoice?: string;
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
  materialChange: {
    whatChanged: string;
    baseline: string;
    whyMaterial: string;
    rule: string;
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
  clarification: {
    required: boolean;
    reason: string;
    selectedOptionId?: string;
    options: Array<{
      id: string;
      label: string;
      question: string;
      focus: BusinessImpactDimension;
      sourceConsequence: string;
      observable: string;
    }>;
  };
  lifecycle: Array<{
    key: "mandate" | "decompose" | "source-plan" | "evidence" | "review";
    label: string;
    state: "complete" | "active" | "blocked";
  }>;
  researchPlan: ResearchPlan;
  businessImpact: BusinessImpactResult[];
  evidenceLayers: Array<{
    key: "market-confirmation" | "business-transmission";
    label: string;
    purpose: string;
    pillarKeys: PillarKey[];
  }>;
  researchDisposition: {
    kind: ResearchDispositionKind;
    label: string;
    reason: string;
    monitorObservable: string;
    reopenWhen: string;
  };
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
  /**
   * The volume anomaly recomputed over trailing halves of the window.
   *
   * Computed in the engine rather than in the component that draws it. The
   * component used to call `describeSignalStability` itself, which meant three
   * figures on the case page carried no citations at all — the only numbers on
   * screen with no source — and the assistant could not answer a question
   * about them because they existed nowhere in the case it reads.
   */
  signalStability: {
    agreement: string;
    note: string;
    windows: MetricValue[];
  };
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
  /** Ambang relevansi eksposur (0-100) untuk materialitas High. Default 85. */
  relevanceFloor?: number;
  /** Ambang yang bisa diatur pengguna. Semua opsional; default ada di lib/agent/thresholds.ts. */
  thresholds?: {
    /** Porsi nilai peserta teratas yang dianggap "Concentrated Flow". Default 0.42. */
    concentrationFloor?: number;
    /** Skor z volume tahan-pencilan minimum sebelum anomali ditandai (Elevated). Default 2.5 (nilai live di metrics.ts:58). */
    volumeZFloor?: number;
    /** Skor z volume untuk status Extreme. Default 5 (nilai live di metrics.ts:58). */
    volumeExtremeFloor?: number;
    /** Penurunan harga harian (absolut) yang memicu pemeriksaan penularan. Default 0.04. */
    contagionDropFloor?: number;
    /** Korelasi imbal hasil minimum sebelum co-movement dianggap layak diperiksa. Default 0.5. */
    contagionCorrelationFloor?: number;
    /** Nilai bersih pelepasan institusi (IDR) minimum sebelum ditandai distribusi. Default 1e11. */
    distributionValueFloor?: number;
    /** |residual| di bawah ini dilabeli "Mengikuti pasar". Default 0.012. */
    momentumAlignedFloor?: number;
    /** |selisih sektor| di bawah ini dilabeli "Dipengaruhi sektor". Default 0.015. */
    momentumSectorFloor?: number;
    /** |residual| di atas ini dilabeli "Khusus emiten". Default 0.03. */
    momentumIdiosyncraticFloor?: number;
    /** Porsi beli broker asing sebelum arus asing negatif dianggap konflik. Default 0.55. */
    foreignContradictionShare?: number;
  };
}

export type ThresholdKey = NonNullable<InvestorResearchPlaybook["thresholds"]>;

export interface RuleProposal {
  id: string;
  symbol: SymbolCode;
  kind: "materiality" | "falsifier";
  rule: string;
  evidence: string;
  sourceResolutionAt: string;
  status: "pending" | "accepted" | "rejected";
  createdAt: string;
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
  /** Full source text (news/filing body), when the recording carried one. Used to locate citation spans. */
  body: string | null;
  category: "company" | "commodity" | "rates" | "currency" | "policy" | "weather" | "flows" | "sentiment";
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
  /** Stable UI target. One target keeps one current feedback signal. */
  targetId?: string;
  /** Human-readable target saved with feedback so its origin remains auditable. */
  targetLabel?: string;
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
  intent: "why-listed" | "event-impact" | "compare" | "missing" | "provenance" | "explain" | "advice" | "unknown";
  hypotheses: HypothesisTrace[];
  citations: Citation[];
  preferenceNote: string;
  relatedSymbols: SymbolCode[];
  /** Set when the model layer refused for the day — daily call budget reached
   *  or a 429 — and the deterministic path answered instead. The reader is
   *  told, because that state lasts until tomorrow. */
  llmFallbackNote?: string;
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
  /** Absent when the symbol has no recorded financials to test the path
   *  against — a partially recorded symbol must not be handed a business
   *  dimension it has no data for. */
  businessImpactDimension?: BusinessImpactDimension;
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
  /** What this chain is allowed to claim. `analyzed: false` means the symbol
   *  has a price series and linked sources but no broker or quarterly
   *  financial recording, so the chain stops at the company and names what is
   *  missing instead of asserting a business outcome. */
  coverage: { analyzed: boolean; missing: string[] };
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
  analyzeCompany(symbol: string, profile: UserProfile, context?: AnalysisContext): Promise<AnalysisCase | null>;
  mapEventImpact(eventId: string, profile: UserProfile, scope: "watchlist" | "market"): MarketEvent | null;
  answerFollowUp(request: ChatRequest): Promise<ChatAnswer>;
  buildCausalGraph(symbol: string, profile: UserProfile, options: { scope: "watchlist" | "market"; minRelevance: number; context?: AnalysisContext }): Promise<CausalGraph | null>;
}

export interface MemoryStore {
  loadProfile(): UserProfile;
  recordFeedback(feedback: FeedbackEvent): void;
  recordInsight(insight: UserInsight): void;
  listInsights(): UserInsight[];
  listPreferences(): LearnedPreference[];
  compareProfiles(): UserProfile[];
  reset(): void;
  /** Behavioral learning approach A: expose proposed rules from user corrections. */
  listRules(): RuleProposal[];
}
