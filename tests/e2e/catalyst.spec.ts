import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function finishSetup(page: Page) {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Atur cara Catalyst bekerja" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Lanjut" }).click();
  await dialog.getByRole("button", { name: "Lanjut" }).click();
  await dialog.getByRole("button", { name: "Lanjut" }).click();
  await dialog.getByRole("button", { name: "Masuk ke Today" }).click();
  await expect(page.getByRole("heading", { name: /Selamat datang/ })).toBeVisible();
}

test("user completes setup and opens a four-pillar company case", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("link", { name: /ANTM/ }).first().click();
  await expect(page.getByRole("heading", { name: "Empat pilar bukti" })).toBeVisible();
  await expect(page.getByText("Plan → Query → Verify → Summarize")).toBeVisible();
  await page.getByRole("button", { name: /Fokus chart/ }).click();
  await expect(page.getByRole("dialog", { name: "ANTM vs IHSG" })).toBeVisible();
  await page.getByRole("button", { name: "Tutup chart" }).click();
});

test("causal map exposes multiple sources and copilot answers through the API", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/impact?event=evt-nickel");
  await expect(page.getByRole("heading", { name: "Lacak sebab, mekanisme, dan bukti" })).toBeVisible();
  await expect(page.getByText("Harga nikel → potensi realisasi harga → arus kas operasi")).toBeVisible();
  await expect(page.getByText(/Curah hujan tinggi diuji/).first()).toBeVisible();
  await page.getByRole("link", { name: "Copilot", exact: true }).click();
  await page.getByLabel("Tanya Catalyst").fill("Berita nikel ini berdampak ke watchlist saya?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/ANTM: Supported/)).toBeVisible();
});

test("user correction becomes a reversible open hypothesis", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/companies/ANTM");
  const note = "Kontrak ekspor belum dibedakan antara denominasi USD dan IDR.";
  await page.getByLabel("Apa yang keliru atau belum dipertimbangkan?").fill(note);
  await page.getByRole("button", { name: "Kirim untuk verifikasi" }).click();
  await expect(page.getByText("Tersimpan sebagai hipotesis terbuka")).toBeVisible();
  await page.goto("/agent");
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByRole("heading", { name: "1 hipotesis menunggu verifikasi" })).toBeVisible();
  await page.getByRole("button", { name: "Tandai sudah diperiksa" }).click();
  await expect(page.getByRole("button", { name: "Kembalikan ke antrean" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Cari jawaban dari bukti yang sudah diperiksa" })).toBeVisible();
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
  const routes = ["/", "/companies", "/companies/ANTM", "/impact", "/copilot", "/agent", "/method"];
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
