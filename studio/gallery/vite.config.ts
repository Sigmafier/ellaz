import { fileURLToPath, URL } from "node:url";
import react from "@vitejs/plugin-react";
import tailwindcss from "@tailwindcss/vite";
import { defineConfig, type Plugin } from "vite";

// The gallery is shadcn + Radix on the ellaz tokens (the products-vs-tools
// rule: a product ships on the lightest kit that meets its byte budget, a
// tool ships on the one shared kit). Two ways to open it, both real:
//
//   npm run gallery         the dev server, on 5188 and ONLY 5188. The port
//                           is the operator's to authorise and this one is
//                           on the approved list; strictPort means a taken
//                           port is an error, never a silently different
//                           origin (which cannot be logged into and loses
//                           the browser's state).
//   npm run gallery:build   ONE HTML file. The Visual Hall copies it as-is
//                           and the shots script opens it over file://, and
//                           neither can load a module script from a sibling
//                           file over file://. So the build inlines its
//                           single JS chunk and its CSS into index.html.
function singleFile(): Plugin {
  return {
    name: "studio-single-file",
    enforce: "post",
    generateBundle(_opts, bundle) {
      const html = Object.values(bundle).find((b) => b.type === "asset" && b.fileName.endsWith(".html"));
      if (!html || html.type !== "asset") throw new Error("single-file: no html emitted");
      let src = String(html.source);
      for (const [name, chunk] of Object.entries(bundle)) {
        if (chunk.type === "chunk") {
          const tag = new RegExp(`<script[^>]*src="[./]*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*></script>`);
          if (!tag.test(src)) throw new Error(`single-file: html does not reference chunk ${name}`);
          src = src.replace(tag, () => `<script type="module">${chunk.code.replace(/<\/script/g, "<\\/script")}</script>`);
          delete bundle[name];
        } else if (chunk.type === "asset" && name.endsWith(".css")) {
          const tag = new RegExp(`<link[^>]*href="[./]*${name.replace(/[.*+?^${}()|[\]\\]/g, "\\$&")}"[^>]*>`);
          if (!tag.test(src)) throw new Error(`single-file: html does not reference css ${name}`);
          src = src.replace(tag, () => `<style>${String(chunk.source)}</style>`);
          delete bundle[name];
        }
      }
      if (/<(script|link)[^>]*(src|href)="[^"]*assets\//.test(src)) throw new Error("single-file: an external asset reference survived inlining");
      html.source = src;
    },
  };
}

export default defineConfig({
  root: fileURLToPath(new URL(".", import.meta.url)),
  base: "./",
  plugins: [react(), tailwindcss(), singleFile()],
  resolve: {
    alias: { "@": fileURLToPath(new URL("./src", import.meta.url)) },
  },
  server: { port: 5188, strictPort: true, host: "localhost" },
  preview: { port: 5188, strictPort: true, host: "localhost" },
  build: {
    outDir: fileURLToPath(new URL("../dist-gallery", import.meta.url)),
    emptyOutDir: true,
    modulePreload: false,
    cssCodeSplit: false,
    assetsInlineLimit: 1024 * 1024 * 16,
    rollupOptions: { output: { inlineDynamicImports: true } },
    minify: true,
  },
});
