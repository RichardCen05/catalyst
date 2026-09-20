import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadMemory, saveMemory } from "@/lib/memory/gcs-memory";
import { memoryPatchFieldSchemas } from "@/lib/schemas";

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

export async function POST(request: Request) {
  const uid = readUid(request) ?? randomUUID();
  let patch: Record<string, unknown>;
  try {
    patch = await request.json();
  } catch {
    return NextResponse.json({ error: "Body bukan JSON valid" }, { status: 400 });
  }
  // C6: thresholds mencapai GCS tanpa validasi bila tidak diperiksa di sini.
  // /api/analyze dkk memvalidasi via zod (400 bila out-of-bound); samakan untuk backup memori.
  // Setiap kunci memori yang punya skema diperiksa, bukan playbook saja: snapshot
  // berbentuk salah pernah lolos ke GCS lalu dihidrasi kembali ke store.
  for (const [key, schema] of Object.entries(memoryPatchFieldSchemas)) {
    if (patch[key] === undefined) continue;
    const parsed = schema.safeParse(patch[key]);
    if (!parsed.success) {
      return NextResponse.json({ error: `Memori tidak valid pada ${key}`, field: key, details: parsed.error.flatten() }, { status: 400 });
    }
    // Skema tidak .strict(): kunci tak dikenal ter-strip; simpan hasil parse
    // agar field yang dikenal justru lolos (schema extension di Task 1).
    patch = { ...patch, [key]: parsed.data };
  }
  try {
    const saved = await saveMemory(uid, patch);
    return withUidCookie(NextResponse.json({ data: saved }), uid);
  } catch (error) {
    reportMemoryFailure("write", error);
    return withUidCookie(NextResponse.json({ unavailable: true }, { status: 200 }), uid);
  }
}
