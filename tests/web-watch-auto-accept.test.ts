import { describe, expect, it } from "vitest";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { fewShotExamples } from "@/lib/web-watch/proposals";
import {
  applyVerdicts,
  AUTO_ACCEPT_REASON,
  autoAcceptedSince,
  decide,
  emptyQueue,
  isAutoAcceptable,
  memoryQueueStore,
  normalizeQueue,
  overlayCounts,
  RESIDUAL_DAILY_CAP,
  RESIDUAL_NO_PROPOSAL,
  RESIDUAL_PROPOSAL_NOT_ELIGIBLE,
  RESIDUAL_REVERTED,
  revertAutoAccept,
  ReviewError,
  type ReviewQueue,
  type ScreenVerdict,
  type TriageMatch,
  type TriageProposal,
  withResidualLabel,
} from "@/lib/web-watch/queue";
import { memoryRegistryStore } from "@/lib/web-watch/registry";
import { memoryReviewStore } from "@/lib/web-watch/review";
import { watchAll } from "@/lib/web-watch/watch-all";
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

/** Every pending item gets an accept verdict: what the old sweep-level
 *  auto-accept did, now through the decide step. */
function autoAccept(queue: ReviewQueue, nowIso: string, dailyMax?: number) {
  const verdicts: ScreenVerdict[] = queue.pending.map((e) => ({ candidateId: e.id, verdict: "accept", reason: "bersih" }));
  const result = applyVerdicts(queue, verdicts, nowIso, dailyMax);
  return { next: result.next, accepted: result.accepted };
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
  it("takes a named emiten at high or medium band", () => {
    expect(isAutoAcceptable(proposal(A), match(A, "symbol"))).toBe(true);
    expect(isAutoAcceptable(proposal(A), match(A, "name"))).toBe(true);
    expect(isAutoAcceptable(proposal(A, { band: "medium" }), match(A, "name"))).toBe(true);
  });

  it("takes a source-declared emiten only at high band", () => {
    expect(isAutoAcceptable(proposal(A), match(A, "source"))).toBe(true);
    expect(isAutoAcceptable(proposal(A, { band: "medium" }), match(A, "source"))).toBe(false);
  });

  it("never takes low band, whatever the evidence", () => {
    expect(isAutoAcceptable(proposal(A, { band: "low" }), match(A, "symbol"))).toBe(false);
    expect(isAutoAcceptable(proposal(A, { band: "low" }), match(A, "source"))).toBe(false);
  });

  it("refuses an emiten matched only by sector, subsector, region or weather", () => {
    for (const by of ["sector", "subsector", "region", "weather"] as const) {
      expect(isAutoAcceptable(proposal(A), match(A, by))).toBe(false);
    }
  });

  it("refuses Mixed or Unrelated direction", () => {
    expect(isAutoAcceptable(proposal(A, { direction: "Mixed" }), match(A))).toBe(false);
    expect(isAutoAcceptable(proposal(A, { direction: "Unrelated" }), match(A))).toBe(false);
  });

  it("refuses when any impact maps an emiten with no qualifying evidence", () => {
    const two: TriageProposal = { ...proposal(A), impacts: [...proposal(A).impacts, ...proposal(B).impacts] };
    expect(isAutoAcceptable(two, match(A))).toBe(false);
  });

  it("refuses an item a reviewer already reverted, and one with no proposal", () => {
    expect(isAutoAcceptable(proposal(A), { ...match(A), noAuto: true })).toBe(false);
    expect(isAutoAcceptable(undefined, match(A))).toBe(false);
  });
});

describe("applyVerdicts: accept", () => {
  it("accepts only eligible items and records each as auto with its pending state", () => {
    const good = event();
    const weak = event();
    const bare = event();
    const queue = queueWith([
      { event: good, match: match(A), proposal: proposal(A) },
      { event: weak, match: match(A, "source"), proposal: proposal(A, { band: "medium" }) },
      { event: bare, match: match(A) },
    ]);
    const { next, accepted } = autoAccept(queue, NOW, 5);
    expect(accepted).toEqual([good.id]);
    expect(next.pending.map((e) => e.id)).toEqual([weak.id, bare.id]);
    expect(next.matches[weak.id].residual?.reason).toBe(RESIDUAL_PROPOSAL_NOT_ELIGIBLE);
    expect(next.matches[bare.id].residual?.reason).toBe(RESIDUAL_NO_PROPOSAL);
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

describe("applyVerdicts: reject and residual", () => {
  const reject = (id: string, extra: Partial<ScreenVerdict> = {}): ScreenVerdict => ({
    candidateId: id,
    verdict: "reject",
    check: "substance",
    reason: "tanpa isi konkret",
    span: "baca selengkapnya",
    score: 0.97,
    ...extra,
  });
  const rumorReject = (id: string, extra: Partial<ScreenVerdict> = {}): ScreenVerdict => ({
    candidateId: id,
    verdict: "reject",
    check: "rumor",
    reason: "rumor: hanya sumber anonim",
    span: "kabarnya akan diakuisisi",
    score: 0.97,
    ...extra,
  });

  it("rejects finally, with the check and the span it read", () => {
    const item = event();
    const { next, rejected } = applyVerdicts(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]), [reject(item.id)], NOW);
    expect(rejected).toEqual([item.id]);
    expect(next.pending).toEqual([]);
    expect(next.accepted).toEqual([]);
    expect(next.proposals[item.id]).toBeUndefined();
    expect(next.decided[item.id]).toMatchObject({
      status: "dismissed",
      reason: "tanpa isi konkret",
      autoReject: { check: "substance", span: "baca selengkapnya", score: 0.97, at: NOW },
    });
    // No undo path: the auto-accept revert refuses it.
    expect(() => revertAutoAccept(next, item.id)).toThrow(ReviewError);
  });

  it("quarantines rumor verdicts to the rumor tab instead of rejecting", () => {
    const item = event();
    const { next, rejected, quarantined } = applyVerdicts(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]), [rumorReject(item.id)], NOW);
    expect(rejected).toEqual([]);
    expect(quarantined).toEqual([item.id]);
    expect(next.pending).toEqual([]);
    expect(next.decided[item.id]).toBeUndefined();
    expect(next.suspected[item.id]).toMatchObject({
      check: "rumor",
      reason: "rumor: hanya sumber anonim",
      span: "kabarnya akan diakuisisi",
      score: 0.97,
      at: NOW,
    });
    expect(next.suspected[item.id].event).toEqual(item);
    expect(next.suspected[item.id].proposal).toEqual(proposal(A));
    expect(next.proposals[item.id]).toBeUndefined();
    // A quarantine is not a decision: nothing to revert, nothing learned.
    expect(() => revertAutoAccept(next, item.id)).toThrow(ReviewError);
    expect(fewShotExamples(next, 10)).toEqual([]);
    expect(overlayCounts(next)).toMatchObject({ pending: 0, suspected: 1, autoRejected: 0 });
  });

  it("quarantines misleading-title verdicts the same way", () => {
    const item = event();
    const { next, quarantined } = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [rumorReject(item.id, { check: "misleading-title", reason: "judul tidak sesuai isi" })], NOW);
    expect(quarantined).toEqual([item.id]);
    expect(next.suspected[item.id].check).toBe("misleading-title");
  });

  it("never rejects an item a reviewer took back from an auto-accept", () => {
    const item = event();
    const { next, rejected, skipped } = applyVerdicts(queueWith([{ event: item, match: { ...match(A), noAuto: true } }]), [reject(item.id)], NOW);
    expect(rejected).toEqual([]);
    expect(skipped.map((s) => s.id)).toEqual([item.id]);
    expect(next.pending.map((e) => e.id)).toEqual([item.id]);
  });

  it("skips ids no longer pending, and a second verdict for the same id", () => {
    const item = event();
    let queue = queueWith([{ event: item, match: match(A) }]);
    queue = decide(queue, item.id, { action: "dismiss", reason: "Bukan berita pasar." }, NOW);
    const other = event();
    queue = { ...queue, pending: [other], matches: { [other.id]: match(A) } };
    const { next, quarantined, skipped } = applyVerdicts(queue, [reject(item.id), reject(other.id), { ...reject(other.id), verdict: "accept" }], NOW);
    expect(skipped).toEqual([
      { id: item.id, why: "tidak lagi menunggu" },
      { id: other.id, why: "verdict ganda untuk calon yang sama" },
    ]);
    expect(next.decided[item.id].reason).toBe("Bukan berita pasar.");
    expect(next.decided[other.id].autoReject).toBeDefined();
    expect(quarantined).toEqual([]);
  });

  it("an accept on a reverted item waits for a person, and says why", () => {
    const item = event();
    const { next, residual } = applyVerdicts(queueWith([{ event: item, match: { ...match(A), noAuto: true }, proposal: proposal(A) }]), [{ candidateId: item.id, verdict: "accept", reason: "bersih" }], NOW);
    expect(residual).toEqual([item.id]);
    expect(next.matches[item.id].residual?.reason).toBe(RESIDUAL_REVERTED);
  });

  it("a stored proposal that no longer validates does not sink the batch", () => {
    const bad = event();
    const gone = event();
    const queue = queueWith([
      { event: bad, match: match(A), proposal: proposal(A, { path: "pendek" }) },
      { event: gone, match: match(A) },
    ]);
    const { next, accepted, rejected, quarantined, residual } = applyVerdicts(queue, [
      { candidateId: bad.id, verdict: "accept", reason: "bersih" },
      { candidateId: gone.id, verdict: "reject", check: "substance", reason: "tanpa isi" },
    ], NOW);
    expect(accepted).toEqual([]);
    expect(rejected).toEqual([gone.id]);
    expect(quarantined).toEqual([]);
    expect(residual).toEqual([bad.id]);
    expect(next.matches[bad.id].residual?.reason).toContain(RESIDUAL_PROPOSAL_NOT_ELIGIBLE);
  });

  it("marks a residual item and leaves it pending", () => {
    const item = event();
    const queue = queueWith([{ event: item, match: match(A) }]);
    const { next, residual } = applyVerdicts(queue, [{ candidateId: item.id, verdict: "residual", reason: "NLI ragu" }], NOW);
    expect(residual).toEqual([item.id]);
    expect(next.pending).toEqual(queue.pending);
    expect(next.matches[item.id]).toEqual({ ...match(A), residual: { at: NOW, reason: "NLI ragu" } });
  });

  it("an empty verdict list changes nothing", () => {
    const queue = queueWith([{ event: event(), match: match(A), proposal: proposal(A) }]);
    const result = applyVerdicts(queue, [], NOW);
    expect(result.next).toBe(queue);
    expect([result.accepted, result.rejected, result.quarantined, result.residual, result.skipped]).toEqual([[], [], [], [], []]);
  });

  it("over the cap, the rest of the accepts wait for a person", () => {
    const items = Array.from({ length: 25 }, (_, i) => event(`2026-09-24T0${Math.floor(i / 10)}:${String(i % 10).padStart(2, "0")}:00.000Z`));
    const queue = queueWith(items.map((e) => ({ event: e, match: match(A), proposal: proposal(A) })));
    const verdicts: ScreenVerdict[] = items.map((e) => ({ candidateId: e.id, verdict: "accept", reason: "bersih" }));
    const { next, accepted, residual } = applyVerdicts(queue, verdicts, NOW, 20);
    expect(accepted).toHaveLength(20);
    expect(residual).toHaveLength(5);
    // Newest first: the five oldest are the ones left.
    expect(new Set(residual)).toEqual(new Set(items.slice(0, 5).map((e) => e.id)));
    expect(next.matches[residual[0]].residual?.reason).toBe(RESIDUAL_DAILY_CAP);
  });

  it("machine rejects never become few-shot examples", () => {
    const item = event();
    const { next } = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [reject(item.id, { reason: "tanpa isi konkret tanpa pernyataan resmi" })], NOW);
    expect(fewShotExamples(next, 10)).toEqual([]);
  });
});

describe("suspected rumor tab", () => {
  it("dispute moves the item back to pending, never auto again", async () => {
    const { disputeSuspected, dismissSuspected } = await import("@/lib/web-watch/queue");
    const item = event();
    const screened = applyVerdicts(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]), [{
      candidateId: item.id, verdict: "reject", check: "rumor", reason: "rumor: anonim", span: "kabarnya", score: 0.97,
    }], NOW).next;
    const disputed = disputeSuspected(screened, item.id, "Ada pernyataan resmi emiten.", NOW);
    expect(disputed.suspected[item.id]).toBeUndefined();
    expect(disputed.pending.map((e) => e.id)).toEqual([item.id]);
    expect(disputed.pending[0]).toEqual(item);
    expect(disputed.proposals[item.id]).toEqual(proposal(A));
    expect(disputed.matches[item.id].noAuto).toBe(true);
    expect(disputed.matches[item.id].residual?.reason).toContain("Bukan rumor menurut reviewer");
    // The screen cannot take it back alone.
    const { quarantined, rejected, skipped } = applyVerdicts(disputed, [{
      candidateId: item.id, verdict: "reject", check: "rumor", reason: "rumor lagi",
    }], NOW);
    expect(quarantined).toEqual([]);
    expect(rejected).toEqual([]);
    expect(skipped.map((s) => s.id)).toEqual([item.id]);
    expect(disputed.decided[item.id]).toBeUndefined();
    void dismissSuspected;
  });

  it("dispute needs a reason and an item that is actually suspected", async () => {
    const { disputeSuspected } = await import("@/lib/web-watch/queue");
    const item = event();
    const screened = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [{
      candidateId: item.id, verdict: "reject", check: "rumor", reason: "rumor",
    }], NOW).next;
    expect(() => disputeSuspected(screened, item.id, "  ", NOW)).toThrow(ReviewError);
    expect(() => disputeSuspected(screened, "tidak-ada", "Bukan rumor.", NOW)).toThrow(ReviewError);
  });

  it("dismiss confirms the rumor finally, with the reviewer's reason", async () => {
    const { dismissSuspected } = await import("@/lib/web-watch/queue");
    const item = event();
    const screened = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [{
      candidateId: item.id, verdict: "reject", check: "rumor", reason: "rumor: anonim", span: "kabarnya", score: 0.9,
    }], NOW).next;
    const next = dismissSuspected(screened, item.id, "Memang tidak ada sumber resmi.", NOW);
    expect(next.suspected[item.id]).toBeUndefined();
    expect(next.pending).toEqual([]);
    expect(next.decided[item.id]).toMatchObject({ status: "dismissed", reason: "Memang tidak ada sumber resmi." });
    expect(next.decided[item.id].autoReject).toBeUndefined();
    expect(next.decided[item.id].fromSuspect).toMatchObject({ check: "rumor" });
    // A confirmed rumor teaches the model like any human dismiss.
    expect(fewShotExamples(next, 10)).toHaveLength(1);
  });

  it("a disputed item decided afterwards is labelled as calibration", async () => {
    const { disputeSuspected } = await import("@/lib/web-watch/queue");
    const item = event();
    const screened = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [{
      candidateId: item.id, verdict: "reject", check: "rumor", reason: "rumor",
    }], NOW).next;
    const disputed = disputeSuspected(screened, item.id, "Ada sumber resmi.", NOW);
    const decided = withResidualLabel(disputed, decide(disputed, item.id, { action: "dismiss", reason: "Bukan berita pasar." }, NOW), [item.id]);
    expect(decided.decided[item.id].fromResidual).toBe(true);
  });

  it("legacy rumor auto-rejects dispute back to pending and dismiss finally", async () => {
    const { disputeSuspected, dismissSuspected, normalizeQueue, emptyQueue } = await import("@/lib/web-watch/queue");
    const base = normalizeQueue(structuredClone(emptyQueue));
    base.decided["web-lama"] = {
      candidateId: "web-lama", status: "dismissed", decidedAt: NOW, reason: "rumor lama",
      autoReject: { check: "rumor", span: "kabarnya", score: 0.9, at: NOW, title: "Judul lama", url: "https://x/lama" },
    };
    const disputed = disputeSuspected(base, "web-lama", "Ternyata ada sumber resmi.", NOW);
    expect(disputed.decided["web-lama"]).toBeUndefined();
    expect(disputed.pending.map((e) => e.id)).toEqual(["web-lama"]);
    expect(disputed.matches["web-lama"].noAuto).toBe(true);
    const confirmed = dismissSuspected(base, "web-lama", "Tetap rumor.", NOW);
    expect(confirmed.decided["web-lama"]).toMatchObject({ status: "dismissed", reason: "Tetap rumor." });
    expect(confirmed.decided["web-lama"].autoReject).toBeUndefined();
  });

  it("enqueue never resurrects suspected ids", async () => {
    const { enqueue } = await import("@/lib/web-watch/queue");
    const item = event();
    const screened = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [{
      candidateId: item.id, verdict: "reject", check: "rumor", reason: "rumor",
    }], NOW).next;
    const again = enqueue(screened, [{ ...item }], { sources: [] });
    expect(again.pending.map((e) => e.id)).toEqual([]);
    expect(Object.keys(again.suspected)).toEqual([item.id]);
  });
});

describe("watchAll", () => {
  it("accepts nothing by itself, even an eligible verified proposal", async () => {
    const item = event();
    const queue = memoryQueueStore(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]));
    await watchAll({ store: memoryRegistryStore(), review: memoryReviewStore(), queue, nowMs: Date.parse(NOW) });
    const data = (await queue.load())?.data;
    expect(data?.pending.map((e) => e.id)).toEqual([item.id]);
    expect(data?.decided).toEqual({});
  });
});

describe("residual labels, markers and counts", () => {
  it("an accepted item carries the verdict's markers; the undo copy stays unmarked", () => {
    const item = event();
    const queue = queueWith([{ event: item, match: match(A), proposal: proposal(A) }]);
    const { next, accepted } = applyVerdicts(queue, [{ candidateId: item.id, verdict: "accept", reason: "bersih", markers: ["unconfirmed", "unconfirmed"] }], NOW);
    expect(accepted).toEqual([item.id]);
    expect(next.accepted[0].markers).toEqual(["unconfirmed"]);
    expect(next.decided[item.id].auto?.event.markers).toBeUndefined();
    expect(revertAutoAccept(next, item.id).pending[0].markers).toBeUndefined();
  });

  it("an accept without markers adds no field", () => {
    const item = event();
    const { next } = applyVerdicts(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]), [{ candidateId: item.id, verdict: "accept", reason: "bersih" }], NOW);
    expect("markers" in next.accepted[0]).toBe(false);
  });

  it("an auto reject keeps the title and address it rejected", () => {
    const item = event();
    const { next } = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [{ candidateId: item.id, verdict: "reject", check: "substance", reason: "tanpa isi" }], NOW);
    expect(next.decided[item.id].autoReject).toMatchObject({ title: item.title, url: item.citations[0].url });
  });

  it("a person's decision on a residual item is labelled; on any other item it is not", () => {
    const residualItem = event();
    const fresh = event();
    const screened = applyVerdicts(queueWith([{ event: residualItem, match: match(A) }, { event: fresh, match: match(A) }]), [{ candidateId: residualItem.id, verdict: "residual", reason: "NLI ragu" }], NOW).next;
    const afterResidual = withResidualLabel(screened, decide(screened, residualItem.id, { action: "dismiss", reason: "Bukan berita pasar." }, NOW), [residualItem.id]);
    expect(afterResidual.decided[residualItem.id].fromResidual).toBe(true);
    const afterFresh = withResidualLabel(afterResidual, decide(afterResidual, fresh.id, { action: "dismiss", reason: "Bukan berita pasar." }, NOW), [fresh.id]);
    expect(afterFresh.decided[fresh.id].fromResidual).toBeUndefined();
  });

  it("never labels a decision the screen made", () => {
    const item = event();
    const screened = applyVerdicts(queueWith([{ event: item, match: match(A) }]), [{ candidateId: item.id, verdict: "residual", reason: "NLI ragu" }], NOW).next;
    const rejected = applyVerdicts(screened, [{ candidateId: item.id, verdict: "reject", check: "relevance", reason: "tidak relevan" }], NOW).next;
    expect(withResidualLabel(screened, rejected, [item.id]).decided[item.id].fromResidual).toBeUndefined();
  });

  it("counts residual and auto-rejected items for the assistant", () => {
    const [kept, dropped, other] = [event(), event(), event()];
    const queue = queueWith([{ event: kept, match: match(A) }, { event: dropped, match: match(A) }, { event: other, match: match(A) }]);
    const { next } = applyVerdicts(queue, [
      { candidateId: kept.id, verdict: "residual", reason: "NLI ragu" },
      { candidateId: dropped.id, verdict: "reject", check: "relevance", reason: "tidak relevan" },
    ], NOW);
    expect(overlayCounts(next)).toMatchObject({ pending: 2, residual: 1, autoRejected: 1, autoAccepted: 0 });
  });
});

describe("revertAutoAccept and the residual list", () => {
  it("drops a residual mark from before the accept, so no stale doubt is shown or labelled", () => {
    const item = event();
    const screened = applyVerdicts(queueWith([{ event: item, match: match(A), proposal: proposal(A) }]), [{ candidateId: item.id, verdict: "residual", reason: "relevansi ragu" }], NOW).next;
    const { next } = applyVerdicts(screened, [{ candidateId: item.id, verdict: "accept", reason: "bersih" }], "2026-09-25T10:00:00.000Z");
    expect(next.decided[item.id].auto?.match.residual?.reason).toBe("relevansi ragu");
    const reverted = revertAutoAccept(next, item.id);
    expect(reverted.matches[item.id].residual).toBeUndefined();
    expect(reverted.matches[item.id].noAuto).toBe(true);
    const human = withResidualLabel(reverted, decide(reverted, item.id, { action: "dismiss", reason: "Bukan berita pasar." }, NOW), [item.id]);
    expect(human.decided[item.id].fromResidual).toBeUndefined();
  });
});
