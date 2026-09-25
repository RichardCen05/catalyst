import { readFileSync } from "node:fs";
import { join } from "node:path";
import { describe, expect, it } from "vitest";

// The deploy and refresh pipelines are YAML read by Cloud Build, not code this suite runs.
// These checks pin the properties whose loss once shipped silently: the refresh pinning a
// provider (revision catalyst-web-00082-wp2 went back to Gemini) and the refresh building
// from a snapshot older than the serving code.

const root = join(__dirname, "..");
const deploy = readFileSync(join(root, "cloudbuild-deploy.yaml"), "utf8");
const refresh = readFileSync(join(root, "cloudbuild-refresh.yaml"), "utf8");
const bodyScript = readFileSync(join(root, "scripts/refresh_job_body.py"), "utf8");

const stepIds = (yaml: string) => [...yaml.matchAll(/^ {2}- id: ([\w-]+)$/gm)].map((m) => m[1]);

// The text of one step, from its `- id:` line to the next step or top-level key.
function step(yaml: string, id: string): string {
  const start = yaml.indexOf(`  - id: ${id}\n`);
  expect(start, `step ${id}`).toBeGreaterThanOrEqual(0);
  const rest = yaml.slice(start + 1);
  const end = rest.search(/^ {2}- id: |^\S/m);
  return end < 0 ? rest : rest.slice(0, end);
}

describe("cloudbuild-deploy.yaml", () => {
  it("snapshots the deployed source, renders the worker body before deploying, syncs after", () => {
    expect(stepIds(deploy)).toEqual([
      "check-provider",
      "pull-recordings",
      "build-bundle",
      "snapshot",
      "render-worker-body",
      "install",
      "gate",
      "pytest",
      "deploy",
      "sync-workers",
    ]);
  });

  it("gives every provider profile the secrets the app and its scheduler need", () => {
    const script = step(deploy, "deploy");
    const base = script.match(/BASE_SECRETS=(\S+)/)?.[1] ?? "";
    for (const secret of ["GOOGLE_API_KEY", "INTERNAL_CRON_SECRET", "SECTORS_API_KEY", "OPERATOR_TOKEN"]) {
      expect(base).toContain(`${secret}=${secret}:latest`);
    }
    for (const profile of ["deepseek", "openrouter", "gemini"]) {
      const branch = script.match(new RegExp(`^\\s+${profile}\\)\\n([\\s\\S]*?);;`, "m"))?.[1] ?? "";
      expect(branch, profile).toContain("--set-secrets=\"$$BASE_SECRETS");
      expect(branch, profile).toContain("--set-env-vars=\"$$COMMON_ENV");
      if (profile !== "gemini") expect(branch, profile).toContain("LLM_API_KEY=LLM_API_KEY:latest");
    }
  });

  it("uploads the snapshot to the object the refresh job builds from", () => {
    const object = bodyScript.match(/"object": "([^"]+)"/)?.[1];
    expect(object).toBeTruthy();
    expect(deploy).toMatch(new RegExp(`_SNAPSHOT: gs://ada-sectors-508410_cloudbuild/${object}\\n`));
  });

  it("leaves production untouched on a dry run", () => {
    for (const id of ["deploy", "sync-workers"]) {
      expect(step(deploy, id), id).toMatch(/\[ "\$\{_DRY_RUN\}" = true \] && \{ echo "dry run: skip/);
    }
  });
});

describe("cloudbuild-refresh.yaml", () => {
  it("deploys with the serving revision's env and secrets", () => {
    const script = step(refresh, "deploy");
    expect(script).not.toContain("--set-env-vars");
    expect(script).not.toContain("--set-secrets");
  });
});
