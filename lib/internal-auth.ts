/**
 * Bearer guard for `/api/internal/*` (Cloud Scheduler targets).
 *
 * Pentest Rec 3: the routes historically ran OPEN when
 * `INTERNAL_CRON_SECRET` was unset ("degrade-to-local"). That is convenient
 * for local dev but means a production deploy that forgets the secret serves
 * scheduler endpoints to the internet. The rule from here on:
 *
 *   - secret set   → Bearer token must match, everywhere (401 otherwise);
 *   - secret unset + production (`NODE_ENV=production`, which the Dockerfile
 *     sets, or `K_SERVICE`, which Cloud Run sets) → 503 fail-closed, so the
 *     misconfiguration is loud instead of open;
 *   - secret unset + local dev → open, as before.
 *
 * Both internal routes share this helper so the rule cannot drift between
 * them again.
 */

export type InternalAuth =
  | { ok: true }
  | { ok: false; status: 401 | 503; error: string };

export function checkInternalAuth(request: Request): InternalAuth {
  const secret = process.env.INTERNAL_CRON_SECRET;
  if (secret) {
    return request.headers.get("authorization") === `Bearer ${secret}`
      ? { ok: true }
      : { ok: false, status: 401, error: "unauthorized" };
  }
  const isProduction = process.env.NODE_ENV === "production" || Boolean(process.env.K_SERVICE);
  if (isProduction) {
    return { ok: false, status: 503, error: "internal-auth-misconfigured" };
  }
  return { ok: true };
}
