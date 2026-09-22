import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CHROME_BLOCKS, CHROME_NAV } from "@/lib/data/chrome.generated";
import { buildChromeBundle, pageLabel } from "@/lib/agent/retrieval/context/chrome";
import { retrieveContext } from "@/lib/agent/retrieval/bundle";
import { VIEW_IDS, type RequestContext } from "@/lib/agent/retrieval/types";
import { demoProfiles } from "@/lib/data/fixtures";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

describe("chrome registry", () => {
  it("cocok dengan sumbernya", () => {
    // Registri ini dibaca dari JSX. Kalau sebuah judul diubah tanpa
    // membangun ulang, asisten akan menjawab tentang kata yang sudah tidak
    // ada di layar — kegagalan yang tidak terlihat sampai ada yang bertanya.
    expect(() => execFileSync("node", ["scripts/build-chrome-registry.mjs", "--check"], { stdio: "pipe" })).not.toThrow();
  });

  it("menandai setiap blok ke halaman yang dikenal", () => {
    for (const block of CHROME_BLOCKS) {
      if (!block.view) continue;
      expect(VIEW_IDS, block.id).toContain(block.view);
    }
    for (const item of CHROME_NAV) {
      if (!item.view) continue;
      expect(VIEW_IDS, item.href).toContain(item.view);
    }
  });

  it("memuat judul peta di Dashboard beserta label kecilnya", () => {
    const block = CHROME_BLOCKS.find((row) => row.heading === "Semua kasus dalam satu jalur");
    expect(block).toBeDefined();
    expect(block?.view).toBe("dashboard");
    expect(block?.eyebrow).toBe("Peta sebab akibat");
  });

  it("memakai nama halaman dari menu samping, bukan dari palet perintah", () => {
    // Palet menulis "Buka Dashboard"; yang dipakai menyebut halaman adalah
    // "Dashboard", nama yang sama yang dibaca pembaca di menu.
    expect(pageLabel("dashboard")).toBe("Dashboard");
  });

  it("menyebut kata-kata panel dan halaman pemiliknya", async () => {
    const bundle = await buildChromeBundle("chrome:dashboard:semua-kasus-dalam-satu-jalur");
    expect(bundle.kind).toBe("chrome");
    expect(bundle.title).toBe("Semua kasus dalam satu jalur");
    expect(bundle.body).toContain("Peta sebab akibat");
    expect(bundle.body).toContain("halaman Dashboard");
    // Halamannya ditandai, bukan disalin: isinya diambil sekali oleh
    // retrieveContext, berapa pun panel di halaman itu yang cocok.
    expect(bundle.view).toBe("dashboard");
  });

  it("mengambil materi halaman sekali walau beberapa panelnya cocok", async () => {
    const retrieved = await retrieveContext("apa maksud dari Semua kasus dalam satu jalur", {
      ...context, view: "dashboard",
    });
    expect(retrieved).not.toBeNull();
    expect(retrieved!.entryIds).toContain("chrome:dashboard:semua-kasus-dalam-satu-jalur");
    // Isi Dashboard ikut, dan hanya satu kali.
    expect(retrieved!.entryIds.filter((id) => id === "view:dashboard")).toHaveLength(1);
    const marker = "Hitungan papan saat ini";
    expect(retrieved!.readerText.split(marker)).toHaveLength(2);
  });

  it("menolak blok yang tidak ada alih-alih mengarang panel", async () => {
    await expect(buildChromeBundle("chrome:dashboard:tidak-ada")).rejects.toThrow();
  });
});
