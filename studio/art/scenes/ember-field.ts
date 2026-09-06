// Ember Hollow's reference scene: a sky with a low sun, a ruined keep,
// three pines, a meadow with a dirt path, a campfire, the knight and the
// wizard facing a slime and a bat. The field is drawn at 480 x 300 and
// scaled 2.5x so the pixel cast stands at s = 1: 1200 x 750.

import { C, E, P, R, place, type Op, type Scene } from "../scene-ops";
import { castAt } from "./cast";

const FIELD_SCALE = 2.5;
export const W = 480 * FIELD_SCALE;
export const H = 300 * FIELD_SCALE;
const GROUND = 268 * FIELD_SCALE;
const CAST: [string, number][] = [["knight", 200], ["wizard", 400], ["slime", 860], ["bat", 1060]];

function pine(x: number, y: number): Op[] {
  return [
    R(x - 3, y + 30, 6, 22, "#5c3a18", false),
    P([[x - 18, y + 32], [x, y - 6], [x + 18, y + 32]], "#2d6b1b", false),
    P([[x - 14, y + 18], [x, y - 16], [x + 14, y + 18]], "#3f8a2a", false),
  ];
}

function field(): Op[] {
  const o: Op[] = [];
  o.push(R(0, 0, 480, 300, "#bfe6ff", false), C(400, 50, 26, "#fff4c2", false));
  o.push(P([[0, 150], [60, 110], [130, 140], [210, 100], [300, 140], [380, 105], [480, 140], [480, 180], [0, 180]], "#8fbf6a", false));
  o.push(P([[0, 190], [80, 150], [170, 185], [250, 145], [340, 180], [420, 150], [480, 185], [480, 220], [0, 220]], "#5f9a44", false));
  // the keep
  o.push(R(330, 96, 60, 50, "#8a8f9a", false));
  for (const x of [330, 346, 362, 378]) o.push(R(x, 86, 10, 12, "#8a8f9a", false));
  o.push(R(352, 120, 16, 26, "#3a3f4a", false, 6));
  o.push(...pine(40, 140), ...pine(90, 150), ...pine(440, 150));
  o.push(R(0, 220, 480, 80, "#6cbf4a", false), R(0, 220, 480, 6, "#8ee06a", false), E(240, 290, 140, 16, "#c9a35a", false));
  // campfire is a prop: foreground
  o.push(R(300, 196, 6, 30, "#5c3a18"));
  o.push(P([[303, 200], [292, 180], [298, 168], [303, 158], [309, 168], [314, 180]], "#ff7a1a"));
  o.push(P([[303, 196], [297, 182], [303, 170], [309, 182]], "#ffd23f"));
  return o;
}

export const emberField: Scene = {
  id: "ember-field",
  w: W,
  h: H,
  ops: [
    ...place(field(), 0, 0, FIELD_SCALE),
    ...CAST.map(([, x]) => E(x, GROUND - 6, 90, 20, "rgba(0,0,0,.25)", false)),
    ...CAST.flatMap(([id, x]) => castAt(id, x, GROUND)),
  ],
};
