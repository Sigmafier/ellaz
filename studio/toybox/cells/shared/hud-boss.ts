// The boss bar's LAYOUT, once, for both cells and all three kinds: a level's
// boss while it stands gets one wide bar top-centre with its name under it,
// clear of the fight's hero bar and purse, the turn party panel and the
// dungeon coin plate (each sits in a top corner). Pure - rects and text runs in
// screen px, the shape every other HUD layout returns - so the canvas bar and
// the Phaser page cannot disagree about where it is.

import type { BossHud } from "../../sim/view";
import type { StageHudOps } from "../canvas/hud-stage";

const INK = "#1a1230", BACK = "#5a3a3a", FILL = "#e02e48", LIT = "#ff6a6a", CREAM = "#fff4dc";
const GLYPH_W = 6, GLYPH_H = 7;
/** the bar is this share of the view's width, never wider than MAX_W; it sits BAR_Y from the top */
const SHARE_NUM = 2, SHARE_DEN = 5, MAX_W = 360, BAR_Y = 12, BAR_H = 10, NAME_GAP = 5, PLATE = 3;

export function bossHudOps(boss: BossHud, view: { w: number; h: number }): StageHudOps {
  const out: StageHudOps = { rects: [], texts: [] };
  const w = Math.min(MAX_W, Math.floor((view.w * SHARE_NUM) / SHARE_DEN));
  const x = Math.round((view.w - w) / 2);
  out.rects.push({ x: x - 2, y: BAR_Y - 2, w: w + 4, h: BAR_H + 4, color: INK });
  out.rects.push({ x, y: BAR_Y, w, h: BAR_H, color: BACK });
  const n = Math.round((w * Math.max(0, Math.min(boss.hp, boss.maxHp))) / Math.max(1, boss.maxHp));
  if (n > 0) {
    out.rects.push({ x, y: BAR_Y, w: n, h: BAR_H, color: FILL });
    out.rects.push({ x, y: BAR_Y, w: n, h: 2, color: LIT });
  }
  const tw = boss.name.length * GLYPH_W;
  const tx = Math.round((view.w - tw) / 2), ty = BAR_Y + BAR_H + NAME_GAP;
  out.rects.push({ x: tx - PLATE, y: ty - PLATE + 1, w: tw + PLATE * 2, h: GLYPH_H + PLATE * 2 - 2, color: INK });
  out.texts.push({ text: boss.name, x: tx, y: ty, scale: 1, color: CREAM });
  return out;
}
