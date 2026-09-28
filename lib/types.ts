/**
 * The universe is generated from the recordings on disk, not typed here.
 * See lib/data/symbols.generated.ts: a symbol exists because a
 * company-report recording exists for it.
 */
import type { SymbolCode } from "@/lib/data/symbols.generated";
import type { LagValidation } from "@/lib/agent/lag-validate";
export type { SymbolCode };

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
  /** Window `netForeign` and `totalMarketValue` were summed over: the
   *  foreign-flow rows clipped to the app window, not the broker-summary
   *  recording's own span (that feed refreshes on a slower cadence, so its
   *  dates disagree with the figure printed beside them). */
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
  /** The rule came from an approved result (`[Disetujui SYMBOL]` /
   *  `[Hasil SYMBOL]`), not from the built-in playbook. The audit panel
   *  shows these first: a reader who approved a rule came back to see it
   *  work, and finding it below three threshold rows is finding nothing. */
  approved?: boolean;
}

export interface ResearchPlan {
  mandate: string;
  /** Every dimension the case tests. The reader used to pick one of these
   *  before anything rendered; both are carried now and each hypothesis,
   *  source line and observable still names the dimension it came from. */
  focuses: BusinessImpactDimension[];
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
  closingGate: string;
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
  /** Volume spike against the case's primary trigger; the causal map shows this same read. */
  timing: LagValidation | null;
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
    /** Ambang relevansi awal peta sebab akibat (0-100). Default 60. */
    chainRelevanceFloor?: number;
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
  /** What the web-watch screen noted about an event it accepted: the claim is
   *  not confirmed by an official source, or the headline says more than the
   *  body. Labels, never prose; absent on recorded events. */
  markers?: EventMarker[];
}

export const EVENT_MARKERS = ["unconfirmed", "misleadingTitle"] as const;
export type EventMarker = (typeof EVENT_MARKERS)[number];

/** What a reader sees for each marker, on screen and in the assistant's
 *  material. Field labels, true of every marked event. */
export const EVENT_MARKER_LABEL: Record<EventMarker, string> = {
  unconfirmed: "Belum dikonfirmasi resmi",
  misleadingTitle: "Judul tidak sesuai isi",
};

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
  /** Recent turns, so a follow-up can resolve what "yang tadi" refers to.
   *  Client-supplied text that reaches a prompt: bounded by the schema,
   *  filtered through `safeLanguage` at ingest, and never a source of
   *  figures. */
  history?: Array<{ role: "user" | "assistant"; text: string; symbols?: SymbolCode[] }>;
  /** The page the reader asked from. A ranking prior, never a filter. */
  view?: string;
}

export interface ChatAnswer {
  text: string;
  refused: boolean;
  intent: "why-listed" | "event-impact" | "compare" | "missing" | "provenance" | "explain" | "advice" | "clarify" | "retrieved" | "scoped-list"
    | "attribution" | "falsifier" | "case-status" | "playbook" | "causal-path" | "unknown";
  hypotheses: HypothesisTrace[];
  citations: Citation[];
  preferenceNote: string;
  relatedSymbols: SymbolCode[];
  /** Set when the model layer refused for the day — daily call budget reached
   *  or a 429 — and the deterministic path answered instead. The reader is
   *  told, because that state lasts until tomorrow. */
  llmFallbackNote?: string;
  /** The symbol the question itself named. Precedence is question, then the
   *  chip, then the route, so this is what the displayed context must follow
   *  — otherwise the chip says ANTM while the answer is about PGAS. */
  questionSymbol?: SymbolCode;
  /** Set only by the clarify intent: the question as asked, so the reader's
   *  choice can re-send it with a symbol attached. */
  clarification?: { question: string; choices: SymbolCode[] };
  /** Whose material the answer was written from. `user` means the counts in
   *  it are about this reader's list; `registry` means they are about every
   *  recorded issuer. A reader comparing an answer with their screen needs to
   *  know which of the two they are looking at. */
  scope?: "user" | "registry";
  /** Which retrieved entries this answer was written from, in the order the
   *  prompt carried them. No panel renders it: it is what an audit and a test
   *  read instead of judging an Indonesian sentence by eye. It does travel in
   *  the response to the reader who asked, like `clarification.question`, so
   *  it is not a place to put anything that reader may not see. Absent when
   *  no retrieval ran, which is itself the fact worth reading. */
  entryIds?: string[];
  /** Who wrote the text the reader sees: the model, verified, or the
   *  deterministic path. No panel renders it. It is for the person checking
   *  a live answer, who otherwise cannot tell a rewrite from a fallback. */
  generator?: "llm" | "deterministic";
  /** Why the deterministic text shipped when the model was asked: the
   *  verifier's violations, a timeout, the daily budget, or the model layer
   *  being off. Absent when the model's draft shipped or was never asked. */
  fallbackReason?: string;
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
  /** Supporting evidence written from the graph itself. Only the company node
   *  sets it — every other node's support is its own relevance. */
  supportingEvidence?: string;
  citations: Citation[];
  /** Carried from a source event the web-watch screen marked. */
  markers?: EventMarker[];
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
  /** Every indicator this cause is tested against — one per focus the case
   *  carries, so a combined case does not silently compare against the first. */
  targetObservables: string[];
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
  /** Every indicator the chain is drawn against, in plan order. */
  targetObservables: string[];
  competingHypotheses: CompetingHypothesis[];
  hiddenRelationshipCount: number;
  asOf: string;
  /** What this chain is allowed to claim. `analyzed: false` means the symbol
   *  has a price series and linked sources but no broker or quarterly
   *  financial recording, so the chain stops at the company and names what is
   *  missing instead of asserting a business outcome. */
  coverage: { analyzed: boolean; missing: string[] };
}

/**
 * Every chain in the watchlist, drawn as one graph.
 *
 * The dashboard asks a different question from the per-issuer chain: not
 * "what moved ANTM" but "what is moving the book, and where do two issuers
 * hang off the same recording". That only shows up once the chains are
 * merged, so a source recorded against two issuers becomes one node carrying
 * both symbols rather than two identical cards in separate columns.
 *
 * Merging is the only thing this structure adds. It invents no links: a node
 * reaches two symbols because the recording says so, never because both
 * issuers happen to share a sector.
 */
export interface MarketCausalNode extends CausalNode {
  /** Issuers whose chain this node sits on. Length > 1 only for nodes more
   *  than one issuer runs through. */
  symbols: SymbolCode[];
  /**
   * Set only on a stand-in card that stands for several recordings behind one
   * transmission channel. The board draws one of these instead of a dozen
   * source cards so the whole map fits a screen; expanding it swaps the
   * stand-in for the recordings it names.
   */
  groupedSourceIds?: string[];
}

export interface MarketCausalEdge extends CausalEdge {
  /** The chain this edge was built for. A shared source has one edge per
   *  issuer, so the fan-out stays attributable. */
  symbol: SymbolCode;
}

export interface MarketCausalGraph {
  symbols: SymbolCode[];
  nodes: MarketCausalNode[];
  edges: MarketCausalEdge[];
  /** Sources that reach more than one issuer — the connective tissue the
   *  per-issuer chain cannot show. */
  sharedSourceIds: string[];
  /** Every node more than one issuer runs through: the shared recordings
   *  above, plus the transmission channels and business-impact tests the
   *  chains converge into. These are what make the board a web rather than a
   *  stack of separate chains. */
  hubNodeIds: string[];
  hiddenRelationshipCount: number;
  /** Watchlist symbols that produced no chain at all, with the reason. */
  skipped: Array<{ symbol: SymbolCode; reason: string }>;
  asOf: string;
  coverage: Record<string, { analyzed: boolean; missing: string[] }>;
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
  buildCausalGraph(symbol: string, profile: UserProfile, options: { scope: "watchlist" | "market"; minRelevance: number; context?: AnalysisContext; maxSources?: number; prioritizeEventIds?: string[] }): Promise<CausalGraph | null>;
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
