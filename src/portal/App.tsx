import { useEffect, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import { APP_LOCALES } from "@i18n/locales";
import { DIR, isLoaded, loadDict } from "@i18n/index";
import { analytics, startCloudSync } from "@sdk/index";
import { Home } from "./Home";

const LOCALE_KEY = "ellaz:locale";

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

  // The stored language may be one of the nine that live in their own chunk, so
  // the very first render of a returning Spanish visitor happens before their
  // strings exist. That render is ENGLISH, not blank and not Hebrew - see the
  // fallback order in `makeT`.
  useEffect(() => {
    if (isLoaded(locale)) return;
    let live = true;
    void loadDict(locale).then(() => {
      if (live) setDictTick((n) => n + 1);
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
    void loadDict(next).then(() => {
      setLocale(next);
      try {
        localStorage.setItem(LOCALE_KEY, next);
      } catch {
        /* ignore */
      }
    });
  };

  return <Home locale={locale} onPickLocale={pickLocale} />;
}
