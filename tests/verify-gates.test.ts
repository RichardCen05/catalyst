import { describe, expect, it } from "vitest";
import { detectLanguage, verifyAnswer } from "@/lib/agent/llm/verify";

describe("detectLanguage", () => {
  it("names Indonesian and English from function words", () => {
    expect(detectLanguage("Konsentrasi ini tinggi karena tiga broker yang sama")).toBe("id");
    expect(detectLanguage("The concentration is high because the same three brokers")).toBe("en");
  });

  it("returns unknown when nothing decides it", () => {
    expect(detectLanguage("ANTM 27,5%")).toBe("unknown");
  });
});

describe("verifyAnswer", () => {
  const question = "Kenapa ANTM masuk daftar hari ini?";

  it("approves a grounded Indonesian answer", () => {
    const result = verifyAnswer("Konsentrasi broker ANTM mencapai 27,5% pada rekaman ini.", ["27,5%"], question);
    expect(result.approved).toBe(true);
  });

  it("rejects a numeral the evidence never carried", () => {
    const result = verifyAnswer("Konsentrasi broker mencapai 91,4% pada rekaman ini.", ["27,5%"], question);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("91,4%");
  });

  it("rejects advisory phrasing the numeral rule cannot see", () => {
    const result = verifyAnswer("Konsentrasi ini tinggi, sebaiknya beli sekarang.", [], question);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("advisory");
  });

  it("rejects an English answer to an Indonesian question", () => {
    const result = verifyAnswer("The concentration is high because the same brokers repeat.", [], question);
    expect(result.approved).toBe(false);
    expect(result.violations.join(" ")).toContain("language");
  });

  it("allows an English answer to an English question", () => {
    const result = verifyAnswer("The concentration is high because the same brokers repeat.", [], "Why is ANTM listed today?");
    expect(result.approved).toBe(true);
  });
});
