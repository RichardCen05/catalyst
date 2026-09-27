"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoProfiles } from "@/lib/data/fixtures";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { MEMORY_SNAPSHOT_VERSION } from "@/lib/schemas";
import { migrateMemorySnapshot } from "@/lib/memory/snapshot";
import { buildBasePreferences, buildDefaultPlaybook } from "@/lib/playbook-defaults";
import type {
  AnswerDepth,
  CaseResolution,
  CopilotContext,
  FeedbackEvent,
  Horizon,
  LearnedPreference,
  InvestorResearchPlaybook,
  PillarKey,
  RuleProposal,
  ResearchCaseStatus,
  SymbolCode,
  UserInsight,
  UserProfile,
} from "@/lib/types";

import type { Holding, Holdings } from "@/lib/portfolio";

type PlaybookThresholdKey = keyof NonNullable<InvestorResearchPlaybook["thresholds"]>;

interface CatalystState {
  profile: UserProfile;
  preferences: LearnedPreference[];
  feedback: FeedbackEvent[];
  insights: UserInsight[];
  playbook: InvestorResearchPlaybook;
  holdings: Holdings;
  caseMandates: Partial<Record<SymbolCode, string>>;
  caseStatuses: Partial<Record<SymbolCode, ResearchCaseStatus>>;
  caseResolutions: Partial<Record<SymbolCode, CaseResolution>>;
  ruleProposals: RuleProposal[];
  copilotOpen: boolean;
  copilotContext: CopilotContext | null;
  tourOpen: boolean;
  setDemoProfile: (id: UserProfile["id"]) => void;
  setWatchlist: (symbols: SymbolCode[]) => void;
  toggleOwned: (symbol: SymbolCode) => void;
  setHorizon: (horizon: Horizon) => void;
  setDepth: (depth: AnswerDepth) => void;
  setPillarOrder: (order: PillarKey[]) => void;
  completeOnboarding: () => void;
  /** Close setup without the tour: the reader keeps the seeded watchlist and
   *  can start the tour later from settings. */
  skipOnboarding: () => void;
  startTour: () => void;
  finishTour: () => void;
  setCopilotOpen: (open: boolean) => void;
  openCopilot: (context?: CopilotContext) => void;
  setCopilotContext: (context: CopilotContext | null) => void;
  clearCopilotContext: () => void;
  recordFeedback: (input: Omit<FeedbackEvent, "id" | "createdAt">) => void;
  recordInsight: (input: Omit<UserInsight, "id" | "createdAt" | "status" | "reviewHistory">) => void;
  setInsightStatus: (id: string, status: UserInsight["status"]) => void;
  setCaseMandate: (symbol: SymbolCode, mandate: string) => void;
  setCaseStatus: (symbol: SymbolCode, status: ResearchCaseStatus) => void;
  saveCaseResolution: (symbol: SymbolCode, resolution: Omit<CaseResolution, "resolvedAt">) => void;
  setRuleProposalStatus: (id: string, status: RuleProposal["status"]) => void;
  setPlaybookList: (key: Exclude<keyof InvestorResearchPlaybook, "preferredComparables" | "relevanceFloor" | "thresholds">, values: string[]) => void;
  setPreferredComparables: (symbol: SymbolCode, values: SymbolCode[]) => void;
  setRelevanceFloor: (value: number) => void;
  /** Keyed on what the playbook can actually hold: a `DEFAULT_THRESHOLDS` key
   *  with no slot in `InvestorResearchPlaybook["thresholds"]` (a server-side
   *  one such as `memoryPatchMaxBytes`) would be written into the store and
   *  then stripped in silence on the next sync. */
  setThreshold: (key: PlaybookThresholdKey, value: number) => void;
  resetThreshold: (key: PlaybookThresholdKey) => void;
  resetAllThresholds: () => void;
  setHolding: (symbol: SymbolCode, holding: Holding) => void;
  removeHolding: (symbol: SymbolCode) => void;
  removeInsight: (id: string) => void;
  togglePreference: (id: string) => void;
  resetMemory: () => void;
}

/** Both the seeded playbook and the seeded preferences are assembled from the
 *  recordings in lib/playbook-defaults.ts — never typed per ticker. */
const basePreferences: LearnedPreference[] = buildBasePreferences(demoProfiles[0]);

export const defaultPlaybook: InvestorResearchPlaybook = buildDefaultPlaybook();

/**
 * The shape version every persisted copy carries.
 *
 * Defined in `lib/schemas.ts` so the memory route — server code that must not
 * import this client module — stamps the same number on the GCS object that
 * `persist` writes into localStorage here.
 */
export const STORE_VERSION = MEMORY_SNAPSHOT_VERSION;

/**
 * One migration, used by both hydration paths.
 *
 * The body lives in `lib/memory/snapshot.ts`, which `components/memory-sync.tsx`
 * also runs, so the GCS path cannot drift into a second implementation.
 */
export function migrateCatalystState(persisted: unknown): CatalystState {
  return (migrateMemorySnapshot(persisted) as CatalystState | null) ?? (persisted as CatalystState);
}

export const useCatalystStore = create<CatalystState>()(
  persist(
    (set) => ({
      profile: structuredClone(demoProfiles[0]),
      preferences: basePreferences,
      feedback: [],
      insights: [],
      playbook: structuredClone(defaultPlaybook),
      holdings: {},
      caseMandates: {},
      caseStatuses: {},
      caseResolutions: {},
      ruleProposals: [],
      copilotOpen: false,
      copilotContext: null,
      tourOpen: false,
      setDemoProfile: (id) => set({ profile: structuredClone(demoProfiles.find((profile) => profile.id === id) ?? demoProfiles[0]) }),
      setWatchlist: (symbols) => set((state) => ({ profile: { ...state.profile, watchlist: symbols, owned: state.profile.owned.filter((symbol) => symbols.includes(symbol)) } })),
      toggleOwned: (symbol) => set((state) => ({
        profile: {
          ...state.profile,
          owned: state.profile.owned.includes(symbol)
            ? state.profile.owned.filter((item) => item !== symbol)
            : [...state.profile.owned, symbol],
        },
      })),
      setHorizon: (horizon) => set((state) => ({ profile: { ...state.profile, config: { ...state.profile.config, horizon } } })),
      setDepth: (depth) => set((state) => ({ profile: { ...state.profile, config: { ...state.profile.config, depth } } })),
      setPillarOrder: (pillarOrder) => set((state) => ({ profile: { ...state.profile, config: { ...state.profile.config, pillarOrder } } })),
      completeOnboarding: () => set((state) => ({ profile: { ...state.profile, hasOnboarded: true }, tourOpen: true })),
      skipOnboarding: () => set((state) => ({ profile: { ...state.profile, hasOnboarded: true } })),
      startTour: () => set({ tourOpen: true }),
      finishTour: () => set({ tourOpen: false }),
      setCopilotOpen: (copilotOpen) => set({ copilotOpen }),
      openCopilot: (copilotContext) => set({ copilotOpen: true, copilotContext: copilotContext ?? null }),
      setCopilotContext: (copilotContext) => set({ copilotContext }),
      clearCopilotContext: () => set({ copilotContext: null }),
      recordFeedback: (input) => set((state) => {
        const existing = input.targetId ? state.feedback.find((item) => item.targetId === input.targetId) : undefined;
        const feedback: FeedbackEvent = { ...existing, ...input, id: existing?.id ?? `fb-${Date.now()}`, createdAt: new Date().toISOString() };
        const label = input.action === "show-more"
          ? "Tampilkan analisis lebih dalam"
          : input.action === "show-less"
            ? "Tampilkan analisis lebih ringkas"
            : input.action === "useful"
              ? "Bukti ini berguna"
              : "Kurangi prioritas bukti serupa";
        const learned: LearnedPreference = { id: `learned-${feedback.id}`, label, explanation: "Dipelajari dari masukan yang dapat dibatalkan.", source: "feedback", active: true };
        return {
          feedback: existing ? state.feedback.map((item) => item.id === feedback.id ? feedback : item) : [feedback, ...state.feedback],
          preferences: [learned, ...state.preferences.filter((item) => item.id !== learned.id)],
        };
      }),
      recordInsight: (input) => set((state) => {
        const createdAt = new Date().toISOString();
        const insight: UserInsight = { ...input, id: `insight-${Date.now()}`, status: "pending", createdAt, reviewHistory: [{ status: "pending", at: createdAt }] };
        const learned: LearnedPreference = {
          id: `learned-${insight.id}`,
          label: `Verifikasi ulang ${insight.symbol}${insight.pillar ? ` · ${insight.pillar}` : ""}`,
          explanation: "Catatan pengguna diterima dan diproses sebagai konteks analisis; bukan fakta pasar.",
          source: "feedback",
          active: true,
        };
        return { insights: [insight, ...state.insights], preferences: [learned, ...state.preferences] };
      }),
      setInsightStatus: (id, status) => set((state) => ({ insights: state.insights.map((item) => item.id === id ? { ...item, status, reviewHistory: [...(item.reviewHistory ?? [{ status: item.status, at: item.createdAt }]), { status, at: new Date().toISOString() }] } : item) })),
      setCaseMandate: (symbol, mandate) => set((state) => ({ caseMandates: { ...state.caseMandates, [symbol]: mandate } })),
      setCaseStatus: (symbol, status) => set((state) => ({ caseStatuses: { ...state.caseStatuses, [symbol]: status } })),
      saveCaseResolution: (symbol, resolution) => set((state) => {
        const resolvedAt = new Date().toISOString();
        const proposalKind: RuleProposal["kind"] = resolution.outcome === "challenged" ? "falsifier" : "materiality";
        const proposal: RuleProposal = {
          id: `proposal-${symbol}-${Date.now()}`,
          symbol,
          kind: proposalKind,
          rule: resolution.reusableRule,
          evidence: resolution.falsifiedBy || resolution.finalHypothesis,
          sourceResolutionAt: resolvedAt,
          status: "pending",
          createdAt: resolvedAt,
        };
        return {
          caseStatuses: { ...state.caseStatuses, [symbol]: "closed" },
          caseResolutions: { ...state.caseResolutions, [symbol]: { ...resolution, resolvedAt } },
          ruleProposals: [proposal, ...state.ruleProposals.filter((item) => item.symbol !== symbol || item.status !== "pending")],
        };
      }),
      setRuleProposalStatus: (id, status) => set((state) => {
        const proposal = state.ruleProposals.find((item) => item.id === id);
        if (!proposal) return state;
        const prefixedRule = `[Disetujui ${proposal.symbol}] ${proposal.rule}`;
        const playbook = status === "accepted"
          ? proposal.kind === "materiality"
            ? { ...state.playbook, materialityRules: [...state.playbook.materialityRules.filter((item) => item !== prefixedRule), prefixedRule] }
            : { ...state.playbook, falsifiers: [...state.playbook.falsifiers.filter((item) => item !== prefixedRule), prefixedRule] }
          : state.playbook;
        return { playbook, ruleProposals: state.ruleProposals.map((item) => item.id === id ? { ...item, status } : item) };
      }),
      setPlaybookList: (key, values) => set((state) => ({ playbook: { ...state.playbook, [key]: values } })),
      setPreferredComparables: (symbol, values) => set((state) => ({ playbook: { ...state.playbook, preferredComparables: { ...state.playbook.preferredComparables, [symbol]: values } } })),
      setRelevanceFloor: (value) => set((state) => ({ playbook: { ...state.playbook, relevanceFloor: Math.min(100, Math.max(0, Math.round(value))) } })),
      setThreshold: (key, value) => set((state) => {
        const bounds: Record<string, [number, number]> = {
          concentrationFloor: [0, 1],
          volumeZFloor: [0, 10],
          volumeExtremeFloor: [0, 10],
          contagionDropFloor: [0, 1],
          contagionCorrelationFloor: [0, 1],
          distributionValueFloor: [0, 1e15],
        };
        const [lo, hi] = bounds[key] ?? [0, Number.MAX_SAFE_INTEGER];
        const clamped = Math.min(hi, Math.max(lo, value));
        return { playbook: { ...state.playbook, thresholds: { ...(state.playbook.thresholds ?? {}), [key]: clamped } } };
      }),
      resetThreshold: (key) => set((state) => {
        const thresholds = { ...(state.playbook.thresholds ?? {}) };
        delete (thresholds as Record<string, unknown>)[key];
        return { playbook: { ...state.playbook, thresholds } };
      }),
      resetAllThresholds: () => set((state) => ({ playbook: { ...state.playbook, thresholds: {} } })),
      setHolding: (symbol, holding) => set((state) => ({
        holdings: { ...state.holdings, [symbol]: { shares: Math.max(0, Math.round(holding.shares)), avgCost: Math.max(0, holding.avgCost) } },
        profile: state.profile.owned.includes(symbol) ? state.profile : { ...state.profile, owned: [...state.profile.owned, symbol] },
      })),
      removeHolding: (symbol) => set((state) => {
        const holdings = { ...state.holdings };
        delete holdings[symbol];
        return { holdings };
      }),
      removeInsight: (id) => set((state) => ({ insights: state.insights.filter((item) => item.id !== id), preferences: state.preferences.filter((item) => item.id !== `learned-${id}`) })),
      togglePreference: (id) => set((state) => ({ preferences: state.preferences.map((item) => item.id === id ? { ...item, active: !item.active } : item) })),
      resetMemory: () => set({ preferences: basePreferences, feedback: [], insights: [], holdings: {}, playbook: structuredClone(defaultPlaybook), caseMandates: {}, caseStatuses: {}, caseResolutions: {}, ruleProposals: [] }),
    }),
    {
      name: "catalyst:v1",
      version: STORE_VERSION,
      migrate: (persisted) => migrateCatalystState(persisted),
      /**
       * What is worth keeping between visits.
       *
       * Three fields are about the current visit and nothing else: whether
       * the copilot panel happens to be open, what it is pointed at, and
       * whether the tour is running. Persisting them meant a browser could
       * be reopened straight into a tour nobody asked to restart, and it put
       * transient panel state into the server backup. Reader-visible
       * behaviour changes here: a reload now starts with the panel closed.
       */
      partialize: (state) => {
        const { copilotOpen: _open, copilotContext: _context, tourOpen: _tour, ...rest } = state;
        return rest as CatalystState;
      },
      merge: (persisted, current) => {
        const stored = persisted as Partial<CatalystState>;
        return {
          ...current,
          ...stored,
          // Satu tabel default (C7): tidak ada duplikat literal 85 di sini.
          playbook: { relevanceFloor: DEFAULT_THRESHOLDS.relevanceFloor, ...current.playbook, ...(stored.playbook ?? {}) },
          caseMandates: stored.caseMandates ?? current.caseMandates,
          caseStatuses: stored.caseStatuses ?? current.caseStatuses,
          caseResolutions: stored.caseResolutions ?? current.caseResolutions,
          ruleProposals: stored.ruleProposals ?? current.ruleProposals,
        };
      },
    },
  ),
);
