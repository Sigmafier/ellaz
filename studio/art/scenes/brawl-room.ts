// Toybox Brawl's reference scene: a wallpapered playroom, a shelf of toys, a
// wooden floor, the robot and the bunny squaring up to the teddy and the
// slime. The room is drawn at 480 x 300 and scaled 2.5x so the pixel cast
// stands at s = 1 (one authored pixel = one snes16 cell): 1200 x 750.

import { E, R, place, type Op, type Scene } from "../scene-ops";
import { castAt } from "./cast";

const ROOM_SCALE = 2.5;
export const W = 480 * ROOM_SCALE;
export const H = 300 * ROOM_SCALE;
const GROUND = 262 * ROOM_SCALE;
const CAST: [string, number][] = [["robot", 210], ["bunny", 400], ["teddy", 820], ["slime", 1020]];

function room(): Op[] {
  const o: Op[] = [];
  o.push(R(0, 0, 480, 120, "#f3d9a4", false));
  for (let x = 0; x < 480; x += 32) o.push(R(x, 0, 16, 120, "#e9c78a", false));
  o.push(R(0, 86, 480, 8, "#8a5a2b", false));
  for (const [f, x] of [["#ff4d8d", 40], ["#4a8cff", 150], ["#2fbf8a", 260], ["#ffc53d", 370]] as const) {
    o.push(R(x, 54, 30, 32, f, false, 2));
    o.push(R(x + 6, 60, 7, 7, "#ffffff", false));
  }
  o.push(R(0, 120, 480, 180, "#a86a34", false));
  for (let y = 130; y < 300; y += 22) o.push(R(0, y, 480, 3, "#8a521f", false));
  return o;
}

export const brawlRoom: Scene = {
  id: "brawl-room",
  w: W,
  h: H,
  ops: [
    ...place(room(), 0, 0, ROOM_SCALE),
    ...CAST.map(([, x]) => E(x, GROUND - 6, 90, 20, "rgba(0,0,0,.28)", false)),
    ...CAST.flatMap(([id, x]) => castAt(id, x, GROUND)),
  ],
};
