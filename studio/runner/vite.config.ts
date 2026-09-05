import { fileURLToPath, URL } from "node:url";
import { defineConfig } from "vite";

// One self-contained script. `lib` mode with a single IIFE output is the
// point: Playwright loads it with addScriptTag(path) into a blank page, so
// there is no dev server and therefore no port to pick (never invent one -
// the approved list is the operator's, and a headless page needs none).
export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  build: {
    outDir: fileURLToPath(new URL("../dist-runner", import.meta.url)),
    emptyOutDir: true,
    lib: {
      entry: fileURLToPath(new URL("./main.ts", import.meta.url)),
      name: "studioRunner",
      formats: ["iife"],
      fileName: () => "studio.iife.js",
    },
    minify: false,
    sourcemap: false,
  },
  resolve: {
    alias: {
      "@art": fileURLToPath(new URL("../art", import.meta.url)),
    },
  },
});
