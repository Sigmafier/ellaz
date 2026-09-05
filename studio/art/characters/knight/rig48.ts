// The 48px knight ON the rig. Bake-off arm A, second step (2026-09-05): the
// hand-placed grid in pixels48.ts cut into eight parts along the standard
// bone tree, posed by the standard clips, and every frame snapped back to
// the pixel grid (art/techniques/pixel-parts.ts). One drawing, five clips.
// The operator's verdict on the hall page: "amazing" - this is how the cast
// is drawn now, and docs/pixel-characters.md is the recipe.
//
// Body units: UNIT per authored pixel, so the rig is 48 * UNIT tall and one
// pixel is one snes16 cell at export scale 1. The pivot is the bottom of the
// feet at column 16 of the 36-wide grid, which is the centre of the boots.

import { P } from "../../scene-ops";
import { buildPixelRig, editGrid, scaleClipTranslations, type PixelRigSpec } from "../../techniques/pixel-parts";
import { standardClips } from "../clips";
import { KNIGHT48_GRID as G, KNIGHT48_PALETTE as PAL } from "./pixels48";

export const KNIGHT48_UNIT = 5;
const U = KNIGHT48_UNIT;

/** the visor rows with the eyes moved: a wince for hurt, none for ko */
const HURT_HEAD = editGrid(G, { 12: [10, "OpOffffffffO"], 13: [10, "OpOffKfffKfO"] });
const KO_HEAD = editGrid(G, { 12: [10, "OpOffffffffO"], 13: [10, "OpOffffffffO"] });

/** a thin crescent in front of the blade, in armR space, blade-edge white with its own dark rim */
const arc = (r: number, a0: number, a1: number, n = 9): [number, number][] =>
  Array.from({ length: n }, (_, i) => { const a = a0 + ((a1 - a0) * i) / (n - 1); return [Math.cos(a) * r * U, Math.sin(a) * r * U]; });
const SLASH_RIM = P([...arc(24, -1.25, 0.15), ...arc(19, 0.15, -1.25)], PAL.O);
const SLASH = P([...arc(23, -1.2, 0.1), ...arc(20, 0.1, -1.2)], PAL.B);

export const KNIGHT48_SPEC: PixelRigSpec = {
  id: "knight",
  grid: G,
  palette: PAL,
  unit: U,
  origin: [16, 52],
  bones: {
    torso: { at: [16, 36], parent: "root" },
    head: { at: [16, 19], parent: "torso" },
    armL: { at: [9, 22], parent: "torso" },
    armR: { at: [24, 22], parent: "torso" },
    legL: { at: [13, 36], parent: "root" },
    legR: { at: [19, 36], parent: "root" },
  },
  // every ink cell of the grid belongs to exactly one part; pixel-cast.test
  // proves the rest pose re-composes the drawing cell for cell
  parts: [
    { id: "cape", bone: "torso", z: 0, regions: [[35, 43, 0, 9], [29, 39, 23, 25]] },
    { id: "legL", bone: "legL", z: 1, regions: [[36, 51, 10, 15]] },
    { id: "legR", bone: "legR", z: 1, regions: [[36, 51, 16, 22]] },
    { id: "torso", bone: "torso", z: 2, regions: [[19, 35, 10, 22], [19, 21, 23, 26], [19, 21, 0, 9]] },
    { id: "armL", bone: "armL", z: 3, regions: [[22, 34, 0, 9]] },
    { id: "head", bone: "head", z: 4, regions: [[4, 18, 10, 21]] },
    { id: "armR", bone: "armR", z: 5, regions: [[0, 21, 27, 35], [22, 28, 23, 35]] },
    { id: "slash", bone: "armR", z: 6, regions: [] },
  ],
  sockets: { hand: { bone: "armR", at: [28, 25] }, head: { bone: "head", at: [16, 4] }, shield: { bone: "armL", at: [4, 28] } },
  // the body only: helm to boots, plate width; shield and blade stick out of it
  hitbox: [10, 4, 22, 51],
  clips: [],
};

const built = buildPixelRig(KNIGHT48_SPEC);
built.rig.clips = scaleClipTranslations(standardClips({
  attack: { slash: [SLASH_RIM, SLASH] },
  hurt: { head: built.swap("head", HURT_HEAD) },
  ko: { head: built.swap("head", KO_HEAD) },
}), U * 0.7, U);

export const knight48 = built;
export const knight48Rig = built.rig;
