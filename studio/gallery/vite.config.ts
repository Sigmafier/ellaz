import { fileURLToPath, URL } from "node:url";
import { defineConfig, type Plugin } from "vite";

// ONE HTML file. The gallery is opened from file:// (the operator's browser,
// the Visual Hall copies it as-is) and from a headless page for shots, and
// neither can load a module script from a sibling file over file://. So the
// build inlines its single JS chunk and its CSS into index.html. No dev
// server is configured on purpose: a port is the operator's to authorise,
// and this page needs none.
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
  plugins: [singleFile()],
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
