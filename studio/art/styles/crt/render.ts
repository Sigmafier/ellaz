// CRT arcade: the SNES stage, then a screen-blended ghost 2px right for the
// phosphor bloom, scanlines every 3px, and a vignette.

import { mk } from "../../canvas";
import { pixelate } from "../../passes/pixelate";
import type { Renderer } from "../types";

export const CELL = 5;

export const render: Renderer = (scene) => {
  const { w: W, h: H } = scene;
  const base = pixelate(scene.ops, W, H, CELL, { outline: true });
  const [c, x] = mk(W, H);
  x.drawImage(base, 0, 0);
  x.globalCompositeOperation = "screen";
  x.globalAlpha = 0.25;
  x.drawImage(base, 2, 0);
  x.globalAlpha = 1;
  x.globalCompositeOperation = "source-over";
  x.fillStyle = "rgba(0,0,0,.28)";
  for (let y = 0; y < H; y += 3) x.fillRect(0, y, W, 1);
  const g = x.createRadialGradient(W / 2, H / 2, H * 0.4, W / 2, H / 2, W * 0.75);
  g.addColorStop(0, "rgba(0,0,0,0)");
  g.addColorStop(1, "rgba(0,0,0,.6)");
  x.fillStyle = g;
  x.fillRect(0, 0, W, H);
  return c;
};
