/**
 * Bearer guard for `POST /api/settings/refresh` — flipping the Sectors gate
 * and spending live credits.
 *
 * It ran anonymous. The Cloud Run URL is public, so anyone who found it could
 * switch live spending on, bounded only by the daily credit budget. Reads stay
 * open — the app has no sign-in and the browser must still render its pages.
 *
 * Review of the web-watch queue is deliberately not guarded: accepting or
 * dismissing a candidate spends nothing, and the gate there only stood between
 * a reader and the queue. Money stays behind this bearer; editorial judgement
 * does not.
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
  // Trimmed on both sides: a secret payload stored with a trailing newline
  // (Secret Manager keeps the bytes verbatim) can never match a header value,
  // because HTTP header values cannot carry one. That failure mode locked
  // every operator mutation out of production and read as a wrong token.
  const token = process.env.OPERATOR_TOKEN?.trim();
  if (token) {
    return request.headers.get("authorization")?.trim() === `Bearer ${token}`
      ? { ok: true }
      : { ok: false, status: 401, error: "Token operator tidak cocok. Isi di Pengaturan → Token operator." };
  }
  const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE);
  if (isProduction) {
    return { ok: false, status: 503, error: "operator-auth-misconfigured" };
  }
  return { ok: true };
}
