/**
 * Scale a mounted game so the whole of it fits the screen it was given.
 *
 * WHY THIS HAS TO EXIST AT ALL
 * Every game sizes its board against the VIEWPORT - `min(90vw, 60vh, cap)` -
 * and then stacks its stats row, its difficulty row and sometimes a keypad on
 * top of that. So the total is always TALLER than the window the board just
 * measured itself against. On a 1536x638 window, 2048 asks for 680px. Nothing
 * the frame does can talk it out of that, because the game never consulted the
 * frame.
 *
 * The old answer was to let the stage grow, which is why nothing was ever cut
 * off and why the bottom of the game sat below the fold. The full-screen stage
 * is a fixed 100dvh with `overflow: hidden`, so growing is no longer on the
 * table: without this module a tall game would be CLIPPED, which is strictly
 * worse than the scroll it replaced.
 *
 * Scaling the mounted result is the one lever that reaches all 21 games without
 * editing any of them.
 *
 * The transform goes on `#game-frame` - the element the build emits and React
 * merely mounts INTO. React owns that element's children and never its style,
 * so this cannot fight the reconciler.
 */

/** Breathing room left around the game inside the stage, in px. */
const GUTTER = 16;

/**
 * Below this, scaling costs more than it buys.
 *
 * The kids games carry a 2cm minimum tap target, and a scale multiplies that
 * straight through: 2cm at 0.65 is 1.3cm, which a five-year-old on a phone
 * genuinely cannot hit. So rather than shrink past it we release the fixed
 * height and let the page scroll, which is what it did before any of this -
 * worse framing, but nothing lost and nothing unreachable.
 */
const MIN_SCALE = 0.65;

/**
 * Fit `frame` inside `box`, and keep it fitted.
 *
 * Returns a teardown that disconnects the observers and removes every style
 * this function set, so a caller can hand the elements back untouched.
 */
export function fitStage(frame: HTMLElement, box: HTMLElement): () => void {
  let queued = false;

  const apply = (): void => {
    queued = false;

    // Measure UNSCALED. A rect reports the transformed height, so measuring
    // without clearing first feeds the previous scale back into the next one
    // and the game creeps smaller on every resize.
    frame.style.transform = "";
    box.style.height = "";

    const natural = frame.getBoundingClientRect().height;
    const available = box.clientHeight - GUTTER;
    if (natural <= 0 || available <= 0) return;

    const scale = available / natural;
    if (scale >= 1) return;

    if (scale < MIN_SCALE) {
      // Too tall to shrink honestly. Give the height back and let the page
      // scroll, exactly as it did before the stage became one screen.
      box.style.height = "auto";
      return;
    }

    frame.style.transformOrigin = "center center";
    frame.style.transform = `scale(${scale.toFixed(4)})`;
  };

  // Coalesce to one measurement per frame. A ResizeObserver can fire several
  // times as a game mounts, and each apply() forces a synchronous layout.
  const schedule = (): void => {
    if (queued) return;
    queued = true;
    requestAnimationFrame(apply);
  };

  // Observe the FRAME only, never the box. The transform does not change the
  // frame's border box, so this cannot feed itself - but the box's height is
  // something apply() writes, and observing that would be a genuine loop.
  const observer =
    typeof ResizeObserver === "function" ? new ResizeObserver(schedule) : null;
  observer?.observe(frame);
  window.addEventListener("resize", schedule);

  // A hidden tab runs no animation frames and delivers no resize observations,
  // so a page opened in a background tab can mount its whole game without a
  // single fit ever being computed. Both mechanisms resume on becoming visible
  // and this is belt-and-braces on top of that - but it is the one case where
  // the game would otherwise be sitting there clipped when the visitor finally
  // looks at it, and it cost two lines. (Found by measuring in a backgrounded
  // tab and briefly believing the clipping was real.)
  document.addEventListener("visibilitychange", schedule);

  schedule();

  return () => {
    observer?.disconnect();
    window.removeEventListener("resize", schedule);
    document.removeEventListener("visibilitychange", schedule);
    frame.style.transform = "";
    frame.style.transformOrigin = "";
    box.style.height = "";
  };
}
