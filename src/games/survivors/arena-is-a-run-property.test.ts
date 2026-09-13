import { describe, expect, it } from "vitest";
import { readFileSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { ARENA, ARENA_WIDE, newRun, rngFor, step, type RunState } from "./logic";
import { STICK_RADIUS, originFor } from "./stick";

/**
 * The arena is a property of the RUN, not a constant of the module.
 *
 * WHY THIS FILE EXISTS. Until 2026-09-13 `ARENA` was one module constant and
 * every part of the simulation read it directly. The operator ruled the arena
 * LANDSCAPE on a PC, which means two shapes have to coexist - and the way that
 * change goes wrong is not a crash. Leave any ONE of the old reads behind and
 * the game still boots, still draws, still plays: the canvas is the new shape,
 * the floor underneath it is the old one. Enemies walk in from a line down the
 * middle of the screen, or the ship stops dead 420 units from the left with a
 * third of the arena it can never reach. Nothing throws and nothing logs.
 *
 * So the behavioural tests below drive the WIDE arena specifically and assert
 * things that are impossible on the portrait one. A test that passed on both
 * shapes could not have caught the bug it is here for.
 *
 * EVERY CHECK CARRIES ITS OWN MUTATION, per the house rule: a source scan that
 * has never been watched failing is indistinguishable from one whose regex
 * stopped matching.
 */

const HERE = fileURLToPath(new URL(".", import.meta.url));
const LOGIC = readFileSync(HERE + "logic.ts", "utf8");
const GAME = readFileSync(HERE + "SurvivorsGame.tsx", "utf8");
const CSS = readFileSync(HERE + "../../ui/global.css", "utf8");
const BOARD_SIZE = readFileSync(HERE + "../../ui/boardSize.ts", "utf8");

/**
 * A run that cannot die, for the tests that are about WHERE THE FLOOR ENDS.
 *
 * Without this they are about two things at once. `step` returns immediately
 * once `phase` leaves `"playing"`, so a run that loses its three hearts part way
 * through simply stops moving - and the ship then sits wherever it happened to
 * be when it died, which is a number that has nothing to do with the arena's
 * edge. The assertion would fail on a correct arena, or worse, pass on a broken
 * one because the ship died somewhere plausible. Hearts are not what any of
 * these three tests is measuring, so they are taken off the table.
 */
function immortal(arena: typeof ARENA): RunState {
  const s = newRun("normal", arena);
  s.hp = 9_999;
  s.maxHp = 9_999;
  return s;
}

/** The denominator. A scan over a file that failed to load asserts nothing. */
describe("the population is real", () => {
  it("read the sources", () => {
    expect(LOGIC.length).toBeGreaterThan(4000);
    expect(GAME.length).toBeGreaterThan(4000);
    expect(CSS.length).toBeGreaterThan(4000);
  });
});

describe("the two arenas are the same FIGHT in a different shape", () => {
  it("the wide arena is landscape and the phone arena is portrait", () => {
    expect(ARENA.w / ARENA.h).toBeLessThan(1);
    expect(ARENA_WIDE.w / ARENA_WIDE.h).toBeGreaterThan(1.6);
  });

  it("holds the AREA within 5%, so the crowd is not quietly halved", () => {
    /*
     * The load-bearing one, and the reason it is a test rather than a comment.
     * Enemies arrive at a rate the CLOCK sets, not a rate per unit of floor, so
     * doubling the floor roughly halves the crowd a player must deal with. A
     * same-HEIGHT landscape arena (996 x 560) is 137% more floor - a much
     * easier game, handed out silently under the name of a layout change.
     *
     * This is not a law against retuning the game. It is a law against retuning
     * it by accident while moving a rectangle: if someone wants the easier
     * arena, this red is where they have to say so out loud.
     */
    const portrait = ARENA.w * ARENA.h;
    const wide = ARENA_WIDE.w * ARENA_WIDE.h;
    expect(Math.abs(wide / portrait - 1)).toBeLessThan(0.05);
  });

  it("fires on the same-height arena that would make the game easier", () => {
    const sameHeight = { w: 996, h: 560 };
    expect(Math.abs((sameHeight.w * sameHeight.h) / (ARENA.w * ARENA.h) - 1)).toBeGreaterThan(0.05);
  });

  it("the corner stick's whole ring still fits the wide floor", () => {
    // The wide arena is SHORTER, so the corner stick is the control most at
    // risk from it - its origin is measured up from the bottom edge.
    const { ox, oy } = originFor("corner", 0, 0, ARENA_WIDE);
    expect(ox - STICK_RADIUS).toBeGreaterThanOrEqual(0);
    expect(oy - STICK_RADIUS).toBeGreaterThanOrEqual(0);
    expect(oy + STICK_RADIUS).toBeLessThanOrEqual(ARENA_WIDE.h);
    expect(ox + STICK_RADIUS).toBeLessThanOrEqual(ARENA_WIDE.w);
  });
});

describe("a run played on the wide arena uses the whole of it", () => {
  it("starts in the middle of the arena it was GIVEN", () => {
    const s = newRun("normal", ARENA_WIDE);
    expect(s.x).toBe(ARENA_WIDE.w / 2);
    expect(s.y).toBe(ARENA_WIDE.h / 2);
    // Impossible on the portrait arena, which is the point of asserting it.
    expect(s.x).toBeGreaterThan(ARENA.w / 2);
  });

  it("lets the ship walk past where the portrait arena would have stopped it", () => {
    const s = immortal(ARENA_WIDE);
    // 200 frames at 16ms is 3.2s; the ship covers 148 units a second and needs
    // 313 of them to reach the right wall from the middle. Comfortably past,
    // and short enough that nothing else has time to happen.
    for (let i = 0; i < 200; i++) step(s, 16, { dx: 1, dy: 0 }, () => 0.5);
    expect(s.phase).toBe("playing"); // the run really did keep running
    expect(s.x).toBeGreaterThan(ARENA.w);
    expect(s.x).toBeLessThanOrEqual(ARENA_WIDE.w);
  });

  it("holds the ship inside the wide floor rather than letting it leave", () => {
    const s = immortal(ARENA_WIDE);
    for (let i = 0; i < 200; i++) step(s, 16, { dx: 1, dy: 1 }, () => 0.5);
    expect(s.x).toBeLessThanOrEqual(ARENA_WIDE.w);
    expect(s.y).toBeLessThanOrEqual(ARENA_WIDE.h);
    // The SHORT axis, which the portrait arena would have let it run past.
    expect(s.y).toBeLessThan(ARENA.h);
  });

  it("spawns shapes along the WIDE edges, not down a line in the middle", () => {
    /*
     * The sharpest discriminator here. `edgePoint` used to read the module
     * constant; left that way, every enemy on a 648-wide floor would enter
     * within the leftmost 446 units - a vertical curtain down the middle of the
     * screen with the right third permanently empty. That reads as a spawn-rate
     * bug rather than a shape bug, which is exactly why it needs pinning.
     */
    /*
     * THE GAME'S OWN SEEDED PRNG, and the first version of this test did not
     * use it - which cost a false red and is worth writing down, because the
     * failure looked exactly like a real defect.
     *
     * I hand-rolled a "sweeping" rng as `(n++ % 97) / 97`. But `rng` is called
     * ONLY on the frames that spawn, three times each, so across the ~20 spawns
     * a 900-frame run produces it only ever sampled residues below 0.6.
     * `edgePoint` picks its edge with `Math.floor(rng() * 4)`, and case 3 - the
     * RIGHT edge, the only one that can put an enemy past x=648 - needs 0.75 or
     * more. So the sampler could never select it, reported a widest of 315, and
     * blamed the arena for a hole in the instrument.
     *
     * `rngFor` is uniform, so with ~60 spawns the chance of never drawing the
     * right edge is (3/4)^60, about one in a hundred million - a bound worth
     * stating rather than a hope, because a flaky pin is worse than none.
     */
    const s = immortal(ARENA_WIDE);
    const rng = rngFor(20260913);
    let widest = 0;
    let spawns = 0;
    let before = s.enemies.length;
    for (let i = 0; i < 3000; i++) {
      step(s, 16, { dx: 0, dy: 0 }, rng);
      if (s.enemies.length > before) spawns += s.enemies.length - before;
      before = s.enemies.length;
      for (const e of s.enemies) widest = Math.max(widest, e.x);
    }
    // The POPULATION, printed by being asserted: `widest` stays 0 if nothing
    // ever spawned, and a run that spawned twice says nothing about four edges.
    expect(spawns).toBeGreaterThan(40);
    expect(widest).toBeGreaterThan(ARENA.w + 26);

    /*
     * THE CONTROL, and it is the whole reason this assertion means anything.
     *
     * The two behavioural cases above carry no source mutation, so a green run
     * is compatible with an assertion that simply cannot fail. Driving the
     * IDENTICAL loop on the portrait arena must come out under the same line -
     * if it does not, the threshold is one every arena clears and the test is
     * measuring nothing. (A version of this file reported a confident 315
     * because its sampler could not reach the right edge; a control is what
     * tells those two situations apart.)
     */
    const p = immortal(ARENA);
    const prng = rngFor(20260913);
    let pWidest = 0;
    for (let i = 0; i < 3000; i++) {
      step(p, 16, { dx: 0, dy: 0 }, prng);
      for (const e of p.enemies) pWidest = Math.max(pWidest, e.x);
    }
    expect(pWidest).toBeLessThanOrEqual(ARENA.w + 26);
  });
});

describe("the simulation reads the run's arena and never the module constant", () => {
  /*
   * `ARENA` may appear in `logic.ts` exactly twice - its own declaration, and
   * as `newRun`'s default argument. Any THIRD occurrence is a path left reading
   * the phone's floor while the run is played on another one.
   *
   * Counted rather than located: a brace-walk over `step` is the instrument
   * that failed twice in this repo's match3 work. `\bARENA\b` does not match
   * inside `ARENA_WIDE`, because `_` is a word character.
   */
  const bareReads = (s: string) => (s.match(/\bARENA\b/g) ?? []).length;
  const memberReads = (s: string) => (s.match(/\bARENA\./g) ?? []).length;

  it("names the constant exactly twice, and dereferences it never", () => {
    expect(bareReads(LOGIC)).toBe(2);
    expect(memberReads(LOGIC)).toBe(0);
  });

  it("fires when a single read is left behind", () => {
    // The exact shape of the bug: one clamp restored to the module constant.
    const mutated = LOGIC.replace(
      "s.x = Math.min(s.arena.w - PLAYER_R",
      "s.x = Math.min(ARENA.w - PLAYER_R",
    );
    expect(mutated).not.toBe(LOGIC);
    expect(memberReads(mutated)).toBe(1);
  });
});

describe("the box that is drawn and the floor that is played agree", () => {
  it("the canvas, the aspect ratio and the board's ratio all come from one value", () => {
    // Three separate places could disagree about the shape, and a disagreement
    // between any two is a game drawn at one size and played at another. They
    // read the same `arena` binding, asserted rather than left to review.
    expect(GAME).toMatch(/width: arena\.w,\s*\n\s*height: arena\.h,/);
    expect(GAME).toContain("aspectRatio: `${arena.w} / ${arena.h}`");
    expect(GAME).toContain("ratio: arena.w / arena.h");
    // And the scene is HANDED it, rather than importing a constant of its own.
    expect(GAME).toMatch(/g\.scene\.start\("survivors", \{[\s\S]{0,300}?\barena,/);
  });

  it("fires if the drawn box stops following the simulation", () => {
    const mutated = GAME.replace(
      "aspectRatio: `${arena.w} / ${arena.h}`",
      "aspectRatio: `${ARENA.w} / ${ARENA.h}`",
    );
    expect(mutated).not.toBe(GAME);
    expect(mutated).not.toContain("aspectRatio: `${arena.w} / ${arena.h}`");
  });

  it("picks the shape at the SAME breakpoint the stylesheet sizes the board at", () => {
    /*
     * Two numbers would be two answers. The board's desktop branch lives behind
     * `@media (min-width: 900px)` in `global.css`; a window between the two
     * values would size the box from one shape and play the run on the other,
     * and the symptom is a squashed or letterboxed arena on exactly one range
     * of window widths - the hardest kind of bug to be shown.
     */
    // The read moved into `@ui/boardSize` (2026-09-14) so every wide arena
    // shares one breakpoint. Assert the game uses it AND that it still names
    // the stylesheet's number - either half alone passes on a split answer.
    expect(GAME).toMatch(/useState<Arena>\(\(\) => \(isPcArena\(\) \? ARENA_WIDE : ARENA\)\)/);
    expect(BOARD_SIZE).toContain("export const PC_MIN_WIDTH = 900;");
    expect(BOARD_SIZE).toContain("window.matchMedia(`(min-width: ${PC_MIN_WIDTH}px)`)");
    expect(CSS).toContain("@media (min-width: 900px)");
  });
});
