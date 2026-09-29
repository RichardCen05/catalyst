import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { deriveEvidenceState, MARKET_UNCONFIRMED, marketConfirms } from "@/lib/agent/evidence-state";
import { buildEventBundle } from "@/lib/agent/retrieval/context/event";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { companies, coverageInfo, demoProfiles, events, isStaleReading } from "@/lib/data/fixtures";
import { materialityNote } from "@/lib/materiality-note";
import { buildDefaultPlaybook } from "@/lib/playbook-defaults";
import { STALE_READING_LABEL } from "@/lib/ui-labels";
import { displayText } from "@/lib/utils";
import { bandForArticle } from "@/lib/web-watch/figure-band";
import { applyVerdicts, emptyQueue, normalizeQueue, QUARANTINE_CHECKS, SCREEN_VERDICT_CHECKS, type ReviewQueue, type TriageProposal } from "@/lib/web-watch/queue";
import { repairStoredEvent } from "@/lib/web-watch/stored-fields";
import type { MarketEvent, SymbolCode } from "@/lib/types";

/**
 * The QA findings still open after the 28 Sep retest on prod rev 00095, one
 * describe per finding. Written before the fixes, so each one failed first.
 */
const profile = demoProfiles[0];
const analysed = companies.map((company) => company.symbol).filter((symbol) => coverageInfo[symbol]?.analyzed) as SymbolCode[];
const source = (path: string) => readFileSync(join(process.cwd(), path), "utf8");

/** Two BI press releases as prod stored them on 29 Sep: one under the site's
 *  whole menu, one under a short run of page labels, both with the page's
 *  footer, and the model's proposals for them. */
const stored = JSON.parse(source("tests/fixtures/web-watch/bi-stored-2026-09-29.json")) as Record<string, { event: MarketEvent; proposal: TriageProposal }>;
const menuPage = stored["web-src-bi-news-25d2b0fc"];
const labelPage = stored["web-src-bi-news-2d389157"];

describe("P1-5 · a case is not 'Bukti selaras' when no market pillar confirms it", () => {
  const base = { conflict: false, timingAgainst: false, catalystDirection: "Supported" as const, anyAdverse: false, recorded: "Corroborated" as const };

  it("normal volume and a sector-led move leave the market unconfirmed", () => {
    expect(marketConfirms("Normal", "Sector-led")).toBe(false);
    expect(marketConfirms("Normal", "Market-aligned")).toBe(false);
    expect(marketConfirms("Elevated", "Sector-led")).toBe(true);
    expect(marketConfirms("Normal", "Idiosyncratic")).toBe(true);
  });

  it("the recorded state cannot stand as corroborated without the market", () => {
    expect(deriveEvidenceState({ ...base, volume: "Normal", momentum: "Sector-led" })).toBe("Mixed Evidence");
    expect(deriveEvidenceState({ ...base, volume: "Extreme", momentum: "Sector-led" })).toBe("Corroborated");
  });

  it("the earlier rules still win: conflict, timing, missing data", () => {
    expect(deriveEvidenceState({ ...base, volume: "Elevated", momentum: "Idiosyncratic", timingAgainst: true })).toBe("Mixed Evidence");
    expect(deriveEvidenceState({ ...base, volume: "Insufficient Data", momentum: "Idiosyncratic" })).toBe("Insufficient Evidence");
  });

  it("every case the recordings hold follows the rule, names the gap, and is not escalated", async () => {
    for (const symbol of analysed) {
      const analysis = (await agentEngine.analyzeCompany(symbol, profile))!;
      const volume = analysis.pillars.find((pillar) => pillar.key === "volume")!;
      const momentum = analysis.pillars.find((pillar) => pillar.key === "momentum")!;
      if (marketConfirms(volume.status as never, momentum.status as never)) continue;
      expect(analysis.evidenceState, symbol).not.toBe("Corroborated");
      expect(analysis.researchDisposition.kind, symbol).not.toBe("escalate");
      if (volume.status !== "Insufficient Data") expect(analysis.contradictions, symbol).toContain(MARKET_UNCONFIRMED);
    }
  });
});

describe("P2-7 · a BI page is read as its press release, and a seminar is not 'Sedang'", () => {
  const minWords = resolveThresholds().webWatchHeadlineMinWords;

  it("drops the site menu even when a menu line reads like a sentence", () => {
    const repaired = repairStoredEvent(menuPage.event, minWords);
    expect(repaired.body).toContain("Transformasi ekonomi dan keuangan digital (EKD) perlu terus diakselerasi");
    expect(repaired.body!.split("\n")[0]).toBe(menuPage.event.title);
    for (const chrome of ["Informasi seputar organisasi", "Fungsi Utama", "Indikator Moneter", "Recent Currently selected"]) {
      expect(repaired.body, chrome).not.toContain(chrome);
      expect(repaired.summary, chrome).not.toContain(chrome);
    }
  });

  it("drops the page footer after the last paragraph", () => {
    for (const page of [menuPage, labelPage]) {
      const repaired = repairStoredEvent(page.event, minWords);
      for (const chrome of ["Apakah halaman ini bermanfaat?", "Baca Juga", "Lampiran 10", "Halaman ini terakhir"]) {
        expect(repaired.body, `${page.event.id} ${chrome}`).not.toContain(chrome);
      }
    }
    expect(repairStoredEvent(labelPage.event, minWords).body).toContain("Sejalan dengan semangat FEKDI x IFSE 2026");
  });

  it("a proposal that quotes no figure from its article stays at the lowest band", () => {
    const article = `${menuPage.event.title}\n${menuPage.event.body}`;
    for (const impact of menuPage.proposal.impacts) {
      expect(bandForArticle(impact.band, article, `${impact.path} ${impact.rationale}`), impact.symbol).toBe("low");
    }
  });

  it("a proposal keeps its band only for a figure its article states", () => {
    const article = "BI-Rate turun 25 bps menjadi 5,75% pada rapat dewan gubernur.";
    expect(bandForArticle("high", article, "Penurunan BI-Rate ke 5,75% menekan biaya dana bank.")).toBe("high");
    expect(bandForArticle("high", article, "Kredit tumbuh 12% sehingga pendapatan bunga naik.")).toBe("low");
  });

  it("the stored seminar proposal reads 'low' when the queue loads", () => {
    const queue = normalizeQueue({ pending: [menuPage.event], proposals: { [menuPage.event.id]: menuPage.proposal } });
    for (const impact of queue.proposals[menuPage.event.id].impacts) expect(impact.band, impact.symbol).toBe("low");
  });
});

describe("P2-9 · the case list and the case header say an approved rule is not evaluated", () => {
  it("a note appears only when an approved materiality rule is recorded but not evaluated", async () => {
    const symbol = analysed[0];
    const playbook = buildDefaultPlaybook();
    const rule = `[Disetujui ${symbol}] Rilis laba tanpa lonjakan volume = materialitas sedang`;
    const withRule = (await agentEngine.analyzeCompany(symbol, profile, { playbook: { ...playbook, materialityRules: [...playbook.materialityRules, rule] } }))!;
    const without = (await agentEngine.analyzeCompany(symbol, profile, { playbook }))!;
    expect(materialityNote(withRule.priority)).toMatch(/belum dievaluasi/);
    expect(materialityNote(without.priority)).toBeNull();
  });

  it("both the list row and the case header render it", () => {
    for (const path of ["app/cases/page.tsx", "app/companies/[symbol]/company-detail-client.tsx"]) {
      expect(source(path), path).toContain("materialityNote(");
    }
  });

  it("the learning page no longer promises that a rule changes the next analysis", () => {
    expect(source("lib/learning-layers.ts")).not.toContain("Aturan yang dipakai analisis berikutnya.");
  });
});

describe("P3-1 · engine prose shows one minus sign", () => {
  it("a hyphen before a number becomes the minus sign; dates and ranges stay", () => {
    expect(displayText("Harga -1,7% sementara sektor −1,2%")).toBe("Harga −1,7% sementara sektor −1,2%");
    expect(displayText("residual (-0,4%)")).toBe("residual (−0,4%)");
    expect(displayText("-3,2% dalam 3 hari")).toBe("−3,2% dalam 3 hari");
    expect(displayText("terbit 2025-12-01, sesi 24-26")).toBe("terbit 2025-12-01, sesi 24-26");
    expect(displayText("Non-USD/IDR")).toBe("Non-USD/IDR");
  });

  it("every case's shown text carries no hyphen minus", async () => {
    for (const symbol of analysed) {
      const analysis = (await agentEngine.analyzeCompany(symbol, profile))!;
      const shown = [analysis.materialChange.baseline, analysis.priority.reason, ...analysis.contradictions, ...analysis.counterEvidence].map(displayText);
      for (const line of shown) expect(line, symbol).not.toMatch(/(^|[\s(])-\d/);
    }
  });

  it("the screens that print engine prose pass it through displayText", () => {
    for (const path of [
      "app/cases/page.tsx",
      "components/case-verdict.tsx",
      "components/market-causal-map.tsx",
      "components/causal-chain.tsx",
      "components/research-case-workspace.tsx",
      "components/evidence-card.tsx",
      "components/competing-hypotheses.tsx",
    ]) {
      expect(source(path), path).toContain("displayText(");
    }
  });
});

describe("P2-3 · the assistant labels a stale commodity reading and gives it no direction", () => {
  const stale = events.filter(isStaleReading);

  it("the recordings still hold such a reading", () => {
    expect(stale.length).toBeGreaterThan(0);
  });

  it("the event bundle says the reading is stale and states no direction for it", async () => {
    for (const event of stale) {
      const bundle = await buildEventBundle(event.id);
      expect(bundle.body, event.id).toContain(STALE_READING_LABEL);
      for (const link of event.impactLinks) {
        expect(bundle.body, event.id).not.toMatch(new RegExp(`${link.symbol}: (Mendukung|Berlawanan|Bercampur)`));
      }
    }
  });

  it("the stale map badge and the bundle use the same words", () => {
    expect(source("components/stale-reading.tsx")).toContain("STALE_READING_LABEL");
  });

  it("'Berapa harga emas sekarang?' labels the reading it cites", async () => {
    const answer = await agentEngine.answerFollowUp({ question: "Berapa harga emas sekarang?", profile, contextSymbol: "ANTM" as SymbolCode });
    const cited = stale.filter((event) => answer.text.includes(event.title));
    expect(cited.length).toBeGreaterThan(0);
    for (const event of cited) {
      const paragraph = answer.text.split("\n\n").find((part) => part.includes(event.title))!;
      expect(paragraph).toContain(STALE_READING_LABEL);
      expect(paragraph).not.toMatch(/ANTM: Mendukung/);
    }
  });
});

describe("P0-3 · an article that reports a rumor and its denial goes to the Rumor tab", () => {
  const NOW = "2026-09-29T00:00:00.000Z";
  const article: MarketEvent = {
    id: "web-src-katadata-rumor",
    title: "BCA (BBCA) Bantah Bakal Diakuisisi",
    summary: "Manajemen membantah kabar akuisisi yang beredar di pasar.",
    body: "Manajemen membantah kabar akuisisi yang beredar di pasar.",
    category: "company",
    sourceType: "macro",
    publishedAt: NOW,
    asOf: NOW,
    sector: "Financials",
    impactLinks: [],
    citations: [],
  };

  it("the screen may post the check, and it quarantines", () => {
    expect(SCREEN_VERDICT_CHECKS).toContain("rumor-answered");
    expect(QUARANTINE_CHECKS.has("rumor-answered")).toBe(true);
    const queue: ReviewQueue = { ...emptyQueue, pending: [article] };
    const { next, quarantined } = applyVerdicts(queue, [{ candidateId: article.id, verdict: "reject", check: "rumor-answered", reason: "memberitakan rumor dan tanggapan resmi (p=0.99)", span: "membantah kabar", score: 0.99 }], NOW, 20);
    expect(quarantined).toEqual([article.id]);
    expect(next.suspected[article.id].check).toBe("rumor-answered");
    expect(next.pending.map((event) => event.id)).not.toContain(article.id);
  });

  it("the decide route takes its check list from the queue", () => {
    expect(source("app/api/internal/web-watch-decide/route.ts")).toContain("SCREEN_VERDICT_CHECKS");
  });

  it("the Rumor tab names the kind of item", () => {
    expect(source("components/web-watch-review.tsx")).toMatch(/"rumor-answered":\s*"memberitakan rumor \+ bantahan"/);
  });
});

describe("Item 10 · a 👍/👎 says it only reorders the case list", () => {
  it("the feedback control says what it changes and what it leaves alone", () => {
    const text = source("components/evidence-feedback.tsx");
    expect(text).toContain("Hanya mengubah urutan");
    expect(text).toContain("tidak berubah");
  });
});
