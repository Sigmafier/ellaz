import { defineConfig } from "vitest/config";
import { fileURLToPath, URL } from "node:url";

// Logic tests are pure TS (no DOM) and run in the node environment for speed.
export default defineConfig({
  test: {
    globals: true,
    environment: "node",
    include: ["src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@sdk": fileURLToPath(new URL("./src/sdk", import.meta.url)),
      "@ui": fileURLToPath(new URL("./src/ui", import.meta.url)),
      "@juice": fileURLToPath(new URL("./src/juice", import.meta.url)),
      "@i18n": fileURLToPath(new URL("./src/i18n", import.meta.url)),
      // Vitest resolves aliases from ITS OWN config, not vite.config.ts — a missing
      // entry here fails tests with a module-resolution error that reads like a code bug.
      "@shared": fileURLToPath(new URL("./src/shared", import.meta.url)),
    },
  },
});
