#!/usr/bin/env node
// The Ember Hollow Crypt room painter: the sketch of 2026-09-11 (the hall's
// demos/dungeon-room.js) ported onto integer arrays, emitting the scenery
// set games/hollow/assets/crypt-room/ - one sheet holding the room (floor,
// walls, door, banner, vines, the rune ring) as one frame and the four props
// (pillar, crate, crates, crystal) as one frame each, plus the TexturePacker
// atlas and the manifest the cells read.
//
// ART resolution is one cell = 2 view px, the same cell the sprites use; the
// sheet is emitted at 10 px per cell so the cells draw it at their DRAW_SCALE
// of 1/5 like every export set. The room frame is 320 x 222 cells; each prop
// frame is 48 x 96 cells with the prop's foot at cell (24, 88), so one manifest
// pivot serves all four (both cells take one pivot per set). Every slanted
// edge is a 2:1 staircase computed in tile space, so nothing is antialiased.
//
//   node paint.mjs <outDir> [--preview <png>]
//
// What is NOT here from the sketch: the torch flames, the glows and the
// vignette (drawn per frame in the sketch; the cells have no op for a glow),
// and the gem sprites (the room drops coins, which the engine already draws).

import { mkdirSync, writeFileSync } from "node:fs";
import { join } from "node:path";
import { encodePng } from "./png.mjs";

export const N = 12;                       // tiles per side
export const AX0 = 160, AY0 = 54;          // art position of the floor's back corner
export const WALL = 40, EDGE = 8;          // wall height and floor-slab thickness, art cells
export const ART_W = 320, ART_H = 222;
export const PX = 10;                      // sheet px per art cell
export const PROP_W = 48, PROP_H = 96, PROP_PX = 24, PROP_PY = 88;
export const SET = "crypt-room";

export function hash(x, y, s = 0) {
  let n = (Math.imul(x | 0, 374761393) + Math.imul(y | 0, 668265263) + Math.imul(s | 0, 1442695041)) | 0;
  n = Math.imul(n ^ (n >>> 13), 1274126177);
  return ((n ^ (n >>> 16)) >>> 0) / 4294967296;
}

const rgb = (h) => [parseInt(h.slice(1, 3), 16), parseInt(h.slice(3, 5), 16), parseInt(h.slice(5, 7), 16)];
const ramp = (...hs) => hs.map(rgb);
export const INK = rgb("#1a1230");

const P = {
  grout: rgb("#3e2840"), groutDeep: rgb("#2e1c34"),
  slabA: ramp("#6e4f63", "#9a7478", "#bf9888", "#dcb898"),   // warm mauve stone
  slabB: ramp("#7a5548", "#a8785a", "#c89a6e", "#e4bc84"),   // sandstone
  slabC: ramp("#4e5a4e", "#6f7c5c", "#93a06a", "#b4c07c"),   // mossy green stone
  moss: ramp("#2f6e44", "#3f8f4a", "#5cb85c", "#86d46a"),
  flower: rgb("#ff8ab4"), gold: ramp("#8a5a2c", "#d8952e", "#ffc93c", "#fff0a0"),
  wallR: ramp("#6a4a5e", "#8e6a74", "#b08a88", "#cfae9e"),   // right wall faces the light
  wallL: ramp("#4e3450", "#6b4e64", "#876878", "#a4848a"),   // left wall is in shade
  wallWarm: ramp("#7a4c50", "#9e6a62", "#bf8a78", "#dcaa90"),
  top: ramp("#9a7a80", "#c4a294", "#dcbca4", "#f0d8b8"),
  mortar: rgb("#3a2438"), contact: rgb("#2a1a30"),
  doorIn: ramp("#2e1628", "#4a2230", "#6e3034", "#8a4a3a"),
  banner: ramp("#7a1a50", "#c02e6e", "#ff4d8d", "#ff9ac0"),
  rod: ramp("#4a2e1c", "#6b4220", "#8a5a2c", "#b07038"),
  voidR: ramp("#241424", "#2e1a2c", "#382234", "#43293c"),
};

export const DOOR = { from: 60, to: 84 };       // along the right wall, art cells (wx 5..7)

// ---------- the room: one colour per art cell ----------

/** the room as ART_W x ART_H colours, the sketch's paintRoom on an array */
export function paintRoom() {
  const out = new Array(ART_W * ART_H);
  const tileOf = new Int16Array(ART_W * ART_H).fill(-1);
  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) out[y * ART_W + x] = pixel(x, y, tileOf);
  // cracks: short 2:1-ish random walks that stay inside one slab, with a lit lower lip
  for (let i = 0; i < N; i++) for (let j = 0; j < N; j++) {
    if (hash(i, j, 13) > 0.17) continue;
    const id = i * N + j, cx = AX0 + (i - j) * 12, cy = AY0 + (i + j) * 6 + 6;
    let x = cx + Math.round((hash(i, j, 14) - 0.5) * 10), y = cy + Math.round((hash(i, j, 15) - 0.5) * 4);
    const dir = hash(i, j, 16) < 0.5 ? -1 : 1;
    for (let s = 0; s < 11; s++) {
      const p = y * ART_W + x;
      if (tileOf[p] === id) { out[p] = P.grout; if (tileOf[p + ART_W] === id) out[p + ART_W] = P.slabA[3]; }
      x += dir; const r = hash(i + s, j, 17);
      if (r < 0.3) y += 1; else if (r > 0.8) y -= 1;
    }
  }
  return out;
}

function pixel(x, y, tileOf) {
  const rx = x - AX0, ry = y - AY0, qx = rx + 2 * ry, qy = 2 * ry - rx;
  const tqx = qx + 2 * WALL, tqy = qy + 2 * WALL;
  if ((tqx >= -12 && tqx < 0 && tqy >= -12 && tqy < 288) || (tqy >= -12 && tqy < 0 && tqx >= -12 && tqx < 288)) return wallTop(tqx, tqy, x, y);
  if (rx >= -150 && rx < -144 && qy > 288 - 2 * WALL && qy <= 288) return cap(rx + 150, 288 - qy);
  if (rx > 144 && rx <= 150 && qx > 288 - 2 * WALL && qx <= 288) return cap(150 - rx, 288 - qx);
  if (rx >= -144 && rx <= 0 && qx < 0 && qx >= -2 * WALL) return wallFace("L", -rx, -qx, x, y);
  if (rx >= 0 && rx <= 144 && qy < 0 && qy >= -2 * WALL) return wallFace("R", rx, -qy, x, y);
  if (qx >= 0 && qx < 288 && qy >= 0 && qy < 288) return floor(qx, qy, x, y, tileOf);
  if (rx <= 0 && rx >= -144 && qy >= 288 && qy < 288 + 2 * EDGE) return slabEdge(qy - 288, -rx, P.wallR);
  if (rx >= 0 && rx <= 144 && qx >= 288 && qx < 288 + 2 * EDGE) return slabEdge(qx - 288, rx, P.wallL);
  const n = hash(x >> 2, y >> 2, 3), m = hash((x + 2) >> 3, (y + 1) >> 2, 4);
  if (hash(x, y, 5) < 0.04) return P.voidR[3];
  return P.voidR[n < 0.45 ? 1 : n < 0.8 ? 2 : m < 0.5 ? 0 : 3];
}

function wallTop(tqx, tqy, x, y) {
  const L = tqx < 0, along = L ? tqy : tqx, depth = L ? tqx : tqy;
  if (depth < -10 || along < -10 || along >= 286) return INK;
  if (depth >= -2) return P.top[3];
  if (((along + 48) % 24) < 2) return P.top[0];
  const h = hash(x, y, 21);
  if (hash((along + 48) / 24 | 0, L ? 1 : 2, 22) < 0.25 && depth < -5 && hash(x >> 1, y, 23) < 0.6) return P.moss[h < 0.5 ? 2 : 3];
  return h < 0.1 ? P.top[3] : h > 0.93 ? P.top[1] : P.top[2];
}

function cap(u, zz) {
  if (u < 1 || zz < 2 || zz >= 78) return INK;
  return (zz % 16) < 2 ? P.mortar : P.wallL[(zz % 16) >= 14 ? 1 : 0];
}

function wallFace(side, u, zz, x, y) {
  const z = zz / 2;
  if (side === "R" && u >= DOOR.from - 3 && u <= DOOR.to + 3) { const c = door(u - 72, z, zz); if (c) return c; }
  if (side === "L" && u >= 82 && u <= 104) { const c = banner(u - 84, z); if (c) return c; }
  const vine = vineAt(side, u, z);
  if (vine) return vine;
  if (zz < 2) return P.contact;
  const course = zz / 16 | 0, cz = zz % 16, stagger = course % 2 ? 6 : 0, cu = (u + stagger) % 12;
  if (cz < 2 || cu === 0) return P.mortar;
  const b = hash((u + stagger) / 12 | 0, course, side === "L" ? 31 : 32);
  const R = b < 0.22 ? P.wallWarm : side === "L" ? P.wallL : P.wallR;
  let tone = 1;
  if (cz >= 14) tone = 2; else if (cz < 4) tone = 0;
  const litCol = side === "R" ? cu === 1 : cu === 11, darkCol = side === "R" ? cu === 11 : cu === 1;
  if (tone === 1 && litCol) tone = 2; if (tone === 1 && darkCol) tone = 0;
  if (course === 0 && b > 0.7 && cz < 8 && hash(u, zz >> 1, 33) < 0.55) return P.moss[cz < 4 ? 1 : 2];
  const h = hash(x, y, 34);
  if (tone === 1 && h < 0.08) tone = 2; else if (tone === 1 && h > 0.94) tone = 0;
  if (tone === 2 && cz >= 14 && b > 0.85) tone = 3;
  return R[tone];
}

function door(du, z, zz) {
  const top = 20, rad = 12, r = Math.hypot(du, z - top);
  const open = Math.abs(du) < 12 && (z < top || r < rad);
  if (open) {
    if (Math.abs(du) >= 11 || (z >= top && r > rad - 1)) return INK;
    if (du < -5) { // the left jamb: the wall's own thickness, seen from the room
      if (z >= top && r > rad - 3) return INK;
      return (zz % 12) < 2 ? P.mortar : P.wallWarm[du < -8 ? 1 : 0];
    }
    if (z < 2) return P.doorIn[2]; if (z < 4) return P.doorIn[1];
    const g = Math.hypot(du - 3, (z - 10) * 1.3);
    return g < 4 ? P.doorIn[3] : g < 7 ? P.doorIn[2] : g < 10 ? P.doorIn[1] : P.doorIn[0];
  }
  if (z >= top && r >= rad && r < rad + 3.5) { // voussoirs
    const a = Math.atan2(z - top, du) / (Math.PI / 7);
    if (a - Math.floor(a) < 0.12) return P.mortar;
    return r >= rad + 2.5 ? INK : P.top[r < rad + 1 ? 3 : 2];
  }
  if (z < top && Math.abs(du) >= 12 && Math.abs(du) < 15) { // quoins
    if ((zz % 12) < 2) return P.mortar;
    return Math.abs(du) >= 14 ? INK : P.top[(zz % 12) >= 10 ? 3 : 2];
  }
  return null;
}

function banner(bu, z) {
  if (z >= 35 && z < 37 && bu >= -1 && bu <= 19) return bu === -1 || bu === 19 ? INK : P.rod[z < 36 ? 1 : 3];
  if (bu < 1 || bu > 17) return null;
  const bottom = 12 + (9 - Math.abs(bu - 9)) * 0.7;
  if (z < bottom - 1 || z >= 35) return null;
  if (bu === 1 || bu === 17 || z < bottom) return INK;
  if (z >= 33) return P.gold[2];
  if (z < bottom + 1.5) return P.gold[1];
  const ex = Math.abs(bu - 9), ez = Math.abs(z - 24) * 0.8; // gold diamond emblem
  if (ex + ez < 3.2) return P.gold[ex + ez < 1.5 ? 3 : 2];
  if (ex + ez < 4.2) return P.banner[0];
  const fold = (bu + 1) % 5;
  return P.banner[fold === 0 ? 1 : fold === 1 ? 3 : 2];
}

function vineAt(side, u, z) {
  const cols = side === "L" ? [22, 62, 128] : [30, 104, 124];
  for (let k = 0; k < cols.length; k++) {
    const du = u - cols[k], len = 8 + hash(k, side === "L" ? 1 : 2, 41) * 12, wig = Math.round(Math.sin(z * 0.7 + k) * 1);
    if (z < WALL - len) continue;
    if (du === wig || du === wig + 1) return P.moss[du === wig ? 1 : 2];
    if ((Math.round(z) % 4 === 0) && (du === wig - 1 || du === wig + 2)) return P.moss[3];
  }
  return null;
}

function slabEdge(zz, u, R) {
  if (zz < 2) return R[3];
  if (zz >= 14) return INK;
  if ((u % 24) === 0) return P.mortar;
  return R[zz < 6 ? 1 : 0];
}

function floor(qx, qy, x, y, tileOf) {
  const i = qx / 24 | 0, j = qy / 24 | 0, ux = qx % 24, vy = qy % 24;
  const v = hash(i, j, 7), R = v < 0.55 ? P.slabA : v < 0.85 ? P.slabB : P.slabC;
  const s = hash(i, j, 9) < 0.3 ? 12 : 24, lu = ux % s, lv = vy % s;
  const mossy = R === P.slabC || hash(i, j, 11) < 0.2 || ((i === 0 || j === 0) && hash(i, j, 12) < 0.5);
  const blob = hash(x >> 1, y, 19);
  // the rune ring inlaid round the room's centre
  const wx = qx / 24, wy = qy / 24, dr = Math.abs(Math.hypot(wx - 6, wy - 6) - 2.3);
  if (dr < 0.05) return P.gold[2];
  if (dr < 0.1) return P.gold[0];
  const dp = Math.abs(Math.hypot(wx - 6, wy - 6) - 1.0);
  if (dp < 0.045) return P.banner[2];
  if (lu < 2 || lv < 2) return mossy && blob < 0.45 ? P.moss[blob < 0.2 ? 1 : 0] : P.grout;
  if (mossy && (lu < 6 || lv < 6) && blob < 0.4) return hash(x, y, 20) < 0.03 ? P.flower : P.moss[blob < 0.15 ? 3 : blob < 0.3 ? 2 : 1];
  let tone = 1;
  if (lu < 4) tone = 3; else if (lv < 4) tone = 2; else if (lu >= s - 2 || lv >= s - 2) tone = 0;
  const h = hash(x, y, 18);
  if (tone === 1 && h < 0.08) tone = 2; else if (tone === 1 && h > 0.94) tone = 0;
  const ao = qx < 6 || qy < 6 ? 2 : qx < 14 || qy < 14 ? 1 : 0;
  tone -= ao;
  if (tone >= 1 || ao === 0) tileOf[y * ART_W + x] = i * N + j;
  return tone < 0 ? P.grout : R[tone];
}

// ---------- the props, each a small cell grid with its foot at (px, py) ----------

function boxPass(W, H, px, py, box, shade, out) {
  const { x0, x1, y0, y1, z0, z1 } = box;
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const rx = x - px, ry = y - py;
    const tqx = rx + 2 * (ry + z1), tqy = 2 * (ry + z1) - rx;
    let col = null;
    if (tqx >= 24 * x0 && tqx < 24 * x1 && tqy >= 24 * y0 && tqy < 24 * y1) col = shade("top", tqx - 24 * x0, tqy - 24 * y0, x, y);
    else {
      const lwx = rx / 12 + y1, lz = rx / 2 + 12 * y1 - ry;
      const rwy = x1 - rx / 12, rz = (x1 + rwy) * 6 - ry;
      if (lwx >= x0 && lwx <= x1 && lz >= z0 && lz < z1) col = shade("left", (lwx - x0) * 24, lz - z0, x, y, (x1 - lwx) * 24 < 1);
      else if (rwy >= y0 && rwy <= y1 && rz >= z0 && rz < z1) col = shade("right", (rwy - y0) * 24, rz - z0, x, y);
    }
    if (col) out[y * W + x] = col;
  }
}

/** ink every transparent cell that touches a painted one: the sketch's outline pass */
function finish(W, H, px, py, out) {
  const cells = new Array(W * H).fill(null);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    let col = out[y * W + x];
    if (!col) {
      const n = (xx, yy) => xx >= 0 && yy >= 0 && xx < W && yy < H && out[yy * W + xx];
      if (n(x - 1, y) || n(x + 1, y) || n(x, y - 1) || n(x, y + 1)) col = INK; else continue;
    }
    cells[y * W + x] = col;
  }
  return { cells, W, H, px, py };
}

const STONE = ramp("#6a4a5e", "#9a7478", "#c4a294", "#e8cdb4");
const WOOD = ramp("#5a3418", "#8a5228", "#b07038", "#d8964e");

function pillar() {
  const W = 44, H = 96, px = 22, py = 88, out = new Array(W * H).fill(null);
  const stone = (R, rune) => (face, a, z, x, y, corner) => {
    const h = hash(x, y, 51);
    if (face === "top") return h < 0.1 ? R[3] : R[2];
    if (corner) return R[3];
    if (rune && face === "left" && Math.abs(a - 7) + Math.abs(z - 26) * 0.6 < 3.4) return Math.abs(a - 7) + Math.abs(z - 26) * 0.6 < 1.6 ? rgb("#ffd0ec") : rgb("#ff4d8d");
    if ((Math.floor(z) % 10) === 0) return R[0];
    if (!rune && z < 3 && h < 0.5) return P.moss[h < 0.25 ? 1 : 2];
    const t = face === "left" ? (a < 3 ? 3 : 2) : (a > 11 ? 1 : 0);
    return h > 0.93 ? R[Math.max(0, t - 1)] : R[t];
  };
  boxPass(W, H, px, py, { x0: -0.44, x1: 0.44, y0: -0.44, y1: 0.44, z0: 0, z1: 6 }, stone(P.slabB), out);
  boxPass(W, H, px, py, { x0: -0.3, x1: 0.3, y0: -0.3, y1: 0.3, z0: 6, z1: 58 }, stone(STONE, true), out);
  boxPass(W, H, px, py, { x0: -0.42, x1: 0.42, y0: -0.42, y1: 0.42, z0: 58, z1: 64 }, stone(P.slabB), out);
  return finish(W, H, px, py, out);
}

function crate(stack) {
  const W = 44, H = 64, px = 22, py = 54, out = new Array(W * H).fill(null);
  const wood = (face, a, z, x, y, corner) => {
    if (face === "top") return (Math.floor(a) % 6) < 1 ? WOOD[2] : WOOD[3];
    const lit = face === "left";
    if (corner) return WOOD[3];
    if (z >= 20) return lit ? WOOD[3] : WOOD[2];                // top rail
    if (a < 2.5 || a > 14.8 || z < 2.5) return lit ? WOOD[1] : WOOD[0]; // frame
    if ((Math.floor(z) % 6) === 0) return lit ? WOOD[1] : WOOD[0];      // plank seams
    return lit ? WOOD[2] : WOOD[1];
  };
  boxPass(W, H, px, py, { x0: -0.36, x1: 0.36, y0: -0.36, y1: 0.36, z0: 0, z1: 22 }, wood, out);
  if (stack) {
    const small = (face, a, z, x, y, corner) => wood(face, a * 1.4, z * 1.3, x, y, corner);
    boxPass(W, H, px, py, { x0: -0.28, x1: 0.18, y0: -0.22, y1: 0.24, z0: 22, z1: 38 }, small, out);
  }
  return finish(W, H, px, py, out);
}

function crystal() {
  const W = 48, H = 64, px = 24, py = 54, out = new Array(W * H).fill(null);
  const pink = ramp("#5e1e6a", "#9a2a88", "#e04aa0", "#ff8ac8", "#ffd6ee");
  const lilac = ramp("#3a2a6a", "#5a44a8", "#8a70e0", "#b8a4ff", "#ece4ff");
  const shards = [[-9, 14, 5, -3, lilac], [7, 18, 6, 3, lilac], [-2, 34, 8, -1, pink], [4, 22, 6, 2, pink], [-13, 8, 4, -4, pink]];
  // rubble at the base
  for (let y = -4; y <= 2; y++) for (let x = -14; x <= 14; x++) if (x * x / 196 + y * y / 16 < 1) out[(py + y) * W + px + x] = hash(x >> 1, y, 71) < 0.5 ? STONE[1] : STONE[0];
  for (const [bx, h, w, lean, R] of shards) for (let t = 0; t < h; t++) {
    const cx = Math.round(px + bx + lean * t / h * 3), hw = t < h * 0.62 ? w / 2 : (w / 2) * (h - t) / (h * 0.38);
    for (let dx = -Math.ceil(hw); dx < Math.ceil(hw); dx++) {
      const tone = dx === 0 || dx === -1 ? (t > h * 0.3 ? 4 : 3) : dx < 0 ? 3 : dx < Math.ceil(hw) - 1 ? 2 : 1;
      out[(py - t) * W + cx + dx] = R[t < 2 ? Math.max(0, tone - 2) : tone];
    }
  }
  return finish(W, H, px, py, out);
}

export const PROPS = ["pillar", "crate", "crates", "crystal"];
export function paintProps() {
  return { pillar: pillar(), crate: crate(false), crates: crate(true), crystal: crystal() };
}

// ---------- the sheet, the atlas, the manifest ----------

/** every prop on a 48 x 96 frame with its foot at (PROP_PX, PROP_PY), so one pivot serves the set */
function propFrame(p) {
  const cells = new Array(PROP_W * PROP_H).fill(null);
  const dx = PROP_PX - p.px, dy = PROP_PY - p.py;
  for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
    const c = p.cells[y * p.W + x];
    if (c) cells[(y + dy) * PROP_W + (x + dx)] = c;
  }
  return cells;
}

/** the sheet in art cells: the room on top, the props in a row beneath it */
export function composeSheet() {
  const W = ART_W, H = ART_H + PROP_H;
  const cells = new Array(W * H).fill(null);
  const room = paintRoom();
  for (let y = 0; y < ART_H; y++) for (let x = 0; x < ART_W; x++) cells[y * W + x] = room[y * ART_W + x];
  const props = paintProps();
  const frames = { room: { x: 0, y: 0, w: ART_W, h: ART_H } };
  PROPS.forEach((name, k) => {
    const f = propFrame(props[name]);
    const ox = k * PROP_W, oy = ART_H;
    for (let y = 0; y < PROP_H; y++) for (let x = 0; x < PROP_W; x++) cells[(oy + y) * W + ox + x] = f[y * PROP_W + x];
    frames[name] = { x: ox, y: oy, w: PROP_W, h: PROP_H };
  });
  return { cells, W, H, frames };
}

/** art cells -> RGBA at `px` px per cell; a null cell is transparent */
function rasterise(cells, W, H, px) {
  const rgba = new Uint8Array(W * px * H * px * 4);
  for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) {
    const c = cells[y * W + x];
    if (!c) continue;
    for (let yy = 0; yy < px; yy++) {
      let o = ((y * px + yy) * W * px + x * px) * 4;
      for (let xx = 0; xx < px; xx++) { rgba[o] = c[0]; rgba[o + 1] = c[1]; rgba[o + 2] = c[2]; rgba[o + 3] = 255; o += 4; }
    }
  }
  return rgba;
}

const frameName = (clip) => `${SET}_${clip}_0000`;

function atlasOf(frames) {
  const out = {};
  for (const [clip, f] of Object.entries(frames)) {
    const isRoom = clip === "room";
    const rect = { x: f.x * PX, y: f.y * PX, w: f.w * PX, h: f.h * PX };
    out[frameName(clip)] = {
      frame: rect, rotated: false, trimmed: false,
      spriteSourceSize: { x: 0, y: 0, w: rect.w, h: rect.h }, sourceSize: { w: rect.w, h: rect.h },
      // the room is drawn by its top-left; a prop by its foot, the shared pivot below
      pivot: isRoom ? { x: 0, y: 0 } : { x: PROP_PX / PROP_W, y: PROP_PY / PROP_H },
    };
  }
  return { frames: out, meta: { image: `${SET}.png`, size: { w: ART_W * PX, h: (ART_H + PROP_H) * PX }, scale: "1", note: "the crypt room and its props, painted by tools/room-painter/paint.mjs" } };
}

function manifestOf(frames) {
  const animations = {};
  for (const clip of Object.keys(frames)) animations[clip] = { fps: 1, loop: false, frames: [frameName(clip)] };
  return {
    character: SET, style: "snes16", scale: 2,
    frameSize: { w: PROP_W * PX, h: PROP_H * PX },
    pivot: { x: PROP_PX * PX, y: PROP_PY * PX },
    animations,
    sockets: {},
    hitbox: { x: 0, y: 0, w: PROP_W * PX, h: PROP_H * PX },
    atlas: `${SET}.atlas.json`,
  };
}

/** the room at 2 px per cell with the props on their tiles: what the cells will show, for the eyeball */
export function preview(placements) {
  const room = paintRoom();
  const props = paintProps();
  const cells = room.slice();
  const toArt = (wx, wy) => [AX0 + (wx - wy) * 12, AY0 + (wx + wy) * 6];
  for (const { kind, i, j } of [...placements].sort((a, b) => a.i + a.j - b.i - b.j)) {
    const p = props[kind], [sx, sy] = toArt(i + 0.5, j + 0.5);
    for (let y = 0; y < p.H; y++) for (let x = 0; x < p.W; x++) {
      const c = p.cells[y * p.W + x];
      const ax = sx - p.px + x, ay = sy - p.py + y;
      if (c && ax >= 0 && ay >= 0 && ax < ART_W && ay < ART_H) cells[ay * ART_W + ax] = c;
    }
  }
  return encodePng(ART_W * 2, ART_H * 2, rasterise(cells, ART_W, ART_H, 2));
}

/** the crypt's props, as games/hollow/data/rooms/crypt.json places them */
export const CRYPT_PROPS = [
  { kind: "pillar", i: 3, j: 7 }, { kind: "pillar", i: 7, j: 3 },
  { kind: "crates", i: 1, j: 10 }, { kind: "crate", i: 2, j: 10 },
  { kind: "crystal", i: 10, j: 1 },
];

export function emit(outDir, previewPath) {
  mkdirSync(outDir, { recursive: true });
  const { cells, W, H, frames } = composeSheet();
  const png = encodePng(W * PX, H * PX, rasterise(cells, W, H, PX));
  writeFileSync(join(outDir, `${SET}.png`), png);
  writeFileSync(join(outDir, `${SET}.atlas.json`), JSON.stringify(atlasOf(frames), null, 2) + "\n");
  writeFileSync(join(outDir, `${SET}.manifest.json`), JSON.stringify(manifestOf(frames), null, 2) + "\n");
  if (previewPath) writeFileSync(previewPath, preview(CRYPT_PROPS));
  return { sheetBytes: png.length, width: W * PX, height: H * PX };
}

const isMain = process.argv[1] && new URL(`file://${process.argv[1]}`).pathname === new URL(import.meta.url).pathname;
if (isMain) {
  const args = process.argv.slice(2);
  const outDir = args.find((a) => !a.startsWith("--"));
  const pi = args.indexOf("--preview");
  if (!outDir) { console.error("usage: node paint.mjs <outDir> [--preview <png>]"); process.exit(2); }
  const r = emit(outDir, pi >= 0 ? args[pi + 1] : undefined);
  console.log(`room-painter: ${SET}.png ${r.width}x${r.height} ${r.sheetBytes} bytes + atlas + manifest -> ${outDir}`);
}
