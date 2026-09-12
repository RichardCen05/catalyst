import { analysisFixtures, citations, demoProfiles } from "@/lib/data/fixtures";
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
  AnalysisCase,
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
      hypothesis: "Aktivitas pasar menyimpang dari baseline 45 hari bursa.",
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
      query: "Company news, filing, corporate action, macro fixture",
      verification: relatedEvents.length
        ? `${relatedEvents.length} peristiwa terhubung; timing dan jalur dampak diperiksa.`
        : "Tidak ada peristiwa terverifikasi dalam fixture.",
      outcome: relatedEvents.length ? "supported" : "open",
      citations: uniqueCitations(relatedEvents.flatMap((event) => event.citations)),
    },
  ];
}

function buildAnalysis(symbol: SymbolCode, profile: UserProfile): AnalysisCase | null {
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
        notes: ["Share dihitung dari nilai sisi akumulasi pada jendela fixture.", "Origin broker diperiksa silang dengan foreign flow agregat.", "Konflik sumber menahan kesimpulan meski konsentrasi terlihat tinggi."],
      },
    },
    {
      key: "volume", label: "Volume", status: volume.status,
      summary: volume.robustZ === null
        ? "Likuiditas atau baseline tidak cukup untuk mengklasifikasikan anomali."
        : `Volume terakhir berada pada robust z ${volume.robustZ.toFixed(2)} terhadap baseline 45 hari bursa.`,
      metrics: [
        { label: "Robust z", value: volume.robustZ === null ? "Belum tersedia" : volume.robustZ.toFixed(2), citations: dailyCitations },
        { label: "Latest volume", value: compact(currentPoint.volume), citations: dailyCitations },
        { label: "Baseline", value: "45 hari bursa", citations: dailyCitations },
      ], citations: dailyCitations,
      calculation: {
        name: "Anomali volume robust",
        formula: "robust z = 0,6745 × (Vₜ − median(V₄₅)) / MAD(V₄₅)",
        substitution: `0,6745 × (${compact(currentPoint.volume)} − ${compact(baselineMedian)}) / ${compact(baselineMad)}`,
        result: volume.robustZ === null ? "Insufficient Data" : `${volume.robustZ.toFixed(2)} · ${volume.status}`,
        notes: ["Baseline memakai 44 observasi sebelum hari terbaru dalam fixture 45 hari bursa.", "Gate likuiditas minimum Rp10 miliar median nilai harian.", "MAD nol atau baseline pendek menghasilkan Insufficient Data."],
      },
    },
    {
      key: "momentum", label: "Momentum", status: momentum.status,
      summary: `Return 3 hari ${percent(stockReturn)}; residual terhadap IHSG ${percent(momentum.residual)}.`,
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
        notes: ["Return dihitung dari close tiga hari bursa.", "Beta adalah input fixture dan tidak diestimasi ulang oleh chat.", "Status sektor membandingkan selisih return saham terhadap return sektor."],
      },
    },
    {
      key: "catalyst", label: "Katalis", status: catalystDirection,
      summary: primaryEvent
        ? `${primaryEvent.title}. Jalur utama: ${primaryEvent.impactLinks.find((link) => link.symbol === symbol)?.path ?? "Belum terverifikasi"}.`
        : "Belum ada peristiwa dengan jalur dampak terverifikasi.",
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
      : "Fixture belum cukup untuk menyimpulkan hubungan lintas pilar.";
  assertSafeOutput(thesis);
  const hypotheses = createTrace(symbol, pillars, relatedEvents);
  const sources = uniqueCitations(pillars.flatMap((pillar) => pillar.citations));

  return {
    company, evidenceState, thesis, pillars: ordered, hypotheses, sources,
    missingEvidence: [
      "Data intraday dan antrean order tidak tersedia.",
      "Transaksi pihak terafiliasi belum diidentifikasi.",
      "Fixture tidak memuat detail kontrak atau hedging perusahaan.",
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

function eventFromQuestion(question: string): MarketEvent | undefined {
  const value = question.toLowerCase();
  if (value.includes("nikel")) return fixtureNewsProvider.getEvent("evt-nickel");
  if (value.includes("rupiah")) return fixtureNewsProvider.getEvent("evt-rupiah");
  if (value.includes("suku bunga")) return fixtureNewsProvider.getEvent("evt-rate");
  if (value.includes("gas")) return fixtureNewsProvider.getEvent("evt-gas");
  if (value.includes("batu bara")) return fixtureNewsProvider.getEvent("evt-coal");
  if (value.includes("cuaca") || value.includes("hujan")) return fixtureNewsProvider.getEvent("evt-consumer");
  return undefined;
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

function preferenceNote(profile: UserProfile, insightCount = 0): string {
  const first = profile.config.pillarOrder[0];
  const collaboration = insightCount ? ` ${insightCount} catatan user terkait dimasukkan sebagai hipotesis terbuka.` : "";
  return `Urutan dimulai dari ${first}; profil ${profile.name} memilih kedalaman ${profile.config.depth}. Fakta dan ambang tidak berubah.${collaboration}`;
}

function answerFollowUp(request: ChatRequest): ChatAnswer {
  const guarded = safeLanguage(request.question);
  const symbols = findSymbols(request.question);
  const primary = symbols[0] ?? request.contextSymbol;
  const analysis = primary ? buildAnalysis(primary, request.profile) : null;
  const insights = relevantInsights(request.userInsights, primary);
  const openInsightTraces = insightTraces(insights);
  if (guarded.refused) {
    return {
      text: guarded.text, refused: true, intent: "advice",
      hypotheses: [...(analysis?.hypotheses ?? []), ...openInsightTraces], citations: analysis?.sources.slice(0, 4) ?? [],
      preferenceNote: preferenceNote(request.profile, insights.length), relatedSymbols: primary ? [primary] : [],
    };
  }

  const question = request.question.toLowerCase();
  if ((question.includes("banding") || question.includes("versus")) && symbols.length >= 2) {
    const first = buildAnalysis(symbols[0], request.profile);
    const second = buildAnalysis(symbols[1], request.profile);
    if (first && second) {
      const firstPillar = first.pillars.find((pillar) => pillar.key === "concentration")!;
      const secondPillar = second.pillars.find((pillar) => pillar.key === "concentration")!;
      return {
        text: `${symbols[0]} berstatus ${firstPillar.status} dengan ${firstPillar.metrics[0].value} pada peserta teratas. ${symbols[1]} berstatus ${secondPillar.status} dengan ${secondPillar.metrics[0].value}. Konflik sumber tetap ditampilkan bila origin broker dan foreign flow agregat berbeda.`,
        refused: false, intent: "compare", hypotheses: [...first.hypotheses.slice(0, 1), ...second.hypotheses.slice(0, 1)],
        citations: uniqueCitations([...firstPillar.citations, ...secondPillar.citations]), preferenceNote: preferenceNote(request.profile, insights.length), relatedSymbols: symbols.slice(0, 2),
      };
    }
  }

  const event = eventFromQuestion(request.question);
  if (event || question.includes("berita") || question.includes("dampak")) {
    const selected = event ?? fixtureNewsProvider.listEvents()[0];
    const scoped = selected.impactLinks.filter((link) => request.profile.watchlist.includes(link.symbol));
    const text = scoped.length
      ? scoped.map((link) => `${link.symbol}: ${link.direction}. ${link.path}.`).join(" ")
      : "Peristiwa tersebut tidak memiliki jalur dampak ke watchlist aktif pada fixture ini.";
    return { text, refused: false, intent: "event-impact", hypotheses: openInsightTraces, citations: selected.citations, preferenceNote: preferenceNote(request.profile, insights.length), relatedSymbols: scoped.map((link) => link.symbol) };
  }

  if (question.includes("belum") || question.includes("data apa") || question.includes("tidak diperiksa")) {
    return {
      text: analysis ? analysis.missingEvidence.join(" ") : "Data intraday, transaksi pihak terafiliasi, dan detail kontrak belum tersedia dalam prototype.",
      refused: false, intent: "missing", hypotheses: [...(analysis?.hypotheses.filter((item) => item.outcome === "open") ?? []), ...openInsightTraces], citations: analysis?.sources.slice(0, 3) ?? [], preferenceNote: preferenceNote(request.profile, insights.length), relatedSymbols: primary ? [primary] : [],
    };
  }

  if (analysis && (question.includes("kenapa") || question.includes("daftar") || primary)) {
    return {
      text: `${analysis.company.symbol} masuk karena status bukti ${analysis.evidenceState}. ${analysis.thesis} Pilar pertama mengikuti profil Anda: ${analysis.pillars[0].label}.`,
      refused: false, intent: "why-listed", hypotheses: [...analysis.hypotheses, ...openInsightTraces], citations: analysis.sources, preferenceNote: preferenceNote(request.profile, insights.length), relatedSymbols: [analysis.company.symbol],
    };
  }

  return { text: "Belum ada bukti yang cukup untuk menjawab pertanyaan itu dari fixture Catalyst.", refused: false, intent: "unknown", hypotheses: [], citations: [], preferenceNote: preferenceNote(request.profile, insights.length), relatedSymbols: [] };
}

function buildCausalGraph(
  symbol: SymbolCode,
  profile: UserProfile,
  options: { scope: "watchlist" | "market"; minRelevance: number },
): CausalGraph | null {
  const analysis = buildAnalysis(symbol, profile);
  if (!analysis || (options.scope === "watchlist" && !profile.watchlist.includes(symbol))) return null;
  const linked = fixtureNewsProvider.listEvents().flatMap((event) => {
    const link = event.impactLinks.find((item) => item.symbol === symbol);
    return link ? [{ event, link }] : [];
  });
  const confidenceFor = (relevance: number): "High" | "Medium" | "Low" => relevance >= 90 ? "High" : relevance >= 75 ? "Medium" : "Low";
  const lagFor = (event: MarketEvent) => event.category === "company" ? "0-3 sesi" : event.category === "weather" ? "0-5 sesi" : "1-10 sesi";
  const eligible = linked.filter(({ link }) => link.relevance >= options.minRelevance).sort((a, b) => b.link.relevance - a.link.relevance);
  const visible = eligible.slice(0, 3);
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
    const sourceId = `source-${event.id}`;
    const mechanismId = `mechanism-${event.id}-${symbol}`;
    const mechanismLabel = link.path.split(/→|->/)[1]?.trim() ?? "Jalur eksposur";
    nodes.push({
      id: sourceId, label: event.title, kind: "source", detail: event.summary,
      sourceType: event.sourceType, direction: link.direction, relevance: link.relevance,
      basis: "Reported input", confidence: confidenceFor(link.relevance), lag: lagFor(event),
      counterEvidence: "Nilai ini berasal dari fixture. Kejadian, waktu, dan cakupan produksi masih perlu diverifikasi pada sumber langsung.", citations: event.citations,
    });
    nodes.push({
      id: mechanismId, label: mechanismLabel, kind: "mechanism", detail: `${link.path}. ${link.rationale}`,
      sourceType: event.sourceType, direction: link.direction, relevance: link.relevance,
      basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event),
      counterEvidence: link.rationale.includes("belum") || link.rationale.includes("harus") ? link.rationale : "Jalur belum mengisolasi faktor pasar dan sektor lain pada jendela yang sama.", citations: link.citations,
    });
    edges.push(
      { id: `${sourceId}-to-${mechanismId}`, from: sourceId, to: mechanismId, label: event.category, direction: link.direction, relevance: link.relevance, basis: "Reported input", confidence: confidenceFor(link.relevance), lag: lagFor(event), citations: event.citations },
      { id: `${mechanismId}-to-company-${symbol}`, from: mechanismId, to: `company-${symbol}`, label: link.direction, direction: link.direction, relevance: link.relevance, basis: "Causal hypothesis", confidence: confidenceFor(link.relevance), lag: lagFor(event), citations: link.citations },
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
      label: "observed", direction, relevance: 100, basis: "Observed correlation", confidence: pillar.conflict ? "Low" : "High", lag: "Jendela analisis", citations: pillar.citations,
    });
  }

  return {
    targetSymbol: symbol,
    nodes,
    edges,
    hiddenRelationshipCount: linked.length - visible.length,
    asOf: analysis.asOf,
  };
}

export const agentEngine: AgentEngine = {
  analyzeCompany: (symbol, profile) => buildAnalysis(symbol.toUpperCase() as SymbolCode, profile),
  mapEventImpact: (eventId, profile, scope) => {
    const event = fixtureNewsProvider.getEvent(eventId);
    if (!event) return null;
    const impactLinks = event.impactLinks
      .filter((link) => scope === "market" || profile.watchlist.includes(link.symbol))
      .sort((a, b) => b.relevance - a.relevance);
    return { ...event, impactLinks };
  },
  answerFollowUp,
  buildCausalGraph: (symbol, profile, options) => buildCausalGraph(symbol.toUpperCase() as SymbolCode, profile, options),
};

export const defaultProfile = demoProfiles[0];
