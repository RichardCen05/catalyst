import base from "./playwright.config";

// Temporary override for prod e2e: same specs, live Cloud Run URL, no local webServer.
export default {
  ...base,
  use: {
    ...base.use,
    baseURL: "https://catalyst-web-1019003607640.us-central1.run.app",
    navigationTimeout: 60_000,
  },
  webServer: undefined,
  // The base config leaves copilot-prod out of local runs; against production it is the point.
  testIgnore: [],
  // Prod answers go through a live Gemini rewrite (~20s) — local 5s default can't hold.
  expect: { timeout: 90_000 },
};
