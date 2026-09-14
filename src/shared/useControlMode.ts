// How a steering game takes its directions: the four arrows, one big stick, or
// a stick born wherever the thumb lands on the board.
//
// Operator ruling, 2026-09-14: "the joystick should be a setting in every game
// with movement." Picked off a rendered mock of all three, with ARROWS as the
// default. The default is not a taste. In a kids-band game the arrows are what
// make it tap-completable - a five-year-old cannot hold a sustained drag - so
// they are where every new player starts and they stay one tap away in the
// picker however a player last left it.
//
// Same shape as `useRememberedLevel`, for the same reason: the stored value is
// VALIDATED on read rather than trusted. A mode this build does not know (a
// typo, a mode a later build removed, a hand-edited storage entry) reads as the
// default instead of leaving a game with no controls drawn at all.
import { useCallback, useState } from "react";
import type { GameContext } from "@sdk/index";

export type ControlMode = "arrows" | "joystick" | "board";

/** Every mode, in the order the picker draws them. The first is the default. */
export const CONTROL_MODES: readonly ControlMode[] = ["arrows", "joystick", "board"];

export const DEFAULT_CONTROL_MODE: ControlMode = "arrows";

/**
 * Under the game's own `ellaz:<gameId>:` namespace, so the choice is per game.
 *
 * PERSISTED FOREVER - never rename this key and never rename a mode id. A
 * renamed key silently resets every player to arrows; a renamed id is caught by
 * the validation below and does the same.
 */
export const CONTROL_MODE_KEY = "controlMode";

/** Whatever storage handed back, as a mode this build can draw. */
export function readControlMode(stored: unknown): ControlMode {
  return typeof stored === "string" && (CONTROL_MODES as readonly string[]).includes(stored)
    ? (stored as ControlMode)
    : DEFAULT_CONTROL_MODE;
}

/**
 * Remember the chosen control mode across mounts. `[value, set]`, like
 * `useState`; the setter persists.
 */
export function useControlMode(ctx: GameContext): [ControlMode, (next: ControlMode) => void] {
  const [mode, setMode] = useState<ControlMode>(() =>
    readControlMode(ctx.storage.get<unknown>(CONTROL_MODE_KEY, null)),
  );

  const choose = useCallback(
    (next: ControlMode) => {
      setMode(next);
      // Written through from the tap handler rather than from an effect, the
      // same as `useRememberedLevel`: nothing can unmount between the tap and
      // the write.
      ctx.storage.set(CONTROL_MODE_KEY, next);
    },
    [ctx],
  );

  return [mode, choose];
}
