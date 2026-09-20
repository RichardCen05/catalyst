import { describe, expect, it } from "vitest";
import { toCsv } from "@/lib/utils";

describe("toCsv", () => {
  it("quotes every cell so a separator inside a value cannot split a column", () => {
    expect(toCsv([["Tanggal", "Penutupan"], ["2026-09-11", "1.234,5"]]))
      .toBe('"Tanggal","Penutupan"\r\n"2026-09-11","1.234,5"');
  });

  it("escapes embedded quotes rather than ending the field", () => {
    expect(toCsv([['say "hi"']])).toBe('"say ""hi"""');
  });

  it("returns an empty string for no rows", () => {
    expect(toCsv([])).toBe("");
  });
});
