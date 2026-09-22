import { describe, expect, it } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { resolveFollowUp } from "@/lib/agent/retrieval/follow-up";
import { companies, coverageInfo, demoProfiles } from "@/lib/data/fixtures";
import type { ChatAnswer, SymbolCode, UserProfile } from "@/lib/types";
import type { HistoryTurn } from "@/lib/agent/retrieval/types";

/**
 * The evaluation harness (P5).
 *
 * Two rules it is built around.
 *
 * Metrics are reported in pairs, because either half alone is trivially
 * gamed: an answer that says nothing leaks nothing, and an answer that repeats
 * the whole registry recalls every symbol the reader watches. Leak rate is
 * only meaningful next to scope recall, and a denominator is only honest next
 * to the set it counts.
 *
 * Every case is generated from the registry rather than typed. A recording set
 * that gains or loses an issuer moves these numbers instead of quietly leaving
 * them green, which is the failure mode a hand-written golden set has.
 */

const registry = companies.map((company) => company.symbol);
const analysed = companies.filter((company) => coverageInfo[company.symbol]?.analyzed).map((company) => company.symbol);
const unanalysed = companies.filter((company) => !coverageInfo[company.symbol]?.analyzed).map((company) => company.symbol);

function profileWith(watchlist: SymbolCode[]): UserProfile {
  return { ...demoProfiles[0], watchlist, owned: [] };
}

/** Readers of three different watchlist sizes: a denominator that is right for
 *  one and wrong for the others cannot pass by accident. */
const READERS = [analysed.slice(0, 2), analysed.slice(0, 3), analysed.slice(1, 5)].map(profileWith);

/** How a reader says "mine". Each phrasing reaches the scoped material by a
 *  different route: an enclitic, a possessive pronoun, a bare list question. */
const SCOPED_QUESTIONS = [
  "kasus apa saja yang aktif",
  "pantauanku isinya apa",
  "kasus aktif saya apa saja",
  "daftar pantauan saya isinya apa",
];

/** Questions about the recordings as a whole. Their denominator is the
 *  registry, and a scope prior must not move it. */
const REGISTRY_QUESTIONS = [
  "ada berapa emiten yang punya kasus lengkap",
  "berapa emiten yang terekam",
];

const ask = (question: string, profile: UserProfile, extra: Record<string, unknown> = {}) =>
  agentEngine.answerFollowUp({ question, profile, ...extra }) as Promise<ChatAnswer>;

/** Every recorded symbol an answer names, whatever it named it for. */
function symbolsIn(answer: ChatAnswer): SymbolCode[] {
  return registry.filter((symbol) => answer.text.includes(symbol));
}

interface ScopedRow {
  question: string;
  profile: UserProfile;
  answer: ChatAnswer;
}

interface ScopedMetrics {
  /** Share of scoped questions answered from the reader's own material. */
  scopeRecall: number;
  /** Share of scoped answers naming an issuer the reader does not watch. */
  leakRate: number;
  /** Share of scoped answers whose stated denominator is the size of the
   *  reader's own list. */
  denominatorHonesty: number;
  /** Share of scoped answers that named every issuer the reader watches. */
  coverage: number;
}

function measureScoped(rows: ScopedRow[]): ScopedMetrics {
  let scoped = 0;
  let leaked = 0;
  let honest = 0;
  let covered = 0;
  for (const { profile, answer } of rows) {
    const watchlist = new Set(profile.watchlist);
    const said = symbolsIn(answer);
    if (answer.scope === "user" && answer.intent === "scoped-list") scoped += 1;
    if (said.some((symbol) => !watchlist.has(symbol))) leaked += 1;
    // The stated denominator, read where the answer states it. A bare
    // substring search for the number is not a measurement: "18" appears in
    // dates and prices, and would score an honest answer as dishonest.
    const stated = /(\d+)\s+dari\s+(\d+)\s+emiten/.exec(answer.text);
    // Two conditions, because the phrasing alone is a proxy: the count has to
    // be the reader's, and the answer has to be the one built from the
    // reader's own material. A registry sentence that happens to use the same
    // phrasing fails the second.
    if (stated && Number(stated[2]) === profile.watchlist.length && answer.scope === "user") honest += 1;
    if (profile.watchlist.every((symbol) => said.includes(symbol))) covered += 1;
  }
  const total = rows.length;
  return {
    scopeRecall: scoped / total,
    leakRate: leaked / total,
    denominatorHonesty: honest / total,
    coverage: covered / total,
  };
}

async function scopedRows(): Promise<ScopedRow[]> {
  const rows: ScopedRow[] = [];
  for (const profile of READERS) {
    for (const question of SCOPED_QUESTIONS) {
      rows.push({ question, profile, answer: await ask(question, profile) });
    }
  }
  return rows;
}

describe("eval: material yang dijawab milik siapa", () => {
  it("leak rate 0 berpasangan dengan scope recall 1,0", async () => {
    const rows = await scopedRows();
    const metrics = measureScoped(rows);
    // Reported together on purpose. A refusal scores leakRate 0 on its own,
    // and a registry dump scores coverage 1 on its own; only the pair says
    // the answer was about this reader and about all of them.
    expect({ scopeRecall: metrics.scopeRecall, leakRate: metrics.leakRate }).toEqual({ scopeRecall: 1, leakRate: 0 });
    expect(metrics.coverage).toBe(1);
  });

  it("denominator mengikuti himpunan yang dihitung", async () => {
    const rows = await scopedRows();
    expect(measureScoped(rows).denominatorHonesty).toBe(1);
  });

  it("konsistensi jawaban-layar pada himpunan simbol", async () => {
    // What the panel says and what the reader's own screen computes are the
    // same set, symbol for symbol — not merely overlapping.
    for (const profile of READERS) {
      const answer = await ask("kasus apa saja yang aktif", profile);
      expect(new Set(symbolsIn(answer))).toEqual(new Set(profile.watchlist));
    }
  });

  it("pertanyaan registry tetap dijawab dengan denominator registry", async () => {
    for (const profile of READERS) {
      for (const question of REGISTRY_QUESTIONS) {
        const answer = await ask(question, profile);
        expect(answer.scope, question).not.toBe("user");
        expect(answer.text, question).toContain(String(registry.length));
      }
    }
  });
});

describe("eval: penunjuk percakapan", () => {
  it("akurasi anafora 1,0 pada daftar yang baru disebut", async () => {
    let correct = 0;
    let total = 0;
    for (const profile of READERS) {
      const [first, second] = profile.watchlist;
      const history: HistoryTurn[] = [
        { role: "user", text: "kasus apa saja yang aktif" },
        { role: "assistant", text: "Daftar kasus.", symbols: [first, second] },
      ];
      const answer = await ask("yang satunya?", profile, { history });
      total += 1;
      if ((answer.entryIds ?? [])[0] === `case:${second}` && answer.relatedSymbols.includes(second)) correct += 1;
    }
    expect(correct / total).toBe(1);
  });

  it("hit rate cache follow-up naik dari nol, dan tetap nol ketika penunjuk gagal", () => {
    const [first, second] = READERS[0].watchlist;
    const history: HistoryTurn[] = [
      { role: "user", text: "kasus apa saja yang aktif" },
      { role: "assistant", text: "Daftar kasus.", symbols: [first, second] },
    ];
    // Cacheable is `!anaphoric || resolved` at the compose seam. Before the
    // pointer resolved, every follow-up was anaphoric-and-unresolved, so the
    // rate over this set was 0 by construction.
    const resolved = ["yang satunya?", "kalau yang satunya gimana"].map((question) =>
      resolveFollowUp(question, history));
    const cacheable = resolved.filter((item) => !item.anaphoric || item.resolved).length;
    expect(cacheable / resolved.length).toBe(1);

    // A pointer with nothing to point at is never written to the cache: the
    // answer it produces belongs to that conversation alone.
    const orphan = resolveFollowUp("yang satunya?", []);
    expect(orphan.anaphoric && !orphan.resolved).toBe(true);
  });
});

describe("eval: metrik ini mengukur sesuatu", () => {
  it("jatuh ketika jawaban scoped diganti jawaban registry", async () => {
    // Sensitivity, checked two ways.
    //
    // Here, as a mutation of the measurement: the scoped questions are scored
    // against the answer the engine gives WITHOUT scope — the registry-wide
    // coverage answer, which is what dropping the enforcement produces. A
    // harness that still reports 1,0 against that is measuring nothing.
    //
    // And against the code itself: forcing `scopedFirst` to false in
    // `lib/agent/retrieval/bundle.ts` — the line that keeps a scoped question
    // away from the aggregate path — fails this file and
    // `tests/golden-scoped.test.ts`, eight cases in total. That is the check
    // that the enforcement, not just the metric, is guarded.
    const profile = READERS[0];
    const unscoped = await ask("ada berapa emiten yang punya kasus lengkap", profile);
    const rows: ScopedRow[] = SCOPED_QUESTIONS.map((question) => ({ question, profile, answer: unscoped }));
    const metrics = measureScoped(rows);
    expect(metrics.scopeRecall).toBeLessThan(1);
    expect(metrics.leakRate).toBeGreaterThan(0);
    expect(metrics.denominatorHonesty).toBeLessThan(1);
  });
});

describe("eval: lapis pembelajaran tidak menyentuh jawaban asisten (P4)", () => {
  it("urutan daftar mengikuti pantauan pembaca, apa pun feedbacknya", async () => {
    // The decision recorded on /ai-learning: feedback orders the case list on
    // the Kasus screen, and nothing else. The assistant names every watched
    // issuer in watchlist order, so no row can be lifted or buried by a rating
    // — and there is no reader feedback on the wire to do it with.
    // A watchlist deliberately out of registry order, mixing issuers with a
    // complete case and issuers without one.
    const profile = profileWith([analysed[2], unanalysed[0], analysed[0]]);
    const answer = await ask("kasus apa saja yang aktif", profile);
    expect(new Set(symbolsIn(answer))).toEqual(new Set(profile.watchlist));

    const open = profile.watchlist.filter((symbol) => coverageInfo[symbol]?.analyzed);
    const incomplete = profile.watchlist.filter((symbol) => !coverageInfo[symbol]?.analyzed);
    const openAt = open.map((symbol) => answer.text.indexOf(symbol));
    // The reader's own order inside the complete cases, kept as typed.
    expect(openAt).toEqual([...openAt].sort((first, second) => first - second));
    // And the incomplete ones after them, named rather than dropped.
    for (const symbol of incomplete) {
      expect(answer.text.indexOf(symbol)).toBeGreaterThan(Math.max(...openAt));
    }
  });

  it("permintaan tidak membawa feedback atau preferensi pembaca", async () => {
    const { chatRequestSchema } = await import("@/lib/schemas");
    const accepted = await import("@/lib/schemas").then(() => chatRequestSchema.safeParse({
      question: "kasus apa saja yang aktif",
      profile: READERS[0],
      feedback: [{ id: "x", action: "useful", createdAt: new Date().toISOString() }],
      preferences: [{ id: "y", label: "L", explanation: "E", source: "feedback", active: true }],
    }));
    expect(accepted.success).toBe(true);
    // Accepted because the schema is not strict, and dropped because it is not
    // a field: nothing downstream can read what was never parsed. This is the
    // check that keeps choice B honest if someone adds the fields later.
    expect(accepted.success && "feedback" in accepted.data).toBe(false);
    expect(accepted.success && "preferences" in accepted.data).toBe(false);
  });
});
