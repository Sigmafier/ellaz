/**
 * The entry for a STANDALONE single-game bundle, hosted by somebody else.
 *
 * WHY THIS EXISTS RATHER THAN REUSING `bootContentPage`.
 * `src/portal/PageApp.tsx` is the entry every content page uses, and it calls
 * `analytics.init()`, `analytics.track("session_start")` and `startCloudSync()`
 * unconditionally (lines 109-111). `startCloudSync` subscribes the wallet and
 * pushes to Firestore on `visibilitychange`. The same module also mounts the
 * World and the Boards.
 *
 * So reusing it here would ship the room, the shop and the leaderboards inside
 * a single-game bundle AND open a Firestore write loop from a third-party
 * iframe on someone else's domain - a direct breach of "no external network
 * requests from games", which is the rule that lets this SDK be listed on Poki
 * or CrazyGames at all.
 *
 * Those are STATIC imports. No `manualChunks` branch and no `globIgnores` entry
 * can remove them; only a different entry can, and this is it. The first draft
 * of the plan got this wrong and described it as a chunking problem.
 *
 * `main.tsx` is unusable here for a second, harder reason: it imports
 * `virtual:pwa-register`, which only exists while the PWA plugin is loaded -
 * and this build deliberately has no PWA plugin.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO
 * No analytics. No cloud sync. No service worker. No router. No prose. It
 * mounts one game and offers one way home.
 */
import { createRoot } from "react-dom/client";
import "@ui/index";
import { GameHost } from "./portal/GameHost";
import { unlockAudioOnFirstGesture } from "./portal/unlockAudio";
import { isPageLocale } from "@i18n/locales";
import type { Locale } from "@i18n/index";

/** Where "back" goes when there is no back. */
const HOME = "https://ellaz.fun/";

function boot(): void {
  const mount = document.getElementById("root");
  const gameId = document.body.dataset.game;

  // Read the id off the DOCUMENT, never off the URL - the same discipline as
  // `readPageContext`, and it matters more here: on itch the URL is a CDN path
  // we have never seen and cannot parse.
  if (!mount || !gameId) return;

  const lang = document.documentElement.lang;
  const locale: Locale = isPageLocale(lang) ? lang : "en";

  unlockAudioOnFirstGesture();

  createRoot(mount).render(
    <GameHost
      gameId={gameId}
      locale={locale}
      onExit={() => window.location.assign(HOME)}
      variant="app"
    />,
  );

  // The emitted markup carries a real link and a real message for anyone whose
  // JavaScript never ran. Once the game is up they are noise, so they go -
  // removed rather than hidden, so there is never a second permanent copy.
  document.getElementById("standalone-fallback")?.remove();
}

boot();
