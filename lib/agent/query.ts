import type { MarketEvent, SymbolCode } from "@/lib/types";

/**
 * Robust natural-language symbol + event matching for the copilot.
 * Pure string logic over the recorded symbol list — no new data, no LLM.
 */

export const SYMBOL_ALIASES: Partial<Record<SymbolCode, string[]>> = {
  ANTM: ["antm", "aneka tambang", "anekatambang"],
  INCO: ["inco", "vale", "vale indonesia"],
  TINS: ["tins", "timah"],
  BBCA: ["bbca", "bca", "bank central asia"],
  BBRI: ["bbri", "bri", "bank rakyat"],
  BMRI: ["bmri", "mandiri", "bank mandiri"],
  TLKM: ["tlkm", "telkom", "telekomunikasi indonesia"],
  JSMR: ["jsmr", "jasa marga", "jasamarga"],
  EXCL: ["excl", "xl", "xlsmart", "excelcom"],
  GOTO: ["goto", "gojek tokopedia", "gojek", "tokopedia"],
  BUKA: ["buka", "bukalapak"],
  EMTK: ["emtk", "elangs", "emtek", "surya citra"],
  PGAS: ["pgas", "perusahaan gas", "pgn"],
  ADRO: ["adro", "alumindo", "adaro", "adaro energy"],
  PTBA: ["ptba", "bukit asam", "bukitasam", "tanjung enim"],
  ICBP: ["icbp", "indofood cbp", "indomie"],
  MYOR: ["myor", "mayora"],
  AMRT: ["amrt", "alfamart", "alfa"],
};

const CATEGORY_KEYWORDS: Array<[string[], MarketEvent["category"]]> = [
  [["nikel", "nickel", "batu bara", "batubara", "komoditas", "emas", "timah", "cp nickel", "harga acuan"], "commodity"],
  [["rupiah", "kurs", "dolar", "usd", "jisdor", "valuta", "fx"], "currency"],
  [["suku bunga", "bi rate", "bunga acuan", "inflasi", "rdg", "moneter"], "rates"],
  [["kebijakan", "regulasi", "pemerintah", "pajak", "dmo", "hilirisasi", "aturan", "ojk", "menteri"], "policy"],
  [["arus asing", "foreign flow", "broker", "bandarmologi", "akumulasi", "distribusi"], "flows"],
  [["ramai dibicarakan", "viral", "sentimen", "liputan", "pemberitaan"], "sentiment"],
];

export function normalizeQuery(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** Match symbols via code, full name, or common alias — whole-phrase on normalized text. */
export function findSymbolsRobust(question: string, symbols: SymbolCode[]): SymbolCode[] {
  const normalized = ` ${normalizeQuery(question)} `;
  const found: SymbolCode[] = [];
  for (const symbol of symbols) {
    const aliases = SYMBOL_ALIASES[symbol] ?? [symbol.toLowerCase()];
    if (aliases.some((alias) => normalized.includes(` ${alias} `) || normalized.includes(` ${alias}s `))) {
      found.push(symbol);
    }
  }
  // Preserve watchlist order, dedupe.
  return [...new Set(found)];
}

function tokenize(value: string): Set<string> {
  return new Set(normalizeQuery(value).split(" ").filter((word) => word.length > 3 && !STOPWORDS.has(word)));
}

/** Generic Indonesian + app words that must not drive event relevance. */
const STOPWORDS = new Set([
  "yang", "untuk", "dari", "pada", "dengan", "adalah", "telah", "sudah", "belum",
  "saya", "kami", "anda", "ini", "itu", "tersebut", "saja", "sangat", "lebih",
  "kenapa", "mengapa", "bagaimana", "apakah", "berapa", "kapan", "dimana",
  "masuk", "daftar", "hari", "masih", "akan", "bisa", "dapat", "harus",
  "berita", "kabar", "ceritakan", "cerita", "jelaskan", "tanya", "tanyakan",
  "data", "diperiksa", "periksa", "dampak", "berdampak", "watchlist", "pantauan",
  "pantau", "saham", "emiten", "saya", "bandingkan", "banding", "versus",
  "konsentrasi", "dibanding", "terhadap", "dalam", "luar", "setelah", "sebelum",
  "antara", "serta", "atau", "dan", "juga", "saja",
]);

/** Jaccard overlap between question tokens and event title+summary tokens. */
export function scoreEventOverlap(question: string, event: MarketEvent, symbols: SymbolCode[] = []): number {
  const excluded = new Set(symbols.map((symbol) => symbol.toLowerCase()));
  const questionTokens = [...tokenize(question)].filter((token) => !excluded.has(token));
  if (!questionTokens.length) return 0;
  const eventTokens = tokenize(`${event.title} ${event.summary}`);
  let intersection = 0;
  for (const token of questionTokens) {
    if (eventTokens.has(token)) intersection += 1;
  }
  return intersection / questionTokens.length;
}

export function matchEventForQuestion(question: string, events: MarketEvent[], symbols: SymbolCode[] = []): MarketEvent | undefined {
  const normalized = normalizeQuery(question);
  const category = CATEGORY_KEYWORDS.find(([terms]) => terms.some((term) => normalized.includes(term)))?.[1];
  if (category) {
    const match = events.find((event) => event.category === category);
    if (match) return match;
  }
  // Token overlap is a weaker signal: require more than a third of the
  // question's content tokens to appear in the event. A single generic
  // shared word ("data", "hari") must never hijack the intent.
  let best: MarketEvent | undefined;
  let bestScore = 0;
  for (const event of events) {
    const score = scoreEventOverlap(question, event, symbols);
    if (score > bestScore) {
      bestScore = score;
      best = event;
    }
  }
  return bestScore >= 0.34 ? best : undefined;
}
