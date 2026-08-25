/**
 * WHEN a new build is adopted, which is a different question from whether.
 *
 * The site is `registerType: "prompt"` in vite.config.ts, and that word is
 * misleading here: there is no prompt and no dialog. It is the only mode that
 * hands US the timing. `autoUpdate` installs this, unconditionally, inside
 * vite-plugin-pwa's own register.js:
 *
 *     wb.addEventListener("activated", (event) => {
 *       if (event.isUpdate || event.isExternal) window.location.reload();
 *     });
 *
 * There is no option to keep `autoUpdate` and suppress that line, which is why
 * the mode had to change rather than the config. What it did to a player was
 * the operator's report, verbatim: "games are being loaded then after few
 * seconds they load back again". A child a minute into a game, on their next
 * visit after any deploy, has the page pulled out from under them - board gone,
 * clock gone, and the six games with a session snapshot are the lucky ones.
 *
 * The old bare `prompt` mode is NOT what this restores. That one stranded
 * returning players on a stale cache forever because no update UI was ever
 * built (`.claude/rules/pwa-stale-bundle-qa.md`). The update here still applies
 * on its own, silently, with nothing to tap. Only the MOMENT moved.
 *
 * THE SIGNAL IS THE DOM, deliberately.
 *
 * `hasRestart()` in `@ui/gameTools` is the registry that already knows whether
 * a game is mounted, and importing it from here would be the obvious move and
 * the wrong one: `gameTools` is pinned to the `page` chunk, so an import from
 * `main.tsx` makes the SHELL import from the page chunk - which is the exact
 * failure `assert-first-visit.mjs` exists to catch, and has caught three times.
 * `.ellaz-game-stage` is GameHost's own mount, the one element every game lives
 * inside, and reading it costs zero imports and zero bytes of graph.
 *
 * WHAT COUNTS AS SAFE. A mounted game, and nothing else. A reload of `/`, the
 * room or the boards costs a scroll position; a reload of a game costs the
 * game.
 *
 * WHY DEFERRING FOREVER ON A GAME PAGE IS FINE, which is the fact the whole
 * design rests on. A game page is essentially always mounted, so on one of
 * those the update may never apply - and it does not need to. Every route here
 * is a REAL DOCUMENT and the navigate rule is NetworkFirst, so walking to the
 * next page fetches the new HTML from the network, which names the new hashed
 * chunks, which are fetched too. The player is on the new build after one
 * navigation with no reload at all.
 *
 * `/` is the one that genuinely needs this, because it is PRECACHED - the old
 * worker serves the old shell cache-first until it is replaced. That is why no
 * game mounted means apply NOW rather than at the next `visibilitychange`: the
 * home screen is the page that goes stale, and it is also the page where a
 * reload costs a scroll position and nothing else.
 */

/** True while a game is on screen. See the note above on why this is a DOM read. */
function gameIsLive(): boolean {
  return document.querySelector(".ellaz-game-stage") !== null;
}

/**
 * Apply `update` the first moment nothing is at stake.
 *
 * Called once per waiting service worker. Re-checks on `visibilitychange` -
 * both directions, since a player who backgrounds a game and returns to the
 * home screen has changed the answer without ever firing anything else.
 */
export function applyWhenSafe(update: () => Promise<void>): void {
  let done = false;

  const tryNow = (why: string): void => {
    if (done) return;
    if (gameIsLive()) {
      if (import.meta.env.DEV) console.debug(`[sw] update deferred (${why}): a game is mounted`);
      return;
    }
    done = true;
    document.removeEventListener("visibilitychange", onVisibility);
    if (import.meta.env.DEV) console.debug(`[sw] update applied (${why})`);
    void update();
  };

  const onVisibility = (): void => tryNow("visibilitychange");

  document.addEventListener("visibilitychange", onVisibility);
  tryNow("waiting");
}
