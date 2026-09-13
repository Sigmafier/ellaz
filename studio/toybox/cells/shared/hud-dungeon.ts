// The dungeon HUD's LAYOUT, once, for both cells - the turn HUD's shape
// (cells/shared/hud-turn.ts): pure, rects and text runs in screen px, no
// context. The two orbs of the sketch (dungeon-fx.js, 2026-09-11) - a bronze
// ring around a dark glass with a liquid level, red for hp bottom-left, blue
// for mp bottom-right - as rows of 2 px so their edges step like the art; the
// coin plate top-left; an hp bar over every hurt, standing foe; the damage
// floats; the banner across the top for the door and the two ends, with the
// restart hint under the ends. Every colour is a hex, because the Phaser page's
// HUD painter reads "#rrggbb" and nothing else.

import type { DungeonHud } from "../../sim/view";
import type { HudRect, HudText, StageHudOps } from "../canvas/hud-stage";

export type DungeonHudOps = StageHudOps;

const INK = "#1a1230", CREAM = "#fff4dc", GOLD = "#ffc93c", RED = "#ff4d5e", BAR_DARK = "#5a3a3a";
const GLASS = "#3a1c3c", GLASS_LIT = "#4a2848", RING = "#8a5a2c", RING_LIT = "#c4844a", RING_DARK = "#4a2a1c";
const HP = "#e02e48", HP_LIT = "#ff6a6a", MP = "#3a6cf0", MP_LIT = "#6aa4ff";
const PLATE = "#3a1c3c", PLATE_RIM = "#8a5a2c", PLATE_LIT = "#4a2848";
const GLYPH_W = 6, GLYPH_H = 7;
const textW = (s: string, scale: number): number => s.length * GLYPH_W * scale;

/** an orb: its radius, the ring's width, the glass's inset, the row step, the inset from the view's corners, the cradle */
const ORB_R = 34, RING_W = 4, GLASS_R = ORB_R - RING_W - 2, ROW = 2, ORB_INSET_X = 6, ORB_INSET_Y = 76, CRADLE_W = 36, CRADLE_H = 4;
/** the coin plate top-left */
const PLATE_X = 8, PLATE_Y = 8, PLATE_W = 112, PLATE_H = 28;
const BANNER_Y = 40, BANNER_SCALE = 4, HINT_SCALE = 2, TEXT_SCALE = 2, FLOAT_SCALE = 3;
const HEAD_BAR_W = 28, HEAD_BAR_H = 4;

const BANNER_TEXT: Record<number, string> = { 1: "THE DOOR OPENS", 2: "VICTORY", 3: "DEFEAT" };

function text(out: DungeonHudOps, str: string, x: number, y: number, scale: number, color: string): HudText {
  const t = { text: str, x, y, scale, color };
  out.texts.push(t);
  return t;
}

/** a text run with an ink plate behind it, for words over the room */
function plated(out: DungeonHudOps, str: string, x: number, y: number, scale: number, color: string): void {
  const w = textW(str, scale);
  out.rects.push({ x: x - 4, y: y - 3, w: w + 8, h: GLYPH_H * scale + 6, color: INK });
  text(out, str, x, y, scale, color);
}

/** a filled disc as ROW-px rows, so its edge is stepped like the sprites */
function disc(out: DungeonHudOps, cx: number, cy: number, r: number, color: string, from = -r, to = r): void {
  for (let dy = from; dy < to; dy += ROW) {
    const t = (dy + 1) / r, hw = Math.round(r * Math.sqrt(Math.max(0, 1 - t * t)) / ROW) * ROW;
    if (hw > 0) out.rects.push({ x: cx - hw, y: cy + dy, w: hw * 2, h: ROW, color });
  }
}

/** an orb at (cx, cy): ink, ring, dark glass, the liquid from its surface down, a highlight, the cradle beneath */
function orb(out: DungeonHudOps, cx: number, cy: number, level: number, fill: string, lit: string): void {
  disc(out, cx, cy, ORB_R + 2, INK);
  disc(out, cx, cy, ORB_R, RING);
  disc(out, cx, cy, ORB_R, RING_LIT, -ORB_R, -ORB_R + 10);
  disc(out, cx, cy, ORB_R, RING_DARK, ORB_R - 10, ORB_R);
  disc(out, cx, cy, GLASS_R + 2, INK);
  disc(out, cx, cy, GLASS_R, GLASS);
  disc(out, cx, cy, GLASS_R, GLASS_LIT, -GLASS_R, -GLASS_R + 8);
  const clamped = Math.max(0, Math.min(1, level));
  if (clamped > 0) {
    const surface = Math.round((GLASS_R - clamped * 2 * GLASS_R) / ROW) * ROW;
    disc(out, cx, cy, GLASS_R, fill, surface, GLASS_R);
    disc(out, cx, cy, GLASS_R, lit, surface, Math.min(GLASS_R, surface + ROW));
  }
  out.rects.push({ x: cx - 8, y: cy - 20, w: 4, h: 2, color: CREAM });
  out.rects.push({ x: cx - CRADLE_W / 2 - 2, y: cy + ORB_R - 4, w: CRADLE_W + 4, h: CRADLE_H + 4, color: INK });
  out.rects.push({ x: cx - CRADLE_W / 2, y: cy + ORB_R - 2, w: CRADLE_W, h: CRADLE_H, color: RING });
  out.rects.push({ x: cx - CRADLE_W / 2 + 2, y: cy + ORB_R - 2, w: 16, h: 2, color: RING_LIT });
}

function plate(out: DungeonHudOps, coins: number): void {
  out.rects.push({ x: PLATE_X, y: PLATE_Y + 2, w: PLATE_W, h: PLATE_H - 4, color: INK });
  out.rects.push({ x: PLATE_X + 2, y: PLATE_Y, w: PLATE_W - 4, h: PLATE_H, color: INK });
  out.rects.push({ x: PLATE_X + 2, y: PLATE_Y + 2, w: PLATE_W - 4, h: PLATE_H - 4, color: PLATE_RIM });
  out.rects.push({ x: PLATE_X + 4, y: PLATE_Y + 4, w: PLATE_W - 8, h: PLATE_H - 8, color: PLATE });
  out.rects.push({ x: PLATE_X + 4, y: PLATE_Y + 4, w: PLATE_W - 8, h: 2, color: PLATE_LIT });
  // a coin: a gold disc with a dark rim, then the count
  disc(out, PLATE_X + 18, PLATE_Y + PLATE_H / 2, 8, INK);
  disc(out, PLATE_X + 18, PLATE_Y + PLATE_H / 2, 6, GOLD);
  text(out, String(coins), PLATE_X + 34, PLATE_Y + 8, TEXT_SCALE, GOLD);
}

function bars(out: DungeonHudOps, h: DungeonHud): void {
  for (const b of h.bars) {
    const x = Math.round(b.x - HEAD_BAR_W / 2), y = Math.round(b.y - b.bar);
    out.rects.push({ x: x - 2, y: y - 2, w: HEAD_BAR_W + 4, h: HEAD_BAR_H + 4, color: INK });
    out.rects.push({ x, y, w: HEAD_BAR_W, h: HEAD_BAR_H, color: BAR_DARK });
    const n = Math.round((HEAD_BAR_W * Math.max(0, b.hp)) / Math.max(1, b.maxHp));
    if (n > 0) out.rects.push({ x, y, w: n, h: HEAD_BAR_H, color: RED });
  }
}

/** the whole dungeon HUD for one frame */
export function dungeonHudOps(h: DungeonHud, view: { w: number; h: number }): DungeonHudOps {
  const out: DungeonHudOps = { rects: [], texts: [] };
  bars(out, h);
  for (const f of h.floats) {
    const s = `-${f.value}`;
    plated(out, s, Math.round(f.x - textW(s, FLOAT_SCALE) / 2), Math.round(f.y), FLOAT_SCALE, GOLD);
  }
  orb(out, ORB_INSET_X + ORB_R, view.h - ORB_INSET_Y + ORB_R, h.hp / Math.max(1, h.maxHp), HP, HP_LIT);
  orb(out, view.w - ORB_INSET_X - ORB_R, view.h - ORB_INSET_Y + ORB_R, h.maxMp > 0 ? h.mp / h.maxMp : 0, MP, MP_LIT);
  plate(out, h.coins);
  const ended = h.phase >= 2;
  const line = ended || h.bannerT > 0 ? BANNER_TEXT[h.banner] : undefined;
  if (line) plated(out, line, Math.round((view.w - textW(line, BANNER_SCALE)) / 2), BANNER_Y, BANNER_SCALE, h.banner === 3 ? RED : CREAM);
  if (ended) plated(out, "R RESTARTS", Math.round((view.w - textW("R RESTARTS", HINT_SCALE)) / 2), BANNER_Y + GLYPH_H * BANNER_SCALE + 14, HINT_SCALE, CREAM);
  return out;
}

/** exported for the test */
export const LAYOUT = { ORB_R, ORB_INSET_X, ORB_INSET_Y, PLATE_X, PLATE_Y, PLATE_W, PLATE_H, BANNER_Y, HEAD_BAR_W, HP, MP, GOLD };
export type { HudRect, HudText };
