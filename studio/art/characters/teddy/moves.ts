// The angry teddy's fight data: a smaller body, a claw swipe active on
// frames 2 and 3 of the attack, lighter knockback than the robot's punch and
// a lower fall, so it takes two of these to floor anyone.

import { gridBox, standardGraph, type MoveFrame, type Moves } from "../../../export/moves";
import { TEDDY32_SPEC } from "./rig32";

const B = gridBox(TEDDY32_SPEC.origin, TEDDY32_SPEC.unit);
const U = TEDDY32_SPEC.unit;
const body = B(7, 2, 23, 31);
const push = B(8, 17, 22, 31);
const stand = (n: number): MoveFrame[] => Array.from({ length: n }, () => ({ bdy: [body], push }));
const swipe = { kind: "hit" as const, box: B(23, 16, 33, 25), damage: 6, knock: { dx: 4 * U, dy: -1 * U }, stun: 6, fall: 12, effect: "dust" as const };

export const teddyMoves: Moves = standardGraph({
  idle: stand(4),
  walk: stand(6),
  attack: [
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [body], push, itr: [swipe], impulse: { dx: 2 * U, dy: 0 } },
    { bdy: [body], push, itr: [swipe] },
    { bdy: [body], push },
    { bdy: [body], push },
  ],
  hurt: [{ bdy: [body], push, impulse: { dx: -3 * U, dy: 0 } }, { bdy: [body], push }, { bdy: [body], push }],
  ko: [
    { bdy: [body], push, impulse: { dx: -5 * U, dy: -3 * U } },
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [], push },
    { bdy: [], push },
    { bdy: [], push },
  ],
});
