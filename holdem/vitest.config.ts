import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/src/**/*.test.ts", "server/src/**/*.test.ts", "client/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Vitest resolves aliases from ITS OWN config, never from
      // client/vite.config.ts. A missing entry here fails with a
      // module-resolution error that reads like a bug in the code under test,
      // which is why ellaz's own vitest.config.ts carries the same warning.
      "@shared": fileURLToPath(new URL("./shared/src", import.meta.url)),
    },
  },
});
