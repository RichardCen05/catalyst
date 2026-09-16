import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadMemory, saveMemory } from "@/lib/memory/gcs-memory";
import { playbookSchema } from "@/lib/schemas";

/**
 * Anonymous per-browser identity. No sign-in, so this cookie IS the user as
 * far as GCS memory is concerned: clear it, or open the app on another
 * device, and the next request mints a new uid with empty memory. Anything
 * described as "remembers you across devices" needs an account first.
 */
const COOKIE_NAME = "catalyst_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readUid(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  // Literal pattern on purpose: COOKIE_NAME is a constant, and keeping the
  // RegExp literal means no user-controlled string ever reaches RegExp.
  const match = cookie.match(/catalyst_uid=([0-9a-f-]{36})/);
  return match?.[1] ?? null;
}

function withUidCookie(response: NextResponse, uid: string): NextResponse {
  response.cookies.set(COOKIE_NAME, uid, { httpOnly: true, sameSite: "lax", secure: true, maxAge: COOKIE_MAX_AGE, path: "/" });
  return response;
}

export async function GET(request: Request) {
  const uid = readUid(request) ?? randomUUID();
  try {
    const data = await loadMemory(uid);
    return withUidCookie(NextResponse.json({ data: data ?? {} }), uid);
  } catch {
    // GCS unreachable (e.g. running outside Cloud Run) — the client falls back to localStorage.
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
  if (patch.playbook !== undefined) {
    const parsed = playbookSchema.safeParse(patch.playbook);
    if (!parsed.success) {
      return NextResponse.json({ error: "Playbook tidak valid", details: parsed.error.flatten() }, { status: 400 });
    }
    // playbookSchema tidak .strict(): kunci tak dikenal ter-strip; simpan hasil parse
    // agar field thresholds yang dikenal justru lolos (schema extension di Task 1).
    patch = { ...patch, playbook: parsed.data };
  }
  try {
    const saved = await saveMemory(uid, patch);
    return withUidCookie(NextResponse.json({ data: saved }), uid);
  } catch {
    return withUidCookie(NextResponse.json({ unavailable: true }, { status: 200 }), uid);
  }
}
