import { describe, expect, it } from "vitest";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { fewShotExamples } from "@/lib/web-watch/proposals";
import {
  AUTO_ACCEPT_REASON,
  autoAccept,
  autoAcceptedSince,
  decide,
  emptyQueue,
  isAutoAcceptable,
  memoryQueueStore,
  normalizeQueue,
  overlayCounts,
  revertAutoAccept,
  ReviewError,
  type ReviewQueue,
  type TriageMatch,
  type TriageProposal,
} from "@/lib/web-watch/queue";
import { autoAcceptPending } from "@/lib/web-watch/watch-all";
import { companies } from "@/lib/data/fixtures";
import type { MarketEvent, SymbolCode } from "@/lib/types";

const NOW = "2026-09-24T10:00:00.000Z";
const [A, B] = companies.map((c) => c.symbol) as [SymbolCode, SymbolCode];

let counter = 0;
function event(publishedAt = NOW): MarketEvent {
  counter += 1;
  return {
    id: `web-src-test-${counter}`,
    title: `Berita ${counter}`,
    summary: "Ringkasan.",
    body: "Isi.",
    category: "company",
    sourceType: "macro",
    publishedAt,
    asOf: publishedAt,
    sector: "Market",
    impactLinks: [],
    citations: [{ id: "c", provider: "contoh.id", endpoint: "web-watch", field: "body", asOf: NOW, label: "Contoh", url: "https://x", urlLabel: "Buka sumber asal", access: "direct" }],
  };
}

function match(symbol: SymbolCode, by: TriageMatch["matchedBy"][number]["by"] = "symbol"): TriageMatch {
  return { symbols: [symbol], matchedBy: [{ symbol, by, term: symbol }], at: NOW };
}

function proposal(symbol: SymbolCode, overrides: Partial<TriageProposal["impacts"][number]> = {}): TriageProposal {
  return {
    impacts: [{ symbol, direction: "Adverse", band: "high", path: `Harga naik → biaya ${symbol} naik → margin`, rationale: "Teks menyebut biaya.", ...overrides }],
    model: "test",
    verifiedAt: NOW,
  };
}

function queueWith(items: Array<{ event: MarketEvent; match?: TriageMatch; proposal?: TriageProposal }>): ReviewQueue {
  const queue = normalizeQueue(structuredClone(emptyQueue));
  for (const item of items) {
    queue.pending.push(item.event);
    if (item.match) queue.matches[item.event.id] = item.match;
    if (item.proposal) queue.proposals[item.event.id] = item.proposal;
  }
  return queue;
}

describe("isAutoAcceptable", () => {
  it("takes a high-band verified proposal whose emiten the text names", () => {
    expect(isAutoAcceptable(proposal(A), match(A, "symbol"))).toBe(true);
    expect(isAutoAcceptable(proposal(A), match(A, "name"))).toBe(true);
  });

  it("refuses an emiten matched only by sector, region or source", () => {
    for (const by of ["sector", "subsector", "region", "source", "weather"] as const) {
      expect(isAutoAcceptable(proposal(A), match(A, by))).toBe(false);
    }
  });

  it("refuses medium or low band, and Mixed or Unrelated direction", () => {
    expect(isAutoAcceptable(proposal(A, { band: "medium" }), match(A))).toBe(false);
    expect(isAutoAcceptable(proposal(A, { direction: "Mixed" }), match(A))).toBe(false);
    expect(isAutoAcceptable(proposal(A, { direction: "Unrelated" }), match(A))).toBe(false);
  });

  it("refuses when any impact maps an emiten the text does not name", () => {
    const two: TriageProposal = { ...proposal(A), impacts: [...proposal(A).impacts, ...proposal(B).impacts] };
    expect(isAutoAcceptable(two, match(A))).toBe(false);
  });

  it("refuses an item a reviewer already reverted, and one with no proposal", () => {
    expect(isAutoAcceptable(proposal(A), { ...match(A), noAuto: true })).toBe(false);
    expect(isAutoAcceptable(undefined, match(A))).toBe(false);
  });
});

describe("autoAccept", () => {
  it("accepts only eligible items and records each as auto with its pending state", () => {
    const good = event();
    const weak = event();
    const bare = event();
    const queue = queueWith([
      { event: good, match: match(A), proposal: proposal(A) },
      { event: weak, match: match(A, "sector"), proposal: proposal(A) },
      { event: bare, match: match(A) },
    ]);
    const { next, accepted } = autoAccept(queue, NOW, 5);
    expect(accepted).toEqual([good.id]);
    expect(next.pending.map((e) => e.id)).toEqual([weak.id, bare.id]);
    expect(next.accepted[0].id).toBe(good.id);
    expect(next.accepted[0].impactLinks[0].symbol).toBe(A);
    const decision = next.decided[good.id];
    expect(decision.status).toBe("accepted");
    expect(decision.reason).toBe(AUTO_ACCEPT_REASON);
    expect(decision.viaProposal).toBe(true);
    expect(decision.auto?.event).toEqual(good);
    expect(decision.auto?.proposal).toEqual(proposal(A));
    expect(overlayCounts(next).autoAccepted).toBe(1);
  });

  it("stops at the daily cap, newest first, and counts only the last 24 hours", () => {
    const items = [0, 1, 2].map((i) => event(`2026-09-2${i}T00:00:00.000Z`));
    const queue = queueWith(items.map((e) => ({ event: e, match: match(A), proposal: proposal(A) })));
    const first = autoAccept(queue, NOW, 2);
    expect(first.accepted).toEqual([items[2].id, items[1].id]);
    expect(autoAcceptedSince(first.next, NOW)).toBe(2);
    expect(autoAccept(first.next, NOW, 2).accepted).toEqual([]);
    const tomorrow = "2026-09-25T10:00:01.000Z";
    expect(autoAccept(first.next, tomorrow, 2).accepted).toEqual([items[0].id]);
  });

  it("does not count a person's accept against the cap", () => {
    const manual = event();
    const auto = event();
    let queue = queueWith([
      { event: manual, match: match(A), proposal: proposal(A) },
      { event: auto, match: match(A), proposal: proposal(A) },
    ]);
    queue = decide(queue, manual.id, { action: "accept", impacts: [{ symbol: A, direction: "Adverse", band: "high", path: "Jalur yang cukup panjang" }] }, NOW);
    expect(autoAccept(queue, NOW, 1).accepted).toEqual([auto.id]);
  });

  it("uses the threshold table when no cap is passed", () => {
    const items = Array.from({ length: resolveThresholds().webWatchAutoAcceptDailyMax + 2 }, () => event());
    const queue = queueWith(items.map((e) => ({ event: e, match: match(A), proposal: proposal(A) })));
    expect(autoAccept(queue, NOW).accepted).toHaveLength(resolveThresholds().webWatchAutoAcceptDailyMax);
  });
});

describe("revertAutoAccept", () => {
  it("puts the item back exactly as it was, out of the engine, never auto again", () => {
    const item = event();
    const queue = queueWith([{ event: item, match: match(A), proposal: proposal(A) }]);
    const { next } = autoAccept(queue, NOW, 5);
    const reverted = revertAutoAccept(next, item.id);
    expect(reverted.pending[0]).toEqual(item);
    expect(reverted.accepted).toEqual([]);
    expect(reverted.decided[item.id]).toBeUndefined();
    expect(reverted.proposals[item.id]).toEqual(proposal(A));
    expect(reverted.matches[item.id].noAuto).toBe(true);
    expect(autoAccept(reverted, "2026-09-26T00:00:00.000Z", 5).accepted).toEqual([]);
  });

  it("refuses a person's own accept", () => {
    const item = event();
    const queue = decide(queueWith([{ event: item, match: match(A) }]), item.id, { action: "accept", impacts: [{ symbol: A, direction: "Adverse", band: "high", path: "Jalur yang cukup panjang" }] }, NOW);
    expect(() => revertAutoAccept(queue, item.id)).toThrow(ReviewError);
  });

  it("survives a round trip through JSON, as the stored queue does", () => {
    const item = event();
    const { next } = autoAccept(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]), NOW, 5);
    const stored = normalizeQueue(JSON.parse(JSON.stringify(next)));
    expect(revertAutoAccept(stored, item.id).pending[0]).toEqual(item);
  });
});

describe("fewShotExamples", () => {
  it("leaves auto-accepts out so the model does not learn from itself", () => {
    const item = event();
    const { next } = autoAccept(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]), NOW, 5);
    expect(fewShotExamples(next, 10)).toEqual([]);
  });
});

describe("autoAcceptPending", () => {
  it("does nothing while the switch is off", async () => {
    const item = event();
    const store = memoryQueueStore(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]));
    await expect(autoAcceptPending(store, NOW, async () => false)).resolves.toBeNull();
    expect((await store.load())?.data.pending).toHaveLength(1);
  });

  it("accepts and persists when the switch is on", async () => {
    const item = event();
    const store = memoryQueueStore(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]));
    await expect(autoAcceptPending(store, NOW, async () => true)).resolves.toEqual({ accepted: 1 });
    const data = (await store.load())?.data;
    expect(data?.pending).toEqual([]);
    expect(data?.decided[item.id].auto).toBeDefined();
  });

  it("never fails the sweep when the setting cannot be read", async () => {
    const store = memoryQueueStore();
    await expect(autoAcceptPending(store, NOW, async () => { throw new Error("gcs down"); })).resolves.toBeNull();
  });
});
