import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";

/**
 * The desktop panel cap must stay wider than the widest board any game asks for.
 *
 * `.ellaz-game-panel` caps the game panel at 700px above 900px of viewport,
 * which is what stopped the difficulty toggle rendering 1193px wide. A cap is a
 * promise about OTHER people's code though: it is correct only for as long as
 * no game asks for more room than it leaves, and the game that breaks it will
 * be written months from now by someone who has never read that CSS.
 *
 * The failure would also be quiet. The play surface is `overflow: auto`, so an
 * oversized board does not spill and does not throw - it grows a scrollbar
 * inside the panel, which reads as "this game is a bit awkward on desktop"
 * rather than as a regression anyone files.
 *
 * So this reads the game TREE rather than a list, the same way
 * `game-art.test.ts` does. A game added tomorrow is covered with no edit here,
 * and one that asks for 720px fails the build with the number it needs.
 */

const ROOT = fileURLToPath(new URL("..", import.meta.url));

/** GameChrome's own padding, both sides - the panel's width the board cannot use. */
const PANEL_PADDING = 8 * 2;

/** Every game renderer's source, keyed by the path the failure message shows. */
function rendererSources(): Array<{ file: string; src: string }> {
  const dir = join(ROOT, "games");
  const out: Array<{ file: string; src: string }> = [];
  for (const name of readdirSync(dir)) {
    let entries: string[];
    try {
      entries = readdirSync(join(dir, name));
    } catch {
      continue; // not a directory
    }
    for (const f of entries) {
      if (!f.endsWith(".tsx") || f.endsWith(".test.tsx")) continue;
      out.push({ file: `${name}/${f}`, src: readFileSync(join(dir, name, f), "utf8") });
    }
  }
  return out;
}

/**
 * Every px ceiling a `min(...)` in this source could resolve to.
 *
 * Deliberately conservative: it takes the px terms of EVERY `min()`, not only
 * the ones that look like a board. A sprite capped at 96px cannot fail this and
 * costs nothing to include, whereas a rule that tried to recognise "a board"
 * would have to be kept in step with 21 authors' naming.
 */
export function pxCeilings(src: string): number[] {
  const out: number[] = [];
  for (const call of src.match(/min\([^)]*\)/g) ?? []) {
    for (const px of call.match(/(\d+(?:\.\d+)?)px/g) ?? []) out.push(parseFloat(px));
    // A computed ceiling: minesweeper sizes on `${state.cols * 42}px`, so the
    // literal alone (42) understates it by the column count. Resolve it against
    // the widest level the game actually ships.
    const computed = call.match(/\$\{[^}]*?\bcols\s*\*\s*(\d+)\s*\}px/);
    if (computed) {
      const per = parseFloat(computed[1]);
      const cols = maxCols(src);
      if (cols) out.push(per * cols);
    }
  }
  return out;
}

/** The widest `cols:` any level in this file declares, if it declares any. */
function maxCols(src: string): number | null {
  const all = [...src.matchAll(/\bcols:\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
  return all.length ? Math.max(...all) : null;
}

/** The `max-width` on `.ellaz-game-panel`, read out of the shipped stylesheet. */
export function panelCap(css: string): number | null {
  const rule = css.match(/\.ellaz-game-panel\s*\{[^}]*?max-width:\s*(\d+)px/);
  return rule ? parseInt(rule[1], 10) : null;
}

describe("the desktop game panel clears the widest board", () => {
  const CSS = readFileSync(join(ROOT, "ui", "global.css"), "utf8");
  const sources = rendererSources();

  it("covers every game, or names the one it does not", () => {
    // Non-vacuity, stated as coverage rather than as a count: a broken glob
    // makes every assertion below pass while checking nothing, and a threshold
    // ("more than 20 files") would go on passing if a game's renderer stopped
    // being found. So every game directory must either contribute a renderer
    // here or be a known borrower.
    //
    // `evolve` is the borrower and the only one: it renders n2048's component
    // under its own id, so its board is n2048's board and is checked there.
    // `src/games/` holds loose files too (reactHost.tsx, shared tests), so
    // filter to real directories before looking for a meta.ts inside them.
    const dirs = readdirSync(join(ROOT, "games"), { withFileTypes: true })
      .filter((e) => e.isDirectory())
      .map((e) => e.name)
      .filter((d) => readdirSync(join(ROOT, "games", d)).includes("meta.ts"));
    const covered = new Set(sources.map((s) => s.file.split("/")[0]));
    expect(dirs.filter((d) => !covered.has(d))).toEqual(["evolve"]);
    expect(dirs.length).toBeGreaterThanOrEqual(21);
    expect(sources.map((s) => s.file)).toContain("n2048/Game2048.tsx");
  });

  it("declares a cap at all", () => {
    expect(panelCap(CSS)).toBeGreaterThan(0);
  });

  it("leaves room for every board in the tree", () => {
    const cap = panelCap(CSS)!;
    const usable = cap - PANEL_PADDING;
    const tooWide = sources
      .map((s) => ({ file: s.file, widest: Math.max(0, ...pxCeilings(s.src)) }))
      .filter((s) => s.widest > usable);

    expect(
      tooWide.map((s) => `${s.file} asks for ${s.widest}px, panel leaves ${usable}px`),
    ).toEqual([]);
  });

  it("knows what the widest board actually is", () => {
    // Pins the headroom, so shrinking the cap toward the widest board is a
    // visible diff rather than a quiet erosion of the margin.
    const widest = Math.max(...sources.flatMap((s) => pxCeilings(s.src)));
    expect(widest).toBe(640); // bees and finddiff
    expect(panelCap(CSS)! - PANEL_PADDING).toBeGreaterThanOrEqual(widest);
  });

  describe("the extractor fires on the shapes that exist", () => {
    it("finds a plain three-term board", () => {
      expect(pxCeilings(`width: "min(88vw, 48vh, 420px)"`)).toEqual([420]);
    });

    it("finds both terms of a split width/height arena", () => {
      expect(pxCeilings(`w: "min(94vw, 520px)", h: "min(58vh, 440px)"`)).toEqual([520, 440]);
    });

    it("resolves minesweeper's computed ceiling against its widest level", () => {
      const src = "easy: { cols: 9 }, hard: { cols: 14 }\n" + "width: `min(94vw, 52vh, ${state.cols * 42}px)`";
      // 42 is the literal; 14 * 42 = 588 is what it can actually resolve to.
      expect(pxCeilings(src)).toContain(588);
    });

    it("ignores px outside a min() - a border is not a board", () => {
      expect(pxCeilings(`borderRadius: "14px", padding: "10px"`)).toEqual([]);
    });

    it("reads the cap out of real stylesheet text", () => {
      expect(panelCap("@media (min-width: 900px) { .ellaz-game-panel { max-width: 700px; } }")).toBe(700);
      expect(panelCap(".something-else { max-width: 700px; }")).toBeNull();
    });
  });

  it("FAILS when a game asks for more than the cap leaves", () => {
    // The negative control. Without it the suite above passes because nothing
    // is oversized today, which proves the games are fine and says nothing at
    // all about whether this check can see one that is not.
    const planted = `width: "min(94vw, 60vh, 900px)"`;
    const usable = panelCap(CSS)! - PANEL_PADDING;
    expect(Math.max(...pxCeilings(planted))).toBeGreaterThan(usable);
  });
});
