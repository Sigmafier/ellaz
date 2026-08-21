import type { GameMeta } from "@sdk/index";
import { REST } from "./gamesRest";
import { SHELL_GAMES } from "./shellRoster";

/**
 * The WHOLE roster - BUILD-TIME AND TESTS ONLY.
 *
 * ⚠ NOTHING THAT SHIPS TO A BROWSER MAY IMPORT THIS FILE. It pulls `gamesRest.ts`
 * statically, so one stray import puts all 33 games' metadata back in the shell
 * bundle and undoes the split entirely - silently, behind a green build, which is
 * exactly how the card art shipped unmoved for four days.
 * `no-app-imports.test.ts` fails the build on any app module that imports it.
 *
 * App code wants one of these instead:
 *   - `shellRoster.ts` - `ROSTER_IDS` (all 33) and `SHELL_GAMES` (above the fold)
 *   - `catalog.ts`     - the same, with loaders, merging the rest on idle
 *
 * The build-time page emitter (`src/build/**`) needs every game's metadata and
 * must never touch game code: it runs in Node inside `vite.config.ts`, where a
 * stray `import("../games/snake")` would try to load Phaser at config time. That
 * is why the roster is metadata only, and why it is not in `catalog.ts`.
 *
 * There is no third list. The order is `shellRoster.ts` then `gamesRest.ts`, and
 * `roster-split.test.ts` pins the two against `ROSTER_IDS`.
 */
export const GAMES: ReadonlyArray<GameMeta> = [...SHELL_GAMES, ...REST];

export function metaFor(id: string): GameMeta | undefined {
  return GAMES.find((m) => m.id === id);
}
