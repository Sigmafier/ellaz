import { describe, expect, it } from "vitest";
import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { PANEL_USABLE } from "./boardSize";

/**
 * The desktop panel cap must stay wider than the widest board any game asks for.
 *
 * `.ellaz-game-panel` has NO width cap above 900px of viewport since 2026-09-14
 * (operator: "use the entire width of the PC screen"), and its ROW (`.gc-head`, the footer) at 700px - the row cap is what stopped
 * the difficulty toggle rendering 1193px wide. Until 2026-09-14 the 700px sat on
 * the whole panel and capped every board with it; the operator ruled every game
 * gets a PC version, so it moved to the only thing it was ever measured for. A cap is a
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
  for (const call of minCalls(src)) {
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
  /*
   * A board sized through `boardVars({ ... })` declares its ceilings as FIELDS,
   * not as a `min()` - so without this branch every game the sizing sweep
   * converts would leave this gate's population in silence, and a gate whose
   * scope narrows as the tree changes reports green about boards it can no
   * longer see. (`a-path-filter-is-a-hand-kept-mirror-of-an-import-graph.md`;
   * the sweep is precisely the change that would have caused it.)
   *
   * `capPc` is the desktop ceiling and is usually omitted, defaulting to
   * `PANEL_USABLE` - which the test below pins to the panel's own arithmetic, so
   * the default can never be the thing that overflows.
   */
  // Balanced, not `[^}]*`: an arena passes a NESTED `h: { vh, cap }`, and a
  // matcher stopping at the first `}` does not match the call at all - the
  // board would leave this gate's population in silence (2026-09-14, bubbles).
  // Every px-bearing field is read, the nested phone height's cap included.
  for (const m of src.matchAll(/\bboardVars\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
    }
    const call = src.slice(m.index, i);
    for (const hit of call.matchAll(/\b(?:cap|capPc)\s*:\s*(\d+(?:\.\d+)?)/g)) out.push(parseFloat(hit[1]));
  }
  return out;
}

/**
 * Every `min(...)` in the source, with balanced parentheses.
 *
 * This used to be `src.match(/min\([^)]*\)/g)`, which stops at the FIRST `)`.
 * `blocks` writes `min(${(88 / cols).toFixed(2)}vw, …, 30px)` — so that regex
 * matched only `min(${(88 / cols)` and the `30px` cap, the single thing this
 * gate exists to read, was invisible to it. Nothing failed, because 30 is far
 * under the panel cap; and nothing ever would have, whatever that number grew
 * to. A check that cannot see a value reports green about it forever.
 *
 * It had already cost a real workaround: an author computed a vw term into a
 * variable instead of interpolating it inline, purely to stay visible to the
 * broken matcher. A documented workaround is an unfixed bug whose comment makes
 * it read as handled — so the matcher is fixed and the workaround is free to go.
 *
 * (Found 2026-08-13 while adding two games. Same family as
 * `.claude/rules/a-diagnostic-that-truncates-what-it-compares.md`: an instrument
 * that cannot represent the thing it is looking for.)
 */
function minCalls(src: string): string[] {
  const out: string[] = [];
  for (const m of src.matchAll(/min\(/g)) {
    let depth = 1;
    let i = m.index + m[0].length;
    for (; i < src.length && depth > 0; i++) {
      if (src[i] === "(") depth++;
      else if (src[i] === ")") depth--;
    }
    if (depth === 0) out.push(src.slice(m.index, i));
  }
  return out;
}

/** The widest `cols:` any level in this file declares, if it declares any. */
function maxCols(src: string): number | null {
  const all = [...src.matchAll(/\bcols:\s*(\d+)/g)].map((m) => parseInt(m[1], 10));
  return all.length ? Math.max(...all) : null;
}

/**
 * The `max-width` on `.ellaz-game-panel`, read out of the shipped stylesheet:
 * a px number, `"none"`, or `null` when no such rule exists. Three states, so a
 * deleted rule can never read as "uncapped".
 */
export function panelCap(css: string): number | "none" | null {
  const rule = css.match(/\.ellaz-game-panel\s*\{[^}]*?max-width:\s*(\d+px|none)/);
  if (!rule) return null;
  return rule[1] === "none" ? "none" : parseInt(rule[1], 10);
}

/**
 * The `max-width` on the panel's ROW - the controls and numbers.
 *
 * A separate number from the panel's, and read separately: the row is a reading
 * width and the panel is a stage. The selector is the child combinator, so
 * `panelCap` above (which wants `.ellaz-game-panel {`) can never read it.
 */
export function rowCap(css: string): number | null {
  const rule = css.match(/\.ellaz-game-panel\s*>\s*\.gc-head\s*,[^{]*\{[^}]*?max-width:\s*(\d+)px/);
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

  it("the panel is the whole screen on a PC - an explicit none, not a missing rule", () => {
    expect(panelCap(CSS)).toBe("none");
  });

  it("leaves room for every board in the tree", () => {
    /*
     * AMENDED 2026-09-14. There were two bands - a 684px ceiling for 42 games
     * and 1664px for the showcase one. The 700px was a READING width for the
     * row, so it moved onto the row, and every game gets the stage. What this
     * still refuses is a board asking for more than the stage leaves.
     */
    const usable = PANEL_USABLE;
    const tooWide = sources
      .map((s) => ({ file: s.file, widest: Math.max(0, ...pxCeilings(s.src)) }))
      .filter((s) => s.widest > usable);
    expect(tooWide.map((s) => `${s.file} asks for ${s.widest}px, panel leaves ${usable}px`)).toEqual([]);
  });

  it("the row keeps its reading width while the panel is a stage", () => {
    // The whole reason the 700px existed: an uncapped row rendered a
    // difficulty toggle 1193px wide. Moving the cap must not DROP it - and a
    // row cap as wide as the panel would be the same drop wearing a number.
    expect(rowCap(CSS)).toBe(700);
    expect(rowCap(CSS)!).toBeLessThan(PANEL_USABLE);
  });

  it("a footer beside the board keeps the board on the screen's centre line", () => {
    // Operator, 2026-09-14: "we must keep the game in the middle no matter
    // what". Two columns (board, footer) put every such game half a footer
    // left of centre. The board's column must sit between two EQUAL tracks,
    // and the room it is sized from must pay for both of them.
    const grid = CSS.match(/:has\(> \.ellaz-game-footer, > \.ellaz-game-side\)\s*\{([^}]*)\}/)?.[1] ?? "";
    expect(grid).toMatch(/grid-template-columns:\s*var\(--gc-side\)\s+minmax\(0,\s*1fr\)\s+var\(--gc-side\);/);
    expect(grid).toMatch(/--b-room:\s*calc\(100vw - 2 \* var\(--gc-side\)/);
    const col = (sel: string) =>
      CSS.match(new RegExp(`${sel.replace(/[.*+?^${}()|[\]\\>]/g, "\\$&")}\\s*\\{[^}]*grid-column:\\s*(\\d)`))?.[1];
    expect(col(":has(> .ellaz-game-footer, > .ellaz-game-side) > .ellaz-play-surface")).toBe("2");
    expect(col(".ellaz-game-panel > .ellaz-game-footer")).toBe("3");
    // A game's picker takes the column that only existed to keep the board centred.
    expect(col(".ellaz-game-panel > .ellaz-game-side")).toBe("1");
  });

  it("a control beside the board is never behind a scrollbar or past the window", () => {
    // Operator, 2026-09-14: "i see the colors ... are out of the screen". The
    // columns were `overflow-y: auto`, so maze's down arrow sat under a
    // scrollbar at 1024x768 and coloring's pictures ran past the window edge.
    // Content now scales to fit (fitColumn.ts) and a sideways strip wraps; the
    // browser half of this is scripts/repro/repro-controls-stay-on-screen.mjs.
    const pc = CSS.slice(CSS.indexOf(".ellaz-game-panel > .ellaz-game-footer,\n  .ellaz-game-panel > .ellaz-game-side {"));
    // Comments stripped first: the block's own comment names the old `overflow-y: auto`.
    const cols = (pc.match(/^[^}]*\}/)?.[0] ?? "").replace(/\/\*[\s\S]*?\*\//g, "");
    expect(cols).toMatch(/overflow:\s*visible;/);
    expect(cols).not.toMatch(/overflow(-y|-x)?:\s*(auto|scroll|hidden)/);
    expect(CSS).toMatch(/\.ellaz-strip\s*\{[^}]*flex-wrap:\s*wrap !important;[^}]*overflow:\s*visible !important;/);
    const chrome = readFileSync(join(ROOT, "ui", "GameChrome.tsx"), "utf8");
    expect(chrome).toMatch(/fitColumns\(panelRef\.current\)/);
  });

  it("the desktop ceiling in boardSize.ts is a 4K screen less the panel padding", () => {
    // With no panel cap there is no panel arithmetic to match; the ceiling is
    // the widest CSS viewport we name. Read from the source, not the import,
    // so the number a reviewer sees is the number asserted.
    const src = readFileSync(join(ROOT, "ui", "boardSize.ts"), "utf8");
    const declared = Number(src.match(/PANEL_USABLE\s*=\s*(\d+)/)?.[1]);
    expect(declared).toBe(3840 - PANEL_PADDING);
    expect(declared).toBe(PANEL_USABLE);
  });

  it("reads the ceilings of a board sized through boardVars", () => {
    // Non-vacuity for the branch above: at least one real game must declare
    // this way, or the extractor is dead code that passes by never matching.
    expect(sources.filter((s) => s.src.includes("boardVars(")).length).toBeGreaterThan(0);
    expect(pxCeilings(`...boardVars({ vw: 94, vh: 44, cap: 440, chrome: 259 })`)).toEqual([440]);
    expect(pxCeilings(`...boardVars({ vw: 92, vh: 58, cap: 420, chrome: 292, capPc: 900 })`)).toEqual([420, 900]);
    // An arena's nested phone height: the call must still be SEEN, and both
    // caps read. The old `[^}]*` matcher returned [] here.
    expect(pxCeilings(`...boardVars({ vw: 94, cap: 520, h: { vh: 56, cap: 440 }, chrome: 260 })`)).toEqual([520, 440]);
  });

  it("knows what the widest board actually is", () => {
    // Pins the headroom, so shrinking the cap toward the widest board is a
    // visible diff rather than a quiet erosion of the margin. 1664 is
    // survivors' landscape arena, the one board that declares the stage.
    const widest = Math.max(...sources.flatMap((s) => pxCeilings(s.src)));
    expect(widest).toBe(1664);
    expect(PANEL_USABLE).toBeGreaterThanOrEqual(widest);
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

    /* The one this gate could not read until 2026-08-13. The old matcher was
       `/min\([^)]*\)/`, which stops at the first `)` - so an interpolated term
       carrying its own parens swallowed the cap, and the gate reported green
       about a number it had never seen. `blocks` is the live instance.

       Both halves matter: it must find the cap behind an inner paren, AND it
       must still stop at the right place on the plain shape, or "balanced"
       becomes "runs to the end of the file and finds every px after it". */
    it("finds a cap hidden behind an interpolated term", () => {
      const blocksShape = "min(${(88 / cols).toFixed(2)}vw, ${(52 / rows).toFixed(2)}vh, 30px)";
      expect(pxCeilings(blocksShape)).toEqual([30]);
      expect(pxCeilings(`min(94vw, 60vh, 480px)  borderRadius: "999px"`)).toEqual([480]);
    });

    it("reads the cap out of real stylesheet text", () => {
      expect(panelCap("@media (min-width: 900px) { .ellaz-game-panel { max-width: 700px; } }")).toBe(700);
      expect(panelCap(".something-else { max-width: 700px; }")).toBeNull();
      expect(panelCap("@media (min-width: 900px) { .ellaz-game-panel { max-width: none; } }")).toBe("none");
    });

    it("reads the panel cap and the row cap SEPARATELY", () => {
      // `\.ellaz-game-panel\s*\{` must not match the row's child selector, or
      // the panel reports 700 and every board is measured against the row.
      const both =
        ".ellaz-game-panel { max-width: 1680px; } .ellaz-game-panel > .gc-head, .ellaz-game-panel > .ellaz-game-footer { max-width: 700px; }";
      expect(panelCap(both)).toBe(1680);
      expect(rowCap(both)).toBe(700);
      // And no row rule reads as missing, not as the panel's number.
      expect(rowCap(".ellaz-game-panel { max-width: 1680px; }")).toBeNull();
    });
  });

  it("FAILS when a game asks for more than the cap leaves", () => {
    // The negative control. Without it the suite above passes because nothing
    // is oversized today, which proves the games are fine and says nothing at
    // all about whether this check can see one that is not.
    const planted = `width: "min(94vw, 60vh, 3900px)"`;
    const usable = PANEL_USABLE;
    expect(Math.max(...pxCeilings(planted))).toBeGreaterThan(usable);
  });
});
