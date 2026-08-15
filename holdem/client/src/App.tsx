import { lazy, Suspense, useEffect, useState } from "react";
import { DIR, loadLocale, type Locale, saveLocale } from "./i18n";
import { Home } from "./screens/Home";
import { RoomScreen } from "./screens/RoomScreen";
import { TvScreen } from "./screens/TvScreen";
import type { StudioTab } from "./look/Studio";

// The studio — the look, the sounds, and your name, over a table dealing a
// real hand. Lazy and carved into its own `lab-*` chunk that the service
// worker does not precache (see vite.config.ts): a tuning tool must not be in
// what a player downloads to play a hand. Reachable in production on purpose —
// the sounds are judged on the phone they will be heard on, not on a laptop
// in dev.
const Studio = lazy(() => import("./look/Studio").then((m) => ({ default: m.Studio })));

/**
 * THREE hashes, ONE screen, and that is deliberate rather than lazy routing.
 *
 * The menu offers "sounds", "look" and "your name" as three separate errands,
 * because that is how somebody arrives at them — and they are one screen,
 * because all three are judged against the same felt. Keeping the three URLs
 * means the menu entries stay honest, an old `#/lab` link still works, and a
 * shared link can drop somebody straight on the tab it is about.
 */
function parseHash():
  | { screen: "home" }
  | { screen: "studio"; tab: StudioTab }
  | { screen: "room" | "tv"; code: string } {
  const room = location.hash.match(/^#\/room\/([A-Za-z0-9-]+)/);
  if (room) return { screen: "room", code: room[1].toUpperCase() };
  const tv = location.hash.match(/^#\/tv\/([A-Za-z0-9-]+)/);
  if (tv) return { screen: "tv", code: tv[1].toUpperCase() };
  if (/^#\/look\b/.test(location.hash)) return { screen: "studio", tab: "look" };
  if (/^#\/name\b/.test(location.hash)) return { screen: "studio", tab: "name" };
  // `#/lab` last of the three: it is the oldest name, and it now means the
  // tab it always meant rather than a screen of its own.
  if (/^#\/lab\b/.test(location.hash)) return { screen: "studio", tab: "sound" };
  return { screen: "home" };
}

export function App() {
  const [route, setRoute] = useState(parseHash());
  const [locale, setLocale] = useState<Locale>(loadLocale());

  useEffect(() => {
    const onHash = () => setRoute(parseHash());
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIR[locale];
  }, [locale]);

  const toggleLocale = () => {
    const next: Locale = locale === "he" ? "en" : "he";
    setLocale(next);
    saveLocale(next);
  };

  if (route.screen === "room") {
    return (
      <RoomScreen code={route.code} locale={locale} onToggleLocale={toggleLocale} />
    );
  }
  if (route.screen === "tv") {
    return <TvScreen code={route.code} locale={locale} />;
  }
  if (route.screen === "studio") {
    return (
      <Suspense fallback={null}>
        {/* Keyed on the tab so arriving from a different menu entry remounts
            on the right one. Without the key, React keeps the mounted Studio
            and its `useState(initialTab)` — so the second menu entry somebody
            taps opens the screen they were already on. */}
        <Studio key={route.tab} locale={locale} tab={route.tab} />
      </Suspense>
    );
  }
  return <Home locale={locale} onToggleLocale={toggleLocale} />;
}
