// Ordered (Bayer 4x4) dithering to a FIXED palette at a low-res pixel stage,
// then a nearest-neighbour upscale. The pass every hardware-palette style
// shares: 1-bit, PICO-8, EGA, C64, Spectrum, VGA. `pixelate` snaps colours per
// pixel; this one is positional, which is what a checkerboard IS.
//
// Anisotropic cells (C64's double-wide pixels) come from `cellY` differing
// from `cellX`. The low-res canvas is exposed for a style that reads cells
// rather than merely upscaling them (the Spectrum's 8x8 attribute clash).

import { mk, type Canvas2D } from "../canvas";
import type { Op } from "../scene-ops";
import { fillOps, fillShaded, isBg, isFg } from "./draw";
import { outlineOnto } from "./outline";
import { nearest, type Rgb } from "./quantize";

const BAYER4 = [
  [0, 8, 2, 10],
  [12, 4, 14, 6],
  [3, 11, 1, 9],
  [15, 7, 13, 5],
];

export interface DitherOpts {
  outline?: boolean;
  /** 0 = plain nearest-colour snap; 1 = full-amplitude checkerboards */
  strength?: number;
  /** vertical cell size when it differs from the horizontal one */
  cellY?: number;
  /** foreground gets the radial highlight/shadow before downsampling */
  shaded?: boolean;
}

/** The scene at 1/cell resolution, foreground over background, outline optional. */
export function renderLow(ops: Op[], W: number, H: number, cellX: number, cellY = cellX, outline = false, shaded = false): Canvas2D {
  const w = Math.ceil(W / cellX), h = Math.ceil(H / cellY);
  const [lo, lx] = mk(w, h);
  lx.save();
  lx.scale(1 / cellX, 1 / cellY);
  fillOps(lx, ops, 1, isBg);
  lx.restore();
  const [fg, fx] = mk(w, h);
  if (shaded) {
    const [hi, hx] = mk(W, H);
    fillShaded(hx, ops.filter(isFg), false);
    fx.imageSmoothingEnabled = true;
    fx.drawImage(hi, 0, 0, w, h);
  } else {
    fx.save();
    fx.scale(1 / cellX, 1 / cellY);
    fillOps(fx, ops, 1, isFg);
    fx.restore();
  }
  if (outline) outlineOnto(lx, fg);
  lx.drawImage(fg, 0, 0);
  return lo;
}

/** Dither `d` (w wide) in place: add the Bayer threshold, then snap to the palette. */
export function ditherImage(d: Uint8ClampedArray, w: number, palette: Rgb[], strength: number): void {
  const q = nearest(palette);
  const amp = 48 * strength;
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const p = i / 4, x = p % w, y = (p - x) / w;
    const t = (BAYER4[y & 3][x & 3] / 16 - 0.5) * amp;
    const [r, g, b] = q(d[i] + t, d[i + 1] + t, d[i + 2] + t);
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

/** Nearest-neighbour upscale of a low-res canvas to W x H. */
export function upscale(lo: Canvas2D, W: number, H: number): Canvas2D {
  const [out, ox] = mk(W, H);
  ox.drawImage(lo, 0, 0, W, H);
  return out;
}

/** Low-res render, ordered dither to `palette`, upscale. Returns a W x H canvas. */
export function ditherPixelate(ops: Op[], W: number, H: number, cellX: number, palette: Rgb[], opts: DitherOpts = {}): Canvas2D {
  const lo = renderLow(ops, W, H, cellX, opts.cellY ?? cellX, opts.outline ?? false, opts.shaded ?? false);
  const lx = lo.getContext("2d")!;
  const im = lx.getImageData(0, 0, lo.width, lo.height);
  ditherImage(im.data, lo.width, palette, opts.strength ?? 0.5);
  lx.putImageData(im, 0, 0);
  return upscale(lo, W, H);
}

/** An n x n x n colour cube as a palette (VGA-style "256 colours" is cube(6)). */
export function cube(n: number): Rgb[] {
  const out: Rgb[] = [];
  const step = 255 / (n - 1);
  for (let r = 0; r < n; r++) for (let g = 0; g < n; g++) for (let b = 0; b < n; b++) out.push([Math.round(r * step), Math.round(g * step), Math.round(b * step)]);
  return out;
}
