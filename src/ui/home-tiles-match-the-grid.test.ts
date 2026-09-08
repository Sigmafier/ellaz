import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";

/**
 * The emitted home document draws the same 42 games the app is about to draw,
 * on the same grid. That is TWO PLACES DRAWING ONE THING - a hand-kept mirror
 * of the app's own geometry, and the tile grid is worth nothing the moment it
 * stops matching: a swap from tiles of the wrong size to tiles of the right
 * size is still a change of everything on screen, which is the entire cost the
 * tile grid exists to remove.
 *
 * So the numbers are asserted EQUAL across the two files rather than pinned to
 * literals here. A literal would let both sides drift together past a green
 * test, and pinning only one side would red on a legitimate change to the app.
 *
 * `.claude/rules/a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`
 */

const css = readFileSync("src/ui/global.css", "utf8");
const home = readFileSync("src/portal/Home.tsx", "utf8");
const emitter = readFileSync("src/build/sitePages.ts", "utf8");

/** A declaration block, by exact selector. Absent is an ERROR, never an empty
 *  string that every `toContain` would then pass over. */
function cssBlock(selector: string): string {
  const at = css.indexOf(`${selector} {`);
  expect(at, `selector "${selector}" is not in global.css`).toBeGreaterThan(-1);
  const end = css.indexOf("}", at);
  expect(end, `selector "${selector}" has no closing brace`).toBeGreaterThan(at);
  return css.slice(at, end);
}

/** `GameCard`'s body alone. Scoped, because `--radius-3` and `--surface` appear
 *  all over `Home.tsx` and a whole-file search would match a different card. */
function gameCardBody(): string {
  const at = home.indexOf("function GameCard(");
  expect(at, "function GameCard( is not in Home.tsx").toBeGreaterThan(-1);
  const end = home.indexOf("\nfunction ", at + 1);
  return home.slice(at, end === -1 ? undefined : end);
}

/** The grid container's own style object, found by the one property only it
 *  declares. */
function gridStyle(): string {
  const at = home.indexOf('gridTemplateColumns: "repeat(auto-fill');
  expect(at, "the game grid's gridTemplateColumns is not in Home.tsx").toBeGreaterThan(-1);
  return home.slice(at, at + 200);
}

const one = (re: RegExp, hay: string, what: string): string => {
  const m = re.exec(hay);
  expect(m, `could not read ${what}`).not.toBeNull();
  return (m as RegExpExecArray)[1];
};

describe("the emitted home document's tiles match the app's grid", () => {
  const tiles = cssBlock("#home-doc .home-tiles");
  const tileLink = cssBlock("#home-doc .home-tiles a");
  const grid = gridStyle();
  const card = gameCardBody();

  it("uses the app's column width", () => {
    expect(one(/minmax\((\d+)px, 1fr\)/, tiles, "the tile grid's minmax")).toBe(
      one(/minmax\((\d+)px, 1fr\)/, grid, "the app grid's minmax"),
    );
  });

  it("uses the app's gap", () => {
    expect(one(/gap: (\d+)px/, tiles, "the tile grid's gap")).toBe(
      one(/gap: (\d+),/, grid, "the app grid's gap"),
    );
  });

  it("uses the card's own box: radius, ground, shadow", () => {
    for (const [cssProp, jsProp] of [
      ["border-radius", "borderRadius"],
      ["background", "background"],
      ["box-shadow", "boxShadow"],
    ] as const) {
      const mine = one(new RegExp(`${cssProp}: var\\((--[a-z0-9-]+)\\)`), tileLink, `the tile's ${cssProp}`);
      const theirs = one(new RegExp(`${jsProp}: "var\\((--[a-z0-9-]+)\\)"`), card, `GameCard's ${jsProp}`);
      expect(mine, `${cssProp} differs from GameCard's ${jsProp}`).toBe(theirs);
    }
  });

  it("is square, like a card", () => {
    expect(tileLink).toMatch(/aspect-ratio: 1 \/ 1;/);
    expect(card).toMatch(/aspectRatio: "1 \/ 1"/);
  });

  it("is the GAMES list that becomes tiles, and not the facts list", () => {
    expect(emitter).toMatch(/<ul class="home-tiles">\s*\$\{homeGameLinks\(/);
    expect(emitter).toMatch(/<ul>\s*\$\{site\.facts\.map\(/);
  });
});
