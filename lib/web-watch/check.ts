/**
 * Checking one watched source — port of the checking half of ReguLens
 * `sources.py` (`_check_document`, `_check_feed`, `_check_listing`,
 * `_check_items`, `check_source`).
 *
 * Three rules, same as the original:
 *
 * **No back door.** A change becomes a *candidate* `MarketEvent` carrying its
 * source URL, citation, and extracted body. It joins the review queue with
 * empty `impactLinks` — no invented relevance, no invented direction. A human
 * accept (or a later mapping pass through `gates.ts`) is what turns it into
 * an event the engine reads. A scheduled read of a news site never silently
 * moves a verdict.
 *
 * **A check that finds nothing costs nothing.** Conditional GET first,
 * text-hash comparison second. The expensive thing is the model, and none of
 * these paths reach it.
 *
 * **A source that breaks says so.** The error text is recorded on the source
 * and returned in the result. Silence would read exactly like "no news".
 */

import {
  ACCEPT_FEED,
  EXTRACTOR_VERSION,
  FetchError,
  extractLinks,
  fetchUrl,
  parseFeed,
  textSha,
  toText,
  type FeedEntry,
  type Fetched,
  type FetchOptions,
  type SourceText,
} from "@/lib/web-watch/fetching";
import { WEB_WATCH_ENDPOINT } from "@/lib/web-watch/endpoint";
import { summarizeJsonPayload } from "@/lib/web-watch/json-summary";
import { claim, release, type RegistryStore } from "@/lib/web-watch/registry";
import { resolveThresholds } from "@/lib/agent/thresholds";
import type { MarketEvent } from "@/lib/types";
import { sentences } from "@/lib/web-watch/triage";
import { isoTimestamp } from "@/lib/web-watch/stored-fields";
import { isDue, type CheckResult, type TitleSource, type WatchedSourceState, type WebWatchCandidate } from "@/lib/web-watch/types";

export type FetchImpl = (url: string, options?: FetchOptions) => Promise<Fetched>;

export interface CheckDeps {
  store: RegistryStore;
  fetchImpl?: FetchImpl;
  nowMs?: number;
}

export const MAX_NEW_PER_CHECK = Number(process.env.WEB_WATCH_MAX_NEW || 5);
export const SEEN_CAP = 500;
export const MIN_FETCH_CHARS = 200;
export const MAX_FETCH_CHARS = 200_000;
export const BODY_CAP = 20_000;

function candidateId(sourceId: string, key: string, sha: string): string {
  if (key) {
    let hash = 0;
    for (let i = 0; i < key.length; i += 1) hash = (Math.imul(hash, 31) + key.charCodeAt(i)) | 0;
    return `web-${sourceId}-${(hash >>> 0).toString(16)}`;
  }
  return `web-${sourceId}-${sha.slice(0, 12)}`;
}

function hostOf(url: string): string {
  try {
    return new URL(url).hostname.replace(/^www\./, "");
  } catch {
    return "sumber web";
  }
}

/** The headline and where it came from. A feed-supplied title wins: a human
 *  wrote it. A listing link with no text gave us its address as the title (BI
 *  `sp_2819226.aspx`, GAPKI slugs), so the page's own headline stands in for
 *  it, then the first prose sentence of the body; with neither, the filename
 *  stays and says so. */
function headlineFor(text: SourceText, fetchedUrl: string, title: string | null, titleIsUrl: boolean) {
  /** The page's own first prose sentence — what a headline derived from the
   *  body is in every branch below. A line that ends without punctuation is a
   *  breadcrumb, a menu item or a filename, and it is what the raw first line
   *  used to hand over. */
  const firstProse = () => sentences(text.text, resolveThresholds().webWatchProseSentenceMinWords)[0];
  if (title && titleIsUrl && text.pageTitle && text.pageTitle !== title) {
    return { headline: text.pageTitle.slice(0, 200), titleSource: "body" as TitleSource, derived: null };
  }
  if (title && titleIsUrl) {
    const first = firstProse();
    if (first) return { headline: first.slice(0, 200), titleSource: "body" as TitleSource, derived: null };
    return { headline: title.slice(0, 200) || fetchedUrl, titleSource: "url" as TitleSource, derived: null };
  }
  if (title) return { headline: title.slice(0, 200) || fetchedUrl, titleSource: "feed" as TitleSource, derived: null };
  // A JSON endpoint has no headline to slice, so the generic rule produced a
  // title that was a slice of the payload. Derive one from the fields when the
  // shape is recognised; an unrecognised or malformed payload returns null and
  // nothing changes.
  const derived = summarizeJsonPayload(text.text);
  if (derived) return { headline: derived.title.slice(0, 200) || fetchedUrl, titleSource: "json" as TitleSource, derived };
  return { headline: (firstProse() ?? text.text.split("\n")[0] ?? fetchedUrl).slice(0, 200) || fetchedUrl, titleSource: "body" as TitleSource, derived };
}

/**
 * The first sentences of a page, whole ones, for `MarketEvent.summary`.
 *
 * The summary is the first thing a reviewer reads under a headline, and a raw
 * slice of the extracted text began inside whatever the extraction had left at
 * the top — a breadcrumb, a category line — and stopped in the middle of a
 * word. A page with no prose (a JSON payload, a table of figures, text whose
 * sentences never reach the sentence minimum) has nothing to join, so the raw
 * text is what it gets, exactly as before.
 */
function summaryText(text: string, max: number): string {
  const prose = sentences(text, resolveThresholds().webWatchProseSentenceMinWords);
  if (!prose.length) return text.slice(0, max);
  let out = "";
  for (const sentence of prose) {
    const next = out ? `${out} ${sentence}` : sentence;
    if (next.length > max) break;
    out = next;
  }
  return (out || prose[0]).slice(0, max);
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

/** A change, packaged exactly like any other event input — but with no
 *  impact links. The mapping to symbols happens at review time, in the open,
 *  not inside the fetcher. The id hashes the text, never the headline, so a
 *  headline rule can change without an already-decided item coming back. */
export function buildCandidate(
  state: WatchedSourceState,
  text: SourceText,
  fetchedUrl: string,
  title: string | null,
  publishedAt: string | null,
  key: string,
  nowIso: string,
  titleIsUrl = false,
): WebWatchCandidate {
  const { headline, titleSource, derived } = headlineFor(text, fetchedUrl, title, titleIsUrl);
  const citationId = `web-${state.id}-${textSha(text).slice(0, 8)}`;
  return {
    id: candidateId(state.id, key, textSha(text)),
    title: headline,
    titleSource,
    // The raw text stays in `body` either way — the citation and the audit
    // trail must not lose it.
    // A derived summary is already written as one; a page's own text is read
    // as prose, so the card does not start mid-menu or mid-word.
    summary: derived ? derived.summary.slice(0, 500) : summaryText(text.text, 500),
    body: text.text.slice(0, BODY_CAP),
    category: state.category,
    sourceType: state.sourceType,
    // Feeds write RFC 822; everything that reads this field expects ISO.
    // Without a feed date, a date in the article's own address beats the crawl time,
    // which stamped a 23 Sep article as published at the next morning's sweep.
    publishedAt: isoTimestamp(publishedAt) ?? dateFromUrl(fetchedUrl) ?? nowIso,
    asOf: nowIso,
    sector: "Market",
    impactLinks: [],
    citations: [
      {
        id: citationId,
        provider: hostOf(fetchedUrl),
        endpoint: WEB_WATCH_ENDPOINT,
        field: "body",
        asOf: nowIso,
        label: state.label,
        url: fetchedUrl,
        urlLabel: "Buka sumber asal",
        access: "direct",
      },
    ],
  };
}

function guardSize(text: SourceText, url: string): void {
  if (text.text.length < MIN_FETCH_CHARS) {
    // Deliberately NOT permanent — an empty page is as often a temporary
    // interstitial (or a bot-mitigation shell) as a real one.
    throw new FetchError(
      `Alamat itu hampir tidak mengembalikan teks (${text.text.length} karakter). Mungkin halaman login, halaman indeks, atau perisai anti-bot sementara.`,
    );
  }
  if (text.text.length > MAX_FETCH_CHARS) {
    throw new FetchError(
      `Dokumen itu ${text.text.length.toLocaleString("id-ID")} karakter dan kami membaca sampai ${MAX_FETCH_CHARS.toLocaleString("id-ID")} sekaligus. Arahkan ke lampiran spesifiknya.`,
      { permanent: true },
    );
  }
  void url;
}

function capSeen(seen: string[]): string[] {
  return seen.length > SEEN_CAP ? seen.slice(-SEEN_CAP) : seen;
}

// ---------------------------------------------------------------------------
// Review-time keyword gates (pure — no I/O, no invented links).
//
// A candidate enters the queue with empty impactLinks whatever it mentions.
// These lists exist so the *reviewer* (human or mapping pass) can spot which
// bucket a candidate likely belongs to: physical supply-chain disruption
// (weather/commodity legs for TINS/ADRO/PTBA/INCO/ANTM/PGAS), ownership
// change (company leg), or flows/block-trade/rebalancing (flows leg).
// Matching is case-insensitive substring; it suggests, never decides.
// ---------------------------------------------------------------------------

/** Vessel dwell, smelter outage, DMO shipment: 4-12 week lead on earnings. */
export const ACTIVITY_KEYWORDS = [
  "smelter",
  "outage",
  "force majeure",
  "dmo",
  "rkab",
  "pemeliharaan",
  "maintenance",
  "kecelakaan tambang",
  "banjir tambang",
  "longsor",
  "antrean kapal",
  "vessel",
  "tongkang",
  "dermaga",
];

/** Substantial-shareholder / insider / sovereign (Danantara, pension) moves. */
export const OWNERSHIP_KEYWORDS = [
  "keterbukaan informasi pemegang saham",
  "pemegang saham substansial",
  "kepemilikan saham",
  "danantara",
  "buyback",
  "pembelian kembali",
  "right issue",
  "stock split",
  "pemecahan saham",
];

/** Foreign net, broker concentration, index rebalancing, liquidity ops. */
export const FLOWS_KEYWORDS = [
  "net foreign",
  "asing",
  "block trade",
  "transaksi negosiasi",
  "rebalancing",
  "rebalance",
  "msci",
  "lqf45",
  "idx30",
  "srbi",
  "operasi moneter",
];

export function keywordHits(text: string, keywords: string[]): string[] {
  const lowered = (text ?? "").toLowerCase();
  return keywords.filter((keyword) => lowered.includes(keyword.toLowerCase()));
}

export interface CandidateHints {
  activity: string[];
  ownership: string[];
  flows: string[];
}

/** Suggest review buckets for a candidate body. Empty everywhere = no hint. */
export function hintBuckets(text: string): CandidateHints {
  return {
    activity: keywordHits(text, ACTIVITY_KEYWORDS),
    ownership: keywordHits(text, OWNERSHIP_KEYWORDS),
    flows: keywordHits(text, FLOWS_KEYWORDS),
  };
}

// ---------------------------------------------------------------------------
// Document
// ---------------------------------------------------------------------------

async function checkDocument(
  state: WatchedSourceState,
  fetchImpl: FetchImpl,
  nowIso: string,
): Promise<{ result: CheckResult; updates: Partial<WatchedSourceState> }> {
  const fetched = await fetchImpl(state.url, { etag: state.lastEtag, lastModified: state.lastModified });
  if (fetched.notModified) {
    return {
      result: { sourceId: state.id, url: state.url, label: state.label, status: "unchanged", reason: "not_modified" },
      updates: {
        lastStatus: "unchanged",
        lastError: null,
        lastEtag: fetched.etag,
        lastModified: fetched.lastModified,
      },
    };
  }
  const text = toText(fetched.raw, fetched.contentType);
  if (state.lastTextSha && textSha(text) !== state.lastTextSha && (state.lastExtractorVersion ?? 1) !== EXTRACTOR_VERSION) {
    // The stored hash came from an older extractor, so a difference here
    // says nothing about the page. Take the new hash as the baseline; a real
    // change made in the same window shows up on the next read after it.
    return {
      result: { sourceId: state.id, url: state.url, label: state.label, status: "unchanged", reason: "extractor_rebaselined" },
      updates: {
        lastStatus: "unchanged",
        lastError: null,
        lastEtag: fetched.etag,
        lastModified: fetched.lastModified,
        lastTextSha: textSha(text),
        lastExtractorVersion: EXTRACTOR_VERSION,
      },
    };
  }
  if (state.lastTextSha && textSha(text) === state.lastTextSha) {
    return {
      result: { sourceId: state.id, url: state.url, label: state.label, status: "unchanged", reason: "same_text" },
      updates: {
        lastStatus: "unchanged",
        lastError: null,
        lastEtag: fetched.etag,
        lastModified: fetched.lastModified,
        // Same text under this extractor: the stored hash is now this
        // version's, so the next difference is a real change.
        lastExtractorVersion: EXTRACTOR_VERSION,
      },
    };
  }
  guardSize(text, state.url);
  const candidate = buildCandidate(state, text, fetched.url, null, null, "", nowIso);
  return {
    result: {
      sourceId: state.id,
      url: state.url,
      label: state.label,
      status: "changed",
      reason: state.lastTextSha ? "text_changed" : "first_read",
      candidates: [candidate],
    },
    updates: {
      lastStatus: "changed",
      lastError: null,
      lastEtag: fetched.etag,
      lastModified: fetched.lastModified,
      lastTextSha: textSha(text),
      lastExtractorVersion: EXTRACTOR_VERSION,
      lastChangedAt: nowIso,
      changes: state.changes + 1,
      documentIds: [candidate.id, ...state.documentIds].slice(0, 50),
    },
  };
}

// ---------------------------------------------------------------------------
// Feeds and listings share the decision; only how the list was obtained
// differs — parsing XML, or reading the links off an index page.
// ---------------------------------------------------------------------------

interface ItemOutcome {
  result: CheckResult;
  updates: Partial<WatchedSourceState>;
}

async function checkItems(
  state: WatchedSourceState,
  fetched: Fetched,
  items: FeedEntry[],
  collectionTitle: string,
  fetchImpl: FetchImpl,
  nowIso: string,
): Promise<ItemOutcome> {
  const seen = new Set(state.seenEntryIds);
  const fresh = items.filter((item) => !seen.has(item.key));
  const base = { lastError: null as string | null, lastEtag: fetched.etag, lastModified: fetched.lastModified };

  // First look: remember what is already there and read none of it. Adopting
  // a feed is a request to be told what happens next, not to be handed the
  // archive.
  if (state.lastStatus === "never") {
    const keys = capSeen(items.map((item) => item.key));
    return {
      result: {
        sourceId: state.id,
        url: state.url,
        label: state.label,
        status: "baselined",
        reason: `remembered_${keys.length}_entries`,
        newEntries: 0,
      },
      updates: { ...base, lastStatus: "baselined", seenEntryIds: keys },
    };
  }

  if (!fresh.length) {
    return {
      result: { sourceId: state.id, url: state.url, label: state.label, status: "unchanged", reason: "no_new_entries" },
      updates: { ...base, lastStatus: "unchanged" },
    };
  }

  // Newest first; take the newest few and stop. The rest stay unseen so they
  // come back on the next run instead of turning one burst into an
  // unbounded bill.
  const take = fresh.slice(0, MAX_NEW_PER_CHECK);
  const candidates: MarketEvent[] = [];
  const failed: NonNullable<CheckResult["failed"]> = [];
  // Marked seen when read — or when reading can never work. A timeout stays
  // new so the next run retries it; a permanent refusal does not, because
  // retrying it nightly would burn the per-run cap a readable item needed.
  const readKeys: string[] = [];
  for (const item of take) {
    try {
      const itemFetch = await fetchImpl(item.link);
      const itemText = toText(itemFetch.raw, itemFetch.contentType);
      guardSize(itemText, item.link);
      candidates.push(buildCandidate(state, itemText, itemFetch.url, item.title, item.published, item.key, nowIso, item.titleFromUrl === true));
      readKeys.push(item.key);
    } catch (error) {
      if (error instanceof FetchError) {
        failed.push({ title: item.title, link: item.link, error: error.message, permanent: error.permanent });
        if (error.permanent) readKeys.push(item.key);
      } else {
        failed.push({
          title: item.title,
          link: item.link,
          error: `unexpected: ${error instanceof Error ? error.name : "error"}`,
          permanent: false,
        });
      }
    }
  }

  const seenAfter = capSeen([...state.seenEntryIds, ...readKeys]);
  const status = candidates.length ? "changed" : "unchanged";
  const updates: Partial<WatchedSourceState> = { ...base, lastStatus: status, seenEntryIds: seenAfter };
  if (candidates.length) {
    updates.lastChangedAt = nowIso;
    updates.changes = state.changes + 1;
    updates.documentIds = [...candidates.map((c) => c.id), ...state.documentIds].slice(0, 50);
  }
  if (failed.length && !candidates.length) updates.lastError = failed[0].error.slice(0, 500);
  void collectionTitle;
  return {
    result: {
      sourceId: state.id,
      url: state.url,
      label: state.label,
      status,
      reason: `new_${fresh.length}_ingested_${candidates.length}`,
      candidates,
      failed,
      newEntries: fresh.length,
    },
    updates,
  };
}

async function checkFeed(
  state: WatchedSourceState,
  fetchImpl: FetchImpl,
  nowIso: string,
): Promise<ItemOutcome> {
  const fetched = await fetchImpl(state.url, {
    etag: state.lastEtag,
    lastModified: state.lastModified,
    accept: ACCEPT_FEED,
  });
  if (fetched.notModified) {
    return {
      result: { sourceId: state.id, url: state.url, label: state.label, status: "unchanged", reason: "not_modified" },
      updates: { lastStatus: "unchanged", lastError: null, lastEtag: fetched.etag, lastModified: fetched.lastModified },
    };
  }
  const feed = parseFeed(fetched.raw);
  return checkItems(state, fetched, feed.entries, feed.title || state.label, fetchImpl, nowIso);
}

async function checkListing(
  state: WatchedSourceState,
  fetchImpl: FetchImpl,
  nowIso: string,
): Promise<ItemOutcome> {
  const fetched = await fetchImpl(state.url, { etag: state.lastEtag, lastModified: state.lastModified });
  if (fetched.notModified) {
    return {
      result: { sourceId: state.id, url: state.url, label: state.label, status: "unchanged", reason: "not_modified" },
      updates: { lastStatus: "unchanged", lastError: null, lastEtag: fetched.etag, lastModified: fetched.lastModified },
    };
  }
  const markup = fetched.raw.toString("utf-8");
  const links = extractLinks(markup, fetched.url, state.linkPattern ?? "");
  if (!links.length) {
    // A pattern that matches nothing is almost always a redesigned page or a
    // wrong pattern — and either way nobody is watching this publisher any
    // more. Silence here would read exactly like "no new regulations".
    throw new FetchError(
      "Tidak ada tautan di halaman itu yang cocok dengan pola. Mungkin situsnya ganti tata letak atau polanya salah — tidak ada yang diawasi di sini.",
      { permanent: true },
    );
  }
  return checkItems(state, fetched, links, state.label, fetchImpl, nowIso);
}

// ---------------------------------------------------------------------------
// One source, now. `force` skips the interval, not the lock.
// ---------------------------------------------------------------------------

export async function checkSource(sourceId: string, deps: CheckDeps, force = false): Promise<CheckResult> {
  const { store } = deps;
  const fetchImpl = deps.fetchImpl ?? fetchUrl;
  const nowMs = deps.nowMs ?? Date.now();
  const nowIso = new Date(nowMs).toISOString();

  const loaded = await store.load().catch(() => null);
  const state = loaded?.data.sources[sourceId];
  if (!state) return { sourceId, url: "", label: "", status: "not_found" };
  if (!state.enabled && !force) {
    return { sourceId, url: state.url, label: state.label, status: "disabled" };
  }
  if (!force && !isDue(state, nowMs)) {
    return { sourceId, url: state.url, label: state.label, status: "not_due" };
  }
  if (!(await claim(store, sourceId, nowMs))) {
    return { sourceId, url: state.url, label: state.label, status: "busy" };
  }

  try {
    const reloaded = await store.load().catch(() => null);
    const fresh = reloaded?.data.sources[sourceId] ?? state;
    const outcome =
      fresh.kind === "feed"
        ? await checkFeed(fresh, fetchImpl, nowIso)
        : fresh.kind === "listing"
          ? await checkListing(fresh, fetchImpl, nowIso)
          : await checkDocument(fresh, fetchImpl, nowIso);
    await release(store, sourceId, {
      ...outcome.updates,
      lastCheckedAt: nowIso,
      checks: fresh.checks + 1,
    });
    return outcome.result;
  } catch (error) {
    if (error instanceof FetchError) {
      await release(store, sourceId, {
        lastStatus: "error",
        lastError: error.message.slice(0, 500),
        lastCheckedAt: nowIso,
        checks: state.checks + 1,
      });
      return { sourceId, url: state.url, label: state.label, status: "error", error: error.message };
    }
    await release(store, sourceId, {
      lastStatus: "error",
      lastError: `unexpected: ${error instanceof Error ? error.name : "error"}`,
      lastCheckedAt: nowIso,
      checks: state.checks + 1,
    });
    throw error;
  }
}
