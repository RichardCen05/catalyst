// Fixtures-only sufficient — sectors-client unwired (P3: no plan/dry-run/approval). Live wiring is separate.
import { analysisFixtures, citations, WINDOW_SESSIONS } from "@/lib/data/fixtures";
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
  ImpactDirection,
  MarketEvent,
  PillarResult,
  SymbolCode,
  UserInsight,
  UserProfile,
} from "@/lib/types";
import { assessExposureWithLlm, RELEVANCE_BAND_SCORE } from "@/lib/agent/llm/exposure";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";
import { agentMode } from "@/lib/agent/mode";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";

const percent = (value: number, digits = 1) =>
  new Intl.NumberFormat("id-ID", { style: "percent", maximumFractionDigits: digits }).format(value);

const compact = (value: number) =>
  new Intl.NumberFormat("id-ID", { notation: "compact", maximumFractionDigits: 1 }).format(value);

/** Window label derived from the recorded session count — never a literal. */
export const windowLabel = () => `${WINDOW_SESSIONS} hari bursa`;
const windowBaselineCount = () => Math.max(WINDOW_SESSIONS - 1, 1);

/** Materiality floor comes from the user's playbook, defaulting to the recorded baseline. */
export const DEFAULT_RELEVANCE_FLOOR = 85;
export const relevanceFloorFor = (playbook?: { relevanceFloor?: number }) =>
  typeof playbook?.relevanceFloor === "number" ? playbook.relevanceFloor : DEFAULT_RELEVANCE_FLOOR;

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
        : "Tidak ada peristiwa terverifikasi dalam rekaman 11 Sep 2026.",
      outcome: relatedEvents.length ? "supported" : "open",
      citations: uniqueCitations(relatedEvents.flatMap((event) => event.citations)),
    },
  ];
}

const impactLabels: Record<BusinessImpactDimension, string> = {
  volume: "Volume operasi",
  pricing: "Realisasi harga",
  margin: "Margin operasi",
  "cash-flow": "Arus kas operasi",
  "balance-sheet": "Kapasitas neraca",
  valuation: "Dampak valuasi",
};

const impactObservables: Record<BusinessImpactDimension, string> = {
  volume: "Produksi, volume penjualan, utilisasi, atau jumlah transaksi",
  pricing: "Realisasi harga, imbal hasil, atau pendapatan per unit",
  margin: "Margin kotor, margin operasi, selisih, atau biaya per unit",
  "cash-flow": "Arus kas operasi, modal kerja, atau konversi kas",
  "balance-sheet": "Utang bersih, ruang likuiditas, rasio modal, atau sumber pendanaan",
  valuation: "Ekspektasi laba, arus kas, atau selisih valuasi pembanding",
};

/**
 * Default focus is derived from the company's recorded sector — not a
 * per-symbol table. Explicit mandate keywords always win over the default.
 */
function sectorDefaultFocus(symbol?: SymbolCode): BusinessImpactDimension {
  const sector = symbol ? fixtureMarketDataProvider.getCompany(symbol)?.sector : undefined;
  switch (sector) {
    case "Basic Materials":
    case "Energy":
      return "pricing";
    case "Financials":
      return "margin";
    case "Technology":
    case "Infrastructure":
      return "cash-flow";
    case "Consumer":
      return "volume";
    default:
      return "volume";
  }
}

function mandateFocus(mandate: string, symbol?: SymbolCode): BusinessImpactDimension {
  return explicitMandateFocus(mandate) ?? sectorDefaultFocus(symbol);
}

function explicitMandateFocus(mandate: string): BusinessImpactDimension | undefined {
  const value = mandate.toLowerCase();
  if (/margin|spread|biaya per unit/.test(value)) return "margin";
  if (/cash flow|arus kas|working capital/.test(value)) return "cash-flow";
  if (/balance sheet|neraca|utang|likuiditas/.test(value)) return "balance-sheet";
  if (/valuasi|valuation|multiple/.test(value)) return "valuation";
  if (/realized price|realisasi harga|pricing|harga jual/.test(value)) return "pricing";
  if (/volume produksi|volume penjualan|utilisasi|throughput/.test(value)) return "volume";
  return undefined;
}

function createClarification(symbol: SymbolCode, mandate: string, choice?: string) {
  const inferred = explicitMandateFocus(mandate);
  const sectorDefault = sectorDefaultFocus(symbol);
  const [primary, secondary] = [inferred ?? sectorDefault, "volume" as BusinessImpactDimension];
  const focusOptions = [inferred, primary, secondary]
    .filter((item): item is BusinessImpactDimension => Boolean(item))
    .filter((item, index, values) => values.indexOf(item) === index)
    .slice(0, 2);
  const options = focusOptions.map((focus) => ({
    id: focus,
    label: impactLabels[focus],
    question: `Apakah pemicu perlu diuji terhadap ${impactLabels[focus].toLowerCase()} ${symbol}?`,
    focus,
    sourceConsequence: focus === "pricing"
      ? "Utamakan harga acuan komoditas, realisasi harga, pendapatan segmen, dan kontrak penjualan."
      : focus === "volume"
        ? "Utamakan laporan produksi, volume penjualan, utilisasi, dan gangguan operasi."
        : `Utamakan data keuangan dan keterbukaan yang menjelaskan ${impactLabels[focus].toLowerCase()}.`,
    observable: impactObservables[focus],
  }));
  const selected = options.find((option) => option.id === choice) ?? options.find((option) => option.focus === inferred);
  return {
    required: !selected,
    reason: selected
      ? `Pertanyaan diarahkan ke ${impactLabels[selected.focus].toLowerCase()}. Sumber dan indikator mengikuti pilihan ini.`
      : "Pertanyaan belum menyebut hasil bisnis yang harus berubah. Pilih satu fokus sebelum Catalyst melanjutkan.",
    selectedOptionId: selected?.id,
    options,
  };
}

function compilePlaybook(symbol: SymbolCode, context?: AnalysisContext): AppliedPlaybookRule[] {
  const playbook = context?.playbook;
  if (!playbook) return [];
  const forSymbol = (value: string) => value.toUpperCase().includes(symbol);
  const rules: AppliedPlaybookRule[] = [];
  const add = (kind: AppliedPlaybookRule["kind"], rule: string | undefined, effect: string) => {
    if (rule) rules.push({ id: `${symbol}-${kind}-${rules.length + 1}`, kind, rule, effect });
  };
  playbook.materialityRules
    .filter((rule) => (!rule.startsWith("[Hasil ") && !rule.startsWith("[Disetujui ")) || rule.startsWith(`[Hasil ${symbol}]`) || rule.startsWith(`[Disetujui ${symbol}]`))
    .forEach((rule) => add("materiality", rule, rule.startsWith(`[Hasil ${symbol}]`) || rule.startsWith(`[Disetujui ${symbol}]`)
    ? "Menggunakan kembali aturan yang disetujui dari hasil kasus ini."
    : "Menentukan apakah pemicu layak membuka dan menaikkan prioritas kasus."));
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
    approved.forEach((rule) => add(kind, rule, approvedEffect));
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
  focusOverride?: BusinessImpactDimension,
  context?: AnalysisContext,
) {
  const focus = focusOverride ?? mandateFocus(mandate, symbol);
  const focusLabel = impactLabels[focus].toLowerCase();
  const trustedSource = context?.playbook?.trustedSources[0] ?? "Data perusahaan Sectors dan keterbukaan emiten";
  const falsifier = context?.playbook?.falsifiers.find((item) => item.toUpperCase().includes(symbol))
    ?? `${focusLabel} tidak bergerak sesuai jalur pada jendela observasi.`;
  return {
    mandate,
    focus,
    rationale: `Pertanyaan mengutamakan ${focusLabel}. Catalyst menyesuaikan hipotesis, sumber, dan indikator tanpa mengubah data dasar.`,
    hypothesisTree: [
      { id: `${symbol}-plan-primary`, claim: `Pemicu mengubah ${focusLabel} ${symbol}.`, test: `Cari perubahan pada ${impactObservables[focus].toLowerCase()}.`, state: "primary" as const },
      { id: `${symbol}-plan-support`, claim: "Arus, volume, dan momentum bergerak setelah pemicu.", test: pillars.map((pillar) => pillar.label).join(" → "), state: "supporting" as const },
      { id: `${symbol}-plan-challenge`, claim: "Penjelasan lain lebih kuat daripada pemicu utama.", test: falsifier, state: "challenge" as const },
    ],
    observables: [
      { dimension: focus, metric: impactObservables[focus], expectedChange: `Bergerak konsisten dengan arah pemicu pada ${symbol}.`, window: focus === "valuation" ? "1-3 bulan" : "1-10 sesi" },
      ...(focus === "volume" ? [] : [{ dimension: "volume" as const, metric: impactObservables.volume, expectedChange: "Mengonfirmasi bahwa perubahan mencapai aktivitas operasional.", window: "1-10 sesi" }]),
    ],
    sourcePlan: [
      `${trustedSource}: uji ${focusLabel} dan periode pembanding.`,
      `Data harian dan broker Sectors: pastikan perubahan terjadi setelah pemicu.`,
      `Keterbukaan emiten: periksa ${impactObservables[focus].toLowerCase()}.`,
      `Pembanding sektor: pisahkan perubahan perusahaan dari faktor pasar yang sama.`,
    ],
    clarificationGate: `Fokus aktif: ${focusLabel}. Sebelum menutup kasus, pastikan perubahan penting dan jendela pengamatan sudah ditentukan.`,
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

function buildAnalysis(symbol: SymbolCode, profile: UserProfile, context?: AnalysisContext): AnalysisCase | null {
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

  const concentrationCitations = [citations.broker(symbol), citations.registry, citations.foreign(symbol), citations.ownership(symbol)];
  const dailyCitations = [citations.daily(symbol)];
  const momentumCitations = [citations.daily(symbol), citations.ihsg];
  const catalystCitations = uniqueCitations(relatedEvents.flatMap((event) => event.citations));

  const pillars: PillarResult[] = [
    {
      key: "concentration", label: "Konsentrasi",
      status: conflict ? "Source Conflict" : concentration.topBuyerShare >= 0.42 ? "Concentrated Flow" : "Broad Participation",
      summary: conflict
        ? "Asal partisipan dominan tidak searah dengan arus asing agregat. Kesimpulan konsentrasi ditahan."
        : `${percent(concentration.topBuyerShare)} nilai partisipasi sisi akumulasi berasal dari peserta teratas.`,
      conflict: conflict ? "Partisipan berlabel asing dominan, sementara arus asing agregat bernilai negatif." : undefined,
      protocol: {
        claim: "Perubahan didukung konsentrasi partisipasi yang konsisten pada ringkasan broker, asal broker, dan arus asing.",
        supportingEvidence: `${percent(concentration.topBuyerShare)} nilai sisi akumulasi berasal dari peserta teratas; HHI ${concentration.hhi.toFixed(3)}.`,
        challengingEvidence: conflict ? "Asal partisipan dominan berlawanan dengan arus asing agregat." : "Konsentrasi belum membuktikan identitas, motif, atau keberlanjutan partisipan.",
        insufficientWhen: "Ringkasan broker, asal broker, arus asing, atau saham publik tidak tersedia pada jendela yang sama.",
        nextQuestion: "Apakah konsentrasi dan arus asing tetap searah setelah pemicu melewati jendela pengamatan?",
      },
      metrics: [
        { label: "Porsi peserta teratas", value: percent(concentration.topBuyerShare), citations: concentrationCitations },
        { label: "HHI", value: concentration.hhi.toFixed(3), citations: concentrationCitations },
        { label: "Peserta efektif", value: concentration.effectiveBuyers.toFixed(1), citations: concentrationCitations },
        { label: "Porsi asing", value: percent(concentration.foreignShare), citations: concentrationCitations },
        { label: "Saham publik terserap", value: percent(concentration.floatAbsorbed, 2), citations: concentrationCitations },
      ], citations: concentrationCitations,
      calculation: {
        name: "Konsentrasi partisipan",
        formula: "HHI = Σsᵢ²; partisipan efektif = 1 / HHI; saham publik terserap = Σ nilai akumulasi / (saham publik × harga referensi)",
        substitution: `HHI = ${buyerValues.map((value) => `(${compact(value)}/${compact(buyerValues.reduce((sum, item) => sum + item, 0))})²`).join(" + ")}; saham publik = ${compact(buyerValues.reduce((sum, item) => sum + item, 0))} / (${compact(brokerEvidence.freeFloatShares)} × ${compact(brokerEvidence.referencePrice)})`,
        result: `HHI ${concentration.hhi.toFixed(3)} · ${concentration.effectiveBuyers.toFixed(1)} partisipan efektif · ${percent(concentration.floatAbsorbed, 2)} saham publik`,
        notes: ["Porsi dihitung dari nilai sisi akumulasi pada jendela rekaman.", "Asal broker diperiksa silang dengan arus asing agregat.", "Konflik sumber menahan kesimpulan meski konsentrasi terlihat tinggi."],
      },
    },
    {
      key: "volume", label: "Volume", status: volume.status,
      summary: volume.robustZ === null
        ? "Likuiditas atau pembanding tidak cukup untuk mengelompokkan anomali."
        : `Volume terakhir memiliki skor z tahan pencilan ${volume.robustZ.toFixed(2)} terhadap pembanding ${windowLabel()}.`,
      protocol: {
        claim: "Aktivitas setelah pemicu menyimpang dari pembanding volume yang kuat terhadap pencilan.",
        supportingEvidence: volume.robustZ === null ? "Belum ada sinyal yang lolos batas." : `Skor z tahan pencilan ${volume.robustZ.toFixed(2)} dengan status ${volume.status === "Normal" ? "normal" : volume.status === "Elevated" ? "meningkat" : "ekstrem"}.`,
        challengingEvidence: volume.status === "Normal" ? "Volume masih berada dalam rentang pembanding." : "Kenaikan volume sendiri tidak mengidentifikasi penyebab atau arah eksposur.",
        insufficientWhen: "Pembanding kurang dari 30 pengamatan, MAD nol, atau median nilai harian di bawah batas likuiditas.",
        nextQuestion: "Apakah anomali volume bertahan dan muncul setelah pemicu?",
      },
      metrics: [
        { label: "Skor z tahan pencilan", value: volume.robustZ === null ? "Belum tersedia" : volume.robustZ.toFixed(2), citations: dailyCitations },
        { label: "Volume terbaru", value: compact(currentPoint.volume), citations: dailyCitations },
        { label: "Pembanding", value: windowLabel(), citations: dailyCitations },
      ], citations: dailyCitations,
      calculation: {
        name: "Anomali volume tahan pencilan",
        formula: `robust z = 0,6745 × (Vₜ − median(Vₙ)) / MAD(Vₙ), n = ${windowBaselineCount()} sesi pembanding`,
        substitution: `0,6745 × (${compact(currentPoint.volume)} − ${compact(baselineMedian)}) / ${compact(baselineMad)}`,
        result: volume.robustZ === null ? "Data belum cukup" : `${volume.robustZ.toFixed(2)} · ${volume.status === "Normal" ? "Normal" : volume.status === "Elevated" ? "Meningkat" : "Ekstrem"}`,
        notes: [`Pembanding memakai ${windowBaselineCount()} pengamatan sebelum hari terbaru dalam rekaman ${windowLabel()}.`, "Batas likuiditas minimum Rp10 miliar median nilai harian.", "MAD nol atau pembanding pendek menghasilkan data belum cukup."],
      },
    },
    {
      key: "momentum", label: "Momentum", status: momentum.status,
      summary: `Imbal hasil 3 hari ${percent(stockReturn)}; residual terhadap IHSG ${percent(momentum.residual)}.`,
      protocol: {
        claim: "Perubahan harga tidak cukup dijelaskan oleh IHSG atau pergerakan sektor pada jendela yang sama.",
        supportingEvidence: `Residual setelah penyesuaian beta ${percent(momentum.residual)}; imbal hasil saham ${percent(stockReturn)} dibanding sektor ${percent(fixture.sectorReturn)}.`,
        challengingEvidence: momentum.status === "Idiosyncratic" ? "Beta rekaman dan jendela tiga hari belum mengisolasi seluruh faktor pasar." : "Penjelasan pasar atau sektor masih relevan.",
        insufficientWhen: "Harga penutupan, IHSG, beta, atau pembanding sektor tidak tersedia untuk jendela yang sama.",
        nextQuestion: "Apakah residual tetap terlihat pada jendela alternatif tanpa bergantung pada satu hari ekstrem?",
      },
      metrics: [
        { label: "Imbal hasil 3 hari", value: percent(stockReturn), citations: momentumCitations },
        { label: "Imbal hasil IHSG", value: percent(marketReturn), citations: momentumCitations },
        { label: "Residual setelah beta", value: percent(momentum.residual), citations: momentumCitations },
        { label: "Imbal hasil sektor", value: percent(fixture.sectorReturn), citations: momentumCitations },
      ], citations: momentumCitations,
      calculation: {
        name: "Momentum relatif pasar",
        formula: "residual₃ᴅ = return saham₃ᴅ − β × return IHSG₃ᴅ",
        substitution: `${percent(stockReturn)} − ${fixture.beta.toFixed(2)} × ${percent(marketReturn)}`,
        result: `${percent(momentum.residual)} · ${momentum.status === "Market-aligned" ? "Mengikuti pasar" : momentum.status === "Sector-led" ? "Dipengaruhi sektor" : momentum.status === "Idiosyncratic" ? "Khusus emiten" : "Bercampur"}; pembanding sektor ${percent(fixture.sectorReturn)}`,
        notes: ["Imbal hasil dihitung dari harga penutupan tiga hari bursa.", "Beta dihitung dari data rekaman dan tidak dihitung ulang oleh asisten.", "Status sektor membandingkan selisih imbal hasil saham terhadap sektor."],
      },
    },
    {
      key: "catalyst", label: "Katalis", status: catalystDirection,
      summary: primaryEvent
        ? `${primaryEvent.title}. Jalur utama: ${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.path ?? "Belum terverifikasi"}.`
        : "Belum ada peristiwa dengan jalur dampak terverifikasi.",
      protocol: {
        claim: "Pemicu mendahului perubahan dan memiliki jalur eksposur emiten yang dapat diuji.",
        supportingEvidence: primaryEvent ? `${relatedEvents.length} masukan terhubung; jalur utama ${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.path ?? "belum lengkap"}.` : "Belum ada masukan terhubung.",
        challengingEvidence: primaryEvent ? "Waktu dan jalur eksposur belum membuktikan sebab akibat tanpa indikator operasional berikutnya." : "Tidak ada pemicu terverifikasi dalam rekaman 11 Sep 2026.",
        insufficientWhen: "Sumber, waktu publikasi, eksposur emiten, atau indikator yang diharapkan tidak dapat diperiksa.",
        nextQuestion: "Indikator operasional atau keuangan apa yang harus muncul, dan kapan, bila jalur ini benar?",
      },
      metrics: [
        { label: "Peristiwa terhubung", value: String(relatedEvents.length), citations: catalystCitations.length ? catalystCitations : [citations.empty(symbol)] },
        { label: "Arah utama", value: catalystDirection === "Supported" ? "Mendukung" : catalystDirection === "Adverse" ? "Berlawanan" : catalystDirection === "Mixed" ? "Bercampur" : "Belum terverifikasi", citations: catalystCitations.length ? catalystCitations : [citations.empty(symbol)] },
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
      : "Data rekaman 11 Sep 2026 belum cukup untuk menghubungkan perilaku pasar dengan dampak bisnis.";
  assertSafeOutput(thesis);
  const hypotheses = createTrace(symbol, pillars, relatedEvents);
  const sources = uniqueCitations(pillars.flatMap((pillar) => pillar.citations));

  const contradictions = pillars.flatMap((pillar) => pillar.conflict ? [pillar.conflict] : []);
  const primaryLink = primaryEvent?.impactLinks.find((link) => link.symbol === symbol);
  const defaultMandate = `Periksa perubahan ${symbol}: uji apakah pemicu, arus, aktivitas, dan momentum saling menguatkan serta tentukan bukti pembatalnya.`;
  const mandate = context?.mandate?.trim() || defaultMandate;
  const appliedRules = compilePlaybook(symbol, context);
  const clarification = createClarification(symbol, mandate, context?.clarificationChoice);
  const selectedFocus = clarification.options.find((option) => option.id === clarification.selectedOptionId)?.focus;
  const researchPlan = createResearchPlan(symbol, mandate, ordered, selectedFocus, context);
  const businessImpactCitations = uniqueCitations([
    ...fixture.financialContext.flatMap((item) => item.citations),
    ...sources,
  ]);
  const businessImpact = createBusinessImpact(researchPlan.focus, symbol, businessImpactCitations);
  const relevanceFloor = relevanceFloorFor(context?.playbook);
  const materiality = primaryLink && primaryLink.relevance >= relevanceFloor ? "High" as const : primaryLink ? "Medium" as const : "Low" as const;
  const primaryBusinessImpact = businessImpact.find((item) => item.status === "Primary test") ?? businessImpact[0];
  const researchDisposition = createResearchDisposition(evidenceState, materiality, primaryBusinessImpact, contradictions);
  const materialityRule = appliedRules.find((rule) => rule.kind === "materiality")?.rule
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
      baseline: `Volume ${volumeRatio.toFixed(2)}× median ${windowBaselineCount()} sesi. Imbal hasil 3 hari ${percent(stockReturn)} dibanding sektor ${percent(fixture.sectorReturn)}.`,
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
    counterEvidence: ordered.map((pillar) => `${pillar.label}: ${pillar.protocol.challengingEvidence}`),
    userNotes: [],
    unresolvedQuestions: [
      ...ordered.map((pillar) => pillar.protocol.nextQuestion),
      "Apakah ada perubahan penting pada eksposur emiten yang belum tercakup rekaman 11 Sep 2026?",
    ],
    nextResearchActions: [
      "Periksa indikator yang diharapkan pada keterbukaan atau data keuangan berikutnya.",
      "Ulangi pemeriksaan konflik setelah jendela peristiwa berakhir.",
    ],
    sourcePlan: researchPlan.sourcePlan,
    clarificationGate: researchPlan.clarificationGate,
    clarification,
    lifecycle: [
      { key: "mandate", label: "Pertanyaan", state: "complete" },
      { key: "decompose", label: "Tentukan fokus", state: clarification.required ? "blocked" : "complete" },
      { key: "source-plan", label: "Pilih sumber", state: clarification.required ? "blocked" : "complete" },
      { key: "evidence", label: "Uji bukti", state: clarification.required ? "blocked" : "complete" },
      { key: "review", label: "Tentukan tindakan", state: clarification.required ? "blocked" : "active" },
    ],
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
    missingEvidence: [
      "Data dalam hari perdagangan dan antrean pesanan tidak tersedia.",
      "Transaksi pihak terafiliasi belum diidentifikasi.",
      "Rekaman 11 Sep 2026 tidak memuat detail kontrak atau lindung nilai emiten.",
    ],
    priceSeries: series,
    financialContext: fixture.financialContext,
    asOf: company.asOf,
  };
}

function findSymbols(question: string): SymbolCode[] {
  const symbols = fixtureMarketDataProvider.listCompanies().map((company) => company.symbol);
  const upper = question.toUpperCase();
  return symbols.filter((symbol) => upper.includes(symbol));
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
  // Whole-word on both sides: naive substring fires on "belum" inside
  // "sebelumnya" and hijacks unrelated questions into event-impact.
  // Tokenize the title the same way as the question before comparing.
  return words.length
    ? events.find((event) => {
      const titleWords = new Set(event.title.toLowerCase().split(/[^a-z0-9]+/).filter((word) => word.length > 4));
      return words.some((word) => titleWords.has(word));
    })
    : undefined;
}

function relevantInsights(insights: UserInsight[] | undefined, symbol?: SymbolCode): UserInsight[] {
  if (!symbol) return [];
  return (insights ?? []).filter((insight) => insight.symbol === symbol && insight.status !== "dismissed");
}

function insightTraces(insights: UserInsight[]): HypothesisTrace[] {
  const pillarLabels: Record<string, string> = {
    concentration: "Konsentrasi",
    volume: "Volume",
    momentum: "Momentum",
    catalyst: "Katalis",
  };
  return insights.map((insight) => ({
    id: insight.id,
    hypothesis: `Catatan pengguna meminta pemeriksaan ulang${insight.pillar ? ` pada pilar ${pillarLabels[insight.pillar] ?? insight.pillar}` : ""}.`,
    query: "Bandingkan catatan pengguna dengan sumber produksi sebelum menggabungkannya.",
    verification: "Belum diverifikasi. Catatan disimpan sebagai hipotesis personal, bukan fakta pasar.",
    outcome: "open",
    citations: [],
  }));
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
async function rewriteWithLlm(question: string, deterministicText: string): Promise<string> {
  if (agentMode() !== "llm") return deterministicText;
  try {
    const evidenceNumbers = [...new Set(deterministicText.match(/-?\d[\d.,]*%?/g) ?? [])];
    const draft = await Promise.race([
      composeAnswerWithLlm({ question, evidenceSummary: deterministicText, evidenceNumbers }),
      new Promise<never>((_, reject) => setTimeout(() => reject(new Error("LLM answer timeout")), LLM_ANSWER_TIMEOUT_MS)),
    ]);
    return draft.text;
  } catch {
    return deterministicText;
  }
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
      if (question.includes("transmisi") || question.includes("bisnis") || question.includes("katalis")) {
        const firstImpact = first.businessImpact.find((item) => item.status === "Primary test") ?? first.businessImpact[0];
        const secondImpact = second.businessImpact.find((item) => item.status === "Primary test") ?? second.businessImpact[0];
        const firstCatalyst = first.pillars.find((pillar) => pillar.key === "catalyst")!;
        const secondCatalyst = second.pillars.find((pillar) => pillar.key === "catalyst")!;
        return {
          text: await rewriteWithLlm(request.question, `${symbols[0]} menguji dampak ke ${firstImpact.label.toLowerCase()} dengan status katalis ${firstCatalyst.summary}. Tindakan risetnya ${first.researchDisposition.label.toLowerCase()}. ${symbols[1]} menguji dampak ke ${secondImpact.label.toLowerCase()} dengan status katalis ${secondCatalyst.summary}. Tindakan risetnya ${second.researchDisposition.label.toLowerCase()}. Perbedaan ini adalah objek riset, bukan skor daya tarik.`),
          refused: false, intent: "compare", hypotheses: [...first.hypotheses.slice(0, 1), ...second.hypotheses.slice(0, 1)],
          citations: uniqueCitations([...firstCatalyst.citations, ...secondCatalyst.citations, ...firstImpact.citations, ...secondImpact.citations]), preferenceNote: personalizedNote(), relatedSymbols: symbols.slice(0, 2),
        };
      }
      const firstPillar = first.pillars.find((pillar) => pillar.key === "concentration")!;
      const secondPillar = second.pillars.find((pillar) => pillar.key === "concentration")!;
      return {
        text: await rewriteWithLlm(request.question, `${symbols[0]} memiliki ${firstPillar.summary} ${symbols[1]} memiliki ${secondPillar.summary} Konflik sumber tetap ditampilkan bila asal broker dan arus asing agregat berbeda.`),
        refused: false, intent: "compare", hypotheses: [...first.hypotheses.slice(0, 1), ...second.hypotheses.slice(0, 1)],
        citations: uniqueCitations([...firstPillar.citations, ...secondPillar.citations]), preferenceNote: personalizedNote(), relatedSymbols: symbols.slice(0, 2),
      };
    }
  }

  const event = eventFromQuestion(request.question);
  if (event || question.includes("berita") || question.includes("dampak")) {
    const selected = event ?? fixtureNewsProvider.listEvents()[0];
    const scoped = selected.impactLinks.filter((link) => request.profile.watchlist.includes(link.symbol));
    const direction = (value: ImpactDirection) => value === "Supported" ? "Mendukung" : value === "Adverse" ? "Berlawanan" : value === "Mixed" ? "Bercampur" : value === "Unrelated" ? "Tidak terkait" : "Belum terverifikasi";
    const text = scoped.length
      ? scoped.map((link) => `${link.symbol}: ${direction(link.direction)}. ${link.path}.`).join(" ")
      : "Peristiwa tersebut tidak memiliki jalur dampak ke saham pantauan aktif pada rekaman ini.";
    return { text: await rewriteWithLlm(request.question, text), refused: false, intent: "event-impact", hypotheses: openInsightTraces, citations: selected.citations, preferenceNote: personalizedNote(), relatedSymbols: scoped.map((link) => link.symbol) };
  }

  if (question.includes("belum") || question.includes("data apa") || question.includes("tidak diperiksa")) {
    return {
      text: await rewriteWithLlm(request.question, analysis ? analysis.missingEvidence.join(" ") : "Data intrahari, transaksi pihak terafiliasi, dan detail kontrak belum tersedia dalam prototipe."),
      refused: false, intent: "missing", hypotheses: [...(analysis?.hypotheses.filter((item) => item.outcome === "open") ?? []), ...openInsightTraces], citations: analysis?.sources.slice(0, 3) ?? [], preferenceNote: personalizedNote(), relatedSymbols: primary ? [primary] : [],
    };
  }

  if (analysis && (question.includes("kenapa") || question.includes("daftar") || primary)) {
    return {
      text: await rewriteWithLlm(request.question, `${analysis.company.symbol} masuk karena ${analysis.materialChange.whatChanged} Pembanding: ${analysis.materialChange.baseline} Perubahan ini penting karena ${analysis.materialChange.whyMaterial} Tindakan riset saat ini: ${analysis.researchDisposition.label}.`),
      refused: false, intent: "why-listed", hypotheses: [...analysis.hypotheses, ...openInsightTraces], citations: analysis.sources, preferenceNote: personalizedNote(), relatedSymbols: [analysis.company.symbol],
    };
  }

  return { text: "Belum ada bukti yang cukup untuk menjawab pertanyaan itu dari rekaman Catalyst 11 Sep 2026.", refused: false, intent: "unknown", hypotheses: [], citations: [], preferenceNote: personalizedNote(), relatedSymbols: [] };
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
  const graphFloor = relevanceFloorFor(options.context?.playbook);
  const confidenceFor = (relevance: number): "High" | "Medium" | "Low" => relevance >= graphFloor + 5 ? "High" : relevance >= graphFloor - 10 ? "Medium" : "Low";
  const lagFor = (event: MarketEvent) => event.category === "company" ? "0-3 sesi" : event.category === "weather" ? "0-5 sesi" : event.category === "rates" ? "5-20 sesi" : event.category === "sentiment" ? "1-5 sesi" : "1-10 sesi";
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
  const businessDimensionFor = (event: MarketEvent): BusinessImpactDimension => {
    if (event.category === "commodity") return "pricing";
    if (event.category === "rates") return "margin";
    if (event.category === "currency") return "cash-flow";
    if (event.category === "weather") return "volume";
    if (event.category === "policy") return "margin";
    if (event.category === "flows") return "valuation";
    if (event.category === "sentiment") return "valuation";
    return analysis.researchPlan.focus;
  };
  const eligible = linked.filter(({ link }) => link.relevance >= options.minRelevance).sort((a, b) => b.link.relevance - a.link.relevance);
  // Bounded, not fixed: the graph shows at most this many sources so the
  // chain stays readable, and `hiddenRelationshipCount` says exactly how many
  // stayed out. Web-watch accepts can push `linked` well past the fixture
  // count — that is what the bound is for.
  const MAX_VISIBLE_SOURCES = 6;
  const visible = eligible.slice(0, MAX_VISIBLE_SOURCES);
  const targetImpact = analysis.businessImpact.find((item) => item.status === "Primary test") ?? analysis.businessImpact[0];
  const nodes: CausalGraph["nodes"] = [{
    id: `company-${symbol}`,
    label: symbol,
    kind: "company",
    detail: `${analysis.company.name}. Titik temu seluruh jalur; bukan kesimpulan transaksi.`,
    basis: "Aggregation point",
    confidence: "High",
    lag: "Tidak berlaku",
    counterEvidence: "Emiten menghubungkan jalur, tetapi tidak membuktikan bahwa setiap masukan menyebabkan perubahan harga.",
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
      counterEvidence: "Nilai ini berasal dari rekaman 11 Sep 2026. Kejadian, waktu, dan cakupan produksi masih perlu diperiksa pada sumber langsung.", citations: event.citations,
    });
    nodes.push({
      id: mechanismId, label: mechanismLabel, kind: "mechanism", detail: `${resolvedLink.path}. ${resolvedLink.rationale}`,
      sourceType: event.sourceType, direction: resolvedLink.direction, relevance: resolvedLink.relevance,
      basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event),
      counterEvidence: resolvedLink.rationale.includes("belum") || resolvedLink.rationale.includes("harus") ? resolvedLink.rationale : "Jalur belum mengisolasi faktor pasar dan sektor lain pada jendela yang sama.", citations: resolvedLink.citations,
    });
    edges.push(
      { id: `${sourceId}-to-${mechanismId}`, from: sourceId, to: mechanismId, label: event.category, direction: link.direction, relevance: link.relevance, basis: "Reported input", confidence: confidenceFor(link.relevance), lag: lagFor(event), exposure: link.path, expectedObservable: expectedFor(event), alternativeExplanation: "Perubahan pasar atau sektor lain terjadi pada jendela yang sama.", falsificationCondition: `Jalur ditahan bila ${expectedFor(event).toLowerCase()} tidak terlihat setelah ${lagFor(event)}.`, confidenceBasis: `Relevansi ${link.relevance}/100. Sumber dan waktu tersedia, tetapi belum merupakan bukti sebab akibat.`, businessImpactDimension: businessDimensionFor(event), businessImpactImplication: `Jalur harus mencapai ${impactLabels[businessDimensionFor(event)].toLowerCase()} sebelum dianggap material.`, citations: event.citations },
      { id: `${mechanismId}-to-company-${symbol}`, from: mechanismId, to: `company-${symbol}`, label: link.direction, direction: link.direction, relevance: link.relevance, basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event), exposure: `${symbol} · ${link.path}`, expectedObservable: expectedFor(event), alternativeExplanation: "Gerak dapat berasal dari arus pasar, sektor, atau pemicu perusahaan lain yang belum tercakup.", falsificationCondition: `Hipotesis dibatalkan bila indikator perusahaan tidak muncul atau bergerak berlawanan setelah ${lagFor(event)}.`, confidenceBasis: `Jalur eksposur tertulis dan relevansi ${link.relevance}/100. Faktor lain belum sepenuhnya dipisahkan.`, businessImpactDimension: businessDimensionFor(event), businessImpactImplication: `Dampak diuji pada ${impactLabels[businessDimensionFor(event)].toLowerCase()}.`, citations: link.citations },
    );
  }

  const outcomeDirection: CausalGraph["edges"][number]["direction"] = analysis.evidenceState === "Corroborated"
    ? "Supported"
    : analysis.evidenceState === "Mixed Evidence" ? "Mixed" : "Unverified";
  const outcomeNodes = analysis.businessImpact.filter((item) => item.status === "Primary test" || item.status === "Supporting").slice(0, 3);
  for (const outcome of outcomeNodes) {
    const nodeId = `business-impact-${outcome.dimension}`;
    const confidence = outcome.status === "Primary test" && analysis.evidenceState === "Corroborated" ? "High" : "Medium";
    nodes.push({
      id: nodeId, label: `${outcome.label} · ${outcome.status === "Primary test" ? "Uji utama" : "Pendukung"}`, kind: "business-impact", detail: `${outcome.observable}. ${outcome.implication}`,
      sourceType: "financial", direction: outcomeDirection, relevance: outcome.status === "Primary test" ? 100 : 85,
      basis: "Causal hypothesis", confidence, lag: outcome.dimension === "valuation" ? "1-3 bulan" : "1-10 sesi",
      counterEvidence: `Jalur belum terkonfirmasi bila ${outcome.observable.toLowerCase()} tidak bergerak pada jendela yang dipilih.`, citations: outcome.citations,
    });
    edges.push({
      id: `company-${symbol}-to-${nodeId}`, from: `company-${symbol}`, to: nodeId,
      label: outcome.status === "Primary test" ? "uji utama" : "pendukung", direction: outcomeDirection, relevance: outcome.status === "Primary test" ? 100 : 85, basis: "Causal hypothesis", confidence, lag: outcome.dimension === "valuation" ? "1-3 bulan" : "1-10 sesi",
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

  return {
    targetSymbol: symbol,
    nodes,
    edges,
    targetObservable: targetImpact.label,
    // Hypotheses stay at three even when the graph shows more: three
    // competing claims fit in working memory, six do not.
    competingHypotheses: visible.slice(0, 3).map(({ event, link }, index) => ({
      id: `${symbol}-competing-${event.id}`,
      rank: index + 1,
      claim: `${event.title} menjelaskan perubahan ${targetImpact.label.toLowerCase()} ${symbol}.`,
      targetObservable: targetImpact.label,
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
