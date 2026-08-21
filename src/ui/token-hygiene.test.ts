import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync, statSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/**
 * Two properties of the token layer, both mechanical.
 *
 * 1. EVERY `var(--x)` resolves to something. A typo'd token is not an error:
 *    the property falls back to its initial value and the element renders
 *    with no background, or black text, or nothing at all. Two of these were
 *    live in this repo when the scanner was written - `--surface-1` and
 *    `--accent`, neither of which has ever existed.
 *
 * 2. NO colour LITERAL in shell code. A hex in a component is a value the
 *    theme cannot reach, so it stays night-coloured under daylight. The
 *    exemptions below are decisions, each with its reason written down.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));
const TOKENS = readFileSync(join(ROOT, "ui/tokens.css"), "utf8");

/** Directories that ship as the app shell. Games own their own look. */
const SHELL_DIRS = ["portal", "ui", "juice", "shared"];

/**
 * Colour literals that are NOT theme failures. Every entry states why, because
 * an allowlist without reasons becomes a place to hide a mistake.
 */
const COLOUR_EXEMPT = new Map<string, string>([
  [
    "ui/tokens.css",
    "the token definitions themselves - this is where colour is supposed to live",
  ],
  [
    "portal/world/art.tsx",
    "the room's 87 literals. A child's room is an interior with its own light; it " +
      "does not have to match the wall the photo of it hangs on. Forking it per theme " +
      "would also break the shop's promise that the thumbnail equals the purchase, and " +
      "item ids live in profile.owned forever.",
  ],
  ["portal/world/Scene.tsx", "the room's frame and floor, same reason as art.tsx"],
  [
    "ui/ink.ts",
    "INK_DARK and INK_LIGHT are the two candidates the contrast helper chooses " +
      "between. They are deliberately not theme tokens: a name strip sits on a " +
      "saturated accent, and what makes it readable is that accent, not the page.",
  ],
  [
    "ui/themes.ts",
    "each theme's browser chrome and splash colour. These cannot be CSS tokens: " +
      "one goes into a <meta> tag and the other into the PWA manifest's JSON, and " +
      "neither surface can read a custom property. They are pinned to the matching " +
      "--brand and --bg by theme-sync.test.ts, so they cannot drift from the theme " +
      "they describe.",
  ],
  [
    "ui/gameArt.ts",
    "the 21 key-art scenes. Same reason as the room, one step further out: a " +
      "thumbnail is an illustration with its own internal light, and swapping " +
      "its paper and ink for theme tokens does not restyle it, it breaks it - " +
      "a memory card drawn in night's --surface is a dark navy playing card. " +
      "The saturated grounds are the game's identity, like meta.color. The " +
      "theme reaches these through exactly one uniform veil rect, which " +
      "game-art.test.ts asserts is present, last, and declared in both theme " +
      "blocks.",
  ],
  [
    "ui/gameArtRest.ts",
    "the same scenes, for the cards below the fold, in their own lazy chunk - " +
      "the half of the split that keeps a first visit from growing with the " +
      "catalogue. Identical reasoning to gameArt.ts above; they are one file " +
      "cut in two, and game-art-split.test.ts is what keeps the cut honest.",
  ],
  [
    "juice/effects.ts",
    "the confetti fallback, used when getComputedStyle returns nothing (jsdom, or " +
      "before the stylesheet parses). Confetti with no colours is invisible confetti.",
  ],
]);

/** Files exempt from everything: dev-only scaffolding with a kill date. */
const DEV_ONLY = /^juice\/lab\//;

function walk(dir: string, base = ""): string[] {
  const out: string[] = [];
  for (const name of readdirSync(join(ROOT, dir))) {
    const rel = base ? `${base}/${name}` : name;
    const abs = join(ROOT, dir, name);
    if (statSync(abs).isDirectory()) out.push(...walk(join(dir, name), rel));
    else if (/\.(ts|tsx|css)$/.test(name) && !/\.test\.tsx?$/.test(name)) out.push(rel);
  }
  return out;
}

const FILES = SHELL_DIRS.flatMap((d) => walk(d, d));

/** `--x` names declared anywhere the app can see. */
export function declaredTokens(css: string): Set<string> {
  return new Set([...css.matchAll(/(--[a-z0-9-]+)\s*:/g)].map((m) => m[1]));
}

/** `var(--x)` reads, with the fallback arm ignored. */
export function readTokens(source: string): string[] {
  return [...source.matchAll(/var\((--[a-z0-9-]+)/g)].map((m) => m[1]);
}

/** Set on the root by the Design Bench, never declared in the token file. */
const BENCH_TOKENS = new Set([
  // The chrome bench's, pinned by `lab/design/variant-is-shipped.test.ts`.
  "--gc-tap", "--gc-gap", "--gc-level-min", "--gc-stat-min", "--gc-radius",
  // The panel bench's, pinned by `lab/design/panel-tokens-are-shipped.test.ts`.
  "--gc-cell-radius", "--gc-cell-bg", "--gc-cell-shadow", "--gc-label", "--gc-value",
  "--gc-record", "--gc-stat-icon", "--gc-level-value", "--gc-head-gap", "--gc-head-pad",
  // The same-slots switch - a style sets these three, never a knob.
  "--gc-row-display", "--gc-empty-display", "--gc-cols",
]);

export const COLOUR_LITERAL = /#[0-9a-fA-F]{3,8}\b|\brgba?\([0-9 ,.%/]+\)|["'](white|black)["']/;

describe("every var() resolves", () => {
  const declared = declaredTokens(TOKENS);

  it("reads a real token file", () => {
    expect(declared.size).toBeGreaterThan(30);
    expect(FILES.length).toBeGreaterThan(10);
  });

  it("has no read of an undeclared token", () => {
    const orphans: string[] = [];
    for (const rel of FILES) {
      const src = readFileSync(join(ROOT, rel), "utf8");
      for (const name of readTokens(src)) {
        if (declared.has(name)) continue;
        // `--game` is set inline on a card and read by .ellaz-tint; `--doc-*`
        // belong to the emitted documents' own stylesheet in src/build.
        if (name === "--game" || name.startsWith("--doc-")) continue;
        // The Design Bench's four. They are SET AT RUNTIME on the root by
        // `src/lab/design/spec.ts` and every read carries the shipped literal
        // as its fallback, so declaring them in tokens.css would buy nothing
        // and cost the first visit 110 B gz against 34 B of headroom
        // (measured 2026-08-21, two arms). Listed BY NAME rather than by
        // `--gc-` prefix on purpose: a typo must still read as an orphan, and
        // a prefix exemption would wave one through.
        if (BENCH_TOKENS.has(name)) continue;
        orphans.push(`${rel}: var(${name})`);
      }
    }
    expect(orphans).toEqual([]);
  });

  it("fires on a planted typo", () => {
    expect(readTokens("color: var(--surface-1)").some((n) => !declared.has(n))).toBe(true);
  });

  it("does not fire on a token that exists", () => {
    expect(readTokens("color: var(--surface)").every((n) => declared.has(n))).toBe(true);
  });

  it("ignores the fallback arm rather than treating it as a second read", () => {
    expect(readTokens("color: var(--brand, #6c5ce7)")).toEqual(["--brand"]);
  });
});

describe("no colour literal escapes the theme", () => {
  it("visits the shell", () => {
    expect(FILES.filter((f) => f.startsWith("portal/")).length).toBeGreaterThan(5);
  });

  it("has no unexplained colour literal", () => {
    const offenders: string[] = [];
    for (const rel of FILES) {
      if (COLOUR_EXEMPT.has(rel) || DEV_ONLY.test(rel)) continue;
      // A comment explaining a historical colour is not a colour in the UI.
      // Block comments are stripped across the WHOLE file before the split,
      // not per line - the rules in this repo run to several lines and the
      // per-line version happily flagged a sentence about a bug we fixed.
      // Newlines are preserved so the reported line numbers stay true.
      const src = readFileSync(join(ROOT, rel), "utf8").replace(/\/\*[\s\S]*?\*\//g, (m) =>
        m.replace(/[^\n]/g, " "),
      );
      src.split("\n").forEach((line, i) => {
        const code = line.replace(/\/\/.*$/, "");
        if (COLOUR_LITERAL.test(code)) offenders.push(`${rel}:${i + 1} ${line.trim()}`);
      });
    }
    expect(offenders).toEqual([]);
  });

  it("every exemption states a reason", () => {
    for (const [file, why] of COLOUR_EXEMPT) {
      expect(why.length, `${file} needs a real reason`).toBeGreaterThan(30);
    }
  });

  // Pinned controls from the plan: these two must NOT read as colours, and
  // these two must.
  it("does not match a route fragment or an element id", () => {
    expect(COLOUR_LITERAL.test('href="#/game/snake"')).toBe(false);
    expect(COLOUR_LITERAL.test('getElementById("#root")')).toBe(false);
  });

  it("matches the literals this repo actually shipped", () => {
    expect(COLOUR_LITERAL.test('color: "#1b1b2b"')).toBe(true);
    expect(COLOUR_LITERAL.test("background: rgba(6, 8, 20, 0.72)")).toBe(true);
  });
});
