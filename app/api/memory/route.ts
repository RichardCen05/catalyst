import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadMemory, saveMemory } from "@/lib/memory/gcs-memory";
import { MEMORY_SNAPSHOT_VERSION, memoryPatchFieldSchemas } from "@/lib/schemas";
import { MEMORY_SNAPSHOT_KEYS } from "@/lib/memory/snapshot";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

/**
 * Anonymous per-browser identity. No sign-in, so this cookie IS the user as
 * far as GCS memory is concerned: clear it, or open the app on another
 * device, and the next request mints a new uid with empty memory. Anything
 * described as "remembers you across devices" needs an account first.
 */
const COOKIE_NAME = "catalyst_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

/**
 * Anchored on the cookie boundary on purpose.
 *
 * The unanchored form matched inside any cookie whose NAME merely ends in
 * `catalyst_uid` — `xcatalyst_uid=<uid>` was read as ours. Anyone able to set
 * a cookie on this domain (a sibling subdomain, an XSS on any path) could
 * therefore pin a reader onto a namespace of their choosing, which is both a
 * read of someone else's memory and a write into it.
 */
const UID_COOKIE_PATTERN = /(?:^|;)\s*catalyst_uid=([0-9a-f-]{36})(?:;|$)/;

function readUid(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  // Literal pattern on purpose: COOKIE_NAME is a constant, and keeping the
  // RegExp literal means no user-controlled string ever reaches RegExp.
  const match = cookie.match(UID_COOKIE_PATTERN);
  return match?.[1] ?? null;
}

function withUidCookie(response: NextResponse, uid: string): NextResponse {
  response.cookies.set(COOKIE_NAME, uid, { httpOnly: true, sameSite: "lax", secure: true, maxAge: COOKIE_MAX_AGE, path: "/" });
  return response;
}

/**
 * The uid is the entire identity, so it never reaches a log line. What an
 * operator needs is that the bucket refused and why; a 200 `{unavailable}`
 * with no trace is how a wrong service account looked exactly like a browser
 * that had never saved anything.
 */
function reportMemoryFailure(operation: "read" | "write", error: unknown): void {
  console.error(`[memory] GCS ${operation} unavailable: ${error instanceof Error ? error.message : String(error)}`);
}

export async function GET(request: Request) {
  const uid = readUid(request) ?? randomUUID();
  try {
    const data = await loadMemory(uid);
    return withUidCookie(NextResponse.json({ data: data ?? {} }), uid);
  } catch (error) {
    // GCS unreachable (e.g. running outside Cloud Run) — the client falls back to localStorage.
    reportMemoryFailure("read", error);
    return withUidCookie(NextResponse.json({ data: {}, unavailable: true }, { status: 200 }), uid);
  }
}

/**
 * Read the body with a hard ceiling, in bytes on the wire.
 *
 * Two things this is not: a `String.length` check (that counts UTF-16 units,
 * so a mandate in a non-Latin script would pass a character check and still
 * write an object twice the size it was measured at), and a Content-Length
 * check (absent on a chunked upload, and a value the client chooses anyway).
 * The stream is read in chunks and cancelled the moment the running total
 * passes the limit, so an oversized body never lands in this process — the
 * ceiling protects the Cloud Run instance, not only the stored object.
 *
 * Why there is a ceiling at all: the whole object is read and rewritten on
 * every sync, both halves under one `GCS_REQUEST_TIMEOUT_MS`, so an object
 * that outgrows it makes a reader's memory permanently unavailable rather
 * than slow.
 */
async function readBoundedBody(request: Request, limit: number): Promise<string | null> {
  const declared = Number(request.headers.get("content-length"));
  if (Number.isFinite(declared) && declared > limit) return null;
  const body = request.body;
  if (!body) {
    const raw = await request.text();
    return new TextEncoder().encode(raw).length > limit ? null : raw;
  }
  const reader = body.getReader();
  const chunks: Uint8Array[] = [];
  let total = 0;
  while (true) {
    const { done, value } = await reader.read();
    if (done) break;
    if (!value) continue;
    total += value.byteLength;
    if (total > limit) {
      await reader.cancel();
      return null;
    }
    chunks.push(value);
  }
  const joined = new Uint8Array(total);
  let offset = 0;
  for (const chunk of chunks) {
    joined.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(joined);
}

export async function POST(request: Request) {
  const uid = readUid(request) ?? randomUUID();
  const limit = DEFAULT_THRESHOLDS.memoryPatchMaxBytes;

  const raw = await readBoundedBody(request, limit);
  if (raw === null) {
    return NextResponse.json({ error: "Memori terlalu besar", limit }, { status: 413 });
  }

  let body: Record<string, unknown>;
  try {
    body = JSON.parse(raw) as Record<string, unknown>;
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  if (!body || typeof body !== "object" || Array.isArray(body)) {
    return NextResponse.json({ error: "Body bukan objek memori" }, { status: 400 });
  }

  /**
   * A hard allowlist, built from the schemas rather than filtered against them.
   *
   * The previous rule was the inverse — check what has a schema, forward the
   * rest — so `feedback`, `preferences`, `ruleProposals`, `caseResolutions`,
   * `caseStatuses`, `caseMandates` and `holdings` reached GCS unchecked, and
   * anything else a client sent was stored verbatim and handed back at
   * hydration. A key with no schema is now dropped here, which means adding a
   * store field and adding its schema are the same change.
   */
  const patch: Record<string, unknown> = {};
  for (const key of MEMORY_SNAPSHOT_KEYS) {
    const value = body[key];
    if (value === undefined) continue;
    const parsed = memoryPatchFieldSchemas[key].safeParse(value);
    if (!parsed.success) {
      return NextResponse.json({ error: `Memori tidak valid pada ${key}`, field: key, details: parsed.error.flatten() }, { status: 400 });
    }
    patch[key] = parsed.data;
  }
  // Nothing recognisable in the body: writing would bump the object's
  // generation to store a version stamp and nothing else, and would tell the
  // client its memory was saved when none of it was.
  if (Object.keys(patch).length === 0) {
    return NextResponse.json({ error: "Tidak ada kunci memori yang dikenal" }, { status: 400 });
  }
  // Stamped so a stored object says which shape it is. Nothing reads it back
  // today — `migrateMemorySnapshot` fills by key and is version-blind on
  // purpose — but objects written from here on carry it, which is what makes a
  // future shape change that cannot be inferred from the keys possible at all.
  // Dropped again at hydration: it is not an allowlisted store key.
  patch.version = MEMORY_SNAPSHOT_VERSION;

  try {
    const saved = await saveMemory(uid, patch);
    return withUidCookie(NextResponse.json({ data: saved }), uid);
  } catch (error) {
    reportMemoryFailure("write", error);
    return withUidCookie(NextResponse.json({ unavailable: true }, { status: 200 }), uid);
  }
}
