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

/** One stored event with the two fields above read the way new items are
 *  written. Returns the same object when neither needs repair, so a queue
 *  with nothing to fix compares equal to what was loaded. */
export function repairStoredEvent<T extends MarketEvent>(event: T, minWords: number): T {
  const publishedAt = crawlStampRepaired(event) ?? isoTimestamp(event.publishedAt);
  const title = repairedTitle(event, minWords);
  const dateChanged = publishedAt !== null && publishedAt !== event.publishedAt;
  if (!dateChanged && !title) return event;
  return {
    ...event,
    ...(dateChanged ? { publishedAt } : {}),
    ...(title ? { title, titleSource: "body" } : {}),
  };
}
