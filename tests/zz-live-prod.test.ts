import { describe, expect, it } from "vitest";
import { demoProfiles } from "@/lib/data/fixtures";

/** Hits the deployed service with a real chat payload. Skipped unless PROD_PROBE=1. */
const live = process.env.PROD_PROBE === "1";
const BASE = process.env.PROD_BASE || "https://catalyst-web-ibyebnreqa-uc.a.run.app";

describe.skipIf(!live)("deployed copilot", () => {
  it("answers through the configured provider", async () => {
    const profile = demoProfiles[0];
    const questions = [
      "Berapa volume terakhir yang tercatat?",
      "Apa yang terjadi dengan arus asing?",
      "Bagaimana momentum minggu ini?",
    ];
    const out: unknown[] = [];
    for (const question of questions) {
      const started = Date.now();
      const response = await fetch(`${BASE}/api/chat`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ question, profile, contextSymbol: profile.watchlist[0] }),
      });
      const body = await response.json();
      out.push({
        ms: Date.now() - started,
        status: response.status,
        note: body?.answer?.llmFallbackNote ?? null,
        text: (body?.answer?.text ?? body?.error ?? "").slice(0, 220),
      });
    }
    const fs = await import("node:fs");
    fs.writeFileSync("/tmp/prod-probe.json", JSON.stringify(out, null, 2));
    expect(out.length).toBe(questions.length);
  }, 300000);
});
