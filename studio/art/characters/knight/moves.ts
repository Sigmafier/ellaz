// The knight's fight data: the plate body on every frame (helm to boots, the
// shield and the blade stick out of it), the blade active on frames 2 and 3
// of the attack (the crescent drawn in front of the sword arm), a shove back
// on hurt, a fall on ko with no hurt box once it is down. Boxes are named in
// the drawing's own grid cells and converted to body units here.

import { gridBox, standardGraph, type MoveFrame, type Moves } from "../../../export/moves";
import { KNIGHT48_SPEC } from "./rig48";

const B = gridBox(KNIGHT48_SPEC.origin, KNIGHT48_SPEC.unit);
const U = KNIGHT48_SPEC.unit;
const body = B(10, 4, 22, 51);
const push = B(11, 36, 21, 51);
const stand = (n: number): MoveFrame[] => Array.from({ length: n }, () => ({ bdy: [body], push }));
const slash = { kind: "hit" as const, box: B(23, 12, 45, 30), damage: 12, knock: { dx: 6 * U, dy: -2 * U }, stun: 8, fall: 20, effect: "spark" as const };

export const knightMoves: Moves = standardGraph({
  idle: stand(4),
  walk: stand(6),
  attack: [
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [body], push, itr: [slash], impulse: { dx: 2 * U, dy: 0 } },
    { bdy: [body], push, itr: [slash] },
    { bdy: [body], push },
    { bdy: [body], push },
  ],
  hurt: [{ bdy: [body], push, impulse: { dx: -3 * U, dy: 0 } }, { bdy: [body], push }, { bdy: [body], push }],
  ko: [
    { bdy: [body], push, impulse: { dx: -6 * U, dy: -4 * U } },
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [], push },
    { bdy: [], push },
    { bdy: [], push },
  ],
});
