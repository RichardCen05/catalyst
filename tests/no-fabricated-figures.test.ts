import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { analysisFixtures, coverageInfo, DATA_AS_OF, DATA_AS_OF_LABEL } from "@/lib/data/fixtures";
import { holdingExposure, holdingPnl, holdingWeight } from "@/lib/portfolio";

function sourceFiles(root: string): string[] {
  return readdirSync(root).flatMap((entry) => {
    const path = join(root, entry);
    if (statSync(path).isDirectory()) return sourceFiles(path);
    return /\.tsx?$/.test(entry) ? [path] : [];
  });
}

describe("tanggal rekaman hanya ditulis satu kali", () => {
  it("label diturunkan dari DATA_AS_OF", () => {
    expect(DATA_AS_OF_LABEL).toBe(
      new Intl.DateTimeFormat("id-ID", { day: "numeric", month: "short", year: "numeric", timeZone: "Asia/Jakarta" })
        .format(new Date(DATA_AS_OF)),
    );
  });

  it("tidak ada teks UI yang menuliskan tanggalnya sebagai literal", () => {
    // A refresh moves DATA_AS_OF. Every literal copy of the date then tells the
    // reader the figures were recorded on a day they were not, which is a
    // false provenance claim even though nobody edited the sentence.
    const offenders = [...sourceFiles("app"), ...sourceFiles("components"), ...sourceFiles("lib")]
      .filter((path) => !path.endsWith("market.generated.ts"))
      .filter((path) => {
        const source = readFileSync(path, "utf8").replace(/\/\*[\s\S]*?\*\/|\/\/.*$/gm, "");
        return source.includes(DATA_AS_OF_LABEL);
      });
    expect(offenders).toEqual([]);
  });
});

describe("momentum tidak pernah memakai beta atau imbal hasil sektor bawaan", () => {
  it("setiap kasus membawa beta dan imbal hasil sektor terekam", () => {
    const cases = Object.values(analysisFixtures);
    expect(cases.length).toBeGreaterThan(0);
    for (const fixture of cases) {
      expect(fixture.beta).toBeTypeOf("number");
      expect(fixture.sectorReturn).toBeTypeOf("number");
    }
  });

  it("cakupan menyebut beta dan imbal hasil sektor sebagai rekaman yang bisa hilang", () => {
    for (const coverage of Object.values(coverageInfo)) {
      if (!coverage.analyzed) continue;
      expect(coverage.missing).not.toContain("beta + imbal hasil sektor");
    }
  });
});

describe("harga yang tidak terekam tidak pernah menjadi angka", () => {
  const holding = { shares: 1_000, avgCost: 1_500 };

  it("eksposur dan laba/rugi mengembalikan null, bukan nol atau kerugian karangan", () => {
    expect(holdingExposure(holding, undefined)).toBeNull();
    expect(holdingPnl(holding, undefined)).toBeNull();
    expect(holdingPnl(holding, 0)).toBeNull();
  });

  it("menghitung normal saat harga terekam", () => {
    expect(holdingExposure(holding, 2_000)).toBe(2_000_000);
    expect(holdingPnl(holding, 2_000)).toBe(500_000);
  });

  it("posisi tanpa harga tidak menggeser bobot posisi lain", () => {
    const holdings = { ANTM: holding, TINS: holding } as const;
    const weight = holdingWeight("ANTM", holdings, { ANTM: 2_000 });
    expect(weight).toBe(1);
  });
});
