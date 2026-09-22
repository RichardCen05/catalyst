import { companies } from "@/lib/data/fixtures";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { buildPantauBundle } from "@/lib/agent/retrieval/context/pantau";
import type { ContextBundle, RequestContext } from "@/lib/agent/retrieval/types";

/**
 * The reader's own rules: what they watch, what they hold, where their
 * cut-off sits.
 *
 * The watchlist half is the pantau bundle rather than a second walk over the
 * same registry, so the two can never disagree about what is on the list.
 */
export async function buildPlaybookBundle(context: RequestContext): Promise<ContextBundle> {
  const watchlist = await buildPantauBundle(context);
  const profile = context.profile;
  const owned = profile.owned.filter((symbol) => companies.some((company) => company.symbol === symbol));

  const body = [
    `Aturan riset menentukan fokus dan urutan penjelasan, bukan angka, rumus, atau sumber.`,
    watchlist.body,
    owned.length
      ? `Ditandai dimiliki: ${owned.join(", ")}. Harga memakai penutupan rekaman, bukan live.`
      : `Belum ada emiten yang ditandai dimiliki, jadi bobot portofolio tidak ikut mengurutkan kasus.`,
    `Ambang relevansi eksposur yang dipakai saat ini: ${DEFAULT_THRESHOLDS.relevanceFloor}. Eksposur di atas ambang ini menandai kasus High; kasus tanpa jalur eksposur tetap Low.`,
    `Urutan pilar yang dipilih pembaca: ${profile.config.pillarOrder.join(", ")}. Horizon ${profile.config.horizon}, kedalaman jawaban ${profile.config.depth}.`,
    profile.preferredSectors.length
      ? `Sektor yang diutamakan: ${profile.preferredSectors.join(", ")}.`
      : `Belum ada sektor yang diutamakan.`,
  ].join("\n");

  return {
    id: "view:playbook",
    scope: "user",
    kind: "view",
    title: "Aturan riset investor",
    body,
    figures: extractNumerals(body),
    citations: watchlist.citations,
    symbols: watchlist.symbols,
  };
}
