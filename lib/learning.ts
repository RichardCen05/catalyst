import { DEFAULT_THRESHOLDS, resolveThresholds } from "@/lib/agent/thresholds";
import type {
  CaseResolution,
  FeedbackEvent,
  InvestorResearchPlaybook,
  LearnedPreference,
  RuleProposal,
  SymbolCode,
  UserInsight,
} from "@/lib/types";

export const LEARNING_FILTERS = ["all", "feedback", "insight", "resolution"] as const;
export type LearningFilter = (typeof LEARNING_FILTERS)[number];
export type LearningKind = Exclude<LearningFilter, "all">;
export type LearningStatus = "active" | "inactive" | "pending" | "reviewed" | "dismissed" | "accepted" | "rejected" | "stored";
export type LearningStepState = "complete" | "current" | "skipped";

export interface LearningStep {
  label: string;
  detail: string;
  state: LearningStepState;
  at?: string;
}

export interface LearningItem {
  id: string;
  kind: LearningKind;
  createdAt: string;
  symbol?: SymbolCode;
  inputLabel: string;
  inputDetail: string;
  targetLabel?: string;
  status: LearningStatus;
  statusLabel: string;
  learningLabel: string;
  learningDetail: string;
  effectLabel: string;
  steps: LearningStep[];
  href: string;
  sourceUrl?: string;
}

export type MemoryGroup = "feedback" | "insight" | "rule" | "explicit";

export interface MemoryItem {
  id: string;
  group: MemoryGroup;
  status: LearningStatus | "explicit";
  label: string;
  detail: string;
  href: string;
}

export interface LearningSnapshot {
  items: LearningItem[];
  memories: MemoryItem[];
  summary: {
    inputCount: number;
    pendingCount: number;
    activeCount: number;
    explicitCount: number;
  };
}

export interface LearningSnapshotInput {
  feedback: FeedbackEvent[];
  preferences: LearnedPreference[];
  insights: UserInsight[];
  caseResolutions: Partial<Record<SymbolCode, CaseResolution>>;
  ruleProposals: RuleProposal[];
  playbook: InvestorResearchPlaybook;
}

const feedbackCopy: Record<FeedbackEvent["action"], { input: string; learned: string; effect: string }> = {
  useful: {
    input: "Bukti ini berguna",
    learned: "Prioritaskan bukti serupa",
    effect: "Menaikkan urutan kasus sejenis di daftar Analisis dan Riset.",
  },
  "not-useful": {
    input: "Bukti ini kurang relevan",
    learned: "Kurangi prioritas bukti serupa",
    effect: "Menurunkan urutan kasus sejenis di daftar Analisis dan Riset.",
  },
  "show-more": {
    input: "Minta analisis lebih dalam",
    learned: "Prioritaskan analisis lebih dalam",
    effect: "Menaikkan urutan kasus sejenis di daftar Analisis dan Riset.",
  },
  "show-less": {
    input: "Minta analisis lebih ringkas",
    learned: "Kurangi prioritas analisis serupa",
    effect: "Menurunkan urutan kasus sejenis di daftar Analisis dan Riset.",
  },
};

const insightStatusCopy: Record<UserInsight["status"], { label: string; learning: string; effect: string }> = {
  pending: {
    label: "Menunggu pemeriksaan",
    learning: "Disimpan sebagai hipotesis terbuka",
    effect: "Muncul sebagai catatan pemeriksaan untuk ticker terkait; tidak mengubah fakta atau rumus.",
  },
  incorporated: {
    label: "Sudah diperiksa",
    learning: "Tetap disimpan sebagai konteks hipotesis",
    effect: "Tetap dapat muncul sebagai catatan pemeriksaan untuk ticker terkait; tidak menjadi fakta pasar.",
  },
  dismissed: {
    label: "Diabaikan",
    learning: "Tidak dipakai lagi sebagai hipotesis",
    effect: "Tidak lagi masuk sebagai catatan pemeriksaan.",
  },
};

const insightCategoryCopy: Record<UserInsight["category"], string> = {
  "data-error": "Koreksi data",
  "missing-context": "Konteks belum masuk",
  "alternative-interpretation": "Interpretasi alternatif",
};

function ruleStatusCopy(status: RuleProposal["status"]): { label: string; learning: string; effect: string } {
  if (status === "accepted") return {
    label: "Diterima",
    learning: "Aturan disetujui pengguna",
    effect: "Masuk ke playbook dan dipakai pada analisis berikutnya untuk ticker terkait.",
  };
  if (status === "rejected") return {
    label: "Ditolak",
    learning: "Usulan aturan tidak dipakai",
    effect: "Tidak masuk ke playbook atau analisis berikutnya.",
  };
  return {
    label: "Menunggu keputusan",
    learning: "Usulan aturan dibuat dari hasil kasus",
    effect: "Belum masuk ke playbook sampai pengguna menerima aturan ini.",
  };
}

function feedbackTarget(feedback: FeedbackEvent): string {
  return feedback.targetLabel ?? (feedback.symbol ? `Analisis ${feedback.symbol}` : "Bukti serupa");
}

function preferenceFor(feedback: FeedbackEvent, preferences: LearnedPreference[]): LearnedPreference | undefined {
  return preferences.find((preference) => preference.id === `learned-${feedback.id}`);
}

/** Case-list priority only reads feedback whose paired preference is active. */
export function feedbackRankDelta(feedback: FeedbackEvent[], preferences: LearnedPreference[], symbol: SymbolCode): number {
  return feedback
    .filter((item) => item.symbol === symbol && (preferenceFor(item, preferences)?.active ?? true))
    .reduce((total, item) => total + (item.action === "useful" || item.action === "show-more" ? 10 : -10), 0);
}

/**
 * The one place the score above is spent.
 *
 * `feedbackCopy` tells the reader that marking evidence useful moves similar
 * cases up the list. That sentence was false for as long as this function did
 * not exist: `feedbackRankDelta` was computed, rendered on the AI Learning
 * page, and consumed by nothing, so the list never moved. Ordering is the only
 * thing it changes — the figures, the sources, and the materiality verdict on
 * each row are untouched, which is the promise `learningDetail` makes.
 *
 * The sort is stable: rows with no feedback keep the order they arrived in
 * (watchlist order), so an untouched app looks exactly as it did before.
 */
export function orderByFeedback<Row>(
  rows: Row[],
  feedback: FeedbackEvent[],
  preferences: LearnedPreference[],
  symbolOf: (row: Row) => SymbolCode,
): Row[] {
  return rows
    .map((row, index) => ({ row, index, delta: feedbackRankDelta(feedback, preferences, symbolOf(row)) }))
    .sort((first, second) => second.delta - first.delta || first.index - second.index)
    .map((entry) => entry.row);
}

function resolutionProposal(
  symbol: SymbolCode,
  resolution: CaseResolution,
  proposals: RuleProposal[],
): RuleProposal | undefined {
  return proposals.find((proposal) => proposal.symbol === symbol && proposal.sourceResolutionAt === resolution.resolvedAt);
}

function toFeedbackItem(feedback: FeedbackEvent, preferences: LearnedPreference[]): LearningItem {
  const preference = preferenceFor(feedback, preferences);
  const active = preference?.active ?? true;
  const copy = feedbackCopy[feedback.action];
  const target = feedbackTarget(feedback);
  return {
    id: `feedback-${feedback.id}`,
    kind: "feedback",
    createdAt: feedback.createdAt,
    symbol: feedback.symbol,
    inputLabel: copy.input,
    inputDetail: `Target: ${target}.`,
    targetLabel: target,
    status: active ? "active" : "inactive",
    statusLabel: active ? "Dipakai" : "Dinonaktifkan",
    learningLabel: preference?.label ?? copy.learned,
    learningDetail: preference?.explanation ?? "Masukan feedback memengaruhi urutan pemeriksaan, bukan fakta pasar.",
    effectLabel: active ? copy.effect : "Feedback ini tersimpan tetapi tidak memengaruhi prioritas karena preference dinonaktifkan.",
    steps: [
      { label: "Masukan dicatat", detail: `Feedback untuk ${target} disimpan.`, state: "complete", at: feedback.createdAt },
      { label: "Preference diperbarui", detail: preference ? preference.label : "Preference pasangan tidak ditemukan pada data lama.", state: preference ? "complete" : "skipped" },
      { label: "Dipakai pada prioritas", detail: active ? copy.effect : "Preference nonaktif; tidak dipakai pada prioritas.", state: active ? "current" : "skipped" },
    ],
    href: feedback.symbol ? `/cases/${feedback.symbol}` : "/cases",
  };
}

function toInsightItem(insight: UserInsight): LearningItem {
  const copy = insightStatusCopy[insight.status];
  const history = insight.reviewHistory.length ? insight.reviewHistory : [{ status: insight.status, at: insight.createdAt }];
  return {
    id: `insight-${insight.id}`,
    kind: "insight",
    createdAt: insight.createdAt,
    symbol: insight.symbol,
    inputLabel: insightCategoryCopy[insight.category],
    inputDetail: insight.note,
    targetLabel: `${insight.symbol}${insight.pillar ? ` · ${insight.pillar}` : ""}`,
    status: insight.status === "pending" ? "pending" : insight.status === "incorporated" ? "reviewed" : "dismissed",
    statusLabel: copy.label,
    learningLabel: copy.learning,
    learningDetail: "Catatan pengguna tidak menjadi fakta pasar sampai sumber memverifikasinya.",
    effectLabel: copy.effect,
    steps: [
      { label: "Catatan disimpan", detail: "Masukan disimpan untuk ticker terkait.", state: "complete", at: insight.createdAt },
      { label: "Hipotesis terbuka", detail: "Catatan menjadi pertanyaan pemeriksaan, bukan perubahan data dasar.", state: insight.status === "dismissed" ? "skipped" : "complete" },
      ...history.map((entry, index) => ({
        label: index === history.length - 1 ? copy.label : insightStatusCopy[entry.status].label,
        detail: insightStatusCopy[entry.status].effect,
        state: index === history.length - 1 ? "current" as const : "complete" as const,
        at: entry.at,
      })),
    ],
    href: `/cases/${insight.symbol}?tab=review`,
    sourceUrl: insight.sourceUrl,
  };
}

function toResolutionItem(symbol: SymbolCode, resolution: CaseResolution, proposal?: RuleProposal): LearningItem {
  const copy = proposal ? ruleStatusCopy(proposal.status) : {
    label: "Hasil tersimpan",
    learning: "Belum ada usulan aturan",
    effect: "Hasil kasus tersimpan sebagai memori riset, tetapi belum menghasilkan aturan yang dapat dipakai ulang.",
  };
  const status: LearningStatus = proposal?.status === "accepted"
    ? "accepted"
    : proposal?.status === "rejected"
      ? "rejected"
      : proposal
        ? "pending"
        : "stored";
  return {
    id: `resolution-${symbol}-${resolution.resolvedAt}`,
    kind: "resolution",
    createdAt: resolution.resolvedAt,
    symbol,
    inputLabel: "Hasil kasus disimpan",
    inputDetail: resolution.reusableRule,
    targetLabel: symbol,
    status,
    statusLabel: copy.label,
    learningLabel: copy.learning,
    learningDetail: proposal ? `Aturan: ${proposal.rule}` : "Selesaikan ulang kasus bila perlu membuat usulan aturan baru.",
    effectLabel: copy.effect,
    steps: [
      { label: "Hasil kasus disimpan", detail: `Kesimpulan ${symbol} dan aturan pakai ulang dicatat.`, state: "complete", at: resolution.resolvedAt },
      { label: "Usulan aturan dibuat", detail: proposal ? proposal.rule : "Tidak ada proposal yang dapat dihubungkan dengan hasil ini.", state: proposal ? "complete" : "skipped", at: proposal?.createdAt },
      { label: copy.label, detail: copy.effect, state: proposal?.status === "pending" ? "current" : proposal ? "complete" : "skipped" },
    ],
    href: `/cases/${symbol}?tab=review`,
  };
}

function toStandaloneRuleItem(proposal: RuleProposal): LearningItem {
  const copy = ruleStatusCopy(proposal.status);
  const status: LearningStatus = proposal.status === "accepted" ? "accepted" : proposal.status === "rejected" ? "rejected" : "pending";
  return {
    id: `rule-${proposal.id}`,
    kind: "resolution",
    createdAt: proposal.createdAt,
    symbol: proposal.symbol,
    inputLabel: "Usulan aturan tercatat",
    inputDetail: proposal.rule,
    targetLabel: proposal.symbol,
    status,
    statusLabel: copy.label,
    learningLabel: copy.learning,
    learningDetail: `Bukti hasil kasus: ${proposal.evidence}`,
    effectLabel: copy.effect,
    steps: [
      { label: "Usulan aturan dibuat", detail: proposal.rule, state: "complete", at: proposal.createdAt },
      { label: copy.label, detail: copy.effect, state: proposal.status === "pending" ? "current" : "complete" },
    ],
    href: "/cases?view=audit",
  };
}

function explicitMemory(playbook: InvestorResearchPlaybook): MemoryItem[] {
  const rows: MemoryItem[] = [];
  const textGroups: Array<{ key: keyof Pick<InvestorResearchPlaybook, "materialityRules" | "knownExposures" | "thesisAssumptions" | "trustedSources" | "falsifiers">; label: string }> = [
    { key: "materialityRules", label: "Aturan materialitas" },
    { key: "knownExposures", label: "Eksposur yang diketahui" },
    { key: "thesisAssumptions", label: "Asumsi tesis" },
    { key: "trustedSources", label: "Sumber tepercaya" },
    { key: "falsifiers", label: "Kondisi pembatal" },
  ];
  for (const group of textGroups) {
    playbook[group.key].filter(Boolean).forEach((value, index) => rows.push({
      id: `explicit-${group.key}-${index}`,
      group: "explicit",
      status: "explicit",
      label: group.label,
      detail: value,
      href: "/playbook",
    }));
  }
  Object.entries(playbook.preferredComparables).forEach(([symbol, comparables]) => {
    if (!comparables?.length) return;
    rows.push({
      id: `explicit-comparables-${symbol}`,
      group: "explicit",
      status: "explicit",
      label: `Pembanding ${symbol}`,
      detail: comparables.join(" · "),
      href: "/playbook",
    });
  });
  const thresholds = resolveThresholds(playbook);
  const changedThresholds = Object.entries(thresholds)
    .filter(([key, value]) => value !== DEFAULT_THRESHOLDS[key as keyof typeof DEFAULT_THRESHOLDS])
    .map(([key, value]) => `${key}: ${value}`);
  if (changedThresholds.length) rows.push({
    id: "explicit-thresholds",
    group: "explicit",
    status: "explicit",
    label: "Ambang penilaian",
    detail: changedThresholds.join(" · "),
    href: "/playbook",
  });
  return rows;
}

export function buildLearningSnapshot(input: LearningSnapshotInput): LearningSnapshot {
  const matchedProposalIds = new Set<string>();
  const resolutionItems = Object.entries(input.caseResolutions).flatMap(([symbol, resolution]) => {
    if (!resolution) return [];
    const proposal = resolutionProposal(symbol as SymbolCode, resolution, input.ruleProposals);
    if (proposal) matchedProposalIds.add(proposal.id);
    return [toResolutionItem(symbol as SymbolCode, resolution, proposal)];
  });
  const items = [
    ...input.feedback.map((feedback) => toFeedbackItem(feedback, input.preferences)),
    ...input.insights.map(toInsightItem),
    ...resolutionItems,
    ...input.ruleProposals.filter((proposal) => !matchedProposalIds.has(proposal.id)).map(toStandaloneRuleItem),
  ].sort((first, second) => Date.parse(second.createdAt) - Date.parse(first.createdAt) || first.id.localeCompare(second.id));

  const feedbackMemories = input.feedback
    .map((feedback) => ({ feedback, preference: preferenceFor(feedback, input.preferences) }))
    .filter(({ preference }) => preference?.active ?? true)
    .map(({ feedback, preference }) => ({
      id: `memory-feedback-${feedback.id}`,
      group: "feedback" as const,
      status: "active" as const,
      label: preference?.label ?? feedbackCopy[feedback.action].learned,
      detail: `Dari feedback: ${feedbackTarget(feedback)}.`,
      href: feedback.symbol ? `/cases/${feedback.symbol}` : "/cases",
    }));
  const insightMemories = input.insights
    .filter((insight) => insight.status !== "dismissed")
    .map((insight) => ({
      id: `memory-insight-${insight.id}`,
      group: "insight" as const,
      status: insight.status === "pending" ? "pending" as const : "reviewed" as const,
      label: `Hipotesis ${insight.symbol}`,
      detail: insight.note,
      href: `/cases/${insight.symbol}?tab=review`,
    }));
  const ruleMemories = input.ruleProposals
    .filter((proposal) => proposal.status === "accepted")
    .map((proposal) => ({
      id: `memory-rule-${proposal.id}`,
      group: "rule" as const,
      status: "accepted" as const,
      label: `Aturan ${proposal.symbol}`,
      detail: proposal.rule,
      href: "/cases?view=audit",
    }));
  const explicit = explicitMemory(input.playbook);
  const memories = [...feedbackMemories, ...insightMemories, ...ruleMemories, ...explicit];

  return {
    items,
    memories,
    summary: {
      inputCount: input.feedback.length + input.insights.length + Object.values(input.caseResolutions).filter(Boolean).length,
      pendingCount: input.insights.filter((insight) => insight.status === "pending").length + input.ruleProposals.filter((proposal) => proposal.status === "pending").length,
      activeCount: feedbackMemories.length + insightMemories.length + ruleMemories.length,
      explicitCount: explicit.length,
    },
  };
}

export function formatLearningTime(value: string | undefined): string {
  if (!value) return "Waktu tidak tersedia";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "Waktu tidak tersedia";
  return new Intl.DateTimeFormat("id-ID", { dateStyle: "medium", timeStyle: "short" }).format(date);
}

/**
 * The timeline's own view model.
 *
 * Everything below is derived from `LearningItem[]` — the facets, their
 * counts, and the day headings. A hand-kept list of tickers would go stale the
 * moment a reader teaches a symbol nobody anticipated, and a hand-kept count
 * would disagree with the rows underneath it.
 */
export interface LearningDay {
  key: string;
  label: string;
  items: LearningItem[];
}

export interface LearningFacet {
  symbol: SymbolCode;
  count: number;
}

/** Tickers that actually appear in the trace, busiest first, then alphabetical. */
export function learningFacets(items: LearningItem[]): LearningFacet[] {
  const counts = new Map<SymbolCode, number>();
  for (const item of items) {
    if (!item.symbol) continue;
    counts.set(item.symbol, (counts.get(item.symbol) ?? 0) + 1);
  }
  return [...counts.entries()]
    .map(([symbol, count]) => ({ symbol, count }))
    .sort((first, second) => second.count - first.count || first.symbol.localeCompare(second.symbol));
}

export function filterLearningItems(
  items: LearningItem[],
  { kind, symbol }: { kind: LearningFilter; symbol?: SymbolCode },
): LearningItem[] {
  return items.filter((item) => (kind === "all" || item.kind === kind) && (!symbol || item.symbol === symbol));
}

const dayFormatter = new Intl.DateTimeFormat("id-ID", { dateStyle: "full" });

/** Calendar day in the reader's own timezone, so a heading never splits an evening in two. */
function dayKey(value: string): string {
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "";
  return `${date.getFullYear()}-${date.getMonth() + 1}-${date.getDate()}`;
}

export function groupLearningByDay(items: LearningItem[]): LearningDay[] {
  const days: LearningDay[] = [];
  for (const item of items) {
    const key = dayKey(item.createdAt);
    const label = key ? dayFormatter.format(new Date(item.createdAt)) : "Waktu tidak tersedia";
    const last = days[days.length - 1];
    if (last && last.key === key) last.items.push(item);
    else days.push({ key, label, items: [item] });
  }
  return days;
}

export function formatLearningClock(value: string | undefined): string {
  if (!value) return "--:--";
  const date = new Date(value);
  if (Number.isNaN(date.getTime())) return "--:--";
  return new Intl.DateTimeFormat("id-ID", { timeStyle: "short" }).format(date);
}
