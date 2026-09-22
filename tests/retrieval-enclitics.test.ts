import { describe, expect, it } from "vitest";
import { scoreCorpus } from "@/lib/agent/retrieval/score";
import { demoProfiles } from "@/lib/data/fixtures";
import type { RequestContext } from "@/lib/agent/retrieval/types";

const context: RequestContext = { profile: demoProfiles[0], history: [] };
const idsFor = (question: string) => scoreCorpus(question, context).map((row) => row.entry.id);

describe("pertanyaan yang ditulis dengan enklitik", () => {
  it("menyentuh entri yang sama dengan bentuk dasarnya", () => {
    // "pantauanku" tidak pernah masuk peringkat sama sekali sebelum ini:
    // tidak ada indeks yang memuat kata itu, jadi pertanyaannya kosong.
    expect(idsFor("pantauanku isinya apa")).toContain("view:playbook");
  });

  it("tidak kehilangan bentuk aslinya", () => {
    expect(idsFor("daftar pantauan isinya apa")).toContain("view:playbook");
  });

  it("tidak mengubah pertanyaan yang menyebut emiten", () => {
    // Alias emiten tidak pernah dipotong, jadi pertanyaan tentang satu
    // emiten tetap menyentuh kasusnya.
    const symbol = demoProfiles[0].watchlist[0];
    expect(idsFor(`${symbol} kenapa masuk daftar`)).toContain(`case:${symbol}`);
  });
});
