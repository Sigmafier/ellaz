import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import {
  DEFAULT_THEME,
  THEMES,
  THEME_STORAGE_KEY,
  needsThemeBoot,
  themeBootScript,
  themeById,
} from "./themes";
import { selectorFor } from "./theme-tokens.test";
// A test may reach into src/build - no-app-imports.test.ts exempts `.test.ts`
// precisely so a gate can drive the real emitter. The APP still may not.
import { DEV_HEAD_ASSETS } from "../build/assets";
import { ROUTES } from "../build/routes";
import { renderRoute } from "../build/pages";

/**
 * Four copies of the same fact, forced to agree.
 *
 * The default theme is stated in four places that cannot import one another:
 * the bare `:root` block in tokens.css, `DEFAULT_THEME` in themes.ts, the
 * `theme-color` meta in index.html, and the PWA manifest in vite.config.ts.
 * Before this file existed the browser-chrome colour was the literal `#6c5ce7`
 * written out three times.
 *
 * Every disagreement here is INVISIBLE in the way this project keeps getting
 * bitten by: a wrong bare-`:root` block flashes the other theme on every cold
 * load and settles correctly a frame later; a wrong meta paints the phone's
 * status bar the wrong colour and nothing else. Neither throws, neither shows
 * up in a test that renders a component.
 */

const root = (p: string) => fileURLToPath(new URL(p, import.meta.url));
const TOKENS = readFileSync(root("./tokens.css"), "utf8");
const INDEX = readFileSync(root("../../index.html"), "utf8");
const VITE = readFileSync(root("../../vite.config.ts"), "utf8");

const DEFAULT = themeById(DEFAULT_THEME);

describe("the default theme is one fact, not four", () => {
  it("reads real files", () => {
    expect(TOKENS).toMatch(/data-theme/);
    expect(INDEX).toMatch(/theme-color/);
    expect(VITE).toMatch(/theme_color/);
  });

  it("gives the bare :root block to DEFAULT_THEME", () => {
    // The one that paints a page whose boot script has not run.
    expect(selectorFor(TOKENS, DEFAULT_THEME)).toMatch(/(^|,)\s*:root\s*(,|$)/);
    for (const t of THEMES) {
      if (t.id === DEFAULT_THEME) continue;
      expect(selectorFor(TOKENS, t.id)).not.toMatch(/(^|,)\s*:root\s*(,|$)/);
    }
  });

  it("matches index.html's theme-color to the default's browser chrome", () => {
    const m = /<meta name="theme-color" content="([^"]+)"/.exec(INDEX);
    expect(m, "index.html has no theme-color meta").not.toBeNull();
    expect(m![1]).toBe(DEFAULT.browserChrome);
  });

  it("derives the PWA manifest rather than repeating the colour", () => {
    // The strongest form of this assertion is that the literal is GONE: a
    // manifest reading `defaultTheme.browserChrome` cannot drift, whereas one
    // matching today's value could drift tomorrow.
    expect(VITE).toMatch(/theme_color:\s*defaultTheme\.browserChrome/);
    expect(VITE).toMatch(/background_color:\s*defaultTheme\.background/);
    expect(VITE).not.toMatch(/theme_color:\s*"#/);
    expect(VITE).not.toMatch(/background_color:\s*"#/);
  });

  it("gives every theme a chrome colour that exists in its own token block", () => {
    // A browser chrome that is not the theme's own brand is a status bar that
    // does not belong to the page under it.
    for (const t of THEMES) {
      const stripped = TOKENS.replace(/\/\*[\s\S]*?\*\//g, "");
      const at = stripped.indexOf(`[data-theme="${t.id}"]`);
      const open = stripped.indexOf("{", at);
      const block = stripped.slice(open + 1, stripped.indexOf("}", open));
      expect(block, `${t.id} --brand should equal its browserChrome`).toMatch(
        new RegExp(`--brand:\\s*${t.browserChrome}\\s*;`, "i"),
      );
      expect(block, `${t.id} --bg should equal its background`).toMatch(
        new RegExp(`--bg:\\s*${t.background}\\s*;`, "i"),
      );
    }
  });
});

describe("the no-flash boot script", () => {
  const script = themeBootScript();

  it("is generated from the theme list, so it cannot go stale", () => {
    for (const t of THEMES) expect(script).toContain(t.id);
    expect(script).toContain(THEME_STORAGE_KEY);
  });

  it("survives junk, an empty store, and a thrown localStorage", () => {
    // Driven for real rather than eyeballed: a boot script that throws runs
    // BEFORE anything else on the page and takes the whole app with it.
    const run = (stored: string | null | "throw") => {
      const el = { attrs: {} as Record<string, string> };
      const sandbox = {
        localStorage: {
          getItem: () => {
            if (stored === "throw") throw new Error("disabled");
            return stored;
          },
        },
        document: {
          documentElement: {
            setAttribute: (k: string, v: string) => {
              el.attrs[k] = v;
            },
          },
        },
      };
      new Function("localStorage", "document", script)(sandbox.localStorage, sandbox.document);
      return el.attrs["data-theme"];
    };

    expect(run(null)).toBeUndefined();
    expect(run("")).toBeUndefined();
    expect(run("not-a-theme")).toBeUndefined();
    expect(run("throw")).toBeUndefined();
    expect(run(DEFAULT_THEME)).toBeUndefined(); // default = absent attribute
  });

  it("sets the attribute for a non-default theme", () => {
    const other = THEMES.find((t) => t.id !== DEFAULT_THEME)!;
    const attrs: Record<string, string> = {};
    new Function(
      "localStorage",
      "document",
      script,
    )(
      { getItem: () => other.id },
      { documentElement: { setAttribute: (k: string, v: string) => (attrs[k] = v) } },
    );
    expect(attrs["data-theme"]).toBe(other.id);
  });

  it("is inlined into index.html by the build", () => {
    // The script only prevents a flash if it runs before first paint, which
    // means inline in <head>, not a module import.
    expect(VITE).toMatch(/themeBootScript/);
  });
});

describe("exactly one boot script per document", () => {
  // Two producers, and in dev they meet. `renderDocument` inlines the script
  // into every emitted page - it must, because those files go straight to disk
  // in generateBundle and never pass through a transform. The Vite plugin
  // injects it into the app shell, which has none of its own. Dev serves
  // emitted pages THROUGH transformIndexHtml, so without a guard the plugin
  // adds a second copy to a page that already had one.
  //
  // Driven against a REAL emitted page and the REAL index.html rather than a
  // hand-written string: a fixture asserts what I believe each producer emits,
  // which is the belief that was wrong.
  const page = renderRoute(
    ROUTES.find((r) => r.kind === "game" && r.locale === "he")!,
    "/",
    DEV_HEAD_ASSETS,
  );

  it("reads a real page and a real shell", () => {
    expect(page).toMatch(/<html/);
    expect(page.length).toBeGreaterThan(2000);
    expect(INDEX).toMatch(/<html/);
  });

  it("leaves an emitted page alone - it already carries one", () => {
    expect(page).toContain(THEME_STORAGE_KEY);
    expect(needsThemeBoot(page)).toBe(false);
  });

  it("still injects into the app shell, which carries none", () => {
    expect(INDEX).not.toContain(THEME_STORAGE_KEY);
    expect(needsThemeBoot(INDEX)).toBe(true);
  });

  it("counts one occurrence in an emitted page, not two", () => {
    const hits = page.split(THEME_STORAGE_KEY).length - 1;
    expect(hits).toBe(1);
  });

  it("fires on a page whose script was removed", () => {
    // The negative control. Strip the key and the predicate must flip - a
    // guard that always answers false would pass every test above.
    expect(needsThemeBoot(page.split(THEME_STORAGE_KEY).join("gone"))).toBe(true);
  });

  it("is actually wired into the plugin, not merely exported", () => {
    // The predicate is useless sitting in themes.ts unread, and that is a
    // plausible way for this to rot: someone simplifies the handler back to an
    // unconditional inject and every test above still passes.
    expect(VITE).toMatch(/needsThemeBoot\(html\)/);
  });
});
