// The turn kind's live input: a click on the board becomes a pick of the tile
// under it, Space a wait, R a restart. Polled once per tick like the fight's
// keyboard - but a click is an EVENT, so the poll hands it over once and then
// reads as nothing until the next one; a second click inside one tick simply
// replaces the first. Side 1 and up read nothing: the turn has one player.
//
// The click lands in the canvas's CSS box, which the cell scales to fit the
// window; the view's own size (data.view) is what the tile geometry is in.

import { tileAtPx } from "../../turn/view";
import { ACT_INPUT_PICK, ACT_INPUT_RESTART, ACT_INPUT_WAIT, NO_TURN_INPUT } from "../../turn/types";
import type { TurnData, TurnInput } from "../../turn/types";
import type { InputPoll } from "../contract";

export function attachPointer(host: HTMLElement, data: TurnData): InputPoll<TurnInput> {
  let pending: TurnInput = NO_TURN_INPUT;

  const onDown = (e: Event): void => {
    const p = e as PointerEvent;
    const surface = host.querySelector("canvas") ?? host;
    const box = surface.getBoundingClientRect();
    if (box.width <= 0 || box.height <= 0) return;
    const x = ((p.clientX - box.left) * data.view.w) / box.width;
    const y = ((p.clientY - box.top) * data.view.h) / box.height;
    const { c, r } = tileAtPx(data, x, y);
    pending = { c, r, act: ACT_INPUT_PICK };
    p.preventDefault();
  };
  const onKey = (e: Event): void => {
    const k = e as KeyboardEvent;
    if (k.repeat) return;
    if (k.code === "Space") { k.preventDefault(); pending = { c: 0, r: 0, act: ACT_INPUT_WAIT }; }
    else if (k.code === "KeyR") pending = { c: 0, r: 0, act: ACT_INPUT_RESTART };
  };

  host.addEventListener("pointerdown", onDown);
  window.addEventListener("keydown", onKey);

  return {
    read(side: number): TurnInput {
      if (side !== 0) return NO_TURN_INPUT;
      const out = pending;
      pending = NO_TURN_INPUT;
      return out;
    },
    detach(): void {
      host.removeEventListener("pointerdown", onDown);
      window.removeEventListener("keydown", onKey);
      pending = NO_TURN_INPUT;
    },
  };
}
