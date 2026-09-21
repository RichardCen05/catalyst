import { describe, expect, it } from "vitest";
import { lruMemo } from "@/lib/agent/retrieval/memo";

describe("lruMemo", () => {
  it("mengembalikan nilai yang disimpan", () => {
    const memo = lruMemo<string, number>(2);
    memo.set("a", 1);
    expect(memo.get("a")).toBe(1);
  });

  it("membuang entri paling lama tidak dipakai setelah melewati batas", () => {
    const memo = lruMemo<string, number>(2);
    memo.set("a", 1);
    memo.set("b", 2);
    memo.set("c", 3);
    expect(memo.get("a")).toBeUndefined();
    expect(memo.get("b")).toBe(2);
    expect(memo.get("c")).toBe(3);
    expect(memo.size()).toBe(2);
  });

  it("membaca dihitung sebagai memakai, jadi entri yang dibaca bertahan lebih lama", () => {
    const memo = lruMemo<string, number>(2);
    memo.set("a", 1);
    memo.set("b", 2);
    memo.get("a");
    memo.set("c", 3);
    expect(memo.get("a")).toBe(1);
    expect(memo.get("b")).toBeUndefined();
  });

  it("menyimpan nilai null tanpa mengira entri itu tidak ada", () => {
    // buildAnalysis mengembalikan null untuk emiten tanpa kasus lengkap, dan
    // null itu hasil yang sah — kalau memo memperlakukannya sebagai gagal,
    // dua belas emiten dihitung ulang pada setiap permintaan.
    const memo = lruMemo<string, number | null>(2);
    memo.set("a", null);
    expect(memo.has("a")).toBe(true);
    expect(memo.get("a")).toBeNull();
    expect(memo.has("b")).toBe(false);
  });

  it("menimpa nilai lama pada kunci yang sama tanpa menambah ukuran", () => {
    const memo = lruMemo<string, number>(2);
    memo.set("a", 1);
    memo.set("a", 2);
    expect(memo.get("a")).toBe(2);
    expect(memo.size()).toBe(1);
  });
});
