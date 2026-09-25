import { expect, test, type Page } from "@playwright/test";

async function finishSetup(page: Page) {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await expect(dialog).toBeVisible();
  // Setup is one step since the wizard collapsed to a single asset picker;
  // "Mulai tour" both completes onboarding and opens the guided tour.
  await dialog.getByRole("button", { name: "Mulai tour" }).click();
  await page.locator("[data-guided-tour-card]").getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
}

const ROUTES: { url: string; heading: string | RegExp }[] = [
  { url: "/", heading: "Dashboard" },
  { url: "/cases", heading: "Riset & Analisis" },
  { url: "/cases/ANTM", heading: /^ANTM$/ },
  { url: "/cases/ANTM?tab=market", heading: "Konfirmasi pasar" },
  { url: "/cases/ANTM?tab=business", heading: "Dampak ke bisnis" },
  { url: "/cases/ANTM?tab=review", heading: "Keputusan" },
  { url: "/impact?company=ANTM", heading: "Sebab akibat" },
  { url: "/compare?symbols=ANTM%2CBBCA", heading: /Banding|Bandingkan/ },
  { url: "/copilot", heading: "Asisten" },
  { url: "/ai-learning", heading: "AI Learning" },
  { url: "/ai-learning?section=tinjauan", heading: "Koreksi yang diterima" },
  { url: "/ai-learning?section=pasar", heading: "Klaim yang sudah dinilai" },
  { url: "/ai-learning?section=memori", heading: "Memori eksplisit" },
  { url: "/playbook", heading: /Playbook|Aturan riset/ },
  { url: "/pantau", heading: /^Pantau$/ },
  { url: "/method", heading: "Metode dan batas" },
];

test("route inventory: 200 + heading + no overflow at 3 viewports", async ({ page }) => {
  // One test walks every route at three widths; the budget is per route, not per test.
  test.setTimeout(ROUTES.length * 10_000);
  await finishSetup(page);
  for (const r of ROUTES) {
    const resp = await page.goto(r.url);
    expect(resp?.status(), `${r.url} status`).toBe(200);
    await expect(page.getByRole("heading", { name: r.heading }).first(), `${r.url} heading`).toBeVisible({ timeout: 15000 });
    const blank = await page.evaluate(() => (document.body.innerText ?? "").trim().length);
    expect(blank, `${r.url} blank`).toBeGreaterThan(50);
    for (const [w, h] of [[375, 812], [768, 900], [1440, 900]] as const) {
      await page.setViewportSize({ width: w, height: h });
      await page.waitForTimeout(150);
      const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
      expect(overflow, `${r.url} overflow at ${w}x${h}`).toBe(false);
    }
    await page.setViewportSize({ width: 1440, height: 900 });
  }
});

test("redirects: /companies and /companies/ANTM", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/companies");
  await expect(page).toHaveURL(/\/cases\?view=picker|\/cases\/ANTM/);
  await page.goto("/companies/ANTM");
  await expect(page).toHaveURL(/\/cases\/ANTM/);
});

test("reject path stays out of playbook", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=review");
  const resolution = page.getByRole("region", { name: "Hasil kasus" });
  await resolution.getByLabel("Hasil pemeriksaan").selectOption("challenged");
  const marker = `TolakMarker ${Date.now()}`;
  await resolution.getByLabel("Hipotesis akhir").fill(`Hipotesis tolak ${marker}.`);
  await resolution.getByLabel("Bukti yang membatalkan").fill(`Bukti tolak ${marker}.`);
  await resolution.getByLabel("Asumsi yang keliru").fill(`Asumsi tolak ${marker}.`);
  await resolution.getByLabel("Aturan yang dapat dipakai ulang").fill(`Aturan tolak ${marker}.`);
  await resolution.getByRole("button", { name: "Simpan hasil dan tutup kasus" }).click();
  await expect(resolution.getByText(/Hasil tersimpan/)).toBeVisible();
  await page.goto("/ai-learning?section=tinjauan");
  const proposal = page.locator("article", { hasText: marker }).first();
  await expect(proposal).toBeVisible();
  await proposal.getByRole("button", { name: "Tolak" }).click();
  await expect(page.getByText("ditolak", { exact: true }).first()).toBeVisible();
  await page.goto("/playbook");
  await expect(page.getByText(marker)).toHaveCount(0);
});
