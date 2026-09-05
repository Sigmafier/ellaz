// The pixel-art stage every retro style shares: render the scene at 1/cell
// resolution, optionally outline and quantize it there, then upscale with
// nearest-neighbour so each low-res pixel becomes a crisp cell x cell block.
//
// Foreground and background are rendered as two layers so the outline and
// the fg-aware quantizers can tell them apart.

import { mk, type Canvas2D } from "../canvas";
import type { Op } from "../scene-ops";
import { fillOps, fillShaded, isBg, isFg } from "./draw";
import { outlineOnto } from "./outline";
import { GB, luma, quantizeImage, type Quantizer } from "./quantize";

export interface PixelateOpts {
  /** draw a one-cell dark outline around the foreground */
  outline?: boolean;
  /** snap every pixel's colour after compositing */
  quant?: Quantizer;
  /** foreground gets the radial highlight/shadow before downsampling (hi-bit look) */
  shaded?: boolean;
  /**
   * Game Boy mode: foreground takes the two DARK shades, background the two
   * LIGHT ones, so a character never dissolves into the wall behind it.
   */
  fgAware?: boolean;
}

function fgLayer(ops: Op[], w: number, h: number, W: number, H: number, cell: number, shaded: boolean): Canvas2D {
  const [fg, fx] = mk(w, h);
  if (shaded) {
    const [hi, hx] = mk(W, H);
    fillShaded(hx, ops.filter(isFg), true);
    fx.imageSmoothingEnabled = true;
    fx.drawImage(hi, 0, 0, w, h);
  } else {
    fillOps(fx, ops, 1 / cell, isFg);
  }
  return fg;
}

function gbSplit(d: Uint8ClampedArray, fgAlpha: Uint8ClampedArray): void {
  for (let i = 0; i < d.length; i += 4) {
    if (d[i + 3] === 0) continue;
    const l = luma(d[i], d[i + 1], d[i + 2]);
    const isFgPx = fgAlpha[i + 3] > 0;
    const shade = isFgPx ? (l > 0.45 ? 1 : 0) : (l > 0.5 ? 3 : 2);
    const [r, g, b] = GB[shade];
    d[i] = r; d[i + 1] = g; d[i + 2] = b;
  }
}

/**
 * Render `ops` (a W x H scene) as pixel art with `cell`-pixel blocks.
 * Returns a W x H canvas.
 */
export function pixelate(ops: Op[], W: number, H: number, cell: number, opts: PixelateOpts = {}): Canvas2D {
  const w = Math.ceil(W / cell), h = Math.ceil(H / cell);
  const [bg, bx] = mk(w, h);
  fillOps(bx, ops, 1 / cell, isBg);
  const fg = fgLayer(ops, w, h, W, H, cell, opts.shaded ?? false);
  if (opts.outline) outlineOnto(bx, fg);
  bx.drawImage(fg, 0, 0);

  if (opts.quant || opts.fgAware) {
    const im = bx.getImageData(0, 0, w, h);
    if (opts.fgAware) {
      const fa = fg.getContext("2d")!.getImageData(0, 0, w, h).data;
      gbSplit(im.data, fa);
    } else if (opts.quant) {
      quantizeImage(im.data, opts.quant);
    }
    bx.putImageData(im, 0, 0);
  }

  const [out, ox] = mk(W, H);
  ox.drawImage(bg, 0, 0, W, H);
  return out;
}

/** The low-res layers themselves, for styles (voxel) that read cells rather than upscale. */
export function lowRes(ops: Op[], W: number, H: number, cell: number): { w: number; h: number; all: Uint8ClampedArray; fgAlpha: Uint8ClampedArray } {
  const w = Math.ceil(W / cell), h = Math.ceil(H / cell);
  const [, lx] = mk(w, h);
  fillOps(lx, ops, 1 / cell);
  const [, fx] = mk(w, h);
  fillOps(fx, ops, 1 / cell, isFg);
  return { w, h, all: lx.getImageData(0, 0, w, h).data, fgAlpha: fx.getImageData(0, 0, w, h).data };
}
