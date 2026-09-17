import { beforeEach, describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { enforceCitations, isCompleteCitation, assertSafeOutput, safeLanguage } from "@/lib/agent/gates";
import { verifyDraft } from "@/lib/agent/llm/verify";
import { citations, demoProfiles, events } from "@/lib/data/fixtures";
import { rawEvents } from "@/lib/data/market.generated";
import { analyzeRequestSchema, chatRequestSchema, userInsightSchema, webWatchReviewSchema } from "@/lib/schemas";
import { buildCandidate } from "@/lib/web-watch/check";
import { newSourceState } from "@/lib/web-watch/types";
import type { Citation, PillarResult } from "@/lib/types";

const profile = demoProfiles[0];

function pillarWith(metrics: PillarResult["metrics"]): PillarResult {
  return {
    key: "volume",
    label: "Volume",
    status: "Normal",
    summary: "ringkasan",
    metrics,
    citations: [],
    protocol: { claim: "c", supportingEvidence: "s", challengingEvidence: "h", insufficientWhen: "i", nextQuestion: "n" },
  };
}

describe("gates menolak jalan yang salah", () => {
  it("citation gate menolak metrik tanpa sitasi", () => {
    expect(() => enforceCitations([pillarWith([{ label: "X", value: "1", citations: [] }])]))
      .toThrow("Citation gate");
  });

  it("citation gate menolak sitasi tak lengkap (tanpa provider)", () => {
    const bad: Citation = { id: "c", provider: "", endpoint: "/v2/x/", field: "f", asOf: "2026-09-11T00:00:00+07:00", label: "l" };
    expect(isCompleteCitation(bad)).toBe(false);
    expect(() => enforceCitations([pillarWith([{ label: "X", value: "1", citations: [bad] }])]))
      .toThrow("Citation gate");
  });

  it("menolak semua varian saran transaksi", () => {
    for (const q of ["Apakah saya harus beli ANTM?", "Jual sekarang?", "entry point?", "stop loss di mana?", "target price?", "take profit?", "cuan cepat", "buy or sell?"]) {
      expect(safeLanguage(q).refused, q).toBe(true);
    }
  });

  it("tidak menolak pertanyaan riset biasa", () => {
    for (const q of ["Kenapa ANTM masuk daftar hari ini?", "Data apa yang belum diperiksa untuk ANTM?", "Bandingkan ANTM versus BBCA"]) {
      expect(safeLanguage(q).refused, q).toBe(false);
    }
  });

  it("assertSafeOutput meledak pada teks advisory", () => {
    expect(() => assertSafeOutput("Anda harus beli sekarang")).toThrow("Language gate");
  });
});

describe("verifier menolak angka karangan", () => {
  it("menolak angka yang tidak ada di evidence pack", () => {
    const result = verifyDraft("Volume naik 47% hari ini.", ["12%"], []);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("47%");
  });

  it("menyetujui teks yang angkanya semua dari evidence", () => {
    expect(verifyDraft("Volume 1.40× median, imbal hasil 6,2%.", ["1.40", "6,2%"], []).approved).toBe(true);
  });
});

describe("engine menjawab kegagalan dengan jujur", () => {
  beforeEach(() => {
    delete process.env.AGENT_MODE;
  });

  it("saran transaksi ditolak, bukan dijawab", async () => {
    for (const q of ["Apakah saya harus beli ANTM?", "Kapan jual BBCA biar cuan?"]) {
      const answer = await agentEngine.answerFollowUp({ question: q, profile });
      expect(answer.refused).toBe(true);
      expect(answer.intent).toBe("advice");
    }
  });

  it("pertanyaan tak dikenal tidak mengarang: intent unknown, sitasi kosong", async () => {
    const answer = await agentEngine.answerFollowUp({ question: "xyz qwerty zzzz", profile });
    expect(answer.intent).toBe("unknown");
    expect(answer.citations).toEqual([]);
    expect(answer.text).toContain("Belum ada bukti yang cukup");
  });

  it("regresi: 'belum' tidak lagi dibajak 'sebelumnya' menjadi event-impact", async () => {
    const answer = await agentEngine.answerFollowUp({
      question: "Data apa yang belum diperiksa untuk ANTM?",
      profile,
      contextSymbol: "ANTM",
    });
    expect(answer.intent).toBe("missing");
    expect(answer.text).toContain("Data dalam hari perdagangan");
  });

  it("event di luar watchlist berkata terus terang, bukan mengarang dampak", async () => {
    const answer = await agentEngine.answerFollowUp({
      question: "Ceritakan perpetual bond Mandiri untuk pantauan saya",
      profile, // watchlist tanpa BMRI
    });
    expect(answer.intent).toBe("event-impact");
    expect(answer.text).toContain("tidak memiliki jalur dampak");
    expect(answer.relatedSymbols).toEqual([]);
  });

  it("simbol tak dikenal mengembalikan null (jalur 404 API)", async () => {
    await expect(agentEngine.analyzeCompany("XXXX", profile)).resolves.toBeNull();
    await expect(agentEngine.buildCausalGraph("XXXX", profile, { scope: "market", minRelevance: 0 })).resolves.toBeNull();
  });

  it("simbol di luar scope watchlist mengembalikan null", async () => {
    const narrow = { ...profile, watchlist: ["BBCA"] as const };
    await expect(agentEngine.buildCausalGraph("ANTM", { ...profile, watchlist: ["BBCA", "BBRI"] }, { scope: "watchlist", minRelevance: 0 })).resolves.toBeNull();
    expect(narrow.watchlist).not.toContain("ANTM");
  });

  it("eventId tak dikenal mengembalikan null (jalur 404 API)", () => {
    expect(agentEngine.mapEventImpact("tidak-ada-event-ini", profile, "market")).toBeNull();
  });
});

describe("sitasi tidak pernah berbohong tentang tautan", () => {
  const rawById = new Map(rawEvents.map((raw) => [raw.id, raw]));

  it("semua sitasi peristiwa lengkap secara metadata", () => {
    for (const event of events) {
      for (const citation of event.citations) {
        expect(isCompleteCitation(citation), `${event.id}/${citation.id}`).toBe(true);
      }
    }
  });

  it("tidak ada tautan dokumentasi palsu atau endpoint fiktif", () => {
    for (const event of events) {
      for (const citation of event.citations) {
        expect(citation.url ?? "", `${event.id}`).not.toContain("llms.txt");
        expect(citation.endpoint, `${event.id}`).not.toContain("fixture://external");
      }
    }
  });

  it("peristiwa dengan sumber asal menaut langsung ke artikelnya", () => {
    const withSource = rawEvents.filter((raw) => raw.source);
    expect(withSource.length).toBeGreaterThan(0);
    for (const raw of withSource) {
      const event = events.find((item) => item.id === raw.id)!;
      const citation = event.citations[0];
      expect(citation.url, raw.id).toBe(raw.source);
      expect(citation.urlLabel, raw.id).toBe("Buka sumber asal");
    }
  });

  it("agregat turunan memakai endpoint API yang benar", () => {
    const flows = events.filter((event) => event.id.startsWith("flows-foreign-net-"));
    expect(flows.length).toBeGreaterThan(0);
    for (const event of flows) {
      expect(event.citations[0].endpoint, event.id).toContain("/v2/foreign-flow/");
    }
    // Both paths now name the recording that produced the event:
    // v2_company_corporate-actions_<symbol>.json and
    // v2_mining_commodities_<name>_price__*.json. The shorter paths this test
    // used to lock were never called by the bundle.
    const actions = events.filter((event) => event.id.startsWith("filing-corporate-action-"));
    expect(actions.length).toBeGreaterThan(0);
    for (const event of actions) {
      expect(event.citations[0].endpoint, event.id).toContain("/v2/company/corporate-actions/");
      expect(event.citations[0].url, event.id).toBeUndefined();
    }
    const commodities = events.filter((event) => rawById.get(event.id)?.sourceType === "commodity");
    expect(commodities.length).toBeGreaterThan(0);
    for (const event of commodities) {
      expect(event.citations[0].endpoint, event.id).toMatch(/^\/v2\/mining\/commodities\/(Gold|Coal)\/price\/$/);
      expect(event.citations[0].field, event.id).toBe("name, date, price_usd_per_ton");
    }
  });

  it("span tersitasi tidak pernah menuduh kalimat yang salah", () => {
    for (const event of events) {
      for (const citation of event.citations) {
        expect(citation.span?.match, `${event.id}`).not.toBe("not_found");
      }
    }
  });

  it("sitasi kosong katalis jujur: lengkap, tanpa tautan", () => {
    const empty = citations.empty("ANTM");
    expect(isCompleteCitation(empty)).toBe(true);
    expect(empty.url).toBeUndefined();
    expect(empty.label).toContain("Belum ada");
  });
});

describe("skema menolak masukan sampah", () => {
  it("simbol terlalu pendek/panjang ditolak", () => {
    expect(analyzeRequestSchema.safeParse({ symbol: "A", profile }).success).toBe(false);
    expect(analyzeRequestSchema.safeParse({ symbol: "TOOLONG", profile }).success).toBe(false);
  });

  it("profil tanpa watchlist ditolak", () => {
    expect(chatRequestSchema.safeParse({ question: "Kenapa ANTM?", profile: { ...profile, watchlist: [] } }).success).toBe(false);
  });

  it("pertanyaan kosong ditolak", () => {
    expect(chatRequestSchema.safeParse({ question: " ", profile }).success).toBe(false);
  });

  it("insight: catatan pendek dan URL non-https ditolak", () => {
    const base = { id: "i1", symbol: "ANTM", category: "data-error", note: "catatan yang cukup panjang untuk lolos", status: "pending", createdAt: "2026-09-15T00:00:00.000Z", reviewHistory: [] };
    expect(userInsightSchema.safeParse({ ...base, note: "pendek" }).success).toBe(false);
    expect(userInsightSchema.safeParse({ ...base, sourceUrl: "http://example.com/x" }).success).toBe(false);
    expect(userInsightSchema.safeParse({ ...base, sourceUrl: "https://example.com/x" }).success).toBe(true);
  });

  it("review tanpa alasan penolakan ditolak", () => {
    expect(webWatchReviewSchema.safeParse({ action: "dismiss", candidateId: "c1", reason: "" }).success).toBe(false);
  });
});

describe("kandidat web-watch membawa sumber asalnya", () => {
  it("buildCandidate menaut langsung ke halaman yang dibaca", () => {
    const state = newSourceState({
      id: "kompas",
      url: "https://money.kompas.com/read/2026/07/09/180504926/ojk-sebut-kebohongan-henry-surya",
      label: "Kompas Money",
      kind: "document",
      enabled: true,
      checkIntervalHours: 24,
      category: "company",
      sourceType: "sectors",
    });
    const candidate = buildCandidate(
      state,
      { text: "OJK menyebut kebohongan Henry Surya membuat pengusutan kasus Indosurya makan waktu. ".repeat(20), method: "plain" },
      "https://money.kompas.com/read/2026/07/09/180504926/ojk-sebut-kebohongan-henry-surya",
      null,
      null,
      "",
      "2026-09-15T00:00:00.000Z",
    );
    const citation = candidate.citations[0];
    expect(citation.url).toBe("https://money.kompas.com/read/2026/07/09/180504926/ojk-sebut-kebohongan-henry-surya");
    expect(citation.provider).toBe("money.kompas.com");
    expect(citation.urlLabel).toBe("Buka sumber asal");
    expect(candidate.impactLinks).toEqual([]);
  });
});
