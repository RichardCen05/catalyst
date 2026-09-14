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
import { claim, release, type RegistryStore } from "@/lib/web-watch/registry";
import type { MarketEvent } from "@/lib/types";
import { isDue, type CheckResult, type WatchedSourceState } from "@/lib/web-watch/types";

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

/** A change, packaged exactly like any other event input — but with no
 *  impact links. The mapping to symbols happens at review time, in the open,
 *  not inside the fetcher. */
export function buildCandidate(
  state: WatchedSourceState,
  text: SourceText,
  fetchedUrl: string,
  title: string | null,
  publishedAt: string | null,
  key: string,
  nowIso: string,
): MarketEvent {
  const headline = (title ?? text.text.split("\n")[0] ?? fetchedUrl).slice(0, 200) || fetchedUrl;
  const citationId = `web-${state.id}-${textSha(text).slice(0, 8)}`;
  return {
    id: candidateId(state.id, key, textSha(text)),
    title: headline,
    summary: text.text.slice(0, 500),
    body: text.text.slice(0, BODY_CAP),
    category: state.category,
    sourceType: state.sourceType,
    publishedAt: publishedAt ?? nowIso,
    asOf: nowIso,
    sector: "Market",
    impactLinks: [],
    citations: [
      {
        id: citationId,
        provider: hostOf(fetchedUrl),
        endpoint: "web-watch",
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
  if (state.lastTextSha && textSha(text) === state.lastTextSha) {
    return {
      result: { sourceId: state.id, url: state.url, label: state.label, status: "unchanged", reason: "same_text" },
      updates: {
        lastStatus: "unchanged",
        lastError: null,
        lastEtag: fetched.etag,
        lastModified: fetched.lastModified,
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
      candidates.push(buildCandidate(state, itemText, itemFetch.url, item.title, item.published, item.key, nowIso));
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
