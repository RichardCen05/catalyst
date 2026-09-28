import { readFileSync } from "node:fs";
import { beforeEach, describe, expect, it, vi } from "vitest";
import * as gcs from "@/lib/gcp/gcs";
import { agentEngine } from "@/lib/agent/engine";
import { attributionMaterial } from "@/lib/agent/case-answers";
import { composeAnswerWithLlm } from "@/lib/agent/llm/answer";
import { untranslatedTerms } from "@/lib/agent/llm/language-leak";
import { verifyAnswer } from "@/lib/agent/llm/verify";
import { resolveThresholds } from "@/lib/agent/thresholds";
import { demoProfiles } from "@/lib/data/fixtures";
import { formatWib } from "@/lib/utils";
import { htmlToText } from "@/lib/web-watch/fetching";
import { applyVerdicts, emptyQueue, restoreAutoReject, type ReviewQueue } from "@/lib/web-watch/queue";
import { screenPayload } from "@/lib/web-watch/screen-payload";
import { SEED_SOURCES } from "@/lib/web-watch/seeds";
import type { MarketEvent } from "@/lib/types";

vi.mock("@/lib/gcp/gcs", async (importOriginal) => ({
  ...(await importOriginal<typeof import("@/lib/gcp/gcs")>()),
  gcsGetJson: vi.fn(),
  gcsPutJson: vi.fn(),
}));

/**
 * The follow-ups from the fresh-session QA pass of 28 Sep 2026, run against
 * production after the P0/P1 fixes shipped. One describe per finding; the
 * work is done when every one of them passes.
 */

const profile = demoProfiles[0];
const NOW = "2026-09-28T10:00:00.000Z";

const citation = { id: "c", provider: "contoh.go.id", endpoint: "web-watch", field: "body", asOf: NOW, label: "Contoh", url: "https://contoh.go.id/a", urlLabel: "Buka sumber asal", access: "direct" as const };
function event(id: string, body: string | null = "Isi berita."): MarketEvent {
  return { id, title: `Judul ${id}`, summary: "Ringkasan.", body, category: "company", sourceType: "macro", publishedAt: NOW, asOf: NOW, sector: "Market", impactLinks: [], citations: [{ ...citation, id: `c-${id}` }] } as MarketEvent;
}

beforeEach(() => {
  vi.mocked(gcs.gcsGetJson).mockReset();
  vi.mocked(gcs.gcsPutJson).mockReset();
});

describe("F2 a final auto-reject can be taken back by a person", () => {
  const rejected = (queue: ReviewQueue) =>
    applyVerdicts(queue, [{ candidateId: "g1", verdict: "reject", check: "relevance", reason: "tidak relevan untuk semua emiten cocok (p=0.98)", span: "jaringan gas rumah tangga", score: 0.98 }], NOW, 20).next;

  it("a final reject keeps the pending item, so a restore puts back exactly what the screen read", () => {
    const pending = event("g1", "Pemerintah menyiapkan anggaran pembangunan jaringan gas rumah tangga tahun depan.");
    const before: ReviewQueue = { ...emptyQueue, pending: [pending], matches: { g1: { symbols: ["PGAS"], matchedBy: [], at: NOW } } };
    const after = rejected(before);
    expect(after.pending).toEqual([]);
    const restored = restoreAutoReject(after, "g1", "Jaringan gas rumah tangga menyangkut PGAS.", NOW);
    expect(restored.pending.map((e) => e.id)).toEqual(["g1"]);
    expect(restored.pending[0].body).toBe(pending.body);
    expect(restored.decided.g1).toBeUndefined();
    // Never decided alone again, and the reviewer's reason is kept as the
    // residual mark so the eventual decision labels the screen's mistake.
    expect(restored.matches.g1).toMatchObject({ symbols: ["PGAS"], noAuto: true });
    expect(restored.matches.g1.residual?.reason).toContain("Jaringan gas rumah tangga menyangkut PGAS.");
  });

  it("a reject written before the event was kept comes back with its title and address", () => {
    const legacy: ReviewQueue = {
      ...emptyQueue,
      decided: { g2: { candidateId: "g2", status: "dismissed", decidedAt: NOW, reason: "tidak relevan", autoReject: { check: "relevance", at: NOW, title: "Petani tebu dan impor gula", url: "https://contoh.go.id/gula" } } },
    };
    const restored = restoreAutoReject(legacy, "g2", "Harga gula menyangkut biaya bahan baku emiten makanan.", NOW);
    expect(restored.pending[0]).toMatchObject({ id: "g2", title: "Petani tebu dan impor gula" });
    expect(restored.pending[0].citations[0].url).toBe("https://contoh.go.id/gula");
  });

  it("refuses a person's own dismiss, a rumor, and a missing reason", () => {
    const own: ReviewQueue = { ...emptyQueue, decided: { h1: { candidateId: "h1", status: "dismissed", decidedAt: NOW, reason: "manual" } } };
    expect(() => restoreAutoReject(own, "h1", "Alasan yang cukup panjang.", NOW)).toThrow();
    const after = rejected({ ...emptyQueue, pending: [event("g1")] });
    expect(() => restoreAutoReject(after, "g1", "  ", NOW)).toThrow();
  });

  it("the review API restores through one guarded write", async () => {
    const after = rejected({ ...emptyQueue, pending: [event("g1")] });
    vi.mocked(gcs.gcsGetJson).mockResolvedValue({ data: after, generation: "1" });
    vi.mocked(gcs.gcsPutJson).mockResolvedValue({ generation: "2" });
    const { POST } = await import("@/app/api/web-watch/route");
    const response = await POST(new Request("http://localhost/api/web-watch", { method: "POST", body: JSON.stringify({ action: "restore-reject", candidateId: "g1", reason: "Jaringan gas rumah tangga menyangkut PGAS." }) }));
    expect(response.status).toBe(200);
    expect(await response.json()).toMatchObject({ ok: true, status: "restored" });
    const saved = vi.mocked(gcs.gcsPutJson).mock.calls[0][2] as ReviewQueue;
    expect(saved.pending.map((e) => e.id)).toEqual(["g1"]);
  });
});

describe("F3 an English answer carries no Indonesian label", () => {
  const evidence = "Uji utama dampak bisnis: Margin operasi, Arus kas operasi. Arah katalis Berlawanan. Periksa margin kotor dan konsentrasi arus asing.";

  it("finds the Indonesian labels an English draft kept", () => {
    const leaky = "Check operating margin next (margin operasi, margin kotor), then arus kas operasi and konsentrasi and arus asing; the catalyst is Berlawanan.";
    const terms = untranslatedTerms(leaky, "en");
    for (const term of ["operasi", "kotor", "arus", "konsentrasi", "berlawanan"]) expect(terms).toContain(term);
    expect(untranslatedTerms("Check the gross margin and operating cash flow next; the catalyst is adverse.", "en")).toEqual([]);
    // An Indonesian answer is written in these words on purpose.
    expect(untranslatedTerms("Periksa margin kotor dan arus kas operasi.", "id")).toEqual([]);
  });

  it("the verifier rejects the leak, and a translated draft passes", () => {
    const question = "What should I check next?";
    const leaky = verifyAnswer("PGAS: check margin operasi and arus kas operasi next; the catalyst is Berlawanan.", [], question, evidence);
    expect(leaky.approved).toBe(false);
    expect(leaky.violations.join(" ")).toMatch(/Indonesian/);
    expect(verifyAnswer("PGAS: check the operating margin and operating cash flow next; the catalyst is adverse.", [], question, evidence).approved).toBe(true);
  });

  it("asks for every label to be translated, and retries a rejected draft once with the reason", async () => {
    const call = vi.fn()
      .mockResolvedValueOnce({ text: "PGAS: check margin operasi and arus kas operasi next; the catalyst is Berlawanan." })
      .mockResolvedValueOnce({ text: "PGAS: check the operating margin and operating cash flow next; the catalyst is adverse." });
    const result = await composeAnswerWithLlm({ question: "What should I check next?", evidenceSummary: evidence, evidenceNumbers: [] }, call);
    expect(result.text).toBe("PGAS: check the operating margin and operating cash flow next; the catalyst is adverse.");
    expect(call).toHaveBeenCalledTimes(2);
    expect(call.mock.calls[0][0].contents).toMatch(/[Tt]ranslate/);
    expect(call.mock.calls[1][0].contents).toContain("berlawanan");
  });
});

describe("F5 a page-wide form does not hide the article, and the site's chrome is not read", () => {
  const ARTICLE = [
    "Lembaga contoh mencatat penyaluran kredit sektor energi tumbuh pada kuartal ketiga tahun ini.",
    "Pertumbuhan itu ditopang pembiayaan proyek pembangkit listrik dan jaringan distribusi gas.",
    "Rapat berikutnya akan meninjau kembali kebijakan suku bunga acuan bersama otoritas terkait.",
  ];
  const MENU = "Informasi seputar organisasi, tugas, dan struktur lembaga contoh bagi masyarakat umum.";
  const page = (article: string[]) => `<html><head><title>Siaran pers</title><script>var x = 1;</script></head><body>
<form method="post" action="./halaman.aspx" id="aspnetForm">
  <div class="s4-notdlg noindex"><a href="#" title="Turn on more accessible mode">Turn on more accessible mode</a>
  <a href="javascript:;" title="Skip Ribbon Commands">Skip Ribbon Commands</a></div>
  <header><nav class="navbar"><ul><li><a href="/tentang">Tentang</a><p>${MENU}</p></li></ul></nav></header>
  <div class="search"><form role="search" action="/cari"><label>Cari di situs ini</label><input name="q"></form></div>
  <div id="konten">${article.map((s) => `<p>${s}</p>`).join("\n")}</div>
  <footer><p>Hak cipta lembaga contoh.</p></footer>
</form></body></html>`;

  it("reads the article inside a form that wraps the whole page", () => {
    const text = htmlToText(page(ARTICLE));
    for (const sentence of ARTICLE) expect(text).toContain(sentence);
    expect(text).not.toContain(MENU);
    expect(text).not.toContain("Cari di situs ini");
    expect(text).not.toContain("Turn on more accessible mode");
    expect(text).not.toContain("Skip Ribbon Commands");
  });

  it("the screen skips a sentence every item from the same source repeats", () => {
    const bi = SEED_SOURCES.find((source) => source.id === "src-bi-news");
    expect(bi).toBeDefined();
    const id = (n: number) => `web-${bi!.id}-${n}`;
    const shared = "Lembaga contoh menyediakan informasi seputar organisasi dan tugas bagi masyarakat umum.";
    const queue: ReviewQueue = {
      ...emptyQueue,
      pending: [
        event(id(1), `${shared}\n${ARTICLE[0]} ${ARTICLE[1]}`),
        event(id(2), `${shared}\n${ARTICLE[2]}`),
      ],
    };
    const payload = screenPayload(queue, SEED_SOURCES, resolveThresholds());
    for (const item of payload.items) {
      expect(item.windows.length).toBeGreaterThan(0);
      for (const window of item.windows) expect(window.text).not.toContain(shared);
    }
  });
});

describe("F6 Pantau times read in Jakarta time", () => {
  it("names the zone and converts from UTC", () => {
    const shown = formatWib("2026-09-28T08:10:12.000Z");
    expect(shown).toMatch(/WIB$/);
    expect(shown).toContain("15.10");
  });
  it("no timestamp on the review page is a raw UTC slice", () => {
    const source = readFileSync("components/web-watch-review.tsx", "utf8");
    expect(source).not.toMatch(/\.slice\(0, 16\)\.replace\("T", " "\)/);
  });
});

describe("F7 one volume baseline, one count", () => {
  it("every place that names the volume baseline gives the same number of sessions", async () => {
    for (const symbol of ["PGAS", "ANTM"] as const) {
      const analysis = await agentEngine.analyzeCompany(symbol, profile);
      const volume = analysis!.pillars.find((pillar) => pillar.key === "volume")!;
      const n = Number(/n = (\d+)/.exec(volume.calculation!.formula)![1]);
      const text = JSON.stringify([volume, analysis!.hypotheses, analysis!.materialChange]);
      const counts = [...text.matchAll(/(?:[Pp]embanding|median)\s+(\d+)\s+(?:sesi|hari bursa)/g)].map((m) => Number(m[1]));
      expect(counts.length).toBeGreaterThan(0);
      expect(new Set(counts)).toEqual(new Set([n]));
    }
  });
});

describe("F8 the attribution answer names the beta term", () => {
  it("the material asks the rewrite to keep beta and the residual", async () => {
    const analysis = await agentEngine.analyzeCompany("ANTM", profile);
    const momentum = analysis!.pillars.find((pillar) => pillar.key === "momentum")!;
    const material = attributionMaterial(analysis!);
    const beta = momentum.calculation!.substitution.split(" − ")[1].split(" × ")[0];
    expect(material.mustQuote).toContain(beta);
    expect(material.mustQuote).toContain(momentum.calculation!.result.split(" · ")[0]);
  });

  it("a draft that drops a figure it must keep is retried, then rejected", async () => {
    const input = { question: "Seberapa besar kenaikan ANTM yang disebabkan sektor?", evidenceSummary: "Uraian gerak: 4,0% − 1,07 × −1,3% = 2,3%.", evidenceNumbers: ["4,0%", "1,07", "−1,3%", "2,3%"], mustQuote: ["1,07"] };
    const dropped = vi.fn().mockResolvedValue({ text: "Residual di luar IHSG 2,3% belum terbukti berasal dari berita." });
    await expect(composeAnswerWithLlm(input, dropped)).rejects.toThrow(/1,07/);
    expect(dropped).toHaveBeenCalledTimes(2);
    const kept = vi.fn().mockResolvedValue({ text: "Setelah beta 1,07 dikalikan IHSG, residual 2,3% belum terbukti berasal dari berita." });
    expect((await composeAnswerWithLlm(input, kept)).text).toContain("1,07");
  });
});

describe("F9 a rumor the screen flags lands in the Terindikasi Rumor tab", () => {
  it("screen verdict → decide → review API lists it under suspected, not pending or rejected", async () => {
    const queue: ReviewQueue = { ...emptyQueue, pending: [event("r1", "Kabarnya perusahaan akan diakuisisi, menurut sumber yang enggan disebut namanya.")] };
    const { next, quarantined } = applyVerdicts(queue, [{ candidateId: "r1", verdict: "reject", check: "rumor", reason: "rumor: klaim hanya bersumber kabar tanpa nama (p=0.99)", span: "Kabarnya", score: 0.99 }], NOW, 20);
    expect(quarantined).toEqual(["r1"]);
    vi.mocked(gcs.gcsGetJson).mockImplementation(async (_bucket: string, path: string) => (path.includes("queue") ? { data: next, generation: "1" } : null));
    const { GET } = await import("@/app/api/web-watch/route");
    const body = await (await GET()).json();
    expect(body.suspected.map((row: { id: string }) => row.id)).toEqual(["r1"]);
    expect(body.pending).toEqual([]);
    expect(body.autoRejected).toEqual([]);
  });
});
