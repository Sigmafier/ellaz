// The turn HUD's LAYOUT, once, for both cells - the stage HUD's shape
// (cells/canvas/hud-stage.ts): pure, rects and text runs in screen px, no
// context. The party panel top-left with TURN n and a row per hero (name,
// status, a bar, hp/max), the log line in a panel at the foot, the banner
// across the top, SPACE: END TURN top-right while the player holds the board,
// an hp bar over every standing unit, the damage floats, and "-atk" over a
// hero a foe will strike. The words for the log and banner codes live here.
//
// Every number is the demo's layout (2026-09-13) at the field's size; the
// bitmap font is 5x7 at 6 px advance, drawn at the scales below.

import type { HudRect, HudText, StageHudOps } from "../canvas/hud-stage";
import type { TurnHud } from "../../sim/view";

export type TurnHudOps = StageHudOps;

const INK = "#1a1230", CREAM = "#fff4dc", PANEL = "#f7e2b8", GREY = "#9a8a7a";
const GREEN = "#2ec08a", RED = "#ff4d5e", PINK = "#c2185b", BAR_DARK = "#5a3a3a", ACTIVE = "#c2185b";
const GLYPH_W = 6, GLYPH_H = 7;
const textW = (s: string, scale: number): number => s.length * GLYPH_W * scale;

/** the party panel: its inset, its width, the row height and the bar geometry */
// the bar stops short of the hp/max text at the row's right edge (the demo's 256 ran under its own numbers)
const PANEL_X = 16, PANEL_Y = 16, PANEL_W = 300, PANEL_HEAD = 32, ROW_H = 44, BAR_W = 222;
const LOG_H = 30, LOG_W = 700;
const BANNER_Y = 40, BANNER_SCALE = 4, TEXT_SCALE = 2, SMALL = 1, FLOAT_SCALE = 3;
/** the bar over a unit's head: its width and height, and the strike label's lift above the target's crown */
const HEAD_BAR_W = 48, HEAD_BAR_H = 5, LABEL_LIFT = 22, LABEL_INSET = 6;

const BANNER_TEXT: Record<number, string> = { 1: "YOUR TURN", 2: "ENEMY TURN", 3: "VICTORY", 4: "DEFEAT" };

/** the log line's words, from its code and the units it names */
export function logText(log: TurnHud["log"], names: readonly string[]): string {
  const a = names[log.a] ?? "", b = names[log.b] ?? "";
  switch (log.kind) {
    // the bitmap font has no comma or full stop (cells/canvas/font.ts), so the demo's lines are re-punctuated with dashes
    case 0: return "CLICK A HERO";
    case 1: return `${a}: BLUE TILES TO MOVE - RED FOES TO STRIKE`;
    case 2: return "PICK ANOTHER HERO OR PRESS SPACE";
    case 3: return `${a}: STRIKE A RED FOE - OR SPACE TO WAIT`;
    case 4: return `${a} IS DONE - PICK ANOTHER HERO OR PRESS SPACE`;
    case 5: return `${a} HITS ${b} FOR ${log.n}`;
    case 6: return `${a} HITS ${b} FOR ${log.n} - DOWN`;
    case 7: return "THE FIELD IS CLEAR - R RESTARTS";
    case 8: return "THE PARTY IS DOWN - R RESTARTS";
    default: return "";
  }
}

function panel(out: TurnHudOps, x: number, y: number, w: number, h: number): void {
  out.rects.push({ x: x - 2, y: y - 2, w: w + 4, h: h + 4, color: INK });
  out.rects.push({ x, y, w, h, color: PANEL });
}

function text(out: TurnHudOps, str: string, x: number, y: number, scale: number, color: string): HudText {
  const t = { text: str, x, y, scale, color };
  out.texts.push(t);
  return t;
}

/** a text run with an ink plate behind it, for words over the field */
function plated(out: TurnHudOps, str: string, x: number, y: number, scale: number, color: string): void {
  const w = textW(str, scale);
  out.rects.push({ x: x - 4, y: y - 3, w: w + 8, h: GLYPH_H * scale + 6, color: INK });
  text(out, str, x, y, scale, color);
}

function party(out: TurnHudOps, t: TurnHud): void {
  panel(out, PANEL_X, PANEL_Y, PANEL_W, PANEL_HEAD + ROW_H * t.party.length);
  text(out, `TURN ${t.turn}`, PANEL_X + 12, PANEL_Y + 8, TEXT_SCALE, INK);
  let y = PANEL_Y + PANEL_HEAD;
  for (const h of t.party) {
    const status = h.dead ? "DOWN" : h.acted ? "DONE" : h.active ? "ACTIVE" : "READY";
    const dim = h.dead || h.acted;
    text(out, h.name, PANEL_X + 12, y, TEXT_SCALE, dim ? GREY : INK);
    text(out, status, PANEL_X + PANEL_W - 16 - textW(status, TEXT_SCALE), y, TEXT_SCALE, dim ? GREY : h.active ? ACTIVE : GREEN);
    const bx = PANEL_X + 12, by = y + 18;
    out.rects.push({ x: bx, y: by, w: BAR_W + 4, h: 10, color: INK });
    out.rects.push({ x: bx + 2, y: by + 2, w: BAR_W, h: 6, color: BAR_DARK });
    const n = Math.round((BAR_W * Math.max(0, h.hp)) / Math.max(1, h.maxHp));
    if (n > 0) out.rects.push({ x: bx + 2, y: by + 2, w: n, h: 6, color: h.dead ? GREY : GREEN });
    const hp = `${h.hp}/${h.maxHp}`;
    text(out, hp, PANEL_X + PANEL_W - 16 - textW(hp, SMALL), by, SMALL, INK);
    y += ROW_H;
  }
}

function bars(out: TurnHudOps, t: TurnHud): void {
  for (const b of t.bars) {
    const x = Math.round(b.x - HEAD_BAR_W / 2), y = Math.round(b.y - b.tall);
    out.rects.push({ x: x - 2, y: y - 2, w: HEAD_BAR_W + 4, h: HEAD_BAR_H + 4, color: INK });
    out.rects.push({ x, y, w: HEAD_BAR_W, h: HEAD_BAR_H, color: BAR_DARK });
    const n = Math.round((HEAD_BAR_W * Math.max(0, b.hp)) / Math.max(1, b.maxHp));
    if (n > 0) out.rects.push({ x, y, w: n, h: HEAD_BAR_H, color: b.team === 0 ? GREEN : RED });
  }
}

/** the whole turn HUD for one frame */
export function turnHudOps(t: TurnHud, view: { w: number; h: number }): TurnHudOps {
  const out: TurnHudOps = { rects: [], texts: [] };
  bars(out, t);
  for (const l of t.strikeLabels) {
    const s = `-${l.atk}`;
    plated(out, s, Math.round(l.x - LABEL_INSET - textW(s, TEXT_SCALE)), Math.round(l.y - l.tall - LABEL_LIFT), TEXT_SCALE, RED);
  }
  for (const f of t.floats) {
    const s = `-${f.value}`;
    plated(out, s, Math.round(f.x - textW(s, FLOAT_SCALE) / 2), Math.round(f.y), FLOAT_SCALE, RED);
  }
  party(out, t);
  panel(out, PANEL_X, view.h - PANEL_Y - LOG_H, LOG_W, LOG_H);
  text(out, logText(t.log, t.names), PANEL_X + 12, view.h - PANEL_Y - LOG_H + 8, TEXT_SCALE, INK);
  const line = BANNER_TEXT[t.banner];
  if (line) plated(out, line, Math.round((view.w - textW(line, BANNER_SCALE)) / 2), BANNER_Y, BANNER_SCALE, t.banner === 4 ? RED : CREAM);
  if (t.showEndTurn) plated(out, "SPACE: END TURN", view.w - 24 - textW("SPACE: END TURN", TEXT_SCALE), 30, TEXT_SCALE, CREAM);
  return out;
}

/** exported for the test: the panel's rows are the party, the plates are the words over the field */
export const LAYOUT = { PANEL_X, PANEL_Y, PANEL_W, PANEL_HEAD, ROW_H, LOG_H, LOG_W, BANNER_Y, HEAD_BAR_W, PINK };
export type { HudRect, HudText };
