/**
 * Bearer guard for the UI-facing mutations: `POST /api/web-watch` (accept or
 * dismiss a scraped candidate, which decides what the causal chain may show)
 * and `POST /api/settings/refresh` (flip the Sectors gate, spend credits).
 *
 * Both ran anonymous. The Cloud Run URL is public, so anyone who found it
 * could inject an event into the chain or switch live spending on, bounded
 * only by the daily credit budget. Reads stay open — the app has no sign-in
 * and the browser must still render the queue.
 *
 * Same posture as `checkInternalAuth`, one token class lower:
 *
 *   - `OPERATOR_TOKEN` set   → Bearer token must match (401 otherwise);
 *   - unset + production     → 503 fail-closed, so a missing token is loud;
 *   - unset + local dev      → open, so `pnpm dev` needs no setup.
 *
 * The browser sends the token from `lib/operator-token.ts`; it is pasted once
 * into the Pengaturan drawer and never baked into the bundle.
 */

export type OperatorAuth =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function checkOperatorAuth(request: Request): OperatorAuth {
  const token = process.env.OPERATOR_TOKEN;
  if (token) {
    return request.headers.get("authorization") === `Bearer ${token}`
      ? { ok: true }
      : { ok: false, status: 401, error: "Token operator tidak cocok. Isi di Pengaturan → Token operator." };
  }
  const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE);
  if (isProduction) {
    return { ok: false, status: 503, error: "operator-auth-misconfigured" };
  }
  return { ok: true };
}
