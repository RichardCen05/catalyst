/**
 * Reading a watched URL over HTTP, and turning it into text.
 *
 * Port of ReguLens `api/app/core/fetching.py`. Everything here is
 * deterministic with no GCS in it, so what counts as a change and what a feed
 * entry is called are testable without a network.
 *
 * Three lessons carried over verbatim:
 *
 * 1. The bytes change even when the wording does not (session cookies,
 *    request ids, timestamps). Hash the *extracted text*, never the raw body.
 * 2. Conditional GET (ETag / Last-Modified) is a bonus, not the mechanism.
 *    Servers that send no validators (most Indonesian regulator CMS pages)
 *    are downloaded and compared by text hash instead.
 * 3. What works from a laptop may not work from a datacenter. IDX answers a
 *    datacenter address with `403` (verified 14 Sep 2026, like EUR-Lex's `202`
 *    challenge page in ReguLens), so an empty/blocked body is its own named
 *    failure and the IDX seed stays `enabled: false` until a machine-readable
 *    address is found.
 */

import { createHash } from "node:crypto";

export class FetchError extends Error {
  permanent: boolean;
  constructor(message: string, options?: { permanent?: boolean }) {
    super(message);
    this.name = "FetchError";
    this.permanent = options?.permanent ?? false;
  }
}

export interface Fetched {
  url: string;
  status: number;
  contentType: string;
  raw: Buffer;
  etag: string | null;
  lastModified: string | null;
  /** Server answered 304: there is no body to look at. Cheapest answer. */
  notModified: boolean;
}

export interface SourceText {
  text: string;
  /** html | plain | json */
  method: "html" | "plain" | "json";
}

export function sha256Hex(text: string): string {
  return createHash("sha256").update(text, "utf8").digest("hex");
}

export function textSha(text: SourceText): string {
  return sha256Hex(text.text);
}

export const ACCEPT_DOCUMENT =
  "text/html,application/xhtml+xml,application/json;q=0.9,text/plain;q=0.8,application/xml;q=0.5,*/*;q=0.4";
export const ACCEPT_FEED =
  "application/rss+xml,application/atom+xml,application/xml;q=0.9,text/xml;q=0.9,*/*;q=0.5";

export const USER_AGENT = "CatalystWebWatch/1.0 (+https://catalyst.local; market-research-monitor)";

export interface FetchOptions {
  etag?: string | null;
  lastModified?: string | null;
  timeoutMs?: number;
  maxBytes?: number;
  accept?: string;
}

const DEFAULT_TIMEOUT_MS = 25_000;
const DEFAULT_MAX_BYTES = 8 * 1024 * 1024;

/** GET a URL, conditionally when the caller holds validators. */
export async function fetchUrl(url: string, options: FetchOptions = {}): Promise<Fetched> {
  const timeoutMs = options.timeoutMs ?? DEFAULT_TIMEOUT_MS;
  const maxBytes = options.maxBytes ?? DEFAULT_MAX_BYTES;
  const headers: Record<string, string> = {
    "User-Agent": USER_AGENT,
    Accept: options.accept ?? ACCEPT_DOCUMENT,
    "Accept-Language": "id,en;q=0.8",
    "Accept-Encoding": "gzip, deflate",
  };
  if (options.etag) headers["If-None-Match"] = options.etag;
  if (options.lastModified) headers["If-Modified-Since"] = options.lastModified;

  let response: Response;
  try {
    response = await fetch(url, { headers, redirect: "follow", signal: AbortSignal.timeout(timeoutMs) });
  } catch (error) {
    throw new FetchError(
      `Alamat itu tidak bisa dijangkau: ${error instanceof Error ? error.name : "network-error"}`,
    );
  }

  const finalUrl = response.url || url;
  if (response.status === 304) {
    return {
      url: finalUrl,
      status: 304,
      contentType: "",
      raw: Buffer.alloc(0),
      etag: response.headers.get("etag") ?? options.etag ?? null,
      lastModified: response.headers.get("last-modified") ?? options.lastModified ?? null,
      notModified: true,
    };
  }
  if (response.status === 403 || response.status === 401) {
    throw new FetchError(
      `Sumber menjawab ${response.status}. Alamat itu menolak pembaca otomatis — coba alamat machine-readable penerbitnya.`,
    );
  }
  if (response.status >= 400) {
    throw new FetchError(
      `Sumber menjawab ${response.status}. Alamatnya mungkin pindah atau menolak pembaca otomatis.`,
    );
  }
  if (!response.body) {
    throw new FetchError(
      `Sumber menjawab ${response.status} tanpa isi. Sebagian situs menjawab begitu kepada pembaca otomatis; coba alamat machine-readable penerbitnya.`,
    );
  }

  const chunks: Buffer[] = [];
  let size = 0;
  const reader = response.body.getReader();
  for (;;) {
    const { done, value } = await reader.read();
    if (done) break;
    size += value.byteLength;
    if (size > maxBytes) {
      await reader.cancel().catch(() => undefined);
      throw new FetchError(
        `Berkasnya lebih dari ${Math.round(maxBytes / 1_048_576)} MB — lebih dari yang kami baca sekaligus. Arahkan ke lampiran spesifiknya.`,
        { permanent: true },
      );
    }
    chunks.push(Buffer.from(value));
  }
  const raw = Buffer.concat(chunks);
  if (raw.length === 0) {
    throw new FetchError(
      `Sumber menjawab ${response.status} tanpa isi. Sebagian situs menjawab begitu kepada pembaca otomatis; coba alamat machine-readable penerbitnya.`,
    );
  }
  return {
    url: finalUrl,
    status: response.status,
    contentType: response.headers.get("content-type") ?? "",
    raw,
    etag: response.headers.get("etag"),
    lastModified: response.headers.get("last-modified"),
    notModified: false,
  };
}

// ---------------------------------------------------------------------------
// Bytes to words
// ---------------------------------------------------------------------------

const DROP_BLOCKS = /<(script|style|noscript|template|svg)\b[\s\S]*?<\/\1\s*>/gi;
const LINE_BREAKS = /<br\s*\/?>|<\/(p|div|tr|li|h[1-6]|table|section|article)\s*>/gi;
const TAGS = /<[^>]+>/g;
const INLINE_SPACE = /[ \t   ]+/g;
const BLANK_LINES = /\n\s*\n\s*/g;

/** A government CMS wraps the page in kilobytes of nav. `<main>` is where the
 *  page itself says its content starts — read that when it exists. */
const MAIN_REGION = /<(main|article)\b[^>]*>([\s\S]*?)<\/\1\s*>/gi;

export function contentRegion(markup: string): string {
  const matches: string[] = [];
  MAIN_REGION.lastIndex = 0;
  let m: RegExpExecArray | null;
  while ((m = MAIN_REGION.exec(markup)) !== null) matches.push(m[2]);
  if (!matches.length) return markup;
  const best = matches.reduce((a, b) => (a.length >= b.length ? a : b));
  // A "content region" under a fifth of the page is a widget, not the page.
  return best.length * 5 >= markup.length ? best : markup;
}

function unescapeHtml(text: string): string {
  return text
    .replace(/&(amp|lt|gt|quot|#39|nbsp);/g, (m, e: string) =>
      e === "amp" ? "&" : e === "lt" ? "<" : e === "gt" ? ">" : e === "quot" ? '"' : e === "#39" ? "'" : " ",
    )
    .replace(/&#(\d+);/g, (_m, n: string) => String.fromCharCode(Number(n)))
    .replace(/&#x([0-9a-fA-F]+);/g, (_m, n: string) => String.fromCharCode(parseInt(n, 16)));
}

export function htmlToText(markup: string): string {
  let text = contentRegion(markup).replace(DROP_BLOCKS, " ");
  text = text.replace(LINE_BREAKS, "\n");
  text = text.replace(TAGS, " ");
  text = unescapeHtml(text);
  text = text.replace(INLINE_SPACE, " ");
  text = text
    .split("\n")
    .map((line) => line.trim())
    .join("\n");
  text = text.replace(BLANK_LINES, "\n\n");
  return text.trim();
}

export function looksLikeHtml(raw: Buffer, contentType = ""): boolean {
  const lowered = contentType.toLowerCase();
  if (lowered.includes("html")) return true;
  if (lowered.includes("xml") || lowered.includes("json") || lowered.includes("text/plain")) return false;
  const head = raw.subarray(0, 2048).toString("latin1").trimStart().toLowerCase();
  return head.startsWith("<!doctype html") || head.startsWith("<html") || head.includes("<body");
}

export function looksLikeJson(raw: Buffer, contentType = ""): boolean {
  if (contentType.toLowerCase().includes("json")) return true;
  const head = raw.subarray(0, 2048).toString("utf8").trimStart();
  return head.startsWith("{") || head.startsWith("[");
}

/** Turn a fetched body into the text a citation span could point at. */
export function toText(raw: Buffer, contentType = ""): SourceText {
  if (looksLikeJson(raw, contentType)) {
    return { text: raw.toString("utf-8").trim(), method: "json" };
  }
  const decoded = raw.toString("utf-8").replace(/�/g, "");
  const full = raw.toString("utf-8");
  if (looksLikeHtml(raw, contentType)) return { text: htmlToText(full), method: "html" };
  return { text: decoded.trim(), method: "plain" };
}

// ---------------------------------------------------------------------------
// Feeds — RSS 2.0 and Atom, parsed without a new dependency.
// ---------------------------------------------------------------------------

export interface FeedEntry {
  /** guid/id when the source gives one, else the link. */
  key: string;
  title: string;
  link: string;
  published: string | null;
}

export interface FeedRead {
  title: string;
  entries: FeedEntry[];
}

/** A feed is XML from a machine we do not control. `<!DOCTYPE` / `<!ENTITY`
 *  open entity-expansion attacks (billion laughs) against a scheduled job
 *  that fetches whatever URL a user typed — refused before parsing, since no
 *  legitimate RSS/Atom feed needs one. */
const DOCTYPE = /<!\s*(DOCTYPE|ENTITY)\b/i;

function fieldText(xml: string, name: string): string {
  const re = new RegExp(`<(?:\\w+:)?${name}\\b[^>]*>([\\s\\S]*?)<\\/(?:\\w+:)?${name}>`, "i");
  const match = xml.match(re);
  if (!match) return "";
  return stripCdata(match[1]).trim();
}

function stripCdata(text: string): string {
  return text.replace(/<!\[CDATA\[([\s\S]*?)\]\]>/g, "$1").trim();
}

function atomLink(entryXml: string): string {
  const links = [...entryXml.matchAll(/<link\b([^>]*)\/?>/gi)].map((m) => m[1]);
  let fallback = "";
  for (const attrs of links) {
    const href = /href\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1]?.trim() ?? "";
    if (!href) continue;
    const rel = /rel\s*=\s*["']([^"']+)["']/i.exec(attrs)?.[1] ?? "alternate";
    if (rel === "alternate") return href;
    fallback = fallback || href;
  }
  const inline = fieldText(entryXml, "link");
  return fallback || inline;
}

export function parseFeed(raw: Buffer): FeedRead {
  if (DOCTYPE.test(raw.subarray(0, 8192).toString("latin1"))) {
    throw new FetchError(
      "Feed itu membawa deklarasi document type, yang kami tolak baca. Feed regulator tidak membutuhkannya.",
      { permanent: true },
    );
  }
  const xml = raw.toString("utf-8");
  if (!xml.includes("<")) {
    throw new FetchError("Alamat itu tidak mengembalikan feed yang bisa dibaca.", { permanent: true });
  }

  // RSS 2.0 — presence of <channel> decides, like the ReguLens port.
  const channelMatch = /<channel\b[^>]*>([\s\S]*?)<\/channel\s*>/i.exec(xml);
  if (channelMatch) {
    const channel = channelMatch[1];
    const title = stripCdata(fieldText(channel, "title"));
    const entries: FeedEntry[] = [];
    for (const m of channel.matchAll(/<item\b[^>]*>([\s\S]*?)<\/item\s*>/gi)) {
      const item = m[1];
      const link = stripCdata(fieldText(item, "link"));
      const guid = stripCdata(fieldText(item, "guid"));
      const key = guid || link;
      if (!key) continue;
      entries.push({
        key,
        title: stripCdata(fieldText(item, "title")) || key,
        link: link || guid,
        published: stripCdata(fieldText(item, "pubDate")) || null,
      });
    }
    return { title, entries };
  }

  // Atom — root <feed>.
  if (/<feed\b/i.test(xml)) {
    const title = stripCdata(fieldText(xml, "title"));
    const entries: FeedEntry[] = [];
    for (const m of xml.matchAll(/<entry\b[^>]*>([\s\S]*?)<\/entry\s*>/gi)) {
      const entry = m[1];
      const link = atomLink(entry);
      const key = stripCdata(fieldText(entry, "id")) || link;
      if (!key) continue;
      entries.push({
        key,
        title: stripCdata(fieldText(entry, "title")) || key,
        link: link || key,
        published:
          stripCdata(fieldText(entry, "updated")) || stripCdata(fieldText(entry, "published")) || null,
      });
    }
    return { title, entries };
  }

  throw new FetchError("Alamat itu bukan feed RSS maupun Atom.", { permanent: true });
}

// ---------------------------------------------------------------------------
// Listings — every link on an index page whose address matches `pattern`.
// ---------------------------------------------------------------------------

const ANCHOR = /<a\b[^>]*?href\s*=\s*["']([^"']+)["'][^>]*>([\s\S]*?)<\/a\s*>/gi;

export function extractLinks(markup: string, baseUrl: string, pattern: string): FeedEntry[] {
  const compiled = new RegExp(pattern);
  const seen = new Set<string>();
  const entries: FeedEntry[] = [];
  ANCHOR.lastIndex = 0;
  let match: RegExpExecArray | null;
  while ((match = ANCHOR.exec(markup)) !== null) {
    const rawHref = unescapeHtml((match[1] ?? "").trim());
    if (!rawHref || rawHref.startsWith("#") || /^(javascript|mailto):/i.test(rawHref)) continue;
    let absolute: string;
    try {
      absolute = new URL(rawHref, baseUrl).toString().split("#")[0];
    } catch {
      continue;
    }
    if (!compiled.test(absolute) || seen.has(absolute)) continue;
    seen.add(absolute);
    const label = unescapeHtml((match[2] ?? "").replace(TAGS, " "))
      .replace(INLINE_SPACE, " ")
      .trim();
    entries.push({ key: absolute, title: (label || titleFromUrl(absolute)).slice(0, 200), link: absolute, published: null });
  }
  return entries;
}

function titleFromUrl(url: string): string {
  try {
    const path = new URL(url).pathname.replace(/\/+$/, "").split("/").pop() ?? "";
    const tail = decodeURIComponent(path).replace(/[_+]+/g, " ").replace(INLINE_SPACE, " ").trim();
    return tail || url;
  } catch {
    return url;
  }
}
