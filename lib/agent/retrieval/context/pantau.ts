import { companies, coverageInfo, missingList } from "@/lib/data/fixtures";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { ContextBundle, RequestContext } from "@/lib/agent/retrieval/types";

/**
 * The reader's watchlist, and what each row is missing.
 *
 * The id is not `view:pantau`: that belongs to the Pantau web page
 * (`context/web-watch.ts`), which is a different screen with different
 * material. Two builders under one id lose the second one silently, because
 * `retrieveContext` dedupes on `bundle.id`.
 */
export async function buildPantauBundle(context: RequestContext): Promise<ContextBundle> {
  const watchlist = context.profile.watchlist;
  const rows = companies.filter((company) => watchlist.includes(company.symbol));
  const body = [
    `Daftar pantauan memuat ${rows.length} dari ${companies.length} emiten terekam.`,
    ...rows.map((company) => {
      const coverage = coverageInfo[company.symbol];
      const gaps = coverage?.missing.length ? ` Belum ada: ${missingList(coverage.missing)}.` : "";
      return `- ${company.symbol} (${company.name}), sektor ${company.sector}. Kasus lengkap: ${coverage?.analyzed ? "ya" : "belum"}.${gaps}`;
    }),
  ].join("\n");
  return {
    id: "view:pantau-watchlist",
    kind: "view",
    scope: "user",
    title: "Daftar pantauan",
    body,
    figures: extractNumerals(body),
    // Counted from the recorded registry, so the answer carries the sources
    // those recordings arrived with rather than presenting a bare figure.
    citations: [...new Map(rows.flatMap((company) => company.citations).map((citation) => [citation.id, citation])).values()],
    symbols: rows.map((company) => company.symbol),
  };
}
