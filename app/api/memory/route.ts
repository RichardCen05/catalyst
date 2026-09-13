import { randomUUID } from "node:crypto";
import { NextResponse } from "next/server";
import { loadMemory, saveMemory } from "@/lib/memory/gcs-memory";

const COOKIE_NAME = "catalyst_uid";
const COOKIE_MAX_AGE = 60 * 60 * 24 * 365;

function readUid(request: Request): string | null {
  const cookie = request.headers.get("cookie") ?? "";
  const match = cookie.match(new RegExp(`${COOKIE_NAME}=([0-9a-f-]{36})`));
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
  try {
    const saved = await saveMemory(uid, patch);
    return withUidCookie(NextResponse.json({ data: saved }), uid);
  } catch {
    return withUidCookie(NextResponse.json({ unavailable: true }, { status: 200 }), uid);
  }
}
