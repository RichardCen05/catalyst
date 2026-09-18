import { beforeEach, describe, expect, it, vi } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { citations, demoProfiles, events } from "@/lib/data/fixtures";
import { glossField } from "@/lib/agent/explain";
import type { MetricValue, PillarResult } from "@/lib/types";

vi.mock("@/lib/agent/llm/answer", () => ({
  composeAnswerWithLlm: vi.fn(),
}));

const { composeAnswerWithLlm } = await import("@/lib/agent/llm/answer");
const mockCompose = composeAnswerWithLlm as ReturnType<typeof vi.fn>;

async function antm() {
  const analysis = await agentEngine.analyzeCompany("ANTM", demoProfiles[0]);
  if (!analysis) throw new Error("ANTM case is recorded; analyzeCompany must not return null");
  return analysis;
}

const metricOf = (pillar: PillarResult, label: string): MetricValue => {
  const metric = pillar.metrics.find((item) => item.label === label);
  if (!metric) throw new Error(`metric ${label} missing from pillar ${pillar.key}`);
  return metric;
};

const pillarOf = (pillars: PillarResult[], key: string): PillarResult => {
  const pillar = pillars.find((item) => item.key === key);
  if (!pillar) throw new Error(`pillar ${key} missing`);
  return pillar;
};

const endpointsOf = (metric: MetricValue) => metric.citations.map((citation) => citation.endpoint).sort();

describe("setiap angka membawa rekaman yang benar-benar menghasilkannya", () => {
  it("porsi peserta teratas hanya bersumber dari ringkasan broker", async () => {
    const concentration = pillarOf((await antm()).pillars, "concentration");
    expect(endpointsOf(metricOf(concentration, "Porsi peserta teratas"))).toEqual(["/v2/broker-summary/ANTM/top/"]);
    expect(endpointsOf(metricOf(concentration, "HHI"))).toEqual(["/v2/broker-summary/ANTM/top/"]);
    expect(endpointsOf(metricOf(concentration, "Peserta efektif"))).toEqual(["/v2/broker-summary/ANTM/top/"]);
  });

  it("porsi asing memakai arus asing dan nilai transaksi harian, bukan ringkasan broker", async () => {
    const concentration = pillarOf((await antm()).pillars, "concentration");
    expect(endpointsOf(metricOf(concentration, "Porsi asing"))).toEqual(["/v2/daily/ANTM/", "/v2/foreign-flow/ANTM/"]);
  });

  it("saham publik terserap memakai saham publik dan profil emiten", async () => {
    const concentration = pillarOf((await antm()).pillars, "concentration");
    expect(endpointsOf(metricOf(concentration, "Saham publik terserap"))).toEqual([
      "/v2/broker-summary/ANTM/top/",
      "/v2/company/report/ANTM/?sections=overview",
      "/v2/daily/ANTM/",
      "/v2/free-float/",
    ]);
  });

  it("imbal hasil sektor memakai emiten sektor, bukan harga ANTM atau IHSG", async () => {
    const momentum = pillarOf((await antm()).pillars, "momentum");
    expect(endpointsOf(metricOf(momentum, "Imbal hasil 3 hari"))).toEqual(["/v2/daily/ANTM/"]);
    expect(endpointsOf(metricOf(momentum, "Imbal hasil IHSG"))).toEqual(["/v2/index-daily/ihsg/"]);
    expect(endpointsOf(metricOf(momentum, "Residual setelah beta"))).toEqual(["/v2/daily/ANTM/", "/v2/index-daily/ihsg/"]);
    expect(endpointsOf(metricOf(momentum, "Imbal hasil sektor"))).toEqual([
      "/v2/company/report/{emiten sektor}/?sections=overview",
      "/v2/daily/{emiten sektor}/",
    ]);
  });

  it("tidak ada metrik yang mengklaim lebih banyak sumber daripada pilarnya", async () => {
    for (const pillar of (await antm()).pillars) {
      for (const metric of pillar.metrics) {
        expect(metric.citations.length).toBeLessThanOrEqual(pillar.citations.length);
      }
    }
  });
});

describe("registry sitasi hanya menyebut endpoint dan field yang terekam", () => {
  const all = [
    citations.daily("ANTM"), citations.overview("ANTM"), citations.broker("ANTM"), citations.registry,
    citations.foreign("ANTM"), citations.freeFloat, citations.ihsg, citations.sectorPeers("Basic Materials"),
    citations.sectorWeights("Basic Materials"), citations.news("news-1"), citations.financial("ANTM"),
    citations.filing("ANTM"), citations.external("e-1"), citations.empty("ANTM"),
  ];

  it("tidak memakai endpoint yang tidak pernah dipanggil bundel ini", () => {
    for (const citation of all) {
      expect(citation.endpoint).not.toContain("top-changes");
      expect(citation.endpoint).not.toContain("/v2/close/");
      expect(citation.endpoint).not.toContain("sections=ownership");
    }
  });

  it("setiap sitasi peristiwa juga menunjuk rekaman yang ada", () => {
    // `/v2/mining-commodities/` and `/v2/corporate-actions/` were both shorter
    // than the paths the recordings came from. A reader following either one
    // would query an endpoint this bundle never called.
    for (const event of events) {
      for (const citation of event.citations) {
        expect(citation.endpoint, event.id).not.toBe("/v2/mining-commodities/");
        expect(citation.endpoint, event.id).not.toMatch(/^\/v2\/corporate-actions\//);
      }
    }
  });

  it("ringkasan broker menunjuk view top yang menghasilkan rekaman", () => {
    expect(citations.broker("ANTM").endpoint).toBe("/v2/broker-summary/ANTM/top/");
    expect(citations.broker("ANTM").field).toBe("broker_code, buy_idr, sell_idr, net_idr");
  });

  it("nama field mengikuti respons apa adanya", () => {
    expect(citations.ihsg.field).toBe("date, price");
    expect(citations.registry.field).toBe("code, is_foreign");
    expect(citations.financial("ANTM").field).toContain("financials_sector_metrics");
  });

  it("setiap nama kolom pada sitasi punya arti, jadi tidak ada nama basi", () => {
    // `published_at` / `dimensions` survived in a second copy of the news
    // citation after the registry was corrected, and `headline,
    // exposure_tags` described keys the fixture does not have. Requiring a
    // gloss for every token catches both: a stale name has no meaning to
    // look up.
    const every = [...all, ...events.flatMap((event) => event.citations)];
    for (const citation of every) {
      for (const token of citation.field.split(",").map((part) => part.trim().replace(/\s*\(.*\)$/, "")).filter(Boolean)) {
        expect(glossField(token), `${citation.id}/${token}`).not.toBe(token);
      }
    }
  });

  it("saham publik tidak membawa tautan dokumentasi yang dikarang", () => {
    expect(citations.freeFloat.endpoint).toBe("/v2/free-float/");
    expect(citations.freeFloat.url).toBeUndefined();
  });
});

describe("pertanyaan asal angka dijawab dari sitasi angka itu", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AGENT_MODE;
  });

  it("menjawab porsi yang dikutip pembaca, bukan alasan emiten masuk daftar", async () => {
    const analysis = await antm();
    const topShare = metricOf(pillarOf(analysis.pillars, "concentration"), "Porsi peserta teratas");
    const answer = await agentEngine.answerFollowUp({
      question: `dari sumber mana saja porsi ${topShare.value}`,
      profile: demoProfiles[0],
      contextSymbol: "ANTM",
    });
    expect(answer.intent).toBe("provenance");
    expect(answer.text).toContain("Porsi peserta teratas");
    expect(answer.text).toContain("/v2/broker-summary/ANTM/top/");
    expect(answer.text).not.toContain("masuk karena");
    expect(answer.citations.map((citation) => citation.endpoint)).toEqual(["/v2/broker-summary/ANTM/top/"]);
  });

  it("mencocokkan angka meski pemisah desimalnya berbeda", async () => {
    const analysis = await antm();
    const topShare = metricOf(pillarOf(analysis.pillars, "concentration"), "Porsi peserta teratas");
    const answer = await agentEngine.answerFollowUp({
      question: `dari mana angka ${topShare.value.replace(",", ".")}`,
      profile: demoProfiles[0],
      contextSymbol: "ANTM",
    });
    expect(answer.intent).toBe("provenance");
    expect(answer.text).toContain("Porsi peserta teratas");
  });

  it("dapat dicocokkan lewat label metrik tanpa angka", async () => {
    const answer = await agentEngine.answerFollowUp({
      question: "Saham publik terserap dari sumber apa?",
      profile: demoProfiles[0],
      contextSymbol: "ANTM",
    });
    expect(answer.intent).toBe("provenance");
    expect(answer.citations.map((citation) => citation.endpoint)).toContain("/v2/free-float/");
  });

  it("tidak pernah menyerahkan jawaban asal angka ke model", async () => {
    process.env.AGENT_MODE = "llm";
    try {
      const answer = await agentEngine.answerFollowUp({
        question: "dari sumber mana saja HHI",
        profile: demoProfiles[0],
        contextSymbol: "ANTM",
      });
      expect(answer.intent).toBe("provenance");
      expect(mockCompose).not.toHaveBeenCalled();
    } finally {
      delete process.env.AGENT_MODE;
    }
  });
});

describe("verifier menerima angka yang sudah tampil di kasus", () => {
  beforeEach(() => {
    vi.clearAllMocks();
    delete process.env.AGENT_MODE;
  });

  it("angka metrik pilar lolos meski tidak ada di teks jawaban deterministik", async () => {
    process.env.AGENT_MODE = "llm";
    try {
      const analysis = await antm();
      const topShare = metricOf(pillarOf(analysis.pillars, "concentration"), "Porsi peserta teratas");
      const draft = `ANTM masuk karena arus tercatat; porsi peserta teratas ${topShare.value}.`;
      mockCompose.mockResolvedValue({ text: draft });
      const answer = await agentEngine.answerFollowUp({ question: "Kenapa ANTM masuk daftar hari ini?", profile: demoProfiles[0] });
      expect(mockCompose).toHaveBeenCalledOnce();
      expect(answer.text).toBe(draft);
      const pack = mockCompose.mock.calls[0][0] as { evidenceNumbers: string[] };
      expect(pack.evidenceNumbers).toContain(topShare.value);
    } finally {
      delete process.env.AGENT_MODE;
    }
  });

  it("angka yang tidak ada pada kasus tetap ditolak", async () => {
    process.env.AGENT_MODE = "llm";
    try {
      mockCompose.mockRejectedValue(new Error('Answer rejected by verifier: "999%" does not appear in the evidence pack'));
      const answer = await agentEngine.answerFollowUp({ question: "Kenapa ANTM masuk daftar hari ini?", profile: demoProfiles[0] });
      expect(answer.text).toContain("ANTM masuk karena");
    } finally {
      delete process.env.AGENT_MODE;
    }
  });
});
