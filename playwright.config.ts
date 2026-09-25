import { defineConfig, devices } from "@playwright/test";

// The server under test never touches production state. The app's stores default to the
// production bucket, and `.env.local` points them there too, so the server this config starts
// gets its own bucket (objects expire after a day) and the deterministic agent path: no model
// call, so no prose drift and no key needed. Variables set here win over `.env.local`.
// Its own port, so a `pnpm dev` already running on :3000 with production settings is never reused.
const PORT = 3100;
const E2E_BUCKET = process.env.E2E_BUCKET ?? "ada-sectors-508410-catalyst-e2e";
const CI = Boolean(process.env.CI);

export default defineConfig({
  testDir: "./tests/e2e",
  // copilot-prod drives the deployed service with live model calls; playwright.prod.config.ts runs it.
  testIgnore: ["**/copilot-prod.spec.ts"],
  fullyParallel: false,
  // A dev server compiles each route on first request, and parallel workers starve it. CI runs a
  // production build instead (routes precompiled), where spec files can run side by side; tests
  // inside one file still run in order.
  workers: CI ? 4 : 1,
  retries: 0,
  // The first page each worker opens on a cold server loads every client chunk at once; with four
  // workers that can take half of the default 30s before a long journey has started.
  timeout: CI ? 60_000 : 30_000,
  maxFailures: CI ? 5 : undefined,
  reporter: CI ? [["list"]] : [["list"], ["html", { open: "never" }]],
  use: {
    baseURL: `http://127.0.0.1:${PORT}`,
    trace: "retain-on-failure",
    screenshot: "only-on-failure",
  },
  projects: [{ name: "chromium", use: { ...devices["Desktop Chrome"], viewport: { width: 1440, height: 1000 } } }],
  webServer: {
    // CI builds first (cloudbuild-deploy.yaml, e2e step) and serves the standalone output.
    command: CI ? "node .next/standalone/server.js" : `pnpm dev --port ${PORT}`,
    url: `http://127.0.0.1:${PORT}`,
    reuseExistingServer: !CI,
    timeout: 120_000,
    env: {
      PORT: String(PORT),
      HOSTNAME: "127.0.0.1",
      AGENT_MODE: "deterministic",
      COPILOT_RETRIEVAL: "on",
      GCS_CACHE_BUCKET: E2E_BUCKET,
      GCS_MEMORY_BUCKET: E2E_BUCKET,
    },
  },
});
