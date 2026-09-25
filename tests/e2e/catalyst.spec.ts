import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

// Asks from the floating assistant and returns its conversation once answered.
async function askCopilot(page: Page, question: string) {
  await page.getByRole("button", { name: "Tanya asisten" }).click();
  const panel = page.getByRole("dialog", { name: "Asisten Catalyst" });
  await panel.getByLabel("Tanya Catalyst").fill(question);
  await panel.getByLabel("Tanya Catalyst").press("Enter");
  const log = panel.getByRole("log", { name: "Percakapan asisten" });
  await expect(log.getByText(question)).toBeVisible();
  await expect(panel.getByRole("status")).toHaveCount(0, { timeout: 60_000 });
  return log;
}

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

async function expectDesktopTourComposition(page: Page, targetSelector: string) {
  await expect.poll(async () => page.evaluate((selector) => {
    const target = document.querySelector<HTMLElement>(selector);
    const dialog = document.querySelector<HTMLElement>("[data-guided-tour-card]");
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

  // Centred when the page can scroll it there; an action near the top of the
  // page stays where it is, above the midline, with the page at its top.
  const placement = await page.locator(targetSelector).evaluate((target) => {
    const rect = target.getBoundingClientRect();
    const center = rect.top + rect.height / 2;
    return { offset: Math.abs(center - window.innerHeight / 2), aboveMidlineAtTop: window.scrollY === 0 && center < window.innerHeight / 2 };
  });
  if (!placement.aboveMidlineAtTop) expect(placement.offset).toBeLessThan(150);
}

test("desktop tutorial centers each action without covering it", async ({ page }) => {
  await page.setViewportSize({ width: 1440, height: 900 });
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await setup.getByRole("button", { name: "Mulai tour" }).click();

  await expect(page.locator("[data-guided-tour-card]")).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="open-case"]');
  await page.locator('[data-tour-action="open-case"]').click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/, { timeout: 15_000 });
  await expect(page.getByRole("dialog", { name: "Lacak penyebab dan dampaknya" })).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="open-impact"]');
});

test("first-time tutorial guides the core research flow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await setup.getByRole("button", { name: "Mulai tour" }).click();

  await expect(page.locator("[data-guided-tour-card]")).toContainText("Pilih kasus ANTM");
  await expect(page.locator("[data-tour-spotlight]")).toBeVisible();
  await page.locator('[data-tour-action="open-case"]').click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/);

  await expect(page.getByRole("dialog", { name: "Lacak penyebab dan dampaknya" })).toContainText("Buka sebab akibat");
  await page.locator('[data-tour-action="open-impact"]').click();
  await expect(page).toHaveURL(/\/impact\?company=ANTM/, { timeout: 15_000 });

  const chainStep = page.getByRole("dialog", { name: "Lihat rantainya lebih dulu" });
  await expect(chainStep).toBeVisible();
  await expect(page.locator('[data-tour="causal-chain"]')).toBeVisible();
  await chainStep.getByRole("button", { name: "Lanjut" }).click();

  await expect(page.getByRole("dialog", { name: "Tentukan tindakan riset" })).toContainText("bukan saran transaksi");
  await page.locator('[data-tour-action="show-next-action"]').click();
  await expect(page.getByRole("dialog", { name: "Awasi web setiap hari" })).toBeVisible();
  await page.locator('[data-tour="review-queue"]').click();
  const complete = page.getByRole("dialog", { name: "Ritual harian selesai" });
  await expect(complete).toContainText("Tur selesai");
  await complete.getByRole("button", { name: "Selesai" }).click();
  await page.goto("/impact?company=ANTM");
  await expect(page.getByRole("heading", { level: 1, name: "Sebab akibat" })).toBeVisible();
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});

test("onboarding is scoped to a discretionary event-driven research ritual", async ({ page }) => {
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await expect(setup.getByRole("heading", { name: "Pilih emiten komoditas yang dipantau" })).toBeVisible();
  await expect(setup.getByText(/emiten tambang dan energi/)).toBeVisible();
  await expect(setup.getByRole("button", { name: /Swing/ })).toHaveCount(0);
  await expect(setup.getByRole("button", { name: /Position/ })).toHaveCount(0);
});

test("Dashboard menggambar seluruh kasus sebagai satu rantai sebab akibat", async ({ page }) => {
  await finishSetup(page);
  await expect(page.getByText("Emiten fixture")).toHaveCount(0);
  await expect(page.getByText("Kesehatan asisten")).toHaveCount(0);

  // Every watchlist chain lands on one canvas, with the four semantic columns
  // named once in the legend rather than per chain.
  const map = page.locator('[data-tour="market-map"]');
  await expect(map.getByRole("application")).toBeVisible();
  // Which issuers the board draws is one control, above the canvas — the map
  // no longer carries a second row of symbol chips saying something else.
  await expect(map.getByRole("group", { name: "Fokus emiten" })).toHaveCount(0);
  const boardPicker = page.getByRole("group", { name: "Emiten" });
  for (const symbol of ["ANTM", "INCO", "TINS", "PGAS", "ADRO", "PTBA"]) {
    await expect(boardPicker.getByRole("button", { name: symbol, exact: true })).toBeVisible();
    await expect(map.locator(`.react-flow__node[aria-label^="Emiten: "][aria-label$="(${symbol})"]`)).toHaveCount(1);
  }

  // A source or channel several issuers share is one card that names all of
  // them — not a copy per chain. This is the whole reason the dashboard merges
  // the chains instead of listing them, and without it the board is parallel
  // rows that happen to share a page. Which cards are shared follows the
  // recordings, so the check reads the labels rather than naming a card.
  const labels = await map.locator(".react-flow__node[aria-label]").evaluateAll((nodes) => nodes.map((node) => node.getAttribute("aria-label") ?? ""));
  const sharedBy = (label: string) => (label.match(/\(([^)]*)\)$/)?.[1] ?? "").split(", ").filter(Boolean);
  expect(new Set(labels).size, "one card per label").toBe(labels.length);
  const hubLabel = labels.find((label) => label.startsWith("Mekanisme: ") && sharedBy(label).length > 1);
  expect(hubLabel, "a channel several issuers run through").toBeTruthy();
  const hub = map.locator(".react-flow__node").and(map.getByLabel(hubLabel!, { exact: true }));
  await expect(hub).toHaveCount(1);
  await expect(hub).toContainText(`${sharedBy(hubLabel!).length} emiten`);
  await expect(hub).toContainText(sharedBy(hubLabel!).join(" · "));

  // Cards stay in their column: the layout is the argument, so nothing drags
  // and there is no layout to put back.
  await expect(hub).not.toHaveClass(/draggable/);
  await expect(map.getByRole("button", { name: /Susun ulang/ })).toHaveCount(0);

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
  await expect(navigation.getByRole("link")).toHaveText(["Dashboard", "Riset & Analisis", "Sebab akibat", "Pantau", "AI Learning"]);
  await expect(navigation.getByText("Companies", { exact: true })).toHaveCount(0);
  await expect(navigation.getByText("Agent", { exact: true })).toHaveCount(0);
  await expect(navigation.getByText("Method", { exact: true })).toHaveCount(0);

  await page.locator('a[href="/cases/ANTM"]').first().click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/);
  await expect(page.getByRole("heading", { level: 1, name: "ANTM", exact: true })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Bagian kasus" })).toBeVisible();
});

test("legacy research utilities converge into the Research Case hub", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka pengaturan" }).click();
  const settings = page.getByRole("dialog", { name: "Pengaturan" });
  await expect(settings.getByRole("link", { name: "Company universe" })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: "Correction queue" })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: /Tinjauan dan usulan/ })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: "AI Learning" })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: "Perbandingan emiten" })).toHaveCount(0);

  await page.goto("/companies");
  await expect(page).toHaveURL(/\/cases\?view=picker$/);
  await expect(page.getByRole("link", { name: "Perbandingan emiten" })).toHaveAttribute("aria-current", "page");

  await page.goto("/agent");
  await expect(page).toHaveURL(/\/ai-learning\?section=tinjauan$/);
  await expect(page.getByRole("heading", { name: "Usulan aturan" })).toBeVisible();

  await page.goto("/companies/ANTM");
  await expect(page).toHaveURL(/\/cases\/ANTM$/);
});

test("Kasus memakai pertanyaan bawaan dan fokus membuka rencana serta pemeriksaan bukti", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  await expect(page.getByText("Pertanyaan yang diuji", { exact: false })).toBeVisible();
  await expect(page.getByText(/momentum ANTM saling menguatkan/)).toBeVisible();
  await expect(page.getByLabel("Apa yang ingin dibuktikan?")).toHaveCount(0);
  await expect(page.getByRole("button", { name: "Simpan dan susun ulang" })).toHaveCount(0);
  // No focus gate: the case tests every recorded dimension without asking,
  // and opens straight onto the evidence.
  await expect(page.getByRole("heading", { name: "Hasil bisnis mana yang ingin diuji?" })).toHaveCount(0);
  await expect(page.getByRole("tablist", { name: "Bagian kasus" })).toBeVisible();
  await page.goto("/cases/ANTM?tab=review");
  await expect(page.getByRole("region", { name: "Ringkasan kasus" })).toBeVisible();
  await page.getByRole("tab", { name: "Pasar" }).click();
  await expect(page.getByRole("heading", { name: "Konfirmasi pasar" })).toBeVisible();
  await expect(page.getByText("Klaim yang diuji", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bukti pendukung", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bukti penyangkal", { exact: true }).first()).toBeVisible();
  // Setiap angka membuka rekamannya sendiri lewat hitungan sumber di bawahnya.
  await page.getByRole("button", { name: /^\d+ sumber$/ }).first().click();
  await expect(page.getByRole("dialog")).toContainText("Daftar bukti");
  await page.getByRole("button", { name: "Tutup sumber" }).click();

});

test("kasus menguji setiap fokus terekam dan menunjukkan dampak bisnisnya", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  await page.getByRole("tab", { name: "Bisnis" }).click();
  await expect(page.getByRole("heading", { name: "Dampak ke bisnis" })).toBeVisible();
  const indicators = page.getByRole("region", { name: "Indikator bisnis yang diuji" });
  await expect(indicators.getByRole("listitem").first()).toBeVisible();
  // Every indicator carries its role in the case; the primary tests are the
  // recorded dimensions, so there can be more than one.
  const primary = indicators.getByRole("listitem").filter({ hasText: "Uji utama" });
  const primaryCount = await primary.count();
  expect(primaryCount).toBeGreaterThan(0);

  // Causal Impact compares causes against exactly those primary tests: one
  // "Diuji pada" line per indicator, not the first focus alone.
  await page.goto("/impact?company=ANTM");
  const workspace = page.getByRole("region", { name: /^Hipotesis untuk / });
  await expect(workspace).toBeVisible();
  await expect(workspace.getByRole("region", { name: "Hipotesis terpilih" }).getByText(/^Diuji pada · /)).toHaveCount(primaryCount);
});

test("Research Case tabs keep each investigation layer focused and deep-linkable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  const caseTabs = page.getByRole("tablist", { name: "Bagian kasus" });
  await expect(caseTabs.getByRole("tab")).toHaveText(["1Pasar", "2Bisnis", "3Keputusan"]);
  await expect(caseTabs.getByRole("tab", { name: "Pasar" })).toHaveAttribute("aria-selected", "true");
  // The mandate line sits above the tabs, so it stays readable from every tab.
  await expect(page.getByRole("region", { name: "Pertanyaan yang diuji" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Pertanyaan riset" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Jejak bukti" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Konfirmasi pasar" })).toBeVisible();

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

  await expect(page.getByRole("heading", { name: "Jejak bukti" })).toHaveCount(0);

  await caseTabs.getByRole("tab", { name: "Bisnis" }).click();
  await expect(page).toHaveURL(/\/cases\/ANTM\?tab=business$/);
  await expect(page.getByRole("heading", { name: "Dampak ke bisnis" })).toBeVisible();

  await page.goto("/cases/ANTM?tab=review");
  await expect(caseTabs.getByRole("tab", { name: /Keputusan/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Keputusan", exact: true })).toBeVisible();
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

  // The case reads with the reader's rules applied; the assistant's "sesuai
  // aturan saya" answer is built from that ruled case and quotes the rule.
  await page.goto("/cases/ANTM?tab=review");
  const answer = await askCopilot(page, "Sesuai aturan saya, apa yang harus dicek dulu untuk ANTM?");
  await expect(answer).toContainText(rule);

  // The case outcome lives on the case, not on the dashboard: the board
  // draws the causal chains and leaves the verdict where its evidence is.
  await expect(page.getByRole("region", { name: "Hasil kasus" })).toBeVisible();
  await page.goto("/");
  await expect(page.locator('a[href="/cases/ANTM"]').first()).toBeVisible();
});

test("default theme is the light token set declared in globals.css", async ({ page }) => {
  await finishSetup(page);
  await expect(page.locator("html")).not.toHaveClass(/dark/);
  // The tokens come from the stylesheet, not from this test: the :root block is
  // read from the source and compared, as resolved colours, with what renders.
  const root = readFileSync(fileURLToPath(new URL("../../app/globals.css", import.meta.url)), "utf8").match(/:root\s*\{([^}]*)\}/)?.[1] ?? "";
  const declared = Object.fromEntries(["background", "surface", "foreground", "primary", "brand"].map((token) => [token, root.match(new RegExp(`--${token}:\\s*([^;]+);`))?.[1].trim()]));
  for (const [token, value] of Object.entries(declared)) expect(value, `--${token} declared in :root`).toBeTruthy();
  const rendered = await page.evaluate((tokens) => {
    const probe = document.createElement("span");
    document.body.append(probe);
    const resolve = (color: string) => { probe.style.color = color; return getComputedStyle(probe).color; };
    const result = Object.fromEntries(Object.entries(tokens).map(([token, value]) => [token, { declared: resolve(value as string), rendered: resolve(`var(--${token})`) }]));
    probe.remove();
    return result;
  }, declared);
  for (const [token, { declared: want, rendered: got }] of Object.entries(rendered)) expect(got, `--${token}`).toBe(want);
});

test("Case picker opens a focused inline comparison", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases?view=picker");
  for (const [column, symbol] of [[1, "ANTM"], [2, "BBCA"]] as const) {
    await page.getByRole("button", { name: "Tambah emiten" }).first().click();
    const search = page.getByRole("combobox", { name: `Cari emiten untuk kolom ${column}` });
    await search.fill(symbol);
    await page.getByRole("listbox", { name: `Cari emiten untuk kolom ${column}` }).getByRole("option", { name: new RegExp(`^${symbol} `) }).click();
  }
  await expect(page.getByRole("heading", { name: "Bandingkan bukti, bukan skor" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /^ANTM/ })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: /^BBCA/ })).toBeVisible();
});

test("a hypothesis opens Copilot with its company and rank as context", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/impact?company=ANTM");
  const selected = page.getByRole("region", { name: "Hipotesis terpilih" });
  await selected.getByRole("button", { name: "Uji lewat asisten" }).click();
  const copilot = page.getByRole("dialog", { name: "Asisten Catalyst" });
  await expect(copilot).toBeVisible();
  await expect(copilot.getByText("ANTM · hipotesis 1", { exact: true })).toBeVisible();
  await expect(copilot.getByLabel("Tanya Catalyst")).toHaveValue(/^Uji hipotesis .+ terhadap bukti penyangkal dan pembeda utama\.$/);
  await copilot.getByRole("button", { name: "Tutup asisten" }).click();
  await expect(copilot).toBeHidden();
});

test("dashboard chart mode aligns events on an evidence timeline", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("tab", { name: "Grafik indeks" }).click();
  // From "Semua" the first chip click narrows the board to one issuer, which
  // is the chart that carries events, the table, and the per-symbol export.
  await page.getByRole("group", { name: "Emiten" }).getByRole("button", { name: "ANTM", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jejak bukti" })).toBeVisible();
  // Each event marker on the chart (E1, E2, …) has its card beside it.
  const events = page.locator("main article").filter({ has: page.getByRole("heading", { level: 3 }) });
  await expect(events.first()).toBeVisible();
  await expect(events.first()).toContainText(/^E1 · /);
  await page.getByRole("button", { name: "Tanya jejak ANTM" }).click();
  await expect(page.getByRole("dialog", { name: "Asisten Catalyst" }).getByText("ANTM · jejak bukti", { exact: true })).toBeVisible();
});

test("board reads one issuer or several, in both node and chart mode", async ({ page }) => {
  await finishSetup(page);
  const picker = page.getByRole("group", { name: "Emiten" });
  const openCount = await picker.getByRole("button").count() - 1;
  const issuerCards = page.locator('[data-tour="market-map"] .react-flow__node[aria-label^="Emiten: "]');
  await expect(issuerCards).toHaveCount(openCount);

  // Node mode: narrowing the board rebuilds the map from the picked issuers.
  await picker.getByRole("button", { name: "INCO", exact: true }).click();
  await expect(issuerCards).toHaveCount(1);
  await picker.getByRole("button", { name: "TINS", exact: true }).click();
  await expect(issuerCards).toHaveCount(2);

  // Chart mode keeps that selection and draws one line per issuer.
  await page.getByRole("tab", { name: "Grafik indeks" }).click();
  await expect(page.getByText(/2 emiten dibanding IHSG/i)).toBeVisible();
  await expect(page.getByRole("button", { name: "Unduh CSV" })).toBeVisible();

  // "Semua" is the absence of a filter: every open issuer with a recording.
  await picker.getByRole("button", { name: /^Semua/ }).click();
  await expect(page.getByText(new RegExp(`${openCount} emiten dibanding IHSG`, "i"))).toBeVisible();

  // One issuer returns the single-issuer chart, with its events and export.
  await picker.getByRole("button", { name: "ANTM", exact: true }).click();
  await expect(page.getByRole("heading", { name: "Jejak bukti" })).toBeVisible();
  await expect(page.getByRole("button", { name: "Tanya jejak ANTM" })).toBeVisible();
});

test("user completes setup and opens a four-pillar company case", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("link", { name: /ANTM/ }).first().click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/);
  const caseTabs = page.getByRole("tablist", { name: "Bagian kasus" });
  await caseTabs.getByRole("tab", { name: "Pasar" }).click();
  await expect(page.getByRole("heading", { name: "Konfirmasi pasar" })).toBeVisible();
  await expect(page.getByText("Rencana → Cari → Periksa → Ringkas")).toHaveCount(0);
  await caseTabs.getByRole("tab", { name: /Keputusan/ }).click();
  await expect(page.getByRole("heading", { name: "Keputusan", exact: true })).toBeVisible();
  await page.goto("/");
  await page.getByRole("tab", { name: "Grafik indeks" }).click();
  // From "Semua" the first chip click narrows the board to one issuer, which
  // is the chart that carries events, the table, and the per-symbol export.
  await page.getByRole("group", { name: "Emiten" }).getByRole("button", { name: "ANTM", exact: true }).click();
  await page.getByRole("button", { name: /Perbesar grafik/ }).click();
  await expect(page.getByRole("dialog", { name: "ANTM dibanding IHSG" })).toBeVisible();
  await page.getByRole("button", { name: "Tutup grafik" }).click();
});

test("causal map exposes multiple sources and copilot answers through the API", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/impact?company=ANTM");
  await expect(page.getByRole("region", { name: /Hipotesis untuk/ })).toBeVisible();
  // More than one recorded source feeds the chain.
  const sources = page.getByRole("group", { name: "Rangkaian sebab akibat ANTM" }).getByRole("button", { name: /^Sumber / });
  await expect(sources.nth(1)).toBeVisible();
  await page.getByRole("button", { name: "Tanya asisten" }).click();
  await page.getByLabel("Tanya Catalyst").fill("Kenapa ANTM masuk daftar hari ini?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/ANTM masuk karena/).first()).toBeVisible();
});

test("copilot answers a causal-map question asked from the dashboard", async ({ page }) => {
  // Retrieval path: needs COPILOT_RETRIEVAL=on in the server's environment
  // (.env.local when running against pnpm dev). With the flag off the
  // assistant falls back to the capability menu by design.
  await finishSetup(page);
  await page.goto("/");
  await page.getByRole("button", { name: "Tanya asisten" }).click();
  const panel = page.getByRole("dialog", { name: "Asisten Catalyst" });
  await panel.getByLabel("Tanya Catalyst").fill("jelaskan semua kasus dalam satu jalur");
  await panel.getByLabel("Tanya Catalyst").press("Enter");
  const log = panel.getByRole("log", { name: "Percakapan asisten" });
  await expect(log.getByText("jelaskan semua kasus dalam satu jalur")).toBeVisible();
  await expect(panel.getByRole("status")).toHaveCount(0, { timeout: 120_000 });
  await expect(panel.getByText(/belum bisa dipetakan ke bukti/)).toHaveCount(0);
});

test("causal map labels hypotheses, confidence, lag, and counter-evidence", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/impact?company=ANTM");
  await page.getByLabel("Rangkaian sebab akibat ANTM").getByRole("button", { name: /realisasi harga/i }).first().click();
  const selected = page.getByLabel("Detail titik terpilih");
  await expect(selected.getByText("Hipotesis sebab akibat", { exact: true })).toBeVisible();
  await expect(selected.getByText("Keyakinan tinggi", { exact: true })).toBeVisible();
  await expect(selected.getByText(/^Jeda \d+-\d+ sesi$/)).toBeVisible();
  await expect(selected.getByText(/Bukti penyangkal/)).toBeVisible();
  await selected.getByRole("button", { name: "Tanya jalur ini" }).click();
  await expect(page.getByRole("dialog", { name: "Asisten Catalyst" }).getByText(/ANTM · realisasi harga/)).toBeVisible();
});

test("Causal Impact compares competing explanations across every observable the case tests", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/impact?company=ANTM");

  const workspace = page.getByRole("region", { name: /^Hipotesis untuk / });
  await expect(workspace.getByText(/^3 penyebab diuji terhadap \d+ indikator yang sama\.$/)).toBeVisible();
  // Each cause is labelled with every indicator it is tested against, so a
  // combined case never compares against the first focus alone.
  await expect(workspace.getByText(/^Diuji pada · /).first()).toBeVisible();
  await expect(workspace.getByRole("button", { name: /Urutan 1/ })).toBeVisible();
  await workspace.getByRole("button", { name: /Urutan 2/ }).click();

  const selected = workspace.getByRole("region", { name: "Hipotesis terpilih" });
  await expect(selected.getByText("Bukti pendukung", { exact: true })).toBeVisible();
  await expect(selected.getByText("Bukti penyangkal", { exact: true })).toBeVisible();
  await expect(selected.getByText("Pembeda utama", { exact: true })).toBeVisible();
});

test("user correction is accepted on save and can be dismissed", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=review");
  const note = "Kontrak ekspor belum dibedakan antara denominasi USD dan IDR.";
  await page.locator("summary", { hasText: "Koreksi analisis ini" }).click();
  await page.getByLabel("Yang ingin Anda ajarkan").fill(note);
  await page.getByLabel("Tautan referensi (opsional)").fill("https://www.bi.go.id/");
  await page.getByRole("button", { name: "Ajarkan ke Catalyst" }).click();
  await expect(page.getByText("Tersimpan untuk ANTM")).toBeVisible();
  await page.goto("/ai-learning?section=tinjauan");
  await expect(page.getByText(note)).toBeVisible();
  await expect(page.getByRole("link", { name: "Buka referensi pengguna" })).toHaveAttribute("href", "https://www.bi.go.id/");
  await page.getByRole("button", { name: "Abaikan" }).click();
  await expect(page.getByRole("button", { name: "Pakai lagi" })).toBeVisible();
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

  await page.goto("/ai-learning?section=tinjauan");
  await expect(page.getByRole("heading", { name: "Usulan aturan" })).toBeVisible();
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
  await expect(page.getByRole("heading", { name: "Asisten", exact: true })).toBeVisible();
  await page.getByLabel("Tanya Catalyst").fill("Data apa yang belum diperiksa untuk ANTM?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/Data dalam hari perdagangan/)).toBeVisible();
});

test("theme persists and core routes do not overflow target breakpoints", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka pengaturan" }).click();
  await page.getByRole("dialog", { name: "Pengaturan" }).getByRole("button", { name: "Gelap" }).click();
  await expect(page.locator("html")).toHaveClass(/dark/);
  await page.getByRole("dialog", { name: "Pengaturan" }).getByRole("button", { name: "Terang" }).click();
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
  // Panels fade and rise in; scanned mid-animation, their text measures at a
  // fraction of its contrast. Reduced motion settles every page before axe
  // reads it, so what is judged is what a reader is left looking at.
  await page.emulateMedia({ reducedMotion: "reduce" });
  await finishSetup(page);
  const routes = ["/", "/cases", "/cases/ANTM", "/impact", "/copilot", "/playbook", "/companies", "/compare?symbols=ANTM%2CBBCA", "/agent", "/method", "/pantau"];
  for (const theme of ["light", "dark"] as const) {
    if (theme === "dark") {
      await page.goto("/");
      await page.getByRole("button", { name: "Buka pengaturan" }).click();
      await page.getByRole("dialog", { name: "Pengaturan" }).getByRole("button", { name: "Gelap" }).click();
    }
    for (const route of routes) {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, `${theme} ${route}: ${results.violations.map((item) => item.id).join(", ")}`).toEqual([]);
    }
  }
});
