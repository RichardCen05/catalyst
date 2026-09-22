import { describe, expect, it } from "vitest";
import { loadViewBundle, viewEntries } from "@/lib/agent/retrieval/context";
import { demoProfiles } from "@/lib/data/fixtures";
import type { RequestContext } from "@/lib/agent/retrieval/types";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

describe("memo bundel halaman", () => {
  it("memberi setiap spec entri korpusnya sendiri", () => {
    // Dua spec boleh berbagi satu `view` — sebuah halaman bisa punya materi
    // registry dan materi milik pembaca. Yang tidak boleh sama adalah id-nya.
    const ids = viewEntries().map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("memuat bundel berdasarkan id spec, bukan hanya nama halaman", async () => {
    // `loadViewBundle` dulu memakai `VIEWS.find(c => c.view === view)`, jadi
    // spec kedua pada halaman yang sama tidak pernah bisa dimuat sama sekali.
    for (const entry of viewEntries()) {
      const direct = await entry.load(context);
      const byId = await loadViewBundle(entry.id, context);
      expect(byId?.id ?? null, entry.id).toBe(direct?.id ?? null);
    }
  });
});
