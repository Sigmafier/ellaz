// The stage HUD's LAYOUT, once, for both cells: the hero's bar top-left, the
// wave, the purse and the level top-right with a thin xp bar, and a banner in
// the middle for the phase turns. Pure - it returns rects and text runs in
// screen px and never touches a context, so the canvas bar fills them with
// ctx and the Phaser page with Graphics + baked text, and the two cannot
// disagree about where anything is. Colours are the cells' own palette.

import type { StageHud } from "../../sim/view";

export interface HudRect { x: number; y: number; w: number; h: number; color: string }
export interface HudText { text: string; x: number; y: number; scale: number; color: string }
export interface StageHudOps { rects: HudRect[]; texts: HudText[] }

const INK = "#1a1230";
const CREAM = "#fff4dc";
const PANEL = "#f7e2b8";
const GOLD = "#ffc93c";
const GOLD_DARK = "#e0901c";
const XP = "#2ec08a";
const XP_LIGHT = "#7be4c2";

/** the banner shown in the middle for each phase, and how long a fresh fight phase keeps its "WAVE N" */
const WAVE_BANNER_TICKS = 90;
const BANNER_SCALE = 2;

/** 5x7 bitmap font metrics, the same as cells/canvas/font.ts: 6 px advance per glyph at scale 1 */
const GLYPH_W = 6;
const GLYPH_H = 7;
const textW = (s: string, scale: number): number => s.length * GLYPH_W * scale;

function panel(out: StageHudOps, x: number, y: number, w: number, h: number): void {
  out.rects.push({ x: x - 2, y: y - 2, w: w + 4, h: h + 4, color: INK });
  out.rects.push({ x, y, w, h, color: PANEL });
}

function bar(out: StageHudOps, x: number, y: number, w: number, h: number, frac: number, fill: string, light: string): void {
  panel(out, x, y, w, h);
  const n = Math.round(w * Math.max(0, Math.min(1, frac)));
  if (n > 0) {
    out.rects.push({ x, y, w: n, h, color: fill });
    out.rects.push({ x, y, w: n, h: 2, color: light });
  }
}

function banner(out: StageHudOps, line: string, view: { w: number; h: number }, color = INK): void {
  const tw = textW(line, BANNER_SCALE);
  const x = Math.round((view.w - tw) / 2);
  const y = Math.round(view.h / 2 - GLYPH_H * BANNER_SCALE);
  out.rects.push({ x: x - 6, y: y - 5, w: tw + 12, h: GLYPH_H * BANNER_SCALE + 10, color: INK });
  out.rects.push({ x: x - 4, y: y - 3, w: tw + 8, h: GLYPH_H * BANNER_SCALE + 6, color: CREAM });
  out.texts.push({ text: line, x, y, scale: BANNER_SCALE, color });
}

/** what the middle of the screen says for this phase, or nothing */
function bannerFor(s: StageHud): string | null {
  if (s.wphase === 1) return "GO  >";
  if (s.wphase === 2) return `STAGE CLEAR  ${s.coins} COINS  LV ${s.level}`;
  if (s.wphase === 3) return "TRY AGAIN";
  if (s.waveT < WAVE_BANNER_TICKS) return `WAVE ${s.wave + 1}`;
  return null;
}

/** the whole stage HUD for one frame */
export function stageHudOps(s: StageHud, hp: number, maxHp: number, name: string, view: { w: number; h: number }): StageHudOps {
  const out: StageHudOps = { rects: [], texts: [] };
  // the hero, top-left: bar and name
  bar(out, 12, 14, 180, 12, hp / Math.max(1, maxHp), "#ff4d8d", "#ff9dc0");
  out.texts.push({ text: name.toUpperCase(), x: 12, y: 30, scale: 1, color: INK });
  // top-right: the wave, the purse, the level over its xp bar
  const right = view.w - 12;
  const wave = `WAVE ${s.wave + 1}/${s.waves}`;
  out.texts.push({ text: wave, x: right - textW(wave, 1), y: 14, scale: 1, color: INK });
  const purse = `${s.coins}`;
  const px = right - textW(purse, 1);
  out.texts.push({ text: purse, x: px, y: 24, scale: 1, color: INK });
  // a coin glyph before the count: a 6x6 disc of two rects
  out.rects.push({ x: px - 10, y: 24, w: 6, h: 6, color: GOLD_DARK });
  out.rects.push({ x: px - 9, y: 25, w: 4, h: 4, color: GOLD });
  const lv = `LV ${s.level}`;
  out.texts.push({ text: lv, x: right - 80 - textW(lv, 1) - 6, y: 38, scale: 1, color: INK });
  bar(out, right - 80, 38, 80, 6, s.xp / Math.max(1, s.xpNeed), XP, XP_LIGHT);
  const line = bannerFor(s);
  if (line) banner(out, line, view);
  return out;
}
