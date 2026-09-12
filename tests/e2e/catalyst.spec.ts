import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function finishSetup(page: Page) {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Lanjut" }).click();
  await dialog.getByRole("button", { name: "Masuk dan mulai tur" }).click();
  await page.getByRole("dialog", { name: "Mulai dari perubahan" }).getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { name: /Selamat datang/ })).toBeVisible();
}

test("first-time tutorial guides the core research flow", async ({ page }) => {
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await setup.getByRole("button", { name: "Lanjut" }).click();
  await setup.getByRole("button", { name: "Masuk dan mulai tur" }).click();

  const tour = page.getByRole("dialog");
  await expect(tour).toHaveAccessibleName("Mulai dari perubahan");
  await tour.getByRole("button", { name: "Berikutnya" }).click();
  await expect(tour).toHaveAccessibleName("Pilih atau bandingkan emiten");
  await expect(page).toHaveURL(/\/companies$/);
  await tour.getByRole("button", { name: "Berikutnya" }).click();
  await expect(tour).toHaveAccessibleName("Baca bukti dalam urutan waktu");
  await expect(page).toHaveURL(/\/companies\/ANTM$/);
  await tour.getByRole("button", { name: "Berikutnya" }).click();
  await expect(tour).toHaveAccessibleName("Uji jalur sebab-akibat");
  await expect(page).toHaveURL(/\/impact\?company=ANTM$/);
  await tour.getByRole("button", { name: "Berikutnya" }).click();
  await expect(tour).toHaveAccessibleName("Tanya dan koreksi");
  await expect(page).toHaveURL(/\/copilot$/);
  await tour.getByRole("button", { name: "Selesai" }).click();
  await expect(tour).toBeHidden();
});

test("Today prioritizes changes and removes dashboard clutter", async ({ page }) => {
  await finishSetup(page);
  await expect(page.getByRole("heading", { name: "Berubah sejak pemeriksaan terakhir" })).toBeVisible();
  await expect(page.getByText("Emiten fixture")).toHaveCount(0);
  await expect(page.getByText("Agent health")).toHaveCount(0);
  await expect(page.getByText(/Filing operasi baru/)).toBeVisible();
});

test("default theme uses the Graphite Aubergine tokens", async ({ page }) => {
  await finishSetup(page);
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.getPropertyValue("--background").trim(),
      surface: style.getPropertyValue("--surface").trim(),
      primary: style.getPropertyValue("--primary").trim(),
    };
  });
  expect(tokens).toEqual({ background: "#0b0a0f", surface: "#15121b", primary: "#c4a7ff" });
});

test("Companies defaults to ready watchlist and opens comparison workbench", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/companies");
  await expect(page.getByText("BMRI", { exact: true })).toHaveCount(0);
  await page.getByRole("checkbox", { name: "Pilih ANTM untuk dibandingkan" }).check();
  await page.getByRole("checkbox", { name: "Pilih BBCA untuk dibandingkan" }).check();
  await page.getByRole("link", { name: "Bandingkan 2 emiten" }).click();
  await expect(page).toHaveURL(/\/compare\?symbols=ANTM%2CBBCA$/);
  await expect(page.getByRole("heading", { name: "Perbandingan bukti" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ANTM" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "BBCA" })).toBeVisible();
  await page.getByRole("button", { name: "Tanya perbandingan" }).click();
  const copilot = page.getByRole("dialog", { name: "Catalyst Copilot" });
  await expect(copilot.getByText("Perbandingan ANTM · BBCA", { exact: true })).toBeVisible();
  await expect(copilot.getByLabel("Tanya Catalyst")).toHaveValue("Bandingkan empat pilar ANTM dan BBCA tanpa skor gabungan.");
});

test("evidence opens Copilot with its company and pillar context", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/companies/ANTM");
  await page.getByRole("button", { name: "Tanya pilar Konsentrasi" }).click();
  const copilot = page.getByRole("dialog", { name: "Catalyst Copilot" });
  await expect(copilot).toBeVisible();
  await expect(copilot.getByText("ANTM · Konsentrasi", { exact: true })).toBeVisible();
  await expect(copilot.getByLabel("Tanya Catalyst")).toHaveValue("Jelaskan bukti Konsentrasi untuk ANTM.");
  await copilot.getByRole("button", { name: "Tutup copilot" }).click();
  await expect(copilot).toBeHidden();
});

test("company analysis aligns events on an evidence timeline", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/companies/ANTM");
  await expect(page.getByRole("heading", { name: "Evidence timeline" })).toBeVisible();
  await expect(page.getByText("ANTM memublikasikan pembaruan operasi kuartalan")).toBeVisible();
  await page.getByRole("button", { name: "Tanya timeline ANTM" }).click();
  await expect(page.getByRole("dialog", { name: "Catalyst Copilot" }).getByText("ANTM · Evidence timeline", { exact: true })).toBeVisible();
});

test("user completes setup and opens a four-pillar company case", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("link", { name: /ANTM/ }).first().click();
  await expect(page.getByRole("heading", { name: "Empat pilar bukti" })).toBeVisible();
  await expect(page.getByText("Plan → Query → Verify → Summarize")).toHaveCount(0);
  await page.getByRole("button", { name: "Buka audit" }).click();
  const audit = page.getByRole("dialog", { name: "Audit analisis ANTM" });
  await expect(audit.getByText("Plan → Query → Verify → Summarize")).toBeVisible();
  await audit.getByRole("button", { name: "Tutup audit" }).click();
  await page.getByRole("button", { name: /Fokus chart/ }).click();
  await expect(page.getByRole("dialog", { name: "ANTM vs IHSG" })).toBeVisible();
  await page.getByRole("button", { name: "Tutup chart" }).click();
});

test("causal map exposes multiple sources and copilot answers through the API", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/impact?event=evt-nickel");
  await expect(page.getByRole("heading", { name: "Lacak sebab, mekanisme, dan bukti" })).toBeVisible();
  await expect(page.getByText(/Curah hujan tinggi diuji/).first()).toBeVisible();
  await page.getByRole("link", { name: "Copilot", exact: true }).click();
  await page.getByLabel("Tanya Catalyst").fill("Berita nikel ini berdampak ke watchlist saya?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/ANTM: Supported/)).toBeVisible();
});

test("causal map labels hypotheses, confidence, lag, and counter-evidence", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/impact?company=ANTM");
  await page.getByRole("button", { name: /mechanism potensi realisasi harga/i }).click();
  const selected = page.getByLabel("Detail node terpilih");
  await expect(selected.getByText("Causal hypothesis", { exact: true })).toBeVisible();
  await expect(selected.getByText("High confidence", { exact: true })).toBeVisible();
  await expect(selected.getByText("1-10 sesi", { exact: true })).toBeVisible();
  await expect(selected.getByText(/Counter-evidence/)).toBeVisible();
  await selected.getByRole("button", { name: "Tanya jalur ini" }).click();
  await expect(page.getByRole("dialog", { name: "Catalyst Copilot" }).getByText(/ANTM · potensi realisasi harga/)).toBeVisible();
});

test("user correction becomes a reversible open hypothesis", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/companies/ANTM");
  const note = "Kontrak ekspor belum dibedakan antara denominasi USD dan IDR.";
  await page.getByLabel("Apa yang keliru atau belum dipertimbangkan?").fill(note);
  await page.getByLabel("Referensi pendukung (opsional)").fill("https://www.bi.go.id/");
  await page.getByRole("button", { name: "Kirim untuk verifikasi" }).click();
  await expect(page.getByText("Tersimpan sebagai hipotesis terbuka")).toBeVisible();
  await page.goto("/agent");
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka referensi user" })).toHaveAttribute("href", "https://www.bi.go.id/");
  await expect(page.getByRole("heading", { name: "1 hipotesis menunggu verifikasi" })).toBeVisible();
  await page.getByRole("button", { name: "Tandai sudah diuji" }).click();
  await expect(page.getByRole("button", { name: "Kembalikan ke antrean" })).toBeVisible();
  await expect(page.getByText("2 perubahan status")).toBeVisible();
});

test("formula details and source destinations are inspectable", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/companies/ANTM");
  await page.getByText("Lihat perhitungan dan semua input").first().click();
  await expect(page.getByText(/HHI =/).first()).toBeVisible();
  await page.getByRole("button", { name: /Periksa field sumber/ }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Endpoint");
  await expect(page.getByRole("link", { name: /Buka dokumentasi endpoint/ }).first()).toHaveAttribute("href", /^https:\/\//);
});

test("copilot has a dedicated searchable workspace", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("link", { name: /Tanya agent/ }).first().click();
  await expect(page.getByRole("heading", { name: "Cari jawaban dari bukti" })).toBeVisible();
  await page.getByLabel("Tanya Catalyst").fill("Data apa yang belum diperiksa untuk ANTM?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/Data intraday/)).toBeVisible();
});

test("profile changes presentation order while the ANTM verdict stays fixed", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/agent");
  const maya = page.getByRole("button", { name: /Maya/ });
  await maya.click();
  await expect(maya).toHaveAttribute("aria-pressed", "true");
  await page.goto("/companies/ANTM");
  const cards = page.locator("section[aria-labelledby='pillars-title'] article h3");
  await expect(cards.first()).toHaveText("Katalis");
  await expect(page.getByText("Corroborated").first()).toBeVisible();
});

test("theme persists and core routes do not overflow target breakpoints", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Ganti tema" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  for (const [width, height] of [[375, 812], [667, 375], [768, 900], [1024, 900], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(width === 375 ? "/impact?company=ANTM" : "/companies");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/companies/ANTM");
  await page.evaluate(() => { document.documentElement.style.fontSize = "125%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), "overflow with enlarged text").toBe(false);
});

test("core routes have no automatic WCAG A or AA violations", async ({ page }) => {
  await finishSetup(page);
  const routes = ["/", "/companies", "/compare?symbols=ANTM%2CBBCA", "/companies/ANTM", "/impact", "/copilot", "/agent", "/method"];
  for (const theme of ["dark", "light"] as const) {
    if (theme === "light") {
      await page.goto("/");
      await page.getByRole("button", { name: "Ganti tema" }).click();
    }
    for (const route of routes) {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, `${theme} ${route}: ${results.violations.map((item) => item.id).join(", ")}`).toEqual([]);
    }
  }
});
