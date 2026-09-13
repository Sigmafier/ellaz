import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";

/**
 * The entrance screen's invariants - the ones a refactor breaks silently.
 *
 * WHAT THIS CAN AND CANNOT SAY, up front rather than discovered later. These
 * are SOURCE assertions. They cannot tell you the entrance RENDERS; only a
 * browser can, and `scripts/repro/repro-board-fills-the-window.mjs` plus the
 * shots published for the operator are what carry that claim. What they CAN do
 * is stop four specific regressions that produce a page which still looks
 * plausible:
 *
 *   1. the HUD drawn UNDER the cover - four numbers bleeding through a title
 *      screen, which is what the alternative's first render looked like;
 *   2. the difficulty drawn TWICE - once on the cover and once under the arena,
 *      which puts the row back and silently re-steals the board's height;
 *   3. a restart button beside a "Play again" that already restarts;
 *   4. the cover refusing pointers the way the HUD does, which would make the
 *      one surface here a player must press unpressable.
 *
 * EVERY CHECK CARRIES ITS OWN MUTATION. A source scan that has never been
 * watched failing is indistinguishable from one whose regex stopped matching,
 * and this repo has a file full of instances. So each assertion is run twice:
 * once against the real source, and once against a copy with the property
 * deliberately broken, which must NOT pass.
 */

const UI = fileURLToPath(new URL(".", import.meta.url));
const CHROME = readFileSync(UI + "ArcadeChrome.tsx", "utf8");
const GAME = readFileSync(UI + "../games/survivors/SurvivorsGame.tsx", "utf8");

/** The denominator, printed by failing loudly if the files are not the files. */
describe("the population is real", () => {
  it("read both sources", () => {
    expect(CHROME.length).toBeGreaterThan(4000);
    expect(GAME.length).toBeGreaterThan(4000);
    expect(CHROME).toContain("export function ArcadeChrome");
  });
});

describe("the HUD is not drawn under the entrance", () => {
  const has = (s: string) => /display:\s*entrance \? "none"/.test(s);

  it("hides on the entrance", () => {
    expect(has(CHROME)).toBe(true);
  });

  it("fires when the guard is removed", () => {
    // The shape a careless cleanup produces: the ternary flattened away.
    const mutated = CHROME.replace(/display:\s*entrance \? "none" : undefined,/, "");
    expect(mutated).not.toBe(CHROME);
    expect(has(mutated)).toBe(false);
  });
});

describe("the cover accepts pointers and the HUD does not", () => {
  /*
   * Counted rather than located. A brace-walk over the entrance block is
   * exactly the instrument that failed twice in this repo's match3 work - a
   * chunk that carries its own neighbour's tail compares as different for a
   * reason that has nothing to do with the property. Counting is blunt and
   * cannot be fooled the same way: the HUD owns the one and only
   * `pointerEvents: "none"` in this file, so a second one appearing is the
   * regression, wherever it is.
   */
  const count = (s: string) => (s.match(/pointerEvents:\s*"none"/g) ?? []).length;

  it("exactly one element refuses pointers", () => {
    expect(count(CHROME)).toBe(1);
  });

  it("fires if the cover gains one", () => {
    const mutated = CHROME.replace(
      'background: "var(--stage-cover)",',
      'background: "var(--stage-cover)", pointerEvents: "none",',
    );
    expect(mutated).not.toBe(CHROME);
    expect(count(mutated)).toBe(2);
  });

  it("the entrance's button is a real button wired to the game's handler", () => {
    expect(CHROME).toMatch(/type="button"\s+onClick=\{entrance\.onAction\}/);
  });
});

describe("nothing is drawn below the arena once a game has an entrance", () => {
  /*
   * `entrance === undefined` and NOT `!entrance`, and this block exists because
   * the truthiness form was WRONG and shipped for twenty minutes.
   *
   * A game that uses an entrance passes `null` while the run is live. `!null`
   * is true, so the difficulty row came back UNDER the arena the instant you
   * pressed Play - the very row this change removed, at the moment the board is
   * sized as though nothing were below it. The board gate is structurally blind
   * to it (it measures the ready screen and never presses Play); the browser
   * probe found it by counting the panel's children mid-run.
   *
   * So these assertions are deliberately anchored on the STRICT form. A future
   * tidy-up to `!entrance` reads as a simplification and is the bug.
   */
  const dutyGuarded = (s: string) =>
    /\{entrance === undefined && levels && level && onLevel &&/.test(s);
  const restartGuarded = (s: string) => /\{ownRestart && entrance === undefined &&/.test(s);

  it("the difficulty below the arena is drawn only when the game has NO entrance", () => {
    expect(dutyGuarded(CHROME)).toBe(true);
  });

  it("the own-restart button is drawn only when the game has NO entrance", () => {
    expect(restartGuarded(CHROME)).toBe(true);
  });

  it("fires when either guard is dropped", () => {
    const a = CHROME.replace(
      "{entrance === undefined && levels && level && onLevel &&",
      "{levels && level && onLevel &&",
    );
    const b = CHROME.replace("{ownRestart && entrance === undefined &&", "{ownRestart &&");
    expect(a).not.toBe(CHROME);
    expect(b).not.toBe(CHROME);
    expect(dutyGuarded(a)).toBe(false);
    expect(restartGuarded(b)).toBe(false);
  });

  it("fires on the truthiness form that was the actual bug", () => {
    // The regression this whole block is about: it LOOKS like a tidy-up.
    const a = CHROME.replace(
      "{entrance === undefined && levels && level && onLevel &&",
      "{!entrance && levels && level && onLevel &&",
    );
    const b = CHROME.replace("{ownRestart && entrance === undefined &&", "{ownRestart && !entrance &&");
    expect(a).not.toBe(CHROME);
    expect(b).not.toBe(CHROME);
    expect(dutyGuarded(a)).toBe(false);
    expect(restartGuarded(b)).toBe(false);
  });
});

describe("the chrome still knows nothing about a game", () => {
  it("imports nothing from src/games", () => {
    expect(CHROME).not.toMatch(/from ["']@?[./\w-]*games\//);
  });

  it("takes the entrance as DATA, not as a game", () => {
    expect(CHROME).toContain("export type ArcadeEntrance");
    // The pips proved the shape works; the entrance follows it. `extra` is a
    // ReactNode precisely so this file never learns what a stick is.
    expect(CHROME).toMatch(/extra\?:\s*ReactNode/);
  });
});

describe("the game hands back null while a run is live", () => {
  const guarded = (s: string) => /asking && !choosing/.test(s);

  it("survivors gates the entrance on both", () => {
    expect(guarded(GAME)).toBe(true);
    expect(GAME).toMatch(/:\s*null\s*\n\s*\}/);
  });

  it("fires if the upgrade-picker half is dropped", () => {
    // Without `!choosing` the entrance can stack on top of the upgrade cover.
    const mutated = GAME.replace("asking && !choosing", "asking");
    expect(mutated).not.toBe(GAME);
    expect(guarded(mutated)).toBe(false);
  });
});
