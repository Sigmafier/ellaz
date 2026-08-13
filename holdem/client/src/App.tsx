import { useEffect, useState } from "react";
import { DIR, loadLocale, type Locale, saveLocale } from "./i18n";
import { Home } from "./screens/Home";
import { RoomScreen } from "./screens/RoomScreen";
import { TvScreen } from "./screens/TvScreen";

function parseHash(): { screen: "home" } | { screen: "room" | "tv"; code: string } {
  const room = location.hash.match(/^#\/room\/([A-Za-z0-9-]+)/);
  if (room) return { screen: "room", code: room[1].toUpperCase() };
  const tv = location.hash.match(/^#\/tv\/([A-Za-z0-9-]+)/);
  if (tv) return { screen: "tv", code: tv[1].toUpperCase() };
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
    return <RoomScreen code={route.code} locale={locale} onToggleLocale={toggleLocale} />;
  }
  if (route.screen === "tv") {
    return <TvScreen code={route.code} locale={locale} />;
  }
  return <Home locale={locale} onToggleLocale={toggleLocale} />;
}
