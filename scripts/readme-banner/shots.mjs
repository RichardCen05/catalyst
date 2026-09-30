// Captures the README screenshots from the live service into public/brand/screens.
// Usage: node scripts/readme-banner/shots.mjs [base-url]
// Then resize: sips -Z 1600 public/brand/screens/*.png (macOS) and re-render the banner.
import { chromium } from "@playwright/test";
import { fileURLToPath } from "node:url";
import path from "node:path";

const base = process.argv[2] ?? "https://catalyst-web-ibyebnreqa-uc.a.run.app";
const out = path.resolve(path.dirname(fileURLToPath(import.meta.url)), "../../public/brand/screens");
const pages = [["/", "dash"], ["/cases", "cases"], ["/cases/ANTM", "case-antm"], ["/impact", "impact"], ["/pantau", "pantau"], ["/ai-learning", "learning"]];

const browser = await chromium.launch();
const context = await browser.newContext({ viewport: { width: 1440, height: 900 }, deviceScaleFactor: 2, colorScheme: "light" });
const page = await context.newPage();

// A fresh profile opens the setup dialog first; skip it so every page renders bare.
await page.goto(base + "/", { waitUntil: "networkidle", timeout: 90000 });
await page.getByRole("button", { name: "Lewati" }).click();

for (const [route, name] of pages) {
  await page.goto(base + route, { waitUntil: "networkidle", timeout: 90000 });
  await page.waitForTimeout(3000);
  while (await page.locator("[role=dialog]").count()) await page.keyboard.press("Escape");
  await page.screenshot({ path: `${out}/${name}.png` });
  console.log(name);
}
await browser.close();
