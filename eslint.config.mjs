import { defineConfig, globalIgnores } from "eslint/config";
import nextVitals from "eslint-config-next/core-web-vitals";
import nextTs from "eslint-config-next/typescript";

export default defineConfig([
  ...nextVitals,
  ...nextTs,
  // Worktrees carry their own build output, and a build artefact is not
  // source this repository lints. Without this the raw exit code is 2 for
  // reasons no commit here can fix.
  globalIgnores([".next/**", ".claude/worktrees/**", "playwright-report/**", "test-results/**"]),
]);
