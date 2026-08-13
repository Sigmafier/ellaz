import { createRoot } from "react-dom/client";
import "@ui/index";
import { isLoaded, loadDict } from "@i18n/index";
import { App } from "./portal/App";
import { readPageContext } from "./portal/pageContext";
import { unlockAudioOnFirstGesture } from "./portal/unlockAudio";
import { redirectLegacyHash } from "./portal/legacyHash";
import { themePort } from "@ui/theme";
import { cardStylePort } from "@ui/cardStyle";
import { registerSW } from "virtual:pwa-register";

// One bundle, two shapes of page.
//
//   /  /he/  /es/        the app shell. React owns #root and the whole viewport.
//                        `/` is Vite's own index.html and is ENGLISH; the other
//                        two are emitted with the same arrangement and a
//                        `data-locale`.
//   /games/<id>/         a document. React owns #game-frame and #wallet-slot,
//   /world/              and nothing else on the page is ever reconciled.
//
// Which one is decided by reading the DOCUMENT, never by parsing the URL: this
// site ships under two bases ("/" and "/ellaz/"), and a runtime that re-derives
// the base gets it wrong on one host and renders prose that never mounts a game.

registerSW({ immediate: true });

// Old links first, before anything renders. Every URL this app ever shared was
// a hash - #/game/snake, #/world - and those are in bookmarks and in messages.
// If one redirects, the document is about to be replaced and does not need a
// React tree built into it.
if (!redirectLegacyHash()) {
  const page = readPageContext();
  // Adopt whatever the inline boot script already decided. It does NOT re-apply
  // the attribute - that happened before first paint, and re-applying here
  // would give the same fact two owners. Both branches, because a content page
  // has a theme too.
  themePort.init();
  // No boot script for this one and none is needed: a card style decides which
  // ELEMENT React renders, so it cannot paint before React runs. There is no
  // flash to prevent, unlike the theme, which paints in CSS.
  cardStylePort.init();
  unlockAudioOnFirstGesture();

  if (page.kind === "app") {
    const rootEl = document.getElementById("root");
    if (rootEl) {
      const mount = () => {
        createRoot(rootEl).render(<App initialLocale={page.locale} />);
        // Every home page ships its own language's home as real markup ahead
        // of #root, because no AI crawler runs JavaScript and `/` is the
        // site's canonical entry. Once the app is up it is the home screen, so
        // the document comes out.
        //
        // REMOVED, not hidden: it is a faithful mirror of what the grid
        // renders, and leaving a duplicate copy of every game link in the DOM
        // is how a mirror turns into two sources of truth. A no-JavaScript
        // visitor never reaches this line and keeps the document, which is the
        // whole point.
        //
        // On the next frame rather than immediately, so the hand-off is a swap
        // rather than a blank gap if React has not committed yet.
        requestAnimationFrame(() => document.getElementById("home-doc")?.remove());
      };
      // A shell with a language of its own waits for that language's chunk
      // before mounting, exactly as `bootContentPage` does and for the same
      // reason: `es` is not one of the two static dictionaries, so mounting
      // first paints an ENGLISH home over a Spanish document for a network
      // round trip. (`/he/` is static and takes the fast path; Spanish is the
      // one that waits.) There is no flash to trade against - the emitted home is
      // still on screen and React has not rendered a thing. `/` passes no
      // locale and takes this branch's `else`, so its first paint is untouched.
      if (page.locale && !isLoaded(page.locale)) void loadDict(page.locale).then(mount);
      else mount();
    }
  } else {
    // Lazily, and the laziness is the point. The room and the game host are
    // only ever needed on a content page, so a child landing on `/` should not
    // download either - and this import is what keeps them out of the first
    // visit. Named `page-*` in vite.config manualChunks and excluded in
    // globIgnores; see .claude/rules/precache-glob-sweeps-new-chunks.md, where
    // doing only one of those three things is the documented trap.
    void import("./portal/PageApp").then((m) => m.bootContentPage(page));
  }
}
