import { SYMBOL_CODES } from "@/lib/data/symbols.generated";
import { uiLabel } from "@/lib/ui-labels";
import type {
  AnalysisCase,
  CausalEdge,
  CausalGraph,
  CausalNode,
  Citation,
  InvestorResearchPlaybook,
  PillarKey,
  PillarResult,
  UserProfile,
} from "@/lib/types";

/**
 * The deterministic material behind the case-shaped chat answers.
 *
 * Every sentence here is a field of the case read back with a label in front
 * of it: a status, a summary, a counter-evidence line, an indicator. Nothing
 * interprets. When the model layer is on, this is what it rewrites into four
 * sentences and what the verifier checks the rewrite against; when it is off,
 * the reader gets these lines as they are, which is why each one carries its
 * value rather than the name of the panel it sits in.
 *
 * Kept out of `engine.ts` so the handlers there stay routing and nothing
 * else. Nothing here imports the engine, so there is no cycle to manage.
 */

export interface CaseAnswerMaterial {
  text: string;
  citations: Citation[];
}

function sentence(value: string): string {
  const trimmed = value.trim();
  return /[.!?…]$/.test(trimmed) ? trimmed : `${trimmed}.`;
}

function pillar(analysis: AnalysisCase, key: PillarKey): PillarResult | undefined {
  return analysis.pillars.find((item) => item.key === key);
}

/** One pillar as a reader sees it: name, status, summary, and its figures. */
function pillarLine(item: PillarResult, withMetrics: boolean): string {
  const figures = withMetrics && item.metrics.length
    ? ` ${item.metrics.map((metric) => `${metric.label} ${metric.value}`).join("; ")}.`
    : "";
  return `${item.label} (${uiLabel(item.status)}): ${sentence(item.summary)}${figures}`;
}

function uniqueCitations(citations: Citation[]): Citation[] {
  return [...new Map(citations.map((citation) => [citation.id, citation])).values()];
}

function impactLabels(analysis: AnalysisCase, status: AnalysisCase["businessImpact"][number]["status"]): string[] {
  return analysis.businessImpact.filter((item) => item.status === status).map((item) => item.label.toLowerCase());
}

function statusLine(analysis: AnalysisCase): string {
  return `Status bukti ${analysis.company.symbol}: ${uiLabel(analysis.evidenceState)}. ${sentence(analysis.thesis)}`;
}

function dispositionLine(analysis: AnalysisCase): string {
  return `Tindakan riset: ${analysis.researchDisposition.label}. ${sentence(analysis.researchDisposition.reason)}`;
}

/**
 * "Berapa bagian karena sektor, berapa karena berita?" asks for the split, so
 * it comes first: the move less what the index explains through beta, with
 * the sector beside it, then what the remainder is not yet — a move the
 * trigger has been shown to cause. Both lines are the case's own
 * calculation and counter-evidence, read back.
 */
function splitLines(analysis: AnalysisCase, catalyst: PillarResult | undefined): string[] {
  const calculation = pillar(analysis, "momentum")?.calculation;
  if (!calculation) return [];
  const residual = calculation.result.split(" · ")[0];
  return [
    `Uraian gerak: ${calculation.formula}; ${calculation.substitution} = ${calculation.result}.`,
    catalyst
      ? `Bagian di luar IHSG (${residual}) belum terbukti berasal dari pemicu: ${sentence(catalyst.protocol.challengingEvidence)}`
      : `Bagian di luar IHSG (${residual}) belum punya peristiwa terhubung yang dapat diuji.`,
  ];
}

/**
 * "Turun karena berita atau ikut sektor?"
 *
 * The case already holds both halves of the answer: the market layer says
 * whether the move follows the sector, the business layer says what the
 * trigger is and how far its path has been tested. Read side by side, with
 * what still argues against a cause, which is the part a reader most needs
 * and the part a single-metric glossary card never carried.
 */
export function attributionMaterial(analysis: AnalysisCase): CaseAnswerMaterial {
  const market = (["momentum", "volume"] as PillarKey[]).map((key) => pillar(analysis, key)).filter((item): item is PillarResult => Boolean(item));
  const catalyst = pillar(analysis, "catalyst");
  const primary = impactLabels(analysis, "Primary test");
  const open = impactLabels(analysis, "Open");
  const lines = [
    statusLine(analysis),
    ...splitLines(analysis, catalyst),
    `Pembanding pasar: ${sentence(analysis.materialChange.baseline)}`,
    ...market.map((item) => pillarLine(item, true)),
    ...(catalyst ? [pillarLine(catalyst, true)] : []),
    ...(primary.length ? [`Uji utama dampak bisnis: ${primary.join(", ")}.`] : []),
    ...(open.length ? [`Belum diuji: ${open.join(", ")}.`] : []),
    `Bukti penyangkal: ${[...market, ...(catalyst ? [catalyst] : [])].map((item) => sentence(item.protocol.challengingEvidence)).join(" ")}`,
    dispositionLine(analysis),
  ];
  return {
    text: lines.join("\n"),
    citations: uniqueCitations([...market, ...(catalyst ? [catalyst] : [])].flatMap((item) => item.citations)),
  };
}

/** "Kenapa statusnya bukti bercampur?" — the two layers, each with its pillars. */
export function statusMaterial(analysis: AnalysisCase): CaseAnswerMaterial {
  const layers = analysis.evidenceLayers.map((layer) => {
    const members = layer.pillarKeys.map((key) => pillar(analysis, key)).filter((item): item is PillarResult => Boolean(item));
    return `${layer.label}: ${members.map((item) => pillarLine(item, false)).join(" ")}`;
  });
  return {
    text: [statusLine(analysis), ...layers, dispositionLine(analysis)].join("\n"),
    citations: uniqueCitations(analysis.pillars.flatMap((item) => item.citations)),
  };
}

/**
 * The reader's own rules, in the words they wrote them — the general ones and
 * the ones about this case. A rule naming only other emiten ("BBRI: arus
 * asing …") belongs to their cases; read back here it put five other issuers
 * into an answer about PGAS.
 */
function playbookRules(playbook: InvestorResearchPlaybook | undefined, symbol: string): string[] {
  if (!playbook) return [];
  const others = SYMBOL_CODES.filter((code) => code !== symbol);
  const concerns = (rule: string) => {
    const upper = rule.toUpperCase();
    const names = (code: string) => new RegExp(`\\b${code}\\b`).test(upper);
    return names(symbol) || !others.some(names);
  };
  return [
    ...playbook.falsifiers.filter(Boolean).map((rule) => `Kondisi pembatal Anda: ${sentence(rule)}`),
    ...playbook.thesisAssumptions.filter(Boolean).map((rule) => `Asumsi tesis Anda: ${sentence(rule)}`),
    ...playbook.materialityRules.filter(Boolean).map((rule) => `Aturan materialitas Anda: ${sentence(rule)}`),
    ...playbook.knownExposures.filter(Boolean).map((rule) => `Eksposur yang Anda catat: ${sentence(rule)}`),
  ].filter(concerns);
}

/**
 * "Apa yang bisa membatalkan dugaan ini?" and "indikator apa yang dipantau?"
 *
 * Both are answered from the same panels: the counter-evidence per pillar,
 * the business tests still standing, the questions nobody has answered yet,
 * and the condition that reopens the case. The reader's own falsifiers come
 * last, quoted, because they are theirs and not the recordings'.
 */
export function falsifierMaterial(analysis: AnalysisCase, playbook?: InvestorResearchPlaybook): CaseAnswerMaterial {
  const primary = analysis.businessImpact.filter((item) => item.status === "Primary test");
  const open = impactLabels(analysis, "Open");
  const lines = [
    `Bukti penyangkal ${analysis.company.symbol}: ${analysis.counterEvidence.map(sentence).join(" ")}`,
    ...(primary.length ? [`Uji utama: ${primary.map((item) => `${item.label.toLowerCase()} (${item.observable.toLowerCase()})`).join("; ")}.`] : []),
    ...(open.length ? [`Belum diuji: ${open.join(", ")}.`] : []),
    `Pertanyaan yang belum terjawab: ${analysis.unresolvedQuestions.join(" ")}`,
    `Indikator yang dipantau: ${sentence(analysis.researchDisposition.monitorObservable)} ${sentence(analysis.researchDisposition.reopenWhen)}`,
    ...playbookRules(playbook, analysis.company.symbol),
  ];
  return {
    text: lines.join("\n"),
    citations: uniqueCitations(analysis.pillars.flatMap((item) => item.citations)),
  };
}

/** Two cases, the same fields each: status, action, trigger, and all pillars. */
export function compareMaterial(first: AnalysisCase, second: AnalysisCase): CaseAnswerMaterial {
  const side = (analysis: AnalysisCase) => [
    `${analysis.company.symbol}: ${uiLabel(analysis.evidenceState)}, tindakan riset ${analysis.researchDisposition.label}. Pemicu: ${sentence(analysis.trigger.title)}`,
    `${analysis.company.symbol} pembanding pasar: ${sentence(analysis.materialChange.baseline)}`,
    ...analysis.pillars.map((item) => `${analysis.company.symbol} ${pillarLine(item, false)}`),
    ...(impactLabels(analysis, "Primary test").length ? [`${analysis.company.symbol} uji utama: ${impactLabels(analysis, "Primary test").join(", ")}.`] : []),
  ].join("\n");
  return {
    text: `${side(first)}\n${side(second)}\nPerbedaan ini adalah objek riset, bukan skor daya tarik.`,
    citations: uniqueCitations([...first.pillars, ...second.pillars].flatMap((item) => item.citations)),
  };
}

/**
 * "Sesuai aturan saya, apa yang dicek dulu?"
 *
 * The order is the reader's pillar order, the rules are the ones they wrote.
 * An empty Playbook is said out loud rather than papered over with defaults:
 * the question is about their rules, and there are none yet.
 */
export function playbookMaterial(
  analysis: AnalysisCase,
  profile: UserProfile,
  playbook: InvestorResearchPlaybook | undefined,
): CaseAnswerMaterial {
  const ordered = profile.config.pillarOrder
    .map((key) => pillar(analysis, key))
    .filter((item): item is PillarResult => Boolean(item));
  const [firstPillar, ...rest] = ordered;
  const rules = playbookRules(playbook, analysis.company.symbol);
  const applied = analysis.appliedRules.map((rule) => `Aturan yang diterapkan pada kasus ini: ${sentence(rule.rule)} ${sentence(rule.effect)}`);
  const lines = [
    ...(rules.length
      ? rules
      : ["Aturan pribadi belum ditulis di Playbook. Tulis kondisi pembatal dan asumsi tesis di Playbook agar pemeriksaan mengikuti aturan Anda sendiri."]),
    ...(firstPillar
      ? [
        `Urutan pemeriksaan Anda dimulai dari ${firstPillar.label}. ${pillarLine(firstPillar, true)} Bukti penyangkal: ${sentence(firstPillar.protocol.challengingEvidence)}`,
        ...(rest.length ? [`Sesudahnya: ${rest.map((item) => item.label).join(", ")}.`] : []),
      ]
      : []),
    ...applied,
  ];
  return {
    text: lines.join("\n"),
    citations: uniqueCitations((firstPillar ? [firstPillar] : analysis.pillars).flatMap((item) => item.citations)),
  };
}

/**
 * "Tanya jalur ini" from a node on the causal map.
 *
 * The node and every edge touching it, read back with the parts the map only
 * shows on hover: what exposure the path assumes, what should be observed if
 * it holds, what else could explain it, and what would falsify it.
 */
export function causalPathMaterial(graph: CausalGraph, node: CausalNode): CaseAnswerMaterial {
  const edges = graph.edges.filter((edge) => edge.from === node.id || edge.to === node.id);
  const nodeLine = [
    `Jalur ${node.label} (${uiLabel(node.kind)}) untuk ${graph.targetSymbol}: ${sentence(node.detail)}`,
    [
      node.direction ? `arah ${uiLabel(node.direction)}` : "",
      node.relevance !== undefined ? `relevansi ${node.relevance}/100` : "",
      `dasar ${uiLabel(node.basis)}`,
      `keyakinan ${uiLabel(node.confidence)}`,
      node.lag ? `jeda ${node.lag}` : "",
    ].filter(Boolean).join(", ") + ".",
  ].join(" ");
  // An edge's own label is its category ("company"); the reader knows the
  // card at the other end by its title.
  const labelOf = new Map(graph.nodes.map((item) => [item.id, item.label]));
  const edgeLine = (edge: CausalEdge) => [
    `Tautan ke ${labelOf.get(edge.from === node.id ? edge.to : edge.from) ?? edge.label}: eksposur ${sentence(edge.exposure)}`,
    `Indikator yang diharapkan: ${sentence(edge.expectedObservable)}`,
    `Penjelasan lain: ${sentence(edge.alternativeExplanation)}`,
    `Pembatal: ${sentence(edge.falsificationCondition)}`,
  ].join(" ");
  return {
    text: [nodeLine, ...(node.supportingEvidence ? [`Bukti pendukung: ${sentence(node.supportingEvidence)}`] : []), ...edges.slice(0, 2).map(edgeLine), `Bukti penyangkal: ${sentence(node.counterEvidence)}`].join("\n"),
    citations: uniqueCitations([...node.citations, ...edges.flatMap((edge) => edge.citations)]),
  };
}
