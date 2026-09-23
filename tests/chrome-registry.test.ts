import { execFileSync } from "node:child_process";
import { describe, expect, it } from "vitest";
import { CHROME_BLOCKS, CHROME_NAV } from "@/lib/data/chrome.generated";
import { buildChromeBundle, pageLabel } from "@/lib/agent/retrieval/context/chrome";
import { retrieveContext } from "@/lib/agent/retrieval/bundle";
import { VIEW_IDS, type RequestContext } from "@/lib/agent/retrieval/types";
import { demoProfiles } from "@/lib/data/fixtures";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

/**
 * The Dashboard's causal-map panel, held by id rather than by its words.
 *
 * These tests used to name the heading "Semua kasus dalam satu jalur". A UI
 * pass renamed that panel and five tests failed for a reason that had nothing
 * to do with what they check — that a panel a reader quotes is found, carries
 * its page, and pulls that page in once. The heading is read from the
 * registry so the next rename is a rebuild, not a test edit.
 */
const MAP_BLOCK_ID = "chrome:dashboard:peta-sebab-akibat-seluruh-kasus";
const MAP_BLOCK_HEADING = CHROME_BLOCKS.find((row) => row.id === MAP_BLOCK_ID)!.heading;

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
    // Judulnya ikut berubah saat layar dirombak, jadi yang dipegang adalah
    // id bloknya — panel yang sama, dinamai oleh generator dari sumbernya.
    const block = CHROME_BLOCKS.find((row) => row.id === MAP_BLOCK_ID);
    expect(block).toBeDefined();
    expect(block?.view).toBe("dashboard");
    expect(block?.labels?.length).toBeGreaterThan(0);
  });

  it("memakai nama halaman dari menu samping, bukan dari palet perintah", () => {
    // Palet menulis "Buka Dashboard"; yang dipakai menyebut halaman adalah
    // "Dashboard", nama yang sama yang dibaca pembaca di menu.
    expect(pageLabel("dashboard")).toBe("Dashboard");
  });

  it("menyebut kata-kata panel dan halaman pemiliknya", async () => {
    const bundle = await buildChromeBundle(MAP_BLOCK_ID);
    expect(bundle.kind).toBe("chrome");
    expect(bundle.title).toBe(MAP_BLOCK_HEADING);
    expect(bundle.body).toContain(MAP_BLOCK_HEADING);
    expect(bundle.body).toContain("halaman Dashboard");
    // Halamannya ditandai, bukan disalin: isinya diambil sekali oleh
    // retrieveContext, berapa pun panel di halaman itu yang cocok.
    expect(bundle.view).toBe("dashboard");
  });

  it("mengambil materi halaman sekali walau beberapa panelnya cocok", async () => {
    const retrieved = await retrieveContext(`apa maksud dari ${MAP_BLOCK_HEADING}`, {
      ...context, view: "dashboard",
    });
    expect(retrieved).not.toBeNull();
    expect(retrieved!.entryIds).toContain(MAP_BLOCK_ID);
    // Isi Dashboard ikut, dan hanya satu kali.
    expect(retrieved!.entryIds.filter((id) => id === "view:dashboard")).toHaveLength(1);
    const marker = "Hitungan papan saat ini";
    expect(retrieved!.readerText.split(marker)).toHaveLength(2);
  });

  it("menolak blok yang tidak ada alih-alih mengarang panel", async () => {
    await expect(buildChromeBundle("chrome:dashboard:tidak-ada")).rejects.toThrow();
  });
});
