import { parseHash } from "./route";
import { boardsHref, gameHref, worldHref } from "./paths";
import type { Locale } from "@i18n/index";

/**
 * Old links keep working.
 *
 * Every URL this app ever shared was a hash - `#/game/snake`, `#/world`. Those
 * are in people's bookmarks, in messages, and in whatever a search engine picked
 * up before the real pages existed. They now resolve to real addresses.
 *
 * `location.replace`, never `assign`: a redirect that leaves a history entry
 * makes the browser Back button bounce between the old URL and the new one
 * forever, which is worse than the broken link it replaced.
 *
 * `#/lab` is deliberately NOT redirected. The Juice Lab is dev-only scaffolding
 * reached by typing a hash, it has no page of its own, and it is deleted with
 * the rest of `src/juice/lab/` when the winners land.
 *
 * Returns true when it redirected, so the caller can stop booting - the document
 * about to be replaced does not need a React tree.
 */
export function redirectLegacyHash(
  loc: Pick<Location, "hash" | "replace"> = window.location,
  locale: Locale = "he",
): boolean {
  if (!loc.hash || loc.hash === "#" || loc.hash === "#/") return false;

  const route = parseHash(loc.hash);
  if (route.kind === "game") {
    loc.replace(gameHref(route.id, locale));
    return true;
  }
  if (route.kind === "world") {
    loc.replace(worldHref(locale));
    return true;
  }
  if (route.kind === "boards") {
    loc.replace(boardsHref(locale));
    return true;
  }
  // "home" (which is also what an unrecognised hash parses to) and "lab" both
  // stay where they are.
  return false;
}
