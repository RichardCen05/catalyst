import { companies } from "@/lib/data/fixtures";
import type { CopilotContext, SymbolCode } from "@/lib/types";

const KNOWN = new Set(companies.map((company) => company.symbol));

/**
 * The case the page in front of the reader is about.
 *
 * Opening the assistant from a page about ANTM should show ANTM without the
 * reader naming it, so the shell resolves a symbol from the URL and uses it
 * when nothing more specific was set. `?case=` and `?compare=` are the
 * in-repo spellings of the same two parameters `/impact` and `/cases` read,
 * so both are accepted alongside `?company=` and `?symbols=`.
 *
 * One symbol only. `answerFollowUp` builds exactly one case, and a comparison
 * reaches the engine through the two symbols named in the question.
 */
export function symbolFromRoute(pathname: string, search?: string | URLSearchParams): SymbolCode | undefined {
  const params = typeof search === "string" ? new URLSearchParams(search) : search;
  const first = (value: string | null | undefined) => (value ?? "").split(",")[0];
  const candidates = [
    pathname.match(/^\/cases\/([^/]+)\/?$/)?.[1],
    pathname.match(/^\/companies\/([^/]+)\/?$/)?.[1],
    params?.get("company"),
    params?.get("case"),
    first(params?.get("symbols")),
    first(params?.get("compare")),
  ];
  for (const candidate of candidates) {
    if (!candidate) continue;
    let decoded = candidate;
    try { decoded = decodeURIComponent(candidate); } catch { /* a malformed escape is not a symbol */ }
    const symbol = decoded.trim().toUpperCase() as SymbolCode;
    if (KNOWN.has(symbol)) return symbol;
  }
  return undefined;
}

/**
 * Which case the assistant is bound to, given what the reader set and what
 * the URL says.
 *
 * The route is the default, never an override. A case picked from the chip —
 * including "Tanpa kasus", which is an explicit context carrying no symbol —
 * outlives navigation until the reader clears it.
 */
export function resolveContext(explicit: CopilotContext | null, routeSymbol: SymbolCode | null | undefined): CopilotContext | null {
  return explicit ?? (routeSymbol ? { label: routeSymbol, question: "", symbol: routeSymbol } : null);
}
