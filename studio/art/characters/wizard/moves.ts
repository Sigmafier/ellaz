// The wizard's fight data: the robe and hat on every frame (the staff sticks
// out of it), the orb active on frames 2 and 3 of the attack (the star thrown
// in front of the staff arm), a shove back on hurt, a fall on ko with no hurt
// box once it is down. The last room's boss: the knight's damage and fall
// with the robot's star, so a hit from it reads as heavy.

import { gridBox, standardGraph, type MoveFrame, type Moves } from "../../../export/moves";
import { WIZARD48_SPEC } from "./rig48";

const B = gridBox(WIZARD48_SPEC.origin, WIZARD48_SPEC.unit);
const U = WIZARD48_SPEC.unit;
const body = B(7, 0, 26, 47);
const push = B(7, 32, 26, 47);
const stand = (n: number): MoveFrame[] => Array.from({ length: n }, () => ({ bdy: [body], push }));
const orb = { kind: "hit" as const, box: B(27, 2, 40, 18), damage: 10, knock: { dx: 6 * U, dy: -2 * U }, stun: 8, fall: 20, effect: "star" as const };

export const wizardMoves: Moves = standardGraph({
  idle: stand(4),
  walk: stand(6),
  attack: [
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [body], push, itr: [orb], impulse: { dx: 2 * U, dy: 0 } },
    { bdy: [body], push, itr: [orb] },
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
