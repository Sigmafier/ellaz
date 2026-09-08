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
const roster = readFileSync("src/portal/shellRoster.ts", "utf8");

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

/**
 * ONE style object out of `GameCard`, found by a property only that object
 * declares. `GameCard` has three of them, and a whole-function search returns
 * whichever comes first in the file: `fontSize: 13.5` read as `12`, the star
 * badge's, and the test failed against a correct stylesheet.
 * `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`
 */
function cardStyleAround(marker: string): string {
  const body = gameCardBody();
  const at = body.indexOf(marker);
  expect(at, `"${marker}" is not in GameCard`).toBeGreaterThan(-1);
  return body.slice(Math.max(0, at - 220), at + 220);
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

  it("puts the name on the game's own accent, with the ink the app derives", () => {
    const name = cssBlock("#home-doc .home-tiles .home-tile-name");
    // The pair, not one side: a strip painted `--g` with `--text` on it is a
    // legibility bug on the dark accents, and a strip with the right ink on the
    // wrong ground is one on the light ones.
    expect(name).toMatch(/background: var\(--game,/);
    expect(name).toMatch(/color: var\(--game-ink,/);
    // Same padding and type as GameCard's label, read from GameCard.
    const label = cardStyleAround("background: meta.color,");
    expect(one(/padding: "([^"]+)"/, label, "GameCard's label padding")).toBe(
      one(/padding: ([\d. a-z]+);/, name, "the name strip's padding"),
    );
    expect(one(/fontSize: ([\d.]+),/, label, "GameCard's label font-size")).toBe(
      one(/font-size: ([\d.]+)px;/, name, "the name strip's font-size"),
    );
    expect(one(/fontWeight: (\d+),/, label, "GameCard's label weight")).toBe(
      one(/font-weight: (\d+);/, name, "the name strip's weight"),
    );
  });

  it("draws the emoji on the app's own tint, at the app's own size", () => {
    const art = cssBlock("#home-doc .home-tiles .ellaz-tint");
    // The document wears the app's OWN wash rather than restating its gradient.
    // A copy is what drifts, so the assertion is that there is no copy: this
    // rule must not declare a background at all, and the emitter must put the
    // app's class on the span.
    expect(art).not.toMatch(/background/);
    expect(cssBlock(".ellaz-tint")).toMatch(/--tint-strength/);
    expect(emitter).toMatch(/class="ellaz-tint" aria-hidden="true"/);
    // 42px here, `fontSize: 42` on the app's emoji span.
    expect(one(/font-size: (\d+)px;/, art, "the tile emoji's size")).toBe(
      one(/fontSize: (\d+),/, cardStyleAround('"--game": meta.color'), "GameCard's emoji size"),
    );
  });

  it("keeps the emoji out of the link's accessible name", () => {
    expect(emitter).toMatch(/class="ellaz-tint" aria-hidden="true"/);
    // And the name itself is real text in the anchor, so the crawlable content
    // of the page is the same words it was before the tiles existed.
    expect(emitter).toMatch(/class="home-tile-name">\$\{gameName\(m\.id, locale\)\}/);
  });

  it("derives the ink with the app's own function, not a second table", () => {
    expect(emitter).toMatch(/import \{ inkFor \} from "\.\.\/ui\/ink";/);
    expect(emitter).toMatch(/--game-ink:\$\{inkFor\(m\.color\)\}/);
    expect(home).toMatch(/color: inkFor\(meta\.color\)/);
  });

  it("lets a long game name wrap rather than clipping it", () => {
    // Measured at 412px: with `white-space: nowrap` the strip rendered "What
    // Comes Next" as "What Comes Ne..." - and the tiles wrapped before the
    // decoration existed, so that was a regression this change introduced.
    // Pinned rather than commented, because it is a deliberate DIFFERENCE from
    // GameCard and the next reader will otherwise "restore" the mirror.
    const name = cssBlock("#home-doc .home-tiles .home-tile-name");
    expect(name).not.toMatch(/white-space:\s*nowrap/);
    expect(name).not.toMatch(/text-overflow/);
  });

  it("decorates exactly the games the app itself paints on its first frame", () => {
    // The emitter cannot import `SHELL_META_COUNT`: `shellRoster.ts` reaches for
    // the `@sdk/index` alias, and `src/build/**` is loaded by `vite.config.ts` at
    // config time where no Vite alias exists. So the two numbers are asserted
    // EQUAL here instead - a hand-kept mirror with something reading both sides.
    expect(one(/DECORATED_HOME_TILES = (\d+);/, emitter, "the emitter's decoration bound")).toBe(
      one(/SHELL_META_COUNT = (\d+);/, roster, "the shell roster's count"),
    );
    // And the bound is actually APPLIED - a constant nothing reads is a lever
    // with no caller. Without this line the whole 42-tile catalogue could be
    // decorated and every other assertion here would still pass.
    expect(emitter).toMatch(/i < DECORATED_HOME_TILES\s*\?/);
  });

  it("is the GAMES list that becomes tiles, and not the facts list", () => {
    expect(emitter).toMatch(/<ul class="home-tiles">\s*\$\{homeGameLinks\(/);
    expect(emitter).toMatch(/<ul>\s*\$\{site\.facts\.map\(/);
  });
});
