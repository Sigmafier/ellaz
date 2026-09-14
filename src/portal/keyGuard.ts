/**
 * A KEY A GAME COULD USE NEVER SCROLLS THE PAGE WHILE THE GAME IS ON SCREEN.
 *
 * Operator, 2026-09-14, on snake: "the keyboard changes the entire game screen size
 * which is bad!!!". A game page is a DOCUMENT - the game on its first screen, the
 * article under it - so the browser's own key handling scrolled it. Measured on live
 * ellaz.fun that day, all 43 games: ArrowDown moved the page 40px, Space and PageDown
 * a whole window (snake's board went 600px up and off a 1536x639 screen), End to the
 * bottom. Games that steer with arrows had blocked the arrows and nothing else, and
 * the 39 that take no keys at all had blocked nothing - so a fix per game would have
 * been 43 fixes and the 44th game would ship without one.
 *
 * So the page holds them, once, for every game:
 *
 * - Only the keys that SCROLL. A game still receives every key - `preventDefault`
 *   stops the browser's default, never the event - and it is decided after the
 *   game's own listener has run (see `guardGameKeys`).
 * - Only while the game is really in view - at least half of it, or half the window.
 *   A reader who has scrolled down to the article gets their keyboard back.
 * - Never while typing (an input, a textarea, anything editable) or inside a dialog:
 *   the report sheet's text box must take a space, and a sheet scrolls itself.
 * - Space on something pressable (a button, a link) is left alone - that is how a
 *   keyboard user presses it. Arrows on a button are held: after clicking the
 *   difficulty toggle the focus is on it, and that is exactly when a snake player
 *   reaches for the arrows.
 *
 * `scripts/repro/repro-keys-do-not-move-the-game.mjs` presses the keys on every game
 * and its controls prove the article still scrolls and a text field still types.
 */
const SCROLLS = new Set(["ArrowUp", "ArrowDown", "ArrowLeft", "ArrowRight", " ", "PageUp", "PageDown", "Home", "End"]);
const TYPES_INTO = "input, textarea, select, [contenteditable]:not([contenteditable='false']), dialog, [role=dialog]";
const PRESSES = "button, a[href], summary, [role=button], [role=link], [role=checkbox], [role=radio], [role=switch], [role=tab]";

type Box = { top: number; bottom: number; height: number };
type Target = { closest?: (selector: string) => unknown } | null;

/** Pure, so the decision is tested without a DOM. */
export function holdsKey(key: string, target: Target, frame: Box, windowHeight: number): boolean {
  if (!SCROLLS.has(key)) return false;
  const closest = typeof target?.closest === "function" ? (s: string) => target.closest!(s) : () => null;
  if (closest(TYPES_INTO)) return false;
  if (key === " " && closest(PRESSES)) return false;
  const inView = Math.min(frame.bottom, windowHeight) - Math.max(frame.top, 0);
  return inView > 0 && inView >= Math.min(frame.height, windowHeight) / 2;
}

/**
 * Hold scrolling keys for the life of the page. Returns the teardown.
 *
 * The hold must run AFTER every game's own listener, never before: Phaser's
 * KeyboardManager drops any event that is already `defaultPrevented`, so a guard
 * registered first (PageApp boots before the game mounts) silenced snake's arrows
 * entirely - caught 2026-09-14 by pressing ArrowRight on the built page. Listeners
 * run in registration order, so a capture listener re-adds the hold for each key
 * and the hold is last in the bubble pass on `window`, behind anything a game added.
 */
export function guardGameKeys(frame: HTMLElement, win: Window = window): () => void {
  const hold = (e: KeyboardEvent) => {
    if (e.defaultPrevented || e.altKey || e.ctrlKey || e.metaKey) return;
    if (holdsKey(e.key, e.target as Target, frame.getBoundingClientRect(), win.innerHeight)) e.preventDefault();
  };
  const arm = () => {
    win.removeEventListener("keydown", hold);
    win.addEventListener("keydown", hold, { once: true });
  };
  win.addEventListener("keydown", arm, true);
  return () => {
    win.removeEventListener("keydown", arm, true);
    win.removeEventListener("keydown", hold);
  };
}
