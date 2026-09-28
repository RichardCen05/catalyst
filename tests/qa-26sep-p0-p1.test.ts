import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { findSymbolsRobust } from "@/lib/agent/query";
import { companies, coverageInfo, demoProfiles } from "@/lib/data/fixtures";
import { SYMBOL_CODES } from "@/lib/data/symbols.generated";
import { buildDefaultPlaybook } from "@/lib/playbook-defaults";
import { verifyExposureDraft } from "@/lib/web-watch/proposals";
import { repairStoredEvent } from "@/lib/web-watch/stored-fields";
import type { HistoryTurn } from "@/lib/agent/retrieval/types";
import type { ChatAnswer, MarketEvent, SymbolCode } from "@/lib/types";

/**
 * The P0 and P1 findings of the 26 Sep 2026 end-to-end QA pass (DeepSeek on
 * Cloud Run), each replayed with the steps the report lists and checked
 * against the report's "Harapan". The questions are the report's own words.
 *
 * Runs with the model off, so what is checked is the routing and the
 * material a handler hands the model: the wrong handler was the failure in
 * every assistant finding, and no rewrite can repair an answer built from
 * the wrong case.
 */

const profile = demoProfiles[0];
/** The panel always sends the reader's Playbook; the default one names
 *  exposures for every watchlist emiten. */
const playbook = buildDefaultPlaybook();
const symbols = [...SYMBOL_CODES] as SymbolCode[];

/** The panel's loop: history carries each turn's symbols, and the chip
 *  follows a symbol the answer bound, exactly as `components/copilot.tsx`. */
async function converse(questions: string[], chip?: SymbolCode): Promise<Array<ChatAnswer & { chip?: SymbolCode }>> {
  const history: HistoryTurn[] = [];
  const answers: Array<ChatAnswer & { chip?: SymbolCode }> = [];
  let bound = chip;
  for (const question of questions) {
    const answer = await agentEngine.answerFollowUp({ question, profile, playbook, contextSymbol: bound, history: [...history] });
    answers.push({ ...answer, chip: bound });
    history.push({ role: "user", text: question });
    history.push({ role: "assistant", text: answer.text, ...(answer.relatedSymbols?.length ? { symbols: answer.relatedSymbols } : {}) });
    if (answer.questionSymbol && answer.questionSymbol !== bound) bound = answer.questionSymbol;
  }
  return answers;
}

/** A symbol other than `subject` that an answer bound or put on screen. */
function strayed(answer: ChatAnswer, subject: SymbolCode): SymbolCode[] {
  return [...(answer.relatedSymbols ?? []), ...(answer.questionSymbol ? [answer.questionSymbol] : [])].filter((symbol) => symbol !== subject);
}

describe("QA 26 Sep — asisten", () => {
  const previous = process.env.COPILOT_RETRIEVAL;
  beforeAll(() => { process.env.COPILOT_RETRIEVAL = "on"; });
  afterAll(() => { process.env.COPILOT_RETRIEVAL = previous; });

  describe("P0-1 follow-up pembatal tanpa kode saham", () => {
    it("ID: menjawab pembatal kasus ANTM, bukan sistem Pantau", async () => {
      const [, followUp] = await converse(["Kenapa ANTM masuk daftar hari ini?", "Kalau begitu, bukti apa yang akan membatalkan hipotesis itu?"]);
      expect(followUp.intent).toBe("falsifier");
      expect(followUp.relatedSymbols).toEqual(["ANTM"]);
      expect(strayed(followUp, "ANTM")).toEqual([]);
      expect(followUp.text).not.toMatch(/penyaring|auto-accept/i);
      expect(followUp.citations.length).toBeGreaterThan(0);
    });

    it("EN: 'And what would prove that wrong?' menjawab pembatal kasus PGAS", async () => {
      const [first, followUp] = await converse(["Why did PGAS fall?", "And what would prove that wrong?"]);
      expect(first.relatedSymbols).toEqual(["PGAS"]);
      expect(followUp.intent).toBe("falsifier");
      expect(followUp.relatedSymbols).toEqual(["PGAS"]);
      expect(strayed(followUp, "PGAS")).toEqual([]);
    });

    it("kata biasa tidak dibaca sebagai salah ketik nama emiten", () => {
      // "bukti" is one transposition from "bukit" (Bukit Asam); the report's
      // hint was questionSymbol=PTBA on a question that names no issuer.
      expect(findSymbolsRobust("Kalau begitu, bukti apa yang akan membatalkan hipotesis itu?", symbols)).toEqual([]);
      expect(findSymbolsRobust("Apa bukti pembatalnya?", symbols)).toEqual([]);
      expect(findSymbolsRobust("And what would prove that wrong?", symbols)).toEqual([]);
    });
  });

  describe("P0-2 konteks kasus di panel tidak loncat", () => {
    it("panel PGAS: 'Kenapa turun?' lalu 'Apa bukti pembatalnya?' tetap PGAS", async () => {
      const answers = await converse(["Kenapa turun?", "Apa bukti pembatalnya?", "Apa yang harus diperiksa berikutnya?"], "PGAS");
      for (const answer of answers) {
        expect(answer.chip).toBe("PGAS");
        expect(strayed(answer, "PGAS")).toEqual([]);
      }
      expect(answers[1].intent).toBe("falsifier");
      expect(answers[1].text).not.toMatch(/belum bisa dipetakan|Sebut kode emiten/);
      // The Playbook lines read back are this case's, not every emiten's.
      for (const answer of answers) {
        for (const symbol of symbols.filter((code) => code !== "PGAS")) expect(answer.text).not.toMatch(new RegExp(`\\b${symbol}\\b`));
      }
    });
  });

  describe("P1-2 atribusi sektor vs berita", () => {
    const cases: Array<[string, SymbolCode]> = [
      ["Seberapa besar kenaikan ANTM yang disebabkan oleh laporan laba H1 dibanding pergerakan sektor?", "ANTM"],
      ["How much of the PGAS drop is explained by the sector versus the arbitration news?", "PGAS"],
    ];
    it.each(cases)("%s → uraian IHSG, sektor, residual", async (question, subject) => {
      const answer = await agentEngine.answerFollowUp({ question, profile });
      expect(answer.intent).toBe("attribution");
      expect(answer.relatedSymbols).toEqual([subject]);
      const analysis = await agentEngine.analyzeCompany(subject, profile);
      const momentum = analysis?.pillars.find((pillar) => pillar.key === "momentum");
      const catalyst = analysis?.pillars.find((pillar) => pillar.key === "catalyst");
      expect(momentum?.calculation).toBeDefined();
      // The split itself, as the case computes it: return − β × IHSG = residual,
      // beside the sector's own return.
      const split = answer.text.split("\n")[1] ?? "";
      expect(split).toContain(momentum!.calculation!.substitution);
      expect(split).toContain(momentum!.calculation!.result);
      // Then what the residual is not yet: a move caused by the news.
      const residual = momentum!.calculation!.result.split(" · ")[0];
      const unexplained = answer.text.split("\n")[2] ?? "";
      expect(unexplained).toContain(residual);
      expect(unexplained).toContain(catalyst!.protocol.challengingEvidence.replace(/\.$/, ""));
    });
  });

  describe("P1-3 'Bandingkan keduanya.' tanpa konteks", () => {
    it("bertanya balik singkat, tanpa salinan teks UI", async () => {
      const answer = await agentEngine.answerFollowUp({ question: "Bandingkan keduanya.", profile });
      expect(answer.intent).toBe("clarify");
      expect(answer.text.length).toBeLessThan(160);
      expect(answer.text).not.toMatch(/Judul panel|Label di dalam panel/);
    });
  });

  describe("P1-4 cakupan data emiten parsial", () => {
    it("'Data apa yang belum ada untuk ADRO?' menyebut persis baris cakupan ADRO, bersumber", async () => {
      const answer = await agentEngine.answerFollowUp({ question: "Data apa yang belum ada untuk ADRO?", profile });
      expect(answer.intent).toBe("missing");
      for (const item of coverageInfo.ADRO.missing) expect(answer.text).toContain(item);
      expect(answer.citations.length).toBeGreaterThan(0);
    });

    it("'Apa yang sebaiknya saya periksa berikutnya?' tetap pada kasus ANTM dan tidak mengarang cakupan emiten lain", async () => {
      const answers = await converse([
        "Kenapa ANTM masuk daftar hari ini?",
        "Kalau begitu, bukti apa yang akan membatalkan hipotesis itu?",
        "Apa yang sebaiknya saya periksa berikutnya?",
      ]);
      const next = answers[2];
      expect(next.intent).toBe("falsifier");
      expect(next.relatedSymbols).toEqual(["ANTM"]);
      expect(next.citations.length).toBeGreaterThan(0);
      const others = companies.map((company) => company.symbol).filter((symbol) => symbol !== "ANTM");
      for (const symbol of others) expect(next.text).not.toMatch(new RegExp(`\\b${symbol}\\b`));
    });

    it("'sebaiknya' bukan salah ketik 'sebabnya'", async () => {
      const answer = await agentEngine.answerFollowUp({ question: "Apa yang sebaiknya saya periksa berikutnya?", profile, contextSymbol: "ANTM" });
      expect(answer.intent).not.toBe("attribution");
    });

    it("EN: 'What should I check next?' dengan kasus terbuka menjawab indikator kasus itu", async () => {
      const answer = await agentEngine.answerFollowUp({ question: "What should I check next?", profile, contextSymbol: "PGAS" });
      expect(answer.intent).toBe("falsifier");
      expect(answer.relatedSymbols).toEqual(["PGAS"]);
    });
  });
});

describe("QA 26 Sep — P1-5 status kasus mengikuti uji waktu", () => {
  it("kasus yang uji waktunya menolak jalur tidak disebut 'Bukti selaras' dan tidak dinaikkan", async () => {
    for (const symbol of Object.values(coverageInfo).filter((item) => item.analyzed).map((item) => item.symbol as SymbolCode)) {
      const analysis = await agentEngine.analyzeCompany(symbol, profile);
      if (!analysis?.timing || analysis.timing.deltaSessions >= 0) continue;
      expect(analysis.evidenceState, symbol).not.toBe("Corroborated");
      expect(analysis.contradictions.join(" "), symbol).toContain(analysis.timing.note);
    }
  });
});

describe("QA 26 Sep — P1-6 usulan Pantau sesuai judul, waktu terbit sesuai artikel", () => {
  const draft = (rationale: string, direction: "Supported" | "Adverse" = "Supported") => ({
    direction,
    relevanceBand: "medium" as const,
    path: "Suku bunga acuan tetap → biaya dana bank stabil → margin bunga bersih",
    rationale,
  });
  const body = "Indeks harga saham gabungan melemah. Bank Indonesia menahan BI-Rate, suku bunga acuan tetap dan biaya dana bank stabil sehingga margin bunga bersih bank terjaga.";

  it("menolak alasan yang tidak menyentuh judul artikel", () => {
    const headline = "IHSG Parkir di Zona Hijau";
    const check = verifyExposureDraft(
      draft("Bank Indonesia menahan suku bunga acuan sehingga biaya dana bank stabil dan margin bunga bersih terjaga."),
      "BBCA", ["BBCA"], [], `${headline}\n${body}`, headline,
    );
    expect(check.approved).toBe(false);
    expect(check.violations.join(" ")).toMatch(/headline/);
  });

  it("menolak arah yang berlawanan dengan gerak yang disebut judul", () => {
    const headline = "IHSG Anjlok Lebih dari 1%";
    const check = verifyExposureDraft(
      draft("IHSG anjlok sementara Bank Indonesia menahan suku bunga acuan sehingga biaya dana bank stabil dan margin terjaga."),
      "BBRI", ["BBRI"], ["1%"], `${headline}\n${body}`, headline,
    );
    expect(check.approved).toBe(false);
    expect(check.violations.join(" ")).toMatch(/direction/);
  });

  it("tetap menerima usulan yang menjelaskan judulnya sendiri", () => {
    const headline = "BI Tahan Suku Bunga Acuan";
    const check = verifyExposureDraft(
      draft("Bank Indonesia menahan suku bunga acuan sehingga biaya dana bank stabil dan margin bunga bersih terjaga."),
      "BBRI", ["BBRI"], [], `${headline}\n${body}`, headline,
    );
    expect(check.violations).toEqual([]);
  });

  it("item tersimpan yang diberi cap waktu crawl memakai tanggal di URL artikel", () => {
    const crawl = "2026-09-24T07:10:00.000Z";
    const stored = {
      id: "web-src-qa", title: "IHSG Anjlok Lebih dari 1%", summary: "", body: "", category: "company", sourceType: "macro",
      publishedAt: crawl, asOf: crawl, sector: "Market", impactLinks: [],
      citations: [{ id: "c", provider: "contoh.id", endpoint: "web-watch", field: "body", asOf: crawl, label: "Contoh", url: "https://contoh.id/market/20260923160901-17-1/ihsg-anjlok", urlLabel: "Buka sumber asal", access: "direct" }],
    } as MarketEvent;
    expect(repairStoredEvent(stored, 3).publishedAt).toBe("2026-09-23T00:00:00+07:00");
    // A feed date that already differs from the crawl stamp is the source's own and stays.
    const dated = { ...stored, publishedAt: "2026-09-23T16:09:01+07:00" };
    expect(repairStoredEvent(dated, 3).publishedAt).toBe("2026-09-23T16:09:01+07:00");
  });
});
