import { describe, expect, it } from "vitest";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";
import { extractNumerals } from "@/lib/agent/llm/verify";

/**
 * Availability probe, not a unit test. Skipped unless LIVE_BURST=1.
 *
 * Free pools on a gateway are shared, so a model that answers once says
 * nothing about a model under a burst. This fires the real answer path —
 * the real system instruction and the real verifier — and reports what
 * fraction came back usable.
 */
const live = process.env.LIVE_BURST === "1";
const TOTAL = Number(process.env.LIVE_BURST_N || 40);
const CONCURRENCY = Number(process.env.LIVE_BURST_C || 5);

const EVIDENCE =
  "BBCA harga penutupan 9.850 pada 2026-09-18, volume 1.234 lot, naik 12,5% dari rata-rata 30 hari. " +
  "Asing beli bersih 45,2 miliar rupiah. Sektor keuangan menguat 2,1% pada sesi yang sama.";
// The allowlist is built the way the retrieval layer builds it, from the
// evidence text itself — a hand-typed list rejects faithful drafts.
const NUMBERS = extractNumerals(EVIDENCE);
const QUESTIONS = [
  "Berapa volume BBCA terakhir?",
  "Apa yang terjadi dengan asing di BBCA?",
  "Bagaimana sektor keuangan bergerak?",
  "Kenapa volume BBCA naik?",
  "Berapa harga penutupan BBCA?",
];

interface Outcome {
  ok: boolean;
  ms: number;
  kind: string;
  detail: string;
}

async function once(index: number): Promise<Outcome> {
  const started = Date.now();
  try {
    const draft = await composeAnswerWithLlm({
      question: `${QUESTIONS[index % QUESTIONS.length]} (${index})`,
      evidenceSummary: EVIDENCE,
      evidenceNumbers: NUMBERS,
    });
    return { ok: true, ms: Date.now() - started, kind: "ok", detail: draft.text.slice(0, 80) };
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    const kind = /rejected by verifier/.test(message)
      ? "verifier"
      : /\b429\b/.test(message)
        ? "429"
        : /\b5\d\d\b/.test(message)
          ? "5xx"
          : /timeout|ETIMEDOUT|aborted/i.test(message)
            ? "timeout"
            : "other";
    return { ok: false, ms: Date.now() - started, kind, detail: message.slice(0, 120) };
  }
}

describe.skipIf(!live)("live burst", () => {
  it(`fires ${TOTAL} answers at concurrency ${CONCURRENCY}`, async () => {
    const results: Outcome[] = [];
    let next = 0;
    const started = Date.now();
    await Promise.all(
      Array.from({ length: CONCURRENCY }, async () => {
        for (;;) {
          const index = next++;
          if (index >= TOTAL) return;
          results.push(await once(index));
        }
      }),
    );
    const wall = Date.now() - started;

    const byKind = new Map<string, number>();
    for (const r of results) byKind.set(r.kind, (byKind.get(r.kind) ?? 0) + 1);
    const okLatencies = results.filter((r) => r.ok).map((r) => r.ms).sort((a, b) => a - b);
    const at = (q: number) => (okLatencies.length ? okLatencies[Math.min(okLatencies.length - 1, Math.floor(okLatencies.length * q))] : 0);

    const report = {
      model: process.env.LLM_MODEL,
      total: TOTAL,
      concurrency: CONCURRENCY,
      wallSeconds: Number((wall / 1000).toFixed(1)),
      outcomes: Object.fromEntries(byKind),
      p50: at(0.5),
      p90: at(0.9),
      max: okLatencies.at(-1) ?? 0,
      failures: results.filter((x) => !x.ok).map((x) => ({ kind: x.kind, detail: x.detail })),
      samples: results.filter((x) => x.ok).slice(0, 3).map((x) => x.detail),
      // Raw latencies, so a rate can be recomputed against engine.ts's
      // 20s answer race without spending another burst.
      okLatencies,
    };
    const fs = await import("node:fs");
    fs.writeFileSync(process.env.LIVE_BURST_OUT || "/tmp/burst.json", JSON.stringify(report, null, 2));
    console.log(`\nmodel     ${process.env.LLM_MODEL}`);
    console.log(`requests  ${TOTAL} at concurrency ${CONCURRENCY} in ${(wall / 1000).toFixed(1)}s`);
    console.log(`outcomes  ${[...byKind.entries()].map(([k, v]) => `${k}=${v}`).join("  ")}`);
    console.log(`latency   p50 ${at(0.5)}ms  p90 ${at(0.9)}ms  max ${okLatencies.at(-1) ?? 0}ms`);
    for (const r of results.filter((x) => !x.ok).slice(0, 6)) console.log(`  FAIL ${r.kind}: ${r.detail}`);
    for (const r of results.filter((x) => x.ok).slice(0, 2)) console.log(`  OK: ${r.detail}`);

    expect(results.length).toBe(TOTAL);
  }, 600000);
});
