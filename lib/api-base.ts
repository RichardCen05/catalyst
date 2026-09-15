/**
 * Single choke point for every browser `fetch` to our own API.
 *
 * Split contract (Vercel UI + Cloud Run API, Cloud Run UI kept):
 *   - Vercel UI sets `NEXT_PUBLIC_API_BASE_URL=https://<cloud-run-service>`
 *     so all `/api/*` traffic goes to Cloud Run, where secrets/GCS live.
 *   - Cloud Run UI (and local `pnpm dev`) leaves it EMPTY, so calls stay
 *     same-origin relative (`/api/...`) and keep working unchanged.
 *
 * Only `NEXT_PUBLIC_`-prefixed env is readable in the browser — that is why
 * this is the one exception to the "no NEXT_PUBLIC keys" rule in
 * `.env.example`. It carries a URL, never a secret.
 */
const RAW_BASE = (process.env.NEXT_PUBLIC_API_BASE_URL ?? "").trim();
export const API_BASE = RAW_BASE.replace(/\/+$/, "");

export function apiUrl(path: `/api/${string}`): string {
  return `${API_BASE}${path}`;
}
