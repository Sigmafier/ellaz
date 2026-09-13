// The arena's art, turned into flat rectangles once at mount.
//
// The arena file's `art` block is the only loose object in data/ - the core
// never opens it, and pinning its shape in the schema would mean editing a
// schema every time somebody adds a stripe. So it arrives here as `unknown`
// and this file is the one place that narrows it. Everything below reads a
// key defensively and falls back, because a cell that THROWS on a mistyped
// band draws no fight at all, and the fight is the thing being measured.
//
// The output is deliberately dumb: `{ kind: "rect", x, y, w, h, color }` and
// nothing else. A gradient, an ellipse or a sprite here would be a thing one
// engine could do faster than another, and then the tournament would be
// measuring the arena instead of the fighters. Playroom lands at roughly 240
// rects, all opaque, all from the table below.

import type { RectArenaOp } from "../contract";
import { ellipseRows, fillRect, polyRows, UNIT } from "./shapes";
import type { Scale } from "./shapes";

/** snes16, the palette the demos painted with, plus the three names playroom's props ask for and the crypt's nine */
export const PALETTE: Record<string, string> = {
  ink: "#1a1230",
  wallLight: "#f4dca8",
  wallStripe: "#e8c68a",
  cream: "#fff4dc",
  skirting: "#e0b878",
  shelf: "#8a5a2c",
  shelfLight: "#a8743c",
  shelfDark: "#6b4220",
  floor: "#b07038",
  floorNear: "#a0652f",
  floorDeep: "#9c6232",
  floorLine: "#8a5228",
  floorLight: "#c4844a",
  floorGrain: "#bd7c44",
  pink: "#ff4d8d",
  blue: "#4a8cff",
  green: "#2ec08a",
  yellow: "#ffc93c",
  mint: "#7be4c2",
  sky: "#7cc4ff",
  gold: "#ffc93c",
  white: "#ffffff",
  // the crypt's stone, flagstones and archway (2026-09-12): cool greys with a
  // little violet in them, three tones and a mortar line each - never navy
  stoneLight: "#8f8ba6",
  stone: "#716d8a",
  stoneDark: "#575370",
  stoneLine: "#3d3954",
  flag: "#5d5975",
  flagLine: "#413d58",
  flagLight: "#726e8c",
  doorDark: "#14101f",
  doorFrame: "#a29ebb",
};

type Dict = Record<string, unknown>;
interface View { w: number; h: number }

function isDict(v: unknown): v is Dict {
  return typeof v === "object" && v !== null;
}

function num(d: Dict, key: string, fallback: number): number {
  const v = d[key];
  return typeof v === "number" && Number.isFinite(v) ? v : fallback;
}

function str(d: Dict, key: string): string | undefined {
  const v = d[key];
  return typeof v === "string" ? v : undefined;
}

function strList(d: Dict, key: string): string[] {
  const v = d[key];
  return Array.isArray(v) ? v.filter((s): s is string => typeof s === "string") : [];
}

function dictList(d: Dict, key: string): Dict[] {
  const v = d[key];
  return Array.isArray(v) ? v.filter(isDict) : [];
}

/** a palette name -> its hex. An unknown name warns ONCE per lookup and comes back loud, never silently wrong. */
function colorOf(name: string | undefined, fallback: string): string {
  if (name === undefined) return fallback;
  const hex = PALETTE[name];
  if (hex !== undefined) return hex;
  console.warn(`fight/arena: no palette colour named "${name}"`);
  return PALETTE.pink;
}

/** the demos' lcg, so the plank seams land where they landed there */
function lcg(seed: number): () => number {
  let s = seed >>> 0;
  return () => ((s = (Math.imul(s, 1664525) + 1013904223) >>> 0) / 4294967296);
}

/** push a rect, clipped to the view; a zero or negative span is dropped rather than emitted */
function rect(ops: RectArenaOp[], view: View, x: number, y: number, w: number, h: number, color: string): void {
  let x0 = Math.round(x), y0 = Math.round(y);
  let w0 = Math.round(w), h0 = Math.round(h);
  if (x0 < 0) { w0 += x0; x0 = 0; }
  if (y0 < 0) { h0 += y0; y0 = 0; }
  w0 = Math.min(w0, view.w - x0);
  h0 = Math.min(h0, view.h - y0);
  if (w0 <= 0 || h0 <= 0) return;
  ops.push({ kind: "rect", x: x0, y: y0, w: w0, h: h0, color });
}

// ---- the three kinds playroom uses ------------------------------------------

/** a flat wallpaper band: the light ground, then a darker stripe every `stripe` px, then the skirting */
function wall(b: Dict, view: View, ops: RectArenaOp[]): void {
  const y = num(b, "y", 0);
  const h = num(b, "h", 0);
  const stripe = Math.max(2, Math.round(num(b, "stripe", 40)));
  const colors = strList(b, "colors");
  const light = colorOf(colors[0], PALETTE.wallLight);
  const dark = colorOf(colors[1], PALETTE.wallStripe);

  rect(ops, view, 0, y, view.w, h, light);
  const band = Math.max(1, Math.floor(stripe / 2));
  for (let x = band; x < view.w; x += stripe) rect(ops, view, x, y, band, h, dark);
  // the skirting board is not in the file - it is the look, and it is what
  // stops the wallpaper and the floorboards meeting on a bare seam.
  rect(ops, view, 0, y + h, view.w, 5, PALETTE.cream);
  rect(ops, view, 0, y + h + 5, view.w, 2, PALETTE.skirting);
}

/**
 * Floorboards in perspective: each row is `rowGrow` px taller than the one
 * behind it, so the boards widen toward the camera without a single divide.
 * The short seams between boards are offset by the band's own seed, which is
 * why two cells drawing the same arena draw the same floor.
 */
function planks(b: Dict, view: View, ops: RectArenaOp[]): void {
  const top = num(b, "y", 0);
  const bottom = top + num(b, "h", view.h - top);
  const rnd = lcg(num(b, "seed", 1));
  const colors = strList(b, "colors");
  const base = colorOf(colors[0], PALETTE.floor);
  const line = colorOf(colors[1], PALETTE.floorLine);
  const light = colorOf(colors[2], PALETTE.floorLight);
  const grow = num(b, "rowGrow", 3);

  rect(ops, view, 0, top, view.w, bottom - top, PALETTE.floorDeep);
  let y = top, row = 0, rowH = Math.max(2, num(b, "rowH", 16));
  while (y < bottom && row < 64) {
    const h = Math.min(rowH, bottom - y);
    rect(ops, view, 0, y, view.w, h, row === 0 ? PALETTE.floorNear : base);
    rect(ops, view, 0, y, view.w, 2, line);
    rect(ops, view, 0, y + 2, view.w, 1, light);
    const span = 110 + row * 14;
    const off = Math.floor(rnd() * span);
    for (let sx = -off; sx < view.w; sx += span) {
      rect(ops, view, sx, y + 2, 2, h - 2, line);
      rect(ops, view, sx + 2, y + 3, 1, h - 3, light);
      for (let k = 0; k < 2; k++) {
        const gx = sx + 10 + Math.floor(rnd() * Math.max(1, span - 30));
        const gy = y + 5 + Math.floor(rnd() * Math.max(1, h - 8));
        rect(ops, view, gx, gy, 6 + Math.floor(rnd() * 10), 1, PALETTE.floorGrain);
      }
    }
    y += h;
    row++;
    rowH += grow;
  }
}

/** a board across the back wall with two brackets, and the toy blocks standing on top of it */
function shelf(p: Dict, view: View, ops: RectArenaOp[]): void {
  const x = num(p, "x", 0);
  const y = num(p, "y", 0);
  const w = num(p, "w", 0);

  rect(ops, view, x, y, w, 7, PALETTE.shelf);
  rect(ops, view, x, y, w, 2, PALETTE.shelfLight);
  rect(ops, view, x, y + 7, w, 3, PALETTE.shelfDark);
  for (const bx of [x + 8, x + w - 14]) {
    rect(ops, view, bx, y + 10, 6, 4, PALETTE.shelfDark);
    rect(ops, view, bx + 2, y + 14, 4, 4, PALETTE.shelfDark);
  }
  // block x is ABSOLUTE in the view, the way the demo's paintShelf took it -
  // playroom's four all land on the board either way, so the file cannot tell
  // you which it meant and this comment has to.
  for (const b of dictList(p, "blocks")) {
    const bw = num(b, "w", 0);
    const bh = num(b, "h", 0);
    const bx = num(b, "x", 0);
    rect(ops, view, bx, y - bh, bw, bh, colorOf(str(b, "color"), PALETTE.pink));
    rect(ops, view, bx + bw - 2, y - bh, 2, bh, PALETTE.ink);
    rect(ops, view, bx + 3, y - bh + 3, 4, 4, PALETTE.white);
  }
}

// ---- the three kinds the crypt uses ------------------------------------------

/** a wall of stone blocks: mortar behind, one course per row, every other course offset half a block, a few blocks lighter or darker than the rest */
function stone(b: Dict, view: View, ops: RectArenaOp[]): void {
  const y = num(b, "y", 0);
  const h = num(b, "h", 0);
  const rowH = Math.max(4, Math.round(num(b, "rowH", 18)));
  const rnd = lcg(num(b, "seed", 1));
  const colors = strList(b, "colors");
  const light = colorOf(colors[0], PALETTE.stoneLight);
  const mid = colorOf(colors[1], PALETTE.stone);
  const dark = colorOf(colors[2], PALETTE.stoneDark);
  const line = colorOf(colors[3], PALETTE.stoneLine);

  rect(ops, view, 0, y, view.w, h, line);
  const bw = rowH * 2;
  for (let row = 0, ry = y; ry < y + h; row++, ry += rowH) {
    const rh = Math.min(rowH, y + h - ry);
    const off = (row % 2) * Math.floor(bw / 2);
    for (let x = -off; x < view.w; x += bw) {
      const r = rnd();
      const face = r < 0.12 ? dark : r < 0.24 ? light : mid;
      rect(ops, view, x + 1, ry + 1, bw - 2, rh - 2, face);
      rect(ops, view, x + 1, ry + 1, bw - 2, 1, light);
      rect(ops, view, x + 1, ry + rh - 2, bw - 2, 1, dark);
    }
  }
}

/** a floor of stone slabs in perspective, the planks' shape: each row `rowGrow` px taller than the one behind it, the slab seams offset by the band's seed */
function flagstones(b: Dict, view: View, ops: RectArenaOp[]): void {
  const top = num(b, "y", 0);
  const bottom = top + num(b, "h", view.h - top);
  const rnd = lcg(num(b, "seed", 1));
  const colors = strList(b, "colors");
  const base = colorOf(colors[0], PALETTE.flag);
  const line = colorOf(colors[1], PALETTE.flagLine);
  const light = colorOf(colors[2], PALETTE.flagLight);
  const grow = num(b, "rowGrow", 3);

  rect(ops, view, 0, top, view.w, bottom - top, line);
  let y = top, row = 0, rowH = Math.max(3, num(b, "rowH", 16));
  while (y < bottom && row < 64) {
    const h = Math.min(rowH, bottom - y);
    rect(ops, view, 0, y, view.w, 1, line);
    const span = 60 + row * 12;
    const off = Math.floor(rnd() * span);
    for (let sx = -off; sx < view.w; sx += span) {
      rect(ops, view, sx + 1, y + 1, span - 2, h - 2, rnd() < 0.2 ? light : base);
      rect(ops, view, sx + 1, y + 1, span - 2, 1, light);
    }
    y += h;
    row++;
    rowH += grow;
  }
}

/** an archway in the back wall: a stone frame around a dark opening whose top is stepped into an arch; the opening reaches the prop's foot, which the file puts on the floor line */
function door(p: Dict, view: View, ops: RectArenaOp[]): void {
  const x = num(p, "x", 0);
  const y = num(p, "y", 0);
  const w = num(p, "w", 0);
  const h = num(p, "h", 0);
  const f = Math.max(2, Math.round(w / 9));
  const ix = x + f, iw = w - 2 * f;
  const steps = 4, sh = Math.max(1, Math.floor(iw / (2 * steps)));

  rect(ops, view, x, y, w, h, PALETTE.doorFrame);
  for (let k = 0; k < steps; k++) {
    const inset = (steps - 1 - k) * sh;
    rect(ops, view, ix + inset, y + f + k * sh, iw - 2 * inset, sh, PALETTE.doorDark);
  }
  rect(ops, view, ix, y + f + steps * sh, iw, h - f - steps * sh, PALETTE.doorDark);
  rect(ops, view, x + Math.floor(w / 2) - 3, y, 6, f + 2, PALETTE.stoneLight);
  rect(ops, view, x, y + h - 3, w, 3, PALETTE.stoneDark);
}

// ---- the three generic kinds Ember's field uses (2026-09-13) --------------------

/** a colour as the item wrote it: a literal (#hex, rgb/rgba) verbatim, anything else a palette name */
function colorLit(item: Dict, fallback: string): string {
  const c = str(item, "color");
  if (c === undefined) return fallback;
  if (c.startsWith("#") || c.startsWith("rgb")) return c;
  return colorOf(c, fallback);
}

/** every scene-unit pair in `points`, kept only when both halves are numbers */
function pointList(item: Dict): [number, number][] {
  const v = item.points;
  if (!Array.isArray(v)) return [];
  return v.filter((p): p is [number, number] => Array.isArray(p) && p.length === 2 && typeof p[0] === "number" && typeof p[1] === "number");
}

/** a flat rectangle in scene units */
function fill(p: Dict, view: View, ops: RectArenaOp[], s: Scale): void {
  const r = fillRect(num(p, "x", 0), num(p, "y", 0), num(p, "w", 0), num(p, "h", 0), colorLit(p, PALETTE.pink), s);
  rect(ops, view, r.x, r.y, r.w, r.h, r.color);
}

/** a filled polygon in scene units, scan-converted to rows by shapes.ts */
function poly(p: Dict, view: View, ops: RectArenaOp[], s: Scale): void {
  for (const r of polyRows(pointList(p), colorLit(p, PALETTE.pink), s)) rect(ops, view, r.x, r.y, r.w, r.h, r.color);
}

/** a filled ellipse in scene units: centre and radii */
function ellipse(p: Dict, view: View, ops: RectArenaOp[], s: Scale): void {
  for (const r of ellipseRows(num(p, "cx", 0), num(p, "cy", 0), num(p, "rx", 0), num(p, "ry", 0), colorLit(p, PALETTE.pink), s)) rect(ops, view, r.x, r.y, r.w, r.h, r.color);
}

// ---- the entry point --------------------------------------------------------

function paint(item: Dict, view: View, ops: RectArenaOp[], scale: Scale): void {
  const kind = str(item, "kind") ?? "";
  if (kind === "wall") wall(item, view, ops);
  else if (kind === "planks") planks(item, view, ops);
  else if (kind === "shelf") shelf(item, view, ops);
  else if (kind === "stone") stone(item, view, ops);
  else if (kind === "flagstones") flagstones(item, view, ops);
  else if (kind === "door") door(item, view, ops);
  else if (kind === "fill") fill(item, view, ops, scale);
  else if (kind === "poly") poly(item, view, ops, scale);
  else if (kind === "ellipse") ellipse(item, view, ops, scale);
  // Never a throw. A cell that refuses to draw because one prop was mistyped
  // has taken the whole fight down over a decoration nobody is measuring.
  else console.warn(`fight/arena: skipping art of unknown kind "${kind}"`);
}

/** the art block's `scale` rational, applied to the three scene-unit kinds only; the view-px kinds ignore it. Absent means 1/1 */
function scaleOf(art: Dict): Scale {
  const s = art.scale;
  if (!isDict(s)) return UNIT;
  const den = num(s, "den", 1);
  return { num: num(s, "num", 1), den: den > 0 ? den : 1 };
}

/** the arena file's `art` block as rectangles, back to front */
export function arenaOps(art: unknown, view: { w: number; h: number }): RectArenaOp[] {
  const ops: RectArenaOp[] = [];
  if (!isDict(art)) {
    console.warn("fight/arena: the art block is not an object; drawing nothing behind the fight");
    return ops;
  }
  const scale = scaleOf(art);
  for (const band of dictList(art, "bands")) paint(band, view, ops, scale);
  for (const prop of dictList(art, "props")) paint(prop, view, ops, scale);
  return ops;
}
