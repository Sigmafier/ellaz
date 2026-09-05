// Ember Hollow's reference scene: sky, sun, two hill bands, a ruined keep,
// three pines, a meadow with a dirt path, a campfire, the knight facing a
// slime. 480 x 300.

import { C, E, P, R, type Op, type Scene } from "../scene-ops";
import { knight } from "../characters/knight/static";
import { slime } from "../characters/slime/static";

export const W = 480;
export const H = 300;

function pine(x: number, y: number): Op[] {
  return [
    R(x - 3, y + 30, 6, 22, "#5c3a18", false),
    P([[x - 18, y + 32], [x, y - 6], [x + 18, y + 32]], "#2d6b1b", false),
    P([[x - 14, y + 18], [x, y - 16], [x + 14, y + 18]], "#3f8a2a", false),
  ];
}

function field(): Op[] {
  const o: Op[] = [];
  o.push(R(0, 0, W, H, "#bfe6ff", false), C(400, 50, 26, "#fff4c2", false));
  o.push(P([[0, 150], [60, 110], [130, 140], [210, 100], [300, 140], [380, 105], [480, 140], [480, 180], [0, 180]], "#8fbf6a", false));
  o.push(P([[0, 190], [80, 150], [170, 185], [250, 145], [340, 180], [420, 150], [480, 185], [480, 220], [0, 220]], "#5f9a44", false));
  // the keep
  o.push(R(330, 96, 60, 50, "#8a8f9a", false));
  for (const x of [330, 346, 362, 378]) o.push(R(x, 86, 10, 12, "#8a8f9a", false));
  o.push(R(352, 120, 16, 26, "#3a3f4a", false, 6));
  o.push(...pine(40, 140), ...pine(90, 150), ...pine(440, 150));
  o.push(R(0, 220, W, 80, "#6cbf4a", false), R(0, 220, W, 6, "#8ee06a", false), E(240, 290, 140, 16, "#c9a35a", false));
  // campfire is a prop: foreground
  o.push(R(300, 196, 6, 30, "#5c3a18"));
  o.push(P([[303, 200], [292, 180], [298, 168], [303, 158], [309, 168], [314, 180]], "#ff7a1a"));
  o.push(P([[303, 196], [297, 182], [303, 170], [309, 182]], "#ffd23f"));
  o.push(E(122, 268, 40, 8, "rgba(0,0,0,.25)", false), E(360, 268, 40, 8, "rgba(0,0,0,.25)", false));
  return o;
}

export const emberField: Scene = {
  id: "ember-field",
  w: W,
  h: H,
  ops: [...field(), ...knight(100, 150, 1.9), ...slime(360, 160, 1.9)],
};
