import { phraseMatches } from "@/lib/text/fuzzy";
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

/** What a figure means, for a reader who has never seen the term. */
const METRIC_GLOSS: Record<string, string> = {
  "Porsi peserta teratas": "bagian nilai beli yang dikuasai satu broker paling besar. Makin tinggi, makin sedikit pihak yang menggerakkan transaksi.",
  "HHI": "ukuran seberapa terpusat nilai beli di sedikit broker. Mendekati 0 berarti tersebar rata; 1 berarti satu broker menguasai semuanya.",
  "Peserta efektif": "jumlah broker yang setara dengan sebaran ini bila semuanya berporsi sama. 5.6 berarti konsentrasinya seperti hanya ada sekitar 6 pembeli.",
  "Porsi asing": "arus asing bersih dibanding total nilai transaksi pada jendela rekaman. Angka positif berarti asing membeli lebih banyak daripada menjual.",
  "Saham publik terserap": "seberapa besar nilai beli pada jendela ini dibanding seluruh nilai saham publik yang beredar.",
  "Aliran institusi bersih": "nilai bersih transaksi pemegang saham institusi yang wajib dilaporkan ke bursa.",
  "Pemegang terbesar berubah": "pemegang saham yang perubahan kepemilikannya paling besar pada keterbukaan terekam.",
  "Rasio churn broker teratas (proksi)": "perbandingan beli dan jual pada broker yang sama. Rasio tinggi berarti banyak transaksi bolak-balik, bukan akumulasi bersih.",
  "Skor z tahan pencilan": "seberapa jauh volume terakhir dari volume biasanya, diukur dengan cara yang tidak mudah ditarik satu hari ekstrem.",
  "Volume terbaru": "jumlah lembar yang diperdagangkan pada hari terakhir rekaman.",
  "Pembanding": "jendela hari bursa yang dipakai sebagai pembanding volume.",
  "Imbal hasil 3 hari": "perubahan harga penutupan selama tiga hari bursa terakhir.",
  "Imbal hasil IHSG": "perubahan indeks IHSG pada jendela yang sama, sebagai pembanding pasar.",
  "Residual setelah beta": "bagian gerak harga yang tidak dijelaskan oleh gerak IHSG setelah disesuaikan sensitivitas saham ini terhadap pasar (beta).",
  "Imbal hasil sektor": "rata-rata perubahan harga emiten satu sektor, dibobot kapitalisasi pasar.",
  "Peristiwa terhubung": "jumlah peristiwa terekam yang memiliki jalur dampak ke emiten ini.",
  "Arah utama": "arah dampak peristiwa utama terhadap emiten, menurut jalur eksposur yang terekam.",
  "Relevansi eksposur": "peringkat yang dihitung Catalyst dari tag dan sebaran simbol pada rekaman, bukan skor yang diberikan penyedia data. Dipakai untuk mengurutkan pemeriksaan terhadap ambang aturan riset, bukan sebagai bukti.",
  "Paruh awal": "skor anomali volume yang sama, dihitung ulang hanya terhadap separuh awal jendela pembanding. Dipakai untuk menguji apakah sinyalnya bertahan.",
  "Paruh akhir": "skor anomali volume yang sama, dihitung ulang hanya terhadap separuh akhir jendela pembanding.",
  "Pembanding penuh": "skor anomali volume terhadap seluruh jendela pembanding — angka acuan yang dibandingkan dengan kedua paruh.",
  "Harga penutupan": "harga penutupan terakhir pada rekaman, bukan harga live.",
  "Perubahan harga harian": "perubahan harga penutupan terhadap sesi bursa sebelumnya pada rekaman.",
};

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
  "Relevansi eksposur": "filing = 95; selain itu 88 dikurangi 6 untuk setiap simbol tambahan yang disebut sumber (minimum 40), +2 bila dimensinya keuangan atau proyeksi, dibatasi 97",
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
  const key = label.split(" ")[0].toLowerCase();
  return segments.find((segment) => segment.toLowerCase().startsWith(key));
}

/** Metrics whose pillar substitution line is theirs alone. */
const SOLE_SUBSTITUTION_OWNER = new Set(["Skor z tahan pencilan", "Residual setelah beta"]);

/** Metrics that are a recorded value or a label, not a calculation. */
const METRIC_READ_DIRECTLY = new Set(["Volume terbaru", "Pembanding", "Harga penutupan"]);

export function explainMetric(
  pillar: PillarResult,
  metric: MetricValue,
  options: { includeTechnical?: boolean } = {},
): string {
  const gloss = METRIC_GLOSS[metric.label];
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
        value: `${analysis.company.changePct.toLocaleString("id-ID")}%`,
        citations: analysis.company.citations,
      },
    },
  ];
}

/** The figure a question is about, searched across everything on screen. */
export function matchFigure(
  figures: AnswerableFigure[],
  question: string,
  extractNumerals: (...texts: string[]) => string[],
): AnswerableFigure | undefined {
  const lower = question.toLowerCase();
  // A label the reader typed in full outranks a number inside it. "Imbal hasil
  // 3 hari" carries a "3", and matching numbers first answered that question
  // with whichever figure happened to contain a 3.
  const labelFirst = figures
    .filter(({ metric }) => lower.includes(metric.label.toLowerCase()))
    .sort((first, second) => second.metric.label.length - first.metric.label.length);
  if (labelFirst.length) return labelFirst[0];
  // A quoted figure has to look like a figure. A lone digit is almost always
  // part of a phrase ("3 hari", "28 hari"), not a value pasted from the page.
  const asked = extractNumerals(question).map(canonicalFigure).filter((figure) => figure.replace("%", "").length > 1);
  if (asked.length) {
    const byFigure = figures.find(({ metric }) =>
      extractNumerals(metric.value).map(canonicalFigure).some((figure) => asked.includes(figure)));
    if (byFigure) return byFigure;
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
  if (aliasHits.length) return aliasHits[0].figure;
  // Nothing matched letter for letter. One dropped or swapped character —
  // "pesert efektif", "free flaot" — used to end here, in the menu that tells
  // a reader the figure they are looking at is not available.
  const fuzzyLabels = figures
    .filter(({ metric }) => phraseMatches(lower, metric.label))
    .sort((first, second) => second.metric.label.length - first.metric.label.length);
  if (fuzzyLabels.length) return fuzzyLabels[0];
  const fuzzyAliases = figures
    .flatMap((figure) =>
      (METRIC_ALIASES[figure.metric.label] ?? []).filter((alias) => phraseMatches(lower, alias)).map((alias) => ({ figure, alias })))
    .sort((first, second) => second.alias.length - first.alias.length);
  if (fuzzyAliases.length) return fuzzyAliases[0].figure;
  // A group name is the weakest signal there is — "Volume" names a pillar
  // holding four figures, so it loses even to a misspelled metric name.
  // Matching it before the tolerant passes answered "brp volume terbru nya"
  // with the pillar's first metric, which is a different number entirely.
  return figures.find(({ group }) => lower.includes(group.toLowerCase()))
    ?? figures.find(({ group }) => phraseMatches(lower, group));
}

/** Meaning, source in plain words, arithmetic, then the technical address. */
export function explainFigure(figure: AnswerableFigure, substitutionSource?: string): string {
  const { metric, group } = figure;
  const gloss = figure.gloss ?? METRIC_GLOSS[metric.label];
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

export { METRIC_GLOSS, METRIC_ALIASES, METRIC_FORMULA, METRIC_READ_DIRECTLY, FIELD_GLOSS };
