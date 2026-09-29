import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { companies, coverageInfo, demoProfiles } from "@/lib/data/fixtures";
import type { ChatAnswer, SymbolCode, UserProfile } from "@/lib/types";

/**
 * Golden set per watchlist.
 *
 * Symbols come from the registry, never typed: a recording set that gains or
 * loses an issuer must move these cases, not quietly keep passing.
 */
const analysed = companies.filter((company) => coverageInfo[company.symbol]?.analyzed).map((company) => company.symbol);
const unanalysed = companies.filter((company) => !coverageInfo[company.symbol]?.analyzed).map((company) => company.symbol);

function profileWith(watchlist: SymbolCode[]): UserProfile {
  return { ...demoProfiles[0], watchlist, owned: [] };
}
const P1 = profileWith(analysed.slice(0, 2));
const P2 = profileWith(analysed.slice(0, 3));
const P3 = profileWith([]);
const P4 = profileWith([analysed[0], unanalysed[0]]);

/**
 * The registry count said as a count. A substring check read BBCA's
 * "Volume 1,18×" as the 18-issuer registry once the 28 Sep session landed, so
 * digits that belong to a decimal or a longer number do not count.
 */
function statesCount(text: string, count: number): boolean {
  return new RegExp(`(?<![\\d.,])${count}(?!\\d|[.,]\\d)`).test(text);
}

const ask = (question: string, profile: UserProfile, extra: Record<string, unknown> = {}) =>
  agentEngine.answerFollowUp({ question, profile, ...extra }) as Promise<ChatAnswer>;

/** Every recorded symbol the answer names. */
function symbolsIn(answer: ChatAnswer): SymbolCode[] {
  const said = new Set<SymbolCode>();
  for (const symbol of companies.map((company) => company.symbol)) {
    if (answer.text.includes(symbol)) said.add(symbol);
  }
  return [...said];
}

describe("golden: daftar yang dicakup pembaca", () => {
  const previous = process.env.COPILOT_RETRIEVAL;
  beforeAll(() => { process.env.COPILOT_RETRIEVAL = "on"; });
  afterAll(() => { process.env.COPILOT_RETRIEVAL = previous; });

  it("1. kasus aktif dijawab dari pantauan pembaca, bukan registry", async () => {
    const answer = await ask("kasus apa saja yang aktif", P1);
    expect(answer.intent).toBe("scoped-list");
    expect(new Set(symbolsIn(answer))).toEqual(new Set(P1.watchlist));
    expect(statesCount(answer.text, companies.length)).toBe(false);
  });

  it("2. denominator mengikuti kardinalitas pantauan yang ditanya", async () => {
    const answer = await ask("kasus apa saja yang aktif", P2);
    expect(new Set(symbolsIn(answer))).toEqual(new Set(P2.watchlist));
    expect(answer.text).toContain(String(P2.watchlist.length));
  });

  it("3. isi pantauan dijawab dengan status kelengkapan per simbol", async () => {
    const answer = await ask("pantauanku isinya apa", P1);
    expect(new Set(symbolsIn(answer))).toEqual(new Set(P1.watchlist));
    expect(answer.text.toLowerCase()).toContain("lengkap");
    // Label jawaban harus menyebut miliknya siapa, bukan mengandalkan
    // kebetulan bahwa entri teratas dan bundel teratas sama.
    expect(answer.scope).toBe("user");
    expect(answer.intent).toBe("scoped-list");
  });

  it("4. pertanyaan cakupan registry tetap dijawab registry-wide", async () => {
    const answer = await ask("ada berapa emiten yang punya kasus lengkap", P1);
    expect(answer.intent).not.toBe("scoped-list");
    expect(answer.text).toContain(String(analysed.length));
    expect(answer.text).toContain(String(companies.length));
  });

  it("4b. kata milik yang hanya basa-basi tidak memindahkan denominator", async () => {
    // "menurutku" adalah sikap pembicara, bukan kepemilikan atas apa yang
    // ditanyakan. Prior scope boleh mengangkat entri melewati ambang jawab;
    // ia tidak boleh menggeser entri yang mencocokkan lebih banyak kata.
    const answer = await ask("menurutku ada berapa emiten yang punya kasus lengkap", P1);
    expect(answer.intent).not.toBe("scoped-list");
    expect(answer.scope).not.toBe("user");
    expect(answer.text).toContain(String(companies.length));
  });

  it("5. pertanyaan tentang kontrol layar dijawab sebagai kontrol layar", async () => {
    const answer = await ask("maksudnya tab Kasus aktif apa", P1, { view: "cases" });
    // Bukan daftar seluruh registry: yang ditanya adalah arti sebuah kontrol.
    expect(statesCount(answer.text, companies.length)).toBe(false);
  });

  it("the count check ignores digits inside a decimal", () => {
    expect(statesCount("Volume 1,18× median 38 sesi.", 18)).toBe(false);
    expect(statesCount("dari 18 emiten.", 18)).toBe(true);
    expect(statesCount("dari 18.", 18)).toBe(true);
  });

  it("6. 'yang satunya' menunjuk emiten kedua pada daftar sebelumnya", async () => {
    const [first, second] = P1.watchlist;
    const answer = await ask("yang satunya?", P1, {
      history: [
        { role: "user", text: "kasus apa saja yang aktif" },
        { role: "assistant", text: "Dua kasus.", symbols: [first, second] },
      ],
    });
    expect(answer.relatedSymbols).toContain(second);
    expect((answer.entryIds ?? [])[0]).toBe(`case:${second}`);
  });

  it("7. pantauan kosong dijawab kosong, bukan jatuh ke registry", async () => {
    const answer = await ask("kasus apa saja yang aktif", P3);
    expect(symbolsIn(answer)).toEqual([]);
  });

  it("8. emiten yang dipantau tanpa kasus lengkap tetap disebut", async () => {
    const answer = await ask("kasus aktif saya apa saja", P4);
    const said = new Set(symbolsIn(answer));
    expect(said).toContain(P4.watchlist[0]);
    expect(said).toContain(P4.watchlist[1]);
    expect(answer.text).toContain("belum punya kasus lengkap");
  });

  it("9. dua pembaca berbeda mendapat dua jawaban berbeda", async () => {
    const one = await ask("kasus apa saja yang aktif", P1);
    const two = await ask("kasus apa saja yang aktif", profileWith(analysed.slice(3, 5)));
    expect(one.text).not.toBe(two.text);
    for (const symbol of P1.watchlist) expect(two.text).not.toContain(symbol);
  });

  it("10. jalur yang sudah benar tidak berubah menjadi scoped-list", async () => {
    for (const question of ["apa itu HHI", "dari mana 27,5%", `${analysed[0]} vs ${analysed[1]}`]) {
      const answer = await ask(question, P1);
      expect(answer.intent, question).not.toBe("scoped-list");
    }
  });
});
