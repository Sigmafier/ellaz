// The neutral reference: all four characters on a plain two-tone ground.
// This is the scene a style recipe's "Sample" heading points at, because it
// has no room or field to flatter a style - only the cast.

import { E, R, type Scene } from "../scene-ops";
import { robot } from "../characters/robot/static";
import { teddy } from "../characters/teddy/static";
import { knight } from "../characters/knight/static";
import { slime } from "../characters/slime/static";

export const W = 480;
export const H = 200;

export const reference: Scene = {
  id: "reference",
  w: W,
  h: H,
  ops: [
    R(0, 0, W, 130, "#e8eef7", false),
    R(0, 130, W, 70, "#c9d3e3", false),
    ...[70, 190, 300, 410].map((x) => E(x, 170, 36, 7, "rgba(0,0,0,.2)", false)),
    ...robot(40, 50, 1.6),
    ...teddy(190, 60, 1.6),
    ...knight(280, 60, 1.6),
    ...slime(410, 80, 1.6),
  ],
};
