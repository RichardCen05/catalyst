import { expect, test, type Page } from "@playwright/test";
import { DEFAULT_THRESHOLDS } from "../../lib/agent/thresholds";

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

async function dismissTourIfOpen(page: Page) {
  const skip = page.getByRole("button", { name: "Lewati tur" });
  if (await skip.isVisible().catch(() => false)) {
    await skip.click();
  }
}

test("threshold slider persists and traces into the case", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/playbook");
  const slider = page.locator("#threshold-concentrationFloor");
  await expect(slider).toBeVisible();
  // Range input terkontrol React: pakai native setter agar onChange terpicu.
  await page.$eval("#threshold-concentrationFloor", (el) => {
    const input = el as HTMLInputElement;
    const setter = Object.getOwnPropertyDescriptor(window.HTMLInputElement.prototype, "value")?.set;
    if (setter) setter.call(input, "0.2");
    else input.value = "0.2";
    input.dispatchEvent(new Event("input", { bubbles: true }));
    input.dispatchEvent(new Event("change", { bubbles: true }));
  });
  await expect(page.getByText("diubah dari bawaan").first()).toBeVisible();
  await page.reload();
  await expect(page.locator("#threshold-concentrationFloor")).toHaveValue("0.2");

  // Kasus ANTM harus memuat appliedRules dari ambang konsentrasi. Jawaban
  // asisten "sesuai aturan saya" dibangun dari kasus yang sudah diberi aturan
  // pembaca, jadi ambang yang diubah terbaca di sana beserta nilai bawaannya.
  await page.goto("/cases/ANTM");
  await dismissTourIfOpen(page);
  await page.getByRole("button", { name: "Tanya asisten" }).click();
  const panel = page.getByRole("dialog", { name: "Asisten Catalyst" });
  const question = "Sesuai aturan saya, apa yang harus dicek dulu untuk ANTM?";
  await panel.getByLabel("Tanya Catalyst").fill(question);
  await panel.getByLabel("Tanya Catalyst").press("Enter");
  await expect(panel.getByRole("status")).toHaveCount(0, { timeout: 60_000 });
  const fallback = String(DEFAULT_THRESHOLDS.concentrationFloor).replace(".", "\\.");
  await expect(panel.getByRole("log", { name: "Percakapan asisten" })).toContainText(new RegExp(`Ambang konsentrasi 0\\.2.*bawaan ${fallback}`), { timeout: 30_000 });
});
