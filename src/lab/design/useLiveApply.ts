import { useEffect, useRef } from "react";

/**
 * Apply on every change, and poll ONLY while the page is still booting.
 *
 * The first version of this bench did the whole job inside one 500ms
 * `setInterval` that was rebuilt whenever a knob moved. A range input fires
 * `change` every few milliseconds while you drag it, so the clock was reset
 * faster than it could tick and NOTHING happened until the operator let go -
 * then, half a second later, the preview jumped. Measured on the live bench at
 * 390px: a full drag of the first knob left the frame's body untouched at the
 * instant the pointer came up, and carried `--gc-tap: 87px` 1.2 seconds later.
 *
 * On a desktop that reads as lag. On a phone, where you drag with a thumb over
 * the thing you are watching, it reads as a dead control - which is what it was
 * reported as.
 *
 * So the two jobs are split, because they are two jobs. A knob is a change and
 * lands at once. Waiting for a real document to boot is a poll, keyed on the
 * FRAME rather than on the knobs, so turning one cannot restart the clock.
 *
 * `apply` returns true once it found the page; the poll stops there.
 */
export function useLiveApply(apply: () => boolean, frameKey: string) {
  const latest = useRef(apply);
  useEffect(() => {
    latest.current = apply;
  });

  // Every change - a knob, a style - lands on the next commit.
  useEffect(() => {
    apply();
  }, [apply]);

  // Boot only. 250ms x 40 is ten seconds, which is a cold module graph on a
  // phone rather than a number anybody tuned.
  useEffect(() => {
    let n = 0;
    const t = setInterval(() => {
      if (latest.current() || ++n > 40) clearInterval(t);
    }, 250);
    return () => clearInterval(t);
  }, [frameKey]);
}
