// The level a game reopens on.
//
// Every game but vanish used to hardcode `useState(<first level>)`, so a child
// who plays hard sudoku re-picked hard on every single open — twenty games, the
// same small tax, paid forever. The level is the longest-lived thing a player
// chooses: it outlives a win, a restart, and the board snapshot itself.
//
// The stored id is VALIDATED against the game's own option list rather than
// trusted, and that check is the whole reason this is a hook instead of two
// inline lines. `GameChrome` finds the current level with `findIndex`, so an id
// that is no longer in the list resolves to -1 and the toggle DISAPPEARS — the
// game plays fine at whatever level the renderer happens to derive, and the
// player simply has no way to change difficulty any more. Renaming a level id
// is exactly the ordinary edit that would cause it.
import { useCallback, useState } from "react";
import type { GameContext } from "@sdk/index";

/**
 * Under the game's own `ellaz:<gameId>:` namespace. vanish shipped this key by
 * hand before the hook existed, with the same values, so its players keep the
 * level they last chose.
 */
export const LEVEL_KEY = "level";

/**
 * Remember the chosen level across mounts.
 *
 * Returns the same `[value, set]` shape as `useState`, so adopting it is a
 * one-line change at the declaration and nothing at the call sites. The setter
 * persists; there is no separate "save" to forget.
 *
 * @param ids      Every level this game offers, in the renderer's own order.
 * @param fallback Where a new player starts.
 */
export function useRememberedLevel<T extends string>(
  ctx: GameContext,
  ids: readonly T[],
  fallback: T,
): [T, (next: T) => void] {
  const [level, setLevel] = useState<T>(() => {
    const stored = ctx.storage.get<unknown>(LEVEL_KEY, null);
    return typeof stored === "string" && (ids as readonly string[]).includes(stored)
      ? (stored as T)
      : fallback;
  });

  const choose = useCallback(
    (next: T) => {
      setLevel(next);
      // Write through rather than in an effect: this fires from a tap handler,
      // and a game that unmounts on the same tap (a level change that exits)
      // would lose an effect that had not run yet.
      ctx.storage.set(LEVEL_KEY, next);
    },
    [ctx],
  );

  return [level, choose];
}
