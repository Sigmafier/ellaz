/**
 * Clear a stray text selection that is painted over a game board.
 *
 * `.ellaz-game-stage` in `global.css` stops a selection from ever STARTING
 * inside a game. It cannot do anything about one that started somewhere else:
 * the ~900 words of prose under the frame on a game page, the page header, a
 * sentence a child swiped at on the home screen on the way in. Those keep their
 * highlight - and on a phone their handles and their "Copy / Look Up" bubble -
 * right across the board, until something clears them. Tapping a region that is
 * `user-select: none` is not reliably that something: Chrome usually collapses
 * the selection, iOS Safari frequently does not.
 *
 * So the board clears it, on the first pointer that touches the board.
 *
 * The logic is split from the wiring because this repo's tests run in node: the
 * decision is a pure function over the three Selection members it reads, and the
 * listener is four lines of DOM around it.
 */

/**
 * The part of the DOM `Selection` this needs.
 *
 * Narrowed to three members rather than taking `Selection`, so a test can hand
 * it an object and a browser can hand it the real thing with no cast in either
 * direction.
 */
export interface SelectionLike {
  /** True when the selection is an insertion point rather than a highlight. */
  readonly isCollapsed: boolean;
  readonly rangeCount: number;
  removeAllRanges(): void;
}

/**
 * Drop the selection if there is one to drop. Returns whether it cleared
 * anything, which is what makes this testable at all.
 *
 * Both guards are load-bearing and neither is a micro-optimisation:
 *
 * - `rangeCount === 0` is "nothing was ever selected". Some engines report
 *   `isCollapsed: true` there and some throw reading it, so the count is
 *   checked FIRST and the property is never touched when there are no ranges.
 * - `isCollapsed` is a bare caret. Clearing one takes the caret out of whatever
 *   holds it, and this runs on every pointerdown on the board - so an unguarded
 *   version would fight any future text field for focus on every tap.
 *
 * `getSelection()` returns null in a detached document, so null is a normal
 * input rather than an error, and the throw is caught because a failure to
 * tidy up a highlight must never reach a child as a broken game.
 */
export function dismissSelection(sel: SelectionLike | null | undefined): boolean {
  if (!sel || sel.rangeCount === 0 || sel.isCollapsed) return false;
  try {
    sel.removeAllRanges();
    return true;
  } catch {
    // A cross-origin or detached selection can refuse. Nothing to do about it,
    // and nothing about it is worth interrupting a game for.
    return false;
  }
}

/** The window members this needs - `getSelection` is optional in older engines. */
export interface SelectionWindow {
  getSelection?: () => SelectionLike | null;
}

/**
 * Clear on `pointerdown`, in the CAPTURE phase, so the selection is gone before
 * the game's own handler runs and draws the frame that handler produces.
 *
 * `passive` because this never calls `preventDefault` - games own their gestures
 * through `touch-action`, and a non-passive listener on the one element every
 * game's input flows through would put a scroll-blocking check in front of every
 * tap in the catalogue.
 *
 * Returns its own detach function; `pointerdown` alone is deliberate. A
 * `selectionchange` listener would let the board eat a selection the player is
 * still dragging through the prose beneath it, and clearing on `pointerup`
 * arrives a frame after the highlight has already flashed under their finger.
 */
export function attachSelectionDismissal(el: EventTarget, win: SelectionWindow): () => void {
  const onPointerDown = () => {
    dismissSelection(win.getSelection?.());
  };
  el.addEventListener("pointerdown", onPointerDown, { capture: true, passive: true });
  return () => el.removeEventListener("pointerdown", onPointerDown, { capture: true });
}
