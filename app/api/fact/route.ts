import { NextResponse } from "next/server";
import { agentMode } from "@/lib/agent/mode";
import { cacheKeyFor, getCached, setCached } from "@/lib/agent/llm/cache";
import { writeTodayFactWithLlm } from "@/lib/agent/llm/today-fact";
import { citations } from "@/lib/data/fixtures";
import { digestFor } from "@/lib/data/recording-digest";
import { rawCompanies } from "@/lib/data/market.generated";

/**
 * One friendly line per emiten for the floating assistant to open with.
 *
 * `fact: null` is a normal answer, not an error. Deterministic mode, a spent
 * budget, a rate limit, a symbol this bundle never recorded, and a draft the
 * verifier rejected all land there, and the bubble then types the quick
 * prompts it already had. Nothing is invented to fill the gap.
 */

/** Emiten this bundle actually recorded; anything else is not a claim. */
const recordedSymbols = new Set<string>(rawCompanies.map((company) => company.symbol));

/** Sentences already paid for in this process. */
const memo = new Map<string, string>();

/** A greeting is worth one line, not a page of them. */
const MAX_SYMBOLS = 3;

async function factFor(symbol: string): Promise<string | null> {
  // The browser sends a ticker, never a measurement: the digest is recomputed
  // here so whatever reaches the prompt is the recording rather than something
  // a caller typed.
  const digest = digestFor(citations.daily(symbol));
  if (!digest) return null;

  // The fingerprint is the digest itself, so a refreshed recording writes a
  // new line instead of greeting today's reader with last week's session.
  const key = cacheKeyFor(["today-fact", "v1", symbol, JSON.stringify(digest)]);
  const local = memo.get(key);
  if (local) return local;
  const cached = await getCached<{ fact: string }>(key);
  if (cached?.fact) {
    memo.set(key, cached.fact);
    return cached.fact;
  }

  if (agentMode() !== "llm") return null;

  try {
    const drafted = await writeTodayFactWithLlm({ symbol, digest });
    memo.set(key, drafted.fact);
    await setCached(key, drafted);
    return drafted.fact;
  } catch {
    return null;
  }
}

export async function GET(request: Request) {
  const asked = new URL(request.url).searchParams.get("symbols") ?? "";
  const symbols = [...new Set(asked.split(",").map((symbol) => symbol.trim().toUpperCase()).filter(Boolean))]
    .filter((symbol) => recordedSymbols.has(symbol))
    .slice(0, MAX_SYMBOLS);
  if (!symbols.length) return NextResponse.json({ facts: [] });

  // One at a time: the daily ledger behind the budget is read and written per
  // call, so simultaneous reservations would race it.
  const facts: { symbol: string; fact: string }[] = [];
  for (const symbol of symbols) {
    const fact = await factFor(symbol);
    if (fact) facts.push({ symbol, fact });
  }
  return NextResponse.json({ facts });
}
