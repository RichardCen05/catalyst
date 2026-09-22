import { companies, DATA_AS_OF, events } from "@/lib/data/fixtures";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle, RequestContext } from "@/lib/agent/retrieval/types";
import type { Citation } from "@/lib/types";

/**
 * The board the reader lands on, counted the way the board counts itself.
 *
 * Every figure here is the same one the status strip prints — open cases,
 * recorded sources, shared triggers, shared paths, testable business impacts
 * — so an answer about a counter and the counter itself cannot drift apart.
 * They are read off the same graph the page draws rather than recomputed from
 * a different slice, which is what would let the two disagree.
 *
 * `buildMarketGraph` is imported inside the function: it reaches the engine,
 * and the engine imports this layer, so a module-level import would close
 * that circle at load time. Same reason as `case.ts`.
 */
export async function buildDashboardBundle(context: RequestContext): Promise<ContextBundle> {
  const { buildMarketGraph } = await import("@/lib/agent/market-graph");
  const watchlist = context.profile.watchlist;
  const graph = await buildMarketGraph(watchlist, context.profile, {
    minRelevance: DEFAULT_THRESHOLDS.chainRelevanceFloor,
  });

  const sourceCount = graph.nodes.filter((node) => node.kind === "source").length;
  const impactCount = graph.nodes.filter((node) => node.kind === "business-impact").length;
  const hubCount = graph.nodes.filter((node) => node.kind === "mechanism" && node.symbols.length > 1).length;

  // One figure per line, label first. Packed into a single comma-separated
  // sentence, a small model bound "jalur dipakai bersama" to the count on the
  // line below it and answered 3 where the board says 7. Every numeral here
  // is in the evidence, so the verifier cannot catch that — only the shape of
  // the material can, and the counter strip on screen is a list too.
  const body = [
    `Dashboard menggambar setiap kasus terbuka sebagai satu peta sebab akibat: sumber terekam, mekanisme, emiten, lalu dampak bisnis yang diuji.`,
    `Hitungan papan saat ini, satu baris satu angka:`,
    `- Kasus terbuka di peta: ${graph.symbols.length} (dari ${companies.length} emiten terekam).`,
    `- Sumber terekam: ${sourceCount}.`,
    `- Pemicu bersama, yaitu sumber yang menyentuh lebih dari satu emiten: ${graph.sharedSourceIds.length}.`,
    `- Jalur dipakai bersama, yaitu mekanisme yang dilalui lebih dari satu emiten: ${hubCount}.`,
    `- Dampak bisnis dapat diuji: ${impactCount}.`,
    `- Hubungan di bawah ambang relevansi ${DEFAULT_THRESHOLDS.chainRelevanceFloor} sehingga tidak digambar: ${graph.hiddenRelationshipCount}.`,
    `Rekaman tertanggal ${DATA_AS_OF}; papan ini bukan pasar live.`,
    ...(graph.skipped.length
      ? [`Tidak digambar: ${graph.skipped.map((row) => `${row.symbol} (${row.reason})`).join("; ")}.`]
      : []),
  ].join("\n");

  // The same sources the board's own citation dialog offers, so an answer
  // about a counter carries what the counter was counted from.
  const citations = new Map<string, Citation>();
  for (const event of events) {
    if (!event.impactLinks.some((link) => graph.symbols.includes(link.symbol))) continue;
    for (const citation of event.citations) citations.set(citation.id, citation);
  }

  return {
    id: "view:dashboard",
    kind: "view",
    title: "Dashboard",
    body,
    figures: extractNumerals(body),
    citations: [...citations.values()].slice(0, 12),
    symbols: graph.symbols,
  };
}
