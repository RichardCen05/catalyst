"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoProfiles } from "@/lib/data/fixtures";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
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

interface CatalystState {
  profile: UserProfile;
  preferences: LearnedPreference[];
  feedback: FeedbackEvent[];
  insights: UserInsight[];
  playbook: InvestorResearchPlaybook;
  holdings: Holdings;
  caseMandates: Partial<Record<SymbolCode, string>>;
  caseClarifications: Partial<Record<SymbolCode, string>>;
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
  setCaseClarification: (symbol: SymbolCode, choiceId: string) => void;
  setCaseStatus: (symbol: SymbolCode, status: ResearchCaseStatus) => void;
  saveCaseResolution: (symbol: SymbolCode, resolution: Omit<CaseResolution, "resolvedAt">) => void;
  setRuleProposalStatus: (id: string, status: RuleProposal["status"]) => void;
  setPlaybookList: (key: Exclude<keyof InvestorResearchPlaybook, "preferredComparables" | "relevanceFloor" | "thresholds">, values: string[]) => void;
  setPreferredComparables: (symbol: SymbolCode, values: SymbolCode[]) => void;
  setRelevanceFloor: (value: number) => void;
  setThreshold: (key: keyof typeof DEFAULT_THRESHOLDS extends infer K ? Exclude<K, "relevanceFloor"> : never, value: number) => void;
  resetThreshold: (key: Exclude<keyof typeof DEFAULT_THRESHOLDS, "relevanceFloor">) => void;
  resetAllThresholds: () => void;
  setHolding: (symbol: SymbolCode, holding: Holding) => void;
  removeHolding: (symbol: SymbolCode) => void;
  removeInsight: (id: string) => void;
  togglePreference: (id: string) => void;
  resetMemory: () => void;
}

const basePreferences: LearnedPreference[] = [
  { id: "pref-order", label: "Mulai dari Konsentrasi", explanation: "Dipilih langsung saat pengaturan awal.", source: "explicit", active: true },
  { id: "pref-sector", label: "Prioritaskan bahan dasar", explanation: "Berasal dari daftar pantauan aktif.", source: "explicit", active: true },
];

export const defaultPlaybook: InvestorResearchPlaybook = {
  preferredComparables: {
    ANTM: ["INCO", "TINS"],
    INCO: ["ANTM"],
    TINS: ["ANTM"],
    PGAS: ["ADRO", "PTBA"],
    ADRO: ["PTBA"],
    PTBA: ["ADRO"],
  },
  materialityRules: ["Prioritaskan perubahan yang dapat memengaruhi volume, margin, atau arus kas."],
  knownExposures: [
    "ANTM: harga nikel, volume penjualan, rupiah, dan jam operasi tambang.",
    "INCO: harga nikel, volume produksi, energi, dan curah hujan.",
    "TINS: harga timah, volume produksi, cuaca laut, dan regulasi ekspor.",
    "PGAS: harga gas, volume distribusi, kontrak, dan kebijakan harga.",
    "ADRO: harga batu bara, stripping ratio, cuaca, dan volume penjualan.",
    "PTBA: harga batu bara, DMO, biaya angkut, dan volume penjualan.",
  ],
  thesisAssumptions: [
    "ANTM: harga acuan perlu diterjemahkan ke realisasi harga atau pendapatan.",
    "INCO: harga nikel harus melewati kontrak dan volume produksi sebelum dianggap material.",
    "TINS: harga timah harus dipisahkan dari perubahan volume dan izin operasi.",
    "PGAS: perubahan harga perlu diuji terhadap struktur kontrak dan volume distribusi.",
    "ADRO: harga acuan perlu diuji bersama volume dan biaya produksi.",
    "PTBA: perubahan harga perlu diuji terhadap DMO dan biaya logistik.",
  ],
  trustedSources: ["Data keuangan Sectors dan keterbukaan emiten sebelum berita sekunder."],
  falsifiers: [
    "ANTM: hipotesis katalis melemah bila volume penjualan atau realisasi harga tidak ikut berubah.",
    "INCO: hipotesis melemah bila harga realisasi dan volume produksi tidak mengonfirmasi perubahan nikel.",
    "TINS: hipotesis melemah bila volume penjualan dan margin tidak berubah setelah harga timah bergerak.",
    "PGAS: hipotesis melemah bila volume distribusi dan margin tidak berubah pada periode kontrak berikutnya.",
    "ADRO: hipotesis melemah bila volume penjualan atau margin tidak mengonfirmasi perubahan batu bara.",
    "PTBA: hipotesis melemah bila realisasi harga dan arus kas tidak bergerak setelah faktor DMO diperhitungkan.",
  ],
  relevanceFloor: 85,
};

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
      caseClarifications: {},
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
          explanation: "Catatan pengguna disimpan sebagai hipotesis terbuka sampai diperiksa terhadap sumber.",
          source: "feedback",
          active: true,
        };
        return { insights: [insight, ...state.insights], preferences: [learned, ...state.preferences] };
      }),
      setInsightStatus: (id, status) => set((state) => ({ insights: state.insights.map((item) => item.id === id ? { ...item, status, reviewHistory: [...(item.reviewHistory ?? [{ status: item.status, at: item.createdAt }]), { status, at: new Date().toISOString() }] } : item) })),
      setCaseMandate: (symbol, mandate) => set((state) => {
        const caseClarifications = { ...state.caseClarifications };
        delete caseClarifications[symbol];
        return { caseMandates: { ...state.caseMandates, [symbol]: mandate }, caseClarifications };
      }),
      setCaseClarification: (symbol, choiceId) => set((state) => ({ caseClarifications: { ...state.caseClarifications, [symbol]: choiceId } })),
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
      resetMemory: () => set({ preferences: basePreferences, feedback: [], insights: [], holdings: {}, playbook: structuredClone(defaultPlaybook), caseMandates: {}, caseClarifications: {}, caseStatuses: {}, caseResolutions: {}, ruleProposals: [] }),
    }),
    {
      name: "catalyst:v1",
      version: 4,
      migrate: (persisted) => {
        if (!persisted || typeof persisted !== "object") return persisted as CatalystState;
        const stored = persisted as Partial<CatalystState> & { version?: number };
        const out = {
          ...stored,
          holdings: stored.holdings ?? {},
          caseMandates: stored.caseMandates ?? {},
          caseClarifications: stored.caseClarifications ?? {},
          caseStatuses: stored.caseStatuses ?? {},
          caseResolutions: stored.caseResolutions ?? {},
          ruleProposals: stored.ruleProposals ?? [],
          insights: stored.insights ?? [],
          feedback: stored.feedback ?? [],
        } as CatalystState;
        // v3 → v4: thresholds diperkenalkan; snapshot lama tidak punya field ini.
        // Isi objek kosong agar resolveThresholds mengisi default per kunci (C7).
        if (out.playbook) {
          out.playbook = { ...out.playbook, thresholds: (out.playbook.thresholds ?? {}) as InvestorResearchPlaybook["thresholds"] };
        }
        return out;
      },
      merge: (persisted, current) => {
        const stored = persisted as Partial<CatalystState>;
        return {
          ...current,
          ...stored,
          // Satu tabel default (C7): tidak ada duplikat literal 85 di sini.
          playbook: { relevanceFloor: DEFAULT_THRESHOLDS.relevanceFloor, ...current.playbook, ...(stored.playbook ?? {}) },
          caseMandates: stored.caseMandates ?? current.caseMandates,
          caseClarifications: stored.caseClarifications ?? current.caseClarifications,
          caseStatuses: stored.caseStatuses ?? current.caseStatuses,
          caseResolutions: stored.caseResolutions ?? current.caseResolutions,
          ruleProposals: stored.ruleProposals ?? current.ruleProposals,
        };
      },
    },
  ),
);
