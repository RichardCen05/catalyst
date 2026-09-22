import { defineConfig } from "vitest/config";
import path from "node:path";
import { fileURLToPath } from "node:url";

const root = path.dirname(fileURLToPath(import.meta.url));

export default defineConfig({
  test: {
    environment: "node",
    include: ["tests/**/*.test.ts"],
    /**
     * Production parity. `docs/DEPLOY.md` sets COPILOT_RETRIEVAL=on on the
     * Cloud Run service, `.env.example` leaves it off, and the suite used to
     * follow `.env.example` — so every routing verdict in it described a path
     * readers never take. Turning it on here is what makes a green run mean
     * anything about the deployed answer path.
     */
    env: { COPILOT_RETRIEVAL: "on" },
  },
  resolve: { alias: { "@": root } },
});
