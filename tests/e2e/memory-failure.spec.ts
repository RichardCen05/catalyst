import { expect, test, type Page, type Request } from "@playwright/test";

/**
 * Browser-level failure injection for the memory pipeline (G7-G9, G23-G25).
 *
 * The unit suites drive the server half (route, merge, transport). These drive
 * the half that only exists in a real browser: the 1500ms debounce in
 * components/memory-sync.tsx, the localStorage that zustand `persist` writes
 * through, and the `catalyst_uid` cookie that decides which GCS object the
 * request lands in. Each test records a verdict from the four the audit uses —
 * DEGRADES / LOSES / CORRUPTS / LIES.
 *
 * GCS is not reachable from a dev server, so `/api/memory` answers
 * `{unavailable:true}` here. That is deliberate: these tests are about whether
 * the browser ever ISSUES the write and what it tells the user, not about what
 * the bucket does with it.
 */

const SYNC_DEBOUNCE_MS = 1500;
const STORAGE_KEY = "catalyst:v1";

async function finishSetup(page: Page) {
  await page.goto("/");
  const dialog = page.getByRole("dialog", { name: "Siapkan ruang riset" });
  await dialog.getByRole("button", { name: "Mulai tour" }).click();
  await page.getByRole("dialog", { name: "Pilih perubahan yang penting" }).getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { name: "Apa yang menggerakkan daftar pantauan?" })).toBeVisible();
}

/** Count POSTs to /api/memory from the moment this is called. */
function countMemoryWrites(page: Page) {
  const seen: Request[] = [];
  const listener = (request: Request) => {
    if (request.method() === "POST" && request.url().includes("/api/memory")) seen.push(request);
  };
  page.on("request", listener);
  return {
    get count() {
      return seen.length;
    },
    stop: () => page.off("request", listener),
  };
}

/** Let any debounce armed by earlier navigation drain, then start clean. */
async function quiesce(page: Page) {
  await page.waitForTimeout(SYNC_DEBOUNCE_MS + 600);
}

test("G7: an edit inside the 1500ms debounce is LOST when the tab closes", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await quiesce(page);

  const writes = countMemoryWrites(page);
  await page.getByRole("button", { name: "Berguna" }).click();
  await expect(page.getByRole("button", { name: "Berguna" })).toHaveAttribute("aria-pressed", "true");
  // Well inside the window: the timer has not fired yet.
  await page.waitForTimeout(400);
  expect(writes.count).toBe(0);
  // Closing the tab here runs the effect cleanup, which clears the timer.
  // There is no `pagehide`/`visibilitychange` flush, so nothing is sent.
  await page.close();
  expect(writes.count).toBe(0);
  // Verdict: LOSES. The window is the full SYNC_DEBOUNCE_MS; the UI shows the
  // feedback as applied (aria-pressed=true) while the server copy never hears
  // about it. localStorage still holds it, so only the GCS backup diverges.
});

test("G7b: the same edit DOES reach the server once the debounce elapses", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await quiesce(page);

  const writes = countMemoryWrites(page);
  await page.getByRole("button", { name: "Berguna" }).click();
  await page.waitForTimeout(SYNC_DEBOUNCE_MS + 800);
  expect(writes.count).toBeGreaterThan(0);
  writes.stop();
});

test("G8: a client-side route change does NOT unmount MemorySync, so the pending write survives", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await quiesce(page);

  const writes = countMemoryWrites(page);
  await page.getByRole("button", { name: "Berguna" }).click();
  await page.waitForTimeout(300);
  // In-app navigation. MemorySync is mounted in components/providers.tsx under
  // the root layout, so it is never unmounted by a route change — the cleanup
  // that would clear the timer does not run.
  await page.getByRole("link", { name: "Dashboard" }).first().click().catch(async () => {
    await page.goto("/");
  });
  await page.waitForTimeout(SYNC_DEBOUNCE_MS + 800);
  expect(writes.count).toBeGreaterThan(0);
  writes.stop();
  // Verdict: DEGRADES (no loss). The cleanup-drops-a-write risk is real in the
  // code but unreachable in the shipped tree because the component never
  // unmounts below the root layout.
});

test("G9: an offline POST is dropped, and must not surface as an unhandled rejection", async ({ page }) => {
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await quiesce(page);

  let attempts = 0;
  await page.route("**/api/memory", async (route) => {
    if (route.request().method() === "POST") {
      attempts += 1;
      await route.abort("internetdisconnected");
      return;
    }
    await route.continue();
  });

  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.getByRole("button", { name: "Berguna" }).click();
  await page.waitForTimeout(SYNC_DEBOUNCE_MS + 1500);
  expect(attempts).toBe(1);
  // No second attempt of any kind, ever: no retry, no queue.
  await page.waitForTimeout(2500);
  expect(attempts).toBe(1);

  // The app keeps working and the edit survives locally.
  await expect(page.getByRole("button", { name: "Berguna" })).toHaveAttribute("aria-pressed", "true");
  const stored = await page.evaluate((key) => window.localStorage.getItem(key), STORAGE_KEY);
  expect(stored).toContain("feedback");

  // Before the fix this failed with `TypeError: Failed to fetch`: the shipped
  // `void fetch(...)` had no rejection handler, so every offline write raised
  // an unhandled rejection into the page.
  expect(pageErrors).toEqual([]);
  // Verdict: LOSES. The write is dropped with no retry and no queue; local
  // state still holds the edit, so only the server backup falls behind.
});

test("G23: localStorage that throws on access leaves the app usable", async ({ page }) => {
  await page.addInitScript(() => {
    Object.defineProperty(window, "localStorage", {
      configurable: true,
      get() {
        throw new DOMException("The operation is insecure.", "SecurityError");
      },
    });
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto("/");
  // The onboarding dialog is the first thing a fresh browser sees; if persist
  // took the page down, this never renders.
  await expect(page.getByRole("dialog", { name: "Siapkan ruang riset" })).toBeVisible();
  await page.getByRole("dialog", { name: "Siapkan ruang riset" }).getByRole("button", { name: "Mulai tour" }).click();
  await page.getByRole("dialog", { name: "Pilih perubahan yang penting" }).getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { name: "Apa yang menggerakkan daftar pantauan?" })).toBeVisible();
  expect(pageErrors).toEqual([]);
  // Verdict: DEGRADES. Nothing persists between reloads (no localStorage, and
  // components/memory-sync.tsx:52-57 returns early when the read throws, so the
  // server backup is never written either), but the session itself works.
});

test("G24: QuotaExceededError on write does not break the session", async ({ page }) => {
  await page.addInitScript(() => {
    const real = window.localStorage;
    const quota = {
      getItem: (key: string) => real.getItem(key),
      removeItem: (key: string) => real.removeItem(key),
      clear: () => real.clear(),
      key: (index: number) => real.key(index),
      get length() {
        return real.length;
      },
      setItem: () => {
        throw new DOMException("QuotaExceededError", "QuotaExceededError");
      },
    };
    Object.defineProperty(window, "localStorage", { configurable: true, get: () => quota });
  });
  const pageErrors: string[] = [];
  page.on("pageerror", (error) => pageErrors.push(String(error)));

  await page.goto("/");
  await expect(page.getByRole("dialog", { name: "Siapkan ruang riset" })).toBeVisible();
  await page.getByRole("dialog", { name: "Siapkan ruang riset" }).getByRole("button", { name: "Mulai tour" }).click();
  await page.getByRole("dialog", { name: "Pilih perubahan yang penting" }).getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { name: "Apa yang menggerakkan daftar pantauan?" })).toBeVisible();
  // Chromium raises the QuotaExceededError out of zustand's persist write as
  // an unhandled page error; the session itself is unaffected.
  expect(pageErrors.length).toBeGreaterThan(0);
  expect(pageErrors.join(" ")).toContain("QuotaExceededError");
  // Verdict: LOSES (silently). Reads succeed so the app behaves normally, every
  // write is discarded, nothing on screen says the profile is not being kept,
  // and the only trace is console noise the user never sees.
});

test("G25: cookies blocked — every request mints a new uid, with no write loop", async ({ page, context }) => {
  // Playwright cannot disable the cookie jar, so empty it continuously: the
  // browser can never carry catalyst_uid into the next request.
  await context.clearCookies();
  const clearer = setInterval(() => void context.clearCookies().catch(() => {}), 120);

  const cookieHeaders: string[] = [];
  page.on("request", (request) => {
    if (request.method() === "POST" && request.url().includes("/api/memory")) {
      cookieHeaders.push(request.headers()["cookie"] ?? "");
    }
  });

  try {
    await finishSetup(page);
    await page.waitForTimeout(4000);
    const afterSettle = cookieHeaders.length;
    expect(afterSettle).toBeGreaterThan(0);
    // The sync layer is change-driven, not poll-driven: with the page idle the
    // count must stop climbing even though no POST can ever keep its identity.
    await page.waitForTimeout(4000);
    expect(cookieHeaders.length).toBe(afterSettle);
    // At least one write went out with no uid at all, so the server minted a
    // fresh one for it and the object it created is unreachable forever.
    expect(cookieHeaders.some((header) => !header.includes("catalyst_uid="))).toBe(true);
  } finally {
    clearInterval(clearer);
  }
  // Verdict: LOSES. Each write lands in a brand-new catalyst/memory/<uid>.json
  // that nothing will read again (one orphan object per write burst), but there
  // is no retry loop, so it cannot run away against GCS.
});
