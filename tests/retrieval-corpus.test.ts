import { describe, expect, it } from "vitest";
import { getCorpus } from "@/lib/agent/retrieval/corpus";
import { companies, events } from "@/lib/data/fixtures";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { demoProfiles } from "@/lib/data/fixtures";
import type { RequestContext } from "@/lib/agent/retrieval/types";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

describe("indeks korpus", () => {
  const corpus = getCorpus();

  it("memuat satu entri untuk setiap emiten terekam", () => {
    for (const company of companies) {
      expect(
        corpus.entries.some((entry) => entry.kind === "case" && entry.symbols.includes(company.symbol)),
        company.symbol,
      ).toBe(true);
    }
  });

  it("memuat satu entri untuk setiap peristiwa terekam", () => {
    for (const event of events) {
      expect(corpus.byId.has(`event:${event.id}`), event.id).toBe(true);
    }
  });

  it("memuat satu entri untuk setiap ambang, supaya aplikasi bisa menjelaskan dirinya", () => {
    for (const key of Object.keys(DEFAULT_THRESHOLDS)) {
      expect(corpus.byId.has(`threshold:${key}`), key).toBe(true);
    }
  });

  it("mengindeks setiap istilah entri dalam huruf kecil", () => {
    for (const entry of corpus.entries) {
      expect(entry.terms.length, entry.id).toBeGreaterThan(0);
      for (const term of entry.terms) {
        expect(term, `${entry.id} / "${term}"`).toBe(term.toLowerCase());
        expect(corpus.byTerm.get(term) ?? [], term).toContain(entry.id);
      }
    }
  });

  it("memberi setiap entri id yang unik", () => {
    const ids = corpus.entries.map((entry) => entry.id);
    expect(new Set(ids).size).toBe(ids.length);
  });

  it("membangun indeks sekali per instance", () => {
    expect(getCorpus()).toBe(corpus);
  });

  it("menaruh setiap angka yang ditulis bundel ke dalam daftar izinnya sendiri", async () => {
    // Angka yang sampai ke model tanpa ada di daftar izin akan membuat
    // verifier menolak draf, dan pembaca kehilangan seluruh jawaban.
    const sampled = corpus.entries.filter((entry) => entry.kind !== "case").slice(0, 40);
    for (const entry of sampled) {
      const bundle = await entry.load(context);
      for (const numeral of extractNumerals(bundle.body)) {
        expect(bundle.figures, `${entry.id} / ${numeral}`).toContain(numeral);
      }
    }
  }, 30000);

  it("tidak pernah memberi angka pada bundel metrik", async () => {
    // Nilainya sudah ada di layar; angka karangan di sebelahnya lebih buruk
    // daripada tidak ada kalimat sama sekali.
    const metric = corpus.entries.find((entry) => entry.kind === "metric")!;
    const bundle = await metric.load(context);
    expect(bundle.figures).toHaveLength(0);
  });
});
