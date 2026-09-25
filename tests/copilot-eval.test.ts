import { afterAll, beforeAll, beforeEach, describe, expect, it, vi } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { companies, coverageInfo, demoProfiles } from "@/lib/data/fixtures";
import { groundingViolation } from "@/lib/agent/llm/verify";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";
import { uiLabel } from "@/lib/ui-labels";
import type { AnalysisCase, ChatAnswer, ChatRequest, InvestorResearchPlaybook, SymbolCode } from "@/lib/types";

vi.mock("@/lib/agent/llm/answer", () => ({
  composeAnswerWithLlm: vi.fn(),
}));

const { composeAnswerWithLlm } = await import("@/lib/agent/llm/answer");
const mockCompose = composeAnswerWithLlm as ReturnType<typeof vi.fn>;

/**
 * Eval set T1–T13 from the chat-quality report of 25 Sep 2026.
 *
 * Each case is a question a reader asked on the live panel and the kind of
 * answer it should have got. Expected content is read off the case the
 * engine builds, never typed, so a data refresh moves the expectations with
 * the recordings instead of quietly keeping them green.
 *
 * The subject is the analysed issuer whose evidence is mixed — the case the
 * report was written about — so the attribution, status and falsifier
 * questions have a conflict to explain. Runs with the model layer off: the
 * routing and the material are what is checked here, and the material is
 * what the model rewrites and the verifier checks the rewrite against.
 */

const profile = demoProfiles[0];
const analysed = companies.filter((company) => coverageInfo[company.symbol]?.analyzed).map((company) => company.symbol);

let S: SymbolCode;
let other: SymbolCode;
let subject: AnalysisCase;
let comparison: AnalysisCase;

const ask = (question: string, extra: Partial<ChatRequest> = {}) =>
  agentEngine.answerFollowUp({ question, profile, ...extra }) as Promise<ChatAnswer>;

const lower = (value: string) => value.toLowerCase();

beforeAll(async () => {
  const cases = (await Promise.all(analysed.map((symbol) => agentEngine.analyzeCompany(symbol, profile))))
    .filter((item): item is AnalysisCase => Boolean(item));
  subject = cases.find((item) => item.evidenceState === "Mixed Evidence") ?? cases[0];
  comparison = cases.find((item) => item.company.symbol !== subject.company.symbol)!;
  S = subject.company.symbol;
  other = comparison.company.symbol;
});

const previousRetrieval = process.env.COPILOT_RETRIEVAL;
beforeAll(() => { process.env.COPILOT_RETRIEVAL = "on"; });
afterAll(() => { process.env.COPILOT_RETRIEVAL = previousRetrieval; });

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AGENT_MODE;
});

describe("eval T1–T13: pertanyaan kasus sampai ke kasusnya", () => {
  it("T1 penyebab turun dijawab dari kasus, bukan glosarium sektor", async () => {
    const answer = await ask(`Harga ${S} turun karena berita arbitrase atau cuma ikut sektor?`);
    expect(answer.intent).toBe("attribution");
    const momentum = subject.pillars.find((item) => item.key === "momentum")!;
    const catalyst = subject.pillars.find((item) => item.key === "catalyst")!;
    expect(answer.text).toContain(uiLabel(subject.evidenceState));
    expect(answer.text).toContain(uiLabel(momentum.status));
    expect(answer.text).toContain(uiLabel(catalyst.status));
    expect(answer.text).toContain(subject.materialChange.baseline);
    expect(answer.text).toContain(subject.researchDisposition.label);
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it("T2 pembatal dugaan dibaca dari bukti penyangkal, bukan tombol Pantau", async () => {
    const answer = await ask(`Apa yang bisa membatalkan dugaan bahwa arbitrase menekan ${S}?`);
    expect(answer.intent).toBe("falsifier");
    for (const line of subject.counterEvidence) expect(answer.text).toContain(line.replace(/\.$/, ""));
    expect(answer.text).toContain(subject.researchDisposition.monitorObservable.replace(/\.$/, ""));
    expect(answer.entryIds ?? []).not.toContainEqual(expect.stringMatching(/^chrome:/));
  });

  it("T3 status bercampur dijelaskan per lapisan bukti", async () => {
    const answer = await ask(`Kenapa ${S} buktinya bercampur?`);
    expect(answer.intent).toBe("case-status");
    expect(answer.text).toContain(uiLabel(subject.evidenceState));
    for (const layer of subject.evidenceLayers) expect(answer.text).toContain(layer.label);
    expect(answer.text).not.toContain(`${S}: ${S}`);
  });

  it("T4 data yang belum ada menyebut batas rekaman dan indikator yang belum diuji", async () => {
    const answer = await ask(`Data apa yang belum ada untuk ${S}?`);
    expect(answer.intent).toBe("missing");
    for (const line of subject.missingEvidence) expect(answer.text).toContain(line);
    for (const impact of subject.businessImpact.filter((item) => item.status === "Open")) {
      expect(answer.text).toContain(lower(impact.label));
    }
  });

  it("T5 asal angka tetap format glosarium", async () => {
    const metric = subject.pillars.flatMap((item) => item.metrics).find((item) => /asing/i.test(item.label))!;
    const answer = await ask(`${metric.label} ${S} ${metric.value} itu dari mana?`);
    expect(["provenance", "explain"]).toContain(answer.intent);
    expect(answer.text).toContain(metric.value);
  });

  it("T6 perbandingan mencakup status, tindakan, pemicu, dan semua pilar", async () => {
    const answer = await ask(`Bandingkan ${S} dan ${other}`);
    expect(answer.intent).toBe("compare");
    for (const item of [subject, comparison]) {
      expect(answer.text).toContain(uiLabel(item.evidenceState));
      expect(answer.text).toContain(item.researchDisposition.label);
      for (const pillar of item.pillars) expect(answer.text).toContain(`${item.company.symbol} ${pillar.label}`);
    }
  });

  it("T7 lanjutan tanpa nama emiten tetap pada emiten giliran sebelumnya", async () => {
    const answer = await ask("Kalau begitu, indikator apa yang harus saya pantau?", {
      history: [
        { role: "user", text: `Kenapa ${S} buktinya bercampur?` },
        { role: "assistant", text: uiLabel(subject.evidenceState), symbols: [S] },
      ],
    });
    expect(answer.intent).toBe("falsifier");
    expect(answer.relatedSymbols).toEqual([S]);
    expect(answer.text).toContain(subject.researchDisposition.monitorObservable.replace(/\.$/, ""));
  });

  it("T8 aturan saya: Playbook kosong dikatakan kosong, urutan pilar mengikuti profil", async () => {
    const answer = await ask(`Sesuai aturan saya, apa yang harus dicek dulu untuk ${S}?`);
    expect(answer.intent).toBe("playbook");
    expect(answer.text).toContain("Playbook");
    const first = subject.pillars.find((item) => item.key === profile.config.pillarOrder[0])!;
    expect(answer.text).toContain(first.label);
  });

  it("T8 aturan saya: aturan yang ditulis dikutip apa adanya", async () => {
    const playbook: InvestorResearchPlaybook = {
      preferredComparables: {}, materialityRules: [], knownExposures: [], trustedSources: [],
      thesisAssumptions: ["asumsi uji eval"], falsifiers: ["pembatal uji eval"],
    };
    const answer = await ask(`Sesuai aturan saya, apa yang harus dicek dulu untuk ${S}?`, { playbook });
    expect(answer.intent).toBe("playbook");
    expect(answer.text).toContain("pembatal uji eval");
    expect(answer.text).toContain("asumsi uji eval");
    expect(answer.text.indexOf("pembatal uji eval")).toBeLessThan(answer.text.indexOf("asumsi uji eval"));
  });

  it("T9 dan T10 nasihat transaksi dan target harga tetap ditolak", async () => {
    for (const question of [`Jadi ${S} sebaiknya saya jual sekarang?`, `Target harga ${S} berapa?`]) {
      const answer = await ask(question);
      expect(answer.intent, question).toBe("advice");
    }
  });

  it("T11 pertanyaan Inggris sampai ke materi yang sama dengan T3", async () => {
    const english = await ask(`Why is the ${S} evidence mixed?`);
    const indonesian = await ask(`Kenapa ${S} buktinya bercampur?`);
    expect(english.intent).toBe("case-status");
    expect(english.text).toBe(indonesian.text);
  });

  it("T12 penyebab tanpa emiten meminta klarifikasi", async () => {
    const answer = await ask("Kenapa turun?");
    expect(answer.intent).toBe("clarify");
  });

  it("T13 tanya jalur menjelaskan simpul peta dengan tautan dan bukti penyangkalnya", async () => {
    const graph = await agentEngine.buildCausalGraph(S, profile, { scope: "market", minRelevance: DEFAULT_THRESHOLDS.chainRelevanceFloor });
    const node = graph!.nodes.find((item) => item.kind === "source")!;
    const answer = await ask(`Jelaskan jalur ${node.label} untuk ${S}.`);
    expect(answer.intent).toBe("causal-path");
    expect(answer.text).toContain(node.label);
    expect(answer.text).toContain(node.counterEvidence.replace(/\.$/, ""));
    expect(answer.citations.length).toBeGreaterThan(0);
  });
});

describe("eval: siapa yang menulis kalimatnya", () => {
  it("model mati: generator deterministic dengan alasan", async () => {
    const answer = await ask(`Kenapa ${S} buktinya bercampur?`);
    expect(answer.generator).toBe("deterministic");
    expect(answer.fallbackReason).toBeTruthy();
  });

  it("model menulis: generator llm", async () => {
    process.env.AGENT_MODE = "llm";
    mockCompose.mockResolvedValue({ text: `${S} ${uiLabel(subject.evidenceState)}.` });
    const answer = await ask(`Kenapa ${S} buktinya bercampur?`);
    expect(answer.generator).toBe("llm");
  });

  it("draf ditolak: jawaban kembali ke materi dan alasannya tercatat", async () => {
    process.env.AGENT_MODE = "llm";
    mockCompose.mockRejectedValue(new Error("verifier rejected draft"));
    const answer = await ask(`Kenapa ${S} buktinya bercampur?`);
    expect(answer.generator).toBe("deterministic");
    expect(answer.fallbackReason).toContain("verifier rejected draft");
    expect(answer.text).toContain(uiLabel(subject.evidenceState));
  });
});

describe("eval: jawaban meta ditolak verifier", () => {
  it("mendeskripsikan ringkasan ditolak, menyebut isinya lolos", () => {
    const evidence = `Status bukti ${S}: ${uiLabel(subject.evidenceState)}. ${subject.thesis}`;
    expect(groundingViolation("Informasi yang tersedia memuat beberapa hal tentang emiten ini.", evidence, [])).toBeTruthy();
    expect(groundingViolation(evidence, evidence, [])).toBeNull();
  });
});
