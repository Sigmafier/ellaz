import { useEffect, useState } from "react";
import type { Locale } from "@i18n/index";
import { DIR } from "@i18n/index";
import { analytics, startCloudSync } from "@sdk/index";
import { Home } from "./Home";

const LOCALE_KEY = "ellaz:locale";

function initialLocale(): Locale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    if (saved === "he" || saved === "en") return saved;
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
  const [locale, setLocale] = useState<Locale>(initialLocale);

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

  const toggleLocale = () => {
    const next: Locale = locale === "he" ? "en" : "he";
    setLocale(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  return <Home locale={locale} onToggleLocale={toggleLocale} />;
}
