// Toybox Brawl's reference scene: a wallpapered playroom, a shelf of toys, a
// wooden floor, the robot squaring up to the teddy. 480 x 300.

import { E, R, type Op, type Scene } from "../scene-ops";
import { robot } from "../characters/robot/static";
import { teddy } from "../characters/teddy/static";

export const W = 480;
export const H = 300;

function room(): Op[] {
  const o: Op[] = [];
  o.push(R(0, 0, W, 120, "#f3d9a4", false));
  for (let x = 0; x < W; x += 32) o.push(R(x, 0, 16, 120, "#e9c78a", false));
  o.push(R(0, 86, W, 8, "#8a5a2b", false));
  for (const [f, x] of [["#ff4d8d", 40], ["#4a8cff", 150], ["#2fbf8a", 260], ["#ffc53d", 370]] as const) {
    o.push(R(x, 54, 30, 32, f, false, 2));
    o.push(R(x + 6, 60, 7, 7, "#ffffff", false));
  }
  o.push(R(0, 120, W, 180, "#a86a34", false));
  for (let y = 130; y < H; y += 22) o.push(R(0, y, W, 3, "#8a521f", false));
  o.push(E(150, 262, 44, 9, "rgba(0,0,0,.28)", false));
  o.push(E(360, 262, 36, 8, "rgba(0,0,0,.28)", false));
  return o;
}

export const brawlRoom: Scene = {
  id: "brawl-room",
  w: W,
  h: H,
  ops: [...room(), ...robot(120, 138, 1.9), ...teddy(360, 140, 1.9)],
};
