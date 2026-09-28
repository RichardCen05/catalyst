import { codeMatches, phraseMatches, words } from "@/lib/text/fuzzy";
import { companies } from "@/lib/data/fixtures";
import { CHROME_BLOCKS, CHROME_NAV } from "@/lib/data/chrome.generated";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import type { MarketEvent, SymbolCode } from "@/lib/types";

/**
 * Symbol aliases derived from the recorded company registry — never a typed
 * ticker table. Each symbol's aliases are its code, every multi-word phrase
 * inside its recorded name (`bank rakyat indonesia` yields `bank rakyat`),
 * the squashed single token (`aneka tambang` → `anekatambang`), distinctive
 * single tokens, and the acronym of the name (`Bank Central Asia` → `bca`).
 * Single tokens shared by more than one recorded name stay out, and ordinary
 * Indonesian nouns that double as question words stay out as well — `sumber`
 * is how readers ask for a source, `mana` is one edit from `marga`, so both
 * would map everyday questions to the wrong issuer. Brand, product, and
 * pre-rename phrases from the old hand list (indomie, alfamart, adaro, …)
 * are intentionally gone: no recording carries them.
 */
/** Legal-form words in a recorded name: they identify no issuer on their own. */
export const LEGAL_TOKENS: ReadonlySet<string> = new Set(["pt", "tbk", "persero", "com", "jk"]);

/** Ordinary words that happen to sit inside recorded names. Generic question
 *  vocabulary, not registry — the same kind of list as STOPWORDS below. */
const GENERIC_NAME_TOKENS = new Set([
  "aneka", "tambang", "gas", "jasa", "marga", "perusahaan", "negara",
  "teknologi", "indah", "sukses", "makmur", "sejahtera", "sumber",
]);

function normalizeName(value: string): string {
  return value
    .toLowerCase()
    .replace(/[^\p{L}\p{N}\s]/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

/** The words of a recorded company name, lowercased, legal forms removed:
 *  "PT Bank Rakyat Indonesia (Persero) Tbk" → bank, rakyat, indonesia. */
export function registryNameTokens(name: string): string[] {
  return normalizeName(name)
    .split(" ")
    .filter((token) => token && !LEGAL_TOKENS.has(token));
}

function buildSymbolAliases(): Partial<Record<SymbolCode, string[]>> {
  const tokenOwners = new Map<string, Set<string>>();
  const prepared = companies.map((company) => {
    const tokens = registryNameTokens(company.name);
    for (const token of new Set(tokens)) {
      let owners = tokenOwners.get(token);
      if (!owners) {
        owners = new Set<string>();
        tokenOwners.set(token, owners);
      }
      owners.add(company.symbol);
    }
    return { symbol: company.symbol, tokens };
  });
  const out = {} as Record<SymbolCode, string[]>;
  for (const { symbol, tokens } of prepared) {
    // Multi-word phrases only: single tokens take the distinctive-word path
    // below, otherwise the shared-word filter never gets a say.
    const phrases = new Set<string>();
    for (let start = 0; start < tokens.length; start += 1) {
      for (let end = start + 2; end <= tokens.length; end += 1) {
        phrases.add(tokens.slice(start, end).join(" "));
      }
    }
    const aliases = new Set<string>([symbol.toLowerCase(), ...phrases]);
    const squashed = tokens.join("");
    if (squashed.length >= 4) aliases.add(squashed);
    for (const token of tokens) {
      if (
        token.length >= 4 &&
        !GENERIC_NAME_TOKENS.has(token) &&
        (tokenOwners.get(token)?.size ?? 0) <= 1
      ) {
        aliases.add(token);
      }
    }
    const acronym = tokens.map((token) => token[0]).join("");
    if (acronym.length >= 3) aliases.add(acronym);
    out[symbol] = [...aliases];
  }
  return out;
}

export const SYMBOL_ALIASES: Partial<Record<SymbolCode, string[]>> = buildSymbolAliases();

/**
 * The Indonesian enclitics a reader attaches to a noun they own.
 *
 * Longest first, so `-nya` is tried before `-ya` could ever be mistaken for
 * one. This is not a stemmer: it removes these six endings and nothing else.
 */
export const ENCLITICS = ["nya", "lah", "kah", "pun", "ku", "mu"];

/** Every single-token alias of a recorded issuer, lowercased. */
let aliasTokens: Set<string> | null = null;
function singleTokenAliases(): Set<string> {
  if (aliasTokens) return aliasTokens;
  aliasTokens = new Set(
    Object.values(SYMBOL_ALIASES)
      .flat()
      .filter((alias): alias is string => Boolean(alias) && !alias.includes(" ")),
  );
  return aliasTokens;
}

/**
 * The stem of a word a reader marked as theirs, or null.
 *
 * `pantauanku`, `kasusku` and `emitenku` carry no term any index holds, so a
 * question written the way a reader actually speaks reached nothing at all.
 * Two bounds keep this from cutting words apart: the word has to be long
 * enough to plausibly carry an ending, and what is left has to be long enough
 * to be a word. A single-token issuer alias is never cut — a recorded name is
 * not a possessive, and mistaking one for the other answers about the wrong
 * issuer, which is worse than not matching at all.
 */
export function stripEnclitics(token: string): string | null {
  if (token.length < DEFAULT_THRESHOLDS.encliticMinTokenChars) return null;
  if (singleTokenAliases().has(token)) return null;
  for (const enclitic of ENCLITICS) {
    if (!token.endsWith(enclitic)) continue;
    const stem = token.slice(0, -enclitic.length);
    if (stem.length < DEFAULT_THRESHOLDS.encliticMinStemChars) return null;
    return stem;
  }
  return null;
}

/**
 * First-person words: the reader saying the thing is theirs.
 *
 * `-nya` is deliberately absent — it is third person, and "kasusnya" is a
 * question about the case under discussion, not about the reader's list.
 */
const READER_WORDS = ["saya", "aku", "kami", "kita", "punyaku", "milikku"];
const READER_ENCLITICS = ["ku", "mu"];

/**
 * Whether the question is about the reader's own material.
 *
 * Two ways a reader says so: a first-person word, or a possessive ending on
 * a word long enough to carry one. Both are read off the question alone, so
 * the signal is the same for every reader and can be checked by reading.
 */
export function mentionsReader(question: string): boolean {
  const normalized = normalizeQuery(question);
  const padded = ` ${normalized} `;
  if (READER_WORDS.some((word) => padded.includes(` ${word} `))) return true;
  return normalized.split(" ").some((token) =>
    READER_ENCLITICS.some((enclitic) => token.endsWith(enclitic)) && stripEnclitics(token) !== null);
}

/**
 * The same tokens, plus the stem of any that carried an enclitic.
 *
 * Both forms are kept on both sides — the question and the index — because
 * replacing the original would make `pantauan` unreachable from the term
 * `pantauanku` the moment a page happens to spell it the long way.
 */
export function expandEnclitics(tokens: string[]): string[] {
  const out: string[] = [];
  for (const token of tokens) {
    out.push(token);
    const stem = stripEnclitics(token);
    if (stem && stem !== token) out.push(stem);
  }
  return [...new Set(out)];
}

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

/**
 * Words the app itself prints on screen. A reader typing one of them wrote a
 * word, not a misspelt issuer name: "bukti" is one transposition from "bukit"
 * (PTBA) and "bukan" one edit from "buka" (BUKA), and the typo pass used to
 * bind whole conversations to those issuers.
 */
let screenWords: Set<string> | null = null;
function ordinaryWords(): Set<string> {
  if (screenWords) return screenWords;
  const text = [
    ...CHROME_BLOCKS.flatMap((block) => [block.heading, block.eyebrow, block.description, ...(block.actions ?? []), ...(block.labels ?? [])]),
    ...CHROME_NAV.map((item) => item.label),
  ].filter(Boolean).join(" ");
  const aliases = singleTokenAliases();
  screenWords = new Set(words(normalizeQuery(text)).filter((word) => !aliases.has(word)));
  return screenWords;
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
  if (found.length) return [...new Set(found)];
  // Exact matching found nothing, so try again allowing a typo. "ANTMM",
  // "aneka tamban" and "bukalapk" are the same question as the spelling the
  // list happens to hold; a reader who mistypes a ticker got told the whole
  // question could not be mapped to any evidence.
  const ordinary = ordinaryWords();
  const typed = words(normalized).filter((word) => word.length >= 4 && !ordinary.has(word));
  for (const symbol of symbols) {
    const aliases = SYMBOL_ALIASES[symbol] ?? [symbol.toLowerCase()];
    if (aliases.some((alias) => (alias.includes(" ") ? phraseMatches(normalized, alias) : typed.some((word) => codeMatches(word, alias))))) {
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
  const category = (CATEGORY_KEYWORDS.find(([terms]) => terms.some((term) => normalized.includes(term)))
    ?? CATEGORY_KEYWORDS.find(([terms]) => terms.some((term) => phraseMatches(normalized, term))))?.[1];
  if (category) {
    // A category word says what kind of event, not which one. "Sesuai aturan
    // saya, apa yang dicek dulu untuk PGAS?" carries "aturan", a policy word,
    // and used to be answered with the first policy event in the recordings —
    // a bank credit note that touches no PGAS path. When the question names
    // an emiten, the event has to reach that emiten; otherwise the category
    // proves nothing and token overlap decides.
    const named = findSymbolsRobust(question, symbols);
    const match = events.find((event) => event.category === category
      && (!named.length || event.impactLinks.some((link) => named.includes(link.symbol) && link.direction !== "Unrelated")));
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
