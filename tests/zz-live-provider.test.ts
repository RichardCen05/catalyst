import { describe, expect, it } from "vitest";
const live = process.env.LIVE_PROVIDER_PROBE === "1";
describe.skipIf(!live)("live openai-compatible provider", () => {
  it("writes a verified-shape Indonesian sentence", async () => {
    const { generateStructured } = await import("@/lib/agent/llm/client");
    const out = await generateStructured<{ sentence: string }>({
      model: process.env.LLM_MODEL!,
      systemInstruction: "Jawab dalam bahasa Indonesia. Satu kalimat. Hanya JSON.",
      contents: "Volume 1.234 lot, naik 12,5% dari rata-rata 30 hari. Jelaskan.",
      schema: { type: "object", properties: { sentence: { type: "string" } }, required: ["sentence"], additionalProperties: false },
    });
    console.log("LIVE:", JSON.stringify(out));
    expect(typeof out.sentence).toBe("string");
  }, 60000);
});
