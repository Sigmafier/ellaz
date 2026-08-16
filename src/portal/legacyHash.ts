import { parseHash } from "./route";
import { boardsHref, gameHref, worldHref } from "./paths";
import type { PageLocale } from "@i18n/locales";
import { CANONICAL_LOCALE } from "@i18n/locales";

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
 *
 * Returns true when it redirected, so the caller can stop booting - the document
 * about to be replaced does not need a React tree.
 */
export function redirectLegacyHash(
  loc: Pick<Location, "hash" | "replace"> = window.location,
  // CANONICAL rather than the player's stored preference, and rather than a
  // literal. An old `#/game/snake` link carries no language, so the honest
  // landing is the bare URL - which is the canonical language's by definition,
  // and needs no redirect after it. A literal here would have kept sending
  // these to Hebrew after English took the root, quietly bouncing every legacy
  // bookmark through /he/.
  locale: PageLocale = CANONICAL_LOCALE,
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
  // "home" - which is also what an unrecognised hash parses to, including the
  // retired `#/lab` - stays where it is.
  return false;
}
