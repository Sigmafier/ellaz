import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

// The studio's own suite. The repository root's vitest.config.ts includes only
// `src/**/*.test.ts`, so nothing here ever runs from the root - `cd studio &&
// npm test` is the only way these run, and the CI workflow says so.
//
// Three resolvers, three alias tables: tsconfig `paths` (for tsc), this file
// (for vitest) and gallery/vite.config.ts (for the gallery). Each needs its own
// entry; holdem learned that the day a test first imported `@shared`.
export default defineConfig({
  test: {
    environment: "node",
    globals: true,
    include: ["art/**/*.test.ts", "export/**/*.test.ts", "adapters/**/*.test.ts", "gallery/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      "@art": fileURLToPath(new URL("./art", import.meta.url)),
      "@export": fileURLToPath(new URL("./export", import.meta.url)),
      "@adapters": fileURLToPath(new URL("./adapters", import.meta.url)),
    },
  },
});
