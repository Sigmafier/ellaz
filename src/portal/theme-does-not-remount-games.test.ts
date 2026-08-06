import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * A theme switch must never remount a game.
 *
 * `GameHost`'s mount effect tears the game down and rebuilds it whenever its
 * dependency array changes. Put `theme` on `GameContext` and the array grows a
 * fourth entry, and then flipping the toggle mid-game resets the board, the
 * timer and the streak - a data-loss bug wearing a styling bug's clothes.
 *
 * Games follow the theme through CSS custom properties instead, with no React
 * involvement at all: the tokens change, the painted pixels change, the
 * component tree is never touched. Phaser is the honest exception, and the
 * wiring there is `themePort.onChange` inside the scene repainting in place -
 * still not a remount.
 *
 * Both halves are pinned here because either one alone permits the bug: a
 * theme field with a clean dep array is a field waiting to be used, and a
 * clean field list with a fourth dep is the remount by another route.
 */

const read = (p: string) => readFileSync(fileURLToPath(new URL(p, import.meta.url)), "utf8");

const HOST = read("./GameHost.tsx");
const TYPES = read("../sdk/types.ts");

/** The dependency array of the mount `useEffect` in GameHost. */
export function mountDeps(source: string): string[] {
  // The mount effect is the one that calls createHostControls.
  const at = source.indexOf("createHostControls");
  expect(at, "GameHost no longer calls createHostControls").toBeGreaterThan(-1);
  const tail = source.slice(at);
  const m = /\}, \[([^\]]*)\]\);/.exec(tail);
  if (!m) throw new Error("could not find the mount effect's dependency array");
  return m[1]
    .split(",")
    .map((d) => d.trim())
    .filter(Boolean);
}

describe("a theme switch does not remount a game", () => {
  it("reads the real files", () => {
    expect(HOST.length).toBeGreaterThan(1000);
    expect(TYPES).toMatch(/GameContext/);
  });

  it("keeps the mount effect's deps at exactly gameId, locale, onExit", () => {
    expect(mountDeps(HOST)).toEqual(["gameId", "locale", "onExit"]);
  });

  it("keeps theme off GameContext", () => {
    // Scoped to the GameContext interface rather than the whole file, so an
    // unrelated mention in a comment or a sibling type cannot fail this.
    const start = TYPES.indexOf("interface GameContext");
    expect(start).toBeGreaterThan(-1);
    const block = TYPES.slice(start, TYPES.indexOf("\n}", start));
    expect(block).not.toMatch(/^\s*(readonly\s+)?theme[?]?\s*:/m);
  });

  // NEGATIVE CONTROLS.
  it("fires on a fourth dependency", () => {
    const planted = "createHostControls(x);\n  }, [gameId, locale, onExit, theme]);";
    expect(mountDeps(planted)).toEqual(["gameId", "locale", "onExit", "theme"]);
  });

  it("fires on a theme field planted in the interface", () => {
    const planted = "interface GameContext {\n  readonly theme: string;\n}";
    const block = planted.slice(0, planted.indexOf("\n}"));
    expect(block).toMatch(/^\s*(readonly\s+)?theme[?]?\s*:/m);
  });

  it("does not fire on a field merely containing the word", () => {
    const ok = "interface GameContext {\n  readonly themeless: string;\n}";
    const block = ok.slice(0, ok.indexOf("\n}"));
    expect(block).not.toMatch(/^\s*(readonly\s+)?theme[?]?\s*:/m);
  });
});
