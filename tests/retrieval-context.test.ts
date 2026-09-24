import { describe, expect, it } from "vitest";
import { buildThresholdBundle } from "@/lib/agent/retrieval/context/threshold";
import { buildCaseBundle } from "@/lib/agent/retrieval/context/case";
import { buildImpactBundle } from "@/lib/agent/retrieval/context/impact";
import { buildCasesBundle } from "@/lib/agent/retrieval/context/cases";
import { buildMetricBundle } from "@/lib/agent/retrieval/context/metric";
import { METRIC_FORMULA } from "@/lib/agent/explain";
import { extractNumerals, verifyDraft } from "@/lib/agent/llm/verify";
import { viewEntries } from "@/lib/agent/retrieval/context";
import { companies, demoProfiles, coverageInfo } from "@/lib/data/fixtures";
import type { RequestContext } from "@/lib/agent/retrieval/types";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

describe("bundel ambang", () => {
  it("membawa nilai dan asal-usulnya", async () => {
    const bundle = await buildThresholdBundle("concentrationFloor");
    expect(bundle.body).toContain("concentrationFloor");
    expect(bundle.figures.length).toBeGreaterThan(0);
  });

  it("menjelaskan status asal dengan kalimat, bukan istilah tabel saja", async () => {
    const bundle = await buildThresholdBundle("concentrationFloor");
    expect(bundle.body).toMatch(/belum pernah diukur|turunan matematis|penjaga kualitas/);
  });
});

describe("bundel kasus", () => {
  it("menyebut emitennya dan membawa sumber", async () => {
    const bundle = await buildCaseBundle("ANTM");
    expect(bundle.symbols).toContain("ANTM");
    expect(bundle.citations.length).toBeGreaterThan(0);
    expect(bundle.body).toContain("ANTM");
  });

  it("mengatakan apa adanya ketika emiten tidak punya kasus lengkap", async () => {
    const incomplete = companies.find((company) => !coverageInfo[company.symbol]?.analyzed);
    if (!incomplete) return;
    const bundle = await buildCaseBundle(incomplete.symbol);
    expect(bundle.body).toContain("belum punya kasus lengkap");
    expect(bundle.figures).toHaveLength(0);
  });
});

describe("bundel tampilan", () => {
  it("peta sebab akibat menyebut cakupan sebagai pecahan, bukan jumlah telanjang", async () => {
    const bundle = await buildImpactBundle();
    expect(bundle.body).toMatch(/\d+ dari \d+ emiten/);
  });

  it("cakupan kasus menyebut berapa dari berapa", async () => {
    const bundle = await buildCasesBundle();
    expect(bundle.body).toMatch(/\d+ dari \d+ emiten/);
  });

  it("menaruh setiap angka yang ditulisnya ke daftar izinnya sendiri", async () => {
    for (const bundle of [await buildImpactBundle(), await buildCasesBundle()]) {
      for (const numeral of extractNumerals(bundle.body)) {
        expect(bundle.figures, `${bundle.id} / ${numeral}`).toContain(numeral);
      }
    }
  });
});

describe("bundel metrik", () => {
  it("menjelaskan rumus tanpa pernah membawa angka", async () => {
    const bundle = await buildMetricBundle("HHI");
    expect(bundle.body).toContain("HHI");
    expect(bundle.figures).toHaveLength(0);
  });

  it("mengizinkan konstanta rumus, bukan nilai saat ini", async () => {
    // Jawaban "dari mana angka relevansi" ditolak verifier karena "95" dari
    // rumus tidak ada di daftar izin; draf yang setia jatuh ke teks mentah.
    const label = "Relevansi eksposur";
    const bundle = await buildMetricBundle(label);
    expect(bundle.figures).toEqual(extractNumerals(METRIC_FORMULA[label]));
    expect(verifyDraft("Filing mendapat 95, minimum 40.", bundle.figures, []).approved).toBe(true);
    const unknown = await buildMetricBundle("label yang tidak ada");
    expect(unknown.figures).toHaveLength(0);
  });
});

describe("registry tampilan", () => {
  it("mendaftarkan satu entri per halaman, masing-masing dengan istilah", () => {
    const entries = viewEntries();
    expect(entries.length).toBeGreaterThan(0);
    for (const entry of entries) {
      expect(entry.kind).toBe("view");
      expect(entry.terms.length, entry.id).toBeGreaterThan(0);
      expect(entry.view, entry.id).toBeDefined();
    }
  });

  it("membawa kosakata halaman peta sebab akibat, supaya pertanyaan pembaca menemukannya", () => {
    const impact = viewEntries().find((entry) => entry.id === "view:impact")!;
    for (const term of ["jalur", "mekanisme", "sebab akibat"]) {
      expect(impact.terms, term).toContain(term);
    }
  });

  it("satu builder yang gagal tidak menjatuhkan yang lain", async () => {
    const results = await Promise.allSettled(viewEntries().map((entry) => entry.load(context)));
    expect(results.some((result) => result.status === "fulfilled")).toBe(true);
  });
});
