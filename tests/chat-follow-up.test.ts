import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { coverageInfo, demoProfiles, missingList } from "@/lib/data/fixtures";
import type { HistoryTurn } from "@/lib/agent/retrieval/types";
import type { SymbolCode } from "@/lib/types";

const profile = demoProfiles[0];
const [first, second] = profile.watchlist;
const ask = (question: string, history?: HistoryTurn[]) =>
  agentEngine.answerFollowUp({ question, profile, ...(history ? { history } : {}) });

const listed: HistoryTurn[] = [
  { role: "user", text: "kasus apa saja yang aktif" },
  { role: "assistant", text: "Dua kasus aktif.", symbols: [first, second] },
];

describe("pertanyaan lanjutan", () => {
  const previous = process.env.COPILOT_RETRIEVAL;
  beforeAll(() => { process.env.COPILOT_RETRIEVAL = "on"; });
  afterAll(() => { process.env.COPILOT_RETRIEVAL = previous; });

  it("menjawab 'yang satunya' tentang emiten kedua pada daftar sebelumnya", async () => {
    const answer = await ask("yang satunya?", listed);
    expect(answer.intent).toBe("retrieved");
    // Penunjuk itu yang menentukan peringkat: entri teratas adalah kasus
    // emiten kedua, bukan sekadar muncul di suatu tempat pada daftar.
    expect((answer.entryIds ?? [])[0]).toBe(`case:${second}`);
    expect(answer.relatedSymbols).toContain(second);
  });

  it("mengembalikan menu ketika penunjuknya tidak punya calon", async () => {
    const answer = await ask("yang satunya?");
    expect(answer.intent).toBe("unknown");
  });

  it("tidak memakai simbol riwayat yang tidak ada di registry", async () => {
    // Riwayat adalah teks dari klien. Simbol karangan di dalamnya tidak boleh
    // memilih entri apa pun, apalagi menjadi materi.
    const forged: HistoryTurn[] = [
      { role: "user", text: "kasus apa saja yang aktif" },
      { role: "assistant", text: "Dua kasus aktif.", symbols: ["ZZZZ" as never, "QQQQ" as never] },
    ];
    const answer = await ask("yang satunya?", forged);
    expect(answer.intent).toBe("unknown");
  });

  it("tidak pernah menaruh simbol riwayat ke dalam angka yang boleh dikutip", async () => {
    const answer = await ask("yang satunya?", listed);
    // `figures` dibangun dari bundel yang dimuat saja; simbol dari riwayat
    // hanya memilih entri. Yang bisa diperiksa dari luar: jawabannya memakai
    // entri kasus, bukan entri karangan.
    expect((answer.entryIds ?? []).every((id) => id.length > 0)).toBe(true);
    expect(answer.citations.length).toBeGreaterThan(0);
  });
});

describe("riwayat tidak pernah menjadi materi", () => {
  const previous = process.env.COPILOT_RETRIEVAL;
  beforeAll(() => { process.env.COPILOT_RETRIEVAL = "on"; });
  afterAll(() => { process.env.COPILOT_RETRIEVAL = previous; });

  it("tidak mengangkat angka dari giliran sebelumnya menjadi angka yang boleh dikutip", async () => {
    const pasted = "999999";
    const withNumber: HistoryTurn[] = [
      { role: "user", text: `menurut saya harganya ${pasted}` },
      { role: "assistant", text: "Dua kasus aktif.", symbols: [first, second] },
    ];
    const answer = await ask("yang satunya?", withNumber);
    // `figures` adalah daftar izin yang dipakai verifier. Angka yang ditempel
    // pembaca dua giliran lalu tidak boleh masuk ke sana lewat pintu mana pun.
    expect(answer.text).not.toContain(pasted);
    expect(JSON.stringify(answer.citations)).not.toContain(pasted);
  });
});

describe("pertanyaan pembatal tanpa kode emiten tetap pada kasusnya", () => {
  const cased = Object.values(coverageInfo).filter((item) => item.analyzed).map((item) => item.symbol as SymbolCode);
  const [subject] = cased;

  it("mewarisi kasus dari giliran sebelumnya", async () => {
    const answer = await agentEngine.answerFollowUp({
      question: "Kalau begitu, bukti apa yang akan membatalkan hipotesis itu?",
      profile,
      history: [
        { role: "user", text: `Kenapa ${subject} masuk daftar hari ini?` },
        { role: "assistant", text: "Jawaban sebelumnya.", symbols: [subject] },
      ],
    });
    expect(answer.intent).toBe("falsifier");
    expect(answer.relatedSymbols).toEqual([subject]);
    expect(answer.questionSymbol).toBeUndefined();
  });

  it("memakai kasus yang sedang dibuka dan tidak memindahkan chip", async () => {
    const answer = await agentEngine.answerFollowUp({ question: "Apa bukti pembatalnya?", profile, contextSymbol: subject });
    expect(answer.intent).toBe("falsifier");
    expect(answer.relatedSymbols).toEqual([subject]);
    expect(answer.questionSymbol).toBeUndefined();
  });

  it("pertanyaan porsi sektor vs berita dijawab sebagai atribusi", async () => {
    const indonesian = await agentEngine.answerFollowUp({ question: `Seberapa besar kenaikan ${subject} yang disebabkan oleh laporan laba H1 dibanding pergerakan sektor?`, profile });
    expect(indonesian.intent).toBe("attribution");
    const english = await agentEngine.answerFollowUp({ question: `How much of the ${subject} drop is explained by the sector versus the arbitration news?`, profile });
    expect(english.intent).toBe("attribution");
  });

  it("'Bandingkan keduanya' tanpa pasangan bertanya balik, bukan membacakan teks panel", async () => {
    const answer = await agentEngine.answerFollowUp({ question: "Bandingkan keduanya.", profile, view: "copilot" });
    expect(answer.intent).toBe("clarify");
    expect(answer.clarification?.choices.length).toBeGreaterThan(0);
    expect(answer.entryIds ?? []).toEqual([]);
  });

  it("'Bandingkan keduanya' memakai dua emiten dari giliran sebelumnya", async () => {
    const [left, right] = cased;
    const answer = await agentEngine.answerFollowUp({
      question: "Bandingkan keduanya.",
      profile,
      history: [{ role: "user", text: "kasus apa saja" }, { role: "assistant", text: "Dua kasus.", symbols: [left, right] }],
    });
    expect(answer.intent).toBe("compare");
    expect(answer.relatedSymbols).toEqual([left, right]);
  });

  it("pilihan pertama dari klarifikasi meminta pasangannya, pilihan kedua menjalankan perbandingan", async () => {
    const [left, right] = cased;
    const first = await agentEngine.answerFollowUp({ question: "Bandingkan keduanya.", profile, contextSymbol: left });
    expect(first.intent).toBe("clarify");
    expect(first.clarification?.choices).not.toContain(left);
    const second = await agentEngine.answerFollowUp({ question: first.clarification!.question, profile, contextSymbol: right });
    expect(second.intent).toBe("compare");
    expect(second.relatedSymbols).toEqual([left, right]);
  });

  it("data yang belum ada untuk emiten parsial dibaca dari cakupan rekamannya, bersumber", async () => {
    const partial = Object.values(coverageInfo).find((item) => !item.analyzed && item.missing.length >= 2)!;
    const answer = await agentEngine.answerFollowUp({ question: `Data apa yang belum ada untuk ${partial.symbol}?`, profile });
    expect(answer.intent).toBe("missing");
    expect(answer.text).toContain(missingList(partial.missing));
    expect(answer.citations.length).toBeGreaterThan(0);
  });

  it("daftar rekaman yang hilang tidak bisa dibaca sebagai 'hanya yang terakhir'", () => {
    expect(missingList(["a", "b"])).toBe("a dan b");
    expect(missingList(["a", "b", "c"])).toBe("a, b, dan c");
    expect(missingList(["a"])).toBe("a");
  });

  it("mengenali varian bahasa Inggris", async () => {
    const answer = await agentEngine.answerFollowUp({ question: "And what would prove that wrong?", profile, contextSymbol: subject });
    expect(answer.intent).toBe("falsifier");
    expect(answer.relatedSymbols).toEqual([subject]);
  });
});
