import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vitest/config";

export default defineConfig({
  test: {
    environment: "node",
    include: ["shared/src/**/*.test.ts", "server/src/**/*.test.ts", "client/src/**/*.test.ts"],
  },
  resolve: {
    alias: {
      // Vitest resolves aliases from ITS OWN config — never from
      // client/vite.config.ts and never from tsconfig `paths`. There are three
      // independent resolvers and each needs its own entry.
      //
      // This one was MISSING while `include` already claimed
      // client/src/**/*.test.ts, and nothing said so, because no client test
      // had ever existed — a config that promised coverage it could not
      // deliver. The first one to import `@shared/...` failed with a module
      // resolution error that reads like a bug in the code under test.
      "@shared": fileURLToPath(new URL("./shared/src", import.meta.url)),
    },
  },
});
