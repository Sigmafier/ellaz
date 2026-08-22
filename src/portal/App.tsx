import { Suspense, lazy, useEffect, useRef, useState } from "react";
import type { AppLocale } from "@i18n/locales";
import { APP_LOCALES, CANONICAL_LOCALE } from "@i18n/locales";
import { DEFAULT_LOCALE, DIR, isLoaded, loadDict, makeT } from "@i18n/index";
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

/**
 * The Design Bench's compare screen, at `#/lab/design`.
 *
 * Its own address rather than a tab inside the sound lab, for one reason that
 * is a measurement and not a preference: the lab's column is capped at 720px
 * and two phone-width arms side by side need 796. A tab would have to fight
 * that cap or shrink the arms, and an arm measured at the wrong width is worse
 * than no arm at all.
 *
 * Same chunk, so it costs a first visit exactly what the lab costs it: nothing.
 */
const DesignCompare = lazy(() =>
  import("../lab/design/Compare").then((m) => ({ default: m.Compare })),
);

const DESIGN_HASH = "#/lab/design";

/**
 * The games-buttons bench, at `#/lab/buttons`.
 *
 * Its own address beside the chrome bench rather than a tab inside it: they
 * ask different questions. The chrome bench compares one page against a named
 * variant; this one walks the whole roster and measures what 21 different
 * authors did to a footer. Same `lab-*` chunk, so it costs a first visit
 * exactly what the lab costs it, which is nothing.
 */
const DesignButtons = lazy(() =>
  import("../lab/design/Buttons").then((m) => ({ default: m.Buttons })),
);

const BUTTONS_HASH = "#/lab/buttons";

/**
 * Three proposed shapes for this bench, at `#/lab/mock`.
 *
 * A PROPOSAL with a kill date: whichever arm the operator picks gets built as
 * the real lab and `Mocks.tsx` is deleted with the other two. It has its own
 * address rather than a tab because it is asking about the tabs themselves,
 * and a proposal nested inside the thing it proposes replacing cannot be
 * looked at cleanly. Same `lab-*` chunk, so it costs a first visit nothing.
 */
const DesignMocks = lazy(() => import("../lab/design/Mocks").then((m) => ({ default: m.Mocks })));

const MOCK_HASH = "#/lab/mock";

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

// Renamed from `initialLocale`, because that name is now the PROP: an emitted
// shell (`/en/`, `/es/`) passes the page's own language and it wins over the
// stored one. Two things called `initialLocale` in one file is how the prop
// silently shadows the function.
function storedLocale(): AppLocale {
  try {
    const saved = localStorage.getItem(LOCALE_KEY);
    // Validated against the list rather than trusted. A stored locale this
    // build no longer speaks - a language removed, or a hand-edited value -
    // must fall back to the default, not render a screen of raw key names.
    if (saved && (APP_LOCALES as readonly string[]).includes(saved)) return saved as AppLocale;
  } catch {
    /* ignore */
  }
  // ENGLISH, not Hebrew, since 2026-08-14. This is what a first-time visitor
  // is answered in, and English is the language the largest number of them can
  // read - the same argument x-default makes to a crawler. A returning player
  // who picked a language still gets theirs: the stored value is read first
  // and only an unusable one reaches this line.
  return DEFAULT_LOCALE;
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
export function App({ initialLocale }: { initialLocale?: AppLocale } = {}) {
  // The URL wins over the stored preference, and only ever on `/en/` and
  // `/es/`. Those addresses are an explicit request for a language - every
  // link to them is in that language - so honouring a preference stored on an
  // earlier visit is what would look wrong. `/` passes nothing and is
  // unchanged: it keeps the player's own choice.
  //
  // Not persisted. Arriving on an English page is not the same as choosing
  // English for the app, and writing it here would silently repaint `/` for a
  // Hebrew-speaking player who followed one English link. `pickLocale` still
  // persists, because that IS a choice.
  const [locale, setLocale] = useState<AppLocale>(() => initialLocale ?? storedLocale());
  // Bumped when a lazy dictionary arrives, purely to re-render. `loaded` lives
  // in the i18n module rather than in React state because it is shared by every
  // screen and must survive a remount; this is the one line that tells React
  // something it cannot see changed.
  const [, setDictTick] = useState(0);
  // Which pick is current. A ref rather than state: it must be readable by a
  // promise that resolved after a later pick started, and it must never render.
  const pickSeq = useRef(0);
  const hash = useHash();
  // Re-created each render on purpose: it must pick up a lazy dictionary the
  // moment `dictTick` says one arrived. Only the tab title uses it here - every
  // visible string is Home's own `t`.
  const translate = makeT(locale);

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

  // The tab title follows the language the player is actually reading.
  //
  // ONLY ON `/`, and the guard is `initialLocale` - the same signal that
  // decides whether the URL or the stored preference wins. `/he/` and `/es/`
  // are app shells too, and they carry an EMITTED title written for that page
  // in that language; a game page carries the game's own `metaTitle`, tuned per
  // game and per locale. Repainting either from the generic app tagline would
  // replace a good title with a worse one - a regression wearing the shape of a
  // fix, and invisible because the page would still look right.
  //
  // The EMITTED title is never what this produces. Crawlers do not run
  // JavaScript, so what the build wrote is what search sees, and that stays the
  // canonical locale's own SEO-tuned line, authored in the site copy. This is a
  // convenience for the human whose tab, bookmark and share sheet would
  // otherwise be stuck in a language they did not choose.
  //
  // `appName` + `tagline` rather than a new dictionary key: both already exist
  // in all eleven languages, so this costs the first visit nothing. The page
  // prose is build-time only and unreachable from here by design -
  // `no-app-imports.test.ts` enforces it, because importing it would put every
  // word of every page into the shell a child downloads before choosing a game.
  //
  // That module is named nowhere above, and the phrasing is deliberate: the
  // gate matches an import by SHAPE, and `from` followed by a quoted path is
  // that shape whether it sits in code or in a sentence. Naming the file here
  // reds the suite. Loud and harmless, which is the right direction for a
  // purity gate to be wrong in - so it is worked around here rather than
  // loosened there.
  const emittedTitle = useRef<string | null>(null);
  // Computed in render and passed to the effect as a STRING, not as a
  // translator. `makeT` returns a fresh closure every render, so a `t` in the
  // dependency array re-fires the effect on every render forever; a string
  // compares by value and changes exactly twice - once if the lazy dictionary
  // lands, once per language pick.
  const localizedTitle = `${translate("appName")} - ${translate("tagline")}`;
  useEffect(() => {
    if (initialLocale !== undefined) return; // an emitted shell owns its own title
    if (emittedTitle.current === null) emittedTitle.current = document.title;
    // English readers keep the emitted line, which is longer and more specific
    // than the tagline. Switching away and back restores it rather than leaving
    // the generic version behind.
    document.title = locale === CANONICAL_LOCALE ? emittedTitle.current : localizedTitle;
  }, [locale, initialLocale, localizedTitle]);

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
  if (hash === MOCK_HASH) {
    return (
      <Suspense fallback={null}>
        <DesignMocks />
      </Suspense>
    );
  }

  if (hash === BUTTONS_HASH) {
    return (
      <Suspense fallback={null}>
        <DesignButtons />
      </Suspense>
    );
  }

  if (hash === DESIGN_HASH) {
    return (
      <Suspense fallback={null}>
        <DesignCompare />
      </Suspense>
    );
  }

  if (hash === LAB_HASH) {
    return (
      <Suspense fallback={null}>
        <Lab locale={locale} />
      </Suspense>
    );
  }

  return <Home locale={locale} onPickLocale={pickLocale} />;
}
