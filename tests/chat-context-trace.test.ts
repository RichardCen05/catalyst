import { afterAll, beforeAll, describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";

const profile = demoProfiles[0];
const ask = (question: string, view?: string) =>
  agentEngine.answerFollowUp({ question, profile, ...(view ? { view } : {}) });

/**
 * Jejak entri yang dipakai sebuah jawaban.
 *
 * Tanpa ini setiap perubahan pada lapisan retrieval hanya bisa diperiksa
 * dengan membaca kalimat bahasa Indonesia dengan mata, yang tidak bisa
 * membedakan jawaban benar dari jawaban yang kebetulan terdengar benar.
 */
describe("jejak konteks pada jawaban", () => {
  const previous = process.env.COPILOT_RETRIEVAL;
  beforeAll(() => { process.env.COPILOT_RETRIEVAL = "on"; });
  afterAll(() => { process.env.COPILOT_RETRIEVAL = previous; });

  it("menyebut entri yang dipakai ketika jawaban datang dari retrieval", async () => {
    const answer = await ask("isi halaman pantau apa");
    expect(answer.intent).toBe("retrieved");
    expect(answer.entryIds ?? []).not.toEqual([]);
  });

  it("memuat halaman yang ditanyakan di dalam jejaknya", async () => {
    const answer = await ask("isi halaman pantau apa");
    expect(answer.entryIds ?? []).toContain("view:pantau");
  });

  it("menandai jawaban agregat sebagai satu bundel agregat lalu menyebut sumbernya", async () => {
    // Pertanyaan "apa saja" dihitung atas seluruh himpunan yang cocok lalu
    // diringkas menjadi satu bundel. Entri agregat berdiri paling depan —
    // itu bentuk jawabannya — dan entri yang diringkas menyusul, supaya
    // "bahan mana yang mengatakan ini" tetap bisa dijawab untuk bentuk
    // jawaban yang justru membaca bahan paling banyak.
    const answer = await ask("mekanisme apa saja di peta sebab akibat");
    const ids = answer.entryIds ?? [];
    expect(ids[0]).toMatch(/^aggregate:/);
    expect(ids.length).toBeGreaterThan(1);
    expect(ids.slice(1).every((id) => !id.startsWith("aggregate:"))).toBe(true);
  });

  it("menjawab pertanyaan cakupan kasus dari entri cakupan", async () => {
    const answer = await ask("ada berapa emiten yang punya kasus lengkap");
    expect(answer.entryIds ?? []).toContain("view:cases");
  });

  it("tidak mengarang jejak untuk jawaban yang bukan dari retrieval", async () => {
    const answer = await ask("asdfgh qwerty zxcvb");
    expect(answer.intent).toBe("unknown");
    expect(answer.entryIds).toBeUndefined();
  });
});
