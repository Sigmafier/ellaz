import type { IconName } from "./icons";
/**
 * The theme list, and the single place any part of the build may learn it.
 *
 * THIS FILE IMPORTS NOTHING, AND THAT IS A CONSTRAINT RATHER THAN A HABIT.
 * `vite.config.ts` imports it to generate the no-flash boot script and to fill
 * the PWA manifest, and Vite's own `resolve.alias` map does NOT apply to the
 * config file's imports. An `@ui/...` import here would break the build with
 * an error that points at the config rather than at this line.
 *
 * It also holds no React and touches no DOM, so the port (`theme.ts`), the
 * React glue (`useTheme.ts`) and the build can all read the same list.
 *
 * The one import below is a RELATIVE path to a leaf module with no imports of
 * its own, which is the exact shape the constraint above permits: the problem
 * was never "an import", it was an ALIAS the config cannot resolve. It buys the
 * theme labels the same promotion guarantee every other authored string has.
 */
import type { ShippedLocale } from "../i18n/locales";

export type ThemeId = "market" | "night";

export interface Theme {
  readonly id: ThemeId;
  /**
   * Shown on the toggle. A locale RECORD rather than a `{ he, en }` literal,
   * so promoting a language reds here instead of leaving the theme name in
   * English on a screen that is not.
   */
  readonly label: Record<ShippedLocale, string>;
  /**
   * One icon, so the control reads without reading - and a NAME from the app's
   * own set rather than a character, because a text glyph is drawn by whatever
   * font the machine has and cannot match the icons beside it. See the header
   * of `ui/icons.tsx`, which says exactly this and which this field used to
   * contradict.
   */
  readonly icon: IconName;
  /**
   * `<meta name="theme-color">` and the PWA manifest's `theme_color`: the
   * colour the phone paints its own chrome. This used to be the literal
   * `#6c5ce7` written in three places that could each drift; now they all
   * derive from here and `theme-sync.test.ts` asserts it.
   */
  readonly browserChrome: string;
  /** The manifest's `background_color` - the splash behind an installed app. */
  readonly background: string;
}

export const THEMES: readonly Theme[] = [
  {
    id: "market",
    label: { he: "יום", en: "Day", es: "Día" },
    icon: "sun",
    browserChrome: "#ff4d8d",
    background: "#fff6e9",
  },
  {
    id: "night",
    label: { he: "לילה", en: "Night", es: "Noche" },
    icon: "moon",
    browserChrome: "#6c5ce7",
    background: "#0f1226",
  },
];

/**
 * The theme a visitor gets before they have ever chosen one.
 *
 * It must match the theme declared at BARE `:root` in tokens.css - that block
 * is what paints a page whose boot script has not run, and there are 46 such
 * documents. `theme-sync.test.ts` asserts the two agree, because a mismatch
 * would show as a flash of the wrong theme on every cold load and nowhere
 * else.
 */
export const DEFAULT_THEME: ThemeId = "market";

/** Where the player's choice lives. Same namespace as every other Ellaz key. */
export const THEME_STORAGE_KEY = "ellaz:theme";

export function isThemeId(value: unknown): value is ThemeId {
  return THEMES.some((t) => t.id === value);
}

export function themeById(id: ThemeId): Theme {
  const found = THEMES.find((t) => t.id === id);
  // Unreachable through `isThemeId`, but a theme list that lost an entry
  // should not hand back `undefined` to something painting browser chrome.
  return found ?? THEMES[0];
}

/**
 * The no-flash boot script, GENERATED from the list above rather than written
 * out beside it.
 *
 * `data-theme` is deliberately never baked into the emitted HTML: it would be
 * wrong for whichever half of visitors chose the other theme, and these pages
 * are cached. So the attribute is set by this script, inline and synchronous,
 * before the first paint.
 *
 * It writes NOTHING when the stored value is the default, missing, or junk -
 * absent attribute means bare `:root`, which is already the default. That also
 * makes a corrupt localStorage a non-event rather than a blank screen.
 */
export function themeBootScript(): string {
  const ids = THEMES.map((t) => t.id);
  return (
    `(function(){try{var t=localStorage.getItem(${JSON.stringify(THEME_STORAGE_KEY)});` +
    `if(t&&${JSON.stringify(ids)}.indexOf(t)>-1&&t!==${JSON.stringify(DEFAULT_THEME)})` +
    `document.documentElement.setAttribute("data-theme",t)}catch(e){}})()`
  );
}

/**
 * Does this document still need the boot script injected?
 *
 * Two kinds of document reach `transformIndexHtml`, and only ONE of them is
 * missing the script:
 *
 * - `index.html`, the application shell. It has no boot script of its own, so
 *   the Vite plugin is the only thing that gives it one.
 * - An emitted page. `renderDocument` already inlines the script as the first
 *   thing in its head - it has to, because those files are written straight to
 *   disk in `generateBundle` and never pass through a transform at all.
 *
 * In production the two never meet. In DEV they do: emitted pages are served
 * through `server.transformIndexHtml` (they must be - see
 * `.claude/rules/dev-pages-must-go-through-vites-html-pipeline.md`), so without
 * this predicate every dev page would carry the script twice. Running twice is
 * harmless today, because the script only reads storage and sets an attribute.
 * The reason to fix it anyway is that "harmless today" is a property of the
 * script's current body, not of the arrangement - and dev quietly serving
 * something production does not is exactly the divergence this repo keeps
 * getting bitten by.
 *
 * Matched on the storage key rather than the whole script: the key is the one
 * part no rewrite of the boot logic can drop, and it appears nowhere else in a
 * document.
 */
export function needsThemeBoot(html: string): boolean {
  return !html.includes(THEME_STORAGE_KEY);
}
