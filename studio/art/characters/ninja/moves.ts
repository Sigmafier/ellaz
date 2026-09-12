// The ninja's fight data: a lean body on every frame (the trailing scarf is
// not a target), the short blade active on frames 2 and 3 of the attack (the
// crescent in front of the blade hand), a shove back on hurt, a fall on ko
// with no hurt box once it is down. Lighter than the knight's swing: less
// damage, less knockback, a lower fall - two of these floor someone.

import { gridBox, standardGraph, type MoveFrame, type Moves } from "../../../export/moves";
import { NINJA48_SPEC } from "./rig48";

const B = gridBox(NINJA48_SPEC.origin, NINJA48_SPEC.unit);
const U = NINJA48_SPEC.unit;
const body = B(10, 2, 23, 47);
const push = B(10, 30, 23, 47);
const stand = (n: number): MoveFrame[] => Array.from({ length: n }, () => ({ bdy: [body], push }));
const cut = { kind: "hit" as const, box: B(24, 12, 42, 26), damage: 8, knock: { dx: 5 * U, dy: -1 * U }, stun: 6, fall: 14, effect: "spark" as const };

export const ninjaMoves: Moves = standardGraph({
  idle: stand(4),
  walk: stand(6),
  attack: [
    { bdy: [body], push },
    { bdy: [body], push },
    { bdy: [body], push, itr: [cut], impulse: { dx: 3 * U, dy: 0 } },
    { bdy: [body], push, itr: [cut] },
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
