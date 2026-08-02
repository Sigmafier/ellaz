import { useEffect, useState } from "react";
import type { Locale } from "@i18n/index";
import { DIR } from "@i18n/index";
import { analytics } from "@sdk/index";
import { Home } from "./Home";
import { GameHost } from "./GameHost";
import { World } from "./world/World";
import { hashFor, parseHash, type Route } from "./route";

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

// Root shell: owns locale + which screen is open. Routing itself lives in
// `route.ts` (pure + unit-tested); this component only reacts to it, so browser
// Back keeps working exactly as it did.
export function App() {
  const [locale, setLocale] = useState<Locale>(initialLocale);
  const [route, setRoute] = useState<Route>(() => parseHash(window.location.hash));

  useEffect(() => {
    analytics.init();
    analytics.track("session_start", { locale });
    const onHash = () => setRoute(parseHash(window.location.hash));
    window.addEventListener("hashchange", onHash);
    return () => window.removeEventListener("hashchange", onHash);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  useEffect(() => {
    document.documentElement.lang = locale;
    document.documentElement.dir = DIR[locale];
  }, [locale]);

  const go = (next: Route) => {
    window.location.hash = hashFor(next);
    setRoute(next);
  };
  const open = (id: string) => go({ kind: "game", id });
  const exit = () => go({ kind: "home" });
  const openWorld = () => go({ kind: "world" });
  const toggleLocale = () => {
    const next: Locale = locale === "he" ? "en" : "he";
    setLocale(next);
    try {
      localStorage.setItem(LOCALE_KEY, next);
    } catch {
      /* ignore */
    }
  };

  if (route.kind === "game") {
    return <GameHost gameId={route.id} locale={locale} onExit={exit} />;
  }
  if (route.kind === "world") {
    return <World locale={locale} onExit={exit} />;
  }
  return (
    <Home
      locale={locale}
      onOpen={open}
      onOpenWorld={openWorld}
      onToggleLocale={toggleLocale}
    />
  );
}
