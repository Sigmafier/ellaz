import {
  DEFAULT_THEME,
  THEME_STORAGE_KEY,
  isThemeId,
  themeById,
  type ThemeId,
} from "./themes";

/**
 * The theme port: read it, set it, subscribe to it. No React here.
 *
 * Shaped after `audioPort` deliberately - the app already has one working
 * observable-singleton idiom and a second one would be a second thing to
 * learn. Anything that needs the current theme outside React (a Phaser scene
 * repainting in place, the juice layer) subscribes here; `useTheme.ts` is the
 * thin React adapter over the same object.
 *
 * WHAT THIS DELIBERATELY DOES NOT DO: reach `GameContext`. A theme field there
 * would join `GameHost`'s dependency array and remount the running game on
 * every switch, resetting a child's board mid-play. Games follow the theme
 * through CSS custom properties, with no React involvement at all.
 * `theme-does-not-remount-games.test.ts` pins both halves.
 */

type Listener = (theme: ThemeId) => void;

function readStored(): ThemeId {
  try {
    const raw = localStorage.getItem(THEME_STORAGE_KEY);
    if (isThemeId(raw)) return raw;
  } catch {
    // Incognito, or storage disabled. The default is a fine answer.
  }
  return DEFAULT_THEME;
}

/**
 * Paint the attribute and the browser chrome.
 *
 * The attribute is REMOVED rather than set for the default, so the DOM matches
 * what the boot script leaves behind and what an unbooted page carries. One
 * representation of "default", not two.
 */
function apply(theme: ThemeId): void {
  const root = document.documentElement;
  if (theme === DEFAULT_THEME) root.removeAttribute("data-theme");
  else root.setAttribute("data-theme", theme);

  // The phone paints its own chrome from this tag, and it does not follow CSS.
  // Without this the status bar stays night-purple over a cream page.
  const meta = document.querySelector('meta[name="theme-color"]');
  if (meta) meta.setAttribute("content", themeById(theme).browserChrome);
}

let current: ThemeId = DEFAULT_THEME;
const listeners = new Set<Listener>();

export const themePort = {
  get current(): ThemeId {
    return current;
  },

  set(theme: ThemeId): void {
    if (theme === current) return;
    current = theme;
    apply(theme);
    try {
      localStorage.setItem(THEME_STORAGE_KEY, theme);
    } catch {
      // A refused write costs the player their choice on the NEXT visit, not
      // this one. Never let it cost them the switch they just made.
    }
    for (const l of listeners) l(theme);
  },

  toggle(): void {
    themePort.set(current === "night" ? "market" : "night");
  },

  onChange(listener: Listener): () => void {
    listeners.add(listener);
    return () => listeners.delete(listener);
  },

  /**
   * Adopt whatever the boot script already decided.
   *
   * Called once at startup. It does NOT re-apply the attribute - the inline
   * script did that before first paint, and re-applying here would be a
   * second source of truth for the same fact. It only syncs this module's
   * idea of "current" so the toggle starts from the right state.
   */
  init(): void {
    current = readStored();
  },
};
