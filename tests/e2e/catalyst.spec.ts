import { expect, test, type Page } from "@playwright/test";
import AxeBuilder from "@axe-core/playwright";

async function finishSetup(page: Page) {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await expect(dialog).toBeVisible();
  await dialog.getByRole("button", { name: "Lanjut" }).click();
  await dialog.getByRole("button", { name: "Masuk dan mulai tur" }).click();
  await page.getByRole("dialog", { name: "Temukan perubahan material" }).getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { name: "Apa yang berubah—dan apakah material?" })).toBeVisible();
}

async function resolveDefaultClarification(page: Page) {
  await page.goto("/cases/ANTM");
  const choice = page.locator('[data-tour-action="resolve-clarification"]');
  await expect(choice).toBeVisible();
  await choice.click();
  await expect(page.getByText("Clarification resolved", { exact: true })).toBeVisible();
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
  await setup.getByRole("button", { name: "Lanjut" }).click();
  await setup.getByRole("button", { name: "Masuk dan mulai tur" }).click();

  await expect(page.getByRole("dialog", { name: "Temukan perubahan material" })).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="open-antm-case"]');
  await page.locator('[data-tour-action="open-antm-case"]').click();
  await expect(page.getByRole("dialog", { name: "Pilih outcome yang diuji" })).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="resolve-clarification"]');
  await page.locator('[data-tour-action="resolve-clarification"]').click();
  await expect(page.getByRole("dialog", { name: "Konfirmasi gerak pasar" })).toBeVisible();
  await page.locator('[data-tour-action="open-market"]').click();

  await expect(page.getByRole("dialog", { name: "Uji transmisi ke bisnis" })).toBeVisible();
  await expectDesktopTourComposition(page, '[data-tour-action="open-business"]');
});

test("first-time tutorial guides the core research flow", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await setup.getByRole("button", { name: "Lanjut" }).click();
  await setup.getByRole("button", { name: "Masuk dan mulai tur" }).click();

  await expect(page.getByRole("dialog", { name: "Temukan perubahan material" })).toContainText("Klik case ANTM");
  await expect(page.locator("[data-tour-spotlight]")).toBeVisible();
  await page.locator('[data-tour-action="open-antm-case"]').click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/);

  await expect(page.getByRole("dialog", { name: "Pilih outcome yang diuji" })).toContainText("Clarification gate");
  await page.locator('[data-tour-action="resolve-clarification"]').click();
  await expect(page.getByRole("dialog", { name: "Konfirmasi gerak pasar" })).toContainText("Market Confirmation");
  await page.locator('[data-tour-action="open-market"]').click();
  await expect(page).toHaveURL(/tab=market/);

  await expect(page.getByRole("dialog", { name: "Uji transmisi ke bisnis" })).toContainText("Business Transmission");
  await page.locator('[data-tour-action="open-business"]').click();
  await expect(page).toHaveURL(/tab=business/);

  await expect(page.getByRole("dialog", { name: "Buka hipotesis yang bersaing" })).toContainText("Hypotheses");
  await page.getByRole("tab", { name: "Hypotheses" }).click();
  await expect(page).toHaveURL(/tab=hypotheses/);

  await expect(page.getByRole("dialog", { name: "Bandingkan penjelasan" })).toContainText("peringkat 2");
  await page.locator('[data-tour-action="competing-hypothesis-2"]').click();
  await expect(page.getByRole("dialog", { name: "Bawa tantangan ke Copilot" })).toContainText("Challenge hypothesis");
  await page.locator('[data-tour-action="challenge-hypothesis"]').click();

  const complete = page.getByRole("dialog", { name: "Alur inti selesai" });
  await expect(complete).toContainText("menantang satu hipotesis");
  await complete.getByRole("button", { name: "Mulai bertanya" }).click();
  const copilot = page.getByRole("dialog", { name: "Catalyst Copilot" });
  await expect(copilot).toBeVisible();
  await expect(copilot.getByLabel("Tanya Catalyst")).toHaveValue(/Uji hipotesis/);
  const hasOverflow = await page.evaluate(() => document.documentElement.scrollWidth > document.documentElement.clientWidth);
  expect(hasOverflow).toBe(false);
});

test("onboarding is scoped to a discretionary event-driven research ritual", async ({ page }) => {
  await page.goto("/");
  const setup = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await expect(setup.getByRole("heading", { name: "Build your commodity-sensitive watchlist" })).toBeVisible();
  await expect(setup.getByText(/miners and energy names/)).toBeVisible();
  await expect(setup.getByRole("button", { name: /Swing/ })).toHaveCount(0);
  await expect(setup.getByRole("button", { name: /Position/ })).toHaveCount(0);
});

test("Today prioritizes changes and removes dashboard clutter", async ({ page }) => {
  await finishSetup(page);
  await expect(page.getByRole("heading", { name: "Berubah sejak pemeriksaan terakhir" })).toBeVisible();
  await expect(page.getByText("Emiten fixture")).toHaveCount(0);
  await expect(page.getByText("Agent health")).toHaveCount(0);
  await expect(page.getByText(/Harga nikel acuan berbalik naik/).first()).toBeVisible();
  await expect(page.getByText("Baseline", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Rule", { exact: true }).first()).toBeVisible();
});

test("primary flow opens a watchlist change as a Research Case", async ({ page }) => {
  await finishSetup(page);
  const navigation = page.getByRole("navigation", { name: "Navigasi utama" });
  await expect(navigation.getByRole("link")).toHaveText(["Today", "Research Cases", "Copilot"]);
  await expect(navigation.getByText("Companies", { exact: true })).toHaveCount(0);
  await expect(navigation.getByText("Agent", { exact: true })).toHaveCount(0);
  await expect(navigation.getByText("Method", { exact: true })).toHaveCount(0);

  await page.locator('a[href="/cases/ANTM"]').first().click();
  await expect(page).toHaveURL(/\/cases\/ANTM$/);
  await expect(page.getByRole("heading", { name: /Research Case · ANTM/ })).toBeVisible();
  await expect(page.getByRole("tablist", { name: "Bagian Research Case" })).toBeVisible();
});

test("legacy research utilities converge into the Research Case hub", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka settings" }).click();
  const settings = page.getByRole("dialog", { name: "Settings & utilities" });
  await expect(settings.getByRole("link", { name: "Company universe" })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: "Correction queue" })).toHaveCount(0);
  await expect(settings.getByRole("link", { name: "Research Audit" })).toBeVisible();

  await page.goto("/companies");
  await expect(page).toHaveURL(/\/cases\?view=picker$/);
  await expect(page.getByRole("link", { name: "Case picker" })).toHaveAttribute("aria-current", "page");

  await page.goto("/agent");
  await expect(page).toHaveURL(/\/cases\?view=audit$/);
  await expect(page.getByRole("heading", { name: "Resolution memory" })).toBeVisible();

  await page.goto("/companies/ANTM");
  await expect(page).toHaveURL(/\/cases\/ANTM$/);
});

test("Research Case runs a mandate lifecycle and exposes hypothesis protocols", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  const mandate = "Uji apakah perubahan volume ditopang realisasi harga dan arus yang konsisten.";
  await page.getByLabel("Research mandate").fill(mandate);
  await page.getByRole("button", { name: "Simpan dan susun ulang plan" }).click();
  await expect(page.getByText("Mandate tersimpan")).toBeVisible();
  await expect(page.getByLabel("Agent lifecycle")).toContainText("Mandate");
  await expect(page.getByLabel("Agent lifecycle")).toContainText("Source plan");
  await page.getByRole("tab", { name: "Market confirmation 3" }).click();
  await expect(page.getByRole("heading", { name: "Market Confirmation" })).toBeVisible();
  await expect(page.getByText("Klaim yang diuji", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bukti pendukung", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Bukti penyangkal", { exact: true }).first()).toBeVisible();
  await page.getByText("Batas dan langkah berikutnya", { exact: true }).first().click();
  await expect(page.getByText("Tidak cukup bila", { exact: true }).first()).toBeVisible();
  await expect(page.getByText("Pertanyaan berikutnya", { exact: true }).first()).toBeVisible();

  await page.getByRole("tab", { name: "Case" }).click();
  await expect(page.getByRole("region", { name: "Mandate-driven research plan" })).toBeVisible();
});

test("editing the mandate visibly replans the case and its business impact test", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  const mandate = "Uji apakah pelemahan rupiah menekan margin dan cash flow ANTM.";
  await page.getByLabel("Research mandate").fill(mandate);
  await page.getByRole("button", { name: "Simpan dan susun ulang plan" }).click();

  const plan = page.getByRole("region", { name: "Mandate-driven research plan" });
  await expect(plan.getByText("Focus · margin", { exact: true })).toBeVisible();
  await expect(plan.getByText(/Trigger mengubah operating margin ANTM/)).toBeVisible();
  await expect(plan.getByText(/Fokus aktif: margin/)).toBeVisible();

  await page.getByRole("tab", { name: "Business transmission" }).click();
  await expect(page.getByRole("heading", { name: "Business Transmission" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Where must the effect land?" })).toBeVisible();
  await expect(page.getByText("Operating margin", { exact: true })).toBeVisible();
  await expect(page.getByText("Primary test", { exact: true })).toBeVisible();
  await expect(page.getByText("Valuation implication", { exact: true })).toBeVisible();

  await page.goto("/cases/ANTM?tab=hypotheses");
  await expect(page.getByRole("region", { name: "Competing hypotheses for Operating margin" })).toBeVisible();
});

test("Research Case tabs keep each investigation layer focused and deep-linkable", async ({ page }) => {
  await page.setViewportSize({ width: 375, height: 812 });
  await finishSetup(page);
  await page.goto("/cases/ANTM");

  const caseTabs = page.getByRole("tablist", { name: "Bagian Research Case" });
  await expect(caseTabs.getByRole("tab")).toHaveText(["Case", "Market confirmation 3", "Business transmission", "Hypotheses", "Review"]);
  await expect(caseTabs.getByRole("tab", { name: "Case" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Research mandate" })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Evidence timeline" })).toHaveCount(0);
  await expect(page.getByRole("heading", { name: "Market Confirmation" })).toHaveCount(0);

  await caseTabs.getByRole("tab", { name: "Market confirmation 3" }).click();
  await expect(page).toHaveURL(/\/cases\/ANTM\?tab=market$/);
  await expect(page.getByRole("heading", { name: "Market Confirmation" })).toBeVisible();
  const pillarTabs = page.getByRole("tablist", { name: "Market confirmation tests" });
  await expect(pillarTabs.getByRole("tab", { name: /Konsentrasi/ })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Konsentrasi", exact: true })).toBeVisible();

  await pillarTabs.getByRole("tab", { name: /Volume/ }).click();
  await expect(page).toHaveURL(/tab=market&pillar=volume$/);
  await expect(page.getByRole("heading", { name: "Volume", exact: true })).toBeVisible();
  await expect(page.getByRole("heading", { name: "Konsentrasi", exact: true })).toHaveCount(0);

  await page.getByText("Buka timeline 45 hari", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence timeline" })).toBeVisible();

  await caseTabs.getByRole("tab", { name: "Business transmission" }).click();
  await expect(page).toHaveURL(/\/cases\/ANTM\?tab=business$/);
  await expect(page.getByRole("heading", { name: "Business Transmission" })).toBeVisible();

  await page.goto("/cases/ANTM?tab=review");
  await expect(caseTabs.getByRole("tab", { name: "Review" })).toHaveAttribute("aria-selected", "true");
  await expect(page.getByRole("heading", { name: "Koreksi analisis ini" })).toBeVisible();
  expect(await page.evaluate(() => document.documentElement.scrollWidth > window.innerWidth + 1)).toBe(false);
});

test("Investor Research Playbook persists explicit judgment rules into a case", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka settings" }).click();
  await page.getByRole("dialog", { name: "Settings & utilities" }).getByRole("link", { name: "Investor Research Playbook" }).click();
  await expect(page).toHaveURL(/\/playbook$/);

  const rule = "Prioritaskan perubahan yang dapat mengubah volume penjualan atau margin lebih dari 5%.";
  await page.getByLabel("Materiality rules").fill(rule);
  await page.getByRole("button", { name: "Simpan playbook" }).click();
  await expect(page.getByText("Playbook tersimpan")).toBeVisible();
  await page.reload();
  await expect(page.getByLabel("Materiality rules")).toHaveValue(rule);

  await page.goto("/cases/ANTM");
  const ruleTrace = page.getByRole("region", { name: "Playbook rule trace" });
  await expect(ruleTrace.getByText(rule, { exact: true })).toBeVisible();
  await expect(ruleTrace.getByText(/Menentukan apakah trigger layak/)).toBeVisible();

  await page.goto("/");
  await expect(page.locator('a[href="/cases/ANTM"]').first()).toContainText(rule);
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
  await page.getByRole("checkbox", { name: "Select ANTM for inline comparison" }).check();
  await page.getByRole("checkbox", { name: "Select BBCA for inline comparison" }).check();
  await expect(page.getByRole("heading", { name: "Compare explanations, not scores" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "ANTM" })).toBeVisible();
  await expect(page.getByRole("columnheader", { name: "BBCA" })).toBeVisible();
});

test("evidence opens Copilot with its company and pillar context", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market");
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
  await page.goto("/cases/ANTM?tab=market");
  await page.getByText("Buka timeline 45 hari", { exact: true }).click();
  await expect(page.getByRole("heading", { name: "Evidence timeline" })).toBeVisible();
  await expect(page.getByText("ANTM memublikasikan pembaruan operasi kuartalan")).toBeVisible();
  await page.getByRole("button", { name: "Tanya timeline ANTM" }).click();
  await expect(page.getByRole("dialog", { name: "Catalyst Copilot" }).getByText("ANTM · Evidence timeline", { exact: true })).toBeVisible();
});

test("user completes setup and opens a four-pillar company case", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("link", { name: /ANTM/ }).first().click();
  await page.getByRole("tab", { name: "Market confirmation 3" }).click();
  await expect(page.getByRole("heading", { name: "Market Confirmation" })).toBeVisible();
  await expect(page.getByText("Plan → Query → Verify → Summarize")).toHaveCount(0);
  await page.getByRole("tab", { name: "Review" }).click();
  await page.getByRole("button", { name: "Buka audit" }).click();
  const audit = page.getByRole("dialog", { name: "Audit analisis ANTM" });
  await expect(audit.getByText("Plan → Query → Verify → Summarize")).toBeVisible();
  await audit.getByRole("button", { name: "Tutup audit" }).click();
  await page.getByRole("tab", { name: "Market confirmation 3" }).click();
  await page.getByText("Buka timeline 45 hari", { exact: true }).click();
  await page.getByRole("button", { name: /Fokus chart/ }).click();
  await expect(page.getByRole("dialog", { name: "ANTM vs IHSG" })).toBeVisible();
  await page.getByRole("button", { name: "Tutup chart" }).click();
});

test("causal map exposes multiple sources and copilot answers through the API", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/cases/ANTM?tab=hypotheses&event=evt-nickel");
  await expect(page.getByRole("region", { name: /Competing hypotheses/ })).toBeVisible();
  await expect(page.getByText(/Curah hujan tinggi diuji/).first()).toBeVisible();
  await page.getByRole("link", { name: "Copilot", exact: true }).click();
  await page.getByLabel("Tanya Catalyst").fill("Berita nikel ini berdampak ke watchlist saya?");
  await page.getByLabel("Tanya Catalyst").press("Enter");
  await expect(page.getByText(/ANTM: Supported/)).toBeVisible();
});

test("causal map labels hypotheses, confidence, lag, and counter-evidence", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/cases/ANTM?tab=hypotheses");
  await page.getByRole("button", { name: /mechanism potensi realisasi harga/i }).click();
  const selected = page.getByLabel("Detail node terpilih");
  await expect(selected.getByText("Causal hypothesis", { exact: true })).toBeVisible();
  await expect(selected.getByText("High confidence", { exact: true })).toBeVisible();
  await expect(selected.getByText("1-10 sesi", { exact: true })).toBeVisible();
  await expect(selected.getByText(/Counter-evidence/)).toBeVisible();
  await selected.getByRole("button", { name: "Tanya jalur ini" }).click();
  await expect(page.getByRole("dialog", { name: "Catalyst Copilot" }).getByText(/ANTM · potensi realisasi harga/)).toBeVisible();
});

test("Causal Impact compares competing explanations for one observable", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/cases/ANTM?tab=hypotheses");

  const workspace = page.getByRole("region", { name: "Competing hypotheses for Realized pricing" });
  await expect(workspace.getByText("3 explanations compete for the same observable.", { exact: true })).toBeVisible();
  await expect(workspace.getByRole("button", { name: /Rank 1/ })).toBeVisible();
  await workspace.getByRole("button", { name: /Rank 2/ }).click();

  const selected = workspace.getByRole("region", { name: "Selected competing hypothesis" });
  await expect(selected.getByText("Supporting evidence", { exact: true })).toBeVisible();
  await expect(selected.getByText("Counter-evidence", { exact: true })).toBeVisible();
  await expect(selected.getByText("Discriminator", { exact: true })).toBeVisible();
});

test("each causal edge exposes an inspectable falsification contract", async ({ page }) => {
  await finishSetup(page);
  await resolveDefaultClarification(page);
  await page.goto("/cases/ANTM?tab=hypotheses");
  await page.getByText("Buka daftar hubungan aksesibel", { exact: true }).click();
  await page.getByRole("button", { name: /Periksa hubungan/ }).first().click();
  const contract = page.getByLabel("Detail hubungan terpilih");
  await expect(contract.getByText("Exposure", { exact: true })).toBeVisible();
  await expect(contract.getByText("Expected observable", { exact: true })).toBeVisible();
  await expect(contract.getByText("Alternative explanation", { exact: true })).toBeVisible();
  await expect(contract.getByText("Invalidation condition", { exact: true })).toBeVisible();
  await expect(contract.getByText("Confidence basis", { exact: true })).toBeVisible();
  await expect(contract.getByText("Business outcome", { exact: true })).toBeVisible();
  await expect(contract.getByText(/pricing|margin|volume|cash-flow|balance-sheet|valuation/).first()).toBeVisible();
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
  await expect(page.getByRole("link", { name: "Open user reference" })).toHaveAttribute("href", "https://www.bi.go.id/");
  await page.getByRole("button", { name: "Mark verified" }).click();
  await expect(page.getByRole("button", { name: "Return to queue" })).toBeVisible();
});

test("closing a case stores a reusable research resolution", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=review");

  const resolution = page.getByRole("region", { name: "Case Resolution" });
  await resolution.getByLabel("Resolution outcome").selectOption("challenged");
  await resolution.getByLabel("Final hypothesis").fill("Rupiah bukan penjelasan utama perubahan margin ANTM.");
  await resolution.getByLabel("Evidence that falsified it").fill("Margin bertahan saat biaya USD meningkat.");
  await resolution.getByLabel("Wrong assumption").fill("Harga jual dianggap tetap.");
  await resolution.getByLabel("Reusable rule").fill("Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas.");
  await resolution.getByRole("button", { name: "Simpan resolution dan tutup case" }).click();

  await expect(resolution.getByText(/Resolution saved/)).toBeVisible();
  await expect(resolution.getByText("Case closed", { exact: true })).toBeVisible();
  await page.reload();
  await expect(page.getByRole("region", { name: "Case Resolution" }).getByText("Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas.", { exact: true })).toBeVisible();

  await page.goto("/cases?view=audit");
  await expect(page.getByRole("heading", { name: "Resolution memory" })).toBeVisible();
  await expect(page.getByText("Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas.", { exact: true }).first()).toBeVisible();
  const proposal = page.getByRole("button", { name: "Accept into Playbook" }).locator("xpath=ancestor::article");
  await expect(proposal).toContainText("pending");
  await proposal.getByRole("button", { name: "Accept into Playbook" }).click();
  await expect(page.getByText("accepted", { exact: true })).toBeVisible();
  await page.goto("/playbook");
  await expect(page.getByLabel("Falsifiers")).toHaveValue(/\[Accepted ANTM\] Pisahkan efek kurs pada harga jual dan biaya sebelum menaikkan prioritas\./);
});

test("formula details and source destinations are inspectable", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market");
  await page.getByText("Perhitungan dan input").first().click();
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

test("theme persists and core routes do not overflow target breakpoints", async ({ page }) => {
  await finishSetup(page);
  await page.getByRole("button", { name: "Buka settings" }).click();
  await page.getByRole("dialog", { name: "Settings & utilities" }).getByRole("button", { name: "Ganti tema" }).click();
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
  const routes = ["/", "/cases", "/cases/ANTM", "/impact", "/copilot", "/playbook", "/companies", "/compare?symbols=ANTM%2CBBCA", "/agent", "/method"];
  for (const theme of ["dark", "light"] as const) {
    if (theme === "light") {
      await page.goto("/");
      await page.getByRole("button", { name: "Buka settings" }).click();
      await page.getByRole("dialog", { name: "Settings & utilities" }).getByRole("button", { name: "Ganti tema" }).click();
    }
    for (const route of routes) {
      await page.goto(route);
      const results = await new AxeBuilder({ page }).withTags(["wcag2a", "wcag2aa", "wcag21a", "wcag21aa", "wcag22aa"]).analyze();
      expect(results.violations, `${theme} ${route}: ${results.violations.map((item) => item.id).join(", ")}`).toEqual([]);
    }
  }
});
