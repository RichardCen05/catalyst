import { describe, expect, it } from "vitest";
import { verifyDraft } from "@/lib/agent/llm/verify";
import type { Citation } from "@/lib/types";
const baseCitation: Citation = { id: "c1", provider: "Sectors API", endpoint: "/v2/news/", field: "title", asOf: "2026-09-11T00:00:00+07:00", label: "test" };
describe("verifyDraft", () => {
  it("approves when numbers trace back to evidence", () => {
    const result = verifyDraft("Volume naik 12% dan close di 2450.", ["12%", "2450", "2450."], [baseCitation]);
    expect(result.approved).toBe(true);
    expect(result.violations).toEqual([]);
  });
  it("rejects a number absent from evidence", () => {
    const result = verifyDraft("Volume naik 47% hari ini.", ["12%"], [baseCitation]);
    expect(result.approved).toBe(false);
    expect(result.violations.some((v) => v.includes("47%"))).toBe(true);
  });
  it("passes text with no numbers", () => {
    const result = verifyDraft("Belum ada bukti yang cukup.", [], []);
    expect(result.approved).toBe(true);
  });
  it("does not reject a not_found citation span", () => {
    const citations = [{ ...baseCitation, span: { documentId: "d1", start: 0, end: 0, match: "not_found" as const } }];
    expect(verifyDraft("Sumbernya belum bisa ditemukan.", [], citations).approved).toBe(true);
  });
});
