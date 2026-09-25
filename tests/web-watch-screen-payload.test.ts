/**
 * Screen payload dump for the offline NLI replay (`scripts/screen/replay.py`).
 *
 * Skipped unless an output path is set. It never reads or writes GCS.
 *
 *   WEB_WATCH_QUEUE_FILE=<copy of queue.json> WEB_WATCH_SCREEN_PAYLOAD_OUT=<path>
 *     dumps the decide route's `GET` payload for that queue's pending items.
 *   WEB_WATCH_SCREEN_GOLDEN_OUT=<path>
 *     dumps the same payload for the golden text set, built from the
 *     gitignored article cache (`tests/fixtures/.cache/<id>.txt`). A golden
 *     item without cached text is left out and listed in `missing`.
 *
 * The Python side never rebuilds windows or hypotheses; it reads these files.
 */
import { existsSync, readFileSync, writeFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { normalizeQueue } from "@/lib/web-watch/queue";
import { screenItem, screenPayload, screenThresholds } from "@/lib/web-watch/screen-payload";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { DEFAULT_SOURCE_LANG } from "@/lib/web-watch/hypotheses";
import type { MarketEvent } from "@/lib/types";

const queueFile = process.env.WEB_WATCH_QUEUE_FILE;
const payloadOut = process.env.WEB_WATCH_SCREEN_PAYLOAD_OUT;
const goldenOut = process.env.WEB_WATCH_SCREEN_GOLDEN_OUT;
const CACHE = "tests/fixtures/.cache";

describe.skipIf(!queueFile || !payloadOut)("screen payload dump: queue", () => {
  it("writes the GET payload for the queue copy's pending items", () => {
    const queue = normalizeQueue(JSON.parse(readFileSync(queueFile as string, "utf8")));
    const payload = screenPayload(queue, SEED_SOURCES);
    writeFileSync(payloadOut as string, JSON.stringify(payload));
    expect(payload.items).toHaveLength(queue.pending.length);
  });
});

describe.skipIf(!goldenOut)("screen payload dump: golden", () => {
  it("writes the payload for every golden text item with cached text", () => {
    const golden = JSON.parse(readFileSync("tests/fixtures/web-watch-golden.json", "utf8")) as {
      labeledAt: string;
      text: Array<{ id: string; url: string; title: string }>;
    };
    const missing: string[] = [];
    const items = golden.text.flatMap((entry) => {
      const path = `${CACHE}/${entry.id}.txt`;
      if (!existsSync(path)) {
        missing.push(entry.id);
        return [];
      }
      const event = {
        id: entry.id,
        title: entry.title,
        body: readFileSync(path, "utf8"),
        publishedAt: golden.labeledAt,
        citations: [{ url: entry.url }],
      } as unknown as MarketEvent;
      return [screenItem(event, { symbols: [], lang: DEFAULT_SOURCE_LANG })];
    });
    writeFileSync(goldenOut as string, JSON.stringify({ items, thresholds: screenThresholds(), missing }));
    expect(items.length + missing.length).toBe(golden.text.length);
  });
});
