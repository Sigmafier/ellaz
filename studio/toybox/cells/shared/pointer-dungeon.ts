// The dungeon kind's live input: a click on the room becomes a click at the
// world point under it (the sim decides whether that is a foe, a coin or a
// tile), WASD and the arrows are held directions in WORLD axes (W is up the
// screen, which is (-1, -1) in tiles), Space a swing, R a restart. Polled once
// per tick like the fight's keyboard: the held keys read every tick, a click
// or a swing is an EVENT the poll hands over once and then reads as nothing
// until the next one. Side 1 and up read nothing: the dungeon has one player.
//
// The click lands in the canvas's CSS box, which the cell scales to fit the
// window; the view's own size (data.view) is what the room geometry is in.

import { worldAtPx } from "../../dungeon/view";
import { ACT_INPUT_CLICK, ACT_INPUT_NONE, ACT_INPUT_RESTART, ACT_INPUT_SWING, NO_DUNGEON_INPUT } from "../../dungeon/types";
import type { DungeonData, DungeonInput } from "../../dungeon/types";
import type { InputPoll } from "../contract";

/** key code -> the world direction it holds */
const HELD: Record<string, readonly [number, number]> = {
  KeyW: [-1, -1], ArrowUp: [-1, -1],
  KeyS: [1, 1], ArrowDown: [1, 1],
  KeyA: [-1, 1], ArrowLeft: [-1, 1],
  KeyD: [1, -1], ArrowRight: [1, -1],
};

const clamp1 = (v: number): number => (v < -1 ? -1 : v > 1 ? 1 : v);

export function attachDungeonPointer(host: HTMLElement, data: DungeonData): InputPoll<DungeonInput> {
  const down = new Set<string>();
  let act = ACT_INPUT_NONE, ax = 0, ay = 0;

  const onDown = (e: Event): void => {
    const p = e as PointerEvent;
    const surface = host.querySelector("canvas") ?? host;
    const box = surface.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const px = ((p.clientX - box.left) * data.view.w) / box.width;
    const py = ((p.clientY - box.top) * data.view.h) / box.height;
    const w = worldAtPx(data, Math.floor(px), Math.floor(py));
    act = ACT_INPUT_CLICK; ax = w.x; ay = w.y;
    p.preventDefault();
  };
  const onKey = (e: Event): void => {
    const k = e as KeyboardEvent;
    if (k.code in HELD) { down.add(k.code); k.preventDefault(); return; }
    if (k.repeat) return;
    if (k.code === "Space") { k.preventDefault(); act = ACT_INPUT_SWING; ax = 0; ay = 0; }
    else if (k.code === "KeyR") { act = ACT_INPUT_RESTART; ax = 0; ay = 0; }
  };
  const onUp = (e: Event): void => { down.delete((e as KeyboardEvent).code); };
  const onBlur = (): void => { down.clear(); };

  host.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);
  window.addEventListener("keyup", onUp);
  window.addEventListener("blur", onBlur);

  return {
    read(side: number): DungeonInput {
      if (side !== 0) return NO_DUNGEON_INPUT;
      let dx = 0, dy = 0;
      for (const code of down) { const [x, y] = HELD[code]; dx += x; dy += y; }
      const out: DungeonInput = { dx: clamp1(dx), dy: clamp1(dy), act, x: ax, y: ay };
      act = ACT_INPUT_NONE; ax = 0; ay = 0;
      return out;
    },
    detach(): void {
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      window.removeEventListener("keyup", onUp);
      window.removeEventListener("blur", onBlur);
      down.clear(); act = ACT_INPUT_NONE;
    },
  };
}
