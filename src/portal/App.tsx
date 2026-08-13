import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import { APP_LOCALES } from "@i18n/locales";
import { DEFAULT_LOCALE, DIR, isLoaded, loadDict } from "@i18n/index";
import { analytics, startCloudSync } from "@sdk/index";
import { Home } from "./Home";

const LOCALE_KEY = "ellaz:locale";

/**
 * The sound lab, at `#/lab`.
 *
 * A FRAGMENT, not a path: a fragment never reaches the server, so this needs no
 * emitted document, joins no sitemap, and no crawler can find it. `#/lab` was
 * the old Juice Lab's address and has been an unrecognised hash since that lab
 * was deleted; giving it a destination again costs nothing and means an old
 * bookmark lands somewhere useful.
 *
 * Lazy, and carved into its own `lab-*` chunk by `manualChunks` with a matching
 * `globIgnores` entry - the documented three changes. It is NOT guarded by
 * `import.meta.env.DEV` the way the old lab was, because the whole point is
 * that it is reachable from a phone; `npm run build:check` is what proves it
 * still costs a first visit nothing.
 */
const Lab = lazy(() => import("../lab/Lab").then((m) => ({ default: m.Lab })));

const LAB_HASH = "#/lab";

/** Re-render on hash change, so leaving the lab does not need a reload. */
function useHash(): string {
  const [hash, setHash] = useState(() =>
    typeof window === "undefined" ? "" : window.location.hash,
  );
  useEffect(() => {
    const on = () => setHash(window.location.hash);
    window.addEventListener("hashchange", on);
    return () => window.removeEventListener("hashchange", on);
  }, []);
  return hash;
}

function initialLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    // Validated against the list rather than trusted. A stored locale this
    // build no longer speaks - a language removed, or a hand-edited value -
    // must fall back to Hebrew, not render a screen of raw key names.
    if (saved && (APP_LOCALES as readonly string[]).includes(saved)) return saved as AppLocale;
  } catch {
    /* ignore */
  }
  return "he";
}

// Root shell for `/`, and ONLY for `/`.
//
// Games and the room live on their own pages now, each one a real document that
// boots this same bundle and mounts into `#game-frame` (see `PageApp.tsx`). So
// this component no longer routes: it renders the home grid, whose cards are
// real links, and the browser does the navigating. The hash router is gone with
// it - `legacyHash.ts` redirects the old fragments once, at boot, before
// anything renders.
//
// What that buys, and none of it needed code: Back works, a game URL is
// shareable, middle-click opens a game in a new tab, and a crawler that lands
// here finds twenty-one links instead of twenty-one buttons.
export function App() {
  const [locale, setLocale] = useState<AppLocale>(initialLocale);
  // Bumped when a lazy dictionary arrives, purely to re-render. `loaded` lives
  // in the i18n module rather than in React state because it is shared by every
  // screen and must survive a remount; this is the one line that tells React
  // something it cannot see changed.
  const [, setDictTick] = useState(0);
  // Which pick is current. A ref rather than state: it must be readable by a
  // promise that resolved after a later pick started, and it must never render.
  const pickSeq = useRef(0);
  const hash = useHash();

  // The stored language may be one of the nine that live in their own chunk, so
  // the very first render of a returning Spanish visitor happens before their
  // strings exist. That render is ENGLISH, not blank and not Hebrew - see the
  // fallback order in `makeT`.
  useEffect(() => {
    if (isLoaded(locale)) return;
    let live = true;
    void loadDict(locale).then((ok) => {
      if (!live) return;
      // The chunk never arrived, so every string on screen resolves through
      // English while `lang` and `dir` claim otherwise. For Arabic that is a
      // MIRRORED ENGLISH PAGE the visitor has to escape from, and because the
      // preference is stored it survives the reload they will try first.
      // Say what we are actually rendering. The stored preference is left
      // alone: they chose Arabic, the network failed, and the next load may
      // well succeed.
      if (!ok) setLocale(DEFAULT_LOCALE);
      else setDictTick((n) => n + 1);
    });
    return () => {
      live = false;
    };
  }, [locale]);

  useEffect(() => {
    analytics.init();
    analytics.track("session_start", { locale });
    // Only subscribes. The cloud chunk is not fetched until the player actually
    // has something worth backing up, so a first-time visitor who bounces off
    // the home screen makes no network request and mints no account.
    startCloudSync();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIR[locale];
  }, [locale]);

  const pickLocale = (next: AppLocale) => {
    // Fetch FIRST, then switch. Switching first would flash English for the
    // length of a network round trip on a screen the player is looking at,
    // which reads as the app breaking rather than as the app loading.
    //
    // A GENERATION TOKEN, because fetch-first means two picks race and THE
    // SLOW ONE COMMITS LAST. Measured on the live site: Spanish held for four
    // seconds then Russian picked lands on Russian, and three seconds later
    // the page silently turns Spanish. The sheet closes on the first tap with
    // no sign anything is loading, so a second tap is what a slow connection
    // invites — this is likelier on a phone than on the desk it was built at.
    const seq = ++pickSeq.current;
    void loadDict(next).then((ok) => {
      if (seq !== pickSeq.current) return; // a later pick already won
      // The language never arrived. Stay on the one that works rather than
      // painting its direction over English text. Silent, like the shop
      // refusing an item nobody can afford: a refusal is not an error.
      if (!ok) return;
      setLocale(next);
      try {
        localStorage.setItem(LOCALE_KEY, next);
      } catch {
        /* ignore */
      }
    });
  };

  // After the hooks, never before them - an early return above a hook changes
  // the hook order between renders and React crashes.
  if (hash === LAB_HASH) {
    return (
      <Suspense fallback={null}>
        <Lab locale={locale} />
      </Suspense>
    );
  }

  return <Home locale={locale} onPickLocale={pickLocale} />;
}
