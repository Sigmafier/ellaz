// Attribute clash: a 3-pixel cell, the fifteen Spectrum colours, and the
// rule that made the machine's look - every 8x8 block of cells may hold
// exactly two colours (ink and paper), so where the cast crosses a block
// border the wrong colour spills. That spill is the style, not a bug.

import { renderLow, upscale } from "../../passes/dither";
import { hexToRgb, nearest, type Rgb } from "../../passes/quantize";
import spectrum from "../../palettes/spectrum.json";
import type { Renderer } from "../types";

export const CELL = 3;
export const ATTR = 8;
const PAL: Rgb[] = spectrum.colors.map((c) => hexToRgb(c.hex));
const snap = nearest(PAL);

/** The two most-used palette colours in a block, then every pixel to the nearer of them. */
function clashBlock(d: Uint8ClampedArray, w: number, h: number, bx: number, by: number): void {
  const count = new Map<string, [number, Rgb]>();
  const at = (x: number, y: number) => (y * w + x) * 4;
  for (let y = by; y < Math.min(by + ATTR, h); y++) for (let x = bx; x < Math.min(bx + ATTR, w); x++) {
    const i = at(x, y);
    const c = d[i + 3] === 0 ? PAL[0] : snap(d[i], d[i + 1], d[i + 2]);
    const k = c.join(",");
    const e = count.get(k) ?? [0, c];
    e[0]++;
    count.set(k, e);
  }
  const two = [...count.values()].sort((a, b) => b[0] - a[0]).slice(0, 2).map((e) => e[1]);
  const pick = nearest(two);
  for (let y = by; y < Math.min(by + ATTR, h); y++) for (let x = bx; x < Math.min(bx + ATTR, w); x++) {
    const i = at(x, y);
    const [r, g, b] = pick(d[i], d[i + 1], d[i + 2]);
    d[i] = r; d[i + 1] = g; d[i + 2] = b; d[i + 3] = 255;
  }
}

export const render: Renderer = (scene) => {
  const lo = renderLow(scene.ops, scene.w, scene.h, CELL, CELL, true);
  const lx = lo.getContext("2d")!;
  const im = lx.getImageData(0, 0, lo.width, lo.height);
  for (let by = 0; by < lo.height; by += ATTR) for (let bx = 0; bx < lo.width; bx += ATTR) clashBlock(im.data, lo.width, lo.height, bx, by);
  lx.putImageData(im, 0, 0);
  return upscale(lo, scene.w, scene.h);
};
