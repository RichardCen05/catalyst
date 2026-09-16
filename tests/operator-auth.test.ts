import { afterEach, describe, expect, it, vi } from "vitest";
import { checkOperatorAuth } from "@/lib/operator-auth";

/** The UI-facing mutations decide what the causal chain may show and whether
 *  live Sectors credits are spent. On a public Cloud Run URL they must not be
 *  anonymous; a deploy that forgets the token must be loud, not open. */

const TOKEN = "operator-token-123";

const requestWith = (auth?: string): Request =>
  new Request("http://localhost/api/web-watch", {
    method: "POST",
    headers: auth ? { authorization: auth } : {},
  });

afterEach(() => {
  vi.unstubAllEnvs();
});

describe("checkOperatorAuth", () => {
  it("accepts the matching bearer token", () => {
    vi.stubEnv("OPERATOR_TOKEN", TOKEN);
    expect(checkOperatorAuth(requestWith(`Bearer ${TOKEN}`))).toEqual({ ok: true });
  });

  it("rejects a wrong, malformed, or missing token with 401", () => {
    vi.stubEnv("OPERATOR_TOKEN", TOKEN);
    for (const header of [`Bearer wrong`, TOKEN, `bearer ${TOKEN}`, undefined]) {
      const result = checkOperatorAuth(requestWith(header));
      expect(result.ok).toBe(false);
      if (!result.ok) expect(result.status).toBe(401);
    }
  });

  /** Secret Manager stores the payload verbatim, so a token saved with a
   *  trailing newline reaches the process as "token\n". No HTTP header value
   *  can carry that newline, so an untrimmed compare rejects every caller —
   *  which is exactly what locked operator mutations out of production. */
  it("accepts the bearer token when the stored secret has trailing whitespace", () => {
    vi.stubEnv("OPERATOR_TOKEN", `${TOKEN}\n`);
    expect(checkOperatorAuth(requestWith(`Bearer ${TOKEN}`))).toEqual({ ok: true });
  });

  it("still rejects a wrong token when the stored secret has trailing whitespace", () => {
    vi.stubEnv("OPERATOR_TOKEN", `${TOKEN}\n`);
    const result = checkOperatorAuth(requestWith("Bearer wrong"));
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(401);
  });

  it("fails closed with 503 in production when the token is unset", () => {
    vi.stubEnv("OPERATOR_TOKEN", "");
    vi.stubEnv("K_SERVICE", "catalyst-web");
    const result = checkOperatorAuth(requestWith());
    expect(result.ok).toBe(false);
    if (!result.ok) expect(result.status).toBe(503);
  });

  it("stays open in local dev when the token is unset", () => {
    vi.stubEnv("OPERATOR_TOKEN", "");
    vi.stubEnv("K_SERVICE", "");
    vi.stubEnv("NODE_ENV", "development");
    expect(checkOperatorAuth(requestWith())).toEqual({ ok: true });
  });
});
