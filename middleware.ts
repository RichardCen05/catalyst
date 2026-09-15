import { NextResponse } from "next/server";

/**
 * CORS for the Vercel-UI → Cloud Run-API split.
 *
 * Same-origin callers (Cloud Run UI version, local `pnpm dev`) need no CORS
 * and are unaffected. Cross-origin callers (Vercel UI) must be allowlisted
 * via `API_CORS_ORIGIN` (comma-separated, e.g.
 * `https://catalyst.vercel.app,https://catalyst-richard.vercel.app`).
 * Unset = same-origin only; the preflight is answered without an
 * `Access-Control-Allow-Origin` header so the browser blocks it.
 */
function allowedOrigin(request: Request): string | null {
  const origin = request.headers.get("origin");
  if (!origin) return null;
  const allowlist = (process.env.API_CORS_ORIGIN ?? "")
    .split(",")
    .map((entry) => entry.trim().replace(/\/+$/, ""))
    .filter(Boolean);
  return allowlist.includes(origin) ? origin : null;
}

export function middleware(request: Request) {
  const origin = allowedOrigin(request);
  if (request.method === "OPTIONS") {
    return new NextResponse(null, {
      status: 204,
      headers: {
        ...(origin ? { "Access-Control-Allow-Origin": origin } : {}),
        "Access-Control-Allow-Methods": "GET,POST,OPTIONS",
        "Access-Control-Allow-Headers": "Content-Type,Authorization",
        "Access-Control-Max-Age": "600",
        Vary: "Origin",
      },
    });
  }
  const response = NextResponse.next();
  if (origin) {
    response.headers.set("Access-Control-Allow-Origin", origin);
    response.headers.set("Vary", "Origin");
  }
  return response;
}

export const config = { matcher: "/api/:path*" };
