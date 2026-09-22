import { describe, expect, it } from "vitest";
import { SYMBOL_ALIASES, expandEnclitics, stripEnclitics } from "@/lib/agent/query";
import { DEFAULT_THRESHOLDS } from "@/lib/agent/thresholds";

describe("pelepasan enklitik", () => {
  it("melepas akhiran milik pada kata yang cukup panjang", () => {
    expect(stripEnclitics("pantauanku")).toBe("pantauan");
    expect(stripEnclitics("kasusku")).toBe("kasus");
    expect(stripEnclitics("emitenku")).toBe("emiten");
    expect(stripEnclitics("kasusnya")).toBe("kasus");
    expect(stripEnclitics("pantauanmu")).toBe("pantauan");
  });

  it("tidak memotong kata yang terlalu pendek untuk dipotong", () => {
    // Sisa yang lebih pendek daripada ambang bukan kata yang diindeks korpus
    // mana pun, jadi memotongnya hanya membuang kata aslinya.
    expect(stripEnclitics("aku")).toBeNull();
    expect(stripEnclitics("punya")).toBeNull();
    expect(DEFAULT_THRESHOLDS.encliticMinStemChars).toBeGreaterThan(0);
  });

  it("tidak pernah memotong alias emiten", () => {
    // Nama emiten yang kebetulan berakhiran enklitik harus tetap utuh, atau
    // pertanyaan tentang emiten itu menyentuh entri yang salah.
    const aliases = Object.values(SYMBOL_ALIASES).flat().filter(Boolean) as string[];
    for (const alias of aliases) {
      if (alias.includes(" ")) continue;
      expect(stripEnclitics(alias), alias).toBeNull();
    }
  });

  it("menyimpan dua bentuk, bukan menggantikan bentuk asli", () => {
    const expanded = expandEnclitics(["pantauanku", "aktif"]);
    expect(expanded).toContain("pantauanku");
    expect(expanded).toContain("pantauan");
    expect(expanded).toContain("aktif");
  });

  it("tidak menambah bentuk untuk kata tanpa enklitik", () => {
    expect(expandEnclitics(["kasus"])).toEqual(["kasus"]);
  });
});
