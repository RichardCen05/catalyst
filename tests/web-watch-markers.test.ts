import { afterEach, describe, expect, it, vi } from "vitest";

vi.mock("@/lib/agent/llm/client", () => ({
  generateStructured: vi.fn(),
}));

import { agentEngine } from "@/lib/agent/engine";
import { buildWebWatchBundle } from "@/lib/agent/retrieval/context/web-watch";
import { demoProfiles, events } from "@/lib/data/fixtures";
import { setOverlayForTests } from "@/lib/web-watch/queue";
import { EVENT_MARKER_LABEL, type MarketEvent, type SymbolCode } from "@/lib/types";

const profile = demoProfiles[0];

/** A recorded article linked to a watchlist emiten, re-issued as an accepted
 *  web-watch event with a marker. Taken from the recordings, so nothing about
 *  the event is typed here. Only an event with a body stands in for an
 *  accepted web-watch article: a computed event (foreign flows) has none, and
 *  a question about it routes to the metric explanation instead. */
function markedEvent(): { event: MarketEvent; symbol: SymbolCode } {
  const watched = new Set<string>(profile.watchlist);
  const base = events.find((event) => event.body !== null && event.impactLinks.some((link) => watched.has(link.symbol)));
  if (!base) throw new Error("no recorded event touches the demo watchlist");
  const symbol = base.impactLinks.find((link) => watched.has(link.symbol))!.symbol;
  return {
    event: { ...base, id: `web-marked-${base.id}`, markers: ["unconfirmed"], impactLinks: base.impactLinks.map((link) => ({ ...link, relevance: 100 })) },
    symbol,
  };
}

afterEach(() => setOverlayForTests([]));

describe("screen markers reach the reader", () => {
  it("the causal chain carries the marker on the event's source node", async () => {
    const { event, symbol } = markedEvent();
    setOverlayForTests([event]);
    const graph = await agentEngine.buildCausalGraph(symbol, profile, { scope: "market", minRelevance: 0, prioritizeEventIds: [event.id] });
    const node = graph?.nodes.find((item) => item.id === `source-${event.id}`);
    expect(node?.markers).toEqual(["unconfirmed"]);
    // A recorded event keeps no marker field at all.
    expect(graph?.nodes.filter((item) => item.kind === "source" && item.id !== `source-${event.id}`).every((item) => !("markers" in item))).toBe(true);
  });

  it("the event-impact answer names the marker by its label", async () => {
    const { event, symbol } = markedEvent();
    setOverlayForTests([event]);
    const answer = await agentEngine.answerFollowUp({ question: `Apa dampak berita ${event.title} untuk ${symbol}?`, profile, contextSymbol: symbol });
    expect(answer.intent).toBe("event-impact");
    expect(answer.text).toContain(event.title);
    expect(answer.text).toContain(EVENT_MARKER_LABEL.unconfirmed);
  });

  it("the Pantau bundle counts residual, auto-rejected and marked items", async () => {
    const { event } = markedEvent();
    setOverlayForTests([event], { pending: 4, residual: 3, autoRejected: 2 });
    const bundle = await buildWebWatchBundle();
    expect(bundle.body).toContain(`${EVENT_MARKER_LABEL.unconfirmed} 1`);
    expect(bundle.body).toContain(`${EVENT_MARKER_LABEL.misleadingTitle} 0`);
    expect(bundle.body).toContain(": 3.");
    expect(bundle.body).toContain(": 2.");
  });
});
