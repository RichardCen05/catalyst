import { companies, coverageInfo, events } from "@/lib/data/fixtures";
import type { SymbolCode, UserInsight, UserProfile } from "@/lib/types";

/** The assistant's name is also the seed its face is generated from: the same
 *  string always renders the same blobatar, so the panel heading, the dialog
 *  label, the launcher and the creature itself cannot drift apart. */
export const ASSISTANT_NAME = "Asisten Catalyst";

/**
 * Quick prompts name a real recorded event touching the watchlist — never a
 * topic the record does not contain. Falls back to generic prompts when the
 * watchlist has no linked event. Shared with the launcher, which types one of
 * these rather than inventing a line of its own.
 *
 * `focus` is the case in front of the reader — the route, or the case they
 * picked in the panel. Without it every symbol-bearing chip interpolated
 * `watchlist[0]`, so a panel opened on any other emiten still offered three
 * questions about the same default name, none of them about the page.
 */
export function buildQuickPrompts(profile: UserProfile, focus?: SymbolCode | null): string[] {
  const fallback = companies.find((company) => company.analyzed)?.symbol ?? companies[0]?.symbol;
  const watched = profile.watchlist;
  const first = focus ?? watched[0] ?? fallback!;
  const analysed = (symbol?: SymbolCode) => Boolean(symbol && coverageInfo[symbol]?.analyzed);
  const eventFor = (symbol: SymbolCode) => events.find((event) => event.impactLinks.some((link) => link.symbol === symbol && link.direction !== "Unrelated"));
  // An event touching the focused emiten when there is one, else the first
  // event touching the watchlist.
  const top = (focus ? eventFor(focus) : undefined)
    ?? events.find((event) => event.impactLinks.some((link) => watched.includes(link.symbol) && link.direction !== "Unrelated"));
  const prompts: string[] = [
    // "masuk daftar" only holds for an emiten the reader actually watches; a
    // page about an emiten outside the watchlist gets a question about that
    // page instead, and one the engine has no case for gets the honest gap.
    watched.includes(first)
      ? `Kenapa ${first} masuk daftar hari ini?`
      : analysed(first)
        ? `Apa status ${first}?`
        : `Data apa yang belum diperiksa untuk ${first}?`,
  ];
  if (top) {
    const headline = top.title.length > 72 ? `${top.title.slice(0, 72)}…` : top.title;
    prompts.push(`${headline} — berdampak ke pantauan saya?`);
  } else {
    prompts.push("Peristiwa apa yang berdampak ke daftar pantauan saya?");
  }
  // Only symbols with a full case can be compared. The old prompt used
  // watchlist[1] blindly and suggested "Bandingkan ANTM dan INCO" — INCO has
  // no broker or quarterly recording, so the suggestion the app offered was
  // one it then had to refuse.
  const comparable = watched.filter((symbol) => analysed(symbol) && symbol !== first);
  if (analysed(first) && comparable[0]) prompts.push(`Bandingkan ${first} dan ${comparable[0]}.`);
  // A figure on screen is the question readers actually ask next. It is asked
  // about a second watched emiten that has a full case — the figure only
  // exists where the case does — so the chips stop naming one emiten over
  // and over.
  const hhiTarget = watched.find((symbol) => symbol !== first && analysed(symbol)) ?? (analysed(first) ? first : undefined);
  if (hhiTarget) prompts.push(`Apa itu HHI dan dari mana angkanya untuk ${hhiTarget}?`);
  prompts.push("Data apa yang belum diperiksa?");
  return [...new Set(prompts)].slice(0, 4);
}

/**
 * One chip per emiten a reader has an open note on, never one per note.
 *
 * The chip asks to re-check the notes for an emiten, so two pending notes on
 * the same emiten produce the same question. Mapping over the notes emitted
 * that question twice: two identical chips, and React given two children with
 * the same key. Keyed by emiten because that is what the question is about.
 */
export function buildInsightPrompts(insights: UserInsight[], limit: number): string[] {
  const symbols = [...new Set(insights.filter((item) => item.status === "pending").map((item) => item.symbol))];
  return symbols.slice(0, limit).map((symbol) => `Periksa ulang catatan saya untuk ${symbol}.`);
}
