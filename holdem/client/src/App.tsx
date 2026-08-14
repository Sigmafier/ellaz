import { lazy, Suspense, useEffect, useState } from "react";
import { DIR, loadLocale, type Locale, saveLocale } from "./i18n";
import { Home } from "./screens/Home";
import { RoomScreen } from "./screens/RoomScreen";
import { TvScreen } from "./screens/TvScreen";

// The sound lab is a tuning tool, not part of playing poker, so it is lazy and
// carved into its own `lab-*` chunk that the service worker does not precache
// (see vite.config.ts). Reachable in production on purpose — the sounds are
// judged on the phone they will be heard on, not on a laptop in dev.
const SoundLab = lazy(() => import("./lab/SoundLab").then((m) => ({ default: m.SoundLab })));

// The look lab — every art decision on the felt, over a table dealing a real
// hand. Same arrangement as the sound lab and for the same reason: a tuning
// tool must not be in what a player downloads to play a hand. It is named into
// the same `lab-*` chunk (see vite.config.ts), so the one precache exclusion,
// the one modulepreload filter and the one gate cover both.
const LookLab = lazy(() => import("./look/LookLab").then((m) => ({ default: m.LookLab })));

function parseHash(): { screen: "home" | "lab" | "look" } | { screen: "room" | "tv"; code: string } {
  const room = location.hash.match(/^#\/room\/([A-Za-z0-9-]+)/);
  if (room) return { screen: "room", code: room[1].toUpperCase() };
  const tv = location.hash.match(/^#\/tv\/([A-Za-z0-9-]+)/);
  if (tv) return { screen: "tv", code: tv[1].toUpperCase() };
  // `#/look` before `#/lab`: neither prefixes the other, but the two names are
  // one letter apart and a future `#/labs` would.
  if (/^#\/look\b/.test(location.hash)) return { screen: "look" };
  if (/^#\/lab\b/.test(location.hash)) return { screen: "lab" };
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
  if (route.screen === "lab") {
    return (
      <Suspense fallback={null}>
        <SoundLab />
      </Suspense>
    );
  }
  if (route.screen === "look") {
    return (
      <Suspense fallback={null}>
        <LookLab locale={locale} />
      </Suspense>
    );
  }
  return <Home locale={locale} onToggleLocale={toggleLocale} />;
}
