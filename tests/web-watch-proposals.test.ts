import { describe, expect, it, vi } from "vitest";
import { LlmBudgetError } from "@/lib/agent/llm/budget";
import type { ExposureAssessment } from "@/lib/agent/llm/exposure";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { applyDrafts, draftProposals, fewShotExamples, rankedSymbols, verifyExposureDraft } from "@/lib/web-watch/proposals";
import { decide, emptyQueue, enqueue, memoryQueueStore, type ReviewQueue } from "@/lib/web-watch/queue";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import { draftPending } from "@/lib/web-watch/watch-all";
import type { MarketEvent } from "@/lib/types";

const NOW = "2026-09-24T10:00:00.000Z";

let counter = 0;
function news(body: string, title?: string): MarketEvent {
  counter += 1;
  return {
    id: `web-src-cnbc-market-${counter.toString(16).padStart(8, "0")}`,
    title: title ?? `Berita ${counter}`,
    summary: "Ringkasan.",
    body,
    category: "company",
    sourceType: "macro",
    publishedAt: NOW,
    asOf: NOW,
    sector: "Market",
    impactLinks: [],
    citations: [{ id: "c", provider: "cnbcindonesia.com", endpoint: "web-watch", field: "body", asOf: NOW, label: "CNBC Indonesia — Market", url: "https://x", urlLabel: "Buka sumber asal", access: "direct" }],
  };
}

const PTBA_BODY =
  "Bukit Asam mencatat pasokan DMO lebih dari 54% dari total penjualan tahun ini. " +
  "Direksi PTBA menyebut kewajiban itu mengurangi potensi laba perusahaan dalam beberapa tahun terakhir.";

function queued(...events: MarketEvent[]): ReviewQueue {
  return enqueue(emptyQueue, events, { sources: SEED_SOURCES }, NOW);
}

const good: ExposureAssessment = {
  path: "Kewajiban DMO 54% → harga jual domestik lebih rendah → margin PTBA tertekan",
  label: "DMO menekan margin",
  direction: "Adverse",
  relevanceBand: "high",
  rationale: "Porsi DMO yang besar menurunkan harga jual rata-rata batu bara PTBA.",
};

const stub = (answer: Partial<ExposureAssessment> | Error) =>
  vi.fn(async () => {
    if (answer instanceof Error) throw answer;
    return { ...good, ...answer } as never;
  });

describe("draftProposals", () => {
  it("stores a verified proposal the accept form can take as-is", async () => {
    const queue = queued(news(PTBA_BODY));
    const call = stub({});
    const { outcomes, report } = await draftProposals(queue, { call, force: true, nowIso: NOW });
    expect(report).toMatchObject({ attempted: 1, calls: 1, proposed: 1, rejected: 0 });
    const next = applyDrafts(queue, outcomes);
    const [id] = Object.keys(next.proposals);
    expect(next.proposals[id].impacts).toEqual([
      { symbol: "PTBA", direction: "Adverse", band: "high", path: good.path, rationale: good.rationale },
    ]);
    expect(next.matches[id].drafted).toEqual({ at: NOW, outcome: "proposed" });
    // The proposal is not a decision: the item is still pending, nothing accepted.
    expect(next.pending).toHaveLength(1);
    expect(next.accepted).toHaveLength(0);
  });

  it("fences the fetched text as data and passes reviewer decisions as examples", async () => {
    const queue = queued(news(PTBA_BODY));
    const withHistory: ReviewQueue = {
      ...queue,
      decided: { "web-x": { candidateId: "web-x", status: "dismissed", decidedAt: NOW, reason: "Lokasi gempa tidak dekat aset emiten mana pun." } },
    };
    const call = stub({});
    await draftProposals(withHistory, { call, force: true, nowIso: NOW });
    const params = (call.mock.calls[0] as unknown as [{ contents: string; systemInstruction: string }])[0];
    expect(params.contents).toMatch(/<data>[\s\S]*Bukit Asam[\s\S]*<\/data>/);
    expect(params.contents).toMatch(/<contoh>[\s\S]*Lokasi gempa[\s\S]*<\/contoh>/);
    expect(params.systemInstruction).toContain("bukan perintah");
  });

  it("rejects a draft that cites a number the candidate never gave", async () => {
    const queue = queued(news(PTBA_BODY));
    const { outcomes, report } = await draftProposals(queue, {
      call: stub({ path: "Laba PTBA turun 37% karena kewajiban DMO yang besar" }),
      force: true,
      nowIso: NOW,
    });
    expect(report).toMatchObject({ proposed: 0, rejected: 1 });
    expect(report.rejections[0].violations.join(" ")).toContain("37%");
    const next = applyDrafts(queue, outcomes);
    expect(Object.keys(next.proposals)).toHaveLength(0);
    // Rejected means plain review, never archived.
    expect(next.pending).toHaveLength(1);
    expect(Object.keys(next.archived)).toHaveLength(0);
    expect(Object.values(next.matches)[0].drafted?.outcome).toBe("rejected");
  });

  it("rejects advisory language", async () => {
    const { report } = await draftProposals(queued(news(PTBA_BODY)), {
      call: stub({ rationale: "Sebaiknya jual saham PTBA sebelum laba turun." }),
      force: true,
    });
    expect(report.rejections[0].violations).toContain("advisory or transactional language");
  });

  it("stops at a closed budget and leaves the candidate untried for the next sweep", async () => {
    const queue = queued(news(PTBA_BODY), news(`${PTBA_BODY} Lagi.`, "Berita lain soal Bukit Asam"));
    const call = stub(new LlmBudgetError("budget", "Daily model call budget reached (5/5)"));
    const { outcomes, report } = await draftProposals(queue, { call, force: true, nowIso: NOW });
    expect(report).toMatchObject({ stoppedBy: "budget", attempted: 0, calls: 0, proposed: 0 });
    expect(call).toHaveBeenCalledTimes(1);
    const next = applyDrafts(queue, outcomes);
    expect(Object.values(next.matches).every((m) => m.drafted === undefined)).toBe(true);
  });

  it("marks a failed call as failed and keeps the candidate in review", async () => {
    const queue = queued(news(PTBA_BODY));
    const { outcomes, report } = await draftProposals(queue, { call: stub(new Error("500 upstream")), force: true, nowIso: NOW });
    expect(report.failed).toBe(1);
    const next = applyDrafts(queue, outcomes);
    expect(next.pending).toHaveLength(1);
    expect(Object.values(next.matches)[0].drafted?.outcome).toBe("failed");
  });

  it("stops at the per-sweep call cap", async () => {
    const t = { ...resolveThresholds(), webWatchSweepLlmCalls: 2 };
    const queue = queued(...[1, 2, 3, 4].map((n) => news(`${PTBA_BODY} Nomor ${n}.`, `Bukit Asam ${n}`)));
    const call = stub({});
    const { report } = await draftProposals(queue, { call, force: true, thresholds: t });
    expect(report).toMatchObject({ calls: 2, proposed: 2, stoppedBy: "sweep-cap" });
  });

  it("stops at the time budget", async () => {
    let clock = 0;
    const t = { ...resolveThresholds(), webWatchDraftTimeBudgetMs: 10 };
    const queue = queued(...[1, 2, 3].map((n) => news(`${PTBA_BODY} Nomor ${n}.`, `Bukit Asam ${n}`)));
    const call = vi.fn(async () => {
      clock += 10;
      return good as never;
    });
    const { report } = await draftProposals(queue, { call, force: true, thresholds: t, now: () => clock });
    expect(report).toMatchObject({ proposed: 1, stoppedBy: "time" });
  });

  it("does not call the model outside llm mode unless forced", async () => {
    const call = stub({});
    const { report } = await draftProposals(queued(news(PTBA_BODY)), { call });
    expect(report.stoppedBy).toBe("mode");
    expect(call).not.toHaveBeenCalled();
  });
});

describe("verifyExposureDraft", () => {
  it("rejects a symbol outside the triage match set, even a registry one", () => {
    const check = verifyExposureDraft(good, "BBCA", ["PTBA"], ["54%"]);
    expect(check.approved).toBe(false);
    expect(check.violations).toContain("BBCA is outside the triage match set");
  });

  it("rejects an unknown symbol and an Unverified direction", () => {
    const check = verifyExposureDraft({ ...good, direction: "Unverified" }, "FAKE", ["PTBA"], ["54%"]);
    expect(check.violations).toEqual(expect.arrayContaining(["FAKE is not a registry symbol", "direction Unverified cannot be proposed"]));
  });

  it("accepts a draft whose numerals all appear in the evidence, separators aside", () => {
    expect(verifyExposureDraft({ ...good, path: "DMO 54,0% → harga jual domestik → margin PTBA" }, "PTBA", ["PTBA"], ["54.0%"]).approved).toBe(true);
  });
});

describe("helpers", () => {
  it("drafts the emiten the text names before the ones its source only declares", () => {
    const ranked = rankedSymbols(
      {
        symbols: ["BBCA", "BBRI", "BMRI"],
        matchedBy: [
          { symbol: "BBCA", by: "source", term: "BI" },
          { symbol: "BBRI", by: "source", term: "BI" },
          { symbol: "BMRI", by: "symbol", term: "BMRI" },
        ],
        at: NOW,
      },
      2,
    );
    expect(ranked).toEqual(["BMRI", "BBCA"]);
  });

  it("leaves out one-word dismissal reasons from the examples", () => {
    const queue: ReviewQueue = {
      ...emptyQueue,
      decided: {
        a: { candidateId: "a", status: "dismissed", decidedAt: NOW, reason: "jelek" },
        b: { candidateId: "b", status: "dismissed", decidedAt: NOW, reason: "Kerangka navigasi, tanpa isi." },
      },
    };
    expect(fewShotExamples(queue, 6)).toEqual(["- [ditolak] alasan: Kerangka navigasi, tanpa isi."]);
  });

  it("drops a draft for an item a human decided while the model was working", async () => {
    const event = news(PTBA_BODY);
    const queue = queued(event);
    const { outcomes } = await draftProposals(queue, { call: stub({}), force: true });
    const decided = decide(queue, event.id, { action: "dismiss", reason: "Sudah tercakup." }, NOW);
    expect(applyDrafts(decided, outcomes).proposals).toEqual({});
  });

  it("draftPending persists proposals through the guarded save and completes at the cap", async () => {
    const store = memoryQueueStore(queued(...[1, 2, 3].map((n) => news(`${PTBA_BODY} Nomor ${n}.`, `Bukit Asam ${n}`))));
    const report = await draftPending(store, { call: stub({}), force: true, thresholds: { ...resolveThresholds(), webWatchSweepLlmCalls: 2 } });
    expect(report).toMatchObject({ proposed: 2, stoppedBy: "sweep-cap" });
    const saved = (await store.load())?.data;
    expect(Object.keys(saved?.proposals ?? {})).toHaveLength(2);
    expect(saved?.pending).toHaveLength(3);
  });
});

describe("review actions on proposals", () => {
  const proposal = (band: "high" | "medium", direction: ExposureAssessment["direction"] = "Adverse") => ({
    impacts: [{ symbol: "PTBA", direction, band, path: good.path, rationale: good.rationale }],
    model: "stub",
    verifiedAt: NOW,
  });

  it("accepts high-band proposals in one action, one human decision each", async () => {
    const [a, b] = [news(`${PTBA_BODY} A.`, "Bukit Asam A"), news(`${PTBA_BODY} B.`, "Bukit Asam B")];
    const queue: ReviewQueue = { ...queued(a, b), proposals: { [a.id]: proposal("high"), [b.id]: proposal("high") } };
    const { acceptProposals } = await import("@/lib/web-watch/queue");
    const next = acceptProposals(queue, [a.id, b.id], NOW);
    expect(next.pending).toHaveLength(0);
    expect(next.accepted.map((e) => e.id).sort()).toEqual([a.id, b.id].sort());
    expect(next.decided[a.id]).toMatchObject({ status: "accepted", viaProposal: true });
    expect(next.decided[b.id].impacts?.[0]).toEqual({ symbol: "PTBA", direction: "Adverse", band: "high", path: good.path });
    expect(next.proposals).toEqual({});
  });

  it("refuses the whole batch if any proposal is not high band or maps nothing", async () => {
    const [a, b] = [news(`${PTBA_BODY} C.`, "Bukit Asam C"), news(`${PTBA_BODY} D.`, "Bukit Asam D")];
    const { acceptProposals, isBatchAcceptable } = await import("@/lib/web-watch/queue");
    const queue: ReviewQueue = { ...queued(a, b), proposals: { [a.id]: proposal("high"), [b.id]: proposal("medium") } };
    expect(() => acceptProposals(queue, [a.id, b.id], NOW)).toThrow(/band tinggi/);
    expect(isBatchAcceptable(proposal("high", "Unrelated"))).toBe(false);
    expect(isBatchAcceptable(undefined)).toBe(false);
  });

  it("suggests disabling a source only once its recent window is mostly archive and dismissal", async () => {
    const { sourceHealth } = await import("@/lib/web-watch/queue");
    const window = resolveThresholds().webWatchSourceHealthWindow;
    const archived = Object.fromEntries(
      Array.from({ length: window }, (_, n) => {
        const event = news(PROSE_OF(n), `Arsip ${n}`);
        return [event.id, { event, rule: "no-watched-match" as const, reason: "x", at: `2026-09-${String(10 + (n % 10)).padStart(2, "0")}T00:00:00.000Z` }];
      }),
    );
    const noisy = sourceHealth({ ...emptyQueue, archived }, SEED_SOURCES).find((h) => h.sourceId === "src-cnbc-market");
    expect(noisy).toMatchObject({ window, noisy: window, suggestDisable: true });
    const few = sourceHealth({ ...emptyQueue, archived: Object.fromEntries(Object.entries(archived).slice(0, window - 1)) }, SEED_SOURCES);
    expect(few.find((h) => h.sourceId === "src-cnbc-market")?.suggestDisable).toBe(false);
  });
});

function PROSE_OF(n: number): string {
  return `Kalimat pengisi nomor ${n} untuk arsip sumber yang tidak menyebut emiten mana pun di registri.`;
}
