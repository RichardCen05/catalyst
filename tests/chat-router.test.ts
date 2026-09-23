import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";
import { explainMetric, glossField, matchFieldName, matchMetric } from "@/lib/agent/explain";
import { extractNumerals } from "@/lib/agent/llm/verify";

vi.mock("@/lib/agent/llm/answer", () => ({
  composeAnswerWithLlm: vi.fn(),
}));

const { composeAnswerWithLlm } = await import("@/lib/agent/llm/answer");
const mockCompose = composeAnswerWithLlm as ReturnType<typeof vi.fn>;

const profile = demoProfiles[0];
const ask = (question: string, contextSymbol?: "ANTM") =>
  agentEngine.answerFollowUp({ question, profile, ...(contextSymbol ? { contextSymbol } : {}) });

async function antm() {
  const analysis = await agentEngine.analyzeCompany("ANTM", profile);
  if (!analysis) throw new Error("ANTM case is recorded");
  return analysis;
}

beforeEach(() => {
  vi.clearAllMocks();
  delete process.env.AGENT_MODE;
});

describe("routing tidak lagi bergantung pada bahasa Indonesia", () => {
  // Every phrase list used to be Indonesian only, so an English question fell
  // through to the why-listed catch-all and the model answered "tidak ada
  // informasi mengenai apa itu HHI" about a figure printed on the page.
  it("pertanyaan Inggris tentang arti dan asal angka sampai ke penjelasan", async () => {
    for (const question of ["what is HHI", "what is hhi and where we get it from", "where does 27,5% come from", "how do you calculate HHI"]) {
      const answer = await ask(question, "ANTM");
      expect(["explain", "provenance"], question).toContain(answer.intent);
      expect(answer.text, question).not.toMatch(/tidak ada informasi/i);
    }
  });

  it("pertanyaan Inggris tentang data yang belum ada tetap ke intent missing", async () => {
    const answer = await ask("what data is missing for ANTM");
    expect(answer.intent).toBe("missing");
  });

  it("vs dan compare memicu perbandingan", async () => {
    for (const question of ["ANTM vs BBCA", "compare ANTM and BBCA"]) {
      const answer = await ask(question);
      expect(answer.intent, question).toBe("compare");
    }
  });
});

describe("jawaban menjelaskan angkanya, bukan endpoint-nya", () => {
  it("menyebut arti, rekaman dalam bahasa manusia, lalu cara hitung", async () => {
    const answer = await ask("apa itu HHI", "ANTM");
    expect(answer.text).toContain("Arti angka ini:");
    expect(answer.text).toContain("Dibaca dari 1 rekaman: Ringkasan broker ANTM");
    expect(answer.text).toContain("nilai beli (rupiah)");
    expect(answer.text).toContain("Cara hitung: HHI = Σ (porsi nilai beli tiap broker)²");
  });

  it("tetap membawa endpoint sebagai rincian teknis", async () => {
    // Ask with the figure the pillar actually prints. A typed one is a
    // recorded share that moves with the broker window, and once it no longer
    // matches anything on the page the router correctly answers "which number
    // do you mean?" — so the test stopped exercising the endpoint line at all.
    const share = (await antm()).pillars
      .flatMap((pillar) => pillar.metrics ?? [])
      .find((metric) => metric.label === "Porsi peserta teratas");
    if (!share) throw new Error("ANTM case is recorded with a top-participant share");
    const answer = await ask(`dari mana ${share.value}`, "ANTM");
    expect(answer.text).toContain("Rincian teknis untuk diperiksa: /v2/broker-summary/ANTM/top/");
  });

  it("tidak pernah mengutip rumus milik metrik lain", async () => {
    // The sector return used to be explained with the residual formula,
    // which would send a reader off to recompute the wrong thing.
    const analysis = await antm();
    const momentum = analysis.pillars.find((pillar) => pillar.key === "momentum")!;
    const sector = momentum.metrics.find((metric) => metric.label === "Imbal hasil sektor")!;
    const text = explainMetric(momentum, sector);
    expect(text).toContain("Σ (imbal hasil 3 hari emiten sektor × kapitalisasi pasarnya)");
    expect(text).not.toContain("residual");
  });

  it("tidak menempelkan substitusi metrik lain", async () => {
    const answer = await ask("apa itu HHI", "ANTM");
    const line = answer.text.split("\n").find((row) => row.startsWith("Angka yang dimasukkan"));
    expect(line).toBeDefined();
    expect(line).toContain("HHI =");
    expect(line).not.toContain("saham publik =");
  });

  it("mengaku ketika sebuah angka memang tidak dihitung", async () => {
    const answer = await ask("volume terbaru dari mana", "ANTM");
    expect(answer.text).toContain("dibaca langsung dari rekaman");
  });
});

describe("pencocokan angka memaafkan cara pembaca menyebutnya", () => {
  it("alias Inggris dan sebutan pendek menemukan metrik yang benar", async () => {
    const pillars = (await antm()).pillars;
    for (const [question, label] of [
      ["free float dari mana", "Saham publik terserap"],
      ["top broker share?", "Porsi peserta teratas"],
      ["sector return source", "Imbal hasil sektor"],
      ["robust z", "Skor z tahan pencilan"],
      ["arus asing", "Porsi asing"],
    ] as const) {
      expect(matchMetric(pillars, question, extractNumerals)?.metric.label, question).toBe(label);
    }
  });

  it("nama metrik sendirian sudah cukup untuk dijelaskan", async () => {
    // Read the value off the pillar rather than typing it: HHI is a ratio of
    // recorded broker buy values and moves whenever the broker window does.
    const hhi = (await antm()).pillars
      .flatMap((pillar) => pillar.metrics ?? [])
      .find((metric) => metric.label === "HHI");
    if (!hhi) throw new Error("ANTM case is recorded with an HHI metric");
    const answer = await ask("hhi", "ANTM");
    expect(answer.intent).toBe("explain");
    expect(answer.text).toContain(`HHI: ${hhi.value}`);
  });
});

describe("pertanyaan yang tidak menyebut angka dijawab jujur", () => {
  it("pertanyaan sumber sekaligus dijawab daftar rekaman, bukan daftar endpoint", async () => {
    const answer = await ask("apa sumber datamu", "ANTM");
    expect(answer.text).toContain("rekaman:");
    expect(answer.text).toContain("Ringkasan broker ANTM");
    // The endpoints still travel, but after the plain list, not instead of it.
    expect(answer.text.indexOf("Ringkasan broker ANTM")).toBeLessThan(answer.text.indexOf("/v2/"));
  });

  it("nama kolom dijelaskan sebagai kolom", async () => {
    const answer = await ask("what is buy_idr", "ANTM");
    expect(answer.text).toContain("buy_idr adalah nilai beli (rupiah)");
  });

  it("omong kosong di halaman kasus tidak memicu ringkasan kasus", async () => {
    // `contextSymbol` is not a question. "asdfgh" used to return the full
    // why-listed summary, revenue figures and all.
    const answer = await ask("asdfgh", "ANTM");
    expect(answer.intent).toBe("unknown");
    expect(answer.text).not.toContain("62.71");
    expect(answer.text).toContain("bisa menjawab");
  });
});

describe("perbandingan dan peristiwa tidak mengarang cakupan", () => {
  it("menolak perbandingan ketika satu sisi tidak punya kasus lengkap", async () => {
    const answer = await ask("ANTM vs INCO");
    expect(answer.intent).toBe("compare");
    expect(answer.text).toContain("INCO belum punya kasus lengkap");
    expect(answer.text).toContain("ANTM");
  });

  it("tidak menjawab dengan peristiwa sembarang ketika tidak ada yang cocok", async () => {
    const answer = await ask("apa dampak peristiwa xyzzy pada emiten yang tidak dipantau");
    if (answer.intent === "event-impact") {
      expect(answer.text).toMatch(/Tidak ada peristiwa terekam yang cocok|Peristiwa:/);
    }
  });
});

describe("jawaban asal angka tetap deterministik", () => {
  it("mode llm tidak menyentuh penjelasan angka", async () => {
    process.env.AGENT_MODE = "llm";
    try {
      const answer = await ask("apa itu HHI", "ANTM");
      expect(answer.intent).toBe("explain");
      expect(mockCompose).not.toHaveBeenCalled();
    } finally {
      delete process.env.AGENT_MODE;
    }
  });
});

describe("kamus kolom", () => {
  it("menerjemahkan daftar field apa adanya", () => {
    expect(glossField("broker_code, buy_idr, sell_idr, net_idr")).toBe("kode broker, nilai beli (rupiah), nilai jual (rupiah), nilai beli bersih (rupiah)");
    expect(glossField("date, net_foreign_inflow")).toBe("tanggal, arus asing bersih harian");
  });

  it("membiarkan kolom tak dikenal apa adanya, bukan mengarang arti", () => {
    expect(glossField("kolom_yang_tidak_ada")).toBe("kolom_yang_tidak_ada");
    expect(matchFieldName("apa itu kolom_yang_tidak_ada")).toBeUndefined();
  });
});
