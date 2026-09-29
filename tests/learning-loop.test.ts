import { afterEach, beforeEach, describe, expect, it, vi } from "vitest";
import { agentEngine } from "@/lib/agent/engine";
import { demoProfiles } from "@/lib/data/fixtures";
import { defaultPlaybook } from "@/lib/store";
import type { UserInsight } from "@/lib/types";

vi.mock("@/lib/agent/llm/client", () => ({
  generateStructured: vi.fn(),
}));

import { generateStructured } from "@/lib/agent/llm/client";

// A note written on the AI Learning page used to stop at `insightTraces`: the
// answer recorded that "a note asked for a re-check" and the model never read
// what the note said. These pin the loop closed at the engine.

const profile = demoProfiles[0];
const question = "Kenapa ANTM masuk daftar?";

function note(id: string, symbol: UserInsight["symbol"], text: string, status: UserInsight["status"] = "pending", createdAt = "2026-09-29T00:00:00.000Z"): UserInsight {
  return { id, symbol, category: "alternative-interpretation", note: text, status, createdAt, reviewHistory: [] };
}

function answerPrompts(): string[] {
  return vi.mocked(generateStructured).mock.calls
    .map(([params]) => (params as { contents: string }).contents)
    .filter((contents) => contents.startsWith("Pertanyaan:"));
}

describe("the reader's notes reach the answer", () => {
  beforeEach(() => {
    process.env.AGENT_MODE = "llm";
    vi.mocked(generateStructured).mockReset();
    vi.mocked(generateStructured).mockImplementation(async (params: { schema: Record<string, unknown> }) => {
      if ("relevanceBand" in (params.schema.properties as Record<string, unknown>)) {
        return { path: "Pemicu -> margin -> harga", label: "Margin tertekan", direction: "Adverse", relevanceBand: "high", rationale: "Jalur uji." } as never;
      }
      return { text: "Jawaban model untuk pengujian." } as never;
    });
  });
  afterEach(() => {
    delete process.env.AGENT_MODE;
  });

  it("sends the note for the emiten asked about, newest first", async () => {
    const older = note("insight-old", "ANTM", "Catatan lama tentang harga emas.", "pending", "2026-09-20T00:00:00.000Z");
    const newer = note("insight-new", "ANTM", "Catatan baru tentang volume asing.", "incorporated", "2026-09-28T00:00:00.000Z");
    await agentEngine.answerFollowUp({ question, profile, userInsights: [older, newer] });
    const prompts = answerPrompts();
    expect(prompts.length).toBeGreaterThan(0);
    const last = prompts.at(-1)!;
    expect(last).toContain("Catatan baru tentang volume asing.");
    expect(last.indexOf("Catatan baru")).toBeLessThan(last.indexOf("Catatan lama"));
  });

  it("does not send another emiten's note or a dismissed one", async () => {
    await agentEngine.answerFollowUp({
      question, profile,
      userInsights: [note("insight-pgas", "PGAS", "Catatan untuk PGAS saja."), note("insight-off", "ANTM", "Catatan yang sudah diabaikan.", "dismissed")],
    });
    const joined = answerPrompts().join("\n");
    expect(joined).not.toContain("Catatan untuk PGAS saja.");
    expect(joined).not.toContain("Catatan yang sudah diabaikan.");
    expect(joined).not.toContain("Catatan pembaca");
  });

  it("quotes the note in the trace the reader can check", async () => {
    const answer = await agentEngine.answerFollowUp({ question, profile, userInsights: [note("insight-q", "ANTM", "Kenaikan karena emas.")] });
    const trace = answer.hypotheses.find((item) => item.id === "insight-q");
    expect(trace?.hypothesis).toContain("Kenaikan karena emas.");
  });
});

describe("the rule summary names the rule the case applies", () => {
  it("reads the reader's approved rule for this emiten before the default", async () => {
    const approved = "[Disetujui ANTM] Pemicu harus menyentuh margin operasi.";
    const other = "[Disetujui PGAS] Aturan milik emiten lain.";
    const playbook = { ...structuredClone(defaultPlaybook), materialityRules: [...defaultPlaybook.materialityRules, other, approved] };
    const answer = await agentEngine.answerFollowUp({ question, profile, playbook });
    expect(answer.preferenceNote).toContain(approved);
    expect(answer.preferenceNote).not.toContain(other);
  });
});
