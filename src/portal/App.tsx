import { Component, Suspense, lazy, useEffect, useState, type ReactNode } from "react";
import type { Locale } from "@i18n/index";
import { DIR } from "@i18n/index";
import { analytics, startCloudSync } from "@sdk/index";
import { Home } from "./Home";
import { parseHash } from "./route";

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
      <a href={import.meta.env.BASE_URL}>Back to the games</a>
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

  // The Juice Lab is still hash-reached and still dev-only. It is deliberately
  // NOT given a URL: it is scaffolding with a kill date, and `legacyHash.ts`
  // leaves `#/lab` alone for exactly that reason. In a production build this
  // whole branch - the lazy import, the boundary, the notice - is statically
  // dropped rather than shipped to every child for a route they cannot reach.
  if (import.meta.env.DEV && JuiceLab && parseHash(window.location.hash).kind === "lab") {
    const back = () => {
      window.location.hash = "";
    };
    return (
      <LabBoundary onExit={back}>
        <Suspense fallback={<LabNotice text="Loading the Juice Lab..." />}>
          <JuiceLab locale={locale} onExit={back} />
        </Suspense>
      </LabBoundary>
    );
  }

  return <Home locale={locale} onToggleLocale={toggleLocale} />;
}
