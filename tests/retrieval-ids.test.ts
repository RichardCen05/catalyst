import { describe, expect, it } from "vitest";
import { buildCorpus } from "@/lib/agent/retrieval/corpus";
import { buildPantauBundle } from "@/lib/agent/retrieval/context/pantau";
import { buildWebWatchBundle } from "@/lib/agent/retrieval/context/web-watch";
import { loadPageBundle } from "@/lib/agent/retrieval/context";
import type { RequestContext } from "@/lib/agent/retrieval/types";
import { demoProfiles } from "@/lib/data/fixtures";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

/** Ids yang muncul lebih dari sekali, beserta jumlahnya. */
function duplicates(ids: string[]): string[] {
  const seen = new Map<string, number>();
  for (const id of ids) seen.set(id, (seen.get(id) ?? 0) + 1);
  return [...seen.entries()].filter(([, count]) => count > 1).map(([id]) => id);
}

describe("invarian id retrieval", () => {
  it("memberi id unik pada setiap entri korpus", () => {
    expect(duplicates(buildCorpus().entries.map((entry) => entry.id))).toEqual([]);
  });

  it("memberi id unik pada setiap bundel yang dimuat", async () => {
    // `retrieveContext` membuang bundel ber-id sama tanpa jejak
    // (`bundle.ts`, himpunan `seen`). Dua pembangun yang memakai satu id
    // berarti materi yang kedua hilang diam-diam, bukan tampil dua kali.
    const loaded = await Promise.all(
      buildCorpus().entries.map((entry) => entry.load(context)),
    );
    expect(duplicates(loaded.flatMap((bundle) => (bundle ? [bundle.id] : [])))).toEqual([]);
  });

  it("memisahkan daftar pantauan dari halaman Pantau web", async () => {
    const watchlist = await buildPantauBundle(context);
    const webWatch = await buildWebWatchBundle();
    expect(watchlist.id).not.toBe(webWatch.id);
  });

  it("tidak mengembalikan materi cakupan kasus untuk halaman kasus tanpa simbol", async () => {
    // Komentar pada spec `view:case` menyatakan tidak ada yang khas halaman
    // ini saat tidak ada kasus terbuka. Mengembalikan bundel `view:cases`
    // membuat pernyataan itu tidak benar dan menabrak entri `view:cases`.
    expect(await loadPageBundle("case", { ...context, contextSymbol: undefined })).toBeNull();
  });
});
