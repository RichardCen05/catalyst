import { resolveThresholds } from "@/lib/agent/thresholds";
import { statesFigure } from "@/lib/web-watch/figure-band";
import { titleFromUrl } from "@/lib/web-watch/fetching";
import type { MarketEvent } from "@/lib/types";

/** Starts like an ISO 8601 date: the one shape every reader of `publishedAt`
 *  (sorting, the `YYYY-MM-DD` slice in Pantau) assumes. */
const ISO_PREFIX = /^\d{4}-\d{2}-\d{2}/;

/**
 * A feed date as ISO 8601, or null when it cannot be read.
 *
 * RSS writes RFC 822 (`Wed, 23 Sep 2026 16:09:01 +0700`). Stored as is, Pantau
 * cut it to `Wed, 23 Se` and the queue sorted it as text beside ISO dates. An
 * ISO value passes through untouched, so nothing already stored changes.
 */
export function isoTimestamp(raw: string | null | undefined): string | null {
  if (!raw) return null;
  const trimmed = raw.trim();
  if (ISO_PREFIX.test(trimmed)) return trimmed;
  const parsed = Date.parse(trimmed);
  return Number.isNaN(parsed) ? null : new Date(parsed).toISOString();
}

/** A calendar date written into an article URL (`/20260923…` or `/2026/09/23/`), as the
 *  start of that day in Jakarta, or null when the address carries none. */
export function dateFromUrl(url: string): string | null {
  const match = url.match(/\/(20\d{2})\/?(\d{2})\/?(\d{2})(?=[/\-_.]|\d|$)/);
  if (!match) return null;
  const [, year, month, day] = match;
  const check = new Date(Date.UTC(Number(year), Number(month) - 1, Number(day)));
  const valid = check.getUTCMonth() === Number(month) - 1 && check.getUTCDate() === Number(day);
  return valid ? `${year}-${month}-${day}T00:00:00+07:00` : null;
}

/**
 * An item stored before the headline rules could read the page: its title is
 * the address's filename (`sp 2819226.aspx`). The first line of its stored
 * body is the page's own `<title>`, which a person wrote — used when it reads
 * like one (at least `minWords` words) and is not the filename again.
 */
function repairedTitle(event: MarketEvent & { titleSource?: string }, minWords: number): string | null {
  if (event.titleSource && event.titleSource !== "url") return null;
  const url = event.citations[0]?.url;
  if (!url || event.title !== titleFromUrl(url)) return null;
  const first = (event.body ?? "").split("\n").map((line) => line.trim()).find(Boolean);
  if (!first || first === event.title || first.split(/\s+/).length < minWords) return null;
  return first.slice(0, 200);
}

/**
 * An item written before the URL date was read carries the sweep's clock as
 * its publication time: `publishedAt` equal to `asOf`, a day after the date
 * its own address states. The address wins then, and only then — a feed date
 * that differs from the crawl stamp is the source's own and stays.
 */
function crawlStampRepaired(event: MarketEvent): string | null {
  if (event.publishedAt !== event.asOf) return null;
  const fromUrl = dateFromUrl(event.citations[0]?.url ?? "");
  if (!fromUrl) return null;
  const stamped = Date.parse(event.publishedAt);
  if (Number.isNaN(stamped)) return null;
  // The crawl's calendar day in Jakarta, the zone the URL date is written in.
  const crawlDay = new Date(stamped + 7 * 60 * 60 * 1000).toISOString().slice(0, 10);
  return fromUrl.slice(0, 10) < crawlDay ? fromUrl : null;
}

/**
 * Text with the page's menus and footer dropped, or null when there are none.
 *
 * The fetcher now drops them from the markup (dead links, `<nav>`), but an
 * item stored before that still shows "Turn on more accessible mode… Skip
 * Ribbon Commands… Karier… Edukasi" under its headline (QA P2-7). With no
 * markup left, the shape is what remains.
 *
 * A sentence line has at least `sentenceWords` words and ends like a
 * sentence. The article is the stretch of paragraphs where sentence lines
 * follow one another, with at most `paragraphGap` short lines (a subheading,
 * a dateline) between two of them; a stretch needs two sentence lines, so the
 * one-sentence blurb under each menu of a site ("Informasi seputar organisasi,
 * transformasi dan sejarah Bank Indonesia…") is not taken for it. Before the
 * first stretch and after the last, a run of at least `minRun` lines is page
 * chrome and goes; the headline stays. A single short line is a dateline and
 * stays, a tail that states a figure stays, and between two stretches nothing is touched: a list of figures in
 * the middle of an article is the article.
 *
 * A text with no such stretch falls back to the older reading: the first line
 * of at least `sentenceWords` words starts the article. A text with no long
 * line at all is left as it is, since there is nothing to tell chrome from
 * content by.
 */
function withoutPageChrome(text: string, sentenceWords: number, minRun: number, paragraphGap: number): string | null {
  const lines = text.split("\n").map((line) => line.trim()).filter(Boolean);
  if (lines.length < 2) return null;
  const words = (line: string) => line.split(/\s+/).filter(Boolean).length;
  const isSentence = (line: string) => words(line) >= sentenceWords && /[.!?]["'”’)]?$/.test(line);
  const sentences = lines.map((line, index) => (index > 0 && isSentence(line) ? index : -1)).filter((index) => index > 0);
  // Stretches of sentence lines no more than `paragraphGap` short lines apart.
  const stretches: Array<[number, number, number]> = [];
  for (const index of sentences) {
    const last = stretches[stretches.length - 1];
    if (last && index - last[1] - 1 <= paragraphGap) {
      last[1] = index;
      last[2] += 1;
    } else stretches.push([index, index, 1]);
  }
  const articles = stretches.filter(([, , count]) => count >= 2);
  let start: number;
  let end: number;
  if (articles.length) {
    start = articles[0][0];
    end = articles[articles.length - 1][1];
  } else {
    start = lines.findIndex((line, index) => index > 0 && words(line) >= sentenceWords);
    if (start < 0) return null;
    end = lines.length - 1;
  }
  const lead = start - 1;
  const tail = lines.length - 1 - end;
  const cutLead = lead >= minRun;
  // A footer never states a figure; a table closing the article does, and
  // the figure check reads it.
  const cutTail = tail >= minRun && !lines.slice(end + 1).some(statesFigure);
  if (!cutLead && !cutTail) return null;
  const kept = [lines[0], ...lines.slice(cutLead ? start : 1, cutTail ? end + 1 : lines.length)];
  return kept.join("\n\n");
}

/** One stored event with the fields above read the way new items are
 *  written. Returns the same object when nothing needs repair, so a queue
 *  with nothing to fix compares equal to what was loaded. */
export function repairStoredEvent<T extends MarketEvent>(event: T, minWords: number): T {
  const publishedAt = crawlStampRepaired(event) ?? isoTimestamp(event.publishedAt);
  const title = repairedTitle(event, minWords);
  const dateChanged = publishedAt !== null && publishedAt !== event.publishedAt;
  const t = resolveThresholds();
  const body = event.body ? withoutPageChrome(event.body, t.webWatchProseSentenceMinWords, t.webWatchChromeRunMinLines, t.webWatchParagraphGapLines) : null;
  // A stored summary is the head of the page, often cut before any sentence:
  // read from its own sentences when it has one, else from the repaired body.
  const summary = withoutPageChrome(event.summary, t.webWatchProseSentenceMinWords, t.webWatchChromeRunMinLines, t.webWatchParagraphGapLines)
    ?? (body ? body.slice(0, Math.max(event.summary.length, 1)) : null);
  if (!dateChanged && !title && !body && !summary) return event;
  return {
    ...event,
    ...(dateChanged ? { publishedAt } : {}),
    ...(title ? { title, titleSource: "body" } : {}),
    ...(body ? { body } : {}),
    ...(summary ? { summary } : {}),
  };
}
