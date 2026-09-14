import { readFileSync } from "node:fs";
import { describe, expect, it } from "vitest";
import {
  CONTROL_MODES,
  CONTROL_MODE_KEY,
  DEFAULT_CONTROL_MODE,
  readControlMode,
  type ControlMode,
} from "@shared/useControlMode";
import { CONTROL_MODE_LABEL, ControlModePicker } from "./ControlModePicker";
import { BOARD_STICK_RADIUS } from "./BoardStick";
import { readStick } from "./DirectionPad";

/**
 * The Controls setting, ruled by the operator 2026-09-14: steering games offer
 * Arrows (the default), Joystick, and On the board.
 *
 * Node environment, no DOM - so the hook is tested through its pure reader, the
 * picker by calling the component and reading the tree it returns, and the
 * board stick through its pure `readStick`.
 */

describe("the stored mode is validated, never trusted", () => {
  it("reads each real mode back as itself", () => {
    for (const m of CONTROL_MODES) expect(readControlMode(m)).toBe(m);
  });

  it("reads anything else as arrows", () => {
    // A renamed id, a typo, a hand-edited entry, a value of the wrong type, and
    // nothing at all. Each must land on the mode a child can always play with,
    // never on a game with no controls drawn.
    for (const junk of ["stick", "Arrows", "", " arrows", null, undefined, 1, {}, ["board"]]) {
      expect(readControlMode(junk), `stored ${JSON.stringify(junk)}`).toBe("arrows");
    }
  });

  it("defaults to arrows, and the key is the one persisted forever", () => {
    expect(DEFAULT_CONTROL_MODE).toBe("arrows");
    // Renaming this resets every player's choice silently. It is pinned so the
    // rename has to walk past a red test that says why.
    expect(CONTROL_MODE_KEY).toBe("controlMode");
  });

  it("the hook reads storage through the validator and that key", () => {
    // The pure function above is only a guarantee if the hook uses it.
    const src = readFileSync(new URL("../shared/useControlMode.ts", import.meta.url), "utf8");
    expect(src).toMatch(/readControlMode\(ctx\.storage\.get<unknown>\(CONTROL_MODE_KEY/);
    expect(src).toContain("ctx.storage.set(CONTROL_MODE_KEY, next)");
  });
});

/** Every element in a returned tree, depth first. */
function walk(node: unknown, out: { type: unknown; props: Record<string, unknown> }[] = []) {
  if (Array.isArray(node)) {
    for (const n of node) walk(n, out);
    return out;
  }
  if (node && typeof node === "object" && "props" in node) {
    const el = node as { type: unknown; props: Record<string, unknown> };
    out.push(el);
    walk(el.props.children, out);
  }
  return out;
}

function picker(mode: ControlMode, onMode: (m: ControlMode) => void = () => {}) {
  const t = (k: string) => `<${k}>`;
  return walk(ControlModePicker({ mode, onMode, t }));
}

describe("the picker", () => {
  it("offers exactly three modes, Arrows first", () => {
    expect([...CONTROL_MODES]).toEqual(["arrows", "joystick", "board"]);
    const buttons = picker("arrows").filter((e) => e.type === "button");
    expect(buttons.map((b) => b.props.children)).toEqual([
      "<controlArrows>",
      "<controlJoystick>",
      "<controlBoard>",
    ]);
    expect(Object.keys(CONTROL_MODE_LABEL).sort()).toEqual([...CONTROL_MODES].sort());
  });

  it("marks exactly the current mode as pressed", () => {
    for (const m of CONTROL_MODES) {
      const buttons = picker(m).filter((e) => e.type === "button");
      const pressed = buttons.map((b) => b.props["aria-pressed"]);
      expect(pressed.filter(Boolean)).toHaveLength(1);
      expect(pressed[CONTROL_MODES.indexOf(m)]).toBe(true);
    }
  });

  it("a tap on another pill chooses it, a tap on the current one does nothing", () => {
    const chosen: ControlMode[] = [];
    const buttons = picker("joystick", (m) => chosen.push(m)).filter((e) => e.type === "button");
    for (const b of buttons) (b.props.onClick as () => void)();
    expect(chosen).toEqual(["arrows", "board"]);
  });

  it("labels the row and every pill clears the 44px tap floor", () => {
    const tree = picker("arrows");
    expect(tree[0].props["aria-label"]).toBe("<controls>");
    for (const b of tree.filter((e) => e.type === "button")) {
      const style = b.props.style as { minHeight: number };
      expect(style.minHeight).toBeGreaterThanOrEqual(44);
    }
  });
});

describe("the board stick reads a drag", () => {
  const R = BOARD_STICK_RADIUS;

  it("says nothing inside the dead zone, so a tap stays a tap", () => {
    expect(readStick(0, 0, R).dir).toBe(null);
    expect(readStick(6, -6, R).dir).toBe(null);
  });

  it("answers the four directions beyond it, screen y pointing down", () => {
    expect(readStick(40, 0, R).dir).toBe("right");
    expect(readStick(-40, 0, R).dir).toBe("left");
    expect(readStick(0, 40, R).dir).toBe("down");
    expect(readStick(0, -40, R).dir).toBe("up");
    expect(readStick(30, 20, R).dir).toBe("right");
  });

  it("keeps the knob inside its ring however far the finger travels", () => {
    const { knob } = readStick(300, 400, R);
    expect(Math.hypot(knob.x, knob.y)).toBeCloseTo(R, 6);
    // Direction survives the clamp.
    expect(knob.x / knob.y).toBeCloseTo(300 / 400, 6);
    // Inside the ring the knob follows the finger exactly.
    expect(readStick(10, -20, R).knob).toEqual({ x: 10, y: -20 });
  });

  it("never produces NaN on a zero-length drag or an unmeasured radius", () => {
    for (const [dx, dy, r] of [
      [0, 0, R],
      [0, 0, 0],
      [5, 5, 0],
    ]) {
      const { knob, dir } = readStick(dx, dy, r);
      expect(Number.isFinite(knob.x) && Number.isFinite(knob.y), `${dx},${dy},${r}`).toBe(true);
      expect(dir).toBe(null);
    }
  });
});

describe("the steering games offer the setting", () => {
  // Survivors is out of scope: it has its own arena-stick setting, ruled
  // separately on 2026-09-13.
  const GAMES = ["maze/MazeGame.tsx", "snake/SnakeGame.tsx"];
  const read = (f: string) => readFileSync(new URL(`../games/${f}`, import.meta.url), "utf8");

  for (const file of GAMES) {
    it(`${file} renders the picker and keeps the arrows`, () => {
      const src = read(file);
      expect(src, "the Controls row").toMatch(/<ControlModePicker\b/);
      expect(src, "the choice is remembered through the hook").toContain("useControlMode(ctx)");
      // The arrows must stay reachable - DirectionPad is still imported and its
      // default variant is still the pad.
      expect(src).toMatch(/import \{ DirectionPad \} from "@ui\/DirectionPad"/);
      expect(src, "the board mode").toMatch(/<BoardStick\b/);
    });
  }

  it("snake's board stick answers a tap with the strip's own start, never a restart", () => {
    // The overlay covers the canvas, so the canvas no longer hears "tap to
    // start". Anchored on `?.` - `restartFromChrome` contains `startFromChrome`.
    const src = read("snake/SnakeGame.tsx");
    const stick = src.slice(src.indexOf("<BoardStick"), src.indexOf("</BoardStick>"));
    expect(stick).toMatch(/onTap=\{\(\) => sceneRef\.current\?\.startFromChrome\(\)\}/);
    expect(stick).toContain('active={controlMode === "board"}');
  });

  it("the pad is still the default variant, so every other caller is unchanged", () => {
    const pad = readFileSync(new URL("./DirectionPad.tsx", import.meta.url), "utf8");
    expect(pad).toMatch(/variant = "pad"/);
  });
});
