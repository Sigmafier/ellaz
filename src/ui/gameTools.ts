/**
 * The one control a game owns that is drawn OUTSIDE the game panel.
 *
 * `.claude/rules/game-controls-and-platform-chrome-never-share-a-bar.md` puts
 * restart with the game, because it means nothing with no game mounted - and
 * the operator put it on the page row, under the breadcrumb, where the rest of
 * the page's utilities live. Those two are only reconcilable through a handoff:
 * the button is emitted HTML the build writes once, and the handler lives
 * inside whichever game is currently mounted.
 *
 * So this is a one-slot registry rather than a prop: `GameChrome` fills it on
 * mount and empties it on unmount, and the page wires the button to whatever is
 * in it. A subscriber is told when that changes so the button can hide itself
 * when there is no game - a dead restart button is the same failure as a dead
 * full-screen button, which is why that one is emitted `hidden` too.
 *
 * Deliberately NOT in `@sdk`: a game never touches this. It is chrome talking
 * to chrome.
 */
type Handler = () => void;

let restart: Handler | null = null;
const listeners = new Set<(available: boolean) => void>();

/** Called by `GameChrome`. Pass null on unmount - the button hides itself. */
export function setRestart(fn: Handler | null): void {
  if (restart === fn) return;
  restart = fn;
  listeners.forEach((cb) => cb(fn !== null));
}

export function runRestart(): void {
  restart?.();
}

export function hasRestart(): boolean {
  return restart !== null;
}

/**
 * The PAUSE slot, and it carries STATE where restart carries only a handler.
 *
 * A pause button has to say which of the two things it will do next, so the
 * page needs the flag as well as the toggle - and the game owns that flag
 * (`.claude/rules/...` and `GameChrome`'s own note: the game is what stops).
 * Passing `null` means this game has no pause at all, or its run is over, and
 * the button hides itself - a pause on a dead board offers to stop something
 * that already stopped.
 */
export type PauseSlot = { paused: boolean; toggle: () => void };

let pause: PauseSlot | null = null;
const pauseListeners = new Set<(state: PauseSlot | null) => void>();

export function setPause(next: PauseSlot | null): void {
  // Compared FIELD BY FIELD, not by identity: the game rebuilds this object on
  // every render, so an identity check would announce a change on every
  // keystroke and repaint the button under the player's finger.
  if (pause === next) return;
  if (pause && next && pause.paused === next.paused && pause.toggle === next.toggle) return;
  pause = next;
  pauseListeners.forEach((cb) => cb(next));
}

export function getPause(): PauseSlot | null {
  return pause;
}

export function onPauseChange(cb: (state: PauseSlot | null) => void): () => void {
  pauseListeners.add(cb);
  return () => {
    pauseListeners.delete(cb);
  };
}

/**
 * The page tells the chrome it has already drawn a restart button.
 *
 * `GameChrome` is mounted by TWO entries: `PageApp`, on an emitted page that
 * carries the utility row, and `standalone.tsx`, which is one game in a zip on
 * somebody else's CDN and has no emitted anything. Without this the standalone
 * bundle would ship with no restart at all - a real control silently missing
 * from a published artifact, and no gate here fetches that artifact back.
 *
 * So the chrome draws its own button unless a page has claimed the slot. A
 * boolean rather than a DOM read, so it is the same fact in a test as it is in
 * a browser.
 */
let pageOwns = false;

export function claimRestartSlot(): void {
  pageOwns = true;
}

export function pageOwnsRestart(): boolean {
  return pageOwns;
}

/** Fires on every change. Returns the unsubscribe, like `onMuteChange`. */
export function onRestartChange(cb: (available: boolean) => void): () => void {
  listeners.add(cb);
  return () => {
    listeners.delete(cb);
  };
}
