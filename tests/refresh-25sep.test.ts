import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { DIMENSION_LABELS } from "@/lib/agent/dimensions";
import { answerableFigures, matchFigureWithStrength } from "@/lib/agent/explain";
import { extractNumerals } from "@/lib/agent/llm/verify";
import { companies, coverageInfo, demoProfiles, events } from "@/lib/data/fixtures";

/**
 * The scheduled refresh of 28 Sep 2026 recorded the 25 Sep session and its
 * gate went red on seven tests, twice, so nothing deployed. None of the seven
 * was a test pinned to yesterday's numbers; each was a rule that only held
 * while the data happened to be arranged a certain way. These are the rules,
 * stated so the next refresh cannot rearrange them away.
 */
const profile = demoProfiles[0];
const analysed = companies.filter((company) => coverageInfo[company.symbol]?.analyzed).map((company) => company.symbol);

describe("an attention event is not contradicting evidence", () => {
  it("a case reads Mixed Evidence only from a link with a direction to disagree with", () => {
    for (const company of companies.filter((item) => item.evidenceState === "Mixed Evidence")) {
      const directed = events.filter((event) => event.category !== "sentiment").flatMap((event) => event.impactLinks)
        .filter((link) => link.symbol === company.symbol && (link.direction === "Adverse" || link.direction === "Unverified"));
      expect(directed.length, company.symbol).toBeGreaterThan(0);
    }
  });
});

describe("the lead dimension is the plan's, not the table's", () => {
  it("the causal map heads with the case's first focus", async () => {
    for (const symbol of analysed) {
      const analysis = await agentEngine.analyzeCompany(symbol, profile);
      const graph = await agentEngine.buildCausalGraph(symbol, profile, { scope: "market", minRelevance: 0 });
      expect(graph?.targetObservables[0], symbol).toBe(DIMENSION_LABELS[analysis!.researchPlan.focuses[0]]);
    }
  });
});

describe("a figure label is named however the reader spaces it", () => {
  it("a ticker typed inside a label still names the label", async () => {
    for (const symbol of analysed) {
      const figures = answerableFigures((await agentEngine.analyzeCompany(symbol, profile))!);
      for (const { metric } of figures.filter((item) => item.metric.label.trim().split(/\s+/).length === 2)) {
        const [first, second] = metric.label.split(/\s+/);
        const match = matchFigureWithStrength(figures, `berapa ${first} ${symbol} ${second}?`, extractNumerals);
        expect(match?.named, `${symbol} ${metric.label}`).toBe(true);
        expect(match?.figure.metric.label, `${symbol} ${metric.label}`).toBe(metric.label);
      }
    }
  });

  it("a label typed without its spaces still names the label", async () => {
    const figures = answerableFigures((await agentEngine.analyzeCompany(analysed[0], profile))!);
    for (const { metric } of figures.filter((item) => /\s/.test(item.metric.label.trim()))) {
      const match = matchFigureWithStrength(figures, metric.label.replace(/\s+/g, ""), extractNumerals);
      expect(match?.named, metric.label).toBe(true);
    }
  });
});
