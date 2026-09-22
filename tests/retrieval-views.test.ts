import { describe, expect, it } from "vitest";
import { loadViewBundle } from "@/lib/agent/retrieval/context";
import { VIEW_IDS, type RequestContext, type ViewId } from "@/lib/agent/retrieval/types";
import { companies, demoProfiles } from "@/lib/data/fixtures";
import { CHROME_BLOCKS } from "@/lib/data/chrome.generated";
import { LAYERS } from "@/lib/learning-layers";

const context: RequestContext = { profile: demoProfiles[0], history: [] };

/**
 * Konteks yang benar untuk sebuah halaman.
 *
 * `/cases/[symbol]` tidak bisa dibuka tanpa simbol, jadi memeriksanya dengan
 * konteks tanpa simbol menguji keadaan yang tidak pernah ada di layar.
 * Simbolnya diambil dari registry, bukan diketik.
 */
const caseSymbol = companies.find((company) => company.analyzed)!.symbol;
function contextFor(view: ViewId): RequestContext {
  return view === "case" ? { ...context, contextSymbol: caseSymbol } : context;
}

/**
 * Pages that exist only as a redirect have nothing of their own to say.
 *
 * `/companies` and `/companies/[symbol]` both `redirect()` into `/cases`
 * (`app/companies/page.tsx`, `app/companies/[symbol]/page.tsx`), so the
 * reader never reads a screen of their own.
 */
const REDIRECTS: ViewId[] = ["companies", "company", "compare", "agent"];

describe("halaman yang dapat ditanyakan", () => {
  it("punya materi untuk setiap halaman yang membawa teks di layar", async () => {
    const withChrome = new Set(CHROME_BLOCKS.map((block) => block.view).filter(Boolean) as ViewId[]);
    const missing: ViewId[] = [];
    for (const view of withChrome) {
      if (REDIRECTS.includes(view)) continue;
      const bundle = await loadViewBundle(view, contextFor(view));
      if (!bundle) missing.push(view);
    }
    // Sebuah panel yang tidak dapat menyebut isi halamannya hanya bisa
    // mengulang kata-katanya sendiri, dan itu bukan jawaban.
    expect(missing).toEqual([]);
  });

  it("tidak mengarang halaman yang tidak terdaftar", async () => {
    for (const view of REDIRECTS) {
      expect(await loadViewBundle(view, context), view).toBeNull();
    }
  });

  it("menyebut hitungan papan dengan kata yang sama seperti di layar", async () => {
    const bundle = await loadViewBundle("dashboard", context);
    expect(bundle).not.toBeNull();
    // Kata yang sama dengan strip hitungan di layar, dicocokkan tanpa
    // memedulikan huruf besar: baris berlabel memakai huruf kapital di awal.
    const body = bundle!.body.toLowerCase();
    for (const label of ["kasus terbuka di peta", "sumber terekam", "pemicu bersama", "jalur dipakai bersama", "dampak bisnis dapat diuji"]) {
      expect(body, label).toContain(label);
    }
    // Satu baris satu angka: label dan angkanya harus dalam baris yang sama,
    // karena model kecil mengikat label ke angka pada baris berikutnya kalau
    // beberapa angka dijejalkan dalam satu kalimat.
    const shared = bundle!.body.split("\n").find((line) => line.includes("Jalur dipakai bersama"));
    expect(shared).toMatch(/:\s*\d+\.$/);
    // Angka pada badan teks harus ikut ke daftar figur, karena itu yang
    // dipakai pemeriksa untuk menilai draf model.
    expect(bundle!.figures.length).toBeGreaterThan(0);
  });

  it("menghitung ambang metode dari tabelnya sendiri", async () => {
    const bundle = await loadViewBundle("method", context);
    expect(bundle!.body).toContain("dipilih manusia");
    // Tidak ada rekaman di balik pilihan ambang, jadi tidak ada yang dikutip.
    expect(bundle!.citations).toEqual([]);
  });

  it("menyebut sumber yang diawasi pada halaman Pantau", async () => {
    const bundle = await loadViewBundle("pantau", context);
    expect(bundle!.title).toBe("Pantau web");
    expect(bundle!.body).toContain("review");
  });

  it("menjawab kemampuan asisten dari indeksnya sendiri", async () => {
    const bundle = await loadViewBundle("copilot", context);
    expect(bundle!.body).toContain("panel dan label di layar");
  });

  it("mengembalikan materi yang terisi untuk setiap halaman yang bukan pengalihan", async () => {
    // Melewati halaman tanpa bundel diam-diam membuat penjaga ini hijau
    // justru pada kasus yang harus ditangkapnya: halaman yang bisa dibuka
    // pembaca tetapi tidak punya materi sendiri.
    for (const view of VIEW_IDS) {
      if (REDIRECTS.includes(view)) continue;
      const bundle = await loadViewBundle(view, contextFor(view));
      expect(bundle, view).not.toBeNull();
      expect(bundle!.body.length, view).toBeGreaterThan(0);
      expect(bundle!.title.length, view).toBeGreaterThan(0);
    }
  });

  it("membaca lapis pembelajaran dari daftar yang sama dengan halamannya", async () => {
    const bundle = await loadViewBundle("ai-learning", context);
    for (const layer of LAYERS) expect(bundle!.body, layer.name).toContain(layer.name);
  });
});
