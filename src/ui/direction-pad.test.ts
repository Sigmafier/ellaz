import { readFileSync, readdirSync } from "node:fs";
import { fileURLToPath } from "node:url";
import { join } from "node:path";
import { describe, expect, it } from "vitest";
import { PAD_CELL, PAD_KEYS, padDirection } from "./DirectionPad";

/**
 * The four-way pad, in three parts.
 *
 * 1. THE CROSS. Down sits BELOW left/right, not between them. That is the whole
 *    point of the shape and it is the one property a rendered-width check could
 *    never see - a pad laid out as the old two-row block is exactly as wide,
 *    exactly as tall per row, fully functional, and wrong.
 * 2. THE STICK. `padDirection` is the pure half, so the dead zone and the
 *    dominant-axis rule are testable without a DOM.
 * 3. NOBODY KEEPS A PRIVATE COPY. Two games hand-rolled the same `dpadBtn`
 *    before this component existed, which is how they came to disagree about
 *    cell size in the first place. A third copy would drift the same way.
 */

const GAMES = fileURLToPath(new URL("../games", import.meta.url));

/** Every game renderer, as source. */
function renderers(): { file: string; src: string }[] {
  const out: { file: string; src: string }[] = [];
  for (const id of readdirSync(GAMES, { withFileTypes: true })) {
    if (!id.isDirectory()) continue;
    for (const name of readdirSync(join(GAMES, id.name))) {
      if (!/\.tsx$/.test(name) || /\.test\.tsx$/.test(name)) continue;
      out.push({ file: `${id.name}/${name}`, src: readFileSync(join(GAMES, id.name, name), "utf8") });
    }
  }
  return out;
}

describe("the pad is a cross", () => {
  const by = new Map(PAD_KEYS.map((k) => [k.dir, k]));

  it("draws a real button for all four directions", () => {
    // The stick is `aria-hidden` and is never the only way to steer, so losing
    // an arrow to it would take the game away from a player who cannot drag.
    expect([...by.keys()].sort()).toEqual(["down", "left", "right", "up"]);
  });

  it("puts down BELOW the left/right row, not in it", () => {
    const down = by.get("down")!;
    const left = by.get("left")!;
    const right = by.get("right")!;
    expect(left.row).toBe(right.row);
    expect(down.row).toBeGreaterThan(left.row);
    // The old shape, kept as the negative control: it satisfied every other
    // assertion here, because it placed down in the same row at column 2.
    expect(down.row === left.row && down.column === 2).toBe(false);
  });

  it("stacks up, down and the stick in one column, with left and right either side", () => {
    expect(by.get("up")!.column).toBe(by.get("down")!.column);
    expect(by.get("left")!.column).toBeLessThan(by.get("up")!.column);
    expect(by.get("right")!.column).toBeGreaterThan(by.get("up")!.column);
  });

  it("gives every key its own cell, so nothing is drawn on top of the stick", () => {
    // The middle cell (2,2) is the stick's. A key landing there would be
    // invisible under it, or the stick invisible under the key.
    const cells = PAD_KEYS.map((k) => `${k.column},${k.row}`);
    expect(new Set(cells).size).toBe(PAD_KEYS.length);
    expect(cells).not.toContain("2,2");
  });
});

describe("the pad is sized for the thumb that uses it", () => {
  /** `--tap` and `--tap-kids` from tokens.css, read rather than retyped: the
   *  pad must not drift away from the sizes the rest of the app promises. */
  const TOKENS = readFileSync(fileURLToPath(new URL("./tokens.css", import.meta.url)), "utf8");
  const px = (name: string) => Number(new RegExp(`${name}:\\s*(\\d+)px`).exec(TOKENS)?.[1]);

  it("reads the tap tokens", () => {
    expect(px("--tap")).toBeGreaterThan(0);
    expect(px("--tap-kids")).toBeGreaterThan(px("--tap"));
  });

  it("clears the KIDS target, not merely the adult minimum", () => {
    // 48px is the floor for an adult pointing at a form. This pad is a
    // five-year-old's thumb on a phone, and the platform already has a number
    // for that. Meeting `--tap` and missing `--tap-kids` is the shape of a
    // control that "passes accessibility" and is still too small to play.
    expect(PAD_CELL).toBeGreaterThanOrEqual(px("--tap-kids"));
  });

  it("leaves room either side of a 390px phone", () => {
    // Three cells and two 8px gaps. The pad is centred, so anything wider than
    // the narrowest phone this platform targets is a pad with a key off-screen.
    expect(PAD_CELL * 3 + 16).toBeLessThan(390);
  });
});

describe("the stick reads a direction", () => {
  const R = 50;

  it("says nothing inside the dead zone", () => {
    expect(padDirection(0, 0, R)).toBe(null);
    expect(padDirection(8, 8, R)).toBe(null);
  });

  it("answers each of the four beyond it", () => {
    expect(padDirection(40, 0, R)).toBe("right");
    expect(padDirection(-40, 0, R)).toBe("left");
    // Screen coordinates: +y is DOWN. Getting this backwards is a pad that
    // steers up when the finger goes down, which reads as a broken game.
    expect(padDirection(0, 40, R)).toBe("down");
    expect(padDirection(0, -40, R)).toBe("up");
  });

  it("resolves a diagonal to its dominant axis rather than to both", () => {
    expect(padDirection(40, 20, R)).toBe("right");
    expect(padDirection(20, 40, R)).toBe("down");
    expect(padDirection(-40, -20, R)).toBe("left");
  });

  it("scales the dead zone with the well rather than pinning it to a pixel count", () => {
    // The same displacement that means nothing on a big pad means something on
    // a small one - which is what makes a `size` prop safe to pass.
    expect(padDirection(0, 12, 50)).toBe(null);
    expect(padDirection(0, 12, 20)).toBe("down");
  });

  it("refuses to answer before the well has been measured", () => {
    // `getBoundingClientRect` on an unmounted or display:none pad is all zeros.
    // Without this guard every such read divides by nothing and steers.
    expect(padDirection(40, 0, 0)).toBe(null);
  });
});

describe("no game keeps a private pad", () => {
  const files = renderers();

  it("reads the game tree", () => {
    expect(files.length).toBeGreaterThan(20);
  });

  it("has no hand-rolled dpad helper left", () => {
    const offenders = files.filter((f) => /\bdpadBtn\b/.test(f.src)).map((f) => f.file);
    expect(offenders).toEqual([]);
  });

  it("routes every four-way arrow set through the shared component", () => {
    // A renderer drawing all four arrow glyphs is drawing a pad. It must be
    // this one - otherwise the layout fix lands in one game and not the next.
    const offenders = files
      .filter((f) => ["▲", "▼", "◀", "▶"].every((g) => f.src.includes(g)))
      .filter((f) => !f.src.includes("DirectionPad"))
      .map((f) => f.file);
    expect(offenders).toEqual([]);
  });

  it("finds the games that DO use it, so the check above is not passing by vacuum", () => {
    const users = files.filter((f) => f.src.includes("DirectionPad")).map((f) => f.file).sort();
    expect(users).toEqual(["maze/MazeGame.tsx", "snake/SnakeGame.tsx"]);
  });
});
