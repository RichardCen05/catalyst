import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function finishSetup(page: Page) {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await expect(dialog).toBeVisible();
  // Setup is one step since the wizard collapsed to a single asset picker;
  // "Mulai tour" both completes onboarding and opens the guided tour.
  await dialog.getByRole("button", { name: "Mulai tour" }).click();
  await page.getByRole("dialog", { name: "Pilih perubahan yang penting" }).getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { name: "Apa yang menggerakkan daftar pantauan?" })).toBeVisible();
}

async function resolveDefaultClarification(page: Page) {
  await page.goto("/cases/ANTM");
  const choice = page.locator('[data-tour-action="resolve-clarification"]');
  await expect(choice).toBeVisible();
  await choice.click();
  await expect(page.getByText("Fokus sudah dipilih", { exact: true })).toBeVisible();
}

async function expectDesktopTourComposition(page: Page, targetSelector: string) {
  await expect.poll(async () => page.evaluate((selector) => {
    const target = document.querySelector<HTMLElement>(selector);
    const dialog = document.querySelector<HTMLElement>('[role="dialog"][aria-labelledby="guided-tour-title"]');
    if (!target || !dialog) return null;
    const targetRect = target.getBoundingClientRect();
    const dialogRect = dialog.getBoundingClientRect();
    const overlapWidth = Math.max(0, Math.min(targetRect.right, dialogRect.right) - Math.max(targetRect.left, dialogRect.left));
    const overlapHeight = Math.max(0, Math.min(targetRect.bottom, dialogRect.bottom) - Math.max(targetRect.top, dialogRect.top));
    return {
      targetCenterOffset: Math.abs(targetRect.top + targetRect.height / 2 - window.innerHeight / 2),
      overlaps: overlapWidth * overlapHeight > 0,
      dialogScrolls: dialog.scrollHeight > dialog.clientHeight + 1,
      dialogInsideViewport: dialogRect.top >= 8 && dialogRect.bottom <= window.innerHeight - 8,
    };
  }, targetSelector)).toEqual({
    targetCenterOffset: expect.any(Number),
    overlaps: false,
    dialogScrolls: false,
    dialogInsideViewport: true,
  });

  const centerOffset = await page.locator(targetSelector).evaluate((target) => {
    const rect = target.getBoundingClientRect();
    return Math.abs(rect.top + rect.height / 2 - window.innerHeight / 2);
  });
  expect(centerOffset).toBeLessThan(150);
}

test("desktop tutorial centers each action without covering it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await setup.getByRole("button", { name: "Mulai tour" }).click();

  await expect(page.getByRole("dialog", { name: "Pilih perubahan yang penting" })).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="open-antm-case"]');
  await page.locator('[data-tour-action="open-antm-case"]').click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/, { timeout: 15_000 });
  await expect(page.getByRole("dialog", { name: "Tentukan yang ingin dibuktikan" })).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="resolve-clarification"]');
  await page.locator('[data-tour-action="resolve-clarification"]').click();
  await expect(page.getByRole("dialog", { name: "Lacak penyebab dan dampaknya" })).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="open-impact"]');
});

test("first-time tutorial guides the core research flow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await setup.getByRole("button", { name: "Mulai tour" }).click();

  await expect(page.getByRole("dialog", { name: "Pilih perubahan yang penting" })).toContainText("Pilih kasus ANTM");
  await expect(page.locator("[data-tour-spotlight]")).toBeVisible();
  await page.locator('[data-tour-action="open-antm-case"]').click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/);

  await expect(page.getByRole("dialog", { name: "Tentukan yang ingin dibuktikan" })).toContainText("Realisasi harga");
  await page.locator('[data-tour-action="resolve-clarification"]').click();
  await expect(page.getByRole("dialog", { name: "Lacak penyebab dan dampaknya" })).toContainText("Buka sebab akibat");
  await page.locator('[data-tour-action="open-impact"]').click();
  await expect(page).toHaveURL(/\/impact\?company=ANTM/, { timeout: 15_000 });

  await expect(page.getByRole("dialog", { name: "Tentukan tindakan riset" })).toContainText("bukan saran transaksi");
  await page.locator('[data-tour-action="show-next-action"]').click();
  await expect(page.getByRole("dialog", { name: "Awasi web setiap hari" })).toBeVisible();
  await page.locator('[data-tour="review-queue"]').click();
  const complete = page.getByRole("dialog", { name: "Ritual harian selesai" });
  await expect(complete).toContainText("Lanjutkan riset");
  await complete.getByRole("button", { name: "Selesai" }).click();
  await page.goto("/impact?company=ANTM");
  await expect(page.getByRole("heading", { name: "Apa yang mendorong perubahan ini?" })).toBeVisible();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});

test("onboarding is scoped to a discretionary event-driven research ritual", async ({ page }) => {
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await expect(setup.getByRole("heading", { name: "Pilih saham komoditas yang dipantau" })).toBeVisible();
  await expect(setup.getByText(/emiten tambang dan energi/)).toBeVisible();
  await expect(setup.getByRole("button", { name: /Swing/ })).toHaveCount(0);
  await expect(setup.getByRole("button", { name: /Position/ })).toHaveCount(0);
});

test("Dashboard menggambar seluruh kasus sebagai satu rantai sebab akibat", async ({ page }) => {
  await finishSetup(page);
  await expect(page.getByRole("heading", { name: "Semua kasus dalam satu jalur" })).toBeVisible();
  await expect(page.getByText("Emiten fixture")).toHaveCount(0);
  await expect(page.getByText("Kesehatan asisten")).toHaveCount(0);

  // Every watchlist chain lands on one canvas, with the four semantic columns
  // named once in the legend rather than per chain.
  const map = page.locator('[data-tour="market-map"]');
  await expect(map.getByRole("group", { name: "Fokus emiten" })).toBeVisible();
  for (const symbol of ["ANTM", "INCO", "TINS", "PGAS", "ADRO", "PTBA"]) {
    await expect(map.getByRole("button", { name: symbol, exact: true })).toBeVisible();
  }

  // The coal print is recorded against both ADRO and PTBA, so it must be one
  // card carrying both — not two copies in separate chains. This is the whole
  // reason the dashboard merges the chains instead of listing them.
  const shared = map.locator('.react-flow__node', { hasText: "Harga Coal acuan" });
  await expect(shared).toHaveCount(1);
  await expect(shared).toContainText("2 emiten");
  await expect(shared).toContainText("ADRO · PTBA");

  // And the chains actually join: a transmission channel is one card that
  // several issuers run through, not one copy per issuer. Without this the
  // board is six parallel rows that happen to share a page.
  const hub = map.locator('.react-flow__node[aria-label^="Mekanisme: realisasi harga"]');
  await expect(hub).toHaveCount(1);
  await expect(hub).toContainText("6 emiten");
  await expect(hub).toContainText("ANTM · INCO · TINS · PGAS · ADRO · PTBA");

  // Cards can be pulled clear of each other, and put back.
  await expect(hub).toHaveClass(/draggable/);
  await expect(map.getByRole("button", { name: "Susun ulang" })).toBeVisible();

  // The whole board is on screen at a zoom its headlines can be read at: no
  // scrolling to find out what else is on it, and no wall of grey slabs.
  const canvas = map.locator(".react-flow");
  const fits = await canvas.evaluate((node) => {
    const viewport = node.querySelector(".react-flow__viewport") as HTMLElement;
    const zoom = new DOMMatrixReadOnly(getComputedStyle(viewport).transform).a;
    const box = viewport.getBoundingClientRect();
    const frame = node.getBoundingClientRect();
    return { zoom, overflowY: box.height - frame.height, overflowX: box.width - frame.width };
  });
  expect(fits.zoom).toBeGreaterThanOrEqual(0.5);
  expect(fits.overflowY).toBeLessThanOrEqual(2);
  expect(fits.overflowX).toBeLessThanOrEqual(2);

  // It fits because the recordings behind one channel are folded into a card
  // that names the strongest and counts the rest. Opening one puts them back.
  const folded = map.locator(".react-flow__node", { hasText: /\+\d+ sumber/ }).first();
  await expect(folded).toBeVisible();
  const before = await map.locator(".react-flow__node").count();
  await folded.locator("button").click();
  await expect(map.locator(".react-flow__node")).not.toHaveCount(before);
  await map.getByRole("button", { name: "Ringkas sumber" }).click();
  await expect(map.locator(".react-flow__node")).toHaveCount(before);

  // Reading a card does not mean leaving the map: the detail panel is docked
  // inside the canvas, not stacked under it.
  await hub.locator("button").click();
  const inspector = map.getByRole("complementary", { name: "Detail terpilih" });
  await expect(inspector).toBeVisible();
  const inside = await inspector.evaluate((panel, frame) => {
    const a = panel.getBoundingClientRect();
    const b = (frame as HTMLElement).getBoundingClientRect();
    return a.top >= b.top - 1 && a.bottom <= b.bottom + 1;
  }, await canvas.elementHandle());
  expect(inside).toBe(true);
  await inspector.getByRole("button", { name: "Tutup detail" }).click();
  await expect(inspector).toHaveCount(0);
});

test("primary flow opens a watchlist change as a Research Case", async ({ page }) => {
  await finishSetup(page);
  const navigation = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(navigation.getByRole("link")).toHaveText(["Dashboard", "Kasus", "Sebab akibat", "Pantau", "AI Learning"]);
  await expect(navigation.getByText("Companies", { exact: true })).toHaveCount(0);
  await expect(navigation.getByText("Agent", { exact: true })).toHaveCount(0);
  await expect(navigation.getByText("Method", { exact: true })).toHaveCount(0);

  await page.locator('a[href="/cases/ANTM"]').first().click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/);
  await expect(page.getByRole("heading", { name: /Kasus ANTM/ })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Bagian kasus" })).toBeVisible();
});

test("legacy research utilities converge into the Research Case hub", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka pengaturan" }).click();
  const settings = page.getByRole("dialog", { name: "Pengaturan" });
  await expect(settings.getByRole("link", { name: "Company universe" })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: "Correction queue" })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: /Audit riset/ })).toBeVisible();

  await page.goto("/companies");
  await expect(page).toHaveURL(/\/cases\?view=picker$/);
  await expect(page.getByRole("link", { name: "Bandingkan emiten" })).toHaveAttribute("aria-current", "page");

  await page.goto("/agent");
  await expect(page).toHaveURL(/\/cases\?view=audit$/);
  await expect(page.getByRole("heading", { name: "Memori hasil" })).toBeVisible();

  await page.goto("/companies/ANTM");
  await expect(page).toHaveURL(/\/cases\/ANTM$/);
});

test("Kasus mengubah pertanyaan menjadi rencana dan pemeriksaan bukti", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  const mandate = "Uji apakah perubahan volume ditopang realisasi harga dan arus yang konsisten.";
  await page.getByLabel("Apa yang ingin dibuktikan?").fill(mandate);
  await page.getByRole("button", { name: "Simpan dan susun ulang" }).click();
  await expect(page.getByText("Pertanyaan tersimpan")).toBeVisible();
  await page.getByText("Lihat rincian audit", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Tahap kasus" })).toBeVisible();
  await page.getByRole("tab", { name: "Pasar" }).click();
  await expect(page.getByRole("heading", { name: "Konfirmasi pasar" })).toBeVisible();
  await expect(page.getByText("Klaim yang diuji", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bukti pendukung", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bukti penyangkal", { exact: true }).first()).toBeVisible();
  await page.getByText("Batas dan langkah berikutnya", { exact: true }).first().click();
  await expect(page.getByText("Tidak cukup bila", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Pertanyaan berikutnya", { exact: true }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Ringkasan" }).click();
  await expect(page.getByRole("region", { name: "Rencana analisis" })).toBeVisible();
});

test("editing the mandate visibly replans the case and its business impact test", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  const mandate = "Uji apakah pelemahan rupiah menekan margin dan cash flow ANTM.";
  await page.getByLabel("Apa yang ingin dibuktikan?").fill(mandate);
  await page.getByRole("button", { name: "Simpan dan susun ulang" }).click();

  const plan = page.getByRole("region", { name: "Rencana analisis" });
  await expect(plan.getByText("Fokus · Margin operasi", { exact: true })).toBeVisible();
  await expect(plan.getByText(/Pemicu mengubah margin operasi ANTM/)).toBeVisible();

  await page.getByRole("tab", { name: "Bisnis" }).click();
  await expect(page.getByRole("heading", { name: "Dampak ke bisnis" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Di mana dampak harus terlihat?" })).toBeVisible();
  await expect(page.getByText("Margin operasi", { exact: true })).toBeVisible();
  await expect(page.getByText("Uji utama", { exact: true })).toBeVisible();
  await expect(page.getByText("Dampak valuasi", { exact: true })).toBeVisible();

  await page.goto("/impact?company=ANTM");
  await expect(page.getByRole("region", { name: "Hipotesis untuk Margin operasi" })).toBeVisible();
});

test("Research Case tabs keep each investigation layer focused and deep-linkable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  const caseTabs = page.getByRole("tablist", { name: "Bagian kasus" });
  await expect(caseTabs.getByRole("tab")).toHaveText(["Ringkasan", "Pasar", "Bisnis", "Tinjau"]);
  await expect(caseTabs.getByRole("tab", { name: "Ringkasan" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Pertanyaan riset" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Jejak bukti" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Konfirmasi pasar" })).toHaveCount(0);

  await caseTabs.getByRole("tab", { name: "Pasar" }).click();
  await expect(page).toHaveURL(/\/cases\/ANTM\?tab=market$/);
  await expect(page.getByRole("heading", { name: "Konfirmasi pasar" })).toBeVisible();
  const pillarTabs = page.getByRole("tablist", { name: "Pemeriksaan pasar" });
  await expect(pillarTabs.getByRole("tab", { name: /Konsentrasi/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Konsentrasi", exact: true })).toBeVisible();

  await pillarTabs.getByRole("tab", { name: /Volume/ }).click();
  await expect(page).toHaveURL(/tab=market&pillar=volume$/);
  await expect(page.getByRole("heading", { name: "Volume", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Konsentrasi", exact: true })).toHaveCount(0);

  await page.getByText(/Buka timeline \d+ hari/).click();
  await expect(page.getByRole("heading", { name: "Jejak bukti" })).toBeVisible();

  await caseTabs.getByRole("tab", { name: "Bisnis" }).click();
  await expect(page).toHaveURL(/\/cases\/ANTM\?tab=business$/);
  await expect(page.getByRole("heading", { name: "Dampak ke bisnis" })).toBeVisible();

  await page.goto("/cases/ANTM?tab=review");
  await expect(caseTabs.getByRole("tab", { name: "Tinjau" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Koreksi analisis ini" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("Investor Research Playbook persists explicit judgment rules into a case", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka pengaturan" }).click();
  await page.getByRole("dialog", { name: "Pengaturan" }).getByRole("link", { name: /Aturan riset investor/ }).click();
  await expect(page).toHaveURL(/\/playbook$/);

  const rule = "Prioritaskan perubahan yang dapat mengubah volume penjualan atau margin lebih dari 5%.";
  await page.getByLabel("Aturan materialitas").fill(rule);
  await page.getByRole("button", { name: "Simpan aturan" }).click();
  await expect(page.getByText("Aturan tersimpan")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Aturan materialitas")).toHaveValue(rule);

  await page.goto("/cases/ANTM");
  await page.getByText("Lihat rincian audit", { exact: true }).click();
  await expect(page.getByText(rule, { exact: true })).toBeVisible();

  // The disposition itself lives on the case, not on the dashboard: the board
  // draws the causal chains and leaves the verdict where its evidence is.
  await expect(page.getByRole("region", { name: "Tindakan riset" })).toBeVisible();
  await page.goto("/");
  await expect(page.locator('a[href="/cases/ANTM"]').first()).toBeVisible();
});

test("default theme uses the editorial black-cherry tokens", async ({ page }) => {
  await finishSetup(page);
  const tokens = await page.evaluate(() => {
    const style = getComputedStyle(document.documentElement);
    return {
      background: style.getPropertyValue("--background").trim(),
      surface: style.getPropertyValue("--surface").trim(),
      primary: style.getPropertyValue("--primary").trim(),
      brand: style.getPropertyValue("--brand").trim(),
    };
  });
  expect(tokens).toEqual({ background: "#0d0a0c", surface: "#151013", primary: "#f08bb3", brand: "#9e0142" });
});

test("Case picker opens a focused inline comparison", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases?view=picker");
  await page.getByRole("button", { name: "Tambah emiten" }).first().click();
  await page.getByPlaceholder("Cari emiten").fill("ANTM");
  await page.getByRole("button", { name: /^ANTM/ }).click();
  await page.getByRole("button", { name: "Tambah emiten" }).first().click();
  await page.getByPlaceholder("Cari emiten").fill("BBCA");
  await page.getByRole("button", { name: /^BBCA/ }).click();
  await expect(page.getByRole("heading", { name: "Bandingkan bukti, bukan skor" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /^ANTM/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /^BBCA/ })).toBeVisible();
});

test("evidence opens Copilot with its company and pillar context", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market");
  await page.getByRole("button", { name: "Tanya pilar Konsentrasi" }).click();
  const copilot = page.getByRole("dialog", { name: "Asisten Catalyst" });
  await expect(copilot).toBeVisible();
  await expect(copilot.getByText("ANTM · Konsentrasi", { exact: true })).toBeVisible();
  await expect(copilot.getByLabel("Tanya Catalyst")).toHaveValue("Jelaskan bukti Konsentrasi untuk ANTM.");
  await copilot.getByRole("button", { name: "Tutup asisten" }).click();
  await expect(copilot).toBeHidden();
});

test("company analysis aligns events on an evidence timeline", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market");
  await page.getByText(/Buka timeline \d+ hari/).click();
  await expect(page.getByRole("heading", { name: "Jejak bukti" })).toBeVisible();
  await expect(page.getByText("Antam reports H1-2026 revenue of Rp 62.71 trillion, with gold sales exceeding Rp 50 trillion")).toBeVisible();
  await page.getByRole("button", { name: "Tanya jejak ANTM" }).click();
  await expect(page.getByRole("dialog", { name: "Asisten Catalyst" }).getByText("ANTM · jejak bukti", { exact: true })).toBeVisible();
});

test("user completes setup and opens a four-pillar company case", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("link", { name: /ANTM/ }).first().click();
  await page.getByRole("tab", { name: "Pasar" }).click();
  await expect(page.getByRole("heading", { name: "Konfirmasi pasar" })).toBeVisible();
  await expect(page.getByText("Rencana → Cari → Periksa → Ringkas")).toHaveCount(0);
  await page.getByRole("tab", { name: "Tinjau" }).click();
  await page.getByRole("button", { name: "Buka audit" }).click();
  const audit = page.getByRole("dialog", { name: "Audit analisis ANTM" });
  await expect(audit.getByText("Rencana → Cari → Periksa → Ringkas")).toBeVisible();
  await audit.getByRole("button", { name: "Tutup audit" }).click();
  await page.getByRole("tab", { name: "Pasar" }).click();
  await page.getByText(/Buka timeline \d+ hari/).click();
  await page.getByRole("button", { name: /Perbesar grafik/ }).click();
  await expect(page.getByRole("dialog", { name: "ANTM dibanding IHSG" })).toBeVisible();
  await page.getByRole("button", { name: "Tutup grafik" }).click();
});

test("causal map exposes multiple sources and copilot answers through the API", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/impact?company=ANTM");
  await expect(page.getByRole("region", { name: /Hipotesis untuk/ })).toBeVisible();
  await expect(page.getByText(/Rp 50 trillion/).first()).toBeVisible();
  await page.getByRole("button", { name: "Tanya asisten" }).click();
  await page.getByLabel("Tanya Catalyst").fill("Kenapa ANTM masuk daftar hari ini?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/ANTM masuk karena/).first()).toBeVisible();
});

test("causal map labels hypotheses, confidence, lag, and counter-evidence", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/impact?company=ANTM");
  await page.getByLabel("Rangkaian sebab akibat ANTM").getByRole("button", { name: /realisasi harga/i }).first().click();
  const selected = page.getByLabel("Detail titik terpilih");
  await expect(selected.getByText("Hipotesis sebab akibat", { exact: true })).toBeVisible();
  await expect(selected.getByText("Keyakinan tinggi", { exact: true })).toBeVisible();
  await expect(selected.getByText("1-10 sesi", { exact: true })).toBeVisible();
  await expect(selected.getByText(/Bukti penyangkal/)).toBeVisible();
  await selected.getByRole("button", { name: "Tanya jalur ini" }).click();
  await expect(page.getByRole("dialog", { name: "Asisten Catalyst" }).getByText(/ANTM · realisasi harga/)).toBeVisible();
});

test("Causal Impact compares competing explanations for one observable", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/impact?company=ANTM");

  const workspace = page.getByRole("region", { name: "Hipotesis untuk Realisasi harga" });
  await expect(workspace.getByText("3 penyebab diuji terhadap indikator yang sama.", { exact: true })).toBeVisible();
  await expect(workspace.getByRole("button", { name: /Urutan 1/ })).toBeVisible();
  await workspace.getByRole("button", { name: /Urutan 2/ }).click();

  const selected = workspace.getByRole("region", { name: "Hipotesis terpilih" });
  await expect(selected.getByText("Bukti pendukung", { exact: true })).toBeVisible();
  await expect(selected.getByText("Bukti penyangkal", { exact: true })).toBeVisible();
  await expect(selected.getByText("Pembeda utama", { exact: true })).toBeVisible();
});

test("each causal edge exposes an inspectable falsification contract", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/impact?company=ANTM");
  await page.getByText("Buka daftar hubungan", { exact: true }).click();
  await page.getByRole("button", { name: /Periksa hubungan/ }).first().click();
  const contract = page.getByLabel("Detail hubungan terpilih");
  await expect(contract.getByText("Eksposur", { exact: true })).toBeVisible();
  await expect(contract.getByText("Indikator yang dicari", { exact: true })).toBeVisible();
  await expect(contract.getByText("Penjelasan lain", { exact: true })).toBeVisible();
  await expect(contract.getByText("Batal jika", { exact: true })).toBeVisible();
  await expect(contract.getByText("Dasar keyakinan", { exact: true })).toBeVisible();
  await expect(contract.getByText("Dampak bisnis", { exact: true })).toBeVisible();
  await expect(contract.getByText(/Realisasi harga|Margin operasi|Volume operasi|Arus kas operasi/).first()).toBeVisible();
});

test("user correction becomes a reversible open hypothesis", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=review");
  const note = "Kontrak ekspor belum dibedakan antara denominasi USD dan IDR.";
  await page.getByLabel("Apa yang keliru atau belum dipertimbangkan?").fill(note);
  await page.getByLabel("Referensi pendukung (opsional)").fill("https://www.bi.go.id/");
  await page.getByRole("button", { name: "Kirim untuk verifikasi" }).click();
  await expect(page.getByText("Tersimpan sebagai hipotesis terbuka")).toBeVisible();
  await page.goto("/cases?view=audit");
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka referensi pengguna" })).toHaveAttribute("href", "https://www.bi.go.id/");
  await page.getByRole("button", { name: "Tandai sudah diperiksa" }).click();
  await expect(page.getByRole("button", { name: "Kembalikan ke antrean" })).toBeVisible();
});

test("closing a case stores a reusable research resolution", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=review");

  const resolution = page.getByRole("region", { name: "Hasil kasus" });
  await resolution.getByLabel("Hasil pemeriksaan").selectOption("challenged");
  await resolution.getByLabel("Hipotesis akhir").fill("Rupiah bukan penjelasan utama perubahan margin ANTM.");
  await resolution.getByLabel("Bukti yang membatalkan").fill("Margin bertahan saat biaya USD meningkat.");
  await resolution.getByLabel("Asumsi yang keliru").fill("Harga jual dianggap tetap.");
  await resolution.getByLabel("Aturan yang dapat dipakai ulang").fill("Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas.");
  await resolution.getByRole("button", { name: "Simpan hasil dan tutup kasus" }).click();

  await expect(resolution.getByText(/Hasil tersimpan/)).toBeVisible();
  await expect(resolution.getByText("Selesai", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Hasil kasus" }).getByText("Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas.", { exact: true })).toBeVisible();

  await page.goto("/cases?view=audit");
  await expect(page.getByRole("heading", { name: "Memori hasil" })).toBeVisible();
  await expect(page.getByText("Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas.", { exact: true }).first()).toBeVisible();
  const proposal = page.getByRole("button", { name: "Terima aturan" }).locator("xpath=ancestor::article");
  await expect(proposal).toContainText("menunggu");
  await proposal.getByRole("button", { name: "Terima aturan" }).click();
  await expect(page.getByText("diterima", { exact: true })).toBeVisible();
  await page.goto("/playbook");
  await expect(page.getByLabel("Kondisi pembatal")).toHaveValue(/\[Disetujui ANTM\] Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas\./);
});

test("formula details and source destinations are inspectable", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market");
  await page.getByText("Perhitungan dan data").first().click();
  await expect(page.getByText(/HHI =/).first()).toBeVisible();
  await page.getByRole("button", { name: /Periksa data sumber/ }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Lokasi data");
  await expect(page.getByRole("link", { name: /Buka dokumentasi sumber/ }).first()).toHaveAttribute("href", /^https:\/\//);
});

test("copilot has a dedicated searchable workspace", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/copilot");
  await expect(page.getByRole("heading", { name: "Cari jawaban dari bukti" })).toBeVisible();
  await page.getByLabel("Tanya Catalyst").fill("Data apa yang belum diperiksa untuk ANTM?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/Data dalam hari perdagangan/)).toBeVisible();
});

test("theme persists and core routes do not overflow target breakpoints", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka pengaturan" }).click();
  await page.getByRole("dialog", { name: "Pengaturan" }).getByRole("button", { name: "Ganti tema" }).click();
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  await page.reload();
  await expect(page.locator("html")).not.toHaveClass(/dark/);

  for (const [width, height] of [[375, 812], [667, 375], [768, 900], [1024, 900], [1440, 900]]) {
    await page.setViewportSize({ width, height });
    await page.goto(width === 375 ? "/impact?company=ANTM" : "/cases?view=picker");
    const overflow = await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1);
    expect(overflow, `horizontal overflow at ${width}px`).toBe(false);
  }
  await page.emulateMedia({ reducedMotion: "reduce" });
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/cases/ANTM");
  await page.evaluate(() => { document.documentElement.style.fontSize = "125%"; });
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1), "overflow with enlarged text").toBe(false);
});

test("core routes have no automatic WCAG A or AA violations", async ({ page }) => {
  await finishSetup(page);
  const routes = ["/", "/cases", "/cases/ANTM", "/impact", "/copilot", "/playbook", "/companies", "/compare?symbols=ANTM%2CBBCA", "/agent", "/method", "/pantau"];
  for (const theme of ["dark", "light"] as const) {
    if (theme === "light") {
      await page.goto("/");
      await page.getByRole("button", { name: "Buka pengaturan" }).click();
      await page.getByRole("dialog", { name: "Pengaturan" }).getByRole("button", { name: "Ganti tema" }).click();
    }
    for (const route of routes) {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, `${theme} ${route}: ${results.violations.map((item) => item.id).join(", ")}`).toEqual([]);
    }
  }
});
