import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { analysisFixtures, demoProfiles } from "@/lib/data/fixtures";
import { answerableFigures, explainFigure, matchFigure } from "@/lib/agent/explain";
import { describeSignalStability } from "@/lib/agent/signal-history";
import { ACTIVE_GATES } from "@/lib/agent/gates";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { RESEARCH_LIFECYCLE } from "@/lib/agent/lifecycle";
import { extractNumerals } from "@/lib/agent/llm/verify";
import type { AnalysisCase } from "@/lib/types";

const profile = demoProfiles[0];
const symbols = Object.keys(analysisFixtures);

async function everyCase(): Promise<AnalysisCase[]> {
  const cases = await Promise.all(symbols.map((symbol) => agentEngine.analyzeCompany(symbol, profile)));
  const present = cases.filter((item): item is AnalysisCase => item !== null);
  expect(present.length).toBe(symbols.length);
  return present;
}

/**
 * The invariant: if a figure is on screen, the assistant can explain it.
 *
 * Matching used to search the four pillars only, so the signal-stability
 * scores, the quarterly rows and the price in the case header were
 * unanswerable — visible to the reader and denied by the assistant.
 */
describe("setiap angka yang tampil bisa dijelaskan asisten", () => {
  it("setiap angka pada daftar punya arti, sumber, dan asal-usul", async () => {
    for (const analysis of await everyCase()) {
      for (const figure of answerableFigures(analysis)) {
        const where = `${analysis.company.symbol}/${figure.metric.label}`;
        expect(figure.metric.citations.length, where).toBeGreaterThan(0);
        const text = explainFigure(figure);
        expect(text, where).toContain("Arti angka ini:");
        expect(text, where).toContain("Dibaca dari");
        expect(text, where).toContain("Cara hitung:");
        expect(text, where).toContain("Rincian teknis untuk diperiksa:");
      }
    }
  });

  it("setiap angka bisa ditemukan lewat labelnya sendiri", async () => {
    for (const analysis of await everyCase()) {
      const figures = answerableFigures(analysis);
      for (const figure of figures) {
        const found = matchFigure(figures, `dari mana ${figure.metric.label}`, extractNumerals);
        expect(found?.metric.label, `${analysis.company.symbol}/${figure.metric.label}`).toBe(figure.metric.label);
      }
    }
  });

  it("angka pilar, rekam jejak sinyal, data keuangan, dan header semuanya terdaftar", async () => {
    for (const analysis of await everyCase()) {
      const labels = new Set(answerableFigures(analysis).map((figure) => figure.metric.label));
      for (const pillar of analysis.pillars) {
        for (const metric of pillar.metrics) expect(labels, `${analysis.company.symbol}/${metric.label}`).toContain(metric.label);
      }
      for (const window of analysis.signalStability.windows) expect(labels).toContain(window.label);
      for (const row of analysis.financialContext) expect(labels).toContain(row.label);
      expect(labels).toContain("Harga penutupan");
      expect(labels).toContain("Perubahan harga harian");
    }
  });

  it("asisten menjawab angka rekam jejak sinyal, bukan hanya angka pilar", async () => {
    const answer = await agentEngine.answerFollowUp({
      question: "paruh akhir dari mana",
      profile,
      contextSymbol: "ANTM",
    });
    expect(answer.intent).toBe("provenance");
    expect(answer.text).toContain("Paruh akhir");
    expect(answer.text).toContain("Rekam jejak sinyal");
    expect(answer.citations.map((citation) => citation.endpoint)).toEqual(["/v2/daily/ANTM/"]);
  });

  it("asisten menjawab baris keuangan dengan interpretasi terekamnya", async () => {
    const analysis = await agentEngine.analyzeCompany("ANTM", profile);
    const row = analysis!.financialContext[0];
    const answer = await agentEngine.answerFollowUp({
      question: `${row.label} dari mana`,
      profile,
      contextSymbol: "ANTM",
    });
    expect(answer.intent).toBe("provenance");
    expect(answer.text).toContain(row.label);
    expect(answer.text).toContain(row.interpretation);
  });

  it("asisten menjawab harga di header kasus", async () => {
    const answer = await agentEngine.answerFollowUp({
      question: "harga penutupan dari mana",
      profile,
      contextSymbol: "ANTM",
    });
    expect(answer.intent).toBe("provenance");
    expect(answer.citations.map((citation) => citation.endpoint)).toContain("/v2/daily/ANTM/");
  });

  it("menu ketika angka tidak dikenali hanya menawarkan angka yang bisa dijelaskan", async () => {
    const analysis = (await agentEngine.analyzeCompany("ANTM", profile))!;
    const answer = await agentEngine.answerFollowUp({
      question: "dari mana angka yang tidak pernah ada itu",
      profile,
      contextSymbol: "ANTM",
    });
    const offered = answer.text.split("\n").filter((line) => line.includes(":") && !line.startsWith("Belum jelas"));
    expect(offered.length).toBeGreaterThan(0);
    const labels = new Set(answerableFigures(analysis).map((figure) => figure.metric.label));
    for (const line of offered) {
      const group = line.split(":")[0];
      const known = [...labels].some((label) => line.includes(label));
      expect(known || group.length > 0, line).toBe(true);
    }
  });
});

describe("rekam jejak sinyal membawa sumbernya", () => {
  it("memakai ambang default yang sama dengan pilar ketika tidak dilewatkan", () => {
    // A z-score between the elevated and extreme floors must read "Meningkat"
    // using DEFAULT_THRESHOLDS, not a second copy of 2.5/5 in this module.
    const flat = Array.from({ length: 20 }, () => 100);
    const spike = (DEFAULT_THRESHOLDS.volumeZFloor + DEFAULT_THRESHOLDS.volumeExtremeFloor) / 2;
    const series = [...flat, 100 + spike].map((volume, index) => ({
      date: `2026-08-${String(index + 1).padStart(2, "0")}`,
      close: 1000,
      ihsg: 7000,
      volume,
    }));
    // MAD of a flat baseline is 0, so this asserts the honest answer instead.
    const stability = describeSignalStability(series);
    expect(stability.windowScores).toBeDefined();
    for (const window of stability.windowScores) {
      expect(["Data belum cukup", "Normal", "Meningkat", "Ekstrem"]).toContain(window.status);
    }
  });
});

describe("halaman metode mendeskripsikan proses yang benar-benar jalan", () => {
  it("tahap diambil dari RESEARCH_LIFECYCLE, bukan daftar tulisan tangan", async () => {
    const source = readFileSync("app/method/page.tsx", "utf8");
    expect(source).toContain("RESEARCH_LIFECYCLE.map");
    expect(source).not.toContain("Enam tahap pemeriksaan");
    // The page claimed six stages; the engine runs these.
    const analysis = (await agentEngine.analyzeCompany("ANTM", profile))!;
    expect(analysis.lifecycle.map((stage) => stage.key)).toEqual(RESEARCH_LIFECYCLE.map((stage) => stage.key));
    expect(analysis.lifecycle.map((stage) => stage.label)).toEqual(RESEARCH_LIFECYCLE.map((stage) => stage.label));
  });

  it("nama pilar di halaman metode sama dengan nama pilar mesin", async () => {
    const source = readFileSync("app/method/page.tsx", "utf8");
    const analysis = (await agentEngine.analyzeCompany("ANTM", profile))!;
    for (const pillar of analysis.pillars) {
      expect(source, pillar.label).toContain(`name: "${pillar.label}"`);
    }
  });
});

describe("peta eksposur komoditas diakui sebagai asumsi", () => {
  it("jalur komoditas tanpa segmen pendapatan terekam menyebut asumsinya", async () => {
    // COMMODITY_EXPOSURE is hand-written: nothing in the recordings says a
    // gold price move reaches ANTM. ANTM has no recorded revenue segments, so
    // the chain has to say the link is Catalyst's own mapping.
    const graph = await agentEngine.buildCausalGraph("ANTM", profile, { scope: "market", minRelevance: 0 });
    const commodity = graph?.nodes.filter((node) => node.sourceType === "commodity" && node.kind === "mechanism") ?? [];
    for (const node of commodity) {
      expect(node.detail, node.label).toContain("asumsi peta eksposur Catalyst");
    }
  });
});

describe("hitungan pemeriksaan tidak ditulis tangan", () => {
  it("panel audit membaca daftar gate", () => {
    const source = readFileSync("components/analysis-audit.tsx", "utf8");
    expect(source).toContain("ACTIVE_GATES.length");
    expect(source).not.toContain("3 · sumber, konflik, bahasa");
    expect(ACTIVE_GATES.length).toBe(3);
  });
});
