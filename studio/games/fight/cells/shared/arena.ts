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

import type { ArenaDrawOp } from "../contract";

/** snes16, the palette the demos painted with, plus the three names playroom's props ask for */
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
function rect(ops: ArenaDrawOp[], view: View, x: number, y: number, w: number, h: number, color: string): void {
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
function wall(b: Dict, view: View, ops: ArenaDrawOp[]): void {
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
function planks(b: Dict, view: View, ops: ArenaDrawOp[]): void {
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
function shelf(p: Dict, view: View, ops: ArenaDrawOp[]): void {
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

// ---- the entry point --------------------------------------------------------

function paint(item: Dict, view: View, ops: ArenaDrawOp[]): void {
  const kind = str(item, "kind") ?? "";
  if (kind === "wall") wall(item, view, ops);
  else if (kind === "planks") planks(item, view, ops);
  else if (kind === "shelf") shelf(item, view, ops);
  // Never a throw. A cell that refuses to draw because one prop was mistyped
  // has taken the whole fight down over a decoration nobody is measuring.
  else console.warn(`fight/arena: skipping art of unknown kind "${kind}"`);
}

/** the arena file's `art` block as rectangles, back to front */
export function arenaOps(art: unknown, view: { w: number; h: number }): ArenaDrawOp[] {
  const ops: ArenaDrawOp[] = [];
  if (!isDict(art)) {
    console.warn("fight/arena: the art block is not an object; drawing nothing behind the fight");
    return ops;
  }
  for (const band of dictList(art, "bands")) paint(band, view, ops);
  for (const prop of dictList(art, "props")) paint(prop, view, ops);
  return ops;
}
