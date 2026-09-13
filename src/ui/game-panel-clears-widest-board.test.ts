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
  for (const m of src.matchAll(/\bboardVars\(\{([^}]*)\}\)/g)) {
    for (const field of ["cap", "capPc"]) {
      const hit = m[1].match(new RegExp(`\\b${field}\\s*:\\s*(\\d+(?:\\.\\d+)?)`));
      if (hit) out.push(parseFloat(hit[1]));
    }
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

/** The `max-width` on `.ellaz-game-panel`, read out of the shipped stylesheet. */
export function panelCap(css: string): number | null {
  const rule = css.match(/\.ellaz-game-panel\s*\{[^}]*?max-width:\s*(\d+)px/);
  return rule ? parseInt(rule[1], 10) : null;
}

/**
 * The `max-width` on a SHOWCASE game's panel.
 *
 * There are two caps because 700px is a READING width - right for a document
 * page carrying a board, wrong for a game whose arena is LANDSCAPE. Measured
 * 2026-09-13 at 1920x1080: a 16:9 board held to the 684px the shared panel
 * leaves draws 684 x 384, against the 565 x 753 the portrait board drew. One
 * cap would have shipped 38% LESS battlefield under the name of a bigger game.
 *
 * The selector is deliberately the COMPOUND one, so `panelCap` above still
 * matches only the base rule and the two numbers cannot be read for each other.
 */
export function panelCapWide(css: string): number | null {
  const rule = css.match(/\.ellaz-game-panel\.ellaz-panel-wide\s*\{[^}]*?max-width:\s*(\d+)px/);
  return rule ? parseInt(rule[1], 10) : null;
}

/**
 * The game directories whose `meta.ts` declares the showcase band.
 *
 * Read from the TREE rather than from a list here, for the reason the coverage
 * test gives: a hand-kept list of showcase games is a mirror of a field, and it
 * goes stale the first time a second game is promoted. The wider panel rides on
 * `ArcadeChrome`, which is selected on this same field - so this is the same
 * population by construction rather than by coincidence.
 */
function showcaseDirs(): Set<string> {
  const dir = join(ROOT, "games");
  const out = new Set<string>();
  for (const name of readdirSync(dir)) {
    let meta: string;
    try {
      meta = readFileSync(join(dir, name, "meta.ts"), "utf8");
    } catch {
      continue; // not a game directory
    }
    if (/\btier:\s*"showcase"/.test(meta)) out.add(name);
  }
  return out;
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

  it("leaves room for every board in the tree, at ITS OWN band's cap", () => {
    /*
     * AMENDED 2026-09-13, not weakened. It used to compare every game against
     * one number; there are two panels now, so it compares every game against
     * the one it actually gets. The simple band's ceiling is UNCHANGED at 684,
     * which is the half that matters - a showcase exemption must not become a
     * way for any of the other 42 games to grow.
     */
    const usable = panelCap(CSS)! - PANEL_PADDING;
    const usableWide = panelCapWide(CSS)! - PANEL_PADDING;
    const showcase = showcaseDirs();

    const tooWide = sources
      .map((s) => {
        const band = showcase.has(s.file.split("/")[0]) ? "showcase" : "simple";
        return {
          file: s.file,
          band,
          room: band === "showcase" ? usableWide : usable,
          widest: Math.max(0, ...pxCeilings(s.src)),
        };
      })
      .filter((s) => s.widest > s.room);

    expect(
      tooWide.map((s) => `${s.file} (${s.band}) asks for ${s.widest}px, panel leaves ${s.room}px`),
    ).toEqual([]);
  });

  it("the showcase band is real, and is not everybody", () => {
    // Non-vacuity in BOTH directions. An empty showcase set would make the
    // branch above dead code that passes by never matching; a showcase set
    // containing every game would make the wider cap the effective cap for the
    // whole roster, which is precisely what this gate exists to prevent.
    const showcase = showcaseDirs();
    expect(showcase.size).toBeGreaterThan(0);
    expect(showcase.size).toBeLessThan(5);
    expect([...showcase]).toContain("survivors");
  });

  it("the desktop ceiling in boardSize.ts IS the panel's own arithmetic", () => {
    // `boardVars` defaults `capPc` to PANEL_USABLE, so that one number decides
    // how wide every swept board may grow on a desktop. Re-deriving it by hand
    // from the panel cap is what makes it a number two files can disagree
    // about; this is the assertion that stops them drifting apart.
    const src = readFileSync(join(ROOT, "ui", "boardSize.ts"), "utf8");
    const declared = Number(src.match(/PANEL_USABLE\s*=\s*(\d+)/)?.[1]);
    expect(declared).toBe(panelCap(CSS)! - PANEL_PADDING);

    // The same assertion for the showcase panel. Anchored on the FULL name, or
    // `PANEL_USABLE` matches inside `PANEL_USABLE_WIDE` and the two arms both
    // read whichever declaration came first - a check that cannot tell its two
    // subjects apart is the family `a-diagnostic-that-truncates-what-it-compares`
    // collects, and this file has one of those in its own history.
    const declaredWide = Number(src.match(/PANEL_USABLE_WIDE\s*=\s*(\d+)/)?.[1]);
    expect(declaredWide).toBe(panelCapWide(CSS)! - PANEL_PADDING);
    expect(declaredWide).toBeGreaterThan(declared);
  });

  it("reads the ceilings of a board sized through boardVars", () => {
    // Non-vacuity for the branch above: at least one real game must declare
    // this way, or the extractor is dead code that passes by never matching.
    expect(sources.filter((s) => s.src.includes("boardVars(")).length).toBeGreaterThan(0);
    expect(pxCeilings(`...boardVars({ vw: 94, vh: 44, cap: 440, chrome: 259 })`)).toEqual([440]);
    expect(pxCeilings(`...boardVars({ vw: 92, vh: 58, cap: 420, chrome: 292, capPc: 900 })`)).toEqual([420, 900]);
  });

  it("knows what the widest board actually is", () => {
    // Pins the headroom, so shrinking the cap toward the widest board is a
    // visible diff rather than a quiet erosion of the margin.
    const showcase = showcaseDirs();
    const widestOf = (want: boolean) =>
      Math.max(
        ...sources
          .filter((s) => showcase.has(s.file.split("/")[0]) === want)
          .flatMap((s) => pxCeilings(s.src)),
      );

    // The SIMPLE band's headroom is unchanged, and that is the number worth
    // watching: the whole risk of a second cap is that it quietly becomes the
    // first one.
    expect(widestOf(false)).toBe(640); // bees and finddiff
    expect(panelCap(CSS)! - PANEL_PADDING).toBeGreaterThanOrEqual(widestOf(false));

    // And the showcase band's, which is the landscape arena's desktop ceiling.
    expect(widestOf(true)).toBe(1664);
    expect(panelCapWide(CSS)! - PANEL_PADDING).toBeGreaterThanOrEqual(widestOf(true));
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
    });

    it("reads the two caps SEPARATELY, and neither matcher answers for the other", () => {
      // The failure this exists for: `\.ellaz-game-panel\s*\{` must not match
      // the compound selector, or the base cap silently reports 1440 and every
      // one of the other 42 games is measured against a panel it never gets.
      const both =
        ".ellaz-game-panel { max-width: 700px; } .ellaz-game-panel.ellaz-panel-wide { max-width: 1440px; }";
      expect(panelCap(both)).toBe(700);
      expect(panelCapWide(both)).toBe(1440);
      // And the wide matcher must not answer on a stylesheet that has no wide
      // rule at all - `null`, so a missing rule reads as missing rather than as
      // whatever the base rule happens to say.
      expect(panelCapWide(".ellaz-game-panel { max-width: 700px; }")).toBeNull();
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
