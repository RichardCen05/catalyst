import { companies, coverageInfo, events } from "@/lib/data/fixtures";
import type { UserInsight, UserProfile } from "@/lib/types";

/** The assistant's name is also the seed its face is generated from: the same
 *  string always renders the same blobatar, so the panel heading, the dialog
 *  label, the launcher and the creature itself cannot drift apart. */
export const ASSISTANT_NAME = "Asisten Catalyst";

/** Quick prompts name a real recorded event touching the watchlist — never a
 *  topic the record does not contain. Falls back to generic prompts when the
 *  watchlist has no linked event. Shared with the launcher, which types one of
 *  these rather than inventing a line of its own. */
export function buildQuickPrompts(profile: UserProfile): string[] {
  const fallback = companies.find((company) => company.analyzed)?.symbol ?? companies[0]?.symbol;
  const first = profile.watchlist[0] ?? fallback!;
  const watched = new Set(profile.watchlist);
  const top = events.find((event) => event.impactLinks.some((link) => watched.has(link.symbol) && link.direction !== "Unrelated"));
  const prompts = [`Kenapa ${first} masuk daftar hari ini?`];
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
  const comparable = profile.watchlist.filter((symbol) => coverageInfo[symbol]?.analyzed && symbol !== first);
  prompts.push(comparable[0] ? `Bandingkan ${first} dan ${comparable[0]}.` : "Data apa yang belum diperiksa?");
  // A figure on screen is the question readers actually ask next.
  prompts.push(`Apa itu HHI dan dari mana angkanya untuk ${first}?`);
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
