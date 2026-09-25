import { expect, test, type BrowserContext, type Page, type Request } from "@playwright/test";

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
  await page.locator("[data-guided-tour-card]").getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
}

/**
 * Count POSTs to /api/memory from the moment this is called.
 *
 * Accepts a Page or a BrowserContext. A page-level listener dies with the page,
 * so a write issued during unload (the `pagehide` flush) can be torn down before
 * the event is delivered; pass `page.context()` when the assertion is about what
 * a closing tab manages to send.
 */
function countMemoryWrites(target: Page | BrowserContext) {
  const seen: Request[] = [];
  // When each write was observed, so a test can assert that one beat the
  // debounce without having to race it with a short poll timeout.
  const seenAt: number[] = [];
  const listener = (request: Request) => {
    if (request.method() === "POST" && request.url().includes("/api/memory")) {
      seen.push(request);
      seenAt.push(Date.now());
    }
  };
  target.on("request", listener);
  return {
    get count() {
      return seen.length;
    },
    get requests() {
      return seen;
    },
    get firstSeenAt() {
      return seenAt[0];
    },
    stop: () => target.off("request", listener),
  };
}

/**
 * Record every `navigator.sendBeacon` the page makes, by URL.
 *
 * Playwright cannot observe a beacon issued while the tab is closing: the page
 * reports `sendBeacon` returning true, while context `request` events and
 * `context.route` both see nothing, because the network channel is torn down
 * with the target. Hooking the call is the only way to assert what a closing
 * tab hands to the browser. The body is asserted on the path that stays
 * observable — see G7c, which drives the same flush with the page still alive.
 */
async function recordBeacons(page: Page, context: BrowserContext) {
  const urls: string[] = [];
  await context.exposeFunction("__recordBeacon", (url: string) => {
    urls.push(url);
  });
  await page.addInitScript(() => {
    const real = navigator.sendBeacon.bind(navigator);
    navigator.sendBeacon = (url: string | URL, data?: BodyInit | null) => {
      // Synchronous on purpose: an async read of the Blob would not resolve
      // before the document is gone.
      (window as unknown as { __recordBeacon: (u: string) => void }).__recordBeacon(String(url));
      return real(url, data);
    };
  });
  return { get urls() { return urls; } };
}

/** Let any debounce armed by earlier navigation drain, then start clean. */
async function quiesce(page: Page) {
  await page.waitForTimeout(SYNC_DEBOUNCE_MS + 600);
}

test("G7: an edit inside the 1500ms debounce is FLUSHED when the tab closes", async ({ page, context }) => {
  const beacons = await recordBeacons(page, context);
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await quiesce(page);

  // Context-level, not page-level: a page listener dies with the page.
  const writes = countMemoryWrites(context);
  await page.getByRole("button", { name: "Berguna" }).click();
  await expect(page.getByRole("button", { name: "Berguna" })).toHaveAttribute("aria-pressed", "true");
  // Well inside the window: the timer has not fired yet.
  await page.waitForTimeout(400);
  expect(writes.count).toBe(0);
  expect(beacons.urls).toEqual([]);

  // `runBeforeUnload: true` is the real tab close: Chromium runs the document's
  // unload path, so `pagehide` and `visibilitychange` fire. Playwright's default
  // (`runBeforeUnload: false`) destroys the target outright and dispatches no
  // lifecycle event at all — a listener for pagehide, visibilitychange and
  // beforeunload records nothing — so it cannot tell a flush that works from one
  // that does not.
  await page.close({ runBeforeUnload: true });
  await expect.poll(() => beacons.urls.length, { timeout: 5_000 }).toBe(1);
  expect(beacons.urls[0]).toContain("/api/memory");
  // Exactly one write, by either route: the flush clears the pending timer, so
  // the debounce path cannot send the same snapshot a second time. `writes`
  // stays at 0 because a closing tab's beacon is invisible to Playwright, not
  // because nothing was sent.
  expect(writes.count).toBe(0);
  writes.stop();
  // Verdict: DEGRADES. The edit reaches the server backup on the way out. What
  // is still not guaranteed is delivery — a beacon is fire-and-forget, so a
  // bucket that refuses it is never retried and only localStorage is certain.
});

test("G7c: with sendBeacon missing, the hidden-tab flush falls back to a keepalive fetch", async ({ page, context }) => {
  // Two reasons to take the fallback branch here. It is the branch a browser
  // without sendBeacon (or one whose beacon quota is spent) actually runs, and
  // it is the only flush path whose body Playwright can read: a beacon's
  // payload is never reported, so `postData()` and `postDataBuffer()` are both
  // empty for one.
  await page.addInitScript(() => {
    Object.defineProperty(navigator, "sendBeacon", { configurable: true, value: undefined });
  });
  await finishSetup(page);
  await page.goto("/cases/ANTM?tab=market&pillar=concentration");
  await quiesce(page);

  const writes = countMemoryWrites(context);
  const editedAt = Date.now();
  await page.getByRole("button", { name: "Berguna" }).click();
  await page.waitForTimeout(200);
  expect(writes.count).toBe(0);

  // Synthetic on purpose. Headless Chromium keeps every page at
  // visibilityState "visible" — a second tab calling bringToFront() leaves this
  // one visible — so there is no way to drive a real background here. G7 covers
  // the browser-driven lifecycle event; this covers what the listener does with
  // it, with the page still alive so the request stays observable.
  await page.evaluate(() => {
    Object.defineProperty(document, "visibilityState", { configurable: true, get: () => "hidden" });
    document.dispatchEvent(new Event("visibilitychange"));
  });

  // The poll is generous so that a slow dev server cannot make this flaky. What
  // discriminates is the recorded timestamp below, not the timeout: the write
  // has to have been issued before the debounce could possibly have fired, and
  // with no flush there is nothing that can issue one that early.
  await expect.poll(() => writes.count, { timeout: 5_000, intervals: [25] }).toBe(1);
  expect(writes.firstSeenAt - editedAt).toBeLessThan(SYNC_DEBOUNCE_MS);
  // The flush reads the same localStorage snapshot the timer path reads, so the
  // edit is in the body, not just in the request count.
  const posted = writes.requests[0].postData() ?? "";
  expect(posted).toContain("feedback");
  expect(JSON.parse(posted)).toHaveProperty("profile");

  // The pending timer was cleared, so the debounce never re-sends it.
  await page.waitForTimeout(SYNC_DEBOUNCE_MS + 800);
  expect(writes.count).toBe(1);
  writes.stop();
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
  await page.locator("[data-guided-tour-card]").getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
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
  await page.locator("[data-guided-tour-card]").getByRole("button", { name: "Lewati tur" }).click();
  await expect(page.getByRole("heading", { level: 1, name: "Dashboard" })).toBeVisible();
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
