// Wired: fixtures fallback + live Sectors when key present.
import { analysisFixtures, citations, companies, coverageInfo, DATA_AS_OF, DATA_AS_OF_LABEL, revenueSegments, WINDOW_SESSIONS } from "@/lib/data/fixtures";
import { budgetNoteFor, LlmBudgetError } from "@/lib/agent/llm/budget";
import { marketDataProvider, newsProvider } from "@/lib/data/providers";
import { assertSafeOutput, enforceCitations, safeLanguage } from "@/lib/agent/gates";
import { describeSignalStability } from "@/lib/agent/signal-history";
import { RESEARCH_LIFECYCLE } from "@/lib/agent/lifecycle";
import { defaultFocusFor, dimensionFromText, DIMENSION_LABELS, DIMENSION_OBSERVABLES, recordedFocusRanking } from "@/lib/agent/dimensions";
import {
  calculateConcentration,
  calculateMomentum,
  calculateVolumeSignal,
  detectFlowContradiction,
} from "@/lib/agent/metrics";
import type {
  AgentEngine,
  AnalysisContext,
  AnalysisCase,
  AppliedPlaybookRule,
  BusinessImpactDimension,
  BusinessImpactResult,
  CausalGraph,
  ChatAnswer,
  ChatRequest,
  Citation,
  EvidenceState,
  HypothesisTrace,
  ImpactDirection,
  MarketEvent,
  PillarResult,
  SymbolCode,
  UserInsight,
  UserProfile,
} from "@/lib/types";
import { EVENT_MARKER_LABEL } from "@/lib/types";
import { assessExposureWithLlm } from "@/lib/agent/llm/exposure";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { answerableFigures, describeCaseSources, explainFigure, matchFieldName, matchFigure, matchFigureWithStrength, METRIC_FORMULA, namesAMetric, phraseMatches } from "@/lib/agent/explain";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";
import { generateStructured } from "@/lib/agent/llm/client";
import { cheapModel, strongModel } from "@/lib/agent/llm/models";
import { agentMode } from "@/lib/agent/mode";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";
import { handlerScore, selectHandler, type HandlerId, type HandlerSignals } from "@/lib/agent/handlers";
import { mechanismLabelFor } from "@/lib/agent/mechanism-label";
import { uiLabel } from "@/lib/ui-labels";
import { withStop } from "@/lib/utils";
import { lruMemo } from "@/lib/agent/retrieval/memo";
import { answerCacheKey, readAnswerCache, writeAnswerCache } from "@/lib/agent/retrieval/answer-cache";
import { retrieveContext, type RetrievedContext } from "@/lib/agent/retrieval/bundle";
import { resolveFollowUp, type FollowUp } from "@/lib/agent/retrieval/follow-up";
import { unrecordedTickers } from "@/lib/agent/unknown-symbols";
import { SYMBOL_CODES } from "@/lib/data/symbols.generated";
import type { HistoryTurn } from "@/lib/agent/retrieval/types";
import { VIEW_IDS, type ViewId } from "@/lib/agent/retrieval/types";
import { resolveMetricGloss } from "@/lib/agent/llm/metric-gloss";
import { findSymbolsRobust, matchEventForQuestion, normalizeQuery } from "@/lib/agent/query";
import { deriveMissingEvidence } from "@/lib/evidence-gaps";
import { namesAThreshold, PILLAR_LABELS, DEFAULT_THRESHOLDS as _DEFAULTS, monthWindowLabel, OBSERVATION_WINDOWS, OUTCOME_RELEVANCE, RELEVANCE_BAND_SCORE, relevanceFloorFor as _relevanceFloorFor, resolveThresholds as _resolveThresholds, sessionWindowLabel } from "@/lib/agent/thresholds";
import { brokerChurnRatio, detectDistributionDivergence, netInstitutionalFlow } from "@/lib/agent/distribution";
import { detectContagionCandidates } from "@/lib/agent/contagion";
import { checkNarrativeAgainstFinancials } from "@/lib/agent/fundamental-check";
import { attributionMaterial, causalPathMaterial, compareMaterial, falsifierMaterial, playbookMaterial, statusMaterial } from "@/lib/agent/case-answers";

/**
 * A percentage in the one shape the reader sees everywhere: id-ID, one
 * decimal, and never a signed zero.
 *
 * Without a minimum the same value printed as `0%` here and `0,0,0%` there,
 * and a fraction small enough to round away (`-0.0004`) printed `-0%` — a
 * fall the recording never had. The sign stays ASCII because `displayFigure`
 * swaps it for a true minus at the render edge.
 */
const percent = (value: number, digits = 1) => {
  const formatter = new Intl.NumberFormat("id-ID", { style: "percent", minimumFractionDigits: digits, maximumFractionDigits: digits });
  const magnitude = formatter.format(Math.abs(value));
  return magnitude === formatter.format(0) ? formatter.format(0) : `${value < 0 ? "-" : ""}${magnitude}`;
};

/** A fixed-precision figure in id-ID, so a ratio reads like the percentages
 *  beside it. The verifier strips both separators, so the matcher is unaffected. */
const decimal = (value: number, digits: number) =>
  new Intl.NumberFormat("id-ID", { minimumFractionDigits: digits, maximumFractionDigits: digits }).format(value);

const compact = (value: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);

/** Window label derived from the recorded session count — never a literal. */
export const windowLabel = () => `${WINDOW_SESSIONS} hari bursa`;
const windowBaselineCount = () => Math.max(WINDOW_SESSIONS - 1, 1);

/** Materiality floor comes from the user's playbook, defaulting to the recorded baseline. */
export { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
export const DEFAULT_RELEVANCE_FLOOR = _DEFAULTS.relevanceFloor;
export const relevanceFloorFor = _relevanceFloorFor;

function uniqueCitations(values: Citation[]): Citation[] {
  return [...new Map(values.map((citation) => [citation.id, citation])).values()];
}

function median(values: number[]): number {
  const sorted = [...values].sort((a, b) => a - b);
  const middle = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? (sorted[middle - 1] + sorted[middle]) / 2 : sorted[middle];
}

function eventDirection(event: MarketEvent, symbol: SymbolCode) {
  return event.impactLinks.find((link) => link.symbol === symbol)?.direction ?? "Unverified";
}

function createTrace(symbol: SymbolCode, pillars: PillarResult[], relatedEvents: MarketEvent[]): HypothesisTrace[] {
  const concentration = pillars.find((pillar) => pillar.key === "concentration")!;
  const volume = pillars.find((pillar) => pillar.key === "volume")!;
  const momentum = pillars.find((pillar) => pillar.key === "momentum")!;
  return [
    {
      id: `${symbol}-h1`,
      hypothesis: "Gerak didukung konsentrasi partisipan yang dapat diverifikasi.",
      query: "Ringkasan broker, asal broker, arus asing, saham publik",
      verification: concentration.conflict ?? concentration.summary,
      outcome: concentration.conflict ? "challenged" : "supported",
      citations: concentration.citations,
    },
    {
      id: `${symbol}-h2`,
      hypothesis: `Aktivitas pasar menyimpang dari pembanding ${windowLabel()}.`,
      query: "Volume harian dan median/MAD",
      verification: volume.summary,
      outcome: volume.status === "Insufficient Data" ? "open" : volume.status === "Normal" ? "challenged" : "supported",
      citations: volume.citations,
    },
    {
      id: `${symbol}-h3`,
      hypothesis: "Gerak tidak cukup dijelaskan oleh IHSG atau sektor.",
      query: "Imbal hasil 3 hari, IHSG, beta, imbal hasil sektor",
      verification: momentum.summary,
      outcome: momentum.status === "Idiosyncratic" ? "supported" : "challenged",
      citations: momentum.citations,
    },
    {
      id: `${symbol}-h4`,
      hypothesis: "Peristiwa memiliki jalur dampak dan waktu yang relevan.",
      query: "Berita emiten, keterbukaan, aksi korporasi, data makro",
      verification: relatedEvents.length
        ? `${relatedEvents.length} peristiwa terhubung. Waktu dan jalur dampak diperiksa.`
        : `Tidak ada peristiwa terverifikasi dalam rekaman ${DATA_AS_OF_LABEL}.`,
      outcome: relatedEvents.length ? "supported" : "open",
      citations: uniqueCitations(relatedEvents.flatMap((event) => event.citations)),
    },
  ];
}

/** Labels and observables live in lib/agent/dimensions.ts so the workspace
 *  highlighter and the mandate parser read the same vocabulary. */
const impactLabels = DIMENSION_LABELS;
const impactObservables = DIMENSION_OBSERVABLES;

/**
 * Default focus comes from the recorded impact paths for this symbol — never
 * a sector table. See `defaultFocusFor` in lib/agent/dimensions.ts. Explicit
 * mandate keywords always win over the recorded default.
 */
function sectorDefaultFocus(symbol?: SymbolCode): BusinessImpactDimension {
  return defaultFocusFor(symbol);
}

function mandateFocus(mandate: string, symbol?: SymbolCode): BusinessImpactDimension {
  return explicitMandateFocus(mandate) ?? sectorDefaultFocus(symbol);
}

function explicitMandateFocus(mandate: string): BusinessImpactDimension | undefined {
  return dimensionFromText(mandate);
}

/**
 * Every dimension this case tests. A gate used to ask the reader to pick one
 * of these two before the case rendered anything; the pair is carried instead,
 * and every hypothesis, source line, observable and impact row still names the
 * dimension it came from, so a combined case stays attributable.
 */
function resolveFocuses(symbol: SymbolCode, mandate: string): BusinessImpactDimension[] {
  const inferred = explicitMandateFocus(mandate);
  const recordedDefault = sectorDefaultFocus(symbol);
  // The dimensions this symbol's recordings reach most, plus whatever the
  // mandate named. Ranking lives in lib/agent/dimensions.ts, never a table here.
  const ranked = recordedFocusRanking(symbol);
  return [inferred, recordedDefault, ...ranked]
    .filter((item): item is BusinessImpactDimension => Boolean(item))
    .filter((item, index, values) => values.indexOf(item) === index)
    .slice(0, _DEFAULTS.caseFocusCount);
}

function compilePlaybook(symbol: SymbolCode, context?: AnalysisContext): AppliedPlaybookRule[] {
  const playbook = context?.playbook;
  if (!playbook) return [];
  const forSymbol = (value: string) => value.toUpperCase().includes(symbol);
  const rules: AppliedPlaybookRule[] = [];
  const add = (kind: AppliedPlaybookRule["kind"], rule: string | undefined, effect: string, approved = false) => {
    if (rule) rules.push({ id: `${symbol}-${kind}-${rules.length + 1}`, kind, rule, effect, ...(approved ? { approved: true } : {}) });
  };
  const isOwn = (rule: string) => rule.startsWith(`[Hasil ${symbol}]`) || rule.startsWith(`[Disetujui ${symbol}]`);
  // Approved first, for the same reason `addSymbolRule` below puts them
  // first: `materialityRule` takes the first materiality entry and the audit
  // panel takes the first rows, so a rule `setRuleProposalStatus` appends to
  // the end of the list could never be seen or used — approving it changed
  // the record and nothing on screen.
  const materiality = playbook.materialityRules.filter((rule) => (!rule.startsWith("[Hasil ") && !rule.startsWith("[Disetujui ")) || isOwn(rule));
  materiality.filter(isOwn).forEach((rule) => add("materiality", rule, "Menggunakan kembali aturan yang disetujui dari hasil kasus ini.", true));
  materiality.filter((rule) => !isOwn(rule)).forEach((rule) => add("materiality", rule, "Menentukan apakah pemicu layak membuka dan menaikkan prioritas kasus."));
  // Aturan yang disetujui ([Disetujui SYMBOL]) harus menang atas bawaan:
  // .find() mengembalikan bawaan pertama sehingga aturan baru yang di-append
  // tidak pernah terpakai. Tambahkan yang disetujui dulu, lalu bawaan.
  const addSymbolRule = (
    kind: AppliedPlaybookRule["kind"],
    list: string[],
    effect: string,
    approvedEffect: string,
  ) => {
    const approved = list.filter(
      (rule) => rule.startsWith(`[Disetujui ${symbol}]`) || rule.startsWith(`[Hasil ${symbol}]`),
    );
    approved.forEach((rule) => add(kind, rule, approvedEffect, true));
    const baseline = list.find((rule) => forSymbol(rule) && !approved.includes(rule));
    if (baseline) add(kind, baseline, effect);
  };
  addSymbolRule("exposure", playbook.knownExposures, "Membatasi jalur sebab akibat pada eksposur yang sudah dinyatakan pengguna.", "Menggunakan kembali eksposur yang disetujui dari hasil kasus ini.");
  addSymbolRule("assumption", playbook.thesisAssumptions, "Menjadi asumsi yang harus tetap benar selama kasus terbuka.", "Menggunakan kembali asumsi yang disetujui dari hasil kasus ini.");
  add("source", playbook.trustedSources[0], "Menempatkan sumber ini pada urutan pertama rencana sumber.");
  addSymbolRule("falsifier", playbook.falsifiers, "Menjadi kondisi pembatal hipotesis yang dapat diperiksa.", "Menggunakan kembali kondisi pembatal yang disetujui dari hasil kasus ini.");
  const comparables = playbook.preferredComparables[symbol];
  add("comparable", comparables?.length ? comparables.join(" · ") : undefined, "Menetapkan pembanding yang dipakai saat menguji materialitas relatif.");
  return rules;
}

function createResearchPlan(
  symbol: SymbolCode,
  mandate: string,
  pillars: PillarResult[],
  focusOverride?: BusinessImpactDimension[],
  context?: AnalysisContext,
) {
  const focuses = focusOverride?.length ? focusOverride : [mandateFocus(mandate, symbol)];
  const labelOf = (focus: BusinessImpactDimension) => impactLabels[focus].toLowerCase();
  const observableOf = (focus: BusinessImpactDimension) => impactObservables[focus].toLowerCase();
  const focusList = focuses.map(labelOf).join(" dan ");
  // A playbook source is a sentence the reader typed, so it often ends in a
  // full stop. The source line appends its own clause; without this the panel
  // prints "…berita sekunder.: uji margin operasi".
  const trustedSource = (context?.playbook?.trustedSources[0] ?? "Data perusahaan Sectors dan keterbukaan emiten").replace(/[.\s]+$/, "");
  const falsifier = context?.playbook?.falsifiers.find((item) => item.toUpperCase().includes(symbol))
    ?? `${focusList} tidak bergerak sesuai jalur pada jendela observasi.`;
  const unique = (values: string[]) => values.filter((item, index) => values.indexOf(item) === index);
  return {
    mandate,
    focuses,
    rationale: `Pertanyaan menguji ${focusList}. Catalyst menyusun hipotesis, sumber, dan indikator untuk setiap fokus tanpa mengubah data dasar.`,
    hypothesisTree: [
      ...focuses.map((focus) => ({
        id: `${symbol}-plan-primary-${focus}`,
        claim: `Pemicu mengubah ${labelOf(focus)} ${symbol}.`,
        test: `Cari perubahan pada ${observableOf(focus)}.`,
        state: "primary" as const,
      })),
      { id: `${symbol}-plan-support`, claim: "Arus, volume, dan momentum bergerak setelah pemicu.", test: pillars.map((pillar) => pillar.label).join(" → "), state: "supporting" as const },
      { id: `${symbol}-plan-challenge`, claim: "Penjelasan lain lebih kuat daripada pemicu utama.", test: falsifier, state: "challenge" as const },
    ],
    observables: [
      ...focuses.map((focus) => ({
        dimension: focus,
        metric: impactObservables[focus],
        expectedChange: `Bergerak konsisten dengan arah pemicu pada ${symbol}.`,
        window: focus === "valuation" ? monthWindowLabel(OBSERVATION_WINDOWS.valuationMonths) : sessionWindowLabel(OBSERVATION_WINDOWS.defaultSessions),
      })),
      ...(focuses.includes("volume") ? [] : [{ dimension: "volume" as const, metric: impactObservables.volume, expectedChange: "Mengonfirmasi bahwa perubahan mencapai aktivitas operasional.", window: sessionWindowLabel(OBSERVATION_WINDOWS.defaultSessions) }]),
    ],
    sourcePlan: unique([
      ...focuses.map((focus) => `${trustedSource}: uji ${labelOf(focus)} dan periode pembanding.`),
      `Data harian dan broker Sectors: pastikan perubahan terjadi setelah pemicu.`,
      ...focuses.map((focus) => `Keterbukaan emiten: periksa ${observableOf(focus)}.`),
      `Pembanding sektor: pisahkan perubahan perusahaan dari faktor pasar yang sama.`,
    ]),
    closingGate: `Fokus aktif: ${focusList}. Sebelum menutup kasus, pastikan perubahan penting dan jendela pengamatan sudah ditentukan.`,
  };
}

function createBusinessImpact(
  focuses: BusinessImpactDimension[],
  symbol: SymbolCode,
  citations: Citation[],
): BusinessImpactResult[] {
  const dimensions: BusinessImpactDimension[] = ["volume", "pricing", "margin", "cash-flow", "balance-sheet", "valuation"];
  return dimensions.map((dimension) => ({
    dimension,
    label: impactLabels[dimension],
    status: focuses.includes(dimension) ? "Primary test" : ["volume", "pricing"].includes(dimension) ? "Supporting" : "Open",
    mechanism: focuses.includes(dimension)
      ? `Pertanyaan meminta jalur pemicu diterjemahkan langsung ke ${impactLabels[dimension].toLowerCase()}.`
      : `Uji apakah jalur utama ${symbol} mencapai ${impactLabels[dimension].toLowerCase()}.`,
    observable: impactObservables[dimension],
    implication: `Kasus belum selesai sampai perubahan ${impactLabels[dimension].toLowerCase()} dinyatakan mendukung, berlawanan, atau belum teruji.`,
    citations,
  }));
}

function createResearchDisposition(
  evidenceState: EvidenceState,
  materiality: "High" | "Medium" | "Low",
  primaryImpact: BusinessImpactResult,
  contradictions: string[],
) {
  const kind = materiality === "Low"
    ? "dismiss" as const
    : evidenceState === "Corroborated" && materiality === "High" && contradictions.length === 0
      ? "escalate" as const
      : "monitor" as const;
  const labels = { escalate: "Lanjutkan riset", monitor: "Pantau indikator", dismiss: "Abaikan pemicu" } as const;
  const reason = kind === "escalate"
    ? `Perubahan material memiliki bukti lintas lapisan dan perlu diperiksa lebih lanjut pada ${primaryImpact.label.toLowerCase()}.`
    : kind === "monitor"
      ? `Penjelasan belum cukup kuat. Tunggu ${primaryImpact.observable.toLowerCase()}.`
      : "Pemicu tidak melewati batas materialitas dan tidak perlu membuka pemeriksaan aktif.";
  return {
    kind,
    label: labels[kind],
    reason,
    monitorObservable: primaryImpact.observable,
    reopenWhen: `Buka kembali bila ${primaryImpact.observable.toLowerCase()} berubah atau bukti penyangkal utama tidak lagi berlaku.`,
  };
}

/**
 * Cases, kept for as long as the recordings behind them stay the same.
 *
 * `buildAnalysis` is synchronous and was rebuilt in full on every request —
 * twice per comparison. Nothing about it depends on the request beyond the
 * symbol and the watchlist, so the work was pure repetition.
 *
 * No GCS layer sits behind this. A round trip to object storage costs more
 * than recomputing a synchronous function, so a remote cache here would be a
 * pessimisation wearing an optimisation's name.
 */
const analysisMemo = lruMemo<string, AnalysisCase | null>(_DEFAULTS.retrievalMemoMaxEntries);

function buildAnalysis(symbol: SymbolCode, profile: UserProfile, context?: AnalysisContext): AnalysisCase | null {
  // A context carries user notes and a playbook, both of which change the
  // result. Those requests skip the memo rather than poisoning it for the
  // requests that carry neither.
  if (context) return buildAnalysisUncached(symbol, profile, context);
  const key = `${symbol}|${DATA_AS_OF}|${[...profile.watchlist].sort().join(",")}`;
  if (analysisMemo.has(key)) return analysisMemo.get(key) ?? null;
  const built = buildAnalysisUncached(symbol, profile);
  analysisMemo.set(key, built);
  return built;
}

function buildAnalysisUncached(symbol: SymbolCode, profile: UserProfile, context?: AnalysisContext): AnalysisCase | null {
  const company = marketDataProvider.getCompany(symbol);
  const fixture = analysisFixtures[symbol];
  if (!company || !fixture) return null;

  // User notes stay separate from recorded evidence. They surface as open
  // hypotheses in the case, never as metrics, citations, or market facts.
  const userNotes = relevantInsights(context?.userInsights, symbol);
  const thresholds = _resolveThresholds(context?.playbook);
  const series = fixture.priceSeries;
  const brokerEvidence = fixture.broker;
  const buyerValues = brokerEvidence.buyers.map((row) => row.value);
  const concentration = calculateConcentration(
    buyerValues,
    { netForeign: brokerEvidence.netForeign, totalMarketValue: brokerEvidence.totalMarketValue },
    { freeFloatShares: brokerEvidence.freeFloatShares, referencePrice: brokerEvidence.referencePrice },
  );
  const totalBuyValue = buyerValues.reduce((total, value) => total + value, 0);
  const topBuyerValue = buyerValues.length ? Math.max(...buyerValues) : 0;
  const foreignParticipantValue = brokerEvidence.buyers
    .filter((row) => row.origin === "foreign")
    .reduce((total, row) => total + row.value, 0);
  const foreignParticipantShare = foreignParticipantValue / buyerValues.reduce((total, value) => total + value, 0);
  const conflict = detectFlowContradiction(foreignParticipantShare, brokerEvidence.netForeign, thresholds.foreignContradictionShare);
  // Task 6: distribusi institusional dihitung di samping blok concentration.
  // C4: metrik baru hanya diemisikan bila institutionalFlows.length > 0 —
  // jangan pernah menambahkannya tanpa syarat (14 simbol tanpa filings akan 500 via enforceCitations).
  const flows = fixture.institutionalFlows ?? [];
  const windowStart = series[0]?.date;
  const windowEnd = series.at(-1)?.date;
  const netFlow = netInstitutionalFlow(flows, { windowStart, windowEnd, referencePrice: brokerEvidence.referencePrice });
  const churnRows = brokerChurnRatio(brokerEvidence);
  const topChurn = churnRows[0];

  const currentPoint = series.at(-1)!;
  const baseline = series.slice(0, -1).map((point) => point.volume);
  const baselineMedian = median(baseline);
  const baselineMad = median(baseline.map((value) => Math.abs(value - baselineMedian)));
  const medianDailyValue = baseline[Math.floor(baseline.length / 2)] * currentPoint.close;
  const volume = calculateVolumeSignal(baseline, currentPoint.volume, medianDailyValue / 1e9, {
    elevated: thresholds.volumeZFloor,
    extreme: thresholds.volumeExtremeFloor,
  });

  const stability = describeSignalStability(series, {
    elevated: thresholds.volumeZFloor,
    extreme: thresholds.volumeExtremeFloor,
  });

  const startPoint = series.at(-4)!;
  const stockReturn = currentPoint.close / startPoint.close - 1;
  const marketReturn = currentPoint.ihsg / startPoint.ihsg - 1;
  const momentum = calculateMomentum(stockReturn, marketReturn, fixture.beta, fixture.sectorReturn, {
    aligned: thresholds.momentumAlignedFloor,
    sector: thresholds.momentumSectorFloor,
    idiosyncratic: thresholds.momentumIdiosyncraticFloor,
  });
  const divergent = flows.length > 0 && detectDistributionDivergence({
    priceReturn: stockReturn,
    netValue: netFlow.netValue,
    floor: thresholds.distributionValueFloor,
  });
  // Task 7/8: kandidat penularan untuk tanggal terbaru (falsifiable question, bukan vonis).
  const priceSeriesBySymbol = Object.fromEntries(
    Object.entries(analysisFixtures).map(([s, f]) => [s, f.priceSeries]),
  );
  const contagionCandidates = detectContagionCandidates({
    symbol,
    date: series.at(-1)?.date ?? "",
    priceSeriesBySymbol,
    events: newsProvider.listEvents(),
    getSubsector: (s) => marketDataProvider.getCompany(s)?.subsector,
    playbook: context?.playbook,
    thresholds: {
      contagionDropFloor: thresholds.contagionDropFloor,
      contagionCorrelationFloor: thresholds.contagionCorrelationFloor,
    },
  });
  const lastDrop = series.length >= 2 ? series.at(-1)!.close / series.at(-2)!.close - 1 : 0;
  const hasLinkedOnDrop = (() => {
    const d = series.at(-1)?.date ?? "";
    const d1 = series.length >= 2 ? series.at(-2)?.date : undefined;
    const linked = new Set(
      newsProvider.listEvents()
        .filter((e) => e.impactLinks.some((l) => l.symbol === symbol))
        .map((e) => e.publishedAt.slice(0, 10)),
    );
    return linked.has(d) || (d1 ? linked.has(d1) : false);
  })();
  const unexplainedDrop = lastDrop <= -Math.abs(thresholds.contagionDropFloor) && !hasLinkedOnDrop;
  const relatedEvents = fixture.catalystEventIds
    .map((id) => newsProvider.getEvent(id))
    .filter((event): event is MarketEvent => Boolean(event))
    // Primary = strongest link first, newest breaks ties. Materiality is
    // defined by the relevance floor, so the event that decides it must be
    // the relevance leader — not merely the newest. Recency stays visible via
    // publishedAt and the timeline; it must not let a fresh low-relevance
    // aggregate demote a stronger recorded trigger.
    .sort((a, b) => {
      const ra = a.impactLinks.find((link) => link.symbol === symbol)?.relevance ?? 0;
      const rb = b.impactLinks.find((link) => link.symbol === symbol)?.relevance ?? 0;
      return rb - ra || b.publishedAt.localeCompare(a.publishedAt);
    });
  const primaryEvent = relatedEvents[0];
  const catalystDirection = primaryEvent ? eventDirection(primaryEvent, symbol) : "Unverified";

  /**
   * Citations are per figure, not per card.
   *
   * These used to be four arrays pasted onto every metric in their pillar, so
   * "Porsi peserta teratas" advertised 4 sumber when one recording — the
   * ranked broker summary — produces it, and the chip named three sources
   * that had nothing to do with the number. On a page about listed equities
   * an inflated source count is worse than none: it invites a reader to trust
   * a figure because it looks corroborated. Each metric below names only the
   * recordings its own arithmetic reads, traced through
   * `scripts/build_market_data.py`.
   *
   * The pillar keeps the union, because the pillar-level claim really does
   * rest on all of them — the concentration conflict check is the reason the
   * broker registry is here at all.
   */
  const brokerCitations = [citations.broker(symbol)];
  const topShareCitations = brokerCitations;
  const foreignShareCitations = [citations.foreign(symbol), citations.daily(symbol)];
  const floatAbsorbedCitations = [citations.broker(symbol), citations.freeFloat, citations.overview(symbol), citations.daily(symbol)];
  const originCitations = [citations.broker(symbol), citations.registry];
  const concentrationCitations = uniqueCitations([...topShareCitations, ...foreignShareCitations, ...floatAbsorbedCitations, ...originCitations]);
  const dailyCitations = [citations.daily(symbol)];
  const ihsgCitations = [citations.ihsg];
  const betaCitations = [citations.daily(symbol), citations.ihsg];
  const sectorReturnCitations = [citations.sectorPeers(company.sector), citations.sectorWeights(company.sector)];
  const momentumCitations = uniqueCitations([...dailyCitations, ...ihsgCitations, ...sectorReturnCitations]);
  const catalystCitations = uniqueCitations(relatedEvents.flatMap((event) => event.citations));

  const pillars: PillarResult[] = [
    {
      key: "concentration", label: "Konsentrasi",
      status: conflict ? "Source Conflict" : concentration.topBuyerShare >= thresholds.concentrationFloor ? "Concentrated Flow" : "Broad Participation",
      summary: conflict
        ? "Asal partisipan dominan tidak searah dengan arus asing agregat. Kesimpulan konsentrasi ditahan."
        : `${percent(concentration.topBuyerShare)} nilai partisipasi sisi akumulasi berasal dari peserta teratas.`,
      conflict: conflict ? "Partisipan berlabel asing dominan, sementara arus asing agregat bernilai negatif." : undefined,
      protocol: {
        claim: "Perubahan didukung konsentrasi partisipasi yang konsisten pada ringkasan broker, asal broker, dan arus asing.",
        supportingEvidence: `${percent(concentration.topBuyerShare)} nilai sisi akumulasi berasal dari peserta teratas; HHI ${decimal(concentration.hhi, 3)}.`,
        challengingEvidence: conflict ? "Asal partisipan dominan berlawanan dengan arus asing agregat." : "Konsentrasi belum membuktikan identitas, motif, atau keberlanjutan partisipan.",
        insufficientWhen: "Ringkasan broker, asal broker, arus asing, atau saham publik tidak tersedia pada jendela yang sama.",
        nextQuestion: "Apakah konsentrasi dan arus asing tetap searah setelah pemicu melewati jendela pengamatan?",
      },
      metrics: [
        { label: "Porsi peserta teratas", value: percent(concentration.topBuyerShare), citations: topShareCitations },
        { label: "HHI", value: decimal(concentration.hhi, 3), citations: topShareCitations },
        { label: "Peserta efektif", value: decimal(concentration.effectiveBuyers, 1), citations: topShareCitations },
        { label: "Porsi asing", value: percent(concentration.foreignShare), citations: foreignShareCitations },
        { label: "Saham publik terserap", value: percent(concentration.floatAbsorbed, 2), citations: floatAbsorbedCitations },
      ], citations: concentrationCitations,
      calculation: {
        name: "Konsentrasi partisipan",
        formula: "HHI = Σsᵢ²; partisipan efektif = 1 / HHI; saham publik terserap = Σ nilai akumulasi / (saham publik × harga referensi)",
        // One named segment per tile above, because the card reads them back
        // that way: a segment that names no figure, or names one the row does
        // not carry, leaves that tile with a formula and no numbers under it.
        substitution: [
          `Porsi peserta teratas = ${compact(topBuyerValue)} / ${compact(totalBuyValue)}`,
          `HHI = ${buyerValues.map((value) => `(${compact(value)}/${compact(totalBuyValue)})²`).join(" + ")}`,
          `Peserta efektif = 1 / ${decimal(concentration.hhi, 3)}`,
          `Porsi asing = ${compact(brokerEvidence.netForeign)} / ${compact(brokerEvidence.totalMarketValue)}`,
          `Saham publik terserap = ${compact(totalBuyValue)} / (${compact(brokerEvidence.freeFloatShares)} × ${compact(brokerEvidence.referencePrice)})`,
        ].join("; "),
        result: `HHI ${decimal(concentration.hhi, 3)} · ${decimal(concentration.effectiveBuyers, 1)} partisipan efektif · ${percent(concentration.floatAbsorbed, 2)} saham publik`,
        notes: ["Porsi dihitung dari nilai sisi akumulasi pada jendela rekaman.", "Asal broker diperiksa silang dengan arus asing agregat.", "Konflik sumber menahan kesimpulan meski konsentrasi terlihat tinggi."],
      },
    },
    {
      key: "volume", label: "Volume", status: volume.status,
      summary: volume.robustZ === null
        ? "Likuiditas atau pembanding tidak cukup untuk mengelompokkan anomali."
        : `Volume terakhir memiliki skor z tahan pencilan ${decimal(volume.robustZ, 2)} terhadap pembanding ${windowLabel()}.`,
      protocol: {
        claim: "Aktivitas setelah pemicu menyimpang dari pembanding volume yang kuat terhadap pencilan.",
        supportingEvidence: volume.robustZ === null ? "Belum ada sinyal yang lolos batas." : `Skor z tahan pencilan ${decimal(volume.robustZ, 2)} dengan status ${volume.status === "Normal" ? "normal" : volume.status === "Elevated" ? "meningkat" : "ekstrem"}.`,
        challengingEvidence: volume.status === "Normal" ? "Volume masih berada dalam rentang pembanding." : "Kenaikan volume sendiri tidak mengidentifikasi penyebab atau arah eksposur.",
        insufficientWhen: `Pembanding kurang dari ${_DEFAULTS.comparatorMinObservations} pengamatan, MAD nol, atau median nilai harian di bawah batas likuiditas.`,
        nextQuestion: "Apakah anomali volume bertahan dan muncul setelah pemicu?",
      },
      metrics: [
        { label: "Skor z tahan pencilan", value: volume.robustZ === null ? "Belum tersedia" : decimal(volume.robustZ, 2), citations: dailyCitations },
        { label: "Volume terbaru", value: compact(currentPoint.volume), citations: dailyCitations },
        { label: "Pembanding", value: windowLabel(), citations: dailyCitations },
      ], citations: dailyCitations,
      calculation: {
        name: "Anomali volume tahan pencilan",
        formula: `robust z = 0,6745 × (Vₜ − median(Vₙ)) / MAD(Vₙ), n = ${windowBaselineCount()} sesi pembanding`,
        substitution: `0,6745 × (${compact(currentPoint.volume)} − ${compact(baselineMedian)}) / ${compact(baselineMad)}`,
        result: volume.robustZ === null ? "Data belum cukup" : `${decimal(volume.robustZ, 2)} · ${volume.status === "Normal" ? "Normal" : volume.status === "Elevated" ? "Meningkat" : "Ekstrem"}`,
        notes: [`Pembanding memakai ${windowBaselineCount()} pengamatan sebelum hari terbaru dalam rekaman ${windowLabel()}.`, "Batas likuiditas minimum Rp10 miliar median nilai harian.", "MAD nol atau pembanding pendek menghasilkan data belum cukup."],
      },
    },
    {
      key: "momentum", label: "Momentum", status: momentum.status,
      summary: `Imbal hasil 3 hari ${percent(stockReturn)}; gerak di luar IHSG ${percent(momentum.residual)}.`,
      protocol: {
        claim: "Perubahan harga tidak cukup dijelaskan oleh IHSG atau pergerakan sektor pada jendela yang sama.",
        supportingEvidence: `Residual setelah penyesuaian beta ${percent(momentum.residual)}; imbal hasil saham ${percent(stockReturn)} dibanding sektor ${percent(fixture.sectorReturn)}.`,
        challengingEvidence: momentum.status === "Idiosyncratic" ? "Beta rekaman dan jendela tiga hari belum mengisolasi seluruh faktor pasar." : "Penjelasan pasar atau sektor masih relevan.",
        insufficientWhen: "Harga penutupan, IHSG, beta, atau pembanding sektor tidak tersedia untuk jendela yang sama.",
        nextQuestion: "Apakah gerak di luar IHSG (residual) tetap terlihat pada jendela lain, tanpa bergantung pada satu hari ekstrem?",
      },
      metrics: [
        { label: "Imbal hasil 3 hari", value: percent(stockReturn), citations: dailyCitations },
        { label: "Imbal hasil IHSG", value: percent(marketReturn), citations: ihsgCitations },
        { label: "Residual setelah beta", value: percent(momentum.residual), citations: betaCitations },
        { label: "Imbal hasil sektor", value: percent(fixture.sectorReturn), citations: sectorReturnCitations },
      ], citations: momentumCitations,
      calculation: {
        name: "Momentum relatif pasar",
        formula: "residual₃ᴅ = return saham₃ᴅ − β × return IHSG₃ᴅ",
        substitution: `${percent(stockReturn)} − ${decimal(fixture.beta, 2)} × ${percent(marketReturn)}`,
        result: `${percent(momentum.residual)} · ${momentum.status === "Market-aligned" ? "Mengikuti pasar" : momentum.status === "Sector-led" ? "Dipengaruhi sektor" : momentum.status === "Idiosyncratic" ? "Khusus emiten" : "Bercampur"}; pembanding sektor ${percent(fixture.sectorReturn)}`,
        notes: ["Imbal hasil dihitung dari harga penutupan tiga hari bursa.", "Beta dihitung dari data rekaman dan tidak dihitung ulang oleh asisten.", "Status sektor membandingkan selisih imbal hasil saham terhadap sektor."],
      },
    },
    {
      key: "catalyst", label: "Katalis", status: catalystDirection,
      summary: primaryEvent
        // The headline is the source's own sentence and may already end in a
        // full stop; appending one printed "…tensions.. Jalur utama:".
        ? `${withStop(primaryEvent.title)} Jalur utama: ${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.path ?? "Belum terverifikasi"}.`
        : "Belum ada peristiwa dengan jalur dampak terverifikasi.",
      protocol: {
        claim: "Pemicu mendahului perubahan dan memiliki jalur eksposur emiten yang dapat diuji.",
        supportingEvidence: primaryEvent ? `${relatedEvents.length} masukan terhubung; jalur utama ${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.path ?? "belum lengkap"}.` : "Belum ada masukan terhubung.",
        challengingEvidence: primaryEvent ? "Waktu dan jalur eksposur belum membuktikan sebab akibat tanpa indikator operasional berikutnya." : `Tidak ada pemicu terverifikasi dalam rekaman ${DATA_AS_OF_LABEL}.`,
        insufficientWhen: "Sumber, waktu publikasi, eksposur emiten, atau indikator yang diharapkan tidak dapat diperiksa.",
        nextQuestion: "Indikator operasional atau keuangan apa yang harus muncul, dan kapan, bila jalur ini benar?",
      },
      metrics: [
        { label: "Peristiwa terhubung", value: String(relatedEvents.length), citations: catalystCitations.length ? catalystCitations : [citations.empty(symbol)] },
        { label: "Arah utama", value: catalystDirection === "Supported" ? "Mendukung" : catalystDirection === "Adverse" ? "Berlawanan" : catalystDirection === "Mixed" ? "Bercampur" : "Belum terverifikasi", citations: catalystCitations.length ? catalystCitations : [citations.empty(symbol)] },
        // Already quoted in the case prose as "Relevansi eksposur 90/100" and
        // drawn on the causal chain as "90/100", but it existed nowhere the
        // assistant could find it. It is a Catalyst rank, not a provider
        // score, and its gloss says so.
        {
          label: "Relevansi eksposur",
          value: primaryEvent
            ? `${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.relevance ?? 0}/100`
            : "Belum tersedia",
          detail: `ambang ${thresholds.relevanceFloor}`,
          citations: catalystCitations.length ? catalystCitations : [citations.empty(symbol)],
        },
      ], citations: catalystCitations.length ? catalystCitations : [citations.empty(symbol)],
      calculation: {
        name: "Uji jalur katalis",
        formula: "status = sumber teridentifikasi ∩ eksposur tersedia ∩ waktu diperiksa ∩ jalur sebab akibat dapat diuji",
        substitution: `${relatedEvents.length} peristiwa → ${relatedEvents.filter((event) => event.impactLinks.some((link) => link.symbol === symbol)).length} jalur ke ${symbol} → arah utama ${catalystDirection === "Supported" ? "mendukung" : catalystDirection === "Adverse" ? "berlawanan" : catalystDirection === "Mixed" ? "bercampur" : "belum terverifikasi"}`,
        result: catalystDirection === "Supported" ? "Mendukung" : catalystDirection === "Adverse" ? "Berlawanan" : catalystDirection === "Mixed" ? "Bercampur" : "Belum terverifikasi",
        notes: ["Pilar ini memakai aturan keputusan, bukan skor sentimen tersembunyi.", "Peristiwa yang hanya melaporkan gerak tidak dianggap penyebab.", "Cuaca, kebijakan, komoditas, keterbukaan, dan makro tetap memerlukan jalur eksposur emiten."],
      },
    },
  ];

  // Task 6 + C4: metrik distribusi hanya bila ada filings terekam.
  {
    const conc = pillars.find((p) => p.key === "concentration")!;
    if (flows.length > 0) {
      const filingCites = uniqueCitations(flows.map((f) => citations.filing(symbol, f.source || undefined)));
      const fmtIdr = (v: number) => {
        const abs = Math.abs(v);
        const sign = v < 0 ? "-" : "";
        if (abs >= 1e12) return `${sign}Rp${(abs / 1e12).toLocaleString("id-ID", { maximumFractionDigits: 1 })}T`;
        if (abs >= 1e9) return `${sign}Rp${(abs / 1e9).toLocaleString("id-ID", { maximumFractionDigits: 1 })}M`;
        if (abs >= 1e6) return `${sign}Rp${(abs / 1e6).toLocaleString("id-ID", { maximumFractionDigits: 1 })}jt`;
        return `${sign}Rp${abs.toLocaleString("id-ID")}`;
      };
      const topHolder = netFlow.topHolders[0];
      conc.metrics.push(
        { label: "Aliran institusi bersih", value: fmtIdr(netFlow.netValue), citations: filingCites },
        {
          label: "Pemegang terbesar berubah",
          value: topHolder ? `${topHolder.holderName.slice(0, 32)} · ${compact(topHolder.netShares)} lbr` : "Tidak ada",
          citations: topHolder ? [citations.filing(symbol, flows.find((f) => f.holderName === topHolder.holderName)?.source || undefined)] : filingCites,
        },
        {
          label: "Rasio churn broker teratas (proksi)",
          value: topChurn ? `${topChurn.code} ${decimal(topChurn.churnRatio, 2)}` : "Tidak ada",
          citations: [citations.broker(symbol)],
        },
      );
      conc.citations = uniqueCitations([...conc.citations, ...filingCites]);
      conc.calculation?.notes.push("Rasio churn adalah proksi crossing/block; pasar nego tidak teramati pada sumber ini.");
      if (divergent) {
        conc.protocol.challengingEvidence += ` Divergensi: harga naik ${percent(stockReturn)} sementara aliran institusi neto ${fmtIdr(netFlow.netValue)} melampaui ambang.`;
      }
    }
  }

  enforceCitations(pillars);
  const ordered = profile.config.pillarOrder.map((key) => pillars.find((pillar) => pillar.key === key)!);
  const evidenceState: EvidenceState = conflict
    ? "Mixed Evidence"
    : volume.status === "Insufficient Data" || catalystDirection === "Unverified"
      ? "Insufficient Evidence"
      : relatedEvents.some((event) => eventDirection(event, symbol) === "Adverse")
        ? "Mixed Evidence"
        : company.evidenceState;
  const thesis = evidenceState === "Corroborated"
    ? "Konfirmasi pasar dan dampak bisnis memberi bukti yang saling menguatkan pada jendela pengamatan."
    : evidenceState === "Mixed Evidence"
      ? "Dua lapisan bukti tidak seluruhnya searah; konflik ditampilkan tanpa dipaksa menjadi satu skor."
      : `Data rekaman ${DATA_AS_OF_LABEL} belum cukup untuk menghubungkan perilaku pasar dengan dampak bisnis.`;
  assertSafeOutput(thesis);
  const hypotheses = createTrace(symbol, pillars, relatedEvents);
  let sources = uniqueCitations(pillars.flatMap((pillar) => pillar.citations));

  const contradictions = pillars.flatMap((pillar) => pillar.conflict ? [pillar.conflict] : []);
  if (divergent) {
    contradictions.push(
      `Harga naik ${percent(stockReturn)} dalam 3 hari sementara aliran institusi neto negatif melampaui ambang. Apakah penguatan didukung partisipasi yang terekam atau tertahan oleh pelepasan yang belum dijelaskan?`,
    );
  }
  // Task 9: narasi vs angka terekam — diam bila tren unknown/flat.
  if (primaryEvent) {
    const fundCheck = checkNarrativeAgainstFinancials({ event: primaryEvent, symbol, financialContext: fixture.financialContext });
    if (fundCheck) {
      contradictions.push(fundCheck.text);
      sources = uniqueCitations([...sources, ...fundCheck.citations]);
    }
  }
  const primaryLink = primaryEvent?.impactLinks.find((link) => link.symbol === symbol);
  const defaultMandate = `Apakah pemicu, arus, aktivitas, dan momentum ${symbol} saling menguatkan — dan bukti apa yang akan membatalkannya?`;
  const mandate = context?.mandate?.trim() || defaultMandate;
  const appliedRules = compilePlaybook(symbol, context);
  // Task 2 + C9: setiap ambang non-bawaan yang mengubah hasil mendorong satu
  // AppliedPlaybookRule agar pergeseran slider dapat ditelusuri. Relevansi juga
  // mencakup jalur graf (confidenceFor memakai ambang yang sama).
  // Di-unshift ke depan agar tampil di ruleTrace.slice(0, 3) pada audit;
  // id memakai prefix threshold- agar materialityRule di bawah tetap menunjuk
  // aturan materialitas pengguna, bukan ambang.
  {
    const custom = context?.playbook;
    const t = custom?.thresholds;
    const concentrationPillar = pillars.find((p) => p.key === "concentration")!;
    const volumePillar = pillars.find((p) => p.key === "volume")!;
    const extra: typeof appliedRules = [];
    if (t?.concentrationFloor !== undefined && t.concentrationFloor !== _DEFAULTS.concentrationFloor) {
      const defStatus = conflict ? "Source Conflict" : concentration.topBuyerShare >= _DEFAULTS.concentrationFloor ? "Concentrated Flow" : "Broad Participation";
      extra.push({
        id: `${symbol}-threshold-concentration`,
        kind: "materiality",
        rule: `Ambang konsentrasi ${t.concentrationFloor} (bawaan ${_DEFAULTS.concentrationFloor})`,
        effect: `Status konsentrasi ${uiLabel(concentrationPillar.status)} (bawaan ${uiLabel(defStatus)})`,
      });
    }
    if ((t?.volumeZFloor !== undefined && t.volumeZFloor !== _DEFAULTS.volumeZFloor) ||
        (t?.volumeExtremeFloor !== undefined && t.volumeExtremeFloor !== _DEFAULTS.volumeExtremeFloor)) {
      const defVol = calculateVolumeSignal(baseline, currentPoint.volume, medianDailyValue / 1e9, {
        elevated: _DEFAULTS.volumeZFloor,
        extreme: _DEFAULTS.volumeExtremeFloor,
      });
      extra.push({
        id: `${symbol}-threshold-volume`,
        kind: "materiality",
        rule: `Ambang volume ${t?.volumeZFloor ?? _DEFAULTS.volumeZFloor}/${t?.volumeExtremeFloor ?? _DEFAULTS.volumeExtremeFloor} (bawaan ${_DEFAULTS.volumeZFloor}/${_DEFAULTS.volumeExtremeFloor})`,
        effect: `Status volume ${uiLabel(volumePillar.status)} (bawaan ${uiLabel(defVol.status)})`,
      });
    }
    if (custom?.relevanceFloor !== undefined && custom.relevanceFloor !== _DEFAULTS.relevanceFloor) {
      const defMat = primaryLink && primaryLink.relevance >= _DEFAULTS.relevanceFloor ? "High" : primaryLink ? "Medium" : "Low";
      const curMat = primaryLink && primaryLink.relevance >= thresholds.relevanceFloor ? "High" : primaryLink ? "Medium" : "Low";
      extra.push({
        id: `${symbol}-threshold-relevance`,
        kind: "materiality",
        rule: `Ambang relevansi ${custom.relevanceFloor} (bawaan ${_DEFAULTS.relevanceFloor})`,
        effect: `Materialitas ${uiLabel(curMat)} (bawaan ${uiLabel(defMat)}); keyakinan graf sebab-akibat dihitung ulang terhadap ambang ini`,
      });
    }
    // Ambang momentum dan konflik arus dulu hardcode di metrics.ts, sehingga
    // label pilar Momentum dan status "Source Conflict" ditentukan angka yang
    // tidak pernah muncul di audit. Sekarang keduanya ikut ruleTrace dengan
    // pola yang sama: tampilkan hanya bila pengguna menggeser dari bawaan,
    // dan sebutkan status bawaannya sebagai pembanding.
    if ((t?.momentumAlignedFloor !== undefined && t.momentumAlignedFloor !== _DEFAULTS.momentumAlignedFloor) ||
        (t?.momentumSectorFloor !== undefined && t.momentumSectorFloor !== _DEFAULTS.momentumSectorFloor) ||
        (t?.momentumIdiosyncraticFloor !== undefined && t.momentumIdiosyncraticFloor !== _DEFAULTS.momentumIdiosyncraticFloor)) {
      const momentumPillar = pillars.find((p) => p.key === "momentum")!;
      const defMomentum = calculateMomentum(stockReturn, marketReturn, fixture.beta, fixture.sectorReturn);
      extra.push({
        id: `${symbol}-threshold-momentum`,
        kind: "materiality",
        rule: `Ambang momentum ${thresholds.momentumAlignedFloor}/${thresholds.momentumSectorFloor}/${thresholds.momentumIdiosyncraticFloor} (bawaan ${_DEFAULTS.momentumAlignedFloor}/${_DEFAULTS.momentumSectorFloor}/${_DEFAULTS.momentumIdiosyncraticFloor})`,
        effect: `Status momentum ${uiLabel(momentumPillar.status)} (bawaan ${uiLabel(defMomentum.status)})`,
      });
    }
    if (t?.foreignContradictionShare !== undefined && t.foreignContradictionShare !== _DEFAULTS.foreignContradictionShare) {
      const defConflict = detectFlowContradiction(foreignParticipantShare, brokerEvidence.netForeign, _DEFAULTS.foreignContradictionShare);
      extra.push({
        id: `${symbol}-threshold-foreign-conflict`,
        kind: "materiality",
        rule: `Ambang konflik arus asing ${t.foreignContradictionShare} (bawaan ${_DEFAULTS.foreignContradictionShare})`,
        effect: `Konflik sumber ${conflict ? "ditandai" : "tidak ditandai"} (bawaan ${defConflict ? "ditandai" : "tidak ditandai"})`,
      });
    }
    appliedRules.unshift(...extra);
  }
  const focuses = resolveFocuses(symbol, mandate);
  const researchPlan = createResearchPlan(symbol, mandate, ordered, focuses, context);
  const businessImpactCitations = uniqueCitations([
    ...fixture.financialContext.flatMap((item) => item.citations),
    ...sources,
  ]);
  const businessImpact = createBusinessImpact(researchPlan.focuses, symbol, businessImpactCitations);
  const relevanceFloor = relevanceFloorFor(context?.playbook);
  const materiality = primaryLink && primaryLink.relevance >= relevanceFloor ? "High" as const : primaryLink ? "Medium" as const : "Low" as const;
  const primaryBusinessImpact = businessImpact.find((item) => item.status === "Primary test") ?? businessImpact[0];
  const researchDisposition = createResearchDisposition(evidenceState, materiality, primaryBusinessImpact, contradictions);
  // Task 10: RUPS pengurus terekam — jujur tanpa skor individu.
  // Pemicu primer jarang leadership (relevansi 88 < dividen 92), sehingga
  // pemicu memakai ANY leadership terekam, bukan hanya primer.
  const hasLeadershipEvent = relatedEvents.some((e) => e.id.startsWith("filing-corporate-action-leadership-"));
  if (hasLeadershipEvent) {
    researchDisposition.monitorObservable = "biaya dan eksekusi pada laporan kuartal berikutnya";
  }
  const materialityRule = appliedRules.find((rule) => rule.kind === "materiality" && !rule.id.includes("-threshold-"))?.rule
    ?? "Buka kasus bila pemicu memiliki eksposur emiten dan dapat mencapai volume, realisasi harga, margin, atau arus kas.";
  const volumeRatio = currentPoint.volume / baselineMedian;

  return {
    caseId: `KASUS-${symbol}-${company.asOf.slice(0, 10).replaceAll("-", "")}`,
    status: "open",
    trigger: {
      title: primaryEvent?.title ?? "Perubahan ringkasan daftar pantauan",
      detail: primaryEvent?.summary ?? company.summary,
      eventId: primaryEvent?.id,
    },
    materialChange: {
      whatChanged: `${symbol}: ${primaryEvent?.title ?? "ringkasan daftar pantauan berubah"}.`,
      baseline: `Volume ${decimal(volumeRatio, 2)}× median ${windowBaselineCount()} sesi. Imbal hasil 3 hari ${percent(stockReturn)} dibanding sektor ${percent(fixture.sectorReturn)}.`,
      whyMaterial: primaryLink
        ? `Relevansi eksposur ${primaryLink.relevance}/100 dan jalur mencapai ${primaryBusinessImpact.label.toLowerCase()}.`
        : `Perubahan belum memiliki jalur eksposur yang cukup untuk melewati batas materialitas.`,
      rule: materialityRule,
    },
    mandate,
    priority: {
      novelty: primaryEvent ? "New" : "Updated",
      materiality,
      uncertainty: contradictions.length || evidenceState !== "Corroborated" ? "High" : "Medium",
      reason: primaryLink ? `Relevansi eksposur ${primaryLink.relevance}/100 (ambang ${relevanceFloor}); ${contradictions.length ? "kontradiksi sumber masih terbuka" : "belum ada kontradiksi lintas sumber"}.` : "Data berubah, tetapi jalur pemicu belum lengkap.",
      ruleTrace: appliedRules.filter((rule) => rule.kind === "materiality" || rule.kind === "exposure" || rule.kind === "falsifier"),
    },
    contradictions,
    counterEvidence: [
      ...ordered.map((pillar) => `${pillar.label}: ${pillar.protocol.challengingEvidence}`),
      ...(unexplainedDrop ? ["Penurunan tanpa peristiwa terhubung melemahkan narasi yang terlalu yakin; gerak belum punya jalur yang dapat diuji."] : []),
    ],
    userNotes,
    unresolvedQuestions: [
      ...ordered.map((pillar) => pillar.protocol.nextQuestion),
      ...contagionCandidates.map((c) =>
        `Penurunan ${c.symbol} ${c.date} tidak punya peristiwa terhubung, sementara ${c.peer} turun setelah ${c.peerEventTitle}. Korelasi imbal hasil berlebih ${decimal(c.correlation, 2)}. Apakah ini penularan sentimen atau jalur fundamental yang belum terekam?`,
      ),
      `Apakah ada perubahan penting pada eksposur emiten yang belum tercakup rekaman ${DATA_AS_OF_LABEL}?`,
    ],
    nextResearchActions: [
      "Periksa indikator yang diharapkan pada keterbukaan atau data keuangan berikutnya.",
      "Ulangi pemeriksaan konflik setelah jendela peristiwa berakhir.",
      ...(hasLeadershipEvent ? ["Batalkan pengaruh pengurus bila biaya dan eksekusi tidak berubah pada laporan kuartal berikutnya."] : []),
    ],
    sourcePlan: researchPlan.sourcePlan,
    closingGate: researchPlan.closingGate,
    // Stage names come from RESEARCH_LIFECYCLE so the method page cannot
    // describe a different process than the one that runs.
    lifecycle: RESEARCH_LIFECYCLE.map(({ key, label }) => ({
      key,
      label,
      state: key === "review" ? "active" as const : "complete" as const,
    })),
    primaryCausalPath: primaryLink?.path ?? "Belum ada jalur utama yang terverifikasi.",
    researchPlan,
    businessImpact,
    evidenceLayers: [
      { key: "market-confirmation", label: "Konfirmasi pasar", purpose: "Uji apakah perubahan benar-benar terlihat pada partisipasi, aktivitas, dan gerak relatif.", pillarKeys: ["concentration", "volume", "momentum"] },
      { key: "business-transmission", label: "Dampak ke bisnis", purpose: "Uji apakah pemicu mencapai eksposur dan indikator operasional atau keuangan emiten.", pillarKeys: ["catalyst"] },
    ],
    researchDisposition,
    appliedRules,
    resolution: context?.resolution,
    company, evidenceState, thesis, pillars: ordered, hypotheses, sources,
    missingEvidence: deriveMissingEvidence({
      analyzed: company.analyzed,
      hasBroker: Boolean(brokerEvidence.buyers.length),
      hasOwnershipSeries: Boolean(brokerEvidence.ownershipSeries?.length),
      eventCount: relatedEvents.length,
      financialRows: fixture.financialContext.length,
      institutionalFlows: flows.length,
      hasLeadershipEvent: relatedEvents.some((e) => e.id.startsWith("filing-corporate-action-leadership-")),
    }),
    // The stability read travels with the case, citations attached. It is the
    // same robust-z formula as the Volume pillar, sliced differently, so it
    // reads the same daily recording — and now says so.
    signalStability: {
      agreement: stability.agreement,
      note: stability.note,
      windows: stability.windowScores.map((window) => ({
        label: window.label,
        value: window.robustZ === null ? "Belum tersedia" : decimal(window.robustZ, 2),
        detail: window.status,
        citations: dailyCitations,
      })),
    },
    priceSeries: series,
    financialContext: fixture.financialContext,
    asOf: company.asOf,
  };
}

function findSymbols(question: string): SymbolCode[] {
  const symbols = marketDataProvider.listCompanies().map((company) => company.symbol);
  const robust = findSymbolsRobust(question, symbols);
  if (robust.length) return robust;
  // Legacy fallback: bare code mention (kept for short inputs like "ANTM?").
  const upper = question.toUpperCase();
  return symbols.filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(upper));
}

function eventFromQuestion(question: string): MarketEvent | undefined {
  const symbols = marketDataProvider.listCompanies().map((company) => company.symbol);
  return matchEventForQuestion(question, newsProvider.listEvents(), symbols);
}

function relevantInsights(insights: UserInsight[] | undefined, symbol?: SymbolCode): UserInsight[] {
  if (!symbol) return [];
  return (insights ?? []).filter((insight) => insight.symbol === symbol && insight.status !== "dismissed");
}

function insightTraces(insights: UserInsight[]): HypothesisTrace[] {
  const pillarLabels = PILLAR_LABELS;
  return insights.map((insight) => ({
    id: insight.id,
    hypothesis: `Catatan pengguna meminta pemeriksaan ulang${insight.pillar ? ` pada pilar ${pillarLabels[insight.pillar] ?? insight.pillar}` : ""}.`,
    query: "Bandingkan catatan pengguna dengan sumber produksi sebelum menggabungkannya.",
    verification: "Belum diverifikasi. Catatan disimpan sebagai hipotesis personal, bukan fakta pasar.",
    outcome: "open",
    citations: [],
  }));
}

/** "Data apa yang belum ada": the recording gaps, then the business tests
 *  nothing has been able to run yet. */
function missingText(analysis: AnalysisCase): string {
  const untested = analysis.businessImpact.filter((item) => item.status === "Open").map((item) => item.label.toLowerCase());
  // Named first so a translated answer keeps the ticker: the gaps are
  // written without it, and an English draft of them shared no word with the
  // material and was rejected as ungrounded.
  return [
    `Data yang belum ada untuk ${analysis.company.symbol}:`,
    analysis.missingEvidence.join(" "),
    ...(untested.length ? [`Indikator yang belum diuji: ${untested.join(", ")}.`] : []),
  ].join(" ");
}

/** The question with a quoted label taken out, ignoring case. */
function withoutLabel(question: string, label: string): string {
  const at = question.toLowerCase().indexOf(label.toLowerCase());
  return at < 0 ? question : `${question.slice(0, at)} ${question.slice(at + label.length)}`;
}

/** "PGAS: PGAS Loses…" read as "PGAS masuk karena PGAS: PGAS Loses…". */
function withoutSymbolPrefix(value: string, symbol: SymbolCode): string {
  return value.startsWith(`${symbol}: `) ? value.slice(symbol.length + 2) : value;
}

function preferenceNote(request: ChatRequest, symbol: SymbolCode | undefined, insightCount = 0): string {
  const { profile, playbook, caseMandate } = request;
  const first = profile.config.pillarOrder[0];
  const pillarName = first === "concentration" ? "Konsentrasi" : first === "volume" ? "Volume" : first === "momentum" ? "Momentum" : "Katalis";
  const depthName = profile.config.depth === "forensic" ? "forensik" : profile.config.depth === "compact" ? "ringkas" : "standar";
  const collaboration = insightCount ? ` ${insightCount} catatan pengguna terkait dimasukkan sebagai hipotesis terbuka.` : "";
  const comparables = symbol ? playbook?.preferredComparables[symbol]?.join(" · ") : undefined;
  const explicitRules = playbook?.materialityRules[0] ? ` Aturan materialitas: ${playbook.materialityRules[0]}` : "";
  const mandate = caseMandate ? ` Pertanyaan aktif: ${caseMandate}` : "";
  return `Urutan dimulai dari ${pillarName}. Profil ${profile.name} memilih kedalaman ${depthName}.${comparables ? ` Pembanding pilihan: ${comparables}.` : ""}${explicitRules}${mandate} Fakta dan ambang tidak berubah.${collaboration}`;
}

const LLM_ANSWER_TIMEOUT_MS = 20_000;

/**
 * Tulis ulang jawaban deterministik dengan Gemini bila mode LLM aktif.
 * Angka yang boleh muncul hanya yang sudah ada di teks deterministik —
 * verifier menolak angka baru, timeout/gagal selalu jatuh ke teks asli.
 * Penolakan saran transaksi tidak pernah ditulis ulang.
 */
/** What a composed answer carries besides its text: who wrote it, and why the
 *  model's draft did not ship when it was asked for one. */
type Composed = Pick<ChatAnswer, "text" | "llmFallbackNote" | "generator" | "fallbackReason">;

const MODEL_OFF_REASON = "model layer off (AGENT_MODE is not llm)";

function fallbackReasonFor(error: unknown): string {
  return (error instanceof Error ? error.message : String(error)).slice(0, 300);
}

async function rewriteWithLlm(
  question: string,
  deterministicText: string,
  visibleFigures: string[] = [],
  languageSource?: string,
): Promise<Composed> {
  if (agentMode() !== "llm") return { text: deterministicText, generator: "deterministic", fallbackReason: MODEL_OFF_REASON };
  try {
    // The allowed pool is every figure the reader can already see for this
    // case, not only the ones this particular sentence happens to mention.
    // Asking "dari sumber mana saja porsi 27,5%" put 27,5% in the draft from
    // the question itself; the figure is on the page, but the answer string
    // did not contain it, so the verifier called a faithful draft fabricated
    // and every such question silently fell back to the template answer.
    // Widening the pool to the case's own displayed figures keeps the
    // guarantee that matters — no number the recordings never produced.
    const evidenceNumbers = extractNumerals(deterministicText, ...visibleFigures);
    const draft = await Promise.race([
      composeAnswerWithLlm({ question, evidenceSummary: deterministicText, evidenceNumbers, ...(languageSource ? { languageSource } : {}) }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("LLM answer timeout")), LLM_ANSWER_TIMEOUT_MS)),
    ]);
    return { text: draft.text, generator: "llm" };
  } catch (error) {
    reportLlmFallback("answer", `pertanyaan ${question.length} karakter`, error);
    // A budget or rate-limit refusal is the one fallback the reader is told
    // about: it is a standing condition for the rest of the day, not a blip,
    // and `.env.example` promises the app says so.
    return error instanceof LlmBudgetError
      ? { text: deterministicText, llmFallbackNote: budgetNoteFor(error.reason), generator: "deterministic", fallbackReason: fallbackReasonFor(error) }
      : { text: deterministicText, generator: "deterministic", fallbackReason: fallbackReasonFor(error) };
  }
}

/**
 * Compose an answer from retrieved material, cheap model first.
 *
 * The cheap model writes an acceptable Indonesian sentence most of the time
 * and costs a third of Flash. When it does not — a fabricated numeral,
 * advisory phrasing, or an answer in the wrong language — the retry buys the
 * stronger model only for the drafts that actually failed, rather than paying
 * Flash prices for every question to cover the minority that need it.
 *
 * A second failure renders the retrieved bundle itself. The panel then says
 * something true and sourced rather than nothing, and still never says
 * anything it cannot support.
 */
function withModel(model: string): typeof generateStructured {
  return <T,>(params: Parameters<typeof generateStructured>[0]) =>
    generateStructured<T>({ ...params, model });
}

async function composeRetrieved(
  question: string,
  retrieved: RetrievedContext,
  cacheable: boolean,
): Promise<Composed> {
  if (agentMode() !== "llm") return { text: retrieved.readerText, generator: "deterministic", fallbackReason: MODEL_OFF_REASON };
  const cheap = cheapModel();
  const strong = strongModel();
  // No cheap tier named means one model does both jobs (see models.ts): the
  // retry would then ask the same vendor the same question twice in a row,
  // paying the wait twice for a draft drawn from the same distribution. One
  // attempt, then the retrieved bundle itself.
  const models = cheap === strong ? [strong] : [cheap, strong];
  const reasons: string[] = [];
  for (const model of models) {
    // Only a first turn is cacheable. A follow-up's meaning depends on turns
    // the key does not carry, so "dan yang satunya?" would otherwise be served
    // an answer written for a different conversation.
    const key = cacheable ? answerCacheKey(question, retrieved.text, model) : null;
    if (key) {
      const hit = await readAnswerCache(key);
      if (hit?.text) return { text: hit.text, generator: "llm" };
    }
    try {
      const draft = await Promise.race([
        composeAnswerWithLlm(
          { question, evidenceSummary: retrieved.text, evidenceNumbers: retrieved.figures },
          withModel(model),
        ),
        new Promise<never>((_, reject) => setTimeout(() => reject(new Error("LLM answer timeout")), LLM_ANSWER_TIMEOUT_MS)),
      ]);
      if (key) await writeAnswerCache(key, { text: draft.text });
      return { text: draft.text, generator: "llm" };
    } catch (error) {
      // A budget or rate-limit refusal ends the attempt entirely: the second
      // model draws on the same daily allowance, so retrying spends quota to
      // learn the same answer.
      if (error instanceof LlmBudgetError) {
        return { text: retrieved.readerText, llmFallbackNote: budgetNoteFor(error.reason), generator: "deterministic", fallbackReason: fallbackReasonFor(error) };
      }
      reportLlmFallback("retrieval", `model ${model}, ${retrieved.entryIds.length} entri`, error);
      reasons.push(`${model}: ${fallbackReasonFor(error)}`);
    }
  }
  return { text: retrieved.readerText, generator: "deterministic", fallbackReason: reasons.join(" | ") };
}

/**
 * Every figure this case already shows the reader: metric values, pillar
 * summaries, the substitution and result lines under "Perhitungan dan data",
 * and the material-change prose at the top of the card. The verifier treats
 * these as quotable, because the reader can see them and ask about them.
 * Ids, dates, and endpoint strings are deliberately not here — widening the
 * pool to the whole case object would let a wrong figure pass on a
 * coincidental match with a timestamp.
 */
function visibleFiguresFor(analysis: AnalysisCase | null | undefined): string[] {
  if (!analysis) return [];
  return [
    ...analysis.pillars.flatMap((pillar) => [
      pillar.summary,
      ...pillar.metrics.map((metric) => metric.value),
      ...(pillar.calculation ? [pillar.calculation.substitution, pillar.calculation.result] : []),
    ]),
    analysis.materialChange.whatChanged,
    analysis.materialChange.baseline,
    analysis.materialChange.whyMaterial,
    ...analysis.financialContext.map((row) => row.value),
  ];
}

/**
 * A question about where a number came from, not what it means.
 *
 * Every metric on an evidence card advertises its source count, which is an
 * open invitation to ask this — and until now the router had no case for it,
 * so "dari sumber mana saja porsi 27,5%" fell through to the generic
 * why-listed answer and told the reader why the symbol was listed instead.
 * On a page about listed equities that is the worst kind of miss: the one
 * question that audits the evidence got an answer about something else.
 */
/**
 * Intent matching is bilingual on purpose.
 *
 * Every phrase list here used to be Indonesian only, and the app is used in
 * both languages. "what is hhi and where we get it from" therefore matched
 * nothing, fell through to the why-listed catch-all, and the model dutifully
 * answered "tidak ada informasi mengenai apa itu HHI" about a figure printed
 * on the same screen. A reader asking the one question that audits the
 * evidence got told the evidence does not exist.
 */
const PROVENANCE_PHRASES = [
  "sumber mana", "dari mana", "sumber apa", "sumbernya", "asal angka", "asal data",
  "dari sumber", "rekaman mana", "sumber data", "sumber datamu", "endpoint", "provenance",
  "where do", "where does", "where did", "where we get", "where you get", "comes from",
  "come from", "data source", "which source", "what source", "which data", "cite",
];

const EXPLAIN_PHRASES = [
  "apa itu", "apa arti", "artinya apa", "arti dari", "jelaskan", "maksud",
  "cara hitung", "cara menghitung", "bagaimana dihitung", "dihitung dari", "rumus",
  "what is", "what's", "what does", "explain", "meaning", "how do you calculate",
  "how is", "how was", "calculated", "formula", "definition",
];

const COMPARE_PHRASES = ["banding", "versus", " vs ", " vs. ", "compare", "comparison", "dibanding"];

const MISSING_PHRASES = [
  "belum", "data apa", "tidak diperiksa", "missing", "not checked", "what data",
  "unavailable", "gap", "kosong",
];

const EVENT_PHRASES = ["berita", "dampak", "peristiwa", "news", "impact", "event"];

/**
 * The half of `EVENT_PHRASES` that names the subject rather than the shape of
 * the question. "berita" says what the question is about; "dampak" says only
 * that something affects something, and appears in questions about every page
 * this app has. The split decides anchoring, not triggering: both halves still
 * make the handler ready, and only the first half protects it from being
 * outbid by retrieval.
 */
const EVENT_SUBJECT_PHRASES = ["berita", "peristiwa", "news", "event", "kabar"];

/**
 * A reader pointing at the case already on screen — "emiten ini", "kasus
 * tersebut". The chip supplies which one; the question is what says the
 * answer should be about it, so this counts as the question naming its
 * subject, unlike a chip sitting there beside an unrelated question.
 */
const CONTEXT_POINTER = /\b(emiten|kasus|saham|perusahaan)\s+(ini|itu|tersebut)\b/;

const WHY_PHRASES = ["kenapa", "mengapa", "daftar", "why", "listed"];

/**
 * "Turun karena berita atau ikut sektor?" — a question about cause.
 *
 * It had no handler. It reached `explain` because "sektor" names the metric
 * `Imbal hasil sektor`, and the reader asking what moved PGAS got a glossary
 * card for one figure. A cause question is either phrased around a cause word,
 * or a why-word next to a price move.
 */
const ATTRIBUTION_PHRASES = [
  "karena", "penyebab", "penyebabnya", "disebabkan", "sebabnya", "gara gara", "ikut sektor", "cuma ikut",
  "hanya ikut", "because", "caused", "cause of", "due to", "driven by", "the sector",
];
const MOVE_WORDS = [
  "turun", "naik", "jatuh", "anjlok", "melemah", "menguat", "merosot", "terkoreksi",
  "drop", "dropped", "fell", "fall", "falling", "rose", "rise", "rising", "declined", "rallied",
];

/** "Kenapa statusnya bukti bercampur?" — the case's own verdict, explained. */
const STATUS_PHRASES = [
  "status bukti", "bercampur", "bukti selaras", "bukti belum cukup", "mixed", "corroborated",
  "insufficient evidence", "evidence status",
];
/** "status" alone is also the review queue's status, a source's status, a
 *  job's status. It asks about the case only when the case is named. */
const STATUS_WORDS = ["status", "statusnya"];
/** A falsifier phrase with no subject is still a case question when it
 *  names what a case holds; "membatalkan" alone may be a Pantau button. */
const CASE_OBJECT_WORDS = ["indikator", "dugaan", "tesis", "thesis", "hipotesis", "hypothesis"];

/**
 * "Apa yang membatalkan dugaan ini?" and "indikator apa yang dipantau?"
 *
 * Both are answered from the counter-evidence, the open tests and the reopen
 * condition, which never reached the retrieval material, so the question was
 * matched to the Pantau page's button copy instead.
 */
const FALSIFIER_PHRASES = [
  "membatalkan", "pembatal", "batalkan", "menggugurkan", "penyangkal", "kapan salah", "terbukti salah",
  "salah kalau", "salah jika", "melemahkan dugaan", "dibuka kembali", "buka kembali", "indikator apa",
  "harus saya pantau", "perlu dipantau", "harus dipantau", "yang dipantau", "dipantau apa",
  "invalidate", "disprove", "prove wrong", "proven wrong", "falsif", "reopen", "what to monitor",
  "which indicator", "what should i watch", "what would change",
];

/** "Sesuai aturan saya…" — the reader's own Playbook, not the recordings. */
const PLAYBOOK_PHRASES = [
  "aturan saya", "aturanku", "sesuai aturan", "aturan pribadi", "playbook", "my rules", "my rule",
  "according to my",
];

/** "Jelaskan jalur … untuk PGAS" — the question the map's "Tanya jalur ini" types. */
const PATH_PHRASES = ["jalur", "path", "mekanisme", "mechanism"];

function mentionsWord(question: string, words: string[]): boolean {
  const tokens = new Set(question.toLowerCase().replace(/[^\p{L}\p{N}\s]/gu, " ").split(/\s+/));
  return words.some((word) => tokens.has(word));
}

function isAttributionQuestion(question: string): boolean {
  return mentions(question, ATTRIBUTION_PHRASES) || (mentions(question, WHY_PHRASES) && mentionsWord(question, MOVE_WORDS));
}

/**
 * The emiten an earlier turn was about, when there was exactly one.
 *
 * "Kalau begitu, indikator apa yang harus saya pantau?" names nothing and
 * points at nothing a pointer rule recognises, but it plainly continues the
 * turn before. Used only for the case-shaped handlers, and only when neither
 * the question nor the chip supplied a subject; with two candidates on the
 * last turn it stays unresolved rather than guessing.
 */
function historySubject(history: HistoryTurn[]): SymbolCode | undefined {
  const known = new Set<string>(SYMBOL_CODES);
  for (let index = history.length - 1; index >= 0; index -= 1) {
    const turn = history[index];
    if (turn.role !== "assistant" || !turn.symbols?.length) continue;
    const symbols = [...new Set(turn.symbols.filter((symbol) => known.has(symbol)))];
    return symbols.length === 1 ? symbols[0] as SymbolCode : undefined;
  }
  return undefined;
}

/** The node the question names on a symbol's causal chain, if any. */
async function causalNodeFor(question: string, symbols: SymbolCode[], profile: UserProfile) {
  const normalized = normalizeQuery(question);
  for (const symbol of symbols) {
    const graph = await buildCausalGraph(symbol, profile, { scope: "market", minRelevance: _DEFAULTS.chainRelevanceFloor });
    const node = graph?.nodes
      // The company node is labelled with the ticker, which every question
      // about the emiten contains; it is the chain's anchor, not a path.
      .filter((item) => item.kind !== "company" && normalizeQuery(item.label).length >= 4 && normalized.includes(normalizeQuery(item.label)))
      .sort((first, second) => second.label.length - first.label.length)[0];
    if (graph && node) return { graph, node };
  }
  return null;
}

/**
 * Padded so " vs " matches a real separator rather than any word ending in
 * "vs", and so a bare "vs" at either end of the question still hits.
 *
 * Exact first, then one or two typos: "dari mna sumbernya" routed to the
 * why-listed catch-all and answered a question nobody asked. `phraseMatches`
 * leaves short phrases ("vs", "gap", "why") exact-only, where a single edit
 * would be a different word.
 */
function mentions(question: string, phrases: string[]): boolean {
  const padded = ` ${question} `;
  return phrases.some((phrase) => padded.includes(phrase) || phraseMatches(question, phrase));
}

function isProvenanceQuestion(question: string): boolean {
  return mentions(question, PROVENANCE_PHRASES);
}

function isExplainQuestion(question: string): boolean {
  return mentions(question, EXPLAIN_PHRASES);
}

/**
 * Answer a provenance or definition question from the metric itself.
 *
 * Never handed to the model. The formula, the substituted numbers and the
 * endpoint are verbatim claims; a rewrite that tidies
 * `/v2/broker-summary/ANTM/top/` into readable prose destroys the one
 * auditable sentence on the page. What the model used to add instead was a
 * "Berdasarkan evidence summary yang diberikan" preamble and a denial.
 */
async function provenanceAnswer(analysis: AnalysisCase, question: string): Promise<{ text: string; citations: Citation[] }> {
  const figures = answerableFigures(analysis);
  const hit = matchFigure(figures, question, extractNumerals);
  if (!hit) {
    // A column name, not a figure: "what is buy_idr" is answerable and used
    // to land in the menu below.
    const field = matchFieldName(question);
    if (field) {
      return {
        text: `${field.field} adalah ${field.meaning}. Kolom ini dibaca dari rekaman Sectors untuk kasus ${analysis.company.symbol}; angka mana pun yang memakainya menyebut rekamannya sendiri.\n\nSumber kasus ini — ${describeCaseSources(analysis.sources)}`,
        citations: analysis.sources,
      };
    }
    // "apa sumber datamu" / "what is your data source" is a question about
    // the whole case, so answer it with the recordings in plain words.
    if (mentions(question, ["sumber data", "sumber datamu", "data source", "semua sumber", "all sources", "sumber apa saja"])) {
      return {
        text: `Kasus ${analysis.company.symbol} dibaca dari ${describeCaseSources(analysis.sources)}`,
        citations: analysis.sources,
      };
    }
    // Otherwise name what this case can answer instead of dumping thirteen
    // endpoint strings at a reader who asked one question. The menu is built
    // from the same list the answer path searches, so it can never offer a
    // figure the assistant cannot then explain.
    const groups = new Map<string, string[]>();
    for (const figure of figures) {
      const entries = groups.get(figure.group) ?? [];
      entries.push(`${figure.metric.label} ${figure.metric.value}`);
      groups.set(figure.group, entries);
    }
    const menu = [...groups.entries()].map(([group, entries]) => `${group}: ${entries.join(", ")}`).join("\n");
    return {
      text: `Belum jelas angka mana yang dimaksud pada kasus ${analysis.company.symbol}. Angka yang tersedia:\n${menu}\n\nSebut salah satu labelnya atau tempelkan angkanya, dan saya jelaskan artinya, rekaman sumbernya, dan cara hitungnya.`,
      citations: analysis.sources,
    };
  }
  // A pillar's substitution line is only offered when the figure belongs to
  // that pillar; `explainFigure` still slices it to the owning metric.
  const pillar = analysis.pillars.find((item) => item.label === hit.group);
  // What the figure means is written at request time and verified; when the
  // model is off or the draft is rejected, the explanation runs without a
  // meaning line rather than with a sentence nothing stands behind.
  const gloss = hit.gloss ?? await resolveMetricGloss({
    label: hit.metric.label,
    formula: hit.formulaOverride ?? METRIC_FORMULA[hit.metric.label],
    fields: hit.metric.citations.map((citation) => citation.field).join(", "),
  });
  const body = explainFigure({ ...hit, gloss }, pillar?.calculation?.substitution);
  const siblings = pillar?.metrics ?? figures.filter((figure) => figure.group === hit.group).map((figure) => figure.metric);
  const spread = new Set(siblings.map((item) => item.citations.length)).size > 1
    ? "\nJumlah sumber dihitung per angka, bukan per kartu, jadi dua angka pada satu kartu bisa berbeda jumlah rekamannya."
    : "";
  const pointer = pillar?.calculation
    ? `\nBlok "Perhitungan dan data" pada pilar ${pillar.label} menampilkan substitusi lengkapnya.`
    : "";
  return { text: `${body}${pointer}${spread}`, citations: hit.metric.citations };
}

/**
 * Keep the displayed context on the answer that was actually given.
 *
 * `routeFollowUp` already ranks a symbol named in the question above the one
 * carried by the chip, so asking "PGAS hhi brp" under an ANTM chip answers
 * about PGAS. Reporting the named symbol lets the chip follow, instead of
 * labelling a PGAS answer ANTM.
 */
async function answerFollowUp(request: ChatRequest): Promise<ChatAnswer> {
  const routed = await routeFollowUp(request);
  // Handlers that never ask the model — provenance, refusals, the menu —
  // wrote their text deterministically by design, so no reason is attached.
  const answer: ChatAnswer = routed.generator ? routed : { ...routed, generator: "deterministic" };
  const named = findSymbols(request.question)[0];
  return named ? { ...answer, questionSymbol: named } : answer;
}

/**
 * Conversation turns the model is allowed to see.
 *
 * `safeLanguage` guards `request.question` and nothing else, so history is a
 * way into the prompt that the question-level guard never sees. A turn
 * carrying transactional language is dropped rather than refusing the whole
 * conversation: the reader already said it, refusing everything after is
 * punishment rather than protection, and dropping the turn removes it from
 * the prompt just as completely.
 */
function safeHistory(history: ChatRequest["history"]): HistoryTurn[] {
  return (history ?? []).filter((turn) => !safeLanguage(turn.text).refused);
}

/**
 * Retrieval, when the flag allows it.
 *
 * Off by default. With the flag off the scored handlers still run, so the
 * router's corrected precedence ships independently of the retrieval layer and
 * can be verified on its own.
 */
async function retrievalFor(request: ChatRequest, followUp: FollowUp): Promise<RetrievedContext | null> {
  if (process.env.COPILOT_RETRIEVAL !== "on") return null;
  const view = VIEW_IDS.includes(request.view as ViewId) ? (request.view as ViewId) : undefined;
  // The resolved question, not the raw one: "yang satunya?" carries no word
  // any entry holds, so scoring it as typed reaches nothing. The symbol the
  // pointer resolved to selects entries exactly the way a symbol the reader
  // typed would; it never becomes material.
  return retrieveContext(followUp.question, {
    profile: request.profile,
    contextSymbol: followUp.symbol ?? request.contextSymbol,
    view,
    history: safeHistory(request.history),
    // The same inputs `/cases` hands `analyzeCompany` (`app/cases/page.tsx`),
    // so a scoped bundle and the screen compute the same cases. All three
    // already arrive on the request; they simply never reached this layer.
    playbook: request.playbook,
    userInsights: request.userInsights,
    caseMandate: request.caseMandate,
  }).catch((error) => {
    // Retrieval is an addition to the answer path, never a precondition for
    // it. A failure here drops to the handlers that shipped before it.
    console.warn(`[retrieval] failed: ${error instanceof Error ? error.message : String(error)}`);
    return null;
  });
}

async function routeFollowUp(request: ChatRequest): Promise<ChatAnswer> {
  const symbols = findSymbols(request.question);
  const lowered = request.question.toLowerCase();
  const attributionAsked = isAttributionQuestion(lowered);
  const statusAsked = mentions(lowered, STATUS_PHRASES)
    || (mentionsWord(lowered, STATUS_WORDS) && (symbols.length > 0 || CONTEXT_POINTER.test(lowered)));
  const falsifierAsked = mentions(lowered, FALSIFIER_PHRASES);
  const playbookAsked = mentions(lowered, PLAYBOOK_PHRASES);
  const caseShaped = attributionAsked || statusAsked || falsifierAsked || playbookAsked;
  const primary = symbols[0] ?? request.contextSymbol ?? (caseShaped ? historySubject(safeHistory(request.history)) : undefined);
  // A path question from the map names its node by label. Resolved against
  // the same chain the map draws, so the answer is about the card pressed.
  const pathAsked = mentions(lowered, PATH_PHRASES);
  const pathSymbols = symbols.length ? symbols : primary ? [primary] : [];
  const pathHit = pathAsked && pathSymbols.length ? await causalNodeFor(request.question, pathSymbols, request.profile) : null;
  // The node label is a recorded headline, not the reader's words. "IHSG
  // Forecast … Analyst Recommendations" is a title the map shows; screening
  // it as the reader asking for a forecast refused the map's own button.
  const readerWords = pathHit ? withoutLabel(request.question, pathHit.node.label) : request.question;
  const guarded = safeLanguage(readerWords);
  const analysis = primary ? await buildAnalysis(primary, request.profile) : null;
  const insights = relevantInsights(request.userInsights, primary);
  const openInsightTraces = insightTraces(insights);
  const personalizedNote = () => preferenceNote(request, primary, insights.length);
  if (guarded.refused) {
    return {
      // An unrecorded resolution is a data gap, not a policy refusal, and the
      // panel reads the intent to decide which of those it is looking at.
      text: guarded.text, refused: true, intent: guarded.kind === "absent" ? "missing" : "advice",
      hypotheses: [...(analysis?.hypotheses ?? []), ...openInsightTraces], citations: analysis?.sources.slice(0, 4) ?? [],
      preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
    };
  }

  // A name the recordings do not hold, said before any handler competes for
  // the question. Ranking cannot answer this: every entry is about some other
  // issuer, so the best match is always a confident answer about the wrong
  // one.
  const unrecorded = unrecordedTickers(readerWords);
  if (unrecorded.length) {
    const recorded = SYMBOL_CODES.join(", ");
    return {
      text: `${unrecorded.join(" dan ")} tidak terekam di Catalyst, jadi tidak ada bukti yang bisa saya bacakan untuk nama itu. Rekaman ${DATA_AS_OF_LABEL} memuat ${SYMBOL_CODES.length} emiten: ${recorded}.`,
      refused: false, intent: "missing", hypotheses: openInsightTraces, citations: [],
      preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
    };
  }

  const question = request.question.toLowerCase();

  // A figure the reader named outranks a loosely matched event. `brp volume
  // terbru nya` names a metric on the page, but `eventFromQuestion` scores
  // token overlap, so it used to be answered with an unrelated event's
  // impact path.
  const figureMatch = analysis ? matchFigureWithStrength(answerableFigures(analysis), request.question, extractNumerals) : undefined;
  const namedFigure = figureMatch?.figure;
  // A group name ("Volume") reaches four figures from one loose word, so it
  // makes the handler ready without anchoring it.
  const figureNamed = Boolean(figureMatch?.named) || Boolean(matchFieldName(request.question));
  const event = eventFromQuestion(request.question);
  // What the question points at, settled before anything is scored. A pointer
  // that found nothing answers with the menu rather than guessing: naming the
  // wrong issuer confidently is worse than saying which one is meant.
  const followUp = resolveFollowUp(request.question, safeHistory(request.history));
  const retrieved = followUp.anaphoric && !followUp.resolved
    ? null
    : await retrievalFor(request, followUp);

  // Which handler answers is now a comparison, not a sequence.
  //
  // The old order let the first matching phrase win, and two of those matches
  // needed nothing but a word: `mentions(question, EVENT_PHRASES)` fired with
  // no event resolved and no symbol, and the why-listed branch fired on
  // "kenapa" as long as a chip had supplied a case. Both then answered about
  // a subject the question never named.
  //
  // Each handler keeps the trigger it shipped with, because each oneanswers a real
  // question when it fires alone. What closes the holes is competition:
  // retrieval bids the share of the question its material actually covers, so
  // "apa dampak peta sebab akibat ke emiten lain" scores far higher as the
  // causal map than as an arbitrary event, and wins on that basis rather than
  // because the event handler was crippled.
  //
  // With COPILOT_RETRIEVAL off there is no competitor, so behaviour is exactly
  // what shipped before — which is what makes this safe to land on its own.
  /** One candidate, scored and marked with what made it ready. A handler is
   *  anchored when the question itself named its subject; that is what
   *  retrieval may not outbid (`selectHandler`). */
  const candidate = (id: HandlerId, signals: HandlerSignals, anchored: boolean) => ({
    id,
    score: handlerScore(signals),
    anchored: signals.evidenceReady && anchored,
  });

  // The question named its subject when it typed a ticker, or pointed at the
  // one on screen.
  //
  // Naming a subject anchors nothing on its own. Every handler here can be
  // about ANTM, so "mekanisme apa saja di peta sebab akibat untuk ANTM" would
  // otherwise anchor why-listed — whose trigger is satisfied by the ticker
  // alone — and lock retrieval out of a question that is plainly about the
  // causal map. A handler is anchored when the question named the thing THAT
  // handler answers about: the figure for a figure question, the event for an
  // event question, the case together with a why-phrase for why-listed.
  const subjectNamed = symbols.length > 0 || (Boolean(request.contextSymbol) && CONTEXT_POINTER.test(question));

  // The case-shaped handlers are listed ahead of `explain` and `event-impact`
  // on purpose. Ties keep list order, and "turun karena berita atau ikut
  // sektor" ties all three: it names a figure ("sektor") and an event word
  // ("berita"), but what it asks for is the cause, which only the case holds.
  const caseReady = Boolean(analysis);
  const winner = selectHandler([
    candidate("compare", { symbolNamedInQuestion: symbols.length >= 2, figureNamedInQuestion: false, exactPhrase: mentions(question, COMPARE_PHRASES), fuzzyPhrase: false, evidenceReady: symbols.length >= 2 && mentions(question, COMPARE_PHRASES) }, symbols.length >= 2),
    candidate("causal-path", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: Boolean(pathHit), exactPhrase: pathAsked, fuzzyPhrase: false, evidenceReady: Boolean(pathHit) }, Boolean(pathHit)),
    candidate("playbook", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: false, exactPhrase: playbookAsked, fuzzyPhrase: false, evidenceReady: caseReady && playbookAsked }, playbookAsked),
    candidate("falsifier", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: false, exactPhrase: falsifierAsked, fuzzyPhrase: false, evidenceReady: caseReady && falsifierAsked }, falsifierAsked),
    candidate("attribution", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: false, exactPhrase: attributionAsked, fuzzyPhrase: false, evidenceReady: caseReady && attributionAsked }, attributionAsked),
    candidate("case-status", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: false, exactPhrase: statusAsked, fuzzyPhrase: false, evidenceReady: caseReady && statusAsked }, statusAsked),
    candidate("provenance", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: Boolean(namedFigure) || Boolean(matchFieldName(request.question)), exactPhrase: isProvenanceQuestion(question), fuzzyPhrase: false, evidenceReady: Boolean(analysis) && isProvenanceQuestion(question) }, isProvenanceQuestion(question)),
    candidate("explain", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: Boolean(namedFigure) || Boolean(matchFieldName(request.question)), exactPhrase: isExplainQuestion(question), fuzzyPhrase: false, evidenceReady: Boolean(analysis) && isExplainQuestion(question) }, figureNamed),
    candidate("event-impact", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: false, exactPhrase: mentions(question, EVENT_PHRASES), fuzzyPhrase: false, evidenceReady: (Boolean(event) || mentions(question, EVENT_PHRASES)) && !namedFigure }, Boolean(event) || mentions(question, EVENT_SUBJECT_PHRASES)),
    candidate("missing", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: false, exactPhrase: mentions(question, MISSING_PHRASES), fuzzyPhrase: false, evidenceReady: mentions(question, MISSING_PHRASES) }, mentions(question, MISSING_PHRASES)),
    candidate("explain", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: Boolean(namedFigure), exactPhrase: false, fuzzyPhrase: false, evidenceReady: Boolean(analysis) && Boolean(namedFigure) }, figureNamed),
    candidate("why-listed", { symbolNamedInQuestion: symbols.length > 0, figureNamedInQuestion: false, exactPhrase: mentions(question, WHY_PHRASES), fuzzyPhrase: false, evidenceReady: Boolean(analysis) && (mentions(question, WHY_PHRASES) || symbols.length > 0) }, subjectNamed && mentions(question, WHY_PHRASES)),
    { id: "retrieved", retrieval: true, score: handlerScore({ symbolNamedInQuestion: false, figureNamedInQuestion: false, exactPhrase: false, fuzzyPhrase: false, evidenceReady: Boolean(retrieved), retrievalScore: retrieved?.score ?? 0 }) },
  ]) ?? { id: "unknown" as const, score: 0 };

  if (winner.id === "compare" && mentions(question, COMPARE_PHRASES) && symbols.length >= 2) {
    const first = await buildAnalysis(symbols[0], request.profile);
    const second = await buildAnalysis(symbols[1], request.profile);
    // Only six symbols carry a full case. A comparison against one of the
    // other twelve used to fall through to the why-listed branch, which
    // answered about a single symbol and never said the other side was
    // missing — the reader saw an answer to a comparison they did not get.
    if (!first || !second) {
      const missing = [!first ? symbols[0] : null, !second ? symbols[1] : null].filter(Boolean).join(" dan ");
      const covered = coverageInfo[!first ? symbols[0] : symbols[1]]?.missing ?? [];
      return {
        text: `Perbandingan belum bisa dijalankan: ${missing} belum punya kasus lengkap pada rekaman ${DATA_AS_OF_LABEL}${covered.length ? ` (${covered.join(", ")} belum ada)` : ""}. Emiten dengan kasus lengkap: ${Object.values(coverageInfo).filter((item) => item.analyzed).map((item) => item.symbol).join(", ")}.`,
        refused: false, intent: "compare", hypotheses: openInsightTraces, citations: (first ?? second)?.sources.slice(0, 4) ?? [],
        preferenceNote: personalizedNote(), relatedSymbols: symbols.slice(0, 2),
      };
    }
    if (first && second) {
      // Every field the two case cards show, side by side. This used to read
      // the Konsentrasi pillar alone, so "Bandingkan ANTM dan PGAS" answered
      // with two participation shares and nothing about status, action,
      // volume, momentum or what triggered either case.
      const material = compareMaterial(first, second);
      return {
        ...(await rewriteWithLlm(request.question, material.text, [...visibleFiguresFor(first), ...visibleFiguresFor(second)])),
        refused: false, intent: "compare", hypotheses: [...first.hypotheses.slice(0, 1), ...second.hypotheses.slice(0, 1)],
        citations: material.citations, preferenceNote: personalizedNote(), relatedSymbols: symbols.slice(0, 2),
      };
    }
  }

  if (winner.id === "causal-path" && pathHit) {
    const material = causalPathMaterial(pathHit.graph, pathHit.node);
    return {
      ...(await rewriteWithLlm(request.question, material.text, visibleFiguresFor(analysis), readerWords)),
      refused: false, intent: "causal-path", hypotheses: openInsightTraces, citations: material.citations,
      preferenceNote: personalizedNote(), relatedSymbols: [pathHit.graph.targetSymbol],
    };
  }

  if (analysis && (winner.id === "attribution" || winner.id === "case-status" || winner.id === "falsifier" || winner.id === "playbook")) {
    // The Playbook answer reads the case the way the reader's screen computes
    // it — with their rules applied — because "sesuai aturan saya" is a
    // question about exactly that difference.
    const ruled = winner.id === "playbook"
      ? await buildAnalysis(analysis.company.symbol, request.profile, { playbook: request.playbook, userInsights: request.userInsights, mandate: request.caseMandate }) ?? analysis
      : analysis;
    const material = winner.id === "attribution" ? attributionMaterial(analysis)
      : winner.id === "case-status" ? statusMaterial(analysis)
        : winner.id === "falsifier" ? falsifierMaterial(analysis, request.playbook)
          : playbookMaterial(ruled, request.profile, request.playbook);
    return {
      ...(await rewriteWithLlm(request.question, material.text, visibleFiguresFor(ruled))),
      refused: false, intent: winner.id, hypotheses: [...analysis.hypotheses, ...openInsightTraces], citations: material.citations,
      preferenceNote: personalizedNote(), relatedSymbols: [analysis.company.symbol],
    };
  }

  // Both run ahead of the event branch. `eventFromQuestion` matches loosely
  // enough that "dari sumber mana saja HHI" and "apa sumber datamu" both
  // resolved to some recorded event and answered with that event's impact
  // path. A question about where a figure came from, or what it means, has
  // exactly one correct answer, and it is not an event summary.
  if (analysis && (winner.id === "provenance" || winner.id === "explain") && (isProvenanceQuestion(question) || isExplainQuestion(question))) {
    const mode = isProvenanceQuestion(question) ? "provenance" : "explain";
    const provenance = await provenanceAnswer(analysis, request.question);
    return {
      text: provenance.text, refused: false, intent: mode,
      hypotheses: openInsightTraces, citations: provenance.citations,
      preferenceNote: personalizedNote(), relatedSymbols: [analysis.company.symbol],
    };
  }

  // Nothing resolved the case: not the question, not the chip, not the route.
  // A question that named a figure, a field, or asked why a case is listed is
  // answerable and only missing its subject, so ask which one rather than
  // answering about whichever case happened to be nearest. This has to run
  // ahead of the event branch: `namedFigure` is what normally keeps a figure
  // question away from a loosely matched event, and it needs an analysis,
  // which does not exist while the case is unresolved. An event phrase the
  // reader actually typed still wins — that question is about the event. A
  // question that named nothing recognisable is a different problem and still
  // gets the menu at the end: the clarifying turn replaces a guess, not the
  // refusal.
  // Retrieval outranking this means the question was answerable without a
  // case after all — "apa saja yang ada di daftar pantauan saya" contains
  // "daftar", which is a why-phrase, but it is not a question about one case.
  // A figure question with no case is the one shape retrieval may not take
  // over. "hhi berapa" matches the metric's own recording, so retrieval bids
  // and wins, and the reader is told what HHI means when what they asked is
  // what it IS for a case they never named. A why-phrase alone is different:
  // "apa saja yang ada di daftar pantauan saya" contains "daftar" but is not
  // about one case, so retrieval answering it is right.
  const unboundFigure = !primary && (Boolean(matchFieldName(request.question)) || namesAMetric(request.question));
  // A threshold belongs to the whole app, not to a case. "berapa ambang
  // relevansi default" names a figure, so it looked like an unbound figure
  // question and was answered with "which case do you mean?" — a cut-off has
  // the same value whichever case is open, and the table that holds it is
  // what the reader asked about.
  const thresholdLed = Boolean(retrieved) && (
    retrieved!.entryIds[0]?.startsWith("threshold:") || namesAThreshold(request.question)
  );
  // "Kenapa turun?" with nothing on screen: a cause question is always about
  // one emiten, and answering it about whichever entry ranked first is a
  // guess wearing citations.
  if ((!primary && (attributionAsked || (falsifierAsked && mentionsWord(lowered, CASE_OBJECT_WORDS)))) || (!primary && !thresholdLed && !mentions(question, EVENT_PHRASES)
    && (unboundFigure || (winner.id !== "retrieved" && mentions(question, WHY_PHRASES))))) {
    return {
      text: `Pertanyaan itu belum terikat ke satu kasus, jadi belum saya jawab. Kasus mana yang Anda maksud?`,
      refused: false, intent: "clarify", hypotheses: [], citations: [],
      clarification: { question: request.question, choices: request.profile.watchlist.slice(0, 6) },
      preferenceNote: personalizedNote(), relatedSymbols: [],
    };
  }

  if (winner.id === "event-impact") {
    // No fallback to `listEvents()[0]`. An unmatched question used to be
    // answered about whichever event happened to be newest, with that
    // event's citations attached and nothing in the text saying which event
    // was picked — a confident answer about something the reader never asked
    // about.
    const selected = event ?? newsProvider.listEvents().find((item) =>
      item.impactLinks.some((link) => link.symbol === primary));
    if (!selected) {
      return {
        text: `Tidak ada peristiwa terekam yang cocok dengan pertanyaan itu pada rekaman ${DATA_AS_OF_LABEL}. Sebut judul, emiten, atau tanggal peristiwanya.`,
        refused: false, intent: "event-impact", hypotheses: openInsightTraces, citations: [],
        preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
      };
    }
    const scoped = selected.impactLinks.filter((link) => request.profile.watchlist.includes(link.symbol));
    const direction = (value: ImpactDirection) => value === "Supported" ? "Mendukung" : value === "Adverse" ? "Berlawanan" : value === "Mixed" ? "Bercampur" : value === "Unrelated" ? "Tidak terkait" : "Belum terverifikasi";
    // Name the event. The reader cannot check an impact path without knowing
    // which trigger it belongs to.
    // A marker the screen set travels as its label, never as a sentence about
    // this event, so the rewrite can say "belum dikonfirmasi resmi" verified.
    const markerNote = selected.markers?.length ? ` Penanda: ${selected.markers.map((marker) => EVENT_MARKER_LABEL[marker]).join(", ")}.` : "";
    const header = `Peristiwa: ${withStop(selected.title)}${markerNote}`;
    const text = scoped.length
      ? `${header} ${scoped.map((link) => `${link.symbol}: ${direction(link.direction)}. ${link.path}.`).join(" ")}`
      : `${header} Peristiwa ini tidak memiliki jalur dampak ke saham pantauan aktif pada rekaman ini.`;
    return { ...(await rewriteWithLlm(request.question, text, visibleFiguresFor(analysis))), refused: false, intent: "event-impact", hypotheses: openInsightTraces, citations: selected.citations, preferenceNote: personalizedNote(), relatedSymbols: scoped.map((link) => link.symbol) };
  }

  if (winner.id === "missing") {
    return {
      ...(await rewriteWithLlm(request.question, analysis ? missingText(analysis) : "Data intrahari, transaksi pihak terafiliasi, dan detail kontrak belum tersedia dalam prototipe.", visibleFiguresFor(analysis))),
      refused: false, intent: "missing", hypotheses: [...(analysis?.hypotheses.filter((item) => item.outcome === "open") ?? []), ...openInsightTraces], citations: analysis?.sources.slice(0, 3) ?? [], preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
    };
  }

  // A metric name is a question about that metric. "hhi" used to reach the
  // why-listed branch and come back with revenue figures. The old four-word
  // ceiling meant the same question phrased naturally — "brp volume terbru
  // nya dong" — did not qualify, which is the wrong way round: a longer
  // question names the figure more clearly, not less.
  if (analysis && namedFigure && winner.id === "explain") {
    const provenance = await provenanceAnswer(analysis, request.question);
    return {
      text: provenance.text, refused: false, intent: "explain",
      hypotheses: openInsightTraces, citations: provenance.citations,
      preferenceNote: personalizedNote(), relatedSymbols: [analysis.company.symbol],
    };
  }

  // `primary` alone is not a question. It comes from the case page's context,
  // so "asdfgh" typed on the ANTM case used to return the full why-listed
  // summary — a confident answer to nothing. Require either a why-shaped
  // phrase or a symbol the reader actually named.
  if (analysis && winner.id === "why-listed") {
    return {
      ...(await rewriteWithLlm(request.question, `${analysis.company.symbol} masuk karena ${withoutSymbolPrefix(analysis.materialChange.whatChanged, analysis.company.symbol)} Pembanding: ${analysis.materialChange.baseline} Perubahan ini penting karena ${analysis.materialChange.whyMaterial} Tindakan riset saat ini: ${analysis.researchDisposition.label}.`, visibleFiguresFor(analysis))),
      refused: false, intent: "why-listed", hypotheses: [...analysis.hypotheses, ...openInsightTraces], citations: analysis.sources, preferenceNote: personalizedNote(), relatedSymbols: [analysis.company.symbol],
    };
  }

  if ((winner.id === "retrieved" || thresholdLed) && retrieved) {
    // Cacheable once the question stands on its own. The old rule refused
    // every follow-up, which was right while nothing resolved pointers and
    // wrong the moment something did: two conversations that arrive at the
    // same resolved question over the same material have the same answer.
    // A pointer that failed never reaches here, so it is never written.
    const composed = await composeRetrieved(followUp.question, retrieved, !followUp.anaphoric || followUp.resolved);
    return {
      text: composed.text, refused: false,
      // Two different answers wear two different names. A list computed over
      // the reader's own watchlist counts their emiten; a retrieved answer
      // over registry material counts every recorded one, and a reader
      // checking an answer against their screen has to be able to tell.
      intent: retrieved.scope === "user" ? "scoped-list" : "retrieved",
      scope: retrieved.scope,
      hypotheses: openInsightTraces, citations: retrieved.citations,
      preferenceNote: personalizedNote(), relatedSymbols: retrieved.symbols,
      entryIds: retrieved.entryIds,
      generator: composed.generator,
      ...(composed.fallbackReason ? { fallbackReason: composed.fallbackReason } : {}),
      ...(composed.llmFallbackNote ? { llmFallbackNote: composed.llmFallbackNote } : {}),
    };
  }

  // Say what this assistant can answer. "Belum ada bukti yang cukup" alone
  // reads as a data gap when the real problem is that the question did not
  // name anything the recordings cover.
  //
  // A named emiten without a full case is a coverage gap, not a reader who
  // failed to name anything: "sebut kode emiten lebih dulu", written after
  // the reader typed Vale Indonesia, reads as the app never having heard of
  // the company. The gap and the recording that is missing are named instead.
  const named = primary ? companies.find((company) => company.symbol === primary) : undefined;
  const coverage = primary ? coverageInfo[primary] : undefined;
  const menu = analysis
    ? ` Untuk ${analysis.company.symbol} saya bisa menjawab: kenapa emiten ini masuk daftar, arti dan asal setiap angka (mis. "apa itu HHI", "dari mana 27,5%"), dampak sebuah peristiwa, perbandingan dengan emiten lain berkasus lengkap, dan data apa yang belum ada.`
    : primary
      ? ` ${primary}${named ? ` (${named.name})` : ""} belum punya kasus lengkap pada rekaman ${DATA_AS_OF_LABEL}, jadi alur sebab-akibat, atribusi, dan pembandingnya belum tersedia.${coverage?.missing.length ? ` Rekaman yang belum ada: ${coverage.missing.join(", ")}.` : ""} Yang bisa saya jawab: arti dan asal sebuah angka, ambang, dampak peristiwa, dan data yang belum terekam.`
      : ` Sebut kode emiten lebih dulu, lalu tanyakan alasan masuk daftar, arti sebuah angka, asal angkanya, dampak peristiwa, atau data yang belum ada.`;
  return {
    text: `Pertanyaan itu belum bisa dipetakan ke bukti pada rekaman Catalyst ${DATA_AS_OF_LABEL}.${menu}`,
    refused: false, intent: "unknown", hypotheses: [], citations: analysis?.sources.slice(0, 3) ?? [],
    preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
  };
}


/**
 * Say out loud when the LLM layer drops to the deterministic path.
 *
 * Both call sites fall back on purpose — a dead model must never take the
 * page down. They used to swallow the reason too, so a production key that
 * answered `403 PERMISSION_DENIED` looked exactly like a healthy
 * deterministic render, and nothing in the logs said otherwise. One line per
 * fallback, no payload, no key material.
 *
 * `subject` must stay non-content: a symbol, an event id, or a length. The
 * user's question never reaches the log — Cloud Logging is a different trust
 * boundary from the page that asked it.
 */
function reportLlmFallback(stage: "answer" | "exposure" | "retrieval", subject: string, error: unknown): void {
  const reason = error instanceof Error ? error.message : String(error);
  console.warn(`[llm-fallback] ${stage} ${subject}: ${reason.slice(0, 300)}`);
}

/** Exposure link plus the short card title the model wrote for it. The label
 *  rides alongside the link instead of inside it: `ImpactLink` is recorded
 *  data, the label is presentation. */
type ResolvedExposure = import("@/lib/types").ImpactLink & { mechanismLabel?: string };

// Mechanism names live in a leaf module so the retrieval corpus can read the
// same words without importing the whole engine behind the index build.
// Re-exported here so existing importers keep working.
export { mechanismLabelFor } from "@/lib/agent/mechanism-label";

async function llmExposure(event: MarketEvent, symbol: SymbolCode, fallback: import("@/lib/types").ImpactLink): Promise<ResolvedExposure> {
  if (agentMode() !== "llm") return fallback;
  // v2: entries written before the model returned a card label. Reusing them
  // would keep every mechanism card on the fallback label forever, so the
  // version rides in the key rather than deleting objects from the bucket.
  const key = cacheKeyFor(["exposure-v2", symbol, event.id]);
  const cached = await getCached<{ path: string; label?: string; direction: import("@/lib/types").ImpactDirection; relevanceBand: "high" | "medium" | "low"; rationale: string }>(key);
  const segments = (await import("@/lib/data/fixtures")).revenueSegments[symbol] ?? [];
  const resolve = async () => {
    if (cached) return cached;
    const assessment = await assessExposureWithLlm({
      symbol,
      eventTitle: event.title,
      eventSummary: event.summary,
      eventTags: event.citations.map((c) => c.label),
      segments: (segments as Array<{ segment: string; share: number }>).map((s) => ({ segment: s.segment, share: s.share ?? 0 })),
    });
    await setCached(key, assessment);
    return assessment;
  };
  try {
    const assessment = await resolve();
    return { ...fallback, path: assessment.path, direction: assessment.direction, relevance: RELEVANCE_BAND_SCORE[assessment.relevanceBand], rationale: assessment.rationale, mechanismLabel: assessment.label };
  } catch (error) {
    reportLlmFallback("exposure", `${symbol}/${event.id}`, error);
    return fallback;
  }
}

async function buildCausalGraph(
  symbol: SymbolCode,
  profile: UserProfile,
  options: {
    scope: "watchlist" | "market";
    minRelevance: number;
    context?: AnalysisContext;
    /** Readability budget for source cards. Defaults to 6 — the single-issuer
     *  chain's bound. */
    maxSources?: number;
    /** Events to keep ahead of the bound when they clear the threshold. */
    prioritizeEventIds?: string[];
  },
): Promise<CausalGraph | null> {
  // A symbol carries a full case only when its broker summary and quarterly
  // financials were recorded. The other twelve in the universe still have a
  // price series and linked sources, and a reviewer-accepted web-watch event
  // maps to them like any other. Returning null for those threw away real
  // evidence and reported it as "no evidence at all". Build the chain that
  // the recordings do support, and let `coverage` say what is missing.
  const analysis = await buildAnalysis(symbol, profile, options.context);
  const company = marketDataProvider.getCompany(symbol);
  if (!company) return null;
  if (options.scope === "watchlist" && !profile.watchlist.includes(symbol)) return null;
  const coverage = coverageInfo[symbol] ?? { analyzed: Boolean(analysis), missing: [] };
  const linked = newsProvider.listEvents().flatMap((event) => {
    const link = event.impactLinks.find((item) => item.symbol === symbol);
    return link ? [{ event, link }] : [];
  });
  // A partially recorded symbol earns a chain only when something is actually
  // linked to it. A lone company node is noise, not evidence.
  if (!analysis && !linked.length) return null;
  const graphFloor = relevanceFloorFor(options.context?.playbook);
  const confidenceFor = (relevance: number): "High" | "Medium" | "Low" => relevance >= graphFloor + 5 ? "High" : relevance >= graphFloor - 10 ? "Medium" : "Low";
  // Per-category lag lives in the threshold table, with the default beside it.
  const lagFor = (event: MarketEvent) => sessionWindowLabel(OBSERVATION_WINDOWS.eventLagSessions[event.category] ?? OBSERVATION_WINDOWS.defaultSessions);
  const expectedFor = (event: MarketEvent) => {
    if (event.category === "company") return "Keterbukaan atau metrik operasional berikutnya bergerak konsisten dengan pemicu.";
    if (event.category === "commodity") return "Realisasi harga, volume penjualan, atau margin berubah pada periode berikutnya.";
    if (event.category === "rates") return "Biaya dana, imbal hasil aset, atau margin bunga menunjukkan perubahan yang searah.";
    if (event.category === "currency") return "Pendapatan, biaya bahan baku, atau translasi valuta menunjukkan perubahan yang searah.";
    if (event.category === "weather") return "Volume produksi, jam operasi, atau logistik menunjukkan gangguan pada jeda terkait.";
    if (event.category === "flows") return "Arus asing, konsentrasi broker, atau bobot indeks menunjukkan kelanjutan atau pembalikan pada sesi berikutnya.";
    if (event.category === "sentiment") return "Volume pemberitaan dan kecepatan liputan kembali normal tanpa diikuti perubahan operasional.";
    return "Metrik biaya, volume, atau kapasitas menunjukkan dampak setelah aturan berlaku.";
  };
  const businessDimensionsFor = (event: MarketEvent): BusinessImpactDimension[] => {
    if (event.category === "commodity") return ["pricing"];
    if (event.category === "rates") return ["margin"];
    if (event.category === "currency") return ["cash-flow"];
    if (event.category === "weather") return ["volume"];
    if (event.category === "policy") return ["margin"];
    if (event.category === "flows") return ["valuation"];
    if (event.category === "sentiment") return ["valuation"];
    // Company disclosures test whatever the research plan focuses on — every
    // focus, not the first. Without a recorded plan there is no honest
    // default, so the edge carries none.
    return analysis?.researchPlan.focuses ?? [];
  };
  // The edge tag holds one dimension; the sentence beside it names them all,
  // so a company disclosure under a two-focus plan does not read as if only
  // one of them were being tested.
  const businessDimensionFor = (event: MarketEvent): BusinessImpactDimension | undefined => businessDimensionsFor(event)[0];
  const implicationFor = (event: MarketEvent, phrasing: "reach" | "tested"): string => {
    const dimensions = businessDimensionsFor(event);
    if (!dimensions.length) {
      return "Indikator bisnis untuk emiten ini belum terekam, jadi jalur ini belum dapat diuji terhadap angka keuangan.";
    }
    const list = dimensions.map((dimension) => impactLabels[dimension].toLowerCase()).join(" dan ");
    return phrasing === "reach"
      ? `Jalur harus mencapai ${list} sebelum dianggap material.`
      : `Dampak diuji pada ${list}.`;
  };
  /**
   * Say when the commodity-to-issuer link is an assumption.
   *
   * `COMMODITY_EXPOSURE` in lib/agent/contagion.ts is hand-written domain
   * knowledge: the recordings carry commodity prices and company overviews,
   * but nothing in them states that a gold price move reaches ANTM. Where a
   * revenue segment was recorded the path cites its share and the claim is
   * evidence; where it was not, the link is Catalyst's own mapping and the
   * chain must not imply the provider supplied it.
   */
  const exposureAssumption = (event: MarketEvent): string =>
    event.sourceType === "commodity" && !(revenueSegments[symbol]?.length)
      ? ` Kaitan komoditas ke ${symbol} adalah asumsi peta eksposur Catalyst, bukan bagian dari rekaman penyedia: segmen pendapatan ${symbol} belum terekam, jadi porsi pendapatan yang terpapar belum dapat diperiksa.`
      : "";
  const eligible = linked.filter(({ link }) => link.relevance >= options.minRelevance).sort((a, b) => b.link.relevance - a.link.relevance);
  // Bounded, not fixed: the graph shows at most this many sources so the
  // chain stays readable, and `hiddenRelationshipCount` says exactly how many
  // stayed out. Web-watch accepts can push `linked` well past the fixture
  // count — that is what the bound is for.
  //
  // The bound is a readability budget, not a claim about evidence, so the
  // caller sets it: the single-issuer chain keeps six, the merged market map
  // on the dashboard affords more because its canvas is larger.
  const maxVisibleSources = options.maxSources ?? 6;
  // Relevance alone is the wrong sort key for a merged view. A recording the
  // provider linked to two watchlist issuers is the only thing that ties two
  // chains together, and ranked purely by relevance it can fall past the
  // bound and take the connection with it — which is exactly what the coal
  // print did to ADRO/PTBA. Callers that care about those connections name
  // the events here and they are kept whenever they clear the threshold at
  // all. Order within each group stays by relevance, so the single-issuer
  // chain (which names none) is byte-for-byte unchanged.
  const prioritized = new Set(options.prioritizeEventIds ?? []);
  const ranked = prioritized.size
    ? [...eligible.filter(({ event }) => prioritized.has(event.id)), ...eligible.filter(({ event }) => !prioritized.has(event.id))]
    : eligible;
  const visible = ranked.slice(0, maxVisibleSources);
  // Every dimension the case tests, not just the first: the chain compares the
  // same causes against each of them, and the heading says so.
  const targetImpacts = analysis
    ? (analysis.businessImpact.filter((item) => item.status === "Primary test").length
        ? analysis.businessImpact.filter((item) => item.status === "Primary test")
        : analysis.businessImpact.slice(0, 1))
    : [];
  const targetImpact = targetImpacts[0];
  // Without a recorded business observable the chain must not name one.
  const targetObservables = targetImpacts.length
    ? targetImpacts.map((item) => item.label)
    : [`Indikator bisnis belum terekam (${coverage.missing.join(", ") || "rekaman belum lengkap"})`];
  const targetObservableList = targetObservables.join(" dan ");
  // The company card says what it is once. What reaches it and what it cannot
  // show are written after the edges exist, from the edges themselves.
  const companyName = company.name.replace(/\.+$/, "");
  const nodes: CausalGraph["nodes"] = [{
    id: `company-${symbol}`,
    label: symbol,
    kind: "company",
    detail: analysis
      ? `${companyName}. Semua jalur di peta ini bertemu di emiten ini, lalu diuji ke indikator kinerjanya.`
      : `${companyName}. Semua jalur di peta ini bertemu di emiten ini.`,
    basis: "Aggregation point",
    confidence: "High",
    lag: "Tidak berlaku",
    counterEvidence: "",
    citations: company.citations,
  }];
  const edges: CausalGraph["edges"] = [];

  for (const { event, link } of visible) {
    const resolvedLink = await llmExposure(event, symbol, link);
    const sourceId = `source-${event.id}`;
    const mechanismId = `mechanism-${event.id}-${symbol}`;
    const mechanismLabel = mechanismLabelFor(resolvedLink.mechanismLabel, resolvedLink.path, event.category);
    nodes.push({
      id: sourceId, label: event.title, kind: "source", detail: event.summary,
      sourceType: event.sourceType, direction: resolvedLink.direction, relevance: resolvedLink.relevance,
      basis: "Reported input", confidence: confidenceFor(link.relevance), lag: lagFor(event),
      counterEvidence: `Nilai ini berasal dari rekaman ${DATA_AS_OF_LABEL}. Kejadian, waktu, dan cakupan produksi masih perlu diperiksa pada sumber langsung.`, citations: event.citations,
      ...(event.markers?.length ? { markers: event.markers } : {}),
    });
    nodes.push({
      id: mechanismId, label: mechanismLabel, kind: "mechanism", detail: `${resolvedLink.path}. ${resolvedLink.rationale}${exposureAssumption(event)}`,
      sourceType: event.sourceType, direction: resolvedLink.direction, relevance: resolvedLink.relevance,
      basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event),
      counterEvidence: resolvedLink.rationale.includes("belum") || resolvedLink.rationale.includes("harus") ? resolvedLink.rationale : "Jalur belum mengisolasi faktor pasar dan sektor lain pada jendela yang sama.", citations: resolvedLink.citations,
    });
    edges.push(
      { id: `${sourceId}-to-${mechanismId}`, from: sourceId, to: mechanismId, label: event.category, direction: link.direction, relevance: link.relevance, basis: "Reported input", confidence: confidenceFor(link.relevance), lag: lagFor(event), exposure: link.path, expectedObservable: expectedFor(event), alternativeExplanation: "Perubahan pasar atau sektor lain terjadi pada jendela yang sama.", falsificationCondition: `Jalur ditahan bila ${expectedFor(event).toLowerCase()} tidak terlihat setelah ${lagFor(event)}.`, confidenceBasis: `Relevansi ${link.relevance}/100 vs ambang ${graphFloor}. Sumber dan waktu tersedia, tetapi belum merupakan bukti sebab akibat.`, businessImpactDimension: businessDimensionFor(event), businessImpactImplication: implicationFor(event, "reach"), citations: event.citations },
      { id: `${mechanismId}-to-company-${symbol}`, from: mechanismId, to: `company-${symbol}`, label: link.direction, direction: link.direction, relevance: link.relevance, basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event), exposure: `${symbol} · ${link.path}`, expectedObservable: expectedFor(event), alternativeExplanation: `Gerak dapat berasal dari arus pasar, sektor, atau pemicu perusahaan lain yang belum tercakup.${exposureAssumption(event)}`, falsificationCondition: `Hipotesis dibatalkan bila indikator perusahaan tidak muncul atau bergerak berlawanan setelah ${lagFor(event)}.`, confidenceBasis: `Jalur eksposur tertulis dan relevansi ${link.relevance}/100 vs ambang ${graphFloor}. Faktor lain belum sepenuhnya dipisahkan.`, businessImpactDimension: businessDimensionFor(event), businessImpactImplication: implicationFor(event, "tested"), citations: link.citations },
    );
  }

  // Business-outcome nodes exist only where quarterly financials were
  // recorded. A partially recorded symbol gets no outcome column rather than
  // an invented one.
  const outcomeDirection: CausalGraph["edges"][number]["direction"] = analysis?.evidenceState === "Corroborated"
    ? "Supported"
    : analysis?.evidenceState === "Mixed Evidence" ? "Mixed" : "Unverified";
  const outcomeNodes = analysis
    ? analysis.businessImpact.filter((item) => item.status === "Primary test" || item.status === "Supporting").slice(0, 3)
    : [];
  for (const outcome of outcomeNodes) {
    const nodeId = `business-impact-${outcome.dimension}`;
    const confidence = outcome.status === "Primary test" && analysis?.evidenceState === "Corroborated" ? "High" : "Medium";
    nodes.push({
      id: nodeId, label: `${outcome.label} · ${outcome.status === "Primary test" ? "Uji utama" : "Pendukung"}`, kind: "business-impact", detail: `${outcome.observable}. ${outcome.implication}`,
      sourceType: "financial", direction: outcomeDirection, relevance: outcome.status === "Primary test" ? OUTCOME_RELEVANCE.primaryTest : OUTCOME_RELEVANCE.supporting,
      basis: "Causal hypothesis", confidence, lag: outcome.dimension === "valuation" ? monthWindowLabel(OBSERVATION_WINDOWS.valuationMonths) : sessionWindowLabel(OBSERVATION_WINDOWS.defaultSessions),
      counterEvidence: `Jalur belum terkonfirmasi bila ${outcome.observable.toLowerCase()} tidak bergerak pada jendela yang dipilih.`, citations: outcome.citations,
    });
    edges.push({
      id: `company-${symbol}-to-${nodeId}`, from: `company-${symbol}`, to: nodeId,
      label: outcome.status === "Primary test" ? "uji utama" : "pendukung", direction: outcomeDirection, relevance: outcome.status === "Primary test" ? OUTCOME_RELEVANCE.primaryTest : OUTCOME_RELEVANCE.supporting, basis: "Causal hypothesis", confidence, lag: outcome.dimension === "valuation" ? monthWindowLabel(OBSERVATION_WINDOWS.valuationMonths) : sessionWindowLabel(OBSERVATION_WINDOWS.defaultSessions),
      exposure: `${symbol} · ${outcome.mechanism}`,
      expectedObservable: outcome.observable,
      alternativeExplanation: "Indikator dapat berubah karena bauran produk, biaya, kontrak, atau faktor sektor lain pada periode yang sama.",
      falsificationCondition: `Jalur ditahan bila ${outcome.observable.toLowerCase()} tidak berubah konsisten pada jendela observasi.`,
      confidenceBasis: `${outcome.status === "Primary test" ? "Uji utama" : "Pendukung"}. Status bukti tetap memerlukan data keuangan berikutnya.`,
      businessImpactDimension: outcome.dimension,
      businessImpactImplication: outcome.implication,
      citations: outcome.citations,
    });
  }

  // Task 8: co-movement edges — pertanyaan, bukan sebab-akibat.
  // C9: confidence "Low" di-hardcode di sini, melewati confidenceFor.
  // Ini pengecualian yang disengaja (bukan bug): co-movement tidak pernah
  // sekuat hipotesis kausal, betapapun tinggi korelasinya.
  {
    const t = _resolveThresholds(options.context?.playbook);
    const bySymbol = Object.fromEntries(
      Object.entries(analysisFixtures).map(([s, f]) => [s, f.priceSeries]),
    );
    const cands = detectContagionCandidates({
      symbol,
      date: marketDataProvider.getDailySeries(symbol).at(-1)?.date ?? "",
      priceSeriesBySymbol: bySymbol,
      events: newsProvider.listEvents(),
      getSubsector: (s) => marketDataProvider.getCompany(s)?.subsector,
      playbook: options.context?.playbook,
      thresholds: { contagionDropFloor: t.contagionDropFloor, contagionCorrelationFloor: t.contagionCorrelationFloor },
    });
    for (const c of cands.slice(0, 3)) {
      const peerId = `comove-${c.peer}`;
      if (!nodes.some((n) => n.id === peerId)) {
        nodes.push({
          id: peerId, label: `${c.peer} · co-movement`, kind: "observation",
          detail: `${c.peer} turun setelah ${c.peerEventTitle}. Korelasi imbal hasil berlebih ${decimal(c.correlation, 2)}. Pertanyaan penularan, bukan penyebab.`,
          sourceType: "market", direction: "Unverified", relevance: Math.round(c.correlation * 100),
          basis: "Observed correlation", confidence: "Low", lag: "0-1 sesi",
          counterEvidence: "Korelasi bukan sebab-akibat; jalur fundamental yang belum terekam masih mungkin.",
          citations: c.citations,
        });
      }
      edges.push({
        id: `${peerId}-to-company-${symbol}`, from: peerId, to: `company-${symbol}`,
        label: "co-movement", direction: "Unverified", relevance: Math.round(c.correlation * 100),
        basis: "Observed correlation", confidence: "Low", lag: "0-1 sesi",
        exposure: `${c.peer} → ${symbol} · co-movement imbal hasil berlebih`,
        expectedObservable: "Tidak ada — pertanyaan untuk diperiksa, bukan jalur yang diuji.",
        alternativeExplanation: "Gerak bersama karena faktor pasar atau jalur fundamental yang belum terekam.",
        falsificationCondition: "Pertanyaan gugur bila ada peristiwa terhubung ke target pada D/D-1 atau korelasi di bawah ambang.",
        confidenceBasis: `Korelasi ${decimal(c.correlation, 2)} vs ambang ${decimal(t.contagionCorrelationFloor, 2)}. Selalu Rendah: co-movement bukan bukti sebab-akibat.`,
        businessImpactDimension: targetImpact?.dimension,
        businessImpactImplication: "Belum ada implikasi bisnis; periksa dulu apakah penularan atau jalur yang belum terekam.",
        citations: c.citations,
      });
    }
  }

  // Company card evidence, counted from the paths that actually reach it.
  {
    const incoming = edges.filter((edge) => edge.to === `company-${symbol}`);
    const causal = incoming.filter((edge) => edge.basis === "Causal hypothesis");
    const comove = incoming.length - causal.length;
    const byDirection = new Map<string, number>();
    for (const edge of causal) byDirection.set(edge.direction, (byDirection.get(edge.direction) ?? 0) + 1);
    const breakdown = [...byDirection].sort((a, b) => b[1] - a[1]).map(([direction, count]) => `${count} ${uiLabel(direction).toLowerCase()}`).join(", ");
    const strongest = causal.reduce<CausalGraph["edges"][number] | undefined>((best, edge) => (!best || edge.relevance > best.relevance ? edge : best), undefined);
    const strongestSource = strongest ? nodes.find((node) => node.id === edges.find((edge) => edge.to === strongest.from)?.from)?.label : undefined;
    const hub = nodes[0];
    hub.supportingEvidence = causal.length
      ? [
          `${causal.length} jalur terekam masuk ke ${symbol}${breakdown ? ` (${breakdown})` : ""}.`,
          strongest && strongestSource ? `Paling relevan: ${strongestSource}, ${strongest.relevance}/100.` : "",
          comove ? `${comove} emiten lain bergerak bersama — pertanyaan penularan, bukan penyebab.` : "",
        ].filter(Boolean).join(" ")
      : `Belum ada jalur terekam yang melewati ambang relevansi ${graphFloor}/100.`;
    const pulling = ["Supported", "Adverse"].filter((direction) => byDirection.has(direction));
    hub.counterEvidence = [
      pulling.length > 1 ? "Jalur tidak searah, jadi arah bersihnya tidak dapat dibaca dari peta ini." : "",
      "Titik ini hanya mempertemukan jalur; tidak membuktikan masukan mana yang menggerakkan harga.",
      analysis ? "" : `Data ${coverage.missing.join(", ")} belum terekam, jadi dampak ke kinerja bisnis belum dapat diuji.`,
    ].filter(Boolean).join(" ");
  }

  return {
    targetSymbol: symbol,
    nodes,
    edges,
    targetObservables,
    // Hypotheses stay at three even when the graph shows more: three
    // competing claims fit in working memory, six do not.
    competingHypotheses: visible.slice(0, 3).map(({ event, link }, index) => ({
      id: `${symbol}-competing-${event.id}`,
      rank: index + 1,
      claim: targetImpact
        ? `${event.title} menjelaskan perubahan ${targetObservableList.toLowerCase()} ${symbol}.`
        : `${event.title} adalah jalur terhubung ke ${symbol}; indikator bisnisnya belum terekam untuk diuji.`,
      targetObservables,
      supportingEvidence: `${link.path}. Relevansi ${link.relevance}/100 dan waktu sumber tersedia.`,
      counterEvidence: index === 0
        ? "Jalur belum mengisolasi masukan lain yang muncul pada jendela yang sama."
        : `Hipotesis peringkat ${index + 1} memiliki relevansi lebih rendah daripada penjelasan utama.`,
      discriminator: `${expectedFor(event)} Periksa setelah ${lagFor(event)}.`,
      status: index === 0 ? "leading" : link.relevance >= graphFloor - 10 ? "plausible" : "challenged",
      confidence: confidenceFor(link.relevance),
      citations: uniqueCitations([...event.citations, ...link.citations]),
    })),
    hiddenRelationshipCount: linked.length - visible.length,
    asOf: analysis?.asOf ?? company.asOf,
    coverage: { analyzed: coverage.analyzed, missing: coverage.missing },
  };
}

export const agentEngine: AgentEngine = {
  analyzeCompany: async (symbol, profile, context) => buildAnalysis(symbol.toUpperCase() as SymbolCode, profile, context),
  mapEventImpact: (eventId, profile, scope) => {
    const event = newsProvider.getEvent(eventId);
    if (!event) return null;
    const impactLinks = event.impactLinks
      .filter((link) => scope === "market" || profile.watchlist.includes(link.symbol))
      .sort((a, b) => b.relevance - a.relevance);
    return { ...event, impactLinks };
  },
  answerFollowUp,
  buildCausalGraph: async (symbol, profile, options) => buildCausalGraph(symbol.toUpperCase() as SymbolCode, profile, options),
};
