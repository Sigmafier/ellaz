import { useEffect, useState } from "react";
import { DIR, loadLocale, type Locale, saveLocale } from "./i18n";
import { Home } from "./screens/Home";
import { RoomScreen } from "./screens/RoomScreen";

function parseHash(): { screen: "home" } | { screen: "room"; code: string } {
  const m = location.hash.match(/^#\/room\/([A-Za-z0-9-]+)/);
  if (m) return { screen: "room", code: m[1].toUpperCase() };
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
  return <Home locale={locale} onToggleLocale={toggleLocale} />;
}
