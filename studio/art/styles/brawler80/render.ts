// 80px brawler: the cast as 3-cell pixel art with a black outline and four
// tones per channel (a hand-drawn arcade sprite's ramp), standing on a
// backdrop painted at full resolution, desaturated and softened so the
// bright cast pops off it. Our own drawing of the look; nothing traced.

import { mk } from "../../canvas";
import { fillOps, isBg, isFg } from "../../passes/draw";
import { pixelate } from "../../passes/pixelate";
import type { Quantizer } from "../../passes/quantize";
import type { Renderer } from "../types";

export const CELL = 3;
export const TONES = 4;
const step = 255 / (TONES - 1);
const tones: Quantizer = (r, g, b) => [Math.round(r / step) * step, Math.round(g / step) * step, Math.round(b / step) * step];

export const render: Renderer = (scene) => {
  const { w, h } = scene;
  const [c, x] = mk(w, h);
  const [bg, bx] = mk(w, h);
  fillOps(bx, scene.ops, 1, isBg);
  x.filter = "saturate(.55) blur(1.5px)";
  x.drawImage(bg, 0, 0);
  x.filter = "none";
  x.fillStyle = "rgba(40,30,60,.12)";
  x.fillRect(0, 0, w, h);
  x.drawImage(pixelate(scene.ops.filter(isFg), w, h, CELL, { outline: true, shaded: true, quant: tones }), 0, 0);
  return c;
};
