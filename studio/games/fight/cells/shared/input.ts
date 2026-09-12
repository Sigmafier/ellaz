// What the human is holding, read by whichever cell is mounted. Every arm
// shares this file, so "the keyboard felt different on the Phaser one" cannot
// be a finding - there is one reader and the harness calls it once per tick.
//
// Two shapes, one interface. `read(side)` returns the buttons held RIGHT NOW;
// it is a poll, not a queue, because step() takes one InputFrame per tick and
// a queue would let a frame arrive twice or not at all depending on how many
// ticks a frame stepped. Side 1 is the AI's and always NO_INPUT - a second
// human would need a second key map, and nothing in the tournament wants one.

import { NO_INPUT } from "../../../../toybox/sim/types";
import type { InputFrame } from "../../../../toybox/sim/types";

/** what both attach* return: poll the buttons, then take the listeners back off */
export interface InputSource {
  read(side: number): InputFrame;
  detach(): void;
}

// ---- keyboard ---------------------------------------------------------------

const LEFT = ["ArrowLeft", "KeyA"] as const;
const RIGHT = ["ArrowRight", "KeyD"] as const;
const UP = ["ArrowUp", "KeyW"] as const;
const DOWN = ["ArrowDown", "KeyS"] as const;
const ATTACK = ["Space", "KeyJ", "KeyK"] as const;

/** the ones the browser would otherwise scroll the page with */
const SWALLOW = new Set(["ArrowLeft", "ArrowRight", "ArrowUp", "ArrowDown", "Space"]);

function axis(held: Set<string>, neg: readonly string[], pos: readonly string[]): -1 | 0 | 1 {
  const n = neg.some((k) => held.has(k)) ? 1 : 0;
  const p = pos.some((k) => held.has(k)) ? 1 : 0;
  return (p - n) as -1 | 0 | 1;
}

/**
 * Arrows or WASD for the two ground axes, Space / J / K to swing.
 *
 * z is DEPTH and the screen's y grows downward, so Down is +1 and Up is -1 -
 * the same sign the demo's readPlayer used. Getting that backwards reads as
 * "the fighter walks away from the camera when I press toward it", which is a
 * bug report nobody traces to a sign.
 *
 * A key held while the tab loses focus never gets its keyup, so the fighter
 * walks into the wall forever; `blur` clears everything held. The listener goes
 * on the window as well as on `target`, because an element's blur does not fire
 * when the whole tab goes away.
 */
export function attachKeyboard(target: Window | HTMLElement): InputSource {
  const held = new Set<string>();
  const t = target as EventTarget;

  const onDown = (e: Event): void => {
    const k = e as KeyboardEvent;
    if (k.repeat) return;
    if (SWALLOW.has(k.code)) k.preventDefault();
    held.add(k.code);
  };
  const onUp = (e: Event): void => {
    const k = e as KeyboardEvent;
    if (SWALLOW.has(k.code)) k.preventDefault();
    held.delete(k.code);
  };
  const onBlur = (): void => { held.clear(); };

  t.addEventListener("keydown", onDown);
  t.addEventListener("keyup", onUp);
  t.addEventListener("blur", onBlur);
  window.addEventListener("blur", onBlur);

  return {
    read(side: number): InputFrame {
      if (side !== 0) return NO_INPUT;
      return {
        mx: axis(held, LEFT, RIGHT),
        mz: axis(held, UP, DOWN),
        attack: ATTACK.some((k) => held.has(k)),
      };
    },
    detach(): void {
      t.removeEventListener("keydown", onDown);
      t.removeEventListener("keyup", onUp);
      t.removeEventListener("blur", onBlur);
      window.removeEventListener("blur", onBlur);
      held.clear();
    },
  };
}

// ---- touch ------------------------------------------------------------------

/** how far a finger must travel from where it landed before it means a direction */
const DEAD_ZONE = 12;

/** the eight compass points as (mx, mz), starting at right and going clockwise on screen */
const OCTANTS: ReadonlyArray<readonly [-1 | 0 | 1, -1 | 0 | 1]> = [
  [1, 0], [1, 1], [0, 1], [-1, 1], [-1, 0], [-1, -1], [0, -1], [1, -1],
];

interface Drag { id: number; x0: number; y0: number; x: number; y: number }
interface Fingers { drag: Drag | null; attackId: number }

function octantOf(dx: number, dy: number): readonly [-1 | 0 | 1, -1 | 0 | 1] {
  const step = Math.round(Math.atan2(dy, dx) / (Math.PI / 4));
  return OCTANTS[((step % 8) + 8) % 8];
}

/** the three listeners, over one mutable record of which finger is doing what */
function touchHandlers(el: HTMLElement, f: Fingers): Record<"start" | "move" | "end", (e: Event) => void> {
  const start = (e: Event): void => {
    const te = e as TouchEvent;
    te.preventDefault();
    const box = el.getBoundingClientRect();
    for (const t of Array.from(te.changedTouches)) {
      const left = t.clientX - box.left < box.width / 2;
      if (left && f.drag === null) f.drag = { id: t.identifier, x0: t.clientX, y0: t.clientY, x: t.clientX, y: t.clientY };
      else if (!left && f.attackId < 0) f.attackId = t.identifier;
    }
  };
  const move = (e: Event): void => {
    const te = e as TouchEvent;
    te.preventDefault();
    for (const t of Array.from(te.changedTouches)) {
      if (f.drag && t.identifier === f.drag.id) { f.drag.x = t.clientX; f.drag.y = t.clientY; }
    }
  };
  const end = (e: Event): void => {
    const te = e as TouchEvent;
    te.preventDefault();
    for (const t of Array.from(te.changedTouches)) {
      if (f.drag && t.identifier === f.drag.id) f.drag = null;
      if (t.identifier === f.attackId) f.attackId = -1;
    }
  };
  return { start, move, end };
}

function readTouch(f: Fingers, side: number): InputFrame {
  if (side !== 0) return NO_INPUT;
  let mx: -1 | 0 | 1 = 0, mz: -1 | 0 | 1 = 0;
  if (f.drag) {
    const dx = f.drag.x - f.drag.x0, dy = f.drag.y - f.drag.y0;
    if (Math.hypot(dx, dy) >= DEAD_ZONE) [mx, mz] = octantOf(dx, dy);
  }
  return { mx, mz, attack: f.attackId >= 0 };
}

/**
 * Left half drags a direction, right half taps to swing.
 *
 * The direction is measured from where the finger LANDED, not from the middle
 * of the half - a fixed stick under a thumb that arrived somewhere else reads
 * as drift, and a phone has no way to show you where the stick is.
 */
export function attachTouch(el: HTMLElement): InputSource {
  const f: Fingers = { drag: null, attackId: -1 };
  const h = touchHandlers(el, f);
  const opts = { passive: false } as const;

  el.addEventListener("touchstart", h.start, opts);
  el.addEventListener("touchmove", h.move, opts);
  el.addEventListener("touchend", h.end, opts);
  el.addEventListener("touchcancel", h.end, opts);

  return {
    read: (side: number): InputFrame => readTouch(f, side),
    detach(): void {
      el.removeEventListener("touchstart", h.start);
      el.removeEventListener("touchmove", h.move);
      el.removeEventListener("touchend", h.end);
      el.removeEventListener("touchcancel", h.end);
      f.drag = null;
      f.attackId = -1;
    },
  };
}
