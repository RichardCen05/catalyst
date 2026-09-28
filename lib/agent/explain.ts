import { phraseMatches } from "@/lib/text/fuzzy";
import { RELEVANCE_BAND_SCORE } from "@/lib/agent/thresholds";
import { signedPercent } from "@/lib/utils";
import type { AnalysisCase, Citation, MetricValue, PillarResult } from "@/lib/types";

export { phraseMatches };

/**
 * Turn a citation and a metric into something a reader can actually check.
 *
 * The chat used to answer a provenance question with the raw claim:
 * `/v2/broker-summary/ANTM/top/ (broker_code, buy_idr, sell_idr, net_idr)`.
 * That is precise and unreadable. A reader who does not write HTTP requests
 * learns nothing from it, and "27,5% came from broker_code, buy_idr" is not
 * an answer to "where did this number come from" — it is the same question
 * in a different notation.
 *
 * So every answer here has three parts, in this order: what the figure
 * means, which recording it was read from in plain words, and the
 * arithmetic that turned that recording into this number. The endpoint and
 * field list still travel, last, marked as the technical detail — they are
 * the audit trail, and removing them would trade one kind of opacity for
 * another.
 */

/**
 * What a figure means is written at request time by the model
 * (lib/agent/llm/metric-gloss.ts), not kept as a table here. The table that
 * used to sit at this line carried a worked example with a literal figure in
 * it, under the real number. A rejected or absent draft renders nothing: the
 * explanation states the value, the recording, and the arithmetic, and simply
 * omits the meaning line rather than filling it with prose it cannot support.
 *
 * What stays without the model is not prose at all: the columns the figure
 * reads, glossed through FIELD_GLOSS, wrapped in one shape that is true of
 * every metric. A reader always learns what was measured; only the plain-words
 * reading of it depends on a draft that passed verification.
 */

/** The measurement in registry terms — columns, not interpretation. */
function meaningFromRecording(fields: string, hasFormula: boolean): string | undefined {
  const glossed = glossField(fields);
  if (!glossed) return undefined;
  return hasFormula
    ? `dihitung dari ${glossed} pada jendela rekaman.`
    : `nilai ${glossed} yang dibaca langsung dari rekaman.`;
}

/** Response keys, in words. A reader who sees `net_foreign_inflow` in a
 *  citation should not have to guess what was measured. */
const FIELD_GLOSS: Record<string, string> = {
  date: "tanggal",
  close: "harga penutupan",
  open: "harga pembukaan",
  volume: "volume lembar",
  price: "harga indeks",
  symbol: "kode saham",
  company_name: "nama perusahaan",
  sector: "sektor",
  sub_sector: "subsektor",
  market_cap: "kapitalisasi pasar",
  last_close_price: "harga penutupan terakhir",
  broker_code: "kode broker",
  buy_idr: "nilai beli (rupiah)",
  sell_idr: "nilai jual (rupiah)",
  net_idr: "nilai beli bersih (rupiah)",
  code: "kode broker",
  is_foreign: "penanda broker asing",
  net_foreign_inflow: "arus asing bersih harian",
  free_float: "porsi saham publik",
  title: "judul",
  timestamp: "waktu publikasi",
  symbols: "kode saham terkait",
  dimension: "dimensi yang ditandai sumber",
  revenue: "pendapatan",
  earnings: "laba",
  financials_sector_metrics: "metrik khusus sektor",
  holder_name: "nama pemegang saham",
  holding_before: "kepemilikan sebelum",
  holding_after: "kepemilikan sesudah",
  transaction_value: "nilai transaksi",
  publishedAt: "waktu publikasi",
  tags: "tanda yang diberikan sumber",
  name: "nama komoditas",
  price_usd_per_ton: "harga acuan per ton (USD)",
  body: "isi teks sumber",
  corporate_actions: "daftar aksi korporasi",
  agm: "rapat umum pemegang saham",
  dividend: "dividen",
  right_issue: "penerbitan saham baru (rights issue)",
  stock_split: "pemecahan saham",
  bonus: "saham bonus",
  warrant: "waran",
};

export function glossField(field: string): string {
  const parts = field.split(",").map((part) => part.trim()).filter(Boolean);
  const glossed = parts.map((part) => {
    const bare = part.replace(/\s*\(.*\)$/, "");
    return FIELD_GLOSS[bare] ?? bare;
  });
  return glossed.join(", ");
}

export function formatAsOfDate(asOf: string): string {
  const parsed = new Date(asOf);
  return Number.isNaN(parsed.getTime())
    ? asOf
    : parsed.toLocaleDateString("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" });
}

/** One recording in plain words: what it is, what was read from it, when it
 *  was recorded. No path, no field names. */
export function describeSourcePlain(citation: Citation): string {
  return `${citation.label} (${glossField(citation.field)}), ${citation.provider} per ${formatAsOfDate(citation.asOf)}`;
}

/** The same recording as an auditable address. This is the line a reader
 *  takes to the provider to check the figure themselves. */
export function describeSourceTechnical(citation: Citation): string {
  return `${citation.endpoint} · ${citation.field}`;
}

/**
 * How one figure was produced — per metric, never per card.
 *
 * `pillar.calculation` describes the pillar's headline arithmetic, so quoting
 * it for any metric in that pillar states the wrong derivation. Asked how the
 * sector return is computed, the answer read
 * `residual₃ᴅ = return saham₃ᴅ − β × return IHSG₃ᴅ`, which is the residual's
 * formula and has nothing to do with a market-cap-weighted peer average. A
 * wrong formula is worse than none: it invites a reader to recompute and
 * conclude the app is broken, or to trust a derivation that never ran.
 *
 * Metrics read straight off a recording (the latest volume, the comparison
 * window) carry no formula, and say so rather than borrowing one.
 */
const METRIC_FORMULA: Record<string, string> = {
  "Porsi peserta teratas": "nilai beli broker terbesar ÷ total nilai beli 10 broker teratas",
  "HHI": "HHI = Σ (porsi nilai beli tiap broker)²",
  "Peserta efektif": "peserta efektif = 1 ÷ HHI",
  "Porsi asing": "arus asing bersih pada jendela ÷ total nilai transaksi pada jendela",
  "Saham publik terserap": "total nilai beli ÷ (jumlah saham publik × harga acuan)",
  "Aliran institusi bersih": "Σ nilai transaksi keterbukaan institusi pada jendela (pembelian positif, penjualan negatif)",
  "Pemegang terbesar berubah": "kepemilikan sesudah − kepemilikan sebelum, diambil perubahan terbesar",
  "Rasio churn broker teratas (proksi)": "(nilai beli + nilai jual) ÷ |nilai beli bersih| untuk broker yang sama",
  "Skor z tahan pencilan": "0,6745 × (volume terakhir − median volume pembanding) ÷ MAD pembanding",
  "Imbal hasil 3 hari": "(harga penutupan terakhir ÷ harga penutupan 3 hari bursa sebelumnya) − 1",
  "Imbal hasil IHSG": "(IHSG terakhir ÷ IHSG 3 hari bursa sebelumnya) − 1",
  "Residual setelah beta": "imbal hasil saham − (beta × imbal hasil IHSG)",
  "Imbal hasil sektor": "Σ (imbal hasil 3 hari emiten sektor × kapitalisasi pasarnya) ÷ Σ kapitalisasi pasar sektor",
  "Peristiwa terhubung": "jumlah peristiwa terekam yang punya jalur dampak ke emiten ini",
  "Arah utama": "arah jalur dampak peristiwa dengan relevansi tertinggi",
  "Relevansi eksposur": `peringkat yang Catalyst tetapkan saat rekaman dibangun, bukan skor dari penyedia data. Berita: filing = 95; selain itu 88 dikurangi 6 untuk setiap simbol tambahan yang disebut sumber (minimum 40), +2 bila dimensinya keuangan atau proyeksi, dibatasi 97. Aksi korporasi dari corporate-actions: dividen 92; stock split, rights issue, dan buyback 90; perubahan pengurus 88. Perubahan kepemilikan 85; arus asing bersih dan harga komoditas 80; lonjakan perhatian 55. Peristiwa dari pantauan web memakai skor pita: tinggi ${RELEVANCE_BAND_SCORE.high}, sedang ${RELEVANCE_BAND_SCORE.medium}, rendah ${RELEVANCE_BAND_SCORE.low}`,
  "Paruh awal": "0,6745 × (volume terakhir − median paruh awal) ÷ MAD paruh awal",
  "Paruh akhir": "0,6745 × (volume terakhir − median paruh akhir) ÷ MAD paruh akhir",
  "Pembanding penuh": "0,6745 × (volume terakhir − median seluruh pembanding) ÷ MAD seluruh pembanding",
  "Perubahan harga harian": "(harga penutupan terakhir ÷ harga penutupan sesi sebelumnya) − 1",
};

/** The part of a pillar's substitution line that belongs to one metric, or
 *  nothing when no segment clearly does. */
function ownSubstitution(substitution: string, label: string): string | undefined {
  const segments = substitution.split(";").map((segment) => segment.trim()).filter(Boolean);
  // Some pillars compute exactly one thing, and the substitution line is that
  // metric's in full even though it never names it — the volume z-score reads
  // "0,6745 × (…) / …". Matching on the label would drop it.
  if (segments.length === 1) return SOLE_SUBSTITUTION_OWNER.has(label) ? segments[0] : undefined;
  // Whole label before first word: "Porsi peserta teratas" and "Porsi asing"
  // share a first word, and a first-word match handed the top-participant
  // share whichever of the two the concentration line happened to list first.
  const whole = label.toLowerCase();
  const exact = segments.find((segment) => segment.toLowerCase().startsWith(whole));
  if (exact) return exact;
  const key = label.split(" ")[0].toLowerCase();
  const candidates = segments.filter((segment) => segment.toLowerCase().startsWith(key));
  return candidates.length === 1 ? candidates[0] : undefined;
}

/**
 * How one figure on a card was produced, for the card to render.
 *
 * The "Perhitungan dan data" block used to show the pillar's headline
 * arithmetic once — one formula line, one substitution list — while the row
 * of tiles above it carried five separate figures. A reader looking at
 * "Peserta efektif 7.1" had no way to learn that it is 1 ÷ HHI, because the
 * only derivation on screen belonged to the pillar, not to that tile.
 *
 * Nothing new is written here: the formula comes from the same per-metric
 * registry the assistant answers from, and the substitution slice from the
 * recorded calculation, so the block and the chat can never state different
 * derivations for the same figure.
 */
export interface MetricDerivation {
  /** How this figure is computed, in words. Absent when it is read, not computed. */
  formula?: string;
  /** The recorded numbers that went into it, when the pillar's calculation names them. */
  substitution?: string;
  /** True when the figure is copied from a recording rather than derived. */
  readDirectly: boolean;
}

export function metricDerivation(pillar: PillarResult, metric: MetricValue): MetricDerivation {
  const formula = METRIC_FORMULA[metric.label];
  return {
    formula,
    substitution: pillar.calculation && formula
      ? ownSubstitution(pillar.calculation.substitution, metric.label)
      : undefined,
    readDirectly: METRIC_READ_DIRECTLY.has(metric.label),
  };
}

/** Metrics whose pillar substitution line is theirs alone. */
const SOLE_SUBSTITUTION_OWNER = new Set(["Skor z tahan pencilan", "Residual setelah beta"]);

/** Metrics that are a recorded value or a label, not a calculation. */
const METRIC_READ_DIRECTLY = new Set(["Volume terbaru", "Pembanding", "Harga penutupan"]);

export function explainMetric(
  pillar: PillarResult,
  metric: MetricValue,
  options: { includeTechnical?: boolean; gloss?: string } = {},
): string {
  const fields = metric.citations.map((citation) => citation.field).join(", ");
  const gloss = options.gloss ?? meaningFromRecording(fields, Boolean(METRIC_FORMULA[metric.label]));
  const lines = [`${metric.label}: ${metric.value} (pilar ${pillar.label}).`];
  if (gloss) lines.push(`Arti angka ini: ${gloss}`);
  lines.push(
    metric.citations.length === 1
      ? `Dibaca dari 1 rekaman: ${describeSourcePlain(metric.citations[0])}.`
      : `Dibaca dari ${metric.citations.length} rekaman: ${metric.citations.map(describeSourcePlain).join("; ")}.`,
  );
  const formula = METRIC_FORMULA[metric.label];
  if (formula) {
    lines.push(`Cara hitung: ${formula}`);
  } else if (METRIC_READ_DIRECTLY.has(metric.label)) {
    lines.push("Cara hitung: tidak dihitung — nilai ini dibaca langsung dari rekaman.");
  }
  // Only the slice of the substitution that belongs to this metric. The
  // pillar line is a `;`-joined list covering every metric on the card, so
  // quoting it whole appended another metric's numbers to this answer — the
  // HHI explanation ended with the absorbed-float substitution.
  const substitution = pillar.calculation && formula
    ? ownSubstitution(pillar.calculation.substitution, metric.label)
    : undefined;
  if (substitution) lines.push(`Angka yang dimasukkan: ${substitution}`);
  if (options.includeTechnical !== false) {
    lines.push(`Rincian teknis untuk diperiksa: ${metric.citations.map(describeSourceTechnical).join(" | ")}`);
    lines.push(`Blok "Perhitungan dan data" pada pilar ${pillar.label} menampilkan substitusi lengkapnya.`);
  }
  return lines.join("\n");
}

/** Metric aliases a reader is likely to type, including the English terms the
 *  metric labels never use. Matching on labels alone meant "free float" and
 *  "top broker" found nothing, and the answer fell back to dumping every
 *  recording in the case. */
const METRIC_ALIASES: Record<string, string[]> = {
  "Porsi peserta teratas": ["porsi teratas", "peserta teratas", "broker teratas", "top broker", "top buyer", "top participant", "porsi terbesar", "konsentrasi teratas"],
  "HHI": ["hhi", "herfindahl", "indeks konsentrasi", "concentration index"],
  "Peserta efektif": ["peserta efektif", "partisipan efektif", "effective participants", "effective buyers"],
  "Porsi asing": ["porsi asing", "arus asing", "foreign flow", "foreign share", "asing bersih"],
  "Saham publik terserap": ["saham publik", "free float", "float", "public float", "terserap"],
  "Aliran institusi bersih": ["aliran institusi", "institusi bersih", "institutional flow", "net institutional"],
  "Pemegang terbesar berubah": ["pemegang terbesar", "pemegang saham", "largest holder", "holder"],
  "Rasio churn broker teratas (proksi)": ["churn", "rasio churn", "churn ratio"],
  "Skor z tahan pencilan": ["skor z", "z score", "robust z", "zscore", "anomali volume"],
  "Volume terbaru": ["volume terbaru", "volume terakhir", "latest volume", "volume hari ini"],
  "Imbal hasil 3 hari": ["imbal hasil 3 hari", "return 3 hari", "3 day return", "imbal hasil saham"],
  "Imbal hasil IHSG": ["ihsg", "imbal hasil ihsg", "index return", "return pasar", "market return"],
  "Residual setelah beta": ["residual", "beta", "residual beta", "alpha"],
  "Imbal hasil sektor": ["imbal hasil sektor", "return sektor", "sector return", "sektor"],
  "Peristiwa terhubung": ["peristiwa terhubung", "jumlah peristiwa", "linked events", "events"],
  "Arah utama": ["arah utama", "arah dampak", "main direction", "direction"],
  "Relevansi eksposur": ["relevansi", "relevance", "skor relevansi", "90/100"],
  "Paruh awal": ["paruh awal", "first half", "early half"],
  "Paruh akhir": ["paruh akhir", "second half", "late half"],
  "Pembanding penuh": ["pembanding penuh", "full baseline", "seluruh pembanding"],
  "Harga penutupan": ["harga penutupan", "harga terakhir", "closing price", "last price", "harga saham"],
  "Perubahan harga harian": ["perubahan harga", "change pct", "daily change", "perubahan harian"],
};

/**
 * Does this question name a recorded figure at all?
 *
 * `matchMetric` needs an analysis to read labels from, and there is none when
 * no case is in hand. The alias table alone answers the narrower question the
 * router needs: is this an answerable question that is only missing its case?
 * Exact matches only — a tolerant match here would read a metric name into
 * nonsense and ask the reader to pick a case for a question that has none.
 */
export function namesAMetric(question: string): boolean {
  const lower = question.toLowerCase();
  return Object.values(METRIC_ALIASES).some((aliases) => aliases.some((alias) => lower.includes(alias)));
}

/** Digits only, percent sign kept — so `27,5%` and `27.5%` are one figure
 *  and `27,5` is not. */
export function canonicalFigure(numeral: string): string {
  const percent = numeral.endsWith("%");
  const digits = numeral.replace(/%$/, "").replace(/[.,]/g, "");
  return percent ? `${digits}%` : digits;
}

/**
 * The metric a question is about: a figure quoted in it wins, then an alias,
 * then the label itself, then the pillar.
 *
 * Aliases are checked before labels because a reader types "free float", not
 * "Saham publik terserap", and longest-first so "porsi asing" never loses to
 * a shorter overlapping alias.
 */
export function matchMetric(
  pillars: PillarResult[],
  question: string,
  extractNumerals: (...texts: string[]) => string[],
): { pillar: PillarResult; metric: MetricValue } | undefined {
  const pairs = pillars.flatMap((pillar) => pillar.metrics.map((metric) => ({ pillar, metric })));
  const asked = extractNumerals(question).map(canonicalFigure);
  if (asked.length) {
    const byFigure = pairs.find(({ metric }) =>
      extractNumerals(metric.value).map(canonicalFigure).some((figure) => asked.includes(figure)));
    if (byFigure) return byFigure;
  }
  const lower = question.toLowerCase();
  const aliasHits = pairs
    .flatMap(({ pillar, metric }) =>
      (METRIC_ALIASES[metric.label] ?? []).filter((alias) => lower.includes(alias)).map((alias) => ({ pillar, metric, alias })))
    .sort((first, second) => second.alias.length - first.alias.length);
  if (aliasHits.length) return { pillar: aliasHits[0].pillar, metric: aliasHits[0].metric };
  const exact = pairs.find(({ metric }) => lower.includes(metric.label.toLowerCase()))
    ?? pairs.find(({ pillar }) => lower.includes(pillar.label.toLowerCase()));
  if (exact) return exact;
  const fuzzyAliases = pairs
    .flatMap(({ pillar, metric }) =>
      (METRIC_ALIASES[metric.label] ?? []).filter((alias) => phraseMatches(lower, alias)).map((alias) => ({ pillar, metric, alias })))
    .sort((first, second) => second.alias.length - first.alias.length);
  if (fuzzyAliases.length) return { pillar: fuzzyAliases[0].pillar, metric: fuzzyAliases[0].metric };
  return pairs.find(({ metric }) => phraseMatches(lower, metric.label))
    ?? pairs.find(({ pillar }) => phraseMatches(lower, pillar.label));
}

/**
 * A response key named in the question, if any.
 *
 * "what is buy_idr" is a provenance question about a column, not a figure.
 * Without this it fell through to the metric menu, which answers a question
 * the reader did not ask.
 */
export function matchFieldName(question: string): { field: string; meaning: string } | undefined {
  const lower = question.toLowerCase();
  const keys = Object.keys(FIELD_GLOSS).filter((field) => field.includes("_"));
  const hit = keys.filter((field) => lower.includes(field)).sort((first, second) => second.length - first.length)[0]
    ?? keys.filter((field) => phraseMatches(lower, field.replace(/_/g, " "))).sort((first, second) => second.length - first.length)[0];
  return hit ? { field: hit, meaning: FIELD_GLOSS[hit] } : undefined;
}

/** Every recording a case reads, de-duplicated, in plain words. The answer to
 *  "apa sumber datamu" is this list — not thirteen endpoint strings. */
export function describeCaseSources(citations: Citation[]): string {
  const seen = new Map<string, Citation>();
  for (const citation of citations) {
    if (!seen.has(citation.endpoint)) seen.set(citation.endpoint, citation);
  }
  const unique = [...seen.values()];
  const plain = unique.map((citation, index) => `${index + 1}. ${describeSourcePlain(citation)}`).join("\n");
  return `${unique.length} rekaman:\n${plain}\n\nRincian teknis untuk diperiksa: ${unique.map(describeSourceTechnical).join(" | ")}`;
}

/**
 * Every figure the case shows a reader, in one list.
 *
 * The rule this enforces: if it is on screen, the assistant can explain it.
 * Matching used to search the four pillars only, so the three signal-stability
 * scores, the quarterly financial rows and the price in the case header were
 * unanswerable — the reader could see them and the assistant would deny they
 * existed. Both sides now read this list, and `tests/ui-figure-coverage.test.ts`
 * fails if a displayed figure is missing from it.
 */
export interface AnswerableFigure {
  group: string;
  metric: MetricValue;
  /** Per-figure meaning, for figures whose explanation is recorded with them
   *  (a quarterly row carries its own interpretation). */
  gloss?: string;
  formulaOverride?: string;
  readDirectly?: boolean;
}

export function answerableFigures(analysis: AnalysisCase): AnswerableFigure[] {
  return [
    ...analysis.pillars.flatMap((pillar) =>
      pillar.metrics.map((metric) => ({ group: pillar.label, metric }))),
    ...analysis.signalStability.windows.map((metric) => ({ group: "Rekam jejak sinyal", metric })),
    // A quarterly row explains itself: `interpretation` is recorded next to
    // the number and is already written for a reader.
    ...analysis.financialContext.map((row) => ({
      group: `Data keuangan ${row.period}`,
      metric: { label: row.label, value: row.value, detail: row.period, citations: row.citations },
      gloss: row.interpretation,
      readDirectly: true,
    })),
    {
      group: "Header kasus",
      metric: {
        label: "Harga penutupan",
        value: `Rp${analysis.company.price.toLocaleString("id-ID")}`,
        citations: analysis.company.citations,
      },
      readDirectly: true,
    },
    {
      group: "Header kasus",
      metric: {
        label: "Perubahan harga harian",
        // One signed decimal, like every other percentage on screen: the
        // default toLocaleString precision printed "0%" or "-0,04%" beside
        // "−0,0%", and a rise carried no sign at all.
        value: signedPercent(analysis.company.changePct),
        citations: analysis.company.citations,
      },
    },
  ];
}

/**
 * A matched figure, and whether the question actually named it.
 *
 * `named` is false for the last resort — a pillar's group name, which covers
 * four figures and can be reached by a single loose word. The difference
 * decides whether a handler is treated as anchored in the reader's own words
 * (`lib/agent/handlers.ts`): a misspelled metric name still names that metric,
 * a group name names nothing in particular.
 */
export interface FigureMatch {
  figure: AnswerableFigure;
  named: boolean;
}

/** The figure a question is about, searched across everything on screen. */
export function matchFigure(
  figures: AnswerableFigure[],
  question: string,
  extractNumerals: (...texts: string[]) => string[],
): AnswerableFigure | undefined {
  return matchFigureWithStrength(figures, question, extractNumerals)?.figure;
}

/** The same search, reporting how the figure was reached. */
export function matchFigureWithStrength(
  figures: AnswerableFigure[],
  question: string,
  extractNumerals: (...texts: string[]) => string[],
): FigureMatch | undefined {
  const lower = question.toLowerCase();
  // A label the reader typed in full outranks a number inside it. "Imbal hasil
  // 3 hari" carries a "3", and matching numbers first answered that question
  // with whichever figure happened to contain a 3.
  const labelFirst = figures
    .filter(({ metric }) => lower.includes(metric.label.toLowerCase()))
    .sort((first, second) => second.metric.label.length - first.metric.label.length);
  if (labelFirst.length) return { figure: labelFirst[0], named: true };
  // A quoted figure has to look like a figure. A lone digit is almost always
  // part of a phrase ("3 hari", "28 hari"), not a value pasted from the page.
  const asked = extractNumerals(question).map(canonicalFigure).filter((figure) => figure.replace("%", "").length > 1);
  if (asked.length) {
    const byFigure = figures.find(({ metric }) =>
      extractNumerals(metric.value).map(canonicalFigure).some((figure) => asked.includes(figure)));
    if (byFigure) return { figure: byFigure, named: true };
  }
  // A full label beats an alias, and the longest match beats a shorter one.
  // Both orderings fix a real mismatch: "Rasio churn broker teratas (proksi)"
  // contains "broker teratas", an alias of the top-participant share, so the
  // churn question was answered with a different figure; and a case carrying
  // both "Revenue" and "Revenue QoQ" answered the QoQ question with plain
  // revenue.
  const aliasHits = figures
    .flatMap((figure) =>
      (METRIC_ALIASES[figure.metric.label] ?? []).filter((alias) => lower.includes(alias)).map((alias) => ({ figure, alias })))
    .sort((first, second) => second.alias.length - first.alias.length);
  if (aliasHits.length) return { figure: aliasHits[0].figure, named: true };
  // Nothing matched letter for letter. One dropped or swapped character —
  // "pesert efektif", "free flaot" — used to end here, in the menu that tells
  // a reader the figure they are looking at is not available.
  const fuzzyLabels = figures
    .filter(({ metric }) => phraseMatches(lower, metric.label))
    .sort((first, second) => second.metric.label.length - first.metric.label.length);
  // Tolerant matches answer, but they do not anchor. `phraseMatches` forgives
  // one or two edits per word, which is what lets "volume terbru" reach Volume
  // terbaru — and also what let "apa dampak" reach the alias "arah dampak".
  // The first is the reader naming a figure; the second is two generic words
  // colliding with a metric name.
  if (fuzzyLabels.length) return { figure: fuzzyLabels[0], named: false };
  const fuzzyAliases = figures
    .flatMap((figure) =>
      (METRIC_ALIASES[figure.metric.label] ?? []).filter((alias) => phraseMatches(lower, alias)).map((alias) => ({ figure, alias })))
    .sort((first, second) => second.alias.length - first.alias.length);
  if (fuzzyAliases.length) return { figure: fuzzyAliases[0].figure, named: false };
  // A group name is the weakest signal there is — "Volume" names a pillar
  // holding four figures, so it loses even to a misspelled metric name.
  // Matching it before the tolerant passes answered "brp volume terbru nya"
  // with the pillar's first metric, which is a different number entirely.
  const byGroup = figures.find(({ group }) => lower.includes(group.toLowerCase()))
    ?? figures.find(({ group }) => phraseMatches(lower, group));
  return byGroup ? { figure: byGroup, named: false } : undefined;
}

/** Meaning, source in plain words, arithmetic, then the technical address. */
export function explainFigure(figure: AnswerableFigure, substitutionSource?: string): string {
  const { metric, group } = figure;
  const fields = metric.citations.map((citation) => citation.field).join(", ");
  const gloss = figure.gloss
    ?? meaningFromRecording(fields, Boolean(figure.formulaOverride ?? METRIC_FORMULA[metric.label]));
  const lines = [`${metric.label}: ${metric.value}${metric.detail ? ` (${metric.detail})` : ""} — ${group}.`];
  if (gloss) lines.push(`Arti angka ini: ${gloss}`);
  lines.push(
    metric.citations.length === 1
      ? `Dibaca dari 1 rekaman: ${describeSourcePlain(metric.citations[0])}.`
      : `Dibaca dari ${metric.citations.length} rekaman: ${metric.citations.map(describeSourcePlain).join("; ")}.`,
  );
  const formula = figure.formulaOverride ?? METRIC_FORMULA[metric.label];
  if (formula) {
    lines.push(`Cara hitung: ${formula}`);
  } else if (figure.readDirectly || METRIC_READ_DIRECTLY.has(metric.label)) {
    lines.push("Cara hitung: tidak dihitung — nilai ini dibaca langsung dari rekaman.");
  }
  const substitution = substitutionSource && formula ? ownSubstitution(substitutionSource, metric.label) : undefined;
  if (substitution) lines.push(`Angka yang dimasukkan: ${substitution}`);
  lines.push(`Rincian teknis untuk diperiksa: ${metric.citations.map(describeSourceTechnical).join(" | ")}`);
  return lines.join("\n");
}

export { METRIC_ALIASES, METRIC_FORMULA, METRIC_READ_DIRECTLY, FIELD_GLOSS };
