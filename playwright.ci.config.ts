import base from "./playwright.config";

// The release gate in cloudbuild-deploy.yaml: every spec against the candidate build on a local
// dev server, with no LLM key, so answers take the deterministic path. copilot-prod exercises the
// deployed service with live model calls; it checks production, not the candidate, and stays out.
export default {
  ...base,
  testIgnore: ["**/copilot-prod.spec.ts"],
  reporter: [["list"]],
};
