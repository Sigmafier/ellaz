/* A picture of the game, when there is one to take.
   ===========================================================================

   THE HONEST SCOPE, MEASURED 2026-09-02: two of forty-two games have a canvas.
   `snake` (Phaser) and `bubbleshooter` (2D). Every other game is DOM, and
   screenshotting DOM needs a library that costs about as much as this app's
   entire first visit. So this covers two games, and the other forty send the
   geometry and the exact board instead - which is the evidence that actually
   explains a layout complaint.

   THE TRAP THIS FILE EXISTS FOR
   Phaser renders on WebGL, and reading a WebGL canvas after the frame has been
   presented gives you a BLANK image unless the context was created with
   `preserveDrawingBuffer`. It does not throw. It does not warn. It returns a
   perfectly well-formed transparent or black rectangle, which travels, gets
   attached to an issue, and looks exactly like a screenshot of a broken game.

   That is worse than sending nothing, because it is evidence pointing the wrong
   way. So `isBlank` samples the pixels and a blank capture is REFUSED, with a
   reason the report carries - `no-canvas`, `blank` and `captured` are three
   different facts and the report says which one it is.

   The decisions live in pure functions; the DOM handling is the thin part on
   top. That split is deliberate: the pixel test is the bit that can be wrong in
   a way nobody notices. */

export type ShotWhy = "no-canvas" | "blank" | "failed";
export type ShotResult = { ok: true; dataUrl: string } | { ok: false; why: ShotWhy };

/** Longest side of what we send. A report is not an art gallery, and the rules
 *  cap the field at 220 KB. */
export const MAX_SIDE = 640;

/**
 * Is this frame empty?
 *
 * Empty means every pixel is the same - the transparent black a WebGL read-back
 * gives, or the flat fill a canvas that has not drawn yet gives. A real frame
 * of any game has more than one colour in it.
 *
 * Sampled rather than exhaustive: a 640x640 frame is 1.6M numbers and this runs
 * on a phone while a child waits.
 */
export function isBlank(pixels: Uint8ClampedArray): boolean {
  if (pixels.length < 4) return true;
  const first = [pixels[0], pixels[1], pixels[2], pixels[3]];
  // Every 97th pixel: coprime with any row width we produce, so the walk does
  // not land on the same column of a striped image every time.
  const step = 97 * 4;
  for (let i = step; i < pixels.length; i += step) {
    if (
      pixels[i] !== first[0] ||
      pixels[i + 1] !== first[1] ||
      pixels[i + 2] !== first[2] ||
      pixels[i + 3] !== first[3]
    ) {
      return false;
    }
  }
  return true;
}

/** The biggest canvas is the game; anything else is a sprite sheet or a chart. */
export function pickCanvas<T extends { width: number; height: number }>(all: readonly T[]): T | null {
  let best: T | null = null;
  for (const c of all) {
    if (c.width <= 0 || c.height <= 0) continue;
    if (!best || c.width * c.height > best.width * best.height) best = c;
  }
  return best;
}

/** How big to draw it, never bigger than it was. */
export function fit(w: number, h: number, maxSide = MAX_SIDE): { w: number; h: number } {
  const longest = Math.max(w, h);
  if (longest <= maxSide) return { w: Math.round(w), h: Math.round(h) };
  const k = maxSide / longest;
  return { w: Math.max(1, Math.round(w * k)), h: Math.max(1, Math.round(h * k)) };
}

/**
 * Take the picture, or say why not.
 *
 * Never throws: a tainted canvas, a missing 2D context and a browser that
 * refuses `toDataURL` are all ordinary outcomes on somebody's phone, and none
 * of them is worth losing the report over.
 */
export function captureShot(root: ParentNode | null): ShotResult {
  try {
    if (!root) return { ok: false, why: "no-canvas" };
    const canvases = Array.from(root.querySelectorAll("canvas"));
    const src = pickCanvas(canvases);
    if (!src) return { ok: false, why: "no-canvas" };

    const size = fit(src.width, src.height);
    const out = document.createElement("canvas");
    out.width = size.w;
    out.height = size.h;
    const ctx = out.getContext("2d", { willReadFrequently: true });
    if (!ctx) return { ok: false, why: "failed" };
    ctx.drawImage(src, 0, 0, size.w, size.h);

    if (isBlank(ctx.getImageData(0, 0, size.w, size.h).data)) {
      // Almost certainly a WebGL context without `preserveDrawingBuffer`. Say
      // so rather than sending a black rectangle that reads as a broken game.
      return { ok: false, why: "blank" };
    }

    return { ok: true, dataUrl: out.toDataURL("image/jpeg", 0.6) };
  } catch {
    return { ok: false, why: "failed" };
  }
}
