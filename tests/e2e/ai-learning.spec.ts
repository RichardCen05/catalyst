import { expect, test, type Page } from "@playwright/test";

async function finishSetup(page: Page) {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  // Setup is one step since the wizard collapsed to a single asset picker;
  // "Mulai tour" both completes onboarding and opens the guided tour.
  await dialog.getByRole("button", { name: "Mulai tour" }).click();
  await page.locator("[data-guided-tour-card]").getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { name: "Apa yang menggerakkan daftar pantauan?" })).toBeVisible();
}

test("AI Learning traces feedback, correction, and accepted case rule without storing chat", async ({ page }) => {
  await finishSetup(page);

  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await page.getByRole("button", { name: "Berguna" }).click();
  await expect(page.getByRole("button", { name: "Berguna" })).toHaveAttribute("aria-pressed", "true");

  await page.goto("/ai-learning?filter=feedback");
  await expect(page.getByRole("heading", { name: "AI Learning" })).toBeVisible();
  const useful = page.getByRole("button", { name: /ANTM.*Bukti ini berguna.*Konsentrasi/ });
  await useful.click();
  const detail = page.getByRole("article", { name: "Detail Bukti ini berguna" });
  await expect(detail).toContainText("ANTM · Konsentrasi");
  await expect(detail).toContainText("Menaikkan urutan kasus sejenis di daftar Analisis dan Riset.");

  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await page.getByRole("button", { name: "Kurang relevan" }).click();
  await page.reload();
  await expect(page.getByRole("button", { name: "Kurang relevan" })).toHaveAttribute("aria-pressed", "true");
  await page.goto("/ai-learning?filter=feedback");
  await expect(page.getByRole("button", { name: /ANTM.*Bukti ini kurang relevan.*Konsentrasi/ })).toHaveCount(1);

  // Teaching from the AI Learning page itself: one issuer picker, one note.
  const correction = `Kontrak USD dan IDR belum dibedakan ${Date.now()}.`;
  await page.goto("/ai-learning");
  await page.getByLabel("Saham", { exact: true }).selectOption("ANTM");
  await page.getByLabel("Yang ingin Anda ajarkan").fill(correction);
  await page.getByRole("button", { name: "Ajarkan ke Catalyst" }).click();
  await expect(page.getByText("Tersimpan untuk ANTM")).toBeVisible();
  await page.goto("/ai-learning?filter=insight");
  await page.getByRole("button", { name: new RegExp(correction) }).click();
  await expect(page.getByRole("article", { name: "Detail Konteks belum masuk" })).toContainText("Diterima");
  await expect(page.getByText("Catatan pengguna dipakai sebagai konteks, tidak menjadi fakta pasar sampai sumber memverifikasinya.")).toBeVisible();

  const marker = `AturanMemory ${Date.now()}`;
  await page.goto("/cases/ANTM?tab=review");
  const resolution = page.getByRole("region", { name: "Hasil kasus" });
  await resolution.getByLabel("Hipotesis akhir").fill(`Hipotesis akhir ${marker}.`);
  await resolution.getByLabel("Bukti yang membatalkan").fill(`Bukti pembatal ${marker}.`);
  await resolution.getByLabel("Asumsi yang keliru").fill(`Asumsi keliru ${marker}.`);
  await resolution.getByLabel("Aturan yang dapat dipakai ulang").fill(marker);
  await resolution.getByRole("button", { name: "Simpan hasil dan tutup kasus" }).click();
  await page.goto("/ai-learning?section=tinjauan");
  const proposal = page.locator("article", { hasText: marker }).first();
  await proposal.getByRole("button", { name: "Terima aturan" }).click();
  await page.goto("/ai-learning?filter=resolution");
  await page.getByRole("button", { name: new RegExp(marker) }).click();
  await expect(page.getByRole("article", { name: "Detail Hasil kasus disimpan" })).toContainText("Diterima");
  // The raw memory stores live in their own section now.
  await page.goto("/ai-learning?section=memori");
  await expect(page.getByRole("region", { name: "Aturan yang disetujui" })).toContainText(marker);

  // Per-symbol view: the timeline narrows to one issuer and keeps its entries.
  await page.goto("/ai-learning");
  await page.getByRole("button", { name: /^ANTM/ }).click();
  await expect(page).toHaveURL(/symbol=ANTM/);
  await expect(page.getByText(correction).first()).toBeVisible();

  await page.goto("/copilot");
  const question = `Pertanyaan sementara ${Date.now()}?`;
  await page.getByLabel("Tanya Catalyst").fill(question);
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(question)).toBeVisible();
  await page.goto("/ai-learning");
  await expect(page.getByText(question)).toHaveCount(0);
});
