/**
 * ON A PC, A GAME'S SIDE COLUMNS ARE AS TALL AS THE BOARD, AND WHAT IS IN THEM FITS.
 *
 * `.ellaz-game-footer` and `.ellaz-game-side` sit beside the board in a row the
 * board sets the height of (`contain: size` in global.css). When a game puts
 * more in a column than that row holds, there were two answers before this and
 * both hid a control: `overflow-y: auto` put maze's down arrow behind a
 * scrollbar at 1024x768, and `overflow: visible` would hang coloring's palette
 * off the bottom of the window. Measured on live ellaz.fun 2026-09-14 by
 * `scripts/repro/repro-controls-stay-on-screen.mjs`: 5 games, 1024 to 1536 wide.
 *
 * So the column's content is SCALED down until it fits, never scrolled and never
 * cut. A transform and not `zoom`: a transform does not change the layout box
 * this measures, so the reading cannot chase its own answer.
 *
 * A phone never scales - it scrolls its page, and a phone's controls sit under
 * the board where the page gives them all the height they ask for. Same 900px
 * as every other PC rule, read live so a resized window changes arm.
 */
const PC = "(min-width: 900px)";

export function fitColumns(panel: HTMLElement): () => void {
  if (typeof ResizeObserver === "undefined" || typeof matchMedia === "undefined") return () => {};
  const mq = matchMedia(PC);
  const cols = () =>
    [...panel.children].filter(
      (c): c is HTMLElement => c.classList.contains("ellaz-game-footer") || c.classList.contains("ellaz-game-side"),
    );

  const apply = () => {
    for (const col of cols()) {
      const inner = col.firstElementChild as HTMLElement | null;
      if (!inner) continue;
      let scale = 1;
      if (mq.matches) {
        const cs = getComputedStyle(col);
        const room = col.clientHeight - parseFloat(cs.paddingTop) - parseFloat(cs.paddingBottom);
        const need = inner.offsetHeight;
        if (room > 0 && need > room) scale = room / need;
      }
      inner.style.transform = scale < 1 ? `scale(${scale.toFixed(4)})` : "";
    }
  };

  const ro = new ResizeObserver(apply);
  for (const col of cols()) {
    ro.observe(col);
    if (col.firstElementChild) ro.observe(col.firstElementChild);
  }
  mq.addEventListener("change", apply);
  apply();
  return () => {
    ro.disconnect();
    mq.removeEventListener("change", apply);
  };
}
