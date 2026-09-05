// Pixel sprites in a lit scene: the background painted at full resolution
// and blurred like a tilt-shift diorama, a warm light and a vignette laid
// over it, then the cast as crisp 4-cell pixel art with a bloom halo.

import { mk } from "../../canvas";
import { fillOps, isBg, isFg } from "../../passes/draw";
import { pixelate } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 4;

export const render: Renderer = (scene) => {
  const { w, h } = scene;
  const [c, x] = mk(w, h);
  const [bg, bx] = mk(w, h);
  fillOps(bx, scene.ops, 1, isBg);
  x.filter = "blur(3px)";
  x.drawImage(bg, 0, 0);
  x.filter = "none";
  const warm = x.createLinearGradient(0, 0, w, h);
  warm.addColorStop(0, "rgba(255,200,120,.22)");
  warm.addColorStop(1, "rgba(60,40,120,.22)");
  x.fillStyle = warm;
  x.fillRect(0, 0, w, h);
  const vig = x.createRadialGradient(w / 2, h / 2, h * 0.3, w / 2, h / 2, w * 0.7);
  vig.addColorStop(0, "rgba(0,0,0,0)");
  vig.addColorStop(1, "rgba(0,0,0,.35)");
  x.fillStyle = vig;
  x.fillRect(0, 0, w, h);
  const cast = pixelate(scene.ops.filter(isFg), w, h, CELL, { outline: true });
  x.save();
  x.globalCompositeOperation = "lighter";
  x.globalAlpha = 0.35;
  x.filter = "blur(6px)";
  x.drawImage(cast, 0, 0);
  x.restore();
  x.drawImage(cast, 0, 0);
  return c;
};
