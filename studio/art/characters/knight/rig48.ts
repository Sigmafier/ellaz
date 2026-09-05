// The 48px knight ON the rig. Bake-off arm A, second step (2026-09-05): the
// hand-placed grid in pixels48.ts cut into eight parts along the standard
// bone tree, posed by the standard clips, and every frame snapped back to
// the pixel grid (art/techniques/pixel-parts.ts). One drawing, five clips.
//
// Body units: UNIT per authored pixel, so the rig is 48 * UNIT tall and one
// pixel is one snes16 cell at export scale 1. The pivot is the bottom of the
// feet at column 16 of the 36-wide grid, which is the centre of the boots.

import { P } from "../../scene-ops";
import type { Rig } from "../../rig/types";
import { cutGrid, scaleClipTranslations, type Region } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { KNIGHT48_GRID as G, KNIGHT48_PALETTE as PAL } from "./pixels48";

export const KNIGHT48_UNIT = 5;
const U = KNIGHT48_UNIT;

/** grid column the pivot sits on, and the row below the last one */
const ORIGIN_COL = 16, ORIGIN_ROW = 52;

// bone pivots as grid (col, row)
const HIP: [number, number] = [16, 36];
const NECK: [number, number] = [16, 19];
const SHOULDER_L: [number, number] = [9, 22];
const SHOULDER_R: [number, number] = [24, 22];
const HIP_L: [number, number] = [13, 36];
const HIP_R: [number, number] = [19, 36];

const cut = (regions: Region[], [pc, pr]: [number, number], rows: string[] = G) => cutGrid(rows, PAL, regions, pc, pr, U);
const rel = ([c, r]: [number, number], [pc, pr]: [number, number]) => ({ x: (c - pc) * U, y: (r - pr) * U });

// Every ink cell of the grid belongs to exactly one part; rig48.test proves
// the rest pose re-composes the drawing cell for cell.
const REGIONS = {
  cape: [[35, 43, 0, 9], [29, 39, 23, 25]] as Region[],
  legL: [[36, 51, 10, 15]] as Region[],
  legR: [[36, 51, 16, 22]] as Region[],
  torso: [[19, 35, 10, 22], [19, 21, 23, 26], [19, 21, 0, 9]] as Region[],
  armL: [[22, 34, 0, 9]] as Region[],
  head: [[4, 18, 10, 21]] as Region[],
  armR: [[0, 21, 27, 35], [22, 28, 23, 35]] as Region[],
};

/** the visor row with the eyes moved: a wince for hurt, none for ko */
const withVisor = (row12: string, row13: string) => G.map((r, i) => (i === 12 ? r.slice(0, 10) + row12 + r.slice(22) : i === 13 ? r.slice(0, 10) + row13 + r.slice(22) : r));
const HURT_HEAD = withVisor("OpOffffffffO", "OpOffKfffKfO");
const KO_HEAD = withVisor("OpOffffffffO", "OpOffffffffO");

/** the old rig's slash, scaled from a 70-unit body to a 48-pixel one, in armR space */
const SLASH = P(([[8, -34], [26, -40], [30, -26], [22, -14], [10, -16]] as [number, number][]).map(([x, y]) => [Math.round(x * 0.7) * U, Math.round(y * 0.7) * U]), "rgba(255,255,255,.55)");

export const knight48Rig: Rig = {
  id: "knight48",
  bones: [
    { id: "root", parent: null, x: 0, y: 0 },
    { id: "torso", parent: "root", ...rel(HIP, [ORIGIN_COL, ORIGIN_ROW]) },
    { id: "head", parent: "torso", ...rel(NECK, HIP) },
    { id: "armL", parent: "torso", ...rel(SHOULDER_L, HIP) },
    { id: "armR", parent: "torso", ...rel(SHOULDER_R, HIP) },
    { id: "legL", parent: "root", ...rel(HIP_L, [ORIGIN_COL, ORIGIN_ROW]) },
    { id: "legR", parent: "root", ...rel(HIP_R, [ORIGIN_COL, ORIGIN_ROW]) },
  ],
  parts: [
    { id: "cape", bone: "torso", z: 0, ops: cut(REGIONS.cape, HIP) },
    { id: "legL", bone: "legL", z: 1, ops: cut(REGIONS.legL, HIP_L) },
    { id: "legR", bone: "legR", z: 1, ops: cut(REGIONS.legR, HIP_R) },
    { id: "torso", bone: "torso", z: 2, ops: cut(REGIONS.torso, HIP) },
    { id: "armL", bone: "armL", z: 3, ops: cut(REGIONS.armL, SHOULDER_L) },
    { id: "head", bone: "head", z: 4, ops: cut(REGIONS.head, NECK) },
    { id: "armR", bone: "armR", z: 5, ops: cut(REGIONS.armR, SHOULDER_R) },
    { id: "slash", bone: "armR", z: 6, ops: [] },
  ],
  sockets: {
    hand: { bone: "armR", x: 4 * U, y: 3 * U },
    head: { bone: "head", x: 0, y: -15 * U },
    shield: { bone: "armL", x: -5 * U, y: 6 * U },
  },
  // the body only: helm to boots, plate width; shield and blade stick out of it
  hitbox: [-6 * U, -48 * U, 13 * U, 48 * U],
  clips: scaleClipTranslations(standardClips({
    attack: { slash: [SLASH] },
    hurt: { head: cut(REGIONS.head, NECK, HURT_HEAD) },
    ko: { head: cut(REGIONS.head, NECK, KO_HEAD) },
  }), U * 0.7),
};
