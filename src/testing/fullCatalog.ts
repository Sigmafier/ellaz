import { SHELL_LOADERS } from "../portal/catalog";
import { REST_LOADERS } from "../portal/gamesRest";
import { GAMES } from "../portal/games";

/**
 * Every game paired with its loader - TESTS ONLY.
 *
 * `catalog()` deliberately returns only what has ARRIVED, so a test asserting
 * "every game has a loader" or "every game has a page" would quietly pass over
 * the games above the fold and say nothing about the rest. This is the list
 * those assertions want.
 *
 * IT LIVES OUTSIDE `src/portal/`, and that is not tidiness. Inside it, the
 * roster-import gate counts it as a module that ships - correctly, because it
 * cannot tell a test helper from a screen by its path.
 *
 * It also lives in its own FILE rather than in `games.ts`. Putting it in `games.ts`
 * gave that file a VALUE import of `catalog.ts`, and `games.ts` is read by
 * `src/build/**` - which Node loads from `vite.config.ts` at config time, where
 * no Vite alias exists yet. The build died on `Cannot find package '@shared/rng'`
 * from a file that names neither. Same trap as the one at the top of
 * `src/build/langOffer.ts`, reached from the other direction: there an aliased
 * import was written into src/build, here an ordinary app import was made
 * reachable FROM it. Nothing in `src/build/**` may import this file.
 *
 * IT READS BOTH LOADER HALVES STATICALLY, and that is the point rather than a
 * shortcut. `loaderFor` answers only for what has ARRIVED, so a module-level
 * `FULL_CATALOG` built on it would pair 23 of 38 games with `undefined` and
 * every "every game has a loader" assertion would pass over the 15 it could
 * see. This file never ships, so the static import costs nobody anything.
 */
const ALL_LOADERS = { ...SHELL_LOADERS, ...REST_LOADERS };

export const FULL_CATALOG = GAMES.map((meta) => ({ meta, load: ALL_LOADERS[meta.id] }));
