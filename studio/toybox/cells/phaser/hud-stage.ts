// The Phaser page's painter for the stage HUD: the layout is the canvas bar's
// (cells/canvas/hud-stage.ts), so the two pages put every rect and glyph in
// the same place; this file only fills the rects on the HUD Graphics layer and
// hands each text run to the cell's baked-text pool.

import type Phaser from "phaser";
import type { HudModel } from "../../sim/view";
import { stageHudOps } from "../canvas/hud-stage";

export type TextFn = (str: string, x: number, y: number, scale: number, color: string) => void;

const hexCache = new Map<string, number>();
function hex(css: string): number {
  const hit = hexCache.get(css);
  if (hit !== undefined) return hit;
  const n = parseInt(css.slice(1), 16);
  hexCache.set(css, n);
  return n;
}

/** draw the stage HUD; returns false when the model carries no stage, so the caller draws the Versus bars instead */
export function drawStageHud(g: Phaser.GameObjects.Graphics, text: TextFn, model: HudModel, view: { w: number; h: number }): boolean {
  const s = model.stage;
  if (!s) return false;
  const ops = stageHudOps(s, model.hp[s.hero] ?? 0, model.maxHp[s.hero] ?? 1, model.names[s.hero] ?? "", view);
  for (const r of ops.rects) {
    g.fillStyle(hex(r.color), 1);
    g.fillRect(r.x, r.y, r.w, r.h);
  }
  for (const t of ops.texts) text(t.text, t.x, t.y, t.scale, t.color);
  return true;
}
