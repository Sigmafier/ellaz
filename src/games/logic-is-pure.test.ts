import { describe, it, expect } from "vitest";
import { readdirSync, readFileSync, existsSync } from "node:fs";
import { join, dirname } from "node:path";
import { fileURLToPath } from "node:url";

// The repo has asserted "logic.ts is pure - no DOM/Phaser imports" since day
// one, in CLAUDE.md, and nothing enforced it. This is that enforcement.
//
// It is not style policing. A pure logic module that reaches React or `@ui`
// (which imports global.css as a side effect) stops being unit-testable in the
// node environment vitest runs in, and drags a renderer into every consumer's
// bundle. The failure is silent: everything still builds and passes.
//
// The `@shared` BARREL is banned here for exactly that reason - it re-exports
// Prompt (React) and useGameTimer, so `import { pick } from "@shared"` inside a
// logic module quietly pulls React in. Import the direct module instead
// (`@shared/rng`, `@shared/cast`). Renderers may use the barrel freely.

const HERE = dirname(fileURLToPath(import.meta.url));
const GAMES_DIR = HERE;
const SHARED_DIR = join(HERE, "..", "shared");

// Modules that must stay free of DOM, React and Phaser.
const PURE_BASENAMES = ["logic.ts", "skin.ts"];
const PURE_SHARED = ["rng.ts", "cast.ts", "shapes.ts", "sequence.ts", "notes.ts"];

// Each entry is [pattern, why it is banned] so a failure explains itself
// instead of just naming a regex.
const BANNED: ReadonlyArray<readonly [RegExp, string]> = [
  [/from\s+["']react(-dom)?["']/, "React belongs in the renderer, not the rules"],
  [/from\s+["']phaser["']/, "Phaser is a renderer; logic must run headless"],
  [/from\s+["']@ui(\/|["'])/, "@ui imports global.css as a side effect"],
  [/from\s+["']@juice(\/|["'])/, "@juice touches the DOM directly"],
  [
    /from\s+["']@shared["']|from\s+["']@shared\/index["']/,
    "the @shared barrel re-exports React components - import the direct module (@shared/rng, @shared/cast)",
  ],
];

function pureFiles(): string[] {
  const found: string[] = [];
  for (const entry of readdirSync(GAMES_DIR, { withFileTypes: true })) {
    if (!entry.isDirectory()) continue;
    for (const base of PURE_BASENAMES) {
      const p = join(GAMES_DIR, entry.name, base);
      if (existsSync(p)) found.push(p);
    }
  }
  for (const base of PURE_SHARED) {
    const p = join(SHARED_DIR, base);
    if (existsSync(p)) found.push(p);
  }
  return found;
}

describe("pure logic modules stay pure", () => {
  const files = pureFiles();

  // Positive control. A glob that matches nothing passes every assertion below
  // it, so without this the whole gate could silently become a no-op the moment
  // the directory layout moves.
  it("actually finds the modules it claims to guard", () => {
    expect(files.length).toBeGreaterThanOrEqual(15);
    expect(files.some((f) => f.endsWith(join("memory", "logic.ts")))).toBe(true);
    expect(files.some((f) => f.endsWith(join("shared", "rng.ts")))).toBe(true);
  });

  it("import nothing from React, Phaser, @ui, @juice, or the @shared barrel", () => {
    const violations: string[] = [];
    for (const file of files) {
      const src = readFileSync(file, "utf8");
      for (const [pattern, why] of BANNED) {
        if (pattern.test(src)) {
          violations.push(`${file.replace(HERE, "src/games")}: ${why}`);
        }
      }
    }
    expect(violations).toEqual([]);
  });
});
