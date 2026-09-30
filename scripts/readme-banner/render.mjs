// Renders banner.html to public/brand/catalyst-readme-banner.png (1600x900).
// Usage: node scripts/readme-banner/render.mjs
import { chromium } from "@playwright/test";
import { fileURLToPath, pathToFileURL } from "node:url";
import path from "node:path";

const here = path.dirname(fileURLToPath(import.meta.url));
const browser = await chromium.launch();
const page = await browser.newPage({ viewport: { width: 1600, height: 900 }, deviceScaleFactor: 1 });
await page.goto(pathToFileURL(path.join(here, "banner.html")).href, { waitUntil: "networkidle" });
await page.evaluate(() => document.fonts.ready);
await page.screenshot({ path: path.resolve(here, "../../public/brand/catalyst-readme-banner.png") });
await browser.close();
