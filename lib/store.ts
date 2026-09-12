"use client";

import { create } from "zustand";
import { persist } from "zustand/middleware";
import { demoProfiles } from "@/lib/data/fixtures";
import type {
  AnswerDepth,
  CaseResolution,
  CopilotContext,
  FeedbackEvent,
  Horizon,
  LearnedPreference,
  InvestorResearchPlaybook,
  PillarKey,
  ResearchCaseStatus,
  SymbolCode,
  UserInsight,
  UserProfile,
} from "@/lib/types";

interface CatalystState {
  profile: UserProfile;
  preferences: LearnedPreference[];
  feedback: FeedbackEvent[];
  insights: UserInsight[];
  playbook: InvestorResearchPlaybook;
  caseMandates: Partial<Record<SymbolCode, string>>;
  caseStatuses: Partial<Record<SymbolCode, ResearchCaseStatus>>;
  caseResolutions: Partial<Record<SymbolCode, CaseResolution>>;
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
  clearCopilotContext: () => void;
  recordFeedback: (input: Omit<FeedbackEvent, "id" | "createdAt">) => void;
  recordInsight: (input: Omit<UserInsight, "id" | "createdAt" | "status" | "reviewHistory">) => void;
  setInsightStatus: (id: string, status: UserInsight["status"]) => void;
  setCaseMandate: (symbol: SymbolCode, mandate: string) => void;
  setCaseStatus: (symbol: SymbolCode, status: ResearchCaseStatus) => void;
  saveCaseResolution: (symbol: SymbolCode, resolution: Omit<CaseResolution, "resolvedAt">) => void;
  setPlaybookList: (key: Exclude<keyof InvestorResearchPlaybook, "preferredComparables">, values: string[]) => void;
  setPreferredComparables: (symbol: SymbolCode, values: SymbolCode[]) => void;
  removeInsight: (id: string) => void;
  togglePreference: (id: string) => void;
  resetMemory: () => void;
}

const basePreferences: LearnedPreference[] = [
  { id: "pref-order", label: "Mulai dari Konsentrasi", explanation: "Dipilih langsung saat setup.", source: "explicit", active: true },
  { id: "pref-sector", label: "Prioritaskan Basic Materials", explanation: "Berasal dari watchlist aktif.", source: "explicit", active: true },
];

export const defaultPlaybook: InvestorResearchPlaybook = {
  preferredComparables: {
    ANTM: ["INCO", "TINS"],
    BBCA: ["BBRI", "BMRI"],
  },
  materialityRules: ["Prioritaskan perubahan yang dapat memengaruhi volume, margin, atau arus kas."],
  knownExposures: ["ANTM: harga nikel, volume penjualan, rupiah, dan jam operasi tambang."],
  thesisAssumptions: ["ANTM: harga acuan perlu diterjemahkan ke realisasi harga atau pendapatan."],
  trustedSources: ["Sectors financials dan filing perusahaan sebelum berita sekunder."],
  falsifiers: ["ANTM: thesis katalis melemah bila volume penjualan atau realisasi harga tidak ikut berubah."],
};

export const useCatalystStore = create<CatalystState>()(
  persist(
    (set) => ({
      profile: structuredClone(demoProfiles[0]),
      preferences: basePreferences,
      feedback: [],
      insights: [],
      playbook: structuredClone(defaultPlaybook),
      caseMandates: {},
      caseStatuses: {},
      caseResolutions: {},
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
      clearCopilotContext: () => set({ copilotContext: null }),
      recordFeedback: (input) => set((state) => {
        const feedback: FeedbackEvent = { ...input, id: `fb-${Date.now()}`, createdAt: new Date().toISOString() };
        const label = input.action === "show-more" ? "Tampilkan analisis lebih dalam" : input.action === "useful" ? "Sumber ini berguna" : "Kurangi prioritas kasus serupa";
        const learned: LearnedPreference = { id: `learned-${feedback.id}`, label, explanation: "Dipelajari dari feedback yang dapat dibatalkan.", source: "feedback", active: true };
        return { feedback: [feedback, ...state.feedback], preferences: [learned, ...state.preferences] };
      }),
      recordInsight: (input) => set((state) => {
        const createdAt = new Date().toISOString();
        const insight: UserInsight = { ...input, id: `insight-${Date.now()}`, status: "pending", createdAt, reviewHistory: [{ status: "pending", at: createdAt }] };
        const learned: LearnedPreference = {
          id: `learned-${insight.id}`,
          label: `Verifikasi ulang ${insight.symbol}${insight.pillar ? ` · ${insight.pillar}` : ""}`,
          explanation: "Catatan user disimpan sebagai hipotesis terbuka sampai diverifikasi terhadap sumber.",
          source: "feedback",
          active: true,
        };
        return { insights: [insight, ...state.insights], preferences: [learned, ...state.preferences] };
      }),
      setInsightStatus: (id, status) => set((state) => ({ insights: state.insights.map((item) => item.id === id ? { ...item, status, reviewHistory: [...(item.reviewHistory ?? [{ status: item.status, at: item.createdAt }]), { status, at: new Date().toISOString() }] } : item) })),
      setCaseMandate: (symbol, mandate) => set((state) => ({ caseMandates: { ...state.caseMandates, [symbol]: mandate } })),
      setCaseStatus: (symbol, status) => set((state) => ({ caseStatuses: { ...state.caseStatuses, [symbol]: status } })),
      saveCaseResolution: (symbol, resolution) => set((state) => ({
        caseStatuses: { ...state.caseStatuses, [symbol]: "closed" },
        caseResolutions: { ...state.caseResolutions, [symbol]: { ...resolution, resolvedAt: new Date().toISOString() } },
        playbook: {
          ...state.playbook,
          materialityRules: [
            ...state.playbook.materialityRules.filter((item) => !item.startsWith(`[Resolution ${symbol}]`)),
            `[Resolution ${symbol}] ${resolution.reusableRule}`,
          ],
        },
      })),
      setPlaybookList: (key, values) => set((state) => ({ playbook: { ...state.playbook, [key]: values } })),
      setPreferredComparables: (symbol, values) => set((state) => ({ playbook: { ...state.playbook, preferredComparables: { ...state.playbook.preferredComparables, [symbol]: values } } })),
      removeInsight: (id) => set((state) => ({ insights: state.insights.filter((item) => item.id !== id), preferences: state.preferences.filter((item) => item.id !== `learned-${id}`) })),
      togglePreference: (id) => set((state) => ({ preferences: state.preferences.map((item) => item.id === id ? { ...item, active: !item.active } : item) })),
      resetMemory: () => set({ preferences: basePreferences, feedback: [], insights: [], playbook: structuredClone(defaultPlaybook), caseMandates: {}, caseStatuses: {}, caseResolutions: {} }),
    }),
    {
      name: "catalyst:v1",
      version: 1,
      merge: (persisted, current) => {
        const stored = persisted as Partial<CatalystState>;
        return {
          ...current,
          ...stored,
          playbook: stored.playbook ?? current.playbook,
          caseMandates: stored.caseMandates ?? current.caseMandates,
          caseStatuses: stored.caseStatuses ?? current.caseStatuses,
          caseResolutions: stored.caseResolutions ?? current.caseResolutions,
        };
      },
    },
  ),
);
