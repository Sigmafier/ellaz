import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@i18n/index";
import { DIR } from "@i18n/index";
import { analytics, startCloudSync } from "@sdk/index";
import { Home } from "./Home";
import { GameHost } from "./GameHost";
import { World } from "./world/World";
import { hashFor, parseHash, type Route } from "./route";

// Tournament scaffolding. Deleted along with src/juice/lab/ once the winners
// are folded into the real audio/juice modules.
//
// The `import.meta.env.DEV &&` guard is LOAD-BEARING and must not be tidied
// away as redundant with the route check further down. `lazy(() => import(…))`
// at module scope keeps the lab in the production module graph even when the
// route branch that renders it is statically dropped: Rollup still emits the
// chunk, Vite still writes a `<link rel="modulepreload">` for it into
// index.html, and every child then downloads the whole tournament on first
// paint. Behind the guard the ternary folds to `null` in a production build
// and the dynamic import disappears with it.
//
// Verify with the artifact, never by reading this comment:
//   npm run build && grep -c 'lab-' dist/index.html   # must be 0
const JuiceLab = import.meta.env.DEV
  ? lazy(() => import("@juice/lab/JuiceLab").then((m) => ({ default: m.JuiceLab })))
  : null;

const LOCALE_KEY = "ellaz:locale";

function LabNotice({ text, detail }: { text: string; detail?: string }) {
  return (
    <div dir="ltr" style={{ padding: 24, fontFamily: "ui-monospace, monospace", lineHeight: 1.6 }}>
      <p>{text}</p>
      {detail ? <pre style={{ whiteSpace: "pre-wrap", opacity: 0.7 }}>{detail}</pre> : null}
      <p style={{ opacity: 0.7 }}>
        If this persists, a stale service worker is probably serving a cached bundle. Open
        DevTools &gt; Application &gt; Service Workers &gt; Unregister, then hard-reload.
      </p>
      <a href="#/">Back to the games</a>
    </div>
  );
}

/**
 * A chunk-load failure inside Suspense renders NOTHING by default - a white
 * screen with the reason sitting only in the console. For a route reached by
 * typing a hash by hand, that is indistinguishable from "the route does not
 * exist", which is exactly the wrong thing to conclude.
 */
class LabBoundary extends Component<
  { children: ReactNode; onExit: () => void },
  { error: Error | null }
> {
  state: { error: Error | null } = { error: null };

  static getDerivedStateFromError(error: Error) {
    return { error };
  }

  componentDidCatch(error: Error) {
    console.error("[ellaz] juice lab failed to load", error);
  }

  render() {
    if (this.state.error) {
      return <LabNotice text="The Juice Lab failed to load." detail={this.state.error.message} />;
    }
    return this.props.children;
  }
}

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
    // Only subscribes. The cloud chunk is not fetched until the player actually
    // has something worth backing up, so a first-time visitor who bounces off
    // the home screen makes no network request and mints no account.
    startCloudSync();
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
  // Dev-gated so that in a production build the whole branch - the lazy import,
  // the boundary and the notice - is statically dropped rather than shipped to
  // every child for a route they can never reach. In prod, #/lab falls through
  // to the games grid, which is the right answer for a stale bookmark anyway.
  if (import.meta.env.DEV && route.kind === "lab" && JuiceLab) {
    return (
      <LabBoundary onExit={exit}>
        <Suspense fallback={<LabNotice text="Loading the Juice Lab..." />}>
          <JuiceLab locale={locale} onExit={exit} />
        </Suspense>
      </LabBoundary>
    );
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
