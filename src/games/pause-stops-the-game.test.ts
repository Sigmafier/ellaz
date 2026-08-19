import { describe, expect, it } from "vitest";
import { readdirSync, readFileSync, statSync } from "node:fs";
import { join } from "node:path";

/**
 * A pause button is only as good as what it stops.
 *
 * Three ways to ship one that looks perfect and is wrong, and none of them is
 * loud - the cover draws, the icon flips, the game reports itself paused:
 *
 * 1. THE CLOCK KEEPS RUNNING. The cover hides the board, so nobody sees the
 *    piece fall or the snake set off. The player lifts the lid onto a game they
 *    have already lost.
 * 2. THE INPUT STAYS LIVE. The chrome's cover sits over the PLAY SURFACE, and
 *    every steering control in both of these games is in the FOOTER below it.
 *    So the pad and the keyboard go on working behind the cover, moving a piece
 *    the player cannot see.
 * 3. THE PORTAL'S RESUME CLEARS THE PLAYER'S PAUSE. `ctx.onResume` fires when a
 *    backgrounded tab comes back. If it writes the same flag the button does,
 *    then pausing, switching apps and returning starts the game under a cover
 *    the player never dismissed - the exact combination a "put the tablet down"
 *    control exists to serve.
 *
 * This is a source scan for the same reason the chrome test next door is: the
 * suite runs `environment: "node"` and cannot mount a component, and the Phaser
 * scene cannot be constructed without an engine and a canvas.
 */

const GAMES_DIR = __dirname;

function sourcesOf(dir: string): Map<string, string> {
  const full = join(GAMES_DIR, dir);
  const out = new Map<string, string>();
  for (const f of readdirSync(full)) {
    if (!/\.tsx?$/.test(f) || /\.test\.tsx?$/.test(f)) continue;
    out.set(f, readFileSync(join(full, f), "utf8"));
  }
  return out;
}

/** Every game directory whose renderer hands `onPaused` to the chrome. */
const PAUSING = readdirSync(GAMES_DIR)
  .filter((f) => statSync(join(GAMES_DIR, f)).isDirectory())
  .filter((dir) => [...sourcesOf(dir).values()].some((s) => /\bonPaused=/.test(s)));

describe("which games offer a pause", () => {
  it("finds the ones that do", () => {
    // The vacuum control. Every assertion below is `for (const dir of PAUSING)`,
    // so a matcher that stops matching turns this whole file green over an
    // empty list - which is how a gate reports confidently about something it
    // never looked at.
    expect(PAUSING).toContain("blocks");
    expect(PAUSING).toContain("snake");
  });

  it("does not offer one where it would mean nothing", () => {
    // A pause is for a game that keeps going while nobody plays it. A
    // turn-based game already stops the moment a hand leaves the screen, so a
    // button there is a control that does nothing - and `reaction` is the sharp
    // case: pausing a reflex test is pausing the thing being measured.
    for (const dir of ["memory", "sudoku", "reaction", "tictactoe", "coloring"]) {
      expect(PAUSING, `${dir} declares a pause it has no clock for`).not.toContain(dir);
    }
  });
});

describe("blocks", () => {
  const src = sourcesOf("blocks").get("BlocksGame.tsx")!;

  it("holds the piece where it was", () => {
    // The gravity tick's own guard. Mutating away either ref restarts the fall
    // behind the cover.
    const guard = /if \(s\.over \|\| ([^)]+)\) return;/.exec(src);
    expect(guard, "the gravity tick no longer guards on anything").toBeTruthy();
    expect(guard![1]).toContain("pausedRef.current");
    expect(guard![1]).toContain("portalPausedRef.current");
  });

  it("resets the step clock on the way OUT, not on the way in", () => {
    // The tick asks how long since the last step. After a two-minute pause the
    // honest answer is two minutes, so without this the piece drops on the
    // first frame back - the exact fall the pause prevented.
    const toggle = src.slice(src.indexOf("const togglePause"), src.indexOf("const start ="));
    expect(toggle).toMatch(/if \(!next\) lastStepRef\.current = performance\.now\(\)/);
  });

  it("refuses every input while paused", () => {
    // One predicate, called by all four actions, so a fifth control added later
    // is covered by construction rather than by somebody remembering.
    expect(src).toContain("const accepting = useCallback(() => !pausedRef.current");
    const calls = src.match(/if \(!accepting\(\)\) return;/g) ?? [];
    expect(calls.length, "an action stopped asking whether input is accepted").toBe(4);
  });

  it("keeps the portal's pause and the player's pause apart", () => {
    // The subtle one. Read the body of `ctx.onResume` and require that it
    // touches only the portal's flag - a `setPaused(false)` or a write to
    // `pausedRef` in here is failure 3 above.
    const at = src.indexOf("ctx.onResume(() => {");
    expect(at, "blocks no longer subscribes to the portal's resume").toBeGreaterThan(0);
    const body = src.slice(at, src.indexOf("}),", at));
    expect(body).toContain("portalPausedRef.current = false");
    expect(body, "the portal's resume clears the player's own pause").not.toMatch(
      /setPaused|(?<!portal)PausedRef\.current\s*=/,
    );
  });

  it("never leaves a cover over a board the player cannot reach", () => {
    // A new board is not a paused one, and a stacked-out one has nothing left
    // to stop. Without the first, a level change made from behind the cover
    // deals a fresh piece into a game that is still hidden.
    expect(src).toMatch(/setPaused\(false\);[\s\S]{0,40}lastStepRef\.current = 0/);
    expect(src).toContain("paused={state.over ? undefined : paused}");
  });
});

describe("snake", () => {
  const scene = sourcesOf("snake").get("SnakeScene.ts")!;
  const game = sourcesOf("snake").get("SnakeGame.tsx")!;

  it("holds the snake where it was", () => {
    expect(scene).toContain('if (this.phase !== "playing" || this.paused) return;');
  });

  it("banks no time while it is stopped", () => {
    // `acc` is the step accumulator and `update` returns before touching it.
    // A pause that kept accumulating would resume by replaying every step the
    // snake "owed" - it would cross the board in one frame.
    const update = scene.slice(scene.indexOf("update(_time: number"));
    const guardAt = update.indexOf("return;");
    expect(update.indexOf("this.acc += delta"), "the accumulator moved above the guard").toBeGreaterThan(
      guardAt,
    );
  });

  it("refuses every input while paused", () => {
    // Four surfaces: the D-pad, the keyboard, and both halves of the swipe.
    // The pad is in the footer, OUTSIDE the cover, so this is not belt and
    // braces - it is the only thing stopping a paused snake being steered.
    const guards = scene.match(/if \(this\.paused\) return;/g) ?? [];
    expect(guards.length, "an input surface stopped checking the pause").toBe(4);
  });

  it("publishes the pause instead of keeping a second copy in React", () => {
    // Two owners of one fact disagree the first time anything but the button
    // moves it - a restart, which clears the flag in the scene and would leave
    // the chrome drawing a cover over a snake that had already set off.
    expect(scene).toContain("paused: this.paused");
    expect(game).toContain("paused={status.phase === \"playing\" ? status.paused : undefined}");
    expect(game, "the chrome keeps its own pause state beside the scene's").not.toMatch(
      /useState[^\n]*paused/i,
    );
  });

  it("clears the pause on restart", () => {
    const restart = scene.slice(scene.indexOf("private restart()"), scene.indexOf("update(_time"));
    expect(restart).toContain("this.paused = false");
  });

  it("only offers the button while the snake is actually moving", () => {
    // On the ready and game-over screens the snake is already stopped, and a
    // cover over either hides the one line saying how to leave it.
    expect(scene).toMatch(/setPaused\(next: boolean\) \{\s*\n(\s*\/\/[^\n]*\n)*\s*if \(this\.phase !== "playing"\) return;/);
    expect(game).toContain("status.phase === \"playing\" ? (next) => sceneRef.current?.setPaused(next) : undefined");
  });
});
