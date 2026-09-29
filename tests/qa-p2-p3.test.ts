import { readdirSync, readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { safeLanguage } from "@/lib/agent/gates";
import { detectLanguage } from "@/lib/agent/llm/verify";
import { findSymbolsRobust, matchEventForQuestion } from "@/lib/agent/query";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { shownDisposition } from "@/lib/case-disposition";
import { companies, coverageInfo, demoProfiles, events, WINDOW_START } from "@/lib/data/fixtures";
import { companyHref } from "@/lib/company-href";
import { defaultImpactSymbol } from "@/lib/impact-symbol";
import { buildDefaultPlaybook } from "@/lib/playbook-defaults";
import { bandForArticle } from "@/lib/web-watch/proposals";
import { normalizeQueue, splitMatchEvidence, type TriageMatch } from "@/lib/web-watch/queue";
import { repairStoredEvent } from "@/lib/web-watch/stored-fields";
import type { CaseResolution, MarketEvent, SymbolCode } from "@/lib/types";

/**
 * The P2 and P3 findings of the QA pass that were still failing or partial on
 * prod rev 00090 (28 Sep 2026), one describe per finding, plus the routing bug
 * found while checking them. Each states the rule the finding broke, over
 * every case the recordings hold, so a data refresh cannot pass it by
 * rearranging which case happens to show the defect.
 */
const profile = demoProfiles[0];
const symbols = companies.map((company) => company.symbol);
const analysed = symbols.filter((symbol) => coverageInfo[symbol]?.analyzed);
const eventById = new Map(events.map((event) => [event.id, event]));
const eventByCitation = new Map(events.flatMap((event) => event.citations.map((citation) => [citation.id, event] as const)));
const hypothesisEvent = (symbol: SymbolCode, id: string) => eventById.get(id.slice(`${symbol}-competing-`.length));
const staleReading = (event: MarketEvent) => event.sourceType === "commodity" && event.publishedAt.slice(0, 10) < WINDOW_START;

describe("P2-3 · a commodity reading older than the window is stale, not a cause", () => {
  it("the recordings still hold such a reading, so the rule below is tested", () => {
    expect(events.some(staleReading)).toBe(true);
  });

  it("never ranks among the competing causes, and is labelled stale on the map", async () => {
    let seen = 0;
    for (const symbol of symbols) {
      const graph = await agentEngine.buildCausalGraph(symbol, profile, { scope: "market", minRelevance: 0 });
      if (!graph) continue;
      for (const hypothesis of graph.competingHypotheses) {
        const event = hypothesisEvent(symbol, hypothesis.id);
        expect(event && staleReading(event), `${symbol} ${hypothesis.claim}`).toBeFalsy();
      }
      for (const node of graph.nodes.filter((item) => item.kind === "source")) {
        const event = eventById.get(node.id.slice("source-".length));
        if (!event || !staleReading(event)) continue;
        seen += 1;
        expect(node.stale, `${symbol} ${node.label}`).toBe(true);
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("P2-4 · a trading channel stops at the share, not at the issuer's operations", () => {
  it("a flows or attention hypothesis never claims to explain a business indicator", async () => {
    let seen = 0;
    for (const symbol of analysed) {
      const graph = await agentEngine.buildCausalGraph(symbol, profile, { scope: "market", minRelevance: 0 });
      for (const hypothesis of graph?.competingHypotheses ?? []) {
        const event = hypothesisEvent(symbol, hypothesis.id);
        if (!event || (event.category !== "flows" && event.category !== "sentiment")) continue;
        seen += 1;
        const claim = hypothesis.claim.toLowerCase();
        expect(claim, claim).not.toContain("menjelaskan perubahan");
        for (const label of graph!.targetObservables) expect(claim, `${symbol}: ${label}`).not.toContain(label.toLowerCase());
      }
    }
    expect(seen).toBeGreaterThan(0);
  });
});

describe("P2-5 · a refusal answers in the language it was asked in", () => {
  it("reads a short English question as English", () => {
    expect(detectLanguage("Should I buy PGAS now?")).toBe("en");
    expect(detectLanguage("Can you forecast PGAS for me?")).toBe("en");
  });

  it("refuses advice, forecasts and intraday asks in English when asked in English", () => {
    for (const question of ["Should I buy PGAS now?", "What is the PGAS price forecast?", "What was the PGAS intraday price?"]) {
      const verdict = safeLanguage(question);
      expect(verdict.refused, question).toBe(true);
      expect(detectLanguage(verdict.text), `${question} → ${verdict.text}`).toBe("en");
    }
  });

  it("still refuses in Indonesian when asked in Indonesian", () => {
    const verdict = safeLanguage("Apakah saya sebaiknya beli PGAS sekarang?");
    expect(verdict.refused).toBe(true);
    expect(detectLanguage(verdict.text)).toBe("id");
  });

  it("the engine's own refusal and its unmapped-question answer follow English", async () => {
    const refusal = await agentEngine.answerFollowUp({ question: "Should I buy PGAS now?", profile });
    expect(refusal.refused).toBe(true);
    expect(detectLanguage(refusal.text), refusal.text).toBe("en");
    const unknown = await agentEngine.answerFollowUp({ question: "Who painted the Mona Lisa?", profile });
    expect(unknown.intent).toBe("unknown");
    expect(detectLanguage(unknown.text), unknown.text).toBe("en");
  });
});

describe("P2-7 · a watched page is read as its article, and a proposal claims no more than it states", () => {
  const minWords = resolveThresholds().webWatchHeadlineMinWords;
  const headline = "FEKDI x IFSE 2026: Sinergi Pacu Ekonomi Keuangan Digital Indonesia";
  const prose = "Bank Indonesia bersama Otoritas Jasa Keuangan menyelenggarakan festival ekonomi dan keuangan digital di Jakarta pekan ini.";
  const chrome = ["Turn on more accessible mode", "Turn off more accessible mode", "Skip Ribbon Commands", "Skip to main content", "Follow", "Bank Indonesia Currently selected", "sp_2819626", "Karier", "Edukasi", "Profil\nOrganisasi\nGovernance"];
  const stored: MarketEvent = {
    id: "web-src-bi-news-test",
    title: headline,
    summary: [headline, ...chrome].join("\n\n"),
    body: [headline, ...chrome, prose].join("\n\n"),
    category: "policy",
    sourceType: "policy",
    publishedAt: "2026-09-24T00:00:00+07:00",
    asOf: "2026-09-25T10:30:30.473Z",
    sector: "Market",
    impactLinks: [],
    citations: [],
  };

  it("drops the page controls a stored item still carries before its first sentence", () => {
    const repaired = repairStoredEvent(stored, minWords);
    for (const line of ["Turn on more accessible mode", "Skip Ribbon Commands", "Karier"]) {
      expect(repaired.body).not.toContain(line);
      expect(repaired.summary).not.toContain(line);
    }
    expect(repaired.body?.startsWith(headline)).toBe(true);
    expect(repaired.body).toContain(prose);
  });

  it("an article that states no figure is proposed at the lowest band", () => {
    expect(bandForArticle("medium", `${headline}\n\n${prose}`)).toBe("low");
    expect(bandForArticle("high", "BI-Rate turun 25 bps menjadi 5,75% pada rapat dewan gubernur.")).toBe("high");
  });

  it("a stored proposal on a figureless article reads at the lowest band", () => {
    const queue = normalizeQueue({
      pending: [stored],
      matches: { [stored.id]: { symbols: ["BBCA"], matchedBy: [{ symbol: "BBCA", by: "source", term: "BI" }], at: stored.asOf } },
      proposals: { [stored.id]: { impacts: [{ symbol: "BBCA", direction: "Supported", band: "medium", path: "p", rationale: "r" }], model: "m", verifiedAt: stored.asOf } },
    });
    expect(queue.proposals[stored.id].impacts[0].band).toBe("low");
  });

  it("a symbol only the source declared is not listed as matching the text", () => {
    const match: TriageMatch = {
      symbols: ["BBCA", "ANTM", "BUKA"],
      matchedBy: [
        { symbol: "BBCA", by: "source", term: "BI" },
        { symbol: "ANTM", by: "source", term: "BI" },
        { symbol: "BUKA", by: "sector", term: "Technology" },
      ],
      at: stored.asOf,
    };
    const split = splitMatchEvidence(match);
    expect(split.text.map((item) => item.symbol)).toEqual(["BUKA"]);
    expect(split.declaredOnly).toEqual(["BBCA", "ANTM"]);
  });
});

describe("P2-9 · an approved rule and a closed case say what they changed", () => {
  it("an approved materiality rule says it is recorded but not evaluated", async () => {
    const symbol = analysed[0];
    const playbook = buildDefaultPlaybook();
    const rule = `[Disetujui ${symbol}] Rilis laba tanpa lonjakan volume = materialitas sedang`;
    const analysis = await agentEngine.analyzeCompany(symbol, profile, { playbook: { ...playbook, materialityRules: [...playbook.materialityRules, rule] } });
    const trace = analysis!.priority.ruleTrace.find((item) => item.rule === rule);
    expect(trace?.approved).toBe(true);
    expect(trace?.evaluated).toBe(false);
    expect(trace?.effect).toContain(String(resolveThresholds(playbook).relevanceFloor));
    expect(analysis!.priority.reason).toContain("belum dievaluasi");
  });

  it("a closed case shows the action the reader chose", () => {
    const resolution: CaseResolution = { outcome: "supported", disposition: "monitor", finalHypothesis: "h", falsifiedBy: "", wrongAssumption: "", reusableRule: "r", resolvedAt: "2026-09-28T00:00:00Z" };
    expect(shownDisposition("escalate", resolution)).toBe("monitor");
    expect(shownDisposition("escalate", undefined)).toBe("escalate");
  });
});

describe("P2-10 · a company is found by its name", () => {
  it("every registry company is found by its own name without the ticker", () => {
    for (const company of companies) {
      const name = company.name.replace(/^PT\s+/i, "").replace(/\s+Tbk\.?$/i, "");
      expect(findSymbolsRobust(`Apa dampak kenaikan harga ke ${name}?`, symbols), name).toContain(company.symbol);
    }
  });

  it("a nickel question about INCO and TINS is answered from an event that reaches one of them", async () => {
    const question = "Apa dampak kenaikan harga nikel ke INCO dan TINS?";
    const event = matchEventForQuestion(question, events, symbols);
    expect(event?.impactLinks.some((link) => (link.symbol === "INCO" || link.symbol === "TINS") && link.direction !== "Unrelated")).toBe(true);
    const answer = await agentEngine.answerFollowUp({ question, profile });
    expect(answer.text).not.toMatch(/INCO tidak/);
  });
});

describe("P3-1 · titles the builder writes use one number format", () => {
  it("no dot decimal in a generated title or summary", () => {
    const built = events.filter((event) => /^(filing-corporate|commodity|flows|sentiment)-/.test(event.id));
    expect(built.length).toBeGreaterThan(0);
    for (const event of built) {
      expect(event.title, event.id).not.toMatch(/\d\.\d{1,2}(?!\d)/);
      expect(event.summary, event.id).not.toMatch(/\d\.\d{1,2}(?!\d)/);
    }
  });
});

describe("P3-4 · /impact without a company opens a case", () => {
  it("defaults to the first analysed watchlist symbol, and keeps a requested one", () => {
    // The QA reader's watchlist began with an emiten that has no case.
    const uncovered = symbols.find((symbol) => !coverageInfo[symbol]?.analyzed)!;
    const watchlist = [uncovered, ...profile.watchlist.filter((symbol) => symbol !== uncovered)];
    const fallback = defaultImpactSymbol(watchlist, undefined);
    expect(coverageInfo[fallback]?.analyzed, fallback).toBe(true);
    expect(defaultImpactSymbol(watchlist, "NOPE" as SymbolCode)).toBe(fallback);
    expect(defaultImpactSymbol(watchlist, uncovered)).toBe(uncovered);
  });
});

describe("routing · a question naming one issuer is never answered from another's event", () => {
  it("berapa volume ADRO terbaru? stays on ADRO", async () => {
    const question = "berapa volume ADRO terbaru?";
    const event = matchEventForQuestion(question, events, symbols);
    if (event) expect(event.impactLinks.some((link) => link.symbol === "ADRO")).toBe(true);
    const answer = await agentEngine.answerFollowUp({ question, profile });
    expect(answer.text).not.toContain("BBCA");
    for (const citation of answer.citations) {
      const cited = eventByCitation.get(citation.id);
      if (cited) expect(cited.impactLinks.some((link) => link.symbol === "ADRO"), citation.id).toBe(true);
    }
  });

  it("the same holds for every issuer: an overlap match reaches the issuer named", () => {
    for (const symbol of symbols) {
      const event = matchEventForQuestion(`berapa volume ${symbol} terbaru?`, events, symbols);
      if (event) expect(event.impactLinks.some((link) => link.symbol === symbol && link.direction !== "Unrelated"), `${symbol} → ${event.title}`).toBe(true);
    }
  });
});

describe("P2-1 · a link to an issuer names its destination, never the redirect route", () => {
  const sources = ["app", "components", "lib"].flatMap((dir) =>
    readdirSync(dir, { recursive: true, encoding: "utf8" })
      .filter((file) => /\.tsx?$/.test(file))
      .map((file) => join(dir, file)),
  );

  it("an issuer without a case links straight to its impact map; one with a case, to the case", () => {
    for (const company of companies) {
      expect(companyHref(company.symbol), company.symbol).toBe(company.analyzed ? `/cases/${company.symbol}` : `/impact?company=${company.symbol}`);
    }
    expect(companies.some((company) => !company.analyzed)).toBe(true);
  });

  it("no page or component links into /companies/[symbol], whose only job is a server redirect", () => {
    for (const file of sources) {
      expect(readFileSync(file, "utf8"), file).not.toMatch(/href=\{`\/companies\/\$\{|["'`]\/companies\/\$\{/);
    }
  });
});
