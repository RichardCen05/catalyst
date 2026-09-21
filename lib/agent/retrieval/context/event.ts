import { events } from "@/lib/data/fixtures";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle } from "@/lib/agent/retrieval/types";
import type { ImpactDirection } from "@/lib/types";

/** The same wording the case pages use, so one event never reads two ways. */
const DIRECTION: Record<ImpactDirection, string> = {
  Supported: "Mendukung",
  Adverse: "Berlawanan",
  Mixed: "Bercampur",
  Unrelated: "Tidak terkait",
  Unverified: "Belum terverifikasi",
};

/** One recorded event and every impact path it carries. */
export async function buildEventBundle(eventId: string): Promise<ContextBundle> {
  const event = events.find((item) => item.id === eventId);
  if (!event) {
    return {
      id: `event:${eventId}`, kind: "event", title: eventId,
      body: "Peristiwa ini tidak ada pada rekaman.", figures: [], citations: [], symbols: [],
    };
  }
  const body = [
    `Peristiwa: ${event.title}`,
    `Ringkasan: ${event.summary}`,
    `Kategori ${event.category}, sektor ${event.sector}, terbit ${event.publishedAt}.`,
    ...event.impactLinks.map((link) => `${link.symbol}: ${DIRECTION[link.direction] ?? link.direction}. ${link.path}`),
  ].join("\n");
  return {
    id: `event:${event.id}`,
    kind: "event",
    title: event.title,
    body,
    figures: extractNumerals(body),
    citations: event.citations,
    symbols: event.impactLinks.map((link) => link.symbol),
  };
}
