import { analysisFixtures, citations, demoProfiles, WINDOW_SESSIONS } from "@/lib/data/fixtures";
import { fixtureMarketDataProvider, fixtureNewsProvider } from "@/lib/data/providers";
import { assertSafeOutput, enforceCitations, safeLanguage } from "@/lib/agent/gates";
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
  MarketEvent,
  PillarResult,
  SymbolCode,
  UserInsight,
  UserProfile,
} from "@/lib/types";
import { assessExposureWithLlm, RELEVANCE_BAND_SCORE } from "@/lib/agent/llm/exposure";
import { parseMandateWithLlm, type MandatePlan } from "@/lib/agent/llm/mandate";
import { agentMode } from "@/lib/agent/mode";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";

const percent = (value: number, digits = 1) =>
  new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: digits }).format(value);

const compact = (value: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);

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
      query: "Broker summary, registry, foreign flow, free float",
      verification: concentration.conflict ?? concentration.summary,
      outcome: concentration.conflict ? "challenged" : "supported",
      citations: concentration.citations,
    },
    {
      id: `${symbol}-h2`,
      hypothesis: `Aktivitas pasar menyimpang dari baseline ${WINDOW_SESSIONS} hari bursa.`,
      query: "Daily volume dan median/MAD",
      verification: volume.summary,
      outcome: volume.status === "Insufficient Data" ? "open" : volume.status === "Normal" ? "challenged" : "supported",
      citations: volume.citations,
    },
    {
      id: `${symbol}-h3`,
      hypothesis: "Gerak tidak cukup dijelaskan oleh IHSG atau sektor.",
      query: "Return 3 hari, IHSG, beta, return sektor",
      verification: momentum.summary,
      outcome: momentum.status === "Idiosyncratic" ? "supported" : "challenged",
      citations: momentum.citations,
    },
    {
      id: `${symbol}-h4`,
      hypothesis: "Peristiwa memiliki jalur dampak dan timing yang relevan.",
      query: "Company news dan filing Sectors pada jendela rekaman",
      verification: relatedEvents.length
        ? `${relatedEvents.length} peristiwa terhubung; timing dan jalur dampak diperiksa.`
        : "Tidak ada peristiwa terhubung pada jendela rekaman.",
      outcome: relatedEvents.length ? "supported" : "open",
      citations: uniqueCitations(relatedEvents.flatMap((event) => event.citations)),
    },
  ];
}

const impactLabels: Record<BusinessImpactDimension, string> = {
  volume: "Operating volume",
  pricing: "Realized pricing",
  margin: "Operating margin",
  "cash-flow": "Operating cash flow",
  "balance-sheet": "Balance-sheet capacity",
  valuation: "Valuation implication",
};

const impactObservables: Record<BusinessImpactDimension, string> = {
  volume: "Production, sales volume, utilization, or transaction throughput",
  pricing: "Realized price, yield, take rate, or revenue per unit",
  margin: "Gross margin, operating margin, spread, or cost per unit",
  "cash-flow": "Operating cash flow, working capital, or cash conversion",
  "balance-sheet": "Net debt, liquidity headroom, capital ratio, or funding mix",
  valuation: "Forward earnings, cash-flow expectation, or peer multiple gap",
};

function mandateFocus(mandate: string, symbol?: SymbolCode): BusinessImpactDimension {
  const value = mandate.toLowerCase();
  if (value.includes("margin") || value.includes("spread") || value.includes("biaya")) return "margin";
  if (value.includes("cash flow") || value.includes("arus kas")) return "cash-flow";
  if (value.includes("balance") || value.includes("utang") || value.includes("likuiditas")) return "balance-sheet";
  if (value.includes("valuasi") || value.includes("valuation") || value.includes("multiple")) return "valuation";
  if (value.includes("harga") || value.includes("pricing") || value.includes("yield")) return "pricing";
  const defaults: Partial<Record<SymbolCode, BusinessImpactDimension>> = {
    ANTM: "pricing",
    BBCA: "margin",
    BBRI: "margin",
    TLKM: "cash-flow",
    PGAS: "margin",
    GOTO: "cash-flow",
  };
  return defaults[symbol ?? "ANTM"] ?? "volume";
}

function compilePlaybook(symbol: SymbolCode, context?: AnalysisContext): AppliedPlaybookRule[] {
  const playbook = context?.playbook;
  if (!playbook) return [];
  const forSymbol = (value: string) => value.toUpperCase().includes(symbol);
  const rules: AppliedPlaybookRule[] = [];
  const add = (kind: AppliedPlaybookRule["kind"], rule: string | undefined, effect: string) => {
    if (rule) rules.push({ id: `${symbol}-${kind}-${rules.length + 1}`, kind, rule, effect });
  };
  playbook.materialityRules.filter((rule) => !rule.startsWith("[Resolution ") || rule.startsWith(`[Resolution ${symbol}]`)).forEach((rule) => add("materiality", rule, rule.startsWith(`[Resolution ${symbol}]`)
    ? "Menggunakan ulang pelajaran dari resolution case ini."
    : "Menentukan apakah trigger layak membuka dan menaikkan prioritas case."));
  add("exposure", playbook.knownExposures.find(forSymbol), "Membatasi jalur kausal pada exposure yang sudah dinyatakan user.");
  add("assumption", playbook.thesisAssumptions.find(forSymbol), "Menjadi asumsi yang harus tetap benar selama case terbuka.");
  add("source", playbook.trustedSources[0], "Menempatkan sumber ini pada urutan pertama source plan.");
  add("falsifier", playbook.falsifiers.find(forSymbol), "Menjadi kondisi pembatal thesis yang dapat diperiksa.");
  const comparables = playbook.preferredComparables[symbol];
  add("comparable", comparables?.length ? comparables.join(" · ") : undefined, "Menetapkan pembanding yang dipakai saat menguji materialitas relatif.");
  return rules;
}

async function llmMandatePlan(symbol: SymbolCode, mandate: string): Promise<MandatePlan | null> {
  if (agentMode() !== "llm") return null;
  const key = cacheKeyFor(["mandate", symbol, mandate]);
  const cached = await getCached<MandatePlan>(key);
  if (cached) return cached;
  try {
    const plan = await parseMandateWithLlm({ symbol, mandate });
    await setCached(key, plan);
    return plan;
  } catch {
    return null;
  }
}

async function createResearchPlan(
  symbol: SymbolCode,
  mandate: string,
  pillars: PillarResult[],
  context?: AnalysisContext,
) {
  const llmPlan = await llmMandatePlan(symbol, mandate);
  const focus = llmPlan?.focus ?? mandateFocus(mandate, symbol);
  const focusLabel = impactLabels[focus].toLowerCase();
  const trustedSource = context?.playbook?.trustedSources[0] ?? "Sectors company data dan filing";
  const falsifier = context?.playbook?.falsifiers.find((item) => item.toUpperCase().includes(symbol))
    ?? `${focusLabel} tidak bergerak sesuai jalur pada jendela observasi.`;
  return {
    mandate,
    focus,
    rationale: llmPlan?.rationale ?? `Mandate mengutamakan ${focusLabel}; planner menata ulang pertanyaan, sumber, dan observable tanpa mengubah data dasar.`,
    hypothesisTree: llmPlan?.hypothesisTree ?? [
      { id: `${symbol}-plan-primary`, claim: `Trigger mengubah ${focusLabel} ${symbol}.`, test: `Cari perubahan pada ${impactObservables[focus].toLowerCase()}.`, state: "primary" as const },
      { id: `${symbol}-plan-support`, claim: "Arus, volume, dan momentum bergerak setelah trigger.", test: pillars.map((pillar) => pillar.label).join(" → "), state: "supporting" as const },
      { id: `${symbol}-plan-challenge`, claim: "Penjelasan alternatif lebih kuat daripada trigger utama.", test: falsifier, state: "challenge" as const },
    ],
    observables: llmPlan?.observables ?? [
      { dimension: focus, metric: impactObservables[focus], expectedChange: `Bergerak konsisten dengan arah trigger pada ${symbol}.`, window: focus === "valuation" ? "1-3 bulan" : "1-10 sesi" },
      ...(focus === "volume" ? [] : [{ dimension: "volume" as const, metric: impactObservables.volume, expectedChange: "Mengonfirmasi bahwa perubahan mencapai aktivitas operasional.", window: "1-10 sesi" }]),
    ],
    sourcePlan: [
      `${trustedSource}: uji ${focusLabel} dan periode pembanding.`,
      `Sectors daily series dan broker evidence: pastikan perubahan terjadi setelah trigger.`,
      `Company filing: periksa ${impactObservables[focus].toLowerCase()}.`,
      `Pembanding sektor: pisahkan perubahan perusahaan dari faktor pasar yang sama.`,
    ],
    clarificationGate: `Fokus aktif: ${focus}. Sebelum menutup case, pastikan definisi perubahan material dan jendela ${focusLabel} telah dipilih.`,
  };
}

function createBusinessImpact(
  focus: BusinessImpactDimension,
  symbol: SymbolCode,
  citations: Citation[],
): BusinessImpactResult[] {
  const dimensions: BusinessImpactDimension[] = ["volume", "pricing", "margin", "cash-flow", "balance-sheet", "valuation"];
  return dimensions.map((dimension) => ({
    dimension,
    label: impactLabels[dimension],
    status: dimension === focus ? "Primary test" : ["volume", "pricing"].includes(dimension) ? "Supporting" : "Open",
    mechanism: dimension === focus
      ? `Mandate meminta jalur trigger diterjemahkan langsung ke ${impactLabels[dimension].toLowerCase()}.`
      : `Uji apakah jalur utama ${symbol} mencapai ${impactLabels[dimension].toLowerCase()}.`,
    observable: impactObservables[dimension],
    implication: `Case belum selesai sampai perubahan ${impactLabels[dimension].toLowerCase()} dinyatakan supported, challenged, atau tetap open.`,
    citations,
  }));
}

async function buildAnalysis(symbol: SymbolCode, profile: UserProfile, context?: AnalysisContext): Promise<AnalysisCase | null> {
  const company = fixtureMarketDataProvider.getCompany(symbol);
  const fixture = analysisFixtures[symbol];
  if (!company || !fixture) return null;

  const series = fixture.priceSeries;
  const brokerEvidence = fixture.broker;
  const buyerValues = brokerEvidence.buyers.map((row) => row.value);
  const concentration = calculateConcentration(
    buyerValues,
    { netForeign: brokerEvidence.netForeign, totalMarketValue: brokerEvidence.totalMarketValue },
    { freeFloatShares: brokerEvidence.freeFloatShares, referencePrice: brokerEvidence.referencePrice },
  );
  const foreignParticipantValue = brokerEvidence.buyers
    .filter((row) => row.origin === "foreign")
    .reduce((total, row) => total + row.value, 0);
  const foreignParticipantShare = foreignParticipantValue / buyerValues.reduce((total, value) => total + value, 0);
  const conflict = detectFlowContradiction(foreignParticipantShare, brokerEvidence.netForeign);

  const currentPoint = series.at(-1)!;
  const baseline = series.slice(0, -1).map((point) => point.volume);
  const baselineMedian = median(baseline);
  const baselineMad = median(baseline.map((value) => Math.abs(value - baselineMedian)));
  const medianDailyValue = baseline[Math.floor(baseline.length / 2)] * currentPoint.close;
  const volume = calculateVolumeSignal(baseline, currentPoint.volume, medianDailyValue / 1e9);

  const startPoint = series.at(-4)!;
  const stockReturn = currentPoint.close / startPoint.close - 1;
  const marketReturn = currentPoint.ihsg / startPoint.ihsg - 1;
  const momentum = calculateMomentum(stockReturn, marketReturn, fixture.beta, fixture.sectorReturn);
  const relatedEvents = fixture.catalystEventIds
    .map((id) => fixtureNewsProvider.getEvent(id))
    .filter((event): event is MarketEvent => Boolean(event));
  const primaryEvent = relatedEvents[0];
  const catalystDirection = primaryEvent ? eventDirection(primaryEvent, symbol) : "Unverified";

  const concentrationCitations = [citations.broker(symbol), citations.registry, citations.foreign(symbol), citations.ownership(symbol)];
  const dailyCitations = [citations.daily(symbol)];
  const momentumCitations = [citations.daily(symbol), citations.ihsg];
  const catalystCitations = uniqueCitations(relatedEvents.flatMap((event) => event.citations));

  const pillars: PillarResult[] = [
    {
      key: "concentration", label: "Konsentrasi",
      status: conflict ? "Source Conflict" : concentration.topBuyerShare >= 0.42 ? "Concentrated Flow" : "Broad Participation",
      summary: conflict
        ? "Origin partisipan dominan tidak searah dengan foreign flow agregat. Kesimpulan konsentrasi ditahan."
        : `${percent(concentration.topBuyerShare)} nilai partisipasi sisi akumulasi berasal dari peserta teratas.`,
      conflict: conflict ? "Partisipan berlabel asing dominan, sementara foreign flow agregat bernilai negatif." : undefined,
      protocol: {
        claim: "Perubahan didukung konsentrasi partisipasi yang konsisten lintas broker summary, registry, dan foreign flow.",
        supportingEvidence: `${percent(concentration.topBuyerShare)} nilai sisi akumulasi berasal dari peserta teratas; HHI ${concentration.hhi.toFixed(3)}.`,
        challengingEvidence: conflict ? "Origin partisipan dominan berlawanan dengan foreign flow agregat." : "Konsentrasi belum membuktikan identitas, motif, atau keberlanjutan partisipan.",
        insufficientWhen: "Broker summary, registry origin, foreign flow, atau free float tidak tersedia pada jendela yang sama.",
        nextQuestion: "Apakah konsentrasi dan foreign flow tetap searah setelah trigger melewati jendela observasi?",
      },
      metrics: [
        { label: "Top participant share", value: percent(concentration.topBuyerShare), citations: concentrationCitations },
        { label: "HHI", value: concentration.hhi.toFixed(3), citations: concentrationCitations },
        { label: "Effective participants", value: concentration.effectiveBuyers.toFixed(1), citations: concentrationCitations },
        { label: "Foreign share", value: percent(concentration.foreignShare), citations: concentrationCitations },
        { label: "Float absorbed", value: percent(concentration.floatAbsorbed, 2), citations: concentrationCitations },
      ], citations: concentrationCitations,
      calculation: {
        name: "Konsentrasi partisipan",
        formula: "HHI = Σsᵢ²; partisipan efektif = 1 / HHI; float terserap = Σ nilai akumulasi / (free-float shares × harga referensi)",
        substitution: `HHI = ${buyerValues.map((value) => `(${compact(value)}/${compact(buyerValues.reduce((sum, item) => sum + item, 0))})²`).join(" + ")}; float = ${compact(buyerValues.reduce((sum, item) => sum + item, 0))} / (${compact(brokerEvidence.freeFloatShares)} × ${compact(brokerEvidence.referencePrice)})`,
        result: `HHI ${concentration.hhi.toFixed(3)} · ${concentration.effectiveBuyers.toFixed(1)} partisipan efektif · ${percent(concentration.floatAbsorbed, 2)} float`,
        notes: [`Share dihitung dari nilai beli broker teratas pada jendela broker summary ${brokerEvidence.windowStart ?? "?"}–${brokerEvidence.windowEnd ?? "?"}.`, `Foreign share dan float terserap membandingkan jendela itu dengan nilai transaksi ${series.length} sesi harian, jadi kedua jendela tidak identik.`, "Origin broker diperiksa silang dengan foreign flow agregat.", "Konflik sumber menahan kesimpulan meski konsentrasi terlihat tinggi."],
      },
    },
    {
      key: "volume", label: "Volume", status: volume.status,
      summary: volume.robustZ === null
        ? "Likuiditas atau baseline tidak cukup untuk mengklasifikasikan anomali."
        : `Volume terakhir berada pada robust z ${volume.robustZ.toFixed(2)} terhadap baseline ${baseline.length} hari bursa.`,
      protocol: {
        claim: "Aktivitas setelah trigger menyimpang secara material dari baseline volume yang robust.",
        supportingEvidence: volume.robustZ === null ? "Belum ada sinyal yang lolos gate." : `Robust z ${volume.robustZ.toFixed(2)} dengan status ${volume.status}.`,
        challengingEvidence: volume.status === "Normal" ? "Volume masih berada dalam rentang baseline." : "Kenaikan volume sendiri tidak mengidentifikasi penyebab atau arah eksposur.",
        insufficientWhen: "Baseline kurang dari 30 observasi, MAD nol, atau median nilai harian di bawah gate likuiditas.",
        nextQuestion: "Apakah anomali volume bertahan dan muncul setelah—bukan sebelum—trigger?",
      },
      metrics: [
        { label: "Robust z", value: volume.robustZ === null ? "Belum tersedia" : volume.robustZ.toFixed(2), citations: dailyCitations },
        { label: "Latest volume", value: compact(currentPoint.volume), citations: dailyCitations },
        { label: "Baseline", value: `${baseline.length} hari bursa`, citations: dailyCitations },
      ], citations: dailyCitations,
      calculation: {
        name: "Anomali volume robust",
        formula: "robust z = 0,6745 × (Vₜ − median(V)) / MAD(V)",
        substitution: `0,6745 × (${compact(currentPoint.volume)} − ${compact(baselineMedian)}) / ${compact(baselineMad)}`,
        result: volume.robustZ === null ? "Insufficient Data" : `${volume.robustZ.toFixed(2)} · ${volume.status}`,
        notes: [`Baseline memakai ${baseline.length} observasi sebelum hari terbaru dalam jendela rekaman ${WINDOW_SESSIONS} hari bursa.`, "Gate likuiditas minimum Rp10 miliar median nilai harian.", "MAD nol atau baseline pendek menghasilkan Insufficient Data."],
      },
    },
    {
      key: "momentum", label: "Momentum", status: momentum.status,
      summary: `Return 3 hari ${percent(stockReturn)}; residual terhadap IHSG ${percent(momentum.residual)}.`,
      protocol: {
        claim: "Perubahan harga tidak cukup dijelaskan oleh IHSG atau pergerakan sektor pada jendela yang sama.",
        supportingEvidence: `Residual beta-adjusted ${percent(momentum.residual)}; return saham ${percent(stockReturn)} versus sektor ${percent(fixture.sectorReturn)}.`,
        challengingEvidence: momentum.status === "Idiosyncratic" ? "Beta hasil regresi jendela rekaman dan jendela tiga hari belum mengisolasi seluruh faktor pasar." : `Status ${momentum.status} menunjukkan penjelasan pasar atau sektor masih relevan.`,
        insufficientWhen: "Close harian, IHSG, beta, atau pembanding sektor tidak tersedia untuk jendela yang sama.",
        nextQuestion: "Apakah residual tetap terlihat pada jendela alternatif tanpa bergantung pada satu hari ekstrem?",
      },
      metrics: [
        { label: "3-day return", value: percent(stockReturn), citations: momentumCitations },
        { label: "IHSG return", value: percent(marketReturn), citations: momentumCitations },
        { label: "Beta-adjusted residual", value: percent(momentum.residual), citations: momentumCitations },
        { label: "Sector return", value: percent(fixture.sectorReturn), citations: momentumCitations },
      ], citations: momentumCitations,
      calculation: {
        name: "Momentum relatif pasar",
        formula: "residual₃ᴅ = return saham₃ᴅ − β × return IHSG₃ᴅ",
        substitution: `${percent(stockReturn)} − ${fixture.beta.toFixed(2)} × ${percent(marketReturn)}`,
        result: `${percent(momentum.residual)} · ${momentum.status}; pembanding sektor ${percent(fixture.sectorReturn)}`,
        notes: [
          "Return dihitung dari close tiga hari bursa.",
          "Beta dihitung dari kovarians return harian terhadap IHSG pada jendela rekaman dan tidak diestimasi ulang oleh chat.",
          "Pembanding sektor memakai rata-rata return tertimbang market cap dari emiten subsektor yang sama.",
          ...(fixture.subsectorContext
            ? [`Konteks subsektor (Sectors subsector_report): ${fixture.subsectorContext.totalCompanies} emiten terdaftar, median P/E ${fixture.subsectorContext.medianPe}; sampel Catalyst ${fixture.subsectorContext.sampleCompanies} emiten. Endpoint ini tidak menyediakan data return.`]
            : []),
        ],
      },
    },
    {
      key: "catalyst", label: "Katalis", status: catalystDirection,
      summary: primaryEvent
        ? `${primaryEvent.title}. Jalur utama: ${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.path ?? "Belum terverifikasi"}.`
        : "Belum ada peristiwa dengan jalur dampak terverifikasi.",
      protocol: {
        claim: "Trigger mendahului perubahan dan memiliki jalur eksposur perusahaan yang dapat diuji.",
        supportingEvidence: primaryEvent ? `${relatedEvents.length} input terhubung; jalur utama ${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.path ?? "belum lengkap"}.` : "Belum ada input terhubung.",
        challengingEvidence: primaryEvent ? "Timing dan jalur eksposur belum membuktikan kausalitas tanpa observable operasional berikutnya." : "Tidak ada trigger terhubung pada jendela rekaman.",
        insufficientWhen: "Sumber, waktu publikasi, exposure perusahaan, atau expected observable tidak dapat diperiksa.",
        nextQuestion: "Observable operasional atau keuangan apa yang harus muncul, dan kapan, bila jalur ini benar?",
      },
      metrics: [
        { label: "Linked events", value: String(relatedEvents.length), citations: catalystCitations.length ? catalystCitations : [citations.news(`none-${symbol}`)] },
        { label: "Primary direction", value: catalystDirection, citations: catalystCitations.length ? catalystCitations : [citations.news(`none-${symbol}`)] },
      ], citations: catalystCitations.length ? catalystCitations : [citations.news(`none-${symbol}`)],
      calculation: {
        name: "Uji jalur katalis",
        formula: "status = sumber teridentifikasi ∩ eksposur tersedia ∩ timing diperiksa ∩ jalur sebab-akibat dapat diuji",
        substitution: `${relatedEvents.length} peristiwa → ${relatedEvents.filter((event) => event.impactLinks.some((link) => link.symbol === symbol)).length} jalur ke ${symbol} → arah utama ${catalystDirection}`,
        result: String(catalystDirection),
        notes: ["Pilar ini memakai aturan keputusan, bukan skor sentimen tersembunyi.", "Peristiwa yang hanya melaporkan gerak tidak dianggap penyebab.", "Cuaca, kebijakan, komoditas, filing, dan makro tetap memerlukan jalur eksposur perusahaan."],
      },
    },
  ];

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
    ? "Empat pilar memberi bukti yang saling menguatkan pada jendela pengamatan."
    : evidenceState === "Mixed Evidence"
      ? "Bukti lintas pilar tidak seluruhnya searah; konflik ditampilkan tanpa dipaksa menjadi satu skor."
      : "Rekaman belum cukup untuk menyimpulkan hubungan lintas pilar.";
  assertSafeOutput(thesis);
  const hypotheses = createTrace(symbol, pillars, relatedEvents);
  const sources = uniqueCitations(pillars.flatMap((pillar) => pillar.citations));

  const contradictions = pillars.flatMap((pillar) => pillar.conflict ? [pillar.conflict] : []);
  const primaryLink = primaryEvent?.impactLinks.find((link) => link.symbol === symbol);
  const defaultMandate = `Investigasi perubahan ${symbol}: uji apakah trigger, arus, aktivitas, dan momentum saling menguatkan serta tentukan bukti pembatalnya.`;
  const mandate = context?.mandate?.trim() || defaultMandate;
  const appliedRules = compilePlaybook(symbol, context);
  const researchPlan = await createResearchPlan(symbol, mandate, ordered, context);
  const businessImpactCitations = uniqueCitations([
    ...fixture.financialContext.flatMap((item) => item.citations),
    ...sources,
  ]);
  const businessImpact = createBusinessImpact(researchPlan.focus, symbol, businessImpactCitations);

  return {
    caseId: `CASE-${symbol}-${company.asOf.slice(0, 10).replaceAll("-", "")}`,
    status: "open",
    trigger: {
      title: primaryEvent?.title ?? "Perubahan snapshot watchlist",
      detail: primaryEvent?.summary ?? company.summary,
      eventId: primaryEvent?.id,
    },
    mandate,
    priority: {
      novelty: primaryEvent ? "New" : "Updated",
      materiality: primaryLink && primaryLink.relevance >= 85 ? "High" : "Medium",
      uncertainty: contradictions.length || evidenceState !== "Corroborated" ? "High" : "Medium",
      reason: primaryLink ? `Exposure relevance ${primaryLink.relevance}/100; ${contradictions.length ? "kontradiksi sumber masih terbuka" : "belum ada kontradiksi lintas sumber"}.` : "Snapshot berubah, tetapi jalur trigger belum lengkap.",
      ruleTrace: appliedRules.filter((rule) => rule.kind === "materiality" || rule.kind === "exposure" || rule.kind === "falsifier"),
    },
    contradictions,
    counterEvidence: ordered.map((pillar) => `${pillar.label}: ${pillar.protocol.challengingEvidence}`),
    userNotes: [],
    unresolvedQuestions: [
      ...ordered.map((pillar) => pillar.protocol.nextQuestion),
      "Apakah ada perubahan material pada exposure perusahaan yang belum tercakup jendela rekaman?",
    ],
    nextResearchActions: [
      "Periksa expected observable terhadap filing atau financial input berikutnya.",
      "Ulangi contradiction gate setelah jendela event berakhir.",
    ],
    sourcePlan: researchPlan.sourcePlan,
    clarificationGate: researchPlan.clarificationGate,
    lifecycle: [
      { key: "mandate", label: "Mandate", state: "complete" },
      { key: "decompose", label: "Question split", state: "complete" },
      { key: "source-plan", label: "Source plan", state: "complete" },
      { key: "evidence", label: "Evidence tests", state: "complete" },
      { key: "review", label: "Review & challenge", state: "active" },
    ],
    primaryCausalPath: primaryLink?.path ?? "Belum ada jalur utama yang terverifikasi.",
    researchPlan,
    businessImpact,
    appliedRules,
    resolution: context?.resolution,
    company, evidenceState, thesis, pillars: ordered, hypotheses, sources,
    missingEvidence: [
      "Data intraday dan antrean order tidak tersedia.",
      "Transaksi pihak terafiliasi belum diidentifikasi.",
      "Rekaman tidak memuat detail kontrak atau hedging perusahaan.",
    ],
    priceSeries: series,
    financialContext: fixture.financialContext,
    asOf: company.asOf,
  };
}

function findSymbols(question: string): SymbolCode[] {
  const symbols = fixtureMarketDataProvider.listCompanies().map((company) => company.symbol);
  const upper = question.toUpperCase();
  return symbols.filter((symbol) => new RegExp(`\\b${symbol}\\b`).test(upper));
}

const questionCategories: Array<[string[], MarketEvent["category"]]> = [
  [["nikel", "batu bara", "komoditas", "emas", "timah"], "commodity"],
  [["rupiah", "kurs", "dolar"], "currency"],
  [["suku bunga", "bi rate", "inflasi"], "rates"],
  [["kebijakan", "regulasi", "pemerintah", "pajak"], "policy"],
];

function eventFromQuestion(question: string): MarketEvent | undefined {
  const value = question.toLowerCase();
  const events = fixtureNewsProvider.listEvents();
  const category = questionCategories.find(([terms]) => terms.some((term) => value.includes(term)))?.[1];
  if (category) {
    const match = events.find((event) => event.category === category);
    if (match) return match;
  }
  const words = value.split(/[^a-z0-9]+/).filter((word) => word.length > 4);
  return words.length
    ? events.find((event) => words.some((word) => event.title.toLowerCase().includes(word)))
    : undefined;
}

function relevantInsights(insights: UserInsight[] | undefined, symbol?: SymbolCode): UserInsight[] {
  if (!symbol) return [];
  return (insights ?? []).filter((insight) => insight.symbol === symbol && insight.status !== "dismissed");
}

function insightTraces(insights: UserInsight[]): HypothesisTrace[] {
  return insights.map((insight) => ({
    id: insight.id,
    hypothesis: `Catatan user meminta verifikasi ulang${insight.pillar ? ` pada pilar ${insight.pillar}` : ""}.`,
    query: "Bandingkan catatan user dengan sumber produksi sebelum menggabungkannya.",
    verification: "Belum diverifikasi. Catatan disimpan sebagai hipotesis personal, bukan fakta pasar.",
    outcome: "open",
    citations: [],
  }));
}

function preferenceNote(request: ChatRequest, symbol: SymbolCode | undefined, insightCount = 0): string {
  const { profile, playbook, caseMandate } = request;
  const first = profile.config.pillarOrder[0];
  const collaboration = insightCount ? ` ${insightCount} catatan user terkait dimasukkan sebagai hipotesis terbuka.` : "";
  const comparables = symbol ? playbook?.preferredComparables[symbol]?.join(" · ") : undefined;
  const explicitRules = playbook?.materialityRules[0] ? ` Materiality rule: ${playbook.materialityRules[0]}` : "";
  const mandate = caseMandate ? ` Mandate aktif: ${caseMandate}` : "";
  return `Urutan dimulai dari ${first}; profil ${profile.name} memilih kedalaman ${profile.config.depth}.${comparables ? ` Preferred comparables: ${comparables}.` : ""}${explicitRules}${mandate} Fakta dan ambang tidak berubah.${collaboration}`;
}

async function answerFollowUp(request: ChatRequest): Promise<ChatAnswer> {
  const guarded = safeLanguage(request.question);
  const symbols = findSymbols(request.question);
  const primary = symbols[0] ?? request.contextSymbol;
  const analysis = primary ? await buildAnalysis(primary, request.profile) : null;
  const insights = relevantInsights(request.userInsights, primary);
  const openInsightTraces = insightTraces(insights);
  const personalizedNote = () => preferenceNote(request, primary, insights.length);
  if (guarded.refused) {
    return {
      text: guarded.text, refused: true, intent: "advice",
      hypotheses: [...(analysis?.hypotheses ?? []), ...openInsightTraces], citations: analysis?.sources.slice(0, 4) ?? [],
      preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
    };
  }

  const question = request.question.toLowerCase();
  if ((question.includes("banding") || question.includes("versus")) && symbols.length >= 2) {
    const first = await buildAnalysis(symbols[0], request.profile);
    const second = await buildAnalysis(symbols[1], request.profile);
    if (first && second) {
      const firstPillar = first.pillars.find((pillar) => pillar.key === "concentration")!;
      const secondPillar = second.pillars.find((pillar) => pillar.key === "concentration")!;
      return {
        text: `${symbols[0]} berstatus ${firstPillar.status} dengan ${firstPillar.metrics[0].value} pada peserta teratas. ${symbols[1]} berstatus ${secondPillar.status} dengan ${secondPillar.metrics[0].value}. Konflik sumber tetap ditampilkan bila origin broker dan foreign flow agregat berbeda.`,
        refused: false, intent: "compare", hypotheses: [...first.hypotheses.slice(0, 1), ...second.hypotheses.slice(0, 1)],
        citations: uniqueCitations([...firstPillar.citations, ...secondPillar.citations]), preferenceNote: personalizedNote(), relatedSymbols: symbols.slice(0, 2),
      };
    }
  }

  const event = eventFromQuestion(request.question);
  if (event || question.includes("berita") || question.includes("dampak")) {
    const selected = event ?? fixtureNewsProvider.listEvents()[0];
    const scoped = selected.impactLinks.filter((link) => request.profile.watchlist.includes(link.symbol));
    const text = scoped.length
      ? scoped.map((link) => `${link.symbol}: ${link.direction}. ${link.path}.`).join(" ")
      : "Peristiwa tersebut tidak memiliki jalur dampak ke watchlist aktif pada rekaman ini.";
    return { text, refused: false, intent: "event-impact", hypotheses: openInsightTraces, citations: selected.citations, preferenceNote: personalizedNote(), relatedSymbols: scoped.map((link) => link.symbol) };
  }

  if (question.includes("belum") || question.includes("data apa") || question.includes("tidak diperiksa")) {
    return {
      text: analysis ? analysis.missingEvidence.join(" ") : "Data intraday, transaksi pihak terafiliasi, dan detail kontrak belum tersedia dalam prototype.",
      refused: false, intent: "missing", hypotheses: [...(analysis?.hypotheses.filter((item) => item.outcome === "open") ?? []), ...openInsightTraces], citations: analysis?.sources.slice(0, 3) ?? [], preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
    };
  }

  if (analysis && (question.includes("kenapa") || question.includes("daftar") || primary)) {
    return {
      text: `${analysis.company.symbol} masuk karena trigger ${analysis.trigger.title} membuka research case dengan status bukti ${analysis.evidenceState}. ${analysis.thesis} Pilar pertama mengikuti playbook Anda: ${analysis.pillars[0].label}.`,
      refused: false, intent: "why-listed", hypotheses: [...analysis.hypotheses, ...openInsightTraces], citations: analysis.sources, preferenceNote: personalizedNote(), relatedSymbols: [analysis.company.symbol],
    };
  }

  return { text: "Belum ada bukti yang cukup untuk menjawab pertanyaan itu dari rekaman Catalyst.", refused: false, intent: "unknown", hypotheses: [], citations: [], preferenceNote: personalizedNote(), relatedSymbols: [] };
}


async function llmExposure(event: MarketEvent, symbol: SymbolCode, fallback: import("@/lib/types").ImpactLink): Promise<import("@/lib/types").ImpactLink> {
  if (agentMode() !== "llm") return fallback;
  const key = cacheKeyFor(["exposure", symbol, event.id]);
  const cached = await getCached<{ path: string; direction: import("@/lib/types").ImpactDirection; relevanceBand: "high" | "medium" | "low"; rationale: string }>(key);
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
    return { ...fallback, path: assessment.path, direction: assessment.direction, relevance: RELEVANCE_BAND_SCORE[assessment.relevanceBand], rationale: assessment.rationale };
  } catch {
    return fallback;
  }
}

async function buildCausalGraph(
  symbol: SymbolCode,
  profile: UserProfile,
  options: { scope: "watchlist" | "market"; minRelevance: number; context?: AnalysisContext },
): Promise<CausalGraph | null> {
  const analysis = await buildAnalysis(symbol, profile, options.context);
  if (!analysis || (options.scope === "watchlist" && !profile.watchlist.includes(symbol))) return null;
  const linked = fixtureNewsProvider.listEvents().flatMap((event) => {
    const link = event.impactLinks.find((item) => item.symbol === symbol);
    return link ? [{ event, link }] : [];
  });
  const confidenceFor = (relevance: number): "High" | "Medium" | "Low" => relevance >= 90 ? "High" : relevance >= 75 ? "Medium" : "Low";
  const lagFor = (event: MarketEvent) => event.category === "company" ? "0-3 sesi" : event.category === "weather" ? "0-5 sesi" : "1-10 sesi";
  const expectedFor = (event: MarketEvent) => {
    if (event.category === "company") return "Filing atau metrik operasional berikutnya bergerak konsisten dengan trigger.";
    if (event.category === "commodity") return "Realisasi harga, volume penjualan, atau margin berubah pada periode berikutnya.";
    if (event.category === "rates") return "Biaya dana, yield aset, atau margin bunga menunjukkan perubahan yang searah.";
    if (event.category === "currency") return "Pendapatan, biaya input, atau translasi valuta menunjukkan perubahan yang searah.";
    if (event.category === "weather") return "Volume produksi, jam operasi, atau logistik menunjukkan gangguan pada lag terkait.";
    return "Metrik biaya, volume, atau kapasitas menunjukkan dampak setelah aturan berlaku.";
  };
  const businessDimensionFor = (event: MarketEvent): BusinessImpactDimension => {
    if (event.category === "commodity") return "pricing";
    if (event.category === "rates") return "margin";
    if (event.category === "currency") return "cash-flow";
    if (event.category === "weather") return "volume";
    if (event.category === "policy") return "margin";
    return analysis.researchPlan.focus;
  };
  const eligible = linked.filter(({ link }) => link.relevance >= options.minRelevance).sort((a, b) => b.link.relevance - a.link.relevance);
  const visible = eligible.slice(0, 3);
  const targetImpact = analysis.businessImpact.find((item) => item.status === "Primary test") ?? analysis.businessImpact[0];
  const nodes: CausalGraph["nodes"] = [{
    id: `company-${symbol}`,
    label: symbol,
    kind: "company",
    detail: `${analysis.company.name}. Titik temu seluruh jalur; bukan kesimpulan transaksi.`,
    basis: "Aggregation point",
    confidence: "High",
    lag: "N/A",
    counterEvidence: "Emiten menghubungkan jalur, tetapi tidak membuktikan bahwa setiap input menyebabkan perubahan harga.",
    citations: analysis.company.citations,
  }];
  const edges: CausalGraph["edges"] = [];

  for (const { event, link } of visible) {
    const resolvedLink = await llmExposure(event, symbol, link);
    const sourceId = `source-${event.id}`;
    const mechanismId = `mechanism-${event.id}-${symbol}`;
    const mechanismLabel = resolvedLink.path.split(/→|->/)[1]?.trim() ?? "Jalur eksposur";
    nodes.push({
      id: sourceId, label: event.title, kind: "source", detail: event.summary,
      sourceType: event.sourceType, direction: resolvedLink.direction, relevance: resolvedLink.relevance,
      basis: "Reported input", confidence: confidenceFor(link.relevance), lag: lagFor(event),
      counterEvidence: "Nilai ini berasal dari rekaman Sectors API. Kejadian, waktu, dan cakupan masih perlu diverifikasi pada sumber aslinya.", citations: event.citations,
    });
    nodes.push({
      id: mechanismId, label: mechanismLabel, kind: "mechanism", detail: `${resolvedLink.path}. ${resolvedLink.rationale}`,
      sourceType: event.sourceType, direction: resolvedLink.direction, relevance: resolvedLink.relevance,
      basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event),
      counterEvidence: resolvedLink.rationale.includes("belum") || resolvedLink.rationale.includes("harus") ? resolvedLink.rationale : "Jalur belum mengisolasi faktor pasar dan sektor lain pada jendela yang sama.", citations: resolvedLink.citations,
    });
    edges.push(
      { id: `${sourceId}-to-${mechanismId}`, from: sourceId, to: mechanismId, label: event.category, direction: resolvedLink.direction, relevance: resolvedLink.relevance, basis: "Reported input", confidence: confidenceFor(link.relevance), lag: lagFor(event), exposure: resolvedLink.path, expectedObservable: expectedFor(event), alternativeExplanation: "Perubahan pasar atau sektor lain terjadi pada jendela yang sama.", falsificationCondition: `Jalur ditahan bila ${expectedFor(event).toLowerCase()} tidak terlihat setelah ${lagFor(event)}.`, confidenceBasis: `Relevance ${resolvedLink.relevance}/100, sumber dan waktu tersedia; belum merupakan bukti kausal.`, businessImpactDimension: businessDimensionFor(event), businessImpactImplication: `Jalur harus mencapai ${impactLabels[businessDimensionFor(event)].toLowerCase()} sebelum dianggap material.`, citations: event.citations },
      { id: `${mechanismId}-to-company-${symbol}`, from: mechanismId, to: `company-${symbol}`, label: resolvedLink.direction, direction: resolvedLink.direction, relevance: resolvedLink.relevance, basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event), exposure: `${symbol} · ${resolvedLink.path}`, expectedObservable: expectedFor(event), alternativeExplanation: "Gerak dapat berasal dari arus pasar, sektor, atau trigger perusahaan lain yang belum tercakup.", falsificationCondition: `Hipotesis dibatalkan bila observable perusahaan tidak muncul atau bergerak berlawanan setelah ${lagFor(event)}.`, confidenceBasis: `Exposure path tertulis dan relevance ${resolvedLink.relevance}/100; isolasi faktor lain belum lengkap.`, businessImpactDimension: businessDimensionFor(event), businessImpactImplication: `Dampak diuji pada ${impactLabels[businessDimensionFor(event)].toLowerCase()}.`, citations: resolvedLink.citations },
    );
  }

  for (const pillar of analysis.pillars) {
    const nodeId = `observation-${pillar.key}`;
    const direction = pillar.key === "catalyst" && ["Supported", "Adverse", "Mixed", "Unrelated", "Unverified"].includes(pillar.status)
      ? pillar.status as CausalGraph["edges"][number]["direction"]
      : "Mixed";
    nodes.push({
      id: nodeId, label: `${pillar.label}: ${pillar.status}`, kind: "observation", detail: pillar.summary,
      sourceType: pillar.key === "catalyst" ? undefined : "market", direction, relevance: 100,
      basis: "Observed correlation", confidence: pillar.conflict ? "Low" : "High", lag: "Jendela analisis",
      counterEvidence: pillar.conflict ?? "Observasi bergerak pada jendela yang sama; hubungan kausal tidak disimpulkan dari korelasi ini.", citations: pillar.citations,
    });
    edges.push({
      id: `company-${symbol}-to-${nodeId}`, from: `company-${symbol}`, to: nodeId,
      label: "observed", direction, relevance: 100, basis: "Observed correlation", confidence: pillar.conflict ? "Low" : "High", lag: "Jendela analisis",
      exposure: `${symbol} · observasi ${pillar.label.toLowerCase()} pada jendela case.`,
      expectedObservable: pillar.protocol.supportingEvidence,
      alternativeExplanation: pillar.protocol.challengingEvidence,
      falsificationCondition: pillar.protocol.insufficientWhen,
      confidenceBasis: pillar.conflict ? "Confidence rendah karena contradiction gate aktif." : "Input deterministik tersedia dan memiliki citation metadata; korelasi bukan kausalitas.",
      businessImpactDimension: pillar.key === "volume" ? "volume" : pillar.key === "momentum" ? "valuation" : pillar.key === "concentration" ? "cash-flow" : analysis.researchPlan.focus,
      businessImpactImplication: `Observasi ini hanya material bila terhubung ke ${impactLabels[pillar.key === "volume" ? "volume" : pillar.key === "momentum" ? "valuation" : pillar.key === "concentration" ? "cash-flow" : analysis.researchPlan.focus].toLowerCase()}.`,
      citations: pillar.citations,
    });
  }

  return {
    targetSymbol: symbol,
    nodes,
    edges,
    targetObservable: targetImpact.label,
    competingHypotheses: visible.map(({ event, link }, index) => ({
      id: `${symbol}-competing-${event.id}`,
      rank: index + 1,
      claim: `${event.title} menjelaskan perubahan ${targetImpact.label.toLowerCase()} ${symbol}.`,
      targetObservable: targetImpact.label,
      supportingEvidence: `${link.path}. Relevance ${link.relevance}/100 dan waktu sumber tersedia.`,
      counterEvidence: index === 0
        ? "Jalur belum mengisolasi input lain yang muncul pada jendela yang sama."
        : `Hipotesis peringkat ${index + 1} memiliki relevansi lebih rendah daripada penjelasan utama.`,
      discriminator: `${expectedFor(event)} Periksa setelah ${lagFor(event)}.`,
      status: index === 0 ? "leading" : link.relevance >= 75 ? "plausible" : "challenged",
      confidence: confidenceFor(link.relevance),
      citations: uniqueCitations([...event.citations, ...link.citations]),
    })),
    hiddenRelationshipCount: linked.length - visible.length,
    asOf: analysis.asOf,
  };
}

export const agentEngine: AgentEngine = {
  analyzeCompany: async (symbol, profile, context) => buildAnalysis(symbol.toUpperCase() as SymbolCode, profile, context),
  mapEventImpact: (eventId, profile, scope) => {
    const event = fixtureNewsProvider.getEvent(eventId);
    if (!event) return null;
    const impactLinks = event.impactLinks
      .filter((link) => scope === "market" || profile.watchlist.includes(link.symbol))
      .sort((a, b) => b.relevance - a.relevance);
    return { ...event, impactLinks };
  },
  answerFollowUp,
  buildCausalGraph: async (symbol, profile, options) => buildCausalGraph(symbol.toUpperCase() as SymbolCode, profile, options),
};

export const defaultProfile = demoProfiles[0];
